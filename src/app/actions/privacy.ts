"use server";

import { redirect } from "next/navigation";

import { recordVerifiedIntent } from "@/lib/demo/privacy";
import { buildSessionUrl } from "@/lib/demo/url";

type IntentType =
  | "donation_started"
  | "donation_confirmed"
  | "event_rsvp"
  | "volunteer_signup"
  | "direct_contact_opt_in";

export async function submitVerifiedIntent(formData: FormData) {
  const sessionToken = String(formData.get("sessionToken") ?? "");
  const asset = String(formData.get("asset") ?? "");
  const source = String(formData.get("source") ?? "");
  const channel = String(formData.get("channel") ?? "");
  const issue = String(formData.get("issue") ?? "");
  const geo = String(formData.get("geo") ?? "");
  const timing = String(formData.get("timing") ?? "");
  const tier = String(formData.get("tier") ?? "");
  const intentType = String(formData.get("intentType") ?? "") as IntentType;

  if (!sessionToken || !asset || !source || !channel || !intentType) {
    throw new Error("Missing fields for verified intent submission.");
  }

  await recordVerifiedIntent(sessionToken, intentType);

  redirect(
    buildSessionUrl({
      asset,
      source,
      channel,
      st: sessionToken,
      issue: issue || undefined,
      geo: geo || undefined,
      timing: timing || undefined,
      tier: tier || undefined,
    }),
  );
}
