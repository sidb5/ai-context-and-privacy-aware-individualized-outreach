import { createAdminSupabaseClient } from "@/lib/supabase/server";

type CampaignAsset = {
  id: string;
  district_or_scope: string;
  default_issue: string;
  compliance: {
    disclaimer?: string;
  };
};

type SessionRecord = {
  issue_focus: string | null;
  geography: string | null;
  engagement_tier: string;
  context_profile: Record<string, unknown> | null;
};

type ApprovedContentBlock = {
  id: string;
  block_key: string;
  block_type: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_action: string | null;
  priority: number;
  audience_filters: Record<string, unknown> | null;
  context_rules: Record<string, unknown> | null;
  provenance: Record<string, unknown> | null;
};

type ResolvedContext = {
  issueFocus: string;
  geography: string;
  engagementTier: string;
  triggerSource: string;
  triggerChannel: string;
  timingMode: string;
  inDistrict: boolean;
};

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function resolveBrochureContext(
  asset: CampaignAsset,
  session: SessionRecord,
) {
  const profile = session.context_profile ?? {};
  const geography = session.geography ?? getStringValue(profile.geography, "UNKNOWN");
  const issueFocus =
    session.issue_focus ?? getStringValue(profile.issueFocus, asset.default_issue);
  const engagementTier =
    session.engagement_tier ?? getStringValue(profile.engagementTier, "new");
  const triggerSource = getStringValue(profile.triggerSource, "unknown");
  const triggerChannel = getStringValue(profile.triggerChannel, "web");
  const timingMode = getStringValue(profile.timingMode, "standard");
  const inDistrict = geography === asset.district_or_scope;

  return {
    issueFocus,
    geography,
    engagementTier,
    triggerSource,
    triggerChannel,
    timingMode,
    inDistrict,
  } satisfies ResolvedContext;
}

function matchesFilters(
  block: ApprovedContentBlock,
  context: ResolvedContext,
) {
  const audienceFilters = block.audience_filters ?? {};
  const contextRules = block.context_rules ?? {};

  if (contextRules.fallback === true) {
    return false;
  }

  const geographies = getStringArray(audienceFilters.geographies);
  if (geographies.length > 0 && !geographies.includes(context.geography)) {
    return false;
  }

  const engagementTiers = getStringArray(audienceFilters.engagement_tiers);
  if (
    engagementTiers.length > 0 &&
    !engagementTiers.includes(context.engagementTier)
  ) {
    return false;
  }

  const triggerSources = getStringArray(contextRules.trigger_sources);
  if (triggerSources.length > 0 && !triggerSources.includes(context.triggerSource)) {
    return false;
  }

  const issues = getStringArray(contextRules.issues);
  if (issues.length > 0 && !issues.includes(context.issueFocus)) {
    return false;
  }

  const timingMode = getStringValue(contextRules.timing_mode);
  if (timingMode && timingMode !== context.timingMode) {
    return false;
  }

  if (typeof contextRules.in_district === "boolean") {
    if (contextRules.in_district !== context.inDistrict) {
      return false;
    }
  }

  return true;
}

function getFallbackBlock(blocks: ApprovedContentBlock[]) {
  return (
    blocks.find((block) => block.block_type === "fallback") ?? blocks[0]
  );
}

export async function assembleBrochure(
  asset: CampaignAsset,
  session: SessionRecord,
) {
  const client = createAdminSupabaseClient();
  const context = resolveBrochureContext(asset, session);

  const blocksResponse = await client
    .from("approved_content_blocks")
    .select("*")
    .eq("asset_id", asset.id)
    .order("priority");

  if (blocksResponse.error || !blocksResponse.data) {
    throw new Error(
      blocksResponse.error?.message ?? "Failed to load approved content blocks.",
    );
  }

  const blocks = blocksResponse.data as ApprovedContentBlock[];
  const selected = blocks.filter((block) => matchesFilters(block, context));
  const usedFallback = selected.length === 0;
  const brochureBlocks = usedFallback
    ? [getFallbackBlock(blocks)]
    : selected.slice(0, 4);

  return {
    context,
    blocks: brochureBlocks,
    provenance: brochureBlocks.map((block) => ({
      blockKey: block.block_key,
      title: block.title,
      blockType: block.block_type,
      whySelected: {
        issueFocus: context.issueFocus,
        geography: context.geography,
        engagementTier: context.engagementTier,
        timingMode: context.timingMode,
        triggerSource: context.triggerSource,
        inDistrict: context.inDistrict,
        fallback: usedFallback,
      },
      source: block.provenance ?? {},
    })),
    disclaimer:
      asset.compliance?.disclaimer ??
      "Paid political communication. Demo disclaimer placeholder.",
    usedFallback,
  };
}
