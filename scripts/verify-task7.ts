import { randomUUID } from "node:crypto";

import { getPrivacyState, recordVerifiedIntent } from "../src/lib/demo/privacy";
import { createAdminSupabaseClient } from "../src/lib/supabase/server";
import { initializeDemoSession } from "../src/lib/demo/session";

async function main() {
  const sessionToken = `task7-${randomUUID()}`;

  await initializeDemoSession({
    assetSlug: "future-cities-action",
    triggerSource: "event",
    triggerChannel: "link",
    sessionToken,
    issueFocus: "housing",
    geography: "OUT_OF_DISTRICT",
    timingMode: "event_push",
  });

  const before = await getPrivacyState(sessionToken);

  await recordVerifiedIntent(sessionToken, "event_rsvp");

  const after = await getPrivacyState(sessionToken);
  const client = createAdminSupabaseClient();
  const sessionLookup = await client
    .from("sessions")
    .select("id")
    .eq("session_token", sessionToken)
    .single();

  if (sessionLookup.error || !sessionLookup.data) {
    throw new Error(sessionLookup.error?.message ?? "Session lookup failed.");
  }

  const audit = await client
    .from("verified_intent_events")
    .select("intent_type, status")
    .eq("session_id", sessionLookup.data.id)
    .order("created_at", { ascending: false });

  console.log(
    JSON.stringify(
      {
        before: {
          releaseState: before.relay.release_state,
          directVisible: before.relay.release_state === "released",
        },
        after: {
          releaseState: after.relay.release_state,
          directVisible: after.relay.release_state === "released",
          releaseReason: after.relay.release_reason,
        },
        auditCount: audit.data?.length ?? 0,
      },
      null,
      2,
    ),
  );

  if (before.relay.release_state !== "masked") {
    throw new Error("Direct contact was not masked before verified intent.");
  }

  if (after.relay.release_state !== "released") {
    throw new Error("Verified intent did not release the contact state.");
  }

  if ((audit.data?.length ?? 0) < 1) {
    throw new Error("Expected at least one verified intent audit record.");
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
