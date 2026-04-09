import { randomUUID } from "node:crypto";

import {
  getDashboardSessionDetail,
  listDashboardSessions,
} from "../src/lib/demo/dashboard";
import { sendSimulatedSmsMessage } from "../src/lib/demo/messaging";
import { recordVerifiedIntent } from "../src/lib/demo/privacy";
import { initializeDemoSession } from "../src/lib/demo/session";

async function main() {
  const sessionToken = `task9-${randomUUID()}`;

  await initializeDemoSession({
    assetSlug: "future-cities-action",
    triggerSource: "event",
    triggerChannel: "link",
    sessionToken,
    issueFocus: "housing",
    geography: "OUT_OF_DISTRICT",
    timingMode: "event_push",
  });

  await sendSimulatedSmsMessage(
    sessionToken,
    "citizen",
    "Can I RSVP without sharing my number yet?",
  );
  await recordVerifiedIntent(sessionToken, "direct_contact_opt_in");

  const sessions = await listDashboardSessions();
  const detail = await getDashboardSessionDetail(sessionToken);

  console.log(
    JSON.stringify(
      {
        inSessionList: sessions.some(
          (session) => session.session_token === sessionToken,
        ),
        releaseState: detail.relay.release_state,
        issueFocus: detail.session.issue_focus,
        logCount: detail.logs.length,
        intentCount: detail.intents.length,
      },
      null,
      2,
    ),
  );

  if (!sessions.some((session) => session.session_token === sessionToken)) {
    throw new Error("Dashboard session list did not include the created session.");
  }

  if (detail.relay.release_state !== "released") {
    throw new Error("Dashboard detail did not reflect the released privacy state.");
  }

  if (detail.logs.length < 2) {
    throw new Error("Dashboard detail did not expose recent interaction logs.");
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
