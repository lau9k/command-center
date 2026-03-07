import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const allSet = Object.values(envVars).every(Boolean);

  if (!allSet) {
    return NextResponse.json({
      status: "error",
      message: "Missing required environment variables",
      env: envVars,
      supabase: "not_connected",
    }, { status: 503 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from("transactions").select("id").limit(1);

    if (error) {
      return NextResponse.json({
        status: "error",
        message: `Supabase query failed: ${error.message}`,
        env: envVars,
        supabase: "error",
      }, { status: 503 });
    }

    return NextResponse.json({
      status: "ok",
      env: envVars,
      supabase: "connected",
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
      env: envVars,
      supabase: "error",
    }, { status: 503 });
  }
}
