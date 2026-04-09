import { NextResponse } from "next/server";

import {
  getPublicEnvStatus,
  getServerEnvStatus,
  hasPublicSupabaseEnv,
} from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const publicEnv = getPublicEnvStatus();
  const serverEnv = getServerEnvStatus();

  if (!hasPublicSupabaseEnv()) {
    return NextResponse.json(
      {
        ok: false,
        reason: "Supabase public environment is incomplete.",
        publicEnv,
        serverEnv,
      },
      { status: 503 },
    );
  }

  try {
    createServerSupabaseClient();

    return NextResponse.json({
      ok: true,
      reason: "Supabase client initialized successfully.",
      publicEnv,
      serverEnv,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          error instanceof Error ? error.message : "Supabase init failed.",
        publicEnv,
        serverEnv,
      },
      { status: 500 },
    );
  }
}
