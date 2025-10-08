import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Log environment variables (first 20 chars only for security)
    console.log("Server-side environment variables:", {
      supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 20) + "..." : "NOT SET",
      serviceKey: serviceKey ? serviceKey.substring(0, 20) + "..." : "NOT SET",
      urlLength: supabaseUrl?.length || 0,
      keyLength: serviceKey?.length || 0,
    });

    // Test database connection
    if (supabaseUrl && serviceKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Test connection by checking if we can query the table
      const { data, error } = await supabaseAdmin
        .from("telegram_users")
        .select("count")
        .limit(1);

      return NextResponse.json({
        success: true,
        envCheck: {
          supabaseUrl: supabaseUrl.substring(0, 20) + "...",
          serviceKey: serviceKey.substring(0, 20) + "...",
          urlLength: supabaseUrl.length,
          keyLength: serviceKey.length,
        },
        dbConnection: {
          success: !error,
          error: error?.message || null,
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "Missing environment variables",
        envCheck: {
          supabaseUrl: supabaseUrl ? "SET" : "NOT SET",
          serviceKey: serviceKey ? "SET" : "NOT SET",
        }
      });
    }
  } catch (error) {
    console.error("Environment check error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
