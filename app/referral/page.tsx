"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useWebApp } from "../hooks/useWebApp";
import { useRouter } from "next/navigation";
import Image from "next/image";






import Link from "next/link";
import { useUser } from "../hooks/useUser";
import { useGame } from "../context/GameContext";
import { gameToast } from "../utility/customToast";
import {
  getReferralStats,
  generateReferralLink,
  generateDirectMiniAppReferralLink,
  loadReferralStats,
  ReferralStats,
} from "../lib/referralHelpers";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import CustomYellowButton from "@/app/ui/CustomYellowButton";

// TEMPORARY DEBUG - Remove this after testing
if (typeof window !== "undefined") {
  Object.keys(localStorage).forEach((key) => {
    if (key.includes("referral_") || key === "last_startapp_param") {
      console.log("Clearing localStorage key for testing:", key);
      localStorage.removeItem(key);
    }
  });
}

export default function InvitePage() {
  const router = useRouter();
  const { instance: WebApp } = useWebApp(true);
  const user = useUser();
  const { gameState, persistState } = useGame();
  const [referralLink, setReferralLink] = useState("");
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalRewards: 0,
    referees: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pendingReferrerRewards, setPendingReferrerRewards] = useState(0);
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);

  // Set body style for better scrolling in Telegram Mini App
  useEffect(() => {
    // Set body style to allow scrolling
    if (typeof document !== "undefined") {
      document.body.style.height = "100%";
      document.body.style.overflow = "auto";
    }

    return () => {
      if (typeof document !== "undefined") {
        document.body.style.height = "";
        document.body.style.overflow = "";
      }
    };
  }, []);

  // Fetch pending referrer rewards
  const fetchPendingReferrerRewards = useCallback(async () => {
    if (!user.id) return;

    if (!supabase) {
      console.error("Supabase client not available");
      return;
    }

    try {
      console.log(
        "[REFERRAL PAGE DEBUG] Fetching pending referrer rewards for user:",
        user.id
      );

      // Get all referrals where this user is the referrer and rewards haven't been claimed
      const { data, error } = await supabase
        .from("user_referrals")
        .select("reward_amount, referee_id, reward_claimed")
        .eq("referrer_id", user.id.toString())
        .eq("reward_claimed", false);

      if (error) {
        console.error(
          "[REFERRAL PAGE DEBUG] Error fetching pending referrer rewards:",
          error
        );
        return;
      }

      console.log("[REFERRAL PAGE DEBUG] Raw referral data:", data);

      // Calculate total pending rewards
      const totalPending =
        data?.reduce(
          (sum, referral) => sum + (referral.reward_amount || 50000),
          0
        ) || 0;
      console.log(
        "[REFERRAL PAGE DEBUG] Total pending rewards calculated:",
        totalPending
      );

      setPendingReferrerRewards(totalPending);
    } catch (error) {
      console.error(
        "[REFERRAL PAGE DEBUG] Error in fetchPendingReferrerRewards:",
        error
      );
    }
  }, [user.id]);

  // Define fetchReferralStats to load referral data
  const fetchReferralStats = useCallback(async () => {
    if (!user.id) return;

    try {
      setIsLoading(true);

      // Try to use the new loadReferralStats function
      const referralData = await loadReferralStats(user.id.toString());
      if (referralData) {
        // Get the regular referral stats
        const referralStats = await getReferralStats(user.id.toString());
        if (referralStats) {
          setStats(referralStats);

          // Update the gameState to keep it in sync
          persistState(
            (prevState) =>
              ({
                ...prevState,
                referral: {
                  ...(prevState.referral || {}),
                  inviteLink: generateReferralLink(user.id.toString()),
                  referredFriends: referralStats.totalReferrals,
                  totalRewards: referralStats.totalRewards,
                },
              } as typeof prevState)
          );
        }
      } else {
        // Fallback to game state if database query fails
        if (gameState.referral) {
          setStats({
            totalReferrals: gameState.referral.referredFriends || 0,
            totalRewards: gameState.referral.totalRewards || 0,
            referees: [],
          });
        }
      }

      // Fetch pending referrer rewards
      await fetchPendingReferrerRewards();
    } catch (error) {
      console.error("Error loading referral stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, gameState.referral, persistState, fetchPendingReferrerRewards]);

  // Handle claiming all pending referrer rewards
  const handleClaimReferrerRewards = useCallback(async () => {
    if (!user.id || pendingReferrerRewards <= 0 || isClaimingRewards) return;

    if (!supabase) {
      gameToast.error("Database connection not available");
      return;
    }

    try {
      setIsClaimingRewards(true);

      // Get all unclaimed referrals
      const { data: unclaimedReferrals, error: fetchError } = await supabase
        .from("user_referrals")
        .select("id, reward_amount")
        .eq("referrer_id", user.id.toString())
        .eq("reward_claimed", false);

      if (fetchError) {
        gameToast.error("Failed to claim rewards. Please try again.");
        console.error("Error fetching unclaimed referrals:", fetchError);
        setIsClaimingRewards(false);
        return;
      }

      if (!unclaimedReferrals || unclaimedReferrals.length === 0) {
        gameToast.info("No rewards to claim");
        setIsClaimingRewards(false);
        return;
      }

      // Mark all as claimed in the database
      for (const referral of unclaimedReferrals) {
        const { error: updateError } = await supabase!
          .from("user_referrals")
          .update({
            reward_claimed: true,
            reward_claimed_at: new Date().toISOString(),
          })
          .eq("id", referral.id);

        if (updateError) {
          console.error(`Error updating referral ${referral.id}:`, updateError);
        }
      }

      // Get the total amount to add to the user's coins
      const totalReward = unclaimedReferrals.reduce(
        (sum, referral) => sum + (referral.reward_amount || 50000),
        0
      );

      // Update the user's game state
      const { data: userData, error: userError } = await supabase
        .from("telegram_users")
        .select("game_state")
        .eq("user_id", user.id.toString())
        .single();

      if (userError || !userData?.game_state) {
        gameToast.error("Failed to claim rewards. Please try again.");
        console.error("Error fetching user data:", userError);
        setIsClaimingRewards(false);
        return;
      }

      // Clone the game state to avoid reference issues
      const gameState = JSON.parse(JSON.stringify(userData.game_state));

      // Update coins and referral stats
      const currentCoins = Number(gameState.coins || 0);
      const currentTotalCoins = Number(gameState.totalCoins || 0);

      // Ensure referral object exists
      if (!gameState.referral) {
        gameState.referral = {
          inviteLink: generateReferralLink(user.id.toString()),
          referredFriends: 0,
          totalRewards: 0,
        };
      }

      // Calculate updated values
      const currentTotalRewards = Number(gameState.referral.totalRewards || 0);

      // Update the game state
      gameState.coins = currentCoins + totalReward;
      gameState.totalCoins = currentTotalCoins + totalReward;
      gameState.referral.totalRewards = currentTotalRewards + totalReward;

      // Save the updated game state
      const { error: updateError } = await supabase!
        .from("telegram_users")
        .update({
          game_state: gameState,
          last_updated: new Date().toISOString(),
        })
        .eq("user_id", user.id.toString());

      if (updateError) {
        gameToast.error("Failed to update rewards. Please try again.");
        console.error("Error updating game state:", updateError);
        setIsClaimingRewards(false);
        return;
      }

      // Update local state
      persistState(
        (prevState) =>
          ({
            ...prevState,
            coins: (prevState.coins || 0) + totalReward,
            totalCoins: (prevState.totalCoins || 0) + totalReward,
            referral: {
              ...(prevState.referral || {}),
              totalRewards:
                (prevState.referral?.totalRewards || 0) + totalReward,
            },
          } as typeof prevState)
      );

      // Reset pending rewards
      setPendingReferrerRewards(0);

      // Show success message
      gameToast.success(
        `Claimed ${totalReward.toLocaleString()} SPARK from referrals!`
      );

      // Refresh stats after claiming
      if (user.id) {
        try {
          setIsLoading(true);

          // Reload stats directly without circular reference
          const referralData = await loadReferralStats(user.id.toString());
          if (referralData) {
            const referralStats = await getReferralStats(user.id.toString());
            if (referralStats) {
              setStats(referralStats);

              // Update gameState
              persistState(
                (prevState) =>
                  ({
                    ...prevState,
                    referral: {
                      ...(prevState.referral || {}),
                      inviteLink: generateReferralLink(user.id.toString()),
                      referredFriends: referralStats.totalReferrals,
                      totalRewards: referralStats.totalRewards,
                    },
                  } as typeof prevState)
              );
            }
          }

          // Fetch new pending rewards
          await fetchPendingReferrerRewards();
        } catch (error) {
          console.error("Error refreshing stats after claim:", error);
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Error claiming referrer rewards:", error);
      gameToast.error("Failed to claim rewards. Please try again.");
    } finally {
      setIsClaimingRewards(false);
    }
  }, [
    user.id,
    pendingReferrerRewards,
    isClaimingRewards,
    persistState,
    fetchPendingReferrerRewards,
  ]);

  // Load referral stats from database
  useEffect(() => {
    fetchReferralStats();
  }, [fetchReferralStats]);

  // Add visibility change listener to refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log(
          "[REFERRAL PAGE DEBUG] Page became visible, refreshing data"
        );
        fetchReferralStats();
        fetchPendingReferrerRewards();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchReferralStats, fetchPendingReferrerRewards]);

  // Generate or retrieve referral link
  useEffect(() => {
    if (user.id) {
      // Generate the links for sharing
      const deepLink = generateReferralLink(user.id.toString());
      const httpLink = generateDirectMiniAppReferralLink(user.id.toString());

      // Set the link for UI display to the HTTP link (more compatible)
      setReferralLink(httpLink);

      // Save the links to game state if they don't exist
      if (!gameState.referral?.inviteLink) {
        persistState((prevState) => ({
          ...prevState,
          referral: {
            ...(prevState.referral || { referredFriends: 0, totalRewards: 0 }),
            inviteLink: httpLink,
            deepLinkInvite: deepLink,
          },
        }));
      }
    }
  }, [user.id, gameState.referral?.inviteLink, persistState]);

  // Handle copying to clipboard
  const handleCopyLink = useCallback(async () => {
    // Always use the direct mini app link for better compatibility
    const linkToCopy = generateDirectMiniAppReferralLink(user.id.toString());

    if (linkToCopy) {
      try {
        await navigator.clipboard.writeText(linkToCopy);
        gameToast.success(`Link copied to clipboard`);

        // Optional haptic feedback if in Telegram
        if (WebApp?.HapticFeedback) {
          WebApp.HapticFeedback.impactOccurred("light");
        }
      } catch (err) {
        console.error("Failed to copy link:", err);
        gameToast.error("Failed to copy link");
      }
    }
  }, [WebApp, user.id]);

  // Handle opening share via Telegram
  const handleShareViaApp = useCallback(
    (linkType: "standard" | "direct" = "standard") => {
      const linkToShare =
        linkType === "direct"
          ? generateDirectMiniAppReferralLink(user.id.toString())
          : referralLink;
      const messageText =
        linkType === "direct"
          ? `Join me in Phoenix Game and get bonus rewards instantly! 🎮 Just click the link to open the game and claim your bonus! \n\n${linkToShare}`
          : `Join me in Phoenix Game and get bonus rewards! 🎮 \n\n${linkToShare}`;

      if (linkToShare) {
        if (typeof window !== "undefined" && navigator.share) {
          // Use Web Share API if available
          navigator
            .share({
              title: "Join Phoenix Game",
              text: messageText,
              url: linkToShare,
            })
            .catch((err) => console.error("Share error:", err));
        } else if (WebApp) {
          // Fallback to Telegram specific sharing if available
          // Create a temp link element and click it (Telegram handles this)
          const a = document.createElement("a");
          a.href = `https://t.me/share/url?url=${encodeURIComponent(
            linkToShare
          )}&text=${encodeURIComponent(messageText)}`;
          a.setAttribute("target", "_blank");
          a.click();
        }

        // Optional haptic feedback
        if (WebApp?.HapticFeedback) {
          WebApp.HapticFeedback.impactOccurred("medium");
        }
      }
    },
    [referralLink, WebApp, user.id]
  );

  useEffect(() => {
    if (WebApp) {
      WebApp.BackButton.show();
      WebApp.enableClosingConfirmation();

      const handleBack = () => {
        router.push("/");
      };

      WebApp.BackButton.onClick(handleBack);

      return () => {
        WebApp.BackButton.offClick(handleBack);
      };
    }
  }, [WebApp, router]);

  // Add listener for forced game refreshes (e.g., after daily reward claim)
  useEffect(() => {
    const handleForceRefresh = () => {
      // Refresh referral stats and pending rewards when game state is refreshed
      fetchReferralStats();
      fetchPendingReferrerRewards();
    };

    const handleReferralRewardCreated = (event: CustomEvent) => {
      // Refresh pending rewards when a new referral reward is created
      console.log(
        "[REFERRAL PAGE DEBUG] Referral reward created event received:",
        event.detail
      );
      fetchPendingReferrerRewards();
    };

    window.addEventListener("forceGameRefresh", handleForceRefresh);
    window.addEventListener(
      "referralRewardCreated",
      handleReferralRewardCreated as EventListener
    );

    return () => {
      window.removeEventListener("forceGameRefresh", handleForceRefresh);
      window.removeEventListener(
        "referralRewardCreated",
        handleReferralRewardCreated as EventListener
      );
    };
  }, [fetchReferralStats, fetchPendingReferrerRewards]);

  return (
    <main className="flex flex-col min-h-[100dvh] max-w-md mx-auto overflow-y-auto">
      {/* Background Image */}

      <div className="p-4 pb-36">
        {/* Your Friends Section */}
        <div className="mt-8">
          <h2 className="text-sm font-bold text-gray-400 mb-6">Your Friends</h2>
          <div className="flex items-center gap-3">
            <Image
              src="/assets/Referral/ReferralFriendsIcon.png"
              alt="Invite Friends"
              style={{ width: "auto", height: "auto" }}
            />
            <span className="text-white text-3xl font-bold">
              {isLoading ? "Loading..." : `${stats.totalReferrals} Friends`}
            </span>
          </div>

          {stats.totalRewards > 0 && (
            <div className="mt-2 text-sm text-[#E18700]">
              You&apos;ve earned {stats.totalRewards.toLocaleString()} SPARK
              from referrals!
            </div>
          )}
        </div>

        {/* How it Works link */}
        <Link href="/referral/howitworks">
          <h2 className="text-sm text-[#E18700] py-6 underline font-bold decoration-[#E18700] cursor-pointer">
            How it Works!
          </h2>
        </Link>

        {/* Refer More Earn More card - always shown */}
        <div className="relative rounded-xl overflow-hidden backdrop-blur-[14px] bg-[#291818]/70 border border-white/10 p-4 mb-8">
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-2/12">
              <Image
                src="/assets/Referral/ReferralHandShakeIcon.png"
                alt="Handshake"
                style={{ width: "auto", height: "auto" }}
              />
            </div>
            <div className="w-10/12 space-y-2 font-bold">
              <h3 className="text-white">+50,000 Coins For Invite</h3>
              <p className="text-sm text-gray-300">
                <span className="text-[#909090]">Get </span>
                <span className="text-[#E18700]">50,000 SPARK</span>{" "}
                <span className="text-[#909090]">
                  per invited friend & bonus rewards for level up by friends!
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Claim section - always shown, with disabled button when no rewards */}
        <h3 className="text-lg font-bold text-[#E18700] mb-4">Claim</h3>
        <div className="relative rounded-xl overflow-hidden backdrop-blur-[14px] bg-[#291818]/70 border border-white/10 p-4 mb-8">
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {pendingReferrerRewards > 0 ? (
                <>
                  <Image src="/assets/spin/sparkicon.png" alt="SPARK" width={24} height={24} />
                  <span className="text-xl font-bold text-[#E18700]">
                    {pendingReferrerRewards.toLocaleString()}
                  </span>
                </>
              ) : (
                <span className="text-md text-white">
                  <div>
                    Refer More
                    <br />
                    Earn More
                  </div>
                </span>
              )}
            </div>
            <CustomYellowButton
              onClick={handleClaimReferrerRewards}
              disabled={isClaimingRewards || pendingReferrerRewards <= 0}
              className={`px-8 py-3 ${
                isClaimingRewards || pendingReferrerRewards <= 0
                  ? "opacity-50"
                  : ""
              }`}
            >
              {isClaimingRewards ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Claiming...
                </span>
              ) : (
                "Claim"
              )}
            </CustomYellowButton>
          </div>
        </div>

        {/* Referral Friends List */}
        <div className="mt-8">
          {stats.totalReferrals === 0 ? (
            <div className="flex flex-col items-center">
              <Image
                src="/assets/Referral/NoFriendsYet.png"
                alt="No friends yet"
                style={{ width: "auto", height: "auto" }}
              />
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold text-[#E18700] mb-4">
                Referrals
              </h3>
              <div className="text-left w-full backdrop-blur-[14px] bg-[#291818]/70 border border-white/10 rounded-xl overflow-hidden">
                {/* User profile display */}
                <div className="flex flex-col">
                  {stats.referees &&
                    stats.referees.map((referee, index) => {
                      // Extract date info for display
                      const referralDate = referee.joinedAt
                        ? format(new Date(referee.joinedAt), "dd MMM, yyyy")
                        : "Unknown date";
                      // Default reward per friend
                      const rewardAmount = 50000;
                      return (
                        <div key={referee.userId || index}>
                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {/* Profile image with level badge */}
                                <div className="relative">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#444] to-[#222] flex items-center justify-center overflow-hidden">
                                    <div className="text-white text-lg font-bold">
                                      {referee.firstName?.charAt(0) || "?"}
                                    </div>
                                  </div>
                                </div>

                                {/* User info */}
                                <div>
                                  <h4 className="text-white font-bold">
                                    {referee.firstName || "Unknown User"}
                                  </h4>
                                  <span className="text-gray-400 text-xs">
                                    LVL {referee.level || 1}
                                  </span>
                                  <span
                                    className="inline-block mx-1 align-middle text-gray-400 text-xs"
                                    style={{
                                      fontSize: "18px",
                                      lineHeight: "0",
                                    }}
                                  >
                                    •
                                  </span>
                                  <span className="text-gray-400 text-xs">
                                    {referralDate}
                                  </span>
                                </div>
                              </div>

                              {/* Reward amount */}
                              <div className="flex items-center gap-1">
                                <Image
                                  src="/assets/spin/sparkicon.png"
                                  alt="SPARK"
                                  width={16}
                                  height={16}
                                />
                                <span className="text-[#E18700] font-bold">
                                  {rewardAmount.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Add divider except for the last item */}
                          {index < stats.referees.length - 1 && (
                            <div className="border-b border-gray-700/50 mx-4"></div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fixed Invite Button Section */}
      <div className="fixed bottom-0 left-0 right-0 z-10 max-w-md mx-auto">
        <div className="relative rounded-t-xl overflow-hidden px-4 py-6">
          <Image
            src="/assets/Referral/ReferralInviteButtonBG.png"
            alt="Invite Button"
            fill
            style={{ objectFit: "cover" }}
            className="-z-10"
          />

          <div className="relative z-10 flex items-center gap-6">
            <CustomYellowButton
              className="flex items-center w-[300px]"
              onClick={() => handleShareViaApp("direct")}
            >
              Invite Friends
            </CustomYellowButton>
            <button
              onClick={() => handleCopyLink()}
              className="flex items-center"
            >
              <Image
                src="/assets/Referral/InviteLinkCopy.png"
                alt="Invite Button"
                style={{ width: "auto", height: "auto" }}
                className="cursor-pointer rounded-lg"
              />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
