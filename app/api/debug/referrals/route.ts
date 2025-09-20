import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not configured" },
        { status: 500 }
      );
    }

    // Get the user ID from query parameter
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // First, check if the user exists
    const { data: userData, error: userError } = await supabase
      .from("telegram_users")
      .select("user_id, game_state")
      .eq("user_id", userId)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: "User not found", details: userError },
        { status: 404 }
      );
    }

    // Get all referrals where this user is the referrer
    const { data: referrals, error: referralsError } = await supabase
      .from("user_referrals")
      .select(
        `
        id,
        referrer_id,
        referee_id,
        created_at,
        reward_amount,
        reward_claimed,
        reward_claimed_at,
        referee_reward_claimed,
        referee_reward_amount,
        referee_reward_claimed_at,
        telegram_users:telegram_users!referee_id(first_name)
      `
      )
      .eq("referrer_id", userId);

    if (referralsError) {
      return NextResponse.json(
        { error: "Failed to fetch referrals", details: referralsError },
        { status: 500 }
      );
    }

    // Calculate pending rewards
    const pendingReferrals = referrals?.filter((r) => !r.reward_claimed) || [];
    const pendingRewardsAmount = pendingReferrals.reduce(
      (sum, r) => sum + (r.reward_amount || 50000),
      0
    );

    // Get stats view data
    const { data: statsData } = await supabase
      .from("user_referral_stats")
      .select(
        "total_referrals, total_rewards, claimed_rewards, claimed_reward_amount"
      )
      .eq("referrer_id", userId)
      .single();

    // Create or update test data if requested
    const createTestData = searchParams.get("createTest") === "true";
    let testDataCreated = false;

    if (createTestData) {
      // Create a test referral that will show as pending
      const testRefereeId = "test_referee_" + Date.now();

      // First create the test referee user if it doesn't exist
      await supabase.from("telegram_users").upsert({
        user_id: testRefereeId,
        first_name: "Test User",
        game_state: {
          coins: 1000,
          level: 1,
        },
      });

      // Then create the referral record
      const { error: insertError } = await supabase
        .from("user_referrals")
        .insert({
          referrer_id: userId,
          referee_id: testRefereeId,
          reward_amount: 50000,
          reward_claimed: false,
          reward_claimed_at: null,
          referee_reward_amount: 50000,
          referee_reward_claimed: true,
          referee_reward_claimed_at: new Date().toISOString(),
        });

      testDataCreated = !insertError;
    }

    return NextResponse.json({
      userData,
      pendingReferrals,
      pendingRewardsAmount,
      allReferrals: referrals,
      stats: statsData,
      testDataCreated,
      debug: {
        shouldShowClaimUI: pendingRewardsAmount > 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
