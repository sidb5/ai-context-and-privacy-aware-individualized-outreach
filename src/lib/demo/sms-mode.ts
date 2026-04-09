export type SmsTransportMode = "simulated" | "twilio";

export function normalizeSmsTransportMode(value: string | null | undefined): SmsTransportMode {
  return value === "twilio" ? "twilio" : "simulated";
}
