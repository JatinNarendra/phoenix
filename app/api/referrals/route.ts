import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    switch (action) {
      case "check_pending_reward":
        // First check if user has pending_referral_claim in telegram_users
        const { data: userData, error: userError } = await supabase
          .from("telegram_users")
          .select("referred_by, pending_referral_claim")
          .eq("user_id", userId.toString())
          .single();

        if (userError) {
          console.error("Error checking user referral status:", userError);
          return NextResponse.json(
            { error: "Failed to check user status" },
            { status: 500 }
          );
        }

        // If user has pending_referral_claim, check if user_referrals record exists
        if (userData?.pending_referral_claim && userData?.referred_by) {
          // Check if user_referrals record already exists
          const { data: referralData, error: referralError } = await supabase
            .from("user_referrals")
            .select(
              "referee_reward_claimed, referee_reward_amount, referrer_id"
            )
            .eq("referee_id", userId)
            .eq("referee_reward_claimed", false)
            .maybeSingle();

          if (referralError && referralError.code !== "PGRST116") {
            console.error(
              "Error checking pending referral reward:",
              referralError
            );
            return NextResponse.json(
              { error: "Failed to check referral status" },
              { status: 500 }
            );
          }

          // If no user_referrals record exists, create one
          if (!referralData) {
            const refereeRewardAmount = 50000; // Default referee reward
            const referrerRewardAmount = 50000; // Default referrer reward

            const { data: newReferralData, error: createError } = await supabase
              .from("user_referrals")
              .insert({
                referee_id: userId,
                referrer_id: parseInt(userData.referred_by),
                referee_reward_amount: refereeRewardAmount,
                reward_amount: referrerRewardAmount,
                referee_reward_claimed: false,
                reward_claimed: false,
              })
              .select(
                "referee_reward_claimed, referee_reward_amount, referrer_id"
              )
              .single();

            if (createError) {
              console.error("Error creating referral record:", createError);
              return NextResponse.json(
                { error: "Failed to create referral record" },
                { status: 500 }
              );
            }

            return NextResponse.json({
              hasPendingReward: true,
              rewardAmount: newReferralData.referee_reward_amount,
              referrerId: newReferralData.referrer_id,
            });
          }

          return NextResponse.json({
            hasPendingReward: !!referralData,
            rewardAmount: referralData?.referee_reward_amount || 0,
            referrerId: referralData?.referrer_id || null,
          });
        }

        // No pending referral claim
        return NextResponse.json({
          hasPendingReward: false,
          rewardAmount: 0,
          referrerId: null,
        });

      case "get_referral_stats":
        // Calculate referral statistics directly from user_referrals table
        const { data: allReferrals, error: allReferralsError } = await supabase
          .from("user_referrals")
          .select("reward_amount, reward_claimed")
          .eq("referrer_id", userId);

        if (allReferralsError) {
          console.error("Error fetching referral data:", allReferralsError);
          return NextResponse.json(
            { error: "Failed to fetch referral data" },
            { status: 500 }
          );
        }

        // Calculate stats from the referrals
        const totalReferrals = allReferrals?.length || 0;
        const claimedReferrals =
          allReferrals?.filter((r) => r.reward_claimed) || [];
        const pendingReferrals =
          allReferrals?.filter((r) => !r.reward_claimed) || [];

        const totalRewards =
          allReferrals?.reduce((sum, r) => sum + (r.reward_amount || 0), 0) ||
          0;
        const claimedRewardAmount = claimedReferrals.reduce(
          (sum, r) => sum + (r.reward_amount || 0),
          0
        );
        const pendingRewardsAmount = pendingReferrals.reduce(
          (sum, r) => sum + (r.reward_amount || 0),
          0
        );

        return NextResponse.json({
          stats: {
            total_referrals: totalReferrals,
            total_rewards: totalRewards,
            claimed_rewards: claimedReferrals.length,
            claimed_reward_amount: claimedRewardAmount,
          },
          pendingRewardsAmount,
        });

      default:
        return NextResponse.json(
          { error: "Invalid action parameter" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Referrals API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, referrerId } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    switch (action) {
      case "create_referral":
        if (!referrerId) {
          return NextResponse.json(
            { error: "Missing referrerId" },
            { status: 400 }
          );
        }

        // Check if referral already exists
        const { data: existingReferral } = await supabase
          .from("user_referrals")
          .select("id")
          .eq("referrer_id", referrerId)
          .eq("referee_id", userId)
          .maybeSingle();

        if (existingReferral) {
          return NextResponse.json({ message: "Referral already exists" });
        }

        // Create new referral
        const { data: newReferral, error: createError } = await supabase
          .from("user_referrals")
          .insert({
            referrer_id: referrerId,
            referee_id: userId,
            reward_amount: 50000, // Default referrer reward
            referee_reward_amount: 10000, // Default referee reward
            reward_claimed: false,
            referee_reward_claimed: false,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating referral:", createError);
          return NextResponse.json(
            { error: "Failed to create referral" },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, referral: newReferral });

      case "claim_referee_reward":
        if (!referrerId) {
          return NextResponse.json(
            { error: "Missing referrerId" },
            { status: 400 }
          );
        }

        // Check if there's already a referral record
        const { data: existingRecord } = await supabase
          .from("user_referrals")
          .select("*")
          .eq("referee_id", userId)
          .eq("referrer_id", referrerId)
          .maybeSingle();

        let claimResult;

        if (existingRecord) {
          // Update existing record
          const { data: updateData, error: updateError } = await supabase
            .from("user_referrals")
            .update({
              referee_reward_claimed: true,
              referee_reward_claimed_at: new Date().toISOString(),
            })
            .eq("id", existingRecord.id)
            .select()
            .single();

          if (updateError) {
            console.error("Error updating referee reward:", updateError);
            return NextResponse.json(
              { error: "Failed to claim reward" },
              { status: 500 }
            );
          }

          claimResult = { updated: true, record: updateData, existingRecord };
        } else {
          // Create new referral record
          const { data: insertData, error: insertError } = await supabase
            .from("user_referrals")
            .insert({
              referrer_id: referrerId,
              referee_id: userId,
              reward_amount: 50000, // REFERER_REWARD
              reward_claimed: false,
              reward_claimed_at: null,
              referee_reward_amount: 50000, // REFEREE_REWARD
              referee_reward_claimed: true,
              referee_reward_claimed_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error creating referral record:", insertError);
            return NextResponse.json(
              { error: "Failed to claim reward" },
              { status: 500 }
            );
          }

          claimResult = {
            created: true,
            record: insertData,
            existingRecord: null,
          };
        }

        return NextResponse.json({ success: true, ...claimResult });

      case "claim_referrer_rewards":
        // Claim all pending referrer rewards
        const { data: claimAllData, error: claimAllError } = await supabase
          .from("user_referrals")
          .update({
            reward_claimed: true,
            reward_claimed_at: new Date().toISOString(),
          })
          .eq("referrer_id", userId)
          .eq("reward_claimed", false)
          .select();

        if (claimAllError) {
          console.error("Error claiming referrer rewards:", claimAllError);
          return NextResponse.json(
            { error: "Failed to claim rewards" },
            { status: 500 }
          );
        }

        const totalClaimed =
          claimAllData?.reduce((sum, r) => sum + (r.reward_amount || 0), 0) ||
          0;

        return NextResponse.json({
          success: true,
          claimedRewards: claimAllData,
          totalAmount: totalClaimed,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Referrals API POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
