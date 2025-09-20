"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useGame, TimerType } from "../context/GameContext";
import {
  AUTO_TAP_DURATION,
  AUTO_TAP_UNLOCK_COST,
} from "../constants/gameConstants";
import { calculateAutoTapReward } from "../utility/gameUtils";
import { useGameFeatures } from "../context/GameFeaturesContext";
import { gameToast } from "../utility/customToast";
import Image from "next/image";
import SparkyIcon from "../../public/assets/SparkyIcon.png";
import PurchaseBotPopupIcon from "../../public/assets/purchasebotpopupicon.png";
import ActivateBotPopupIcon from "../../public/assets/activatebotpopupicon.png";
import TapDiscriptionIcon from "../../public/assets/TapDiscriptionIcon.png";
import Close from "../../public/assets/Close.png";
import { supabase } from "@/lib/supabase";
import timerService from "../services/timerService";
import miningcompletedicon from "../../public/assets/miningcompletedicon.png";
import AutoTapBotInProgress from "../../public/assets/autotapbotinprogress.png";
import CustomYellowButton from "@/app/ui/CustomYellowButton";

// Extend the GameState type to include our custom property
declare module "../context/GameContext" {
  interface GameState {
    autoTapInitialPower?: number;
  }
}

// ===== Internal component: AutoTapInProgressPopup =====
interface AutoTapInProgressPopupProps {
  onClose: () => void;
  isOpen: boolean;
  _autoTapSpark: number;
  tapPowerLevel: number;
  _onSparkUpdate?: (spark: number) => void;
}

