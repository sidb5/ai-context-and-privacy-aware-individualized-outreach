import { getTwilioDefaultAssetSlug } from "@/lib/env";
import { normalizeSmsTransportMode } from "@/lib/demo/sms-mode";
import { initializeDemoSession } from "@/lib/demo/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { createTwilioClient, getTwilioPhoneNumber, isTwilioConfigured } from "@/lib/twilio/client";

type SmsActor = "citizen" | "agent";

type SessionRecord = {
  id: string;
  session_token: string;
  current_channel: string;
  provenance_manifest: unknown[] | null;
  supporter_contact_encrypted: string | null;
};

type RelayRecord = {
  relay_identifier: string;
  release_state: string;
};

function appendManifestEntry(
  manifest: unknown[] | null,
  entry: Record<string, unknown>,
) {
  return Array.isArray(manifest) ? [...manifest, entry] : [entry];
}

async function getSessionAndRelay(sessionToken: string) {
  const client = createAdminSupabaseClient();
  const sessionResponse = await client
    .from("sessions")
    .select("*")
    .eq("session_token", sessionToken)
    .single();

  if (sessionResponse.error || !sessionResponse.data) {
    throw new Error(sessionResponse.error?.message ?? "Session not found.");
  }

  const relayResponse = await client
    .from("relay_identities")
    .select("*")
    .eq("session_id", sessionResponse.data.id)
    .single();

  if (relayResponse.error || !relayResponse.data) {
    throw new Error(relayResponse.error?.message ?? "Relay identity not found.");
  }

  return {
    client,
    session: sessionResponse.data as SessionRecord,
    relay: relayResponse.data as RelayRecord,
  };
}

async function insertSmsLog(
  sessionId: string,
  actor: SmsActor | "system",
  interactionType: string,
  messageText: string,
  metadata: Record<string, unknown>,
) {
  const client = createAdminSupabaseClient();
  const logResponse = await client
    .from("interaction_logs")
    .insert({
      session_id: sessionId,
      channel: "sms",
      actor,
      interaction_type: interactionType,
      message_text: messageText,
      metadata,
    })
    .select("*")
    .single();

  if (logResponse.error || !logResponse.data) {
    throw new Error(logResponse.error?.message ?? "Failed to log SMS message.");
  }

  return logResponse.data;
}

async function updateSessionForSms(
  session: SessionRecord,
  manifestEntry: Record<string, unknown>,
) {
  const client = createAdminSupabaseClient();
  const sessionUpdate = await client
    .from("sessions")
    .update({
      current_channel: "sms",
      provenance_manifest: appendManifestEntry(session.provenance_manifest, manifestEntry),
    })
    .eq("id", session.id)
    .select("*")
    .single();

  if (sessionUpdate.error || !sessionUpdate.data) {
    throw new Error(sessionUpdate.error?.message ?? "Failed to update session.");
  }

  return sessionUpdate.data;
}

export async function sendSimulatedSmsMessage(
  sessionToken: string,
  actor: SmsActor,
  messageText: string,
) {
  const { session, relay } = await getSessionAndRelay(sessionToken);
  const interactionType =
    actor === "citizen" ? "sms_inbound" : "sms_relay_outbound";

  const log = await insertSmsLog(session.id, actor, interactionType, messageText, {
    transport: "simulated",
    viaRelay: actor === "agent",
    relayIdentifier: relay.relay_identifier,
  });

  const updatedSession = await updateSessionForSms(session, {
    type: "sms_message",
    actor,
    transport: "simulated",
    viaRelay: actor === "agent",
    at: new Date().toISOString(),
  });

  return {
    mode: "simulated" as const,
    status: "sent" as const,
    session: updatedSession,
    relay,
    log,
  };
}

function extractTwilioContact(session: SessionRecord) {
  if (!session.supporter_contact_encrypted?.startsWith("twilio:")) {
    return null;
  }

  return session.supporter_contact_encrypted.replace("twilio:", "");
}

