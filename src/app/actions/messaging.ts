"use server";

import { redirect } from "next/navigation";

import { sendSmsMessage } from "@/lib/demo/messaging";
import { normalizeSmsTransportMode } from "@/lib/demo/sms-mode";
import { buildSessionUrl } from "@/lib/demo/url";

export async function submitSmsMessage(formData: FormData) {
  const sessionToken = String(formData.get("sessionToken") ?? "");
  const asset = String(formData.get("asset") ?? "");
  const source = String(formData.get("source") ?? "");
  const channel = String(formData.get("channel") ?? "");
  const issue = String(formData.get("issue") ?? "");
  const geo = String(formData.get("geo") ?? "");
  const timing = String(formData.get("timing") ?? "");
  const tier = String(formData.get("tier") ?? "");
  const smsMode = normalizeSmsTransportMode(String(formData.get("smsMode") ?? ""));
  const actor = String(formData.get("actor") ?? "") as "citizen" | "agent";
  const messageText = String(formData.get("messageText") ?? "").trim();

  if (!sessionToken || !asset || !source || !channel || !actor || !messageText) {
    throw new Error("Missing fields for SMS submission.");
  }

  const result = await sendSmsMessage(sessionToken, actor, messageText, smsMode);

  redirect(
    `${buildSessionUrl({
      asset,
      source,
      channel,
      st: sessionToken,
      issue: issue || undefined,
      geo: geo || undefined,
      timing: timing || undefined,
      tier: tier || undefined,
      smsMode,
      smsNotice:
        result.mode === "twilio" && result.status === "blocked"
          ? String(result.reason ?? "twilio_not_ready")
          : undefined,
    })}#sms-thread`,
  );
}
