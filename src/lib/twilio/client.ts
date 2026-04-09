import twilio from "twilio";

import { getRequiredTwilioEnv, hasTwilioEnv } from "@/lib/env";

export function isTwilioConfigured() {
  return hasTwilioEnv();
}

export function createTwilioClient() {
  const { accountSid, authToken } = getRequiredTwilioEnv();
  return twilio(accountSid, authToken);
}

export function getTwilioPhoneNumber() {
  const { phoneNumber } = getRequiredTwilioEnv();
  return phoneNumber;
}