const AutoTapInProgressPopup: React.FC<AutoTapInProgressPopupProps> = ({
  onClose,
  isOpen,
  _autoTapSpark,
  tapPowerLevel,
  _onSparkUpdate,
}) => {
  const { gameState, persistState } = useGame();

  const [timeLeft, setTimeLeft] = useState(AUTO_TAP_DURATION);
  const [progress, setProgress] = useState(0);
  const [earnedSpark, setEarnedSpark] = useState(0);
  const updateRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedProgressRef = useRef(0);
  const isCompletingRef = useRef(false);
  const totalDuration = AUTO_TAP_DURATION * 1000;
  // Store the initial tap power level to use for calculations throughout this session
  const initialTapPowerRef = useRef(
    gameState.autoTapInitialPower || tapPowerLevel
  );

  const handleAutoTapStop = useCallback(() => {
    isCompletingRef.current = true;
    if (updateRef.current) {
      clearInterval(updateRef.current);
      updateRef.current = null;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!gameState.autoTapActive) {
      handleAutoTapStop();
      return;
    }

    const endTime = gameState.autoTapEndTime;
    const startTime = gameState.autoTapStartTime;

    const updateTimer = () => {
      const now = Date.now();
      if (endTime && startTime) {
        const remaining = Math.max(0, endTime - now);
        const elapsed = Math.min(totalDuration, totalDuration - remaining);
        const progressPercent = Math.min(100, (elapsed / totalDuration) * 100);

        const elapsedSeconds = Math.floor(elapsed / 1000);
        // Calculate sparks using the initial tap power level
        const initialTapPower = initialTapPowerRef.current;
        const currentSparkEarned = Math.min(
          elapsedSeconds * initialTapPower,
          calculateAutoTapReward(initialTapPower)
        );

        setTimeLeft(Math.floor(remaining / 1000));
        setProgress(progressPercent);
        setEarnedSpark(currentSparkEarned);

        accumulatedProgressRef.current++;

        if (accumulatedProgressRef.current >= 5) {
          persistState((prev) => ({
            ...prev,
            autoTapProgress: progressPercent,
            autoTapTimeLeft: Math.floor(remaining / 1000),
            autoTapSpark: currentSparkEarned,
            autoTapCoins: currentSparkEarned,
            // Don't update actual coins here - they will be updated when claimed
          }));

          accumulatedProgressRef.current = 0;
        }

        if (remaining <= 0 && !isCompletingRef.current) {
          // Use the consistent formula for final reward using initial tap power
          const initialTapPower = initialTapPowerRef.current;
          const finalReward = calculateAutoTapReward(initialTapPower);

          setProgress(100);
          setTimeLeft(0);

          persistState((prev) => ({
            ...prev,
            autoTapActive: false,
            autoTapEndTime: Date.now(),
            autoTapCoins: finalReward,
            autoTapClaimed: false,
            autoTapProgress: 100,
            autoTapTimeLeft: 0,
            autoTapSpark: finalReward,
            // Don't update actual coins here - they will be updated when claimed
          }));

          setTimeout(() => {
            handleAutoTapStop();
          }, 100);

          if (updateRef.current) {
            clearInterval(updateRef.current);
            updateRef.current = null;
          }
        }
      }
    };

    updateTimer();

    if (!isCompletingRef.current && !updateRef.current) {
      updateRef.current = setInterval(updateTimer, 1000);
    }

    return () => {
      if (updateRef.current) {
        clearInterval(updateRef.current);
        updateRef.current = null;
      }
    };
  }, [
    gameState.autoTapActive,
    gameState.autoTapEndTime,
    gameState.autoTapStartTime,
    persistState,
    handleAutoTapStop,
    initialTapPowerRef,
    totalDuration,
  ]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 backdrop-blur-[14px] bg-black/50 z-[9998]"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div className="fixed inset-x-0 bottom-0 transform transition-all duration-300 max-w-md mx-auto z-[9999]">
        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />
          <div className="relative h-full flex flex-col p-6">
            <div className="flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="text-gray-400 hover:text-white"
              >
                <Image src={Close.src} alt="Close" width={32} height={32} />
              </button>
            </div>

            <div className="flex flex-col items-center space-y-6">
              <Image
                src={AutoTapBotInProgress}
                alt="Auto Tap"
                width={150}
                height={150}
                style={{ width: "auto", height: "auto" }}
              />
              <h2 className="text-2xl font-bold text-[#E18700]">
                The Tap Knight is active
              </h2>
              <p className="text-gray-400 text-center">
                The bot is active and collecting coins.
                <br />
                Keep tapping for extra rewards.
                <br />
              </p>

              <div className="w-full flex items-center justify-center space-x-2 mt-4">
                <Image
                  src={SparkyIcon}
                  alt="Spark"
                  width={24}
                  height={24}
                  style={{ width: "auto", height: "auto" }}
                />
                <span className="text-2xl font-bold text-white">
                  {earnedSpark}
                  <span className="text-gray-400">
                    /{calculateAutoTapReward(initialTapPowerRef.current)}
                  </span>
                </span>
              </div>

              <div className="w-full mt-4">
                <div className="relative w-full h-[30px] bg-[#32363C] rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#E18700] transition-all duration-300 flex items-center justify-center text-black font-bold rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              <div className="bg-[#3a1c09] rounded-xl p-4 w-full mt-4">
                <div className="flex items-center space-x-3">
                  <Image
                    src={TapDiscriptionIcon}
                    alt="Description"
                    width={36}
                    height={36}
                    style={{ width: "auto", height: "auto" }}
                  />
                  <span className="text-[#909090] leading-relaxed text-sm">
                    You can use the bot 3 times daily.
                    <br />
                    Claim your reward before starting the next run.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ===== Internal component: AutoTapClaimPopup =====
interface AutoTapClaimPopupProps {
  isOpen: boolean;
  onClose: () => void;
  sparkToCollect: number;
}

const AutoTapClaimPopup: React.FC<AutoTapClaimPopupProps> = ({
  isOpen,
  onClose,
  sparkToCollect,
}) => {
  const { gameState, criticalStateUpdate } = useGame();
  const {
    autoTap: { uncollectedRewards, collectReward },
  } = useGameFeatures();

  // Get the reward amount using the initial tap power level instead of current tap level
  const rewardAmount = calculateAutoTapReward(
    gameState.autoTapInitialPower || gameState.upgrades?.tapLevel || 1
  );

  useEffect(() => {
    // If no rewards to collect, close immediately
    if ((rewardAmount <= 0 || gameState.autoTapClaimed) && isOpen) {
      onClose();
    }
  }, [
    sparkToCollect,
    gameState,
    rewardAmount,
    uncollectedRewards.length,
    onClose,
    isOpen,
  ]);

  if (!isOpen) return null;

  const handleClaimClick = async () => {
    try {
      if (rewardAmount <= 0) {
        gameToast.error("No rewards to collect!");
        onClose();
        return;
      }

      // Use a synthetic ID for consistency
      const syntheticTimerId = `autotap-${Date.now()}`;

      // First update game state to mark as claimed and reset auto tap state
      // Important: We use criticalStateUpdate to ensure database consistency
      await criticalStateUpdate({
        coins: gameState.coins + rewardAmount, // Add coins only when claiming
        autoTapCoins: 0,
        autoTapClaimed: true,
        autoTapActive: false,
        autoTapStartTime: 0,
        autoTapEndTime: 0,
        autoTapProgress: 0,
        autoTapTimeLeft: 0,
        autoTapSpark: 0,
        autoTapTotalCoins: 0,
        autoTapInitialPower: 0, // Reset initial power level
        application_state: {
          ...gameState.application_state,
          isAutotapPurchased: true,
          isAutotapActive: false,
          has_visited_earn_page:
            gameState.application_state?.has_visited_earn_page ?? false,
        },
      });

      // Then collect the reward through the service
      await collectReward(syntheticTimerId, rewardAmount);

      // Force a UI refresh
      window.dispatchEvent(new CustomEvent("forceGameRefresh"));

      gameToast.success(
        `Successfully collected ${rewardAmount.toLocaleString()} spark!`
      );
      onClose();
    } catch (error) {
      console.error("Error collecting reward:", error);
      gameToast.error("Failed to collect reward");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      <div
        className="fixed inset-0 backdrop-blur-[14px] bg-black/50"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 transform transition-all duration-300 max-w-md mx-auto">
        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />
          <div className="relative h-full flex flex-col p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
            >
              <Image src={Close.src} alt="Close" width={32} height={32} />
            </button>

            <div className="flex flex-col items-center py-[40px] space-y-6">
              <Image
                src={miningcompletedicon}
                alt="Auto Tap Bot"
                width={100}
                height={100}
                style={{ width: "auto", height: "auto" }}
              />

              <h2 className="text-2xl font-bold text-[#E18700]">
                Auto Tap Rewards Ready!
              </h2>
              <span className="text-gray-400 text-center text-sm">
                The bot has hit its coin mining limit. You
                <br />
                can use this boost up to 3 times.
              </span>

              <div className="w-full flex items-center justify-center space-x-2">
                <Image
                  src={SparkyIcon}
                  alt="Spark"
                  width={24}
                  height={24}
                  style={{ width: "auto", height: "auto" }}
                />
                <span className="text-2xl font-bold text-white">
                  {rewardAmount.toLocaleString()}
                </span>
              </div>

              <CustomYellowButton
                onClick={handleClaimClick}
                className="w-[160px] flex items-center justify-center"
              >
                Claim SPARK
              </CustomYellowButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== Main component: AutoTapPopup =====
interface AutoTapPopupProps {
  onClose: () => void;
  isOpen: boolean;
  autoTapSpark: number;
  tapPowerLevel: number;
}

const AutoTapPopup: React.FC<AutoTapPopupProps> = ({
  onClose,
  isOpen,
  autoTapSpark,
  tapPowerLevel,
}) => {
  const { gameState, persistState, criticalStateUpdate } = useGame();
  const {
    autoTap: {},
    timers: { startTimer },
  } = useGameFeatures();
  const [currentView, setCurrentView] = useState<
    "purchase" | "progress" | "claim"
  >("purchase");
  const previousStateRef = useRef({
    isActive: false,
    hasUnclaimedRewards: false,
  });

  // Add a debouncing mechanism
  const viewChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingViewChangeRef = useRef<"purchase" | "progress" | "claim" | null>(
    null
  );

  // Check if the user has unclaimed rewards
  const hasUnclaimedRewards =
    (gameState.autoTapCoins ?? 0) > 0 && !gameState.autoTapClaimed;
  const isActive = gameState.autoTapActive;

  // Add a stable view change function with debouncing
  const debouncedSetView = useCallback(
    (newView: "purchase" | "progress" | "claim") => {
      // Clear any existing timeout
      if (viewChangeTimeoutRef.current) {
        clearTimeout(viewChangeTimeoutRef.current);
        viewChangeTimeoutRef.current = null;
      }

      // Don't schedule transitions from claim to purchase too quickly
      if (currentView === "claim" && newView === "purchase") {
        viewChangeTimeoutRef.current = setTimeout(() => {
          pendingViewChangeRef.current = null;
          setCurrentView(newView);
        }, 500); // Longer delay for claim to purchase
      } else {
        // More immediate for other transitions
        pendingViewChangeRef.current = null;
        setCurrentView(newView);
      }
    },
    [currentView]
  );

  // Set initial view on mount with console logs
  useEffect(() => {
    console.log(
      "[AutoTapPopup] Initial state - isActive:",
      isActive,
      "hasUnclaimedRewards:",
      hasUnclaimedRewards
    );

    if (isActive) {
      debouncedSetView("progress");
      console.log("[AutoTapPopup] Setting initial view to progress");
    } else if (hasUnclaimedRewards) {
      debouncedSetView("claim");
      console.log("[AutoTapPopup] Setting initial view to claim");
    } else {
      debouncedSetView("purchase");
      console.log("[AutoTapPopup] Setting initial view to purchase");
    }

    return () => {
      if (viewChangeTimeoutRef.current) {
        clearTimeout(viewChangeTimeoutRef.current);
        viewChangeTimeoutRef.current = null;
      }
    };
  }, [debouncedSetView, hasUnclaimedRewards, isActive]); // Add the required dependencies

  // Handle view changes based on state, with debouncing
  useEffect(() => {
    // If we already have a pending view change, don't schedule another one
    if (pendingViewChangeRef.current) return;

    // For active state, immediately switch to progress view
    if (isActive && currentView !== "progress") {
      debouncedSetView("progress");
      previousStateRef.current = {
        isActive: true,
        hasUnclaimedRewards: !!hasUnclaimedRewards,
      };
      return;
    }

    // For other state changes, schedule a state change with debouncing
    pendingViewChangeRef.current = isActive
      ? "progress"
      : hasUnclaimedRewards
      ? "claim"
      : "purchase";

    viewChangeTimeoutRef.current = setTimeout(() => {
      if (pendingViewChangeRef.current) {
        setCurrentView(pendingViewChangeRef.current);
        pendingViewChangeRef.current = null;
      }

      previousStateRef.current = {
        isActive: !!isActive,
        hasUnclaimedRewards: !!hasUnclaimedRewards,
      };
    }, 200);

    return () => {
      if (viewChangeTimeoutRef.current) {
        clearTimeout(viewChangeTimeoutRef.current);
        viewChangeTimeoutRef.current = null;
      }
    };
  }, [isActive, hasUnclaimedRewards, currentView, debouncedSetView]);

  if (!isOpen) return null;

  // Render appropriate view based on currentView state instead of direct conditions
  if (currentView === "progress") {
    return (
      <AutoTapInProgressPopup
        isOpen={isOpen}
        onClose={onClose}
        _autoTapSpark={autoTapSpark}
        tapPowerLevel={tapPowerLevel}
        _onSparkUpdate={(spark) => {
          persistState((prev) => ({
            ...prev,
            autoTapSpark: spark,
            autoTapCoins: spark,
          }));
        }}
      />
    );
  }

  if (currentView === "claim") {
    return (
      <AutoTapClaimPopup
        isOpen={isOpen}
        onClose={onClose}
        sparkToCollect={gameState.autoTapCoins ?? 0}
      />
    );
  }

  const handlePurchaseAutoTap = async () => {
    if (
      !gameState.application_state?.isAutotapPurchased &&
      gameState.coins < AUTO_TAP_UNLOCK_COST
    ) {
      gameToast.error(
        `You need at least ${AUTO_TAP_UNLOCK_COST.toLocaleString()} spark to purchase Auto Tap!`
      );
      return;
    }

    try {
      await criticalStateUpdate({
        ...gameState,
        coins: gameState.coins - AUTO_TAP_UNLOCK_COST,
        application_state: {
          ...(gameState.application_state || {}),
          isAutotapPurchased: true,
          isAutotapActive: false,
          has_visited_earn_page:
            gameState.application_state?.has_visited_earn_page || false,
        },
      });

      persistState((prev) => ({
        ...prev,
        autoTapDaily: {
          lastReset: new Date().toISOString(),
          usesRemaining: 3,
        },
      }));

      gameToast.success("Auto Tap Bot purchased successfully!");
    } catch (error) {
      console.error("Error purchasing Auto Tap:", error);
      gameToast.error("Failed to purchase Auto Tap");
    }
  };

  const handleAutoTapActivation = async () => {
    try {
      const userId = gameState.user_id;
      if (!userId) {
        gameToast.error("User ID not found");
        return;
      }

      const usesRemaining = gameState.autoTapDaily?.usesRemaining ?? 0;
      if (usesRemaining <= 0) {
        gameToast.error("No Auto Tap uses remaining today!");
        return;
      }

      // Check if user has enough sparks
      if (
        !gameState.application_state?.isAutotapPurchased &&
        gameState.coins < AUTO_TAP_UNLOCK_COST
      ) {
        gameToast.error(
          `You need at least ${AUTO_TAP_UNLOCK_COST.toLocaleString()} spark to purchase Auto Tap!`
        );
        return;
      }

      const now = Date.now();
      const duration = AUTO_TAP_DURATION * 1000; // Convert to milliseconds
      const tapPowerLevel = gameState.upgrades?.tapLevel || 1;
      // Calculate reward consistently with the same formula used throughout the app
      const totalPossibleReward = tapPowerLevel * AUTO_TAP_DURATION;

      // Update database first to ensure consistency
      if (!supabase) {
        gameToast.error("Database connection not available");
        return;
      }

      const { error: dbError } = await supabase
        .from("telegram_users")
        .update({
          game_state: {
            ...gameState,
            coins: !gameState.application_state?.isAutotapPurchased
              ? gameState.coins - AUTO_TAP_UNLOCK_COST
              : gameState.coins,
            application_state: {
              ...(gameState.application_state || {}),
              isAutotapPurchased: true,
              isAutotapActive: true,
              has_visited_earn_page:
                gameState.application_state?.has_visited_earn_page || false,
            },
            autoTapActive: true,
            autoTapStartTime: now,
            autoTapEndTime: now + duration,
            autoTapDaily: {
              ...gameState.autoTapDaily,
              usesRemaining: usesRemaining - 1,
            },
            autoTapClaimed: false,
            autoTapCoins: 0,
            autoTapSpark: 0,
            autoTapProgress: 0,
            autoTapTimeLeft: AUTO_TAP_DURATION,
            autoTapTotalCoins: totalPossibleReward,
            autoTapInitialPower: tapPowerLevel, // Store the initial tap power level
          },
        })
        .eq("user_id", userId);

      if (dbError) throw dbError;

      // Then update local state
      persistState((prev) => {
        // Create a new state object with autoTapInitialPower
        const newState = {
          ...prev,
          user_id: userId,
          coins: !prev.application_state?.isAutotapPurchased
            ? prev.coins - AUTO_TAP_UNLOCK_COST
            : prev.coins,
          application_state: {
            ...(prev.application_state || {}),
            isAutotapPurchased: true,
            isAutotapActive: true,
            has_visited_earn_page:
              prev.application_state?.has_visited_earn_page || false,
          },
          autoTapActive: true,
          autoTapStartTime: now,
          autoTapEndTime: now + duration,
          autoTapDaily: {
            ...prev.autoTapDaily,
            usesRemaining: usesRemaining - 1,
          },
          autoTapClaimed: false,
          autoTapCoins: 0,
          autoTapSpark: 0,
          autoTapProgress: 0,
          autoTapTimeLeft: AUTO_TAP_DURATION,
          autoTapTotalCoins: totalPossibleReward,
          autoTapInitialPower: tapPowerLevel, // Store the initial tap power level
        };

        return newState;
      });
      console.log(
        "[AutoTapPopup] Activated autotap - setting autoTapActive to true at time:",
        now
      );

      // Start the timer with timerService through useGameFeatures
      startTimer(TimerType.AUTO_TAP, duration, {
        callback: () => {
          persistState((prev) => {
            // Make sure we use the initial tap power for the final reward
            const initialPower = prev.autoTapInitialPower || tapPowerLevel;
            const finalReward = calculateAutoTapReward(initialPower);

            return {
              ...prev,
              autoTapActive: false,
              autoTapEndTime: Date.now(),
              autoTapCoins: finalReward,
              autoTapClaimed: false,
              autoTapProgress: 100,
              autoTapTimeLeft: 0,
              autoTapSpark: finalReward,
            };
          });
        },
      });

      // Update the auto tap uses in the timer service
      await timerService.updateAutoTapUses(userId, usesRemaining - 1);

      if (!gameState.application_state?.isAutotapPurchased) {
        gameToast.success("Auto Tap Bot purchased and activated!");
      } else {
        gameToast.success(
          `Auto Tap activated for ${AUTO_TAP_DURATION} seconds!`
        );
      }

      // Don't close the popup - let it transition to the progress view automatically
    } catch (error) {
      console.error("Error activating Auto Tap:", error);
      gameToast.error("Failed to activate Auto Tap");

      // Reset state if activation fails
      persistState((prev) => ({
        ...prev,
        autoTapActive: false,
      }));
    }
  };

  const isPurchased = gameState.application_state?.isAutotapPurchased;
  const hasEnoughSpark = gameState.coins >= AUTO_TAP_UNLOCK_COST;
  // Determine if the Activate button should be disabled
  const isActivateDisabled =
    !isPurchased ||
    gameState.autoTapActive ||
    ((gameState.autoTapCoins ?? 0) > 0 && !gameState.autoTapClaimed) ||
    (gameState.autoTapDaily?.usesRemaining || 0) <= 0;

  return (
    <>
      <div
        className="fixed inset-0 backdrop-blur-[14px] bg-black/50 z-[9998]"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 transform transition-all duration-300 max-w-md mx-auto z-[9999]">
        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border min-h-[600px]">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />
          <div className="relative h-full flex flex-col p-6">
            <div className="flex justify-end mb-2">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <Image src={Close.src} alt="Close" width={32} height={32} />
              </button>
            </div>

            <div className="flex flex-col items-center space-y-8 py-4">
              <Image
                src={isPurchased ? ActivateBotPopupIcon : PurchaseBotPopupIcon}
                alt="Auto Tap"
                width={100}
                height={100}
                style={{ width: "180px", height: "160px" }}
              />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#E18700] text-center">
                  Activate Tap Knight
                </h2>
                <p className="text-gray-400 text-center">
                  {isPurchased
                    ? gameState.autoTapActive
                      ? "The Tap Knight is currently active."
                      : (gameState.autoTapCoins ?? 0) > 0 &&
                        !gameState.autoTapClaimed
                      ? "Claim your previous rewards first!"
                      : "Activate the Tap Knight to start\n earning coins automatically!"
                    : "Purchase the Tap Knight to keep \n playing even when you're inactive!"}
                </p>
              </div>

              {!isPurchased && (
                <div className="flex items-center justify-center space-x-2">
                  <Image
                    src={SparkyIcon}
                    alt="Spark"
                    width={24}
                    height={24}
                    style={{ width: "auto", height: "auto" }}
                  />
                  <span className="text-xl font-bold text-white">
                    {AUTO_TAP_UNLOCK_COST}
                  </span>
                </div>
              )}

              <div className="bg-[#3a1c09] rounded-xl px-6 py-4 w-full">
                <div className="flex items-center space-x-3">
                  <Image
                    src={TapDiscriptionIcon}
                    alt="Description"
                    width={36}
                    height={36}
                    style={{ width: "auto", height: "auto" }}
                  />
                  <span className="text-[#909090] leading-relaxed text-sm">
                    You can use the bot thrice a day.
                    <br />
                    Claim your rewards after each boost to start again!
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-center w-full">
                <CustomYellowButton
                  className="w-fit"
                  onClick={
                    !isPurchased
                      ? handlePurchaseAutoTap
                      : handleAutoTapActivation
                  }
                  disabled={
                    (!isPurchased && !hasEnoughSpark) ||
                    (isPurchased && isActivateDisabled)
                  }
                >
                  {isPurchased
                    ? gameState.autoTapActive
                      ? "Currently Active"
                      : (gameState.autoTapCoins ?? 0) > 0 &&
                        !gameState.autoTapClaimed
                      ? "Claim Rewards First"
                      : (gameState.autoTapDaily?.usesRemaining || 0) <= 0
                      ? "No Uses Remaining Today"
                      : "Activate Bot"
                    : "Purchase Bot"}
                </CustomYellowButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AutoTapPopup;
