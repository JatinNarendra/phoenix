"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useGame } from "../context/GameContext";
import { gameToast } from "../utility/customToast";
import { supabase } from "../lib/supabase";
import { getBotUrl, getBotUsername } from "../lib/telegram";
// Remove image imports - we'll use src paths instead
import { useRouter } from "next/navigation";

interface ReferralClaimPopupProps {
  userId: string;
  onClose: () => void;
}

interface ReferrerInfo {
  id: string;
  firstName: string;
  level: number;
  coins: number;
  photoUrl?: string;
}

const REFEREE_REWARD = 50000; // New user receives 50,000 SPARK
const REFERER_REWARD = 50000; // Referrer receives 50,000 SPARK

// --- REWRITE: Only one updateReferrerGameState, always update game_state coins reliably ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const updateReferrerGameState = async (
  referrerId: string,
  rewardAmount: number
) => {
  try {
    if (!supabase) {
      console.error("Supabase client not available");
      return false;
    }

    // Always fetch the latest game_state
    const { data: currentData, error: getError } = await supabase
      .from("telegram_users")
      .select("game_state")
      .eq("user_id", referrerId)
      .single();

    if (getError || !currentData?.game_state) {
      // error log removed
      return false;
    }

    // Defensive: parse numbers, ensure referral object exists
    const gameState = { ...currentData.game_state };
    const currentCoins = Number(gameState.coins) || 0;
    const referral = {
      inviteLink:
        gameState.referral?.inviteLink ||
        `${getBotUrl()}?startapp=r_${referrerId}`,
      referredFriends: Number(gameState.referral?.referredFriends) || 0,
      totalRewards: Number(gameState.referral?.totalRewards) || 0,
    };

    // Update values
    const updatedGameState = {
      ...gameState,
      coins: currentCoins + rewardAmount,
      referral: {
        ...referral,
        referredFriends: referral.referredFriends + 1,
        totalRewards: referral.totalRewards + rewardAmount,
      },
    };

    // Write back to DB
    const { error: updateError } = await supabase
      .from("telegram_users")
      .update({
        game_state: updatedGameState,
        last_updated: new Date().toISOString(),
      })
      .eq("user_id", referrerId);

    if (updateError) {
      // error log removed
      return false;
    }

    // Double-check: fetch again to verify
    const { data: verifyData, error: verifyError } = await supabase
      .from("telegram_users")
      .select("game_state")
      .eq("user_id", referrerId)
      .single();

    if (!verifyError && verifyData?.game_state) {
      const finalState = verifyData.game_state;
      // verification log removed
      // If coins did not update, log error
      if (Number(finalState.coins) < currentCoins + rewardAmount) {
        // error log removed
        return false;
      }
    }

    return true;
  } catch {
    // error log removed
    return false;
  }
};

