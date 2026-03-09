import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let hasServiceKey = false;
  try { createServiceClient(); hasServiceKey = true; } catch { /* missing */ }

  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: hasUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnonKey,
    supabase_service_key: hasServiceKey,
  };

  const allSet = hasUrl && hasAnonKey && hasServiceKey;

  if (!allSet) {
    return NextResponse.json({
      status: "error",
      message: "Missing required environment variables",
      env: envVars,
      supabase: "not_connected",
    }, { status: 503 });
  }

  try {
    const supabase = createServiceClient();

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
