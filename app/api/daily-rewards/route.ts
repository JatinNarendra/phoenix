import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  collectDailyRewardDB,
  getLastCollectedReward,
  getDailyRewardStatus,
  getDailyRewardHistory,
} from "@/app/lib/dailyRewards";

// Get daily reward status
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.split("/").pop(); // Get the last segment of the path
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Handle different GET endpoints
    switch (path) {
      case "status":
        const status = await getDailyRewardStatus(userId);
        return NextResponse.json({ data: status });

      case "history":
        const history = await getDailyRewardHistory(userId);
        return NextResponse.json({ data: history });

      case "last":
        const lastReward = await getLastCollectedReward(userId);
        return NextResponse.json({ data: lastReward });

      default:
        // Default to getting last reward if no specific path
        const defaultReward = await getLastCollectedReward(userId);
        return NextResponse.json({ data: defaultReward });
    }
  } catch (error) {
    console.error("Error in daily rewards GET:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Collect daily reward
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, day, coins, streak_bonus, current_streak, max_streak } =
      body;

    if (!userId || !day || typeof coins !== "number") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // First verify the user exists in telegram_users
    const { data: userExists, error: userCheckError } = await supabase!
      .from("telegram_users")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (userCheckError || !userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    try {
      const reward = await collectDailyRewardDB(
        userId.toString(),
        day,
        coins,
        streak_bonus || 0,
        current_streak || 1,
        max_streak || 1
      );

      return NextResponse.json({ data: reward });
    } catch (error) {
      console.error("Error collecting daily reward:", error);
      if (
        error instanceof Error &&
        error.message === "Daily reward already collected for today"
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error; // Re-throw other errors to be caught by outer try-catch
    }
  } catch (error) {
    console.error("Error in daily rewards POST:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
