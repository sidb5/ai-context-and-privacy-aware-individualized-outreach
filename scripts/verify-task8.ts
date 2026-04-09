import { randomUUID } from "node:crypto";

import { getSmsThread, sendSimulatedSmsMessage } from "../src/lib/demo/messaging";
import { createAdminSupabaseClient } from "../src/lib/supabase/server";
import { initializeDemoSession } from "../src/lib/demo/session";

async function main() {
  const sessionToken = `task8-${randomUUID()}`;

  await initializeDemoSession({
    assetSlug: "maya-torres-2026",
    triggerSource: "mailer",
    triggerChannel: "qr",
    sessionToken,
    issueFocus: "education",
    geography: "CA-18",
  });

  await sendSimulatedSmsMessage(
    sessionToken,
    "citizen",
    "I saw the QR flyer and want to donate privately.",
  );
  await sendSimulatedSmsMessage(
    sessionToken,
    "agent",
    "We can keep messaging through your relay alias until you opt in.",
  );

  const thread = await getSmsThread(sessionToken);
  const client = createAdminSupabaseClient();
  const session = await client
    .from("sessions")
    .select("id, current_channel")
    .eq("session_token", sessionToken)
    .single();

  if (session.error || !session.data) {
    throw new Error(session.error?.message ?? "Session lookup failed.");
  }

  const relayReply = thread.find((item) => item.actor === "agent");

  console.log(
    JSON.stringify(
      {
        currentChannel: session.data.current_channel,
        smsCount: thread.length,
        citizenMessage: thread.find((item) => item.actor === "citizen")?.message_text,
        relayMessage: relayReply?.message_text ?? null,
        relayMetadata: relayReply?.metadata ?? null,
      },
      null,
      2,
    ),
  );

  if (session.data.current_channel !== "sms") {
    throw new Error("Session did not preserve cross-channel continuity into SMS.");
  }

  if (thread.length < 2) {
    throw new Error("Expected both citizen and agent SMS messages in the session.");
  }

  if (!relayReply || relayReply.metadata?.viaRelay !== true) {
    throw new Error("Agent reply was not recorded as relay-mediated.");
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        fatal: error instanceof Error ? error.message : "Unknown error",
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