/**
 * Advanced direct coin update - uses multiple approaches to ensure it works
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const forceUpdateReferrerCoins = async (
  referrerId: string,
  rewardAmount: number
) => {
  try {
    if (!supabase) {
      console.error("Supabase client not available");
      return false;
    }

    console.log(
      `[REFERRAL DEBUG] FORCE updating referrer ${referrerId} with ${rewardAmount} SPARK coins`
    );

    // First approach: Get current game state and update it
    const { data: referrerData, error: getError } = await supabase
      .from("telegram_users")
      .select("game_state")
      .eq("user_id", referrerId)
      .single();

    if (getError) {
      console.error(
        "[REFERRAL DEBUG] Error getting data for forced update:",
        getError
      );
    } else if (referrerData?.game_state) {
      // Clone the game state to avoid reference issues
      const gameState = JSON.parse(JSON.stringify(referrerData.game_state));

      // Ensure values are numbers
      const currentCoins =
        typeof gameState.coins === "number"
          ? gameState.coins
          : parseInt(gameState.coins || "0", 10);
      const currentTotalCoins =
        typeof gameState.totalCoins === "number"
          ? gameState.totalCoins
          : parseInt(gameState.totalCoins || "0", 10);

      // Ensure referral object exists
      if (!gameState.referral) {
        console.log(
          "[REFERRAL DEBUG] Creating missing referral object in gameState"
        );
        const botUsername = getBotUsername();
        gameState.referral = {
          inviteLink: `${getBotUrl()}?startapp=r_${referrerId}`,
          deepLinkInvite: `tg://resolve?domain=${botUsername}&appname=${botUsername}&startapp=r_${referrerId}`,
          referredFriends: 0,
          totalRewards: 0,
        };
      }

      const currentReferredFriends =
        typeof gameState.referral.referredFriends === "number"
          ? gameState.referral.referredFriends
          : parseInt(gameState.referral.referredFriends || "0", 10);
      const currentTotalRewards =
        typeof gameState.referral.totalRewards === "number"
          ? gameState.referral.totalRewards
          : parseInt(gameState.referral.totalRewards || "0", 10);

      // Update values
      console.log(
        `[REFERRAL DEBUG] Before update: coins=${currentCoins}, totalCoins=${currentTotalCoins}`
      );

      gameState.coins = currentCoins + rewardAmount;
      gameState.totalCoins = currentTotalCoins + rewardAmount;
      gameState.referral.referredFriends = currentReferredFriends + 1;
      gameState.referral.totalRewards = currentTotalRewards + rewardAmount;

      console.log(
        `[REFERRAL DEBUG] After update: coins=${gameState.coins}, totalCoins=${gameState.totalCoins}`
      );

      // Save the updated state
      const { error: updateError } = await supabase
        .from("telegram_users")
        .update({
          game_state: gameState,
          last_updated: new Date().toISOString(),
        })
        .eq("user_id", referrerId);

      if (updateError) {
        console.error("[REFERRAL DEBUG] Error in forced update:", updateError);
      } else {
        console.log(
          `[REFERRAL DEBUG] Forced update method 1 successful for ${referrerId}`
        );
      }
    }

    // Second approach: Try using a direct update to a specific column with raw SQL
    try {
      // Execute as custom SQL for maximum compatibility
      const query = `
        UPDATE public.telegram_users 
        SET game_state = jsonb_set(
          jsonb_set(
            game_state, 
            '{coins}', 
            to_jsonb(COALESCE((game_state->>'coins')::int, 0) + ${rewardAmount})
          ),
          '{totalCoins}', 
          to_jsonb(COALESCE((game_state->>'totalCoins')::int, 0) + ${rewardAmount})
        )
        WHERE user_id = '${referrerId}';
      `;

      const response = await fetch("/api/execute-sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          userId: referrerId,
          amount: rewardAmount,
        }),
      });

      if (response.ok) {
        console.log("[REFERRAL DEBUG] Forced update method 2 successful");
      } else {
        console.error(
          "[REFERRAL DEBUG] Forced update method 2 failed:",
          await response.text()
        );
      }
    } catch (sqlError) {
      console.error(
        "[REFERRAL DEBUG] Error executing SQL for forced update:",
        sqlError
      );
    }

    return true;
  } catch (error) {
    console.error("[REFERRAL DEBUG] Exception in forced update:", error);
    return false;
  }
};

// Super direct update - absolutely last resort
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const emergencyUpdateReferrerCoins = async (
  referrerId: string,
  rewardAmount: number
) => {
  try {
    if (!supabase) {
      console.error("Supabase client not available");
      return false;
    }

    console.log(
      `[REFERRAL DEBUG] EMERGENCY updating referrer ${referrerId} with ${rewardAmount} SPARK coins`
    );

    // First, get the current game_state to know the starting point
    const { data: currentData } = await supabase
      .from("telegram_users")
      .select("game_state")
      .eq("user_id", referrerId)
      .single();

    const currentGameState = currentData?.game_state || {};
    const currentCoins = Number(currentGameState.coins || 0);
    console.log(
      `[REFERRAL DEBUG] EMERGENCY: Current coins = ${currentCoins}, Setting to ${
        currentCoins + rewardAmount
      }`
    );

    // The most direct possible update - explicitly update the game_state
    const timestamp = new Date().toISOString();
    const query = `
      UPDATE public.telegram_users 
      SET 
        game_state = jsonb_set(
          COALESCE(game_state, '{}'::jsonb),
          '{coins}', 
          '${currentCoins + rewardAmount}'::jsonb
        ),
        last_updated = '${timestamp}'
      WHERE user_id = '${referrerId}'
      RETURNING game_state;
    `;

    const response = await fetch("/api/execute-sql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        userId: referrerId,
        amount: rewardAmount,
        direct: true,
      }),
    });

    if (response.ok) {
      console.log("[REFERRAL DEBUG] Emergency update successful");

      // Double check with a direct read
      if (!supabase) {
        console.error("Supabase client not available");
        return false;
      }

      const { data: verifyData } = await supabase
        .from("telegram_users")
        .select("game_state")
        .eq("user_id", referrerId)
        .single();

      if (verifyData?.game_state) {
        const updatedCoins = Number(verifyData.game_state.coins || 0);
        console.log(
          `[REFERRAL DEBUG] EMERGENCY verify: Now coins = ${updatedCoins} (was ${currentCoins})`
        );

        // If we didn't actually update coins, try one more extremely direct approach
        if (updatedCoins <= currentCoins) {
          const finalQuery = `
            UPDATE public.telegram_users 
            SET game_state = '{"coins": ${currentCoins + rewardAmount}}'::jsonb
            WHERE user_id = '${referrerId}'
            RETURNING game_state;
          `;

          await fetch("/api/execute-sql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: finalQuery,
              userId: referrerId,
              amount: rewardAmount,
              direct: true,
              final: true,
            }),
          });

          console.log("[REFERRAL DEBUG] Final direct update attempted");
        }
      }

      return true;
    } else {
      console.error(
        "[REFERRAL DEBUG] Emergency update failed:",
        await response.text()
      );
      return false;
    }
  } catch {
    console.error("[REFERRAL DEBUG] Exception in emergency update");
    return false;
  }
};

const ReferralClaimPopup = ({ userId, onClose }: ReferralClaimPopupProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const { persistState } = useGame();
  const [isClaiming, setIsClaiming] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadReferrerInfo = async () => {
      try {
        // debug log removed
        setIsLoading(true);

        // Get the referrer ID
        if (!supabase) {
          console.error("Supabase client not available");
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from("telegram_users")
          .select("referred_by")
          .eq("user_id", userId)
          .single();

        // debug log removed

        if (userError || !userData?.referred_by) {
          // debug log removed
          setIsLoading(false);
          return;
        }

        // debug log removed

        // Get the referrer's information
        if (!supabase) {
          console.error("Supabase client not available");
          return;
        }

        const { data: referrerData, error: referrerError } = await supabase
          .from("telegram_users")
          .select("user_id, first_name, photo_url, game_state")
          .eq("user_id", userData.referred_by)
          .single();

        // debug log removed

        if (referrerError || !referrerData) {
          // debug log removed
          setIsLoading(false);
          return;
        }

        // debug log removed

        setReferrer({
          id: referrerData.user_id,
          firstName: referrerData.first_name,
          level: referrerData.game_state?.level || 1,
          coins: referrerData.game_state?.coins || 0,
          photoUrl: referrerData.photo_url,
        });
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };

    loadReferrerInfo();
  }, [userId]);

  const handleClaimReward = async () => {
    try {
      setIsClaiming(true);

      // Fetch the user's referral data first
      if (!supabase) {
        console.error("Supabase client not available");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("telegram_users")
        .select("referred_by")
        .eq("user_id", userId)
        .single();

      if (userError) {
        gameToast.error("Failed to claim reward. Please try again.");
        return;
      }

      if (!userData.referred_by) {
        gameToast.error("No referral data found. Please try again.");
        return;
      }

      const referrerId = userData.referred_by;
      console.log(
        `[REFERRAL POPUP DEBUG] Processing referral from referrer ${referrerId}, but not updating their coins (will be claimed manually)`
      );

      // Claim the referral reward using API
      const claimResponse = await fetch("/api/referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "claim_referee_reward",
          userId: userId,
          referrerId: userData.referred_by,
        }),
      });

      if (!claimResponse.ok) {
        const errorData = await claimResponse.json();
        console.error(
          "[REFERRAL POPUP DEBUG] Failed to claim reward:",
          errorData
        );
        gameToast.error("Failed to claim reward. Please try again.");
        return;
      }

      const claimResult = await claimResponse.json();
      console.log("[REFERRAL POPUP DEBUG] Claim result:", claimResult);

      // Ensure referrer's reward record is created/updated
      if (
        claimResult.created ||
        (claimResult.existingRecord &&
          !claimResult.existingRecord.reward_claimed)
      ) {
        console.log(
          "[REFERRAL POPUP DEBUG] Referrer reward record created/updated, referrer can now claim their reward"
        );

        // Trigger a custom event to notify the referral page to refresh
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("referralRewardCreated", {
              detail: { referrerId: userData.referred_by, rewardAmount: 50000 },
            })
          );
        }
      } else {
        console.log(
          `[REFERRAL POPUP DEBUG] Referrer reward already claimed (${claimResult.existingRecord?.reward_amount} coins), skipping referrer update`
        );
      }

      // Add the reward to the referee user's coins
      persistState((prevState) => ({
        ...prevState,
        coins: prevState.coins + REFEREE_REWARD,
      }));

      // Save in localStorage that we've shown and claimed the referral popup
      localStorage.setItem(`referral_popup_shown_${userId}`, "true");
      localStorage.setItem(`referral_reward_claimed_${userId}`, "true");

      gameToast.success(
        `You received ${REFEREE_REWARD.toLocaleString()} SPARK as a referral reward!`
      );

      // Close the popup first
      onClose();

      // Navigate to the referral page after a short delay
      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (error) {
      console.error("[REFERRAL POPUP DEBUG] Error claiming reward:", error);
      gameToast.error("Failed to claim reward. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 backdrop-blur-[14px] bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 transform transition-all duration-300 max-w-md mx-auto z-50">
        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />
          <div className="relative h-full flex flex-col px-4 py-8 space-y-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <Image
                  src="/assets/Close.png"
                  alt="Close"
                  width={32}
                  height={32}
                />
              </button>
            </div>

            <div className="flex flex-col items-center w-full space-y-6">
              <Image
                src="/assets/Referral/referalpopupimage.png"
                alt="Referral"
                width={160}
                height={160}
                style={{ width: "auto", height: "auto" }}
              />

              <h2 className="text-2xl font-bold text-[#E18700] mt-2 mb-1">
                Referral Reward
              </h2>

              <p className="text-gray-400 text-center text-sm mb-2">
                All new users who join via a referral link get a
                <br />
                special gift! Your reward is:
              </p>

              {isLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#E18700]"></div>
                </div>
              ) : referrer ? (
                <>
                  {/* Reward amount */}
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Image
                      src="/assets/spin/sparkicon.png"
                      alt="Spark"
                      width={32}
                      height={32}
                      style={{ width: "auto", height: "auto" }}
                    />
                    <span className="text-white text-2xl font-bold">
                      {REFERER_REWARD.toLocaleString()}
                    </span>
                  </div>

                  {/* Referrer info */}
                  <div className="w-full bg-[#3A1C09] rounded-[12px] p-4 mt-2 mb-2">
                    <div className="flex items-center justify-between gap-5">
                      {/* Referrer avatar */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                          {referrer.photoUrl ? (
                            <Image
                              src={referrer.photoUrl}
                              alt={referrer.firstName}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#E18700] text-white text-2xl font-bold">
                              {referrer.firstName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-bold text-lg mb-1">
                            {referrer.firstName}
                          </p>
                          <div className="flex items-center text-sm text-gray-400 space-x-2">
                            <span>LVL {referrer.level}</span>
                          </div>
                        </div>
                      </div>
                      {/* Reward info aligned right */}
                      <div className="flex items-center gap-2">
                        <Image
                          src="/assets/spin/sparkicon.png"
                          alt="Spark"
                          width={16}
                          height={16}
                        />
                        <span>{REFERER_REWARD.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-400 py-6 text-lg">
                  Could not find referrer information
                </p>
              )}

              {/* Claim button */}
              <button
                onClick={handleClaimReward}
                disabled={isLoading || isClaiming || !referrer}
                className={`w-fit h-[48px] relative rounded-[16px] px-10 font-semibold text-lg text-white mt-2 ${
                  isLoading || isClaiming || !referrer
                    ? "bg-gray-600"
                    : "bg-[#E18700] border border-[#AF5500] hover:brightness-110"
                }`}
              >
                {isClaiming ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Claiming...
                  </span>
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReferralClaimPopup;