export async function sendTwilioSmsMessage(
  sessionToken: string,
  actor: SmsActor,
  messageText: string,
) {
  const { session, relay } = await getSessionAndRelay(sessionToken);

  if (!isTwilioConfigured()) {
    const log = await insertSmsLog(
      session.id,
      "system",
      "twilio_send_blocked",
      "Twilio mode was selected, but credentials are not configured yet.",
      { transport: "twilio", reason: "missing_credentials" },
    );

    return {
      mode: "twilio" as const,
      status: "blocked" as const,
      reason: "missing_credentials",
      session,
      relay,
      log,
    };
  }

  if (actor === "citizen") {
    const log = await insertSmsLog(
      session.id,
      "system",
      "twilio_inbound_expected",
      "Twilio mode expects the supporter to text the Twilio number directly.",
      { transport: "twilio", reason: "inbound_webhook_required" },
    );

    return {
      mode: "twilio" as const,
      status: "blocked" as const,
      reason: "inbound_webhook_required",
      session,
      relay,
      log,
    };
  }

  const toNumber = extractTwilioContact(session);

  if (!toNumber) {
    const log = await insertSmsLog(
      session.id,
      "system",
      "twilio_send_blocked",
      "Twilio mode needs a real inbound SMS session before it can send a live reply.",
      { transport: "twilio", reason: "missing_real_phone_binding" },
    );

    return {
      mode: "twilio" as const,
      status: "blocked" as const,
      reason: "missing_real_phone_binding",
      session,
      relay,
      log,
    };
  }

  const client = createTwilioClient();
  const fromNumber = getTwilioPhoneNumber();
  const response = await client.messages.create({
    to: toNumber,
    from: fromNumber,
    body: messageText,
  });

  const log = await insertSmsLog(session.id, actor, "sms_relay_outbound", messageText, {
    transport: "twilio",
    viaRelay: true,
    relayIdentifier: relay.relay_identifier,
    twilioSid: response.sid,
    fromNumber,
    toNumber,
  });

  const updatedSession = await updateSessionForSms(session, {
    type: "sms_message",
    actor,
    transport: "twilio",
    twilioSid: response.sid,
    viaRelay: true,
    at: new Date().toISOString(),
  });

  return {
    mode: "twilio" as const,
    status: "sent" as const,
    session: updatedSession,
    relay,
    log,
    twilioSid: response.sid,
  };
}

export async function sendSmsMessage(
  sessionToken: string,
  actor: SmsActor,
  messageText: string,
  modeInput: string,
) {
  const mode = normalizeSmsTransportMode(modeInput);

  if (mode === "twilio") {
    return sendTwilioSmsMessage(sessionToken, actor, messageText);
  }

  return sendSimulatedSmsMessage(sessionToken, actor, messageText);
}

export async function getSmsThread(sessionToken: string) {
  const client = createAdminSupabaseClient();
  const sessionResponse = await client
    .from("sessions")
    .select("id")
    .eq("session_token", sessionToken)
    .single();

  if (sessionResponse.error || !sessionResponse.data) {
    throw new Error(sessionResponse.error?.message ?? "Session not found.");
  }

  const logs = await client
    .from("interaction_logs")
    .select("*")
    .eq("session_id", sessionResponse.data.id)
    .eq("channel", "sms")
    .order("created_at", { ascending: true });

  if (logs.error) {
    throw new Error(logs.error.message);
  }

  return logs.data;
}

export async function handleTwilioInboundMessage(input: {
  from: string;
  to: string;
  body: string;
}) {
  const client = createAdminSupabaseClient();
  const normalizedContact = `twilio:${input.from}`;
  const existingSessionResponse = await client
    .from("sessions")
    .select("session_token")
    .eq("supporter_contact_encrypted", normalizedContact)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSessionResponse.error) {
    throw new Error(existingSessionResponse.error.message);
  }

  const sessionBootstrap = await initializeDemoSession({
    assetSlug: getTwilioDefaultAssetSlug(),
    triggerSource: "twilio_inbound",
    triggerChannel: "sms",
    sessionToken: existingSessionResponse.data?.session_token,
  });

  if (sessionBootstrap.session.supporter_contact_encrypted !== normalizedContact) {
    const updateResponse = await client
      .from("sessions")
      .update({
        supporter_contact_encrypted: normalizedContact,
      })
      .eq("id", sessionBootstrap.session.id)
      .select("session_token")
      .single();

    if (updateResponse.error || !updateResponse.data) {
      throw new Error(updateResponse.error?.message ?? "Failed to bind Twilio contact.");
    }
  }

  const inbound = await sendSimulatedSmsMessage(
    sessionBootstrap.session.session_token,
    "citizen",
    input.body,
  );

  await insertSmsLog(
    sessionBootstrap.session.id,
    "system",
    "twilio_inbound_received",
    `Twilio inbound SMS received from ${input.from}.`,
    {
      transport: "twilio",
      fromNumber: input.from,
      toNumber: input.to,
    },
  );

  return {
    sessionToken: sessionBootstrap.session.session_token,
    mode: "twilio" as const,
    status: inbound.status,
  };
}
