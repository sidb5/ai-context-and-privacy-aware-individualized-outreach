import { randomUUID } from "node:crypto";

import {
  getSessionHistory,
  initializeDemoSession,
} from "../src/lib/demo/session";

async function main() {
  const baseToken = `task4-${randomUUID()}`;

  const first = await initializeDemoSession({
    assetSlug: "maya-torres-2026",
    triggerSource: "mailer",
    triggerChannel: "qr",
    sessionToken: baseToken,
    issueFocus: "education",
    geography: "CA-18",
  });

  const second = await initializeDemoSession({
    assetSlug: "maya-torres-2026",
    triggerSource: "mailer",
    triggerChannel: "qr",
    sessionToken: baseToken,
    issueFocus: "education",
    geography: "CA-18",
  });

  const history = await getSessionHistory(first.session.id);

  console.log(
    JSON.stringify(
      {
        sameSessionId: first.session.id === second.session.id,
        sessionId: first.session.id,
        sessionToken: first.session.session_token,
        triggerCount: history.triggers.length,
        interactionLogCount: history.logs.length,
        latestInteractionType: history.logs[0]?.interaction_type ?? null,
      },
      null,
      2,
    ),
  );

  if (first.session.id !== second.session.id) {
    throw new Error("Session resume failed: repeated token created a new session.");
  }

  if (history.triggers.length < 2) {
    throw new Error("Expected at least two trigger events for create + resume.");
  }

  if (history.logs.length < 2) {
    throw new Error("Expected at least two interaction logs for create + resume.");
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
