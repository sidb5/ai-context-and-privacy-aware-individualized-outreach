import { randomUUID } from "node:crypto";

import { assembleBrochure } from "../src/lib/demo/brochure";
import {
  getCampaignAssetBySlug,
  initializeDemoSession,
} from "../src/lib/demo/session";

async function buildVariant(input: {
  assetSlug: string;
  triggerSource: "mailer" | "event" | "sms" | "unknown";
  triggerChannel: "web" | "sms" | "qr" | "link";
  issueFocus: string;
  geography: string;
  timingMode?: string;
  engagementTier?: string;
}) {
  const sessionToken = `task5-${randomUUID()}`;
  const initialized = await initializeDemoSession({
    ...input,
    sessionToken,
  });

  const asset = await getCampaignAssetBySlug(input.assetSlug);
  const brochure = await assembleBrochure(asset, initialized.session);

  return {
    usedFallback: brochure.usedFallback,
    keys: brochure.blocks.map((block) => block.block_key),
  };
}

async function main() {
  const candidateBase = await buildVariant({
    assetSlug: "maya-torres-2026",
    triggerSource: "mailer",
    triggerChannel: "qr",
    issueFocus: "education",
    geography: "CA-18",
  });

  const candidateDeadline = await buildVariant({
    assetSlug: "maya-torres-2026",
    triggerSource: "sms",
    triggerChannel: "sms",
    issueFocus: "education",
    geography: "CA-18",
    timingMode: "deadline_window",
    engagementTier: "new",
  });

  const pacEvent = await buildVariant({
    assetSlug: "future-cities-action",
    triggerSource: "event",
    triggerChannel: "link",
    issueFocus: "housing",
    geography: "OUT_OF_DISTRICT",
    timingMode: "event_push",
  });

  const pacFallback = await buildVariant({
    assetSlug: "future-cities-action",
    triggerSource: "unknown",
    triggerChannel: "web",
    issueFocus: "transit",
    geography: "UNKNOWN",
  });

  const signatures = [
    candidateBase.keys.join("|"),
    candidateDeadline.keys.join("|"),
    pacEvent.keys.join("|"),
    pacFallback.keys.join("|"),
  ];

  console.log(
    JSON.stringify(
      {
        candidateBase,
        candidateDeadline,
        pacEvent,
        pacFallback,
        distinctSignatureCount: new Set(signatures).size,
      },
      null,
      2,
    ),
  );

  if (new Set(signatures).size < 4) {
    throw new Error("Expected four materially distinct brochure variants.");
  }

  if (!pacFallback.usedFallback) {
    throw new Error("Unsupported PAC context did not use deterministic fallback.");
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
