import { NextResponse } from "next/server";
import {
  initializeOrUpdateUser,
  updateTelegramUserProgress,
  saveGameProgress,
  validateTelegramWebAppData,
} from "../../../../lib/telegram-server";
import type { TelegramGameState } from "../../../../lib/telegram-server";

interface TelegramUserData {
  id: number;
  is_bot: boolean;
  username?: string;
  first_name: string;
  last_name?: string;
  language_code?: string;
  photo_url?: string | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userData, gameState, userId, initData } = body;

    // Validate Telegram WebApp data if provided
    if (initData) {
      const isValid = await validateTelegramWebAppData(initData);
      if (!isValid) {
        console.warn("Telegram WebApp data validation failed:", {
          initData: initData?.substring(0, 100) + "...",
        });

        // In development mode, allow the request to proceed with a warning
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "Development mode: Proceeding despite validation failure"
          );
        } else {
          // In production, still validate but be more lenient for user creation
          if (action === "initialize" && userData) {
            console.warn(
              "Production mode: Allowing user initialization despite validation failure"
            );
          } else {
            return NextResponse.json(
              { error: "Invalid Telegram WebApp data" },
              { status: 401 }
            );
          }
        }
      }

      // Additional validation: Check if initData user ID matches the provided userData
      if (userData && initData) {
        try {
          // Extract user ID from initData
          const userMatch = initData.match(/user=%7B%22id%22%3A(\d+)/);
          if (userMatch) {
            const initDataUserId = parseInt(userMatch[1]);
            if (initDataUserId !== userData.id) {
              console.error("initData user ID mismatch detected!", {
                initDataUserId: initDataUserId,
                userDataId: userData.id,
                initData: initData.substring(0, 200) + "...",
              });

              return NextResponse.json(
                {
                  error:
                    "User ID mismatch between initData and user data. Please refresh the app.",
                },
                { status: 400 }
              );
            }
          }
        } catch (error) {
          console.error(
            "Error parsing initData for user ID validation:",
            error
          );
        }
      }
    }

    switch (action) {
      case "initialize":
        if (!userData) {
          return NextResponse.json(
            { error: "User data is required for initialization" },
            { status: 400 }
          );
        }

        const result = await initializeOrUpdateUser(
          userData as TelegramUserData,
          false
        );
        return NextResponse.json({ success: true, data: result });

      case "updateProgress":
        if (!userId || !gameState) {
          return NextResponse.json(
            {
              error: "User ID and game state are required for progress update",
            },
            { status: 400 }
          );
        }

        const updateResult = await updateTelegramUserProgress(
          userId,
          gameState as TelegramGameState
        );
        return NextResponse.json({ success: updateResult });

      case "saveProgress":
        if (!userId || !gameState) {
          return NextResponse.json(
            {
              error: "User ID and game state are required for saving progress",
            },
            { status: 400 }
          );
        }

        const saveResult = await saveGameProgress(
          userId,
          gameState as TelegramGameState
        );
        return NextResponse.json({ success: saveResult });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in telegram user API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const initData = searchParams.get("initData");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Validate Telegram WebApp data if provided
    if (initData) {
      const isValid = await validateTelegramWebAppData(initData);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid Telegram WebApp data" },
          { status: 401 }
        );
      }
    }

    // Get user data from database using service role client
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabaseAdmin
      .from("telegram_users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching user data:", error);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in telegram user GET API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
