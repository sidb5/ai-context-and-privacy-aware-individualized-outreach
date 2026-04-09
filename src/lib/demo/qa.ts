import { assembleBrochure } from "@/lib/demo/brochure";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type SessionRecord = {
  id: string;
  asset_id: string;
  issue_focus: string | null;
  geography: string | null;
  engagement_tier: string;
  context_profile: Record<string, unknown> | null;
};

type AnswerResult = {
  answer: string;
  mode: "grounded" | "fallback";
  sourceBlockKeys: string[];
  fallbackReason: string | null;
};

function normalizeQuestion(question: string) {
  return question.trim().toLowerCase();
}

function hasAnyKeyword(question: string, keywords: string[]) {
  return keywords.some((keyword) => question.includes(keyword));
}

export async function getSessionByToken(sessionToken: string) {
  const client = createAdminSupabaseClient();
  const response = await client
    .from("sessions")
    .select("*")
    .eq("session_token", sessionToken)
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "Session not found.");
  }

  return response.data as SessionRecord;
}

export async function answerSessionQuestion(
  sessionToken: string,
  question: string,
): Promise<AnswerResult> {
  const session = await getSessionByToken(sessionToken);
  const client = createAdminSupabaseClient();
  const assetResponse = await client
    .from("campaign_assets")
    .select("*")
    .eq("id", session.asset_id)
    .single();

  if (assetResponse.error || !assetResponse.data) {
    throw new Error(assetResponse.error?.message ?? "Campaign asset not found.");
  }

  const asset = assetResponse.data;
  const brochure = await assembleBrochure(asset, session);
  const normalized = normalizeQuestion(question);
  const canonicalFacts = asset.canonical_facts as Record<string, unknown>;

  if (hasAnyKeyword(normalized, ["privacy", "phone", "number", "contact"])) {
    const privacyBlock = brochure.blocks.find(
      (block) => block.block_type === "privacy_message",
    );

    if (privacyBlock) {
      return {
        answer: privacyBlock.body,
        mode: "grounded",
        sourceBlockKeys: [privacyBlock.block_key],
        fallbackReason: null,
      };
    }
  }

  if (hasAnyKeyword(normalized, ["donate", "chip in", "deadline", "fundraising"])) {
    const fundraisingBlock = brochure.blocks.find(
      (block) => block.block_type === "fundraising_ask",
    );

    if (fundraisingBlock) {
      const deadline = typeof canonicalFacts.fundraising_deadline === "string"
        ? canonicalFacts.fundraising_deadline
        : "the current reporting deadline";

      return {
        answer: `${fundraisingBlock.body} The current deadline on the campaign record is ${deadline}.`,
        mode: "grounded",
        sourceBlockKeys: [fundraisingBlock.block_key],
        fallbackReason: null,
      };
    }
  }

  if (hasAnyKeyword(normalized, ["issue", "education", "housing", "plan"])) {
    const issueBlock = brochure.blocks.find(
      (block) => block.block_type === "issue_message",
    );

    if (issueBlock) {
      return {
        answer: issueBlock.body,
        mode: "grounded",
        sourceBlockKeys: [issueBlock.block_key],
        fallbackReason: null,
      };
    }
  }

  if (hasAnyKeyword(normalized, ["rsvp", "event", "briefing"])) {
    const eventBlock = brochure.blocks.find(
      (block) => block.block_type === "event_prompt",
    );

    if (eventBlock) {
      return {
        answer: eventBlock.body,
        mode: "grounded",
        sourceBlockKeys: [eventBlock.block_key],
        fallbackReason: null,
      };
    }
  }

  return {
    answer:
      "I can only answer from approved campaign content in this demo. Try asking about privacy, the current fundraising ask, the issue message, or the event/RSVP flow.",
    mode: "fallback",
    sourceBlockKeys: [],
    fallbackReason: "unsupported_question",
  };
}
