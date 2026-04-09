import { createAdminSupabaseClient } from "@/lib/supabase/server";

type IntentType =
  | "donation_started"
  | "donation_confirmed"
  | "event_rsvp"
  | "volunteer_signup"
  | "direct_contact_opt_in";

const RELEASE_INTENTS = new Set<IntentType>([
  "donation_confirmed",
  "event_rsvp",
  "volunteer_signup",
  "direct_contact_opt_in",
]);

export async function getPrivacyState(sessionToken: string) {
  const client = createAdminSupabaseClient();
  const sessionResponse = await client
    .from("sessions")
    .select("id, supporter_alias, supporter_contact_encrypted, release_state")
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
    session: sessionResponse.data,
    relay: relayResponse.data,
  };
}

export async function recordVerifiedIntent(
  sessionToken: string,
  intentType: IntentType,
) {
  const client = createAdminSupabaseClient();
  const sessionResponse = await client
    .from("sessions")
    .select("*")
    .eq("session_token", sessionToken)
    .single();

  if (sessionResponse.error || !sessionResponse.data) {
    throw new Error(sessionResponse.error?.message ?? "Session not found.");
  }

  const session = sessionResponse.data;
  const releaseState = RELEASE_INTENTS.has(intentType) ? "released" : "pending_release";

  const intentResponse = await client
    .from("verified_intent_events")
    .insert({
      session_id: session.id,
      intent_type: intentType,
      status: "recorded",
      evidence: {
        sessionToken,
        capturedAt: new Date().toISOString(),
      },
    })
    .select("*")
    .single();

  if (intentResponse.error || !intentResponse.data) {
    throw new Error(
      intentResponse.error?.message ?? "Failed to record verified intent.",
    );
  }

  const sessionUpdate = await client
    .from("sessions")
    .update({
      release_state: releaseState,
      provenance_manifest: Array.isArray(session.provenance_manifest)
        ? [
            ...session.provenance_manifest,
            {
              type: "verified_intent",
              intentType,
              releaseState,
              at: new Date().toISOString(),
            },
          ]
        : [
            {
              type: "verified_intent",
              intentType,
              releaseState,
              at: new Date().toISOString(),
            },
          ],
    })
    .eq("id", session.id)
    .select("*")
    .single();

  if (sessionUpdate.error || !sessionUpdate.data) {
    throw new Error(sessionUpdate.error?.message ?? "Failed to update session.");
  }

  const relayUpdate = await client
    .from("relay_identities")
    .update({
      release_state: releaseState,
      release_reason: intentType,
      released_at: RELEASE_INTENTS.has(intentType)
        ? new Date().toISOString()
        : null,
    })
    .eq("session_id", session.id)
    .select("*")
    .single();

  if (relayUpdate.error || !relayUpdate.data) {
    throw new Error(relayUpdate.error?.message ?? "Failed to update relay state.");
  }

  const logResponse = await client.from("interaction_logs").insert({
    session_id: session.id,
    channel: session.current_channel,
    actor: "system",
    interaction_type: "verified_intent_recorded",
    message_text: `Verified intent ${intentType} moved privacy state to ${releaseState}.`,
    metadata: {
      intentType,
      releaseState,
    },
  });

  if (logResponse.error) {
    throw new Error(logResponse.error.message);
  }

  return {
    session: sessionUpdate.data,
    relay: relayUpdate.data,
    intent: intentResponse.data,
  };
}
