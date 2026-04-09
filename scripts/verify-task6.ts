import { randomUUID } from "node:crypto";

import { answerSessionQuestion } from "../src/lib/demo/qa";
import { initializeDemoSession } from "../src/lib/demo/session";

async function main() {
  const sessionToken = `task6-${randomUUID()}`;

  await initializeDemoSession({
    assetSlug: "maya-torres-2026",
    triggerSource: "sms",
    triggerChannel: "sms",
    sessionToken,
    issueFocus: "education",
    geography: "CA-18",
    timingMode: "deadline_window",
    engagementTier: "new",
  });

  const supported = await answerSessionQuestion(
    sessionToken,
    "What is the current fundraising ask?",
  );

  const unsupported = await answerSessionQuestion(
    sessionToken,
    "What is the campaign foreign policy position?",
  );

  console.log(
    JSON.stringify(
      {
        supported,
        unsupported,
      },
      null,
      2,
    ),
  );

  if (supported.mode !== "grounded" || supported.sourceBlockKeys.length === 0) {
    throw new Error("Supported question did not return a grounded answer.");
  }

  if (
    unsupported.mode !== "fallback" ||
    unsupported.fallbackReason !== "unsupported_question"
  ) {
    throw new Error("Unsupported question did not return deterministic fallback.");
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
