import { randomUUID } from "node:crypto";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

type TriggerChannel = "web" | "sms" | "qr" | "link" | "agent_dashboard";

type InitializeSessionInput = {
  assetSlug: string;
  triggerSource: string;
  triggerChannel: TriggerChannel;
  sessionToken?: string;
  issueFocus?: string;
  geography?: string;
  engagementTier?: string;
  timingMode?: string;
};

function buildSupporterAlias() {
  return `Supporter-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function getCampaignAssetBySlug(assetSlug: string) {
  const client = createAdminSupabaseClient();

  const response = await client
    .from("campaign_assets")
    .select("*")
    .eq("slug", assetSlug)
    .single();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

export async function initializeDemoSession({
  assetSlug,
  triggerSource,
  triggerChannel,
  sessionToken,
  issueFocus,
  geography,
  engagementTier,
  timingMode,
}: InitializeSessionInput) {
  const client = createAdminSupabaseClient();

  const assetResponse = await client
    .from("campaign_assets")
    .select("*")
    .eq("slug", assetSlug)
    .single();

  if (assetResponse.error || !assetResponse.data) {
    throw new Error(assetResponse.error?.message ?? "Campaign asset not found.");
  }

  const asset = assetResponse.data;
  const resolvedSessionToken = sessionToken ?? randomUUID();

  const existingSessionResponse = await client
    .from("sessions")
    .select("*")
    .eq("session_token", resolvedSessionToken)
    .maybeSingle();

  if (existingSessionResponse.error) {
    throw new Error(existingSessionResponse.error.message);
  }

  let session = existingSessionResponse.data;

  if (!session) {
    const insertResponse = await client
      .from("sessions")
      .insert({
        session_token: resolvedSessionToken,
        asset_id: asset.id,
        current_channel: triggerChannel,
        entry_channel: triggerChannel,
        supporter_alias: buildSupporterAlias(),
        supporter_contact_encrypted: `vault://supporter/${resolvedSessionToken}`,
        issue_focus: issueFocus ?? asset.default_issue,
        geography,
        engagement_tier: engagementTier ?? "new",
        context_profile: {
          triggerSource,
          triggerChannel,
          issueFocus: issueFocus ?? asset.default_issue,
          geography: geography ?? null,
          engagementTier: engagementTier ?? "new",
          timingMode: timingMode ?? null,
          inDistrict:
            geography && geography === asset.district_or_scope ? "true" : "false",
          initializedAt: new Date().toISOString(),
        },
        provenance_manifest: [
          {
            type: "session_created",
            triggerSource,
            triggerChannel,
            assetSlug,
          },
        ],
      })
      .select("*")
      .single();

    if (insertResponse.error || !insertResponse.data) {
      throw new Error(insertResponse.error?.message ?? "Failed to create session.");
    }

    session = insertResponse.data;

    const relayResponse = await client.from("relay_identities").insert({
      session_id: session.id,
      relay_identifier: `relay-${resolvedSessionToken.slice(0, 8)}`,
      direct_identifier_encrypted: `vault://contact/${resolvedSessionToken}`,
      release_state: "masked",
    });

    if (relayResponse.error) {
      throw new Error(relayResponse.error.message);
    }
  } else {
    const nextContextProfile = {
      ...(session.context_profile ?? {}),
      triggerSource,
      triggerChannel,
      resumedAt: new Date().toISOString(),
      geography: geography ?? session.geography ?? null,
      issueFocus: issueFocus ?? session.issue_focus ?? asset.default_issue,
      engagementTier: engagementTier ?? session.engagement_tier ?? "new",
      timingMode:
        timingMode ??
        (typeof session.context_profile?.timingMode === "string"
          ? session.context_profile.timingMode
          : null),
      inDistrict:
        geography && geography === asset.district_or_scope ? "true" : "false",
    };

    const nextManifest = Array.isArray(session.provenance_manifest)
      ? [
          ...session.provenance_manifest,
          {
            type: "session_resumed",
            triggerSource,
            triggerChannel,
            at: new Date().toISOString(),
          },
        ]
      : [
          {
            type: "session_resumed",
            triggerSource,
            triggerChannel,
            at: new Date().toISOString(),
          },
        ];

    const updateResponse = await client
      .from("sessions")
      .update({
        current_channel: triggerChannel,
        issue_focus: issueFocus ?? session.issue_focus ?? asset.default_issue,
        geography: geography ?? session.geography,
        engagement_tier: engagementTier ?? session.engagement_tier ?? "new",
        context_profile: nextContextProfile,
        provenance_manifest: nextManifest,
      })
      .eq("id", session.id)
      .select("*")
      .single();

    if (updateResponse.error || !updateResponse.data) {
      throw new Error(updateResponse.error?.message ?? "Failed to resume session.");
    }

    session = updateResponse.data;
  }

  const triggerEventResponse = await client
    .from("trigger_events")
    .insert({
      session_id: session.id,
      asset_id: asset.id,
      trigger_type: triggerChannel,
      trigger_source: triggerSource,
      raw_payload: {
        assetSlug,
        triggerSource,
        triggerChannel,
        issueFocus: issueFocus ?? null,
        geography: geography ?? null,
      },
      normalized_payload: {
        assetId: asset.id,
        sessionToken: resolvedSessionToken,
        issueFocus: issueFocus ?? session.issue_focus ?? asset.default_issue,
        geography: geography ?? session.geography ?? null,
        engagementTier: engagementTier ?? session.engagement_tier ?? "new",
        timingMode:
          timingMode ??
          (typeof session.context_profile?.timingMode === "string"
            ? session.context_profile.timingMode
            : null),
      },
      confidence_score: 1,
    })
    .select("*")
    .single();

  if (triggerEventResponse.error) {
    throw new Error(triggerEventResponse.error.message);
  }

  const interactionLogResponse = await client.from("interaction_logs").insert({
    session_id: session.id,
    channel: triggerChannel,
    actor: "system",
    interaction_type: sessionToken ? "session_resumed" : "session_created",
    message_text: sessionToken
      ? "Trigger route resumed the existing brochure session."
      : "Trigger route created a new brochure session.",
      metadata: {
        assetSlug,
        triggerSource,
        issueFocus: issueFocus ?? session.issue_focus ?? asset.default_issue,
        geography: geography ?? session.geography ?? null,
        engagementTier: engagementTier ?? session.engagement_tier ?? "new",
        timingMode:
          timingMode ??
          (typeof session.context_profile?.timingMode === "string"
            ? session.context_profile.timingMode
            : null),
      },
  });

  if (interactionLogResponse.error) {
    throw new Error(interactionLogResponse.error.message);
  }

  const relayResponse = await client
    .from("relay_identities")
    .select("*")
    .eq("session_id", session.id)
    .single();

  if (relayResponse.error) {
    throw new Error(relayResponse.error.message);
  }

  return {
    asset,
    session,
    relayIdentity: relayResponse.data,
    triggerEvent: triggerEventResponse.data,
  };
}

export async function getSessionHistory(sessionId: string) {
  const client = createAdminSupabaseClient();

  const [triggers, logs] = await Promise.all([
    client
      .from("trigger_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("occurred_at", { ascending: false }),
    client
      .from("interaction_logs")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false }),
  ]);

  if (triggers.error) {
    throw new Error(triggers.error.message);
  }

  if (logs.error) {
    throw new Error(logs.error.message);
  }

  return {
    triggers: triggers.data,
    logs: logs.data,
  };
}
