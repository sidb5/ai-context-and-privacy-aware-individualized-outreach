import { createAdminSupabaseClient } from "../src/lib/supabase/server";

const updates = [
  {
    assetSlug: "maya-torres-2026",
    blockKey: "hero-general",
    title: "Help Maya Torres protect CA-18 public schools",
    body: "Maya Torres is fighting to keep class sizes down, retain great teachers, and lower everyday costs for working families across CA-18.",
    cta_label: "See Maya's plan",
  },
  {
    assetSlug: "maya-torres-2026",
    blockKey: "issue-education-in-district",
    title: "What this means for families in CA-18",
    body: "This version focuses on neighborhood schools, local teacher retention, and district volunteer opportunities because the supporter appears to be inside CA-18.",
    cta_label: "Volunteer in CA-18",
  },
  {
    assetSlug: "maya-torres-2026",
    blockKey: "deadline-small-dollar",
    title: "Tonight's deadline is the difference between scaling up and falling short",
    body: "A small-dollar contribution tonight helps the campaign fund voter contact, field organizers, and final-week outreach before the reporting deadline.",
    cta_label: "Chip in $25",
  },
  {
    assetSlug: "maya-torres-2026",
    blockKey: "privacy-intro",
    title: "Your contact stays private unless you choose to share it",
    body: "Campaign staff can reply through a relay and do not see your direct number unless you explicitly opt in or complete a higher-intent action.",
    cta_label: "Continue privately",
  },
  {
    assetSlug: "future-cities-action",
    blockKey: "hero-pac",
    title: "Help pro-housing leaders win in fast-growing districts",
    body: "Future Cities Action Fund is backing organizers and candidates who can expand housing, modernize transit, and win high-growth communities.",
    cta_label: "See why this race matters",
  },
  {
    assetSlug: "future-cities-action",
    blockKey: "housing-out-of-district",
    title: "Why out-of-district supporters matter here",
    body: "This version shifts from local canvassing asks to movement-building and donor support because the supporter appears to be outside the district.",
    cta_label: "Support housing champions",
  },
  {
    assetSlug: "future-cities-action",
    blockKey: "event-rsvp-release",
    title: "RSVP for tonight's finance briefing",
    body: "Supporters can RSVP privately, keep chatting through the relay, or choose to release contact details for direct organizer follow-up.",
    cta_label: "RSVP privately",
  },
  {
    assetSlug: "future-cities-action",
    blockKey: "fallback-general",
    title: "Stay informed and support the mission",
    body: "Here is the general campaign overview, safe donation path, and contact flow used when the system does not have enough context to personalize the outreach.",
    cta_label: "Show overview",
  },
];

async function main() {
  const client = createAdminSupabaseClient();

  for (const item of updates) {
    const asset = await client
      .from("campaign_assets")
      .select("id")
      .eq("slug", item.assetSlug)
      .single();

    if (asset.error || !asset.data) {
      throw new Error(asset.error?.message ?? `Asset not found: ${item.assetSlug}`);
    }

    const result = await client
      .from("approved_content_blocks")
      .update({
        title: item.title,
        body: item.body,
        cta_label: item.cta_label,
      })
      .eq("asset_id", asset.data.id)
      .eq("block_key", item.blockKey);

    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  console.log(JSON.stringify({ updated: updates.length }, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      { fatal: error instanceof Error ? error.message : "Unknown error" },
      null,
      2,
    ),
  );
  process.exit(1);
});
