import { createClient } from "@supabase/supabase-js";

import {
  getRequiredPublicSupabaseEnv,
  getRequiredServiceRoleKey,
} from "@/lib/env";

export function createServerSupabaseClient() {
  const { url, anonKey } = getRequiredPublicSupabaseEnv();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createAdminSupabaseClient() {
  const { url } = getRequiredPublicSupabaseEnv();
  const serviceRoleKey = getRequiredServiceRoleKey();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
