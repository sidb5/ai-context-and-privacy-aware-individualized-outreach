import { createAdminSupabaseClient } from "@/lib/supabase/server";

type SmsActor = "citizen" | "agent";

export async function sendSimulatedSmsMessage(
  sessionToken: string,
  actor: SmsActor,
  messageText: string,
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
  const relayResponse = await client
    .from("relay_identities")
    .select("*")
    .eq("session_id", session.id)
    .single();

  if (relayResponse.error || !relayResponse.data) {
    throw new Error(relayResponse.error?.message ?? "Relay identity not found.");
  }

  const interactionType =
    actor === "citizen" ? "sms_inbound" : "sms_relay_outbound";

  const logResponse = await client
    .from("interaction_logs")
    .insert({
      session_id: session.id,
      channel: "sms",
      actor,
      interaction_type: interactionType,
      message_text: messageText,
      metadata: {
        viaRelay: actor === "agent",
        relayIdentifier: relayResponse.data.relay_identifier,
      },
    })
    .select("*")
    .single();

  if (logResponse.error || !logResponse.data) {
    throw new Error(logResponse.error?.message ?? "Failed to log SMS message.");
  }

  const sessionUpdate = await client
    .from("sessions")
    .update({
      current_channel: "sms",
      provenance_manifest: Array.isArray(session.provenance_manifest)
        ? [
            ...session.provenance_manifest,
            {
              type: "sms_message",
              actor,
              viaRelay: actor === "agent",
              at: new Date().toISOString(),
            },
          ]
        : [
            {
              type: "sms_message",
              actor,
              viaRelay: actor === "agent",
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

  return {
    session: sessionUpdate.data,
    relay: relayResponse.data,
    log: logResponse.data,
  };
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
