import { createClient } from "@supabase/supabase-js";

import { getRequiredPublicSupabaseEnv } from "@/lib/env";

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getRequiredPublicSupabaseEnv();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
