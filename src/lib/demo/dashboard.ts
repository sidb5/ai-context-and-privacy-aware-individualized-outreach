import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function listDashboardSessions() {
  const client = createAdminSupabaseClient();
  const response = await client
    .from("sessions")
    .select(
      `
        id,
        session_token,
        supporter_alias,
        issue_focus,
        geography,
        engagement_tier,
        release_state,
        current_channel,
        created_at,
        updated_at,
        campaign_assets (
          display_name,
          office_or_mission
        )
      `,
    )
    .order("updated_at", { ascending: false })
    .limit(12);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return (response.data ?? []).map((session) => ({
    ...session,
    campaign_assets: Array.isArray(session.campaign_assets)
      ? session.campaign_assets[0]
      : session.campaign_assets,
  }));
}

export async function getDashboardSessionDetail(sessionToken: string) {
  const client = createAdminSupabaseClient();

  const sessionResponse = await client
    .from("sessions")
    .select(
      `
        *,
        campaign_assets (
          display_name,
          committee_name,
          office_or_mission,
          district_or_scope
        )
      `,
    )
    .eq("session_token", sessionToken)
    .single();

  if (sessionResponse.error || !sessionResponse.data) {
    throw new Error(sessionResponse.error?.message ?? "Session detail not found.");
  }

  const session = sessionResponse.data;

  const [relay, intents, logs] = await Promise.all([
    client
      .from("relay_identities")
      .select("*")
      .eq("session_id", session.id)
      .single(),
    client
      .from("verified_intent_events")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false }),
    client
      .from("interaction_logs")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (relay.error || !relay.data) {
    throw new Error(relay.error?.message ?? "Relay detail not found.");
  }

  if (intents.error) {
    throw new Error(intents.error.message);
  }

  if (logs.error) {
    throw new Error(logs.error.message);
  }

  return {
    session: {
      ...session,
      campaign_assets: Array.isArray(session.campaign_assets)
        ? session.campaign_assets[0]
        : session.campaign_assets,
    },
    relay: relay.data,
    intents: intents.data,
    logs: logs.data,
  };
}
