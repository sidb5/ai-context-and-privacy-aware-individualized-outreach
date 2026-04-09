import { createAdminSupabaseClient } from "../src/lib/supabase/server";

async function main() {
  const client = createAdminSupabaseClient();

  const assets = await client
    .from("campaign_assets")
    .select("slug, display_name, asset_type")
    .order("slug");

  const blocks = await client
    .from("approved_content_blocks")
    .select("*", { count: "exact", head: true });

  if (assets.error || blocks.error) {
    console.error(
      JSON.stringify(
        {
          assetsError: assets.error?.message ?? null,
          blocksError: blocks.error?.message ?? null,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        assets: assets.data,
        contentBlockCount: blocks.count,
      },
      null,
      2,
    ),
  );
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
