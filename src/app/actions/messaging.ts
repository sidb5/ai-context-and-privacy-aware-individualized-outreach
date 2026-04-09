"use server";

import { redirect } from "next/navigation";

import { sendSimulatedSmsMessage } from "@/lib/demo/messaging";
import { buildSessionUrl } from "@/lib/demo/url";

export async function submitSimulatedSms(formData: FormData) {
  const sessionToken = String(formData.get("sessionToken") ?? "");
  const asset = String(formData.get("asset") ?? "");
  const source = String(formData.get("source") ?? "");
  const channel = String(formData.get("channel") ?? "");
  const issue = String(formData.get("issue") ?? "");
  const geo = String(formData.get("geo") ?? "");
  const timing = String(formData.get("timing") ?? "");
  const tier = String(formData.get("tier") ?? "");
  const actor = String(formData.get("actor") ?? "") as "citizen" | "agent";
  const messageText = String(formData.get("messageText") ?? "").trim();

  if (!sessionToken || !asset || !source || !channel || !actor || !messageText) {
    throw new Error("Missing fields for simulated SMS submission.");
  }

  await sendSimulatedSmsMessage(sessionToken, actor, messageText);

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
    })}#sms-thread`,
  );
}
