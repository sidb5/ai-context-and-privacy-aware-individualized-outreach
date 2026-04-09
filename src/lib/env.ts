const PUBLIC_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const SERVER_KEYS = ["SUPABASE_SERVICE_ROLE_KEY"] as const;
const TWILIO_KEYS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
] as const;

type KeyStatus = {
  key: string;
  configured: boolean;
};

function getKeyStatus(keys: readonly string[]): KeyStatus[] {
  return keys.map((key) => ({
    key,
    configured: Boolean(process.env[key]?.trim()),
  }));
}

export function getPublicEnvStatus() {
  return getKeyStatus(PUBLIC_KEYS);
}

export function getServerEnvStatus() {
  return getKeyStatus(SERVER_KEYS);
}

export function getTwilioEnvStatus() {
  return getKeyStatus(TWILIO_KEYS);
}

export function hasPublicSupabaseEnv() {
  return getPublicEnvStatus().every((item) => item.configured);
}

export function hasServiceRoleEnv() {
  return getServerEnvStatus().every((item) => item.configured);
}

export function hasTwilioEnv() {
  return getTwilioEnvStatus().every((item) => item.configured);
}

export function getRequiredPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase public environment values. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, anonKey };
}

export function getRequiredServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it before using admin-only server operations.",
    );
  }

  return serviceRoleKey;
}

export function getTwilioDefaultAssetSlug() {
  return process.env.TWILIO_DEFAULT_ASSET_SLUG?.trim() || "maya-torres-2026";
}

export function getRequiredTwilioEnv() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error(
      "Missing Twilio environment values. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.",
    );
  }

  return { accountSid, authToken, phoneNumber };
}
