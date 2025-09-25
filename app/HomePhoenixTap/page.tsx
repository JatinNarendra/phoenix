"use client";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "../context/GameContext";
import { useLevelUp } from "../context/LevelUpContext";
import { TimerType, TimerState } from "../types/gameTypes";
import { gameToast } from "../utility/customToast";
import Image from "next/image";
import Link from "next/link";
import CoinsAndSpin from "../components/CoinsAndSpin";
import SpinSquareBackground from "@/public/assets/SpinSquareBackground.png";
import WinSpinIcon from "@/public/assets/WinSpinIcon.png";
import AutoTapBotIcon from "@/public/assets/AutoTapBotIcon.png";
import EnergyCapacityIcon from "@/public/assets/EnergyCapacityIcon.png";
import FlameLevelIcon from "@/public/assets/FlameLevelIcon.png";
import { levelConfig } from "../utility/stageConfig";
import { getRechargeSpeedConfig } from "../utility/rechargeSpeedConfig";
import { getEnergyConfig } from "../utility/energyConfig";
import { useRouter } from "next/navigation";
import { useWebApp } from "../hooks/useWebApp";
import { safeWebAppBackButton, safeWebApp } from "../lib/platformUtils";
import DailyRewardCalender from "@/public/assets/DailyRewardCalender.png";
import { useGameFeatures } from "../context/GameFeaturesContext";
import AutoTapPopup from "../components/AutoTapPopup";
import { showLimitedToast } from "../utility/toastManager";
import { STORAGE_KEYS } from "../constants/gameConstants";
import SpinTimer from "../components/SpinTimer";
import NavBar from "../components/NavBar";

// Update the CSS animations at the top of the file
const styles = `
  @keyframes tapEffect {
    0% {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -35%) scale(1.5);
      opacity: 0;
    }
  }

  @keyframes tapEffectTurbo {
    0% {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 1;
    }
    50% {
      transform: translate(-50%, -35%) scale(2);
      opacity: 0.7;
    }
    100% {
      transform: translate(-50%, -35%) scale(2.5);
      opacity: 0;
    }
  }
`;

// Add style tag to head
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

interface FloatingNumber {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  value: number;
  timestamp: number;
}

const PhoenixTapArea: React.FC = () => {
  const {
    increaseCoins,
    turboActive,
    setTurboActive,
    persistState,
    rechargeActive,
    gameState,
    calculateTotalCoinsWithTurbo,
  } = useGame();
  const {
    dailyRewards: { isRewardAvailable, timeUntilNext },
    timers: { timers: activeTimers },
    spin: { shouldShowSpin },
  } = useGameFeatures();
  const { showLevelUpAnimation } = useLevelUp();
  const [mounted, setMounted] = useState(false);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [tapPower, setTapPower] = useState(1);
  const [showAutoTapClaimPopup, setShowAutoTapClaimPopup] = useState(false);
  const initialLevelCheckRef = useRef(false);
  const lastTapTimeRef = useRef(Date.now());
  const wasTouchEvent = useRef(false);
  const activeTouches = useRef(new Set<number>());
  const tapAccumulator = useRef({ count: 0, totalCoins: 0 });
  const lastDbUpdate = useRef(Date.now());
  const isDbUpdateScheduled = useRef(false);
  const DB_UPDATE_INTERVAL = 3000; // Increased to 3 seconds to reduce network requests
  const MIN_TAPS_FOR_UPDATE = 10; // Increased to 10 taps to reduce network requests
  // Ref to track initial component mount for level calculation
  const isInitialMountRef = useRef(true);

  const router = useRouter();
  const { instance: WebApp } = useWebApp(true);
  const spinTimer = (activeTimers as TimerState)?.[TimerType.SPIN];

  // Track processed level ups to prevent duplicate notifications
  const processedLevelUpsRef = useRef<number[]>([]);

  // Initialize level if not set
  useEffect(() => {
    if (gameState.level === undefined && !initialLevelCheckRef.current) {
      initialLevelCheckRef.current = true;
      persistState((prev) => ({
        ...prev,
        level: 1,
        stage: 1,
        FlameCapacityTap: 0,
      }));
    }
  }, [gameState.level, persistState]);

  // Calculate and update level based on coins
  useEffect(() => {
    // For 0 coins, we're working toward level 1
    if (gameState.coins === 0 && gameState.level !== 1) {
      persistState((prev) => ({
        ...prev,
        level: 1,
      }));
      return;
    }

    // Find the current level based on coins
    let currentLevel = 1;
    for (let i = 1; i <= 10; i++) {
      if (gameState.coins >= levelConfig[i].sparkRequired) {
        currentLevel = i;
      } else {
        break;
      }
    }

    // Persist the level if it has changed
    if (currentLevel !== gameState.level) {
      // If this is a level up (not initial load) and we haven't processed this level up yet
      if (
        gameState.level &&
        currentLevel > gameState.level &&
        !processedLevelUpsRef.current.includes(currentLevel) &&
        !isInitialMountRef.current
      ) {
        // Add this level to processed level ups
        processedLevelUpsRef.current.push(currentLevel);

        // Get the reward for the level that was just completed (the previous level)
        const completedLevel = gameState.level;
        const levelReward = levelConfig[completedLevel].levelCompletionReward;

        // Show level up animation for the new level
        if (showLevelUpAnimation) {
          showLevelUpAnimation(currentLevel);
        }

        // Show toast with correct level and reward
        setTimeout(() => {
          gameToast.reward(
            `Level ${currentLevel} reached!\nLevel bonus: ${levelReward.toLocaleString()} coins`,
            { duration: 5000 }
          );
        }, 1000);
      }

      persistState((prev) => ({
        ...prev,
        level: currentLevel,
        // Add reward coins for the level that was completed (previous level) only on level up
        coins:
          prev.coins +
          (currentLevel > prev.level
            ? levelConfig[prev.level].levelCompletionReward
            : 0),
      }));
    }

    // Reset the initial mount flag after first execution
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
    }
  }, [gameState.coins, gameState.level, persistState, showLevelUpAnimation]);

  useEffect(() => {
    setMounted(true);

    // Initialize currentRecharge if not set (but not if it's 0)
    if (typeof gameState.currentRecharge === "undefined") {
      const energyLevel = Math.min(40, gameState.upgrades?.energyLevel || 1);
      const energyConfig = getEnergyConfig(energyLevel);
      persistState((prev) => ({
        ...prev,
        currentRecharge: energyConfig.maxRecharge,
      }));
    }

    // Initialize processedLevelUpsRef with current level to prevent showing animation for current level
    if (
      gameState.level &&
      !processedLevelUpsRef.current.includes(gameState.level)
    ) {
      processedLevelUpsRef.current.push(gameState.level);
    }

    // Sync turbo state on mount and state changes
    const syncTurboState = () => {
      const turboEndTime = Number(localStorage.getItem("turboEndTime") || 0);
      const now = Date.now();

      if (turboEndTime > now) {
        const timeLeft = Math.floor((turboEndTime - now) / 1000);
        if (timeLeft > 0 && !turboActive) {
          setTurboActive(true);
        }
      } else {
        if (turboActive) {
          setTurboActive(false);
          localStorage.removeItem("turboEndTime");
        }
      }
    };

    syncTurboState();

    window.addEventListener("turboStateChange", syncTurboState);
    const interval = setInterval(syncTurboState, 1000);

    return () => {
      window.removeEventListener("turboStateChange", syncTurboState);
      clearInterval(interval);
    };
  }, [
    turboActive,
    setTurboActive,
    persistState,
    gameState.currentRecharge,
    gameState.upgrades?.energyLevel,
    gameState.level,
  ]);

  useEffect(() => {
    setTapPower(gameState.upgrades?.tapLevel || 1);
  }, [gameState.upgrades?.tapLevel]);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      // Only handle actual mouse events (not touch events simulated as mouse)
      if (wasTouchEvent.current) {
        wasTouchEvent.current = false;
        return;
      }

      // Get current tap power to check if we have enough energy
      const currentTapPower = gameState.upgrades?.tapLevel || 1;

      // Check if we have enough recharge available for a tap based on tap power
      if (gameState.currentRecharge < currentTapPower) {
        showLimitedToast("noRecharge", "Not enough energy to tap", WebApp);
        return;
      }

      // Update the last tap time to prevent auto-refill during active tapping
      lastTapTimeRef.current = Date.now();

      const now = Date.now();
      const turboEndTime = Number(localStorage.getItem("turboEndTime") || 0);
      const isTurboActive: boolean = turboEndTime > now && turboActive;

      const totalCoins = calculateTotalCoinsWithTurbo(tapPower, isTurboActive);

      // Add to tap accumulator
      tapAccumulator.current.count++;
      tapAccumulator.current.totalCoins += totalCoins;

      // Create a random offset for the floating number for visual variety
      const rect = e.currentTarget.getBoundingClientRect();
      const randomOffsetX = (Math.random() - 0.5) * 60;
      const randomOffsetY = (Math.random() - 0.5) * 60;

      const newFloatingNumber = {
        id: Date.now() + Math.random(),
        startX: e.clientX - rect.left + randomOffsetX,
        startY: e.clientY - rect.top + randomOffsetY,
        targetX: 20,
        targetY: 20,
        value: totalCoins,
        timestamp: now,
      };

      setFloatingNumbers((prev) => [...prev, newFloatingNumber]);

      // Update user's game state
      persistState((prev) => {
        const newRecharge = isTurboActive
          ? prev.currentRecharge
          : Math.max(0, prev.currentRecharge - (prev.upgrades?.tapLevel || 1));

        // If energy is now zero, clear lastRechargeValue to prevent jumps
        if (newRecharge === 0) {
          localStorage.removeItem("lastRechargeValue");
        }

        const newCoins = prev.coins + totalCoins;

        // Determine level directly from coins
        let newLevel = 1;
        for (let i = 1; i <= 10; i++) {
          if (newCoins >= levelConfig[i].sparkRequired) {
            newLevel = i;
          } else {
            break;
          }
        }

        // Initialize level reward value
        let levelReward = 0;

        // Check if this is a level up
        const shouldTriggerLevelUp =
          newLevel > prev.level && !prev.pendingLevelUp;

        if (
          shouldTriggerLevelUp &&
          !processedLevelUpsRef.current.includes(newLevel)
        ) {
          // Add this level to processed level ups
          processedLevelUpsRef.current.push(newLevel);

          // Get the reward for the level that was just completed (the previous level)
          const completedLevel = prev.level;
          levelReward = levelConfig[completedLevel].levelCompletionReward;

          // Trigger the level up animation for the new level
          if (showLevelUpAnimation) {
            showLevelUpAnimation(newLevel);
          }

          // Show level up toast with correct level and reward
          setTimeout(() => {
            gameToast.reward(
              `Level ${newLevel} reached!\nLevel bonus: ${levelReward.toLocaleString()} coins`,
              { duration: 5000 }
            );

            // Clear pendingLevelUp flag after animation and toast
            setTimeout(() => {
              persistState((prev) => ({
                ...prev,
                pendingLevelUp: false,
              }));
            }, 3000);
          }, 1000);
        }

        const newState = {
          ...prev,
          currentRecharge: newRecharge,
          coins:
            newCoins +
            (shouldTriggerLevelUp
              ? levelConfig[prev.level].levelCompletionReward
              : 0),
          level: newLevel,
          pendingLevelUp: shouldTriggerLevelUp,
        };
        return newState;
      });

      // Implement throttled database updates
      const timeSinceLastUpdate = now - lastDbUpdate.current;
      const shouldUpdateDb =
        timeSinceLastUpdate >= DB_UPDATE_INTERVAL ||
        tapAccumulator.current.count >= MIN_TAPS_FOR_UPDATE;

      if (shouldUpdateDb && tapAccumulator.current.count > 0) {
        isDbUpdateScheduled.current = true;

        // Use setTimeout to ensure we don't block the UI
        setTimeout(() => {
          // Note: No need to capture state since we're not using it

          // Use criticalStateUpdate to sync with DB without triggering UI updates
          increaseCoins(0); // This will trigger DB update with current state

          // Reset accumulator and update flags
          tapAccumulator.current = { count: 0, totalCoins: 0 };
          lastDbUpdate.current = Date.now();
          isDbUpdateScheduled.current = false;
        }, 50); // Small delay to allow batching multiple taps
      }
    },
    [
      turboActive,
      tapPower,
      calculateTotalCoinsWithTurbo,
      persistState,
      WebApp,
      gameState.currentRecharge,
      increaseCoins,
      showLevelUpAnimation,
      gameState.upgrades,
    ]
  );

  const processTouches = useCallback(
    (touches: React.TouchList, rect: DOMRect) => {
      // Update the last tap time to prevent auto-refill during active tapping
      lastTapTimeRef.current = Date.now();

      const now = Date.now();

      // Check if recharge is zero before proceeding - to prevent multiple touch events from being processed
      if (gameState.currentRecharge <= 0) {
        return;
      }

      const turboEndTime = Number(localStorage.getItem("turboEndTime") || 0);
      const isTurboActive: boolean = turboEndTime > now && turboActive;

      // Fix the type declaration to use React.Touch instead of Touch
      const newTouches: React.Touch[] = [];
      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        if (!activeTouches.current.has(touch.identifier)) {
          activeTouches.current.add(touch.identifier);
          newTouches.push(touch);

          // Add floating number for each touch
          const randomOffsetX = (Math.random() - 0.5) * 60;
          const randomOffsetY = (Math.random() - 0.5) * 60;

          // Calculate coin value
          const touchCoins = calculateTotalCoinsWithTurbo(
            tapPower,
            isTurboActive
          );

          // Create new floating number
          const newFloatingNumber = {
            id: now + Math.random() + touch.identifier,
            startX: touch.clientX - rect.left + randomOffsetX,
            startY: touch.clientY - rect.top + randomOffsetY,
            targetX: 20,
            targetY: 20,
            value: touchCoins,
            timestamp: now,
          };

          setFloatingNumbers((prev) => [...prev, newFloatingNumber]);
        }
      }

      if (newTouches.length === 0) return;

      // Calculate coin increase based on tap power and number of new touches
      const totalCoins = calculateTotalCoinsWithTurbo(tapPower, isTurboActive);
      const totalCoinIncrease = newTouches.length * totalCoins;

      // Add to tap accumulator for batching
      tapAccumulator.current.count += newTouches.length;
      tapAccumulator.current.totalCoins += totalCoinIncrease;

      // Update coins and recharge in a single state update for UI consistency
      persistState((prev) => {
        const newRecharge = isTurboActive
          ? prev.currentRecharge
          : Math.max(
              0,
              prev.currentRecharge -
                newTouches.length * (prev.upgrades?.tapLevel || 1)
            );

        // If energy is now zero, clear lastRechargeValue to prevent jumps
        if (newRecharge === 0) {
          localStorage.removeItem("lastRechargeValue");
        }

        const newCoins = prev.coins + totalCoinIncrease;

        // Determine level directly from coins
        let newLevel = 1;
        for (let i = 1; i <= 10; i++) {
          if (newCoins >= levelConfig[i].sparkRequired) {
            newLevel = i;
          } else {
            break;
          }
        }

        // Initialize level reward value
        let levelReward = 0;

        // Check if this is a level up
        const shouldTriggerLevelUp =
          newLevel > prev.level && !prev.pendingLevelUp;

        if (
          shouldTriggerLevelUp &&
          !processedLevelUpsRef.current.includes(newLevel)
        ) {
          // Add this level to processed level ups
          processedLevelUpsRef.current.push(newLevel);

          // Get the reward for the level that was just completed (the previous level)
          const completedLevel = prev.level;
          levelReward = levelConfig[completedLevel].levelCompletionReward;

          // Trigger the level up animation for the new level
          if (showLevelUpAnimation) {
            showLevelUpAnimation(newLevel);
          }

          // Show level up toast with correct level and reward
          setTimeout(() => {
            gameToast.reward(
              `Level ${newLevel} reached!\nLevel bonus: ${levelReward.toLocaleString()} coins`,
              { duration: 5000 }
            );

            // Clear pendingLevelUp flag after animation and toast
            setTimeout(() => {
              persistState((prev) => ({
                ...prev,
                pendingLevelUp: false,
              }));
            }, 3000);
          }, 1000);
        }

        const newState = {
          ...prev,
          currentRecharge: newRecharge,
          coins:
            newCoins +
            (shouldTriggerLevelUp
              ? levelConfig[prev.level].levelCompletionReward
              : 0),
          level: newLevel,
          pendingLevelUp: shouldTriggerLevelUp,
        };
        return newState;
      });

      // Implement throttled database updates - only schedule if not already scheduled
      if (!isDbUpdateScheduled.current) {
        const timeSinceLastUpdate = now - lastDbUpdate.current;
        const shouldUpdateDb =
          timeSinceLastUpdate >= DB_UPDATE_INTERVAL ||
          tapAccumulator.current.count >= MIN_TAPS_FOR_UPDATE;

        if (shouldUpdateDb && tapAccumulator.current.count > 0) {
          isDbUpdateScheduled.current = true;

          // Use setTimeout to ensure we don't block the UI
          setTimeout(() => {
            // Note: No need to capture state since we're not using it

            // Use criticalStateUpdate to sync with DB without triggering UI updates
            increaseCoins(0); // This will trigger DB update with current state

            // Reset accumulator and update flags
            tapAccumulator.current = { count: 0, totalCoins: 0 };
            lastDbUpdate.current = Date.now();
            isDbUpdateScheduled.current = false;
          }, 50);
        }
      }
    },
    [
      turboActive,
      tapPower,
      calculateTotalCoinsWithTurbo,
      persistState,
      gameState.currentRecharge,

      increaseCoins,
      showLevelUpAnimation,
    ]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      // Get current tap power to check if we have enough energy
      const currentTapPower = gameState.upgrades?.tapLevel || 1;

      // Check if we have enough recharge available for a tap based on tap power
      if (gameState.currentRecharge < currentTapPower) {
        showLimitedToast("noRecharge", "Not enough energy to tap", WebApp);
        return;
      }

      wasTouchEvent.current = true;
      lastTapTimeRef.current = Date.now();

      const rect = e.currentTarget.getBoundingClientRect();
      processTouches(e.touches, rect);
    },
    [
      gameState.currentRecharge,
      processTouches,
      WebApp,
      gameState.upgrades?.tapLevel,
    ]
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Clear ended touches from active touches set
    Array.from(e.changedTouches).forEach((touch) => {
      activeTouches.current.delete(touch.identifier);
    });
  }, []);

  const handleTouchCancel = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      // Clear cancelled touches from active touches set
      Array.from(e.changedTouches).forEach((touch) => {
        activeTouches.current.delete(touch.identifier);
      });
    },
    []
  );

  // Auto-refill effect for recharge
  useEffect(() => {
    let lastIncrementTime = Date.now();
    let refillInterval: NodeJS.Timeout | null = null;

    // Define refill intervals based on recharge level (how fast refill happens)
    const REFILL_INTERVALS = {
      1: 2000, // 2 seconds for level 1
      2: 1000, // 1 second for level 2
      3: 500, // 500ms for level 3
    };

    const incrementRecharge = () => {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;
      const rechargeLevel = Math.min(3, gameState.upgrades?.rechargeLevel || 1);
      const energyLevel = Math.min(40, gameState.upgrades?.energyLevel || 1);
      const rechargeSpeedConfig = getRechargeSpeedConfig(rechargeLevel);
      const energyConfig = getEnergyConfig(energyLevel);
      const currentRecharge = gameState.currentRecharge;

      // Get custom refill interval based on recharge level
      const customRefillInterval =
        REFILL_INTERVALS[rechargeLevel as keyof typeof REFILL_INTERVALS];

      // Check if booster was just activated
      const lastRechargeValue = Number(
        localStorage.getItem("lastRechargeValue") || currentRecharge
      );
      const boosterActivationTime = Number(
        localStorage.getItem("rechargeActivationTime") || 0
      );
      const timeSinceBoosterActivation = now - boosterActivationTime;

      // If it's been less than 2 seconds since booster activation, use the max value
      if (timeSinceBoosterActivation < 2000) {
        return;
      }

      // Only increment if enough time has passed since last increment AND user hasn't tapped recently
      const timeSinceLastIncrement = now - lastIncrementTime;
      if (
        timeSinceLastIncrement >= customRefillInterval &&
        timeSinceLastTap >= customRefillInterval
      ) {
        if (currentRecharge < energyConfig.maxRecharge) {
          // Start incrementing from the last known recharge value
          // IMPORTANT: Only use lastRechargeValue if it's valid (not significantly higher than current recharge)
          // This prevents sudden jumps from 0 to max capacity
          const validLastRecharge =
            lastRechargeValue > currentRecharge &&
            lastRechargeValue < currentRecharge + 10
              ? lastRechargeValue
              : currentRecharge;

          const baseValue = validLastRecharge;
          const newRecharge = Math.min(
            baseValue + rechargeSpeedConfig.rechargeSpeed,
            energyConfig.maxRecharge
          );

          persistState((prev) => ({
            ...prev,
            currentRecharge: Math.round(newRecharge),
            lastRechargeUpdate: now,
          }));

          // Update the last recharge value
          localStorage.setItem("lastRechargeValue", newRecharge.toString());
          lastIncrementTime = now;

          // Remove the recharge started toast completely
          // No toast notification when recharge starts refilling
        }
      }
    };

    // Use a shorter interval for more responsive recharge checks
    refillInterval = setInterval(incrementRecharge, 100);

    return () => {
      if (refillInterval) {
        clearInterval(refillInterval);
      }
    };
  }, [
    rechargeActive,
    gameState.upgrades?.rechargeLevel,
    gameState.upgrades?.energyLevel,
    gameState.currentRecharge,
    persistState,
  ]);

  useEffect(() => {
    const rechargeJustActivated = localStorage.getItem("rechargeJustActivated");

    if (rechargeJustActivated === "true") {
      // Check if this is a legitimate booster activation, not from continuous tapping at 0 energy
      const lastTapTime = lastTapTimeRef.current;
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime;

      // If user is rapidly tapping (last tap was less than 300ms ago) and has no booster uses, ignore this activation
      const hasValidBoosterUses =
        (gameState.boosts?.inGameRecharge || 0) > 0 ||
        (gameState.boosts?.rewardedRecharge || 0) > 0;
      if (timeSinceLastTap < 300 && !hasValidBoosterUses) {
        localStorage.removeItem("rechargeJustActivated");
        localStorage.removeItem("rechargeBoosterActive");
        return;
      }

      // Get current energy level
      const energyLevel = Math.min(40, gameState.upgrades?.energyLevel || 1);
      const energyConfig = getEnergyConfig(energyLevel);
      const usesLeft = (gameState.boosts?.inGameRecharge || 0) - 1;

      // Set the activation time first
      localStorage.setItem("rechargeActivationTime", Date.now().toString());
      localStorage.setItem(
        "lastRechargeValue",
        energyConfig.maxRecharge.toString()
      );

      // Batch the state updates - immediately set currentRecharge to maxRecharge for this level
      persistState((prev) => {
        const updatedState = {
          ...prev,
          currentRecharge: energyConfig.maxRecharge,
          lastRechargeUpdate: Date.now(),
          boosts: {
            ...prev.boosts,
            rechargeActive: false, // Set to false to allow regular recharge to continue from max
            inGameRecharge: usesLeft,
          },
        };

        // Force update localStorage first
        const storageKey = STORAGE_KEYS.USER;
        localStorage.setItem(storageKey, JSON.stringify(updatedState));

        return updatedState;
      });

      // Clear the flag after state is updated
      localStorage.removeItem("rechargeJustActivated");
    }
  }, [
    gameState.upgrades?.energyLevel,
    gameState.boosts?.inGameRecharge,
    persistState,
    gameState.currentRecharge,
    gameState.boosts?.rewardedRecharge,
  ]);

  useEffect(() => {
    safeWebAppBackButton.hide(WebApp);
    safeWebApp.enableClosingConfirmation(WebApp);

    return () => {
      safeWebApp.enableClosingConfirmation(WebApp);
    };
  }, [WebApp]);

  // Format time for display for spin timer
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Add listener for forced game refreshes (e.g., after autotap claim)
  useEffect(() => {
    const handleForceRefresh = () => {
      // This will force the component to reflect the latest game state
      // Particularly important for when autotap rewards are claimed
      setMounted(false);
      setTimeout(() => setMounted(true), 10);
    };

    window.addEventListener("forceGameRefresh", handleForceRefresh);

    return () => {
      window.removeEventListener("forceGameRefresh", handleForceRefresh);
    };
  }, []);

  // Check if reward was collected today
  const wasCollectedToday = useCallback(() => {
    const lastCollected = gameState.dailyRewards?.lastCollected;

    if (!lastCollected || lastCollected === "1970-01-01T00:00:00.000Z")
      return false;

    const now = new Date();
    const lastCollectedDate = new Date(lastCollected);

    return (
      lastCollectedDate.getUTCFullYear() === now.getUTCFullYear() &&
      lastCollectedDate.getUTCMonth() === now.getUTCMonth() &&
      lastCollectedDate.getUTCDate() === now.getUTCDate()
    );
  }, [gameState.dailyRewards?.lastCollected]);

  // Modify level-up handling to ensure animation shows
  useEffect(() => {
    // Check if there's a pending level up when component mounts
    if (gameState.pendingLevelUp) {
      console.log("Processing level up for level:", gameState.level);

      // Restore animation code - important for level 1 to 2 transition
      const currentLevel = gameState.level || 1;
      if (
        !processedLevelUpsRef.current.includes(currentLevel) &&
        showLevelUpAnimation
      ) {
        console.log("Showing level up animation for level:", currentLevel + 1);
        showLevelUpAnimation(currentLevel + 1);
        processedLevelUpsRef.current.push(currentLevel);
      }

      // Update state to clear the flag
      persistState((prev) => ({
        ...prev,
        pendingLevelUp: false,
      }));
    }
  }, [
    gameState.level,
    gameState.pendingLevelUp,
    persistState,
    showLevelUpAnimation,
  ]);

  // Function to handle the autotap icon click
  const handleAutoTapIconClick = () => {
    // Check if autotap is active - if so, show the popup but don't do any claiming
    if (gameState.autoTapActive) {
      setShowAutoTapClaimPopup(true);
    }
    // If autotap has completed (not active) and has unclaimed rewards, show claim popup
    else if (!gameState.autoTapClaimed && (gameState.autoTapCoins || 0) > 0) {
      setShowAutoTapClaimPopup(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <div className="fixed inset-0 z-[0]">
        {(() => {
          // Determine level directly from coins
          let completedLevel = 0;

          // Find the highest level completed
          for (let i = 1; i <= 10; i++) {
            if (gameState.coins >= levelConfig[i].sparkRequired) {
              completedLevel = i;
            } else {
              break;
            }
          }

          // Your current level is the highest level completed + 1, unless you've completed level 10
          const currentLevel = completedLevel < 10 ? completedLevel + 1 : 10;

          return (
            <Image
              src={`/assets/homebackground/phoenix${currentLevel}.png`}
              alt={`Level ${currentLevel} Phoenix`}
              fill
              className="object-cover"
              quality={100}
              priority
            />
          );
        })()}
      </div>

      <div className="fixed top-5 w-full z-50 px-4">
        <CoinsAndSpin />
      </div>

      {/* Game Icons Section */}
      <div className="absolute top-[25%] left-4 z-10">
        <Link href="/spin">
          <div className="w-16 h-16 relative flex flex-col items-center">
            {/* Top Spin Count */}
            <div className="absolute -top-4 w-12 h-6 z-20">
              <div className="relative w-full h-full">
                <div className="absolute inset-0 rounded-lg bg-black border border-[rgba(226,144,41,0.4)] shadow-[0_0_10px_rgba(226,144,41,0.2)]">
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {gameState.spins > 50
                      ? gameState.spins
                      : `${gameState.spins}/50`}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Spin Icon */}
            <div
              className={`w-16 h-16 relative ${
                gameState.spins > 0 ? "cursor-pointer" : ""
              }`}
            >
              <Image
                src={SpinSquareBackground}
                alt="Spin Background"
                width={64}
                height={64}
                className="absolute inset-0"
                style={{
                  objectFit: "cover",
                  width: "auto",
                  height: "auto",
                  zIndex: 0,
                }}
              />
              <Image
                src={WinSpinIcon}
                alt="Win Spin Icon"
                width={38}
                height={38}
                style={{ width: "auto", height: "auto" }}
                className={`absolute inset-0 m-auto `}
              />
            </div>

            {/* Bottom Timer - Only show if less than 50 spins available */}
            {!shouldShowSpin && (
              <div className="absolute -bottom-7 w-16">
                <SpinTimer
                  nextSpinsTimer={spinTimer?.remainingSec ?? 0}
                  formatTime={formatTime}
                />
              </div>
            )}
          </div>
        </Link>
      </div>

      <div className="absolute top-[25%] right-4 z-10">
        <div
          className="w-16 h-16 relative rounded-lg bg-black border border-[rgba(226,144,41,0.4)] shadow-[0_0_10px_rgba(226,144,41,0.2)] flex items-center justify-center cursor-pointer"
          onClick={() => router.push("/level-details")}
        >
          {(() => {
            // Determine level directly from coins
            let completedLevel = 0;

            // Find the highest level completed
            for (let i = 1; i <= 10; i++) {
              if (gameState.coins >= levelConfig[i].sparkRequired) {
                completedLevel = i;
              } else {
                break;
              }
            }

            // Your current level is the highest level completed + 1, unless you've completed level 10
            const currentLevel = completedLevel < 10 ? completedLevel + 1 : 10;

            return (
              <Image
                src={`/assets/homebackground/badge${Math.min(
                  currentLevel,
                  10
                )}.png`}
                alt={`Level ${currentLevel} Badge`}
                width={52}
                height={52}
                className="relative z-10"
                style={{ width: "auto", height: "auto" }}
              />
            );
          })()}
        </div>
        <div className="relative w-full h-6 mt-1">
          <div className="absolute inset-0 rounded-lg bg-black border border-[rgba(226,144,41,0.4)] shadow-[0_0_10px_rgba(226,144,41,0.2)]">
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
              {(() => {
                // Determine level directly from coins
                let completedLevel = 0;

                // Find the highest level completed
                for (let i = 1; i <= 10; i++) {
                  if (gameState.coins >= levelConfig[i].sparkRequired) {
                    completedLevel = i;
                  } else {
                    break;
                  }
                }

                // Your current level is the highest level completed + 1, unless you've completed level 10
                const currentLevel =
                  completedLevel < 10 ? completedLevel + 1 : 10;

                return currentLevel >= 10 ? "Lvl ∞" : `Lvl ${currentLevel}`;
              })()}
            </span>
          </div>
        </div>

        {/* Daily Rewards Section */}
        <div className="mt-4">
          <div
            className={`w-16 h-16 relative rounded-lg bg-black border border-[rgba(226,144,41,0.4)] shadow-[0_0_10px_rgba(226,144,41,0.2)] flex items-center justify-center cursor-pointer`}
            onClick={() => router.push("/earn/daily-rewards")}
          >
            <Image
              src={DailyRewardCalender}
              alt="Daily Reward Calendar"
              width={32}
              height={32}
              className="relative z-10"
              style={{ width: "auto", height: "auto", objectFit: "contain" }}
            />
          </div>

          {/* Check both conditions: if not available or if already collected today */}
          {!isRewardAvailable || wasCollectedToday() ? (
            <div className="relative w-full h-6 mt-1">
              <div className="absolute inset-0 rounded-lg bg-black border border-[rgba(226,144,41,0.4)] shadow-[0_0_10px_rgba(226,144,41,0.2)]">
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {typeof timeUntilNext === "object"
                    ? `${timeUntilNext.hours}:${timeUntilNext.minutes}:${timeUntilNext.seconds}`
                    : "00:00:00"}
                </span>
              </div>
            </div>
          ) : (
            <div
              className="mt-2 cursor-pointer"
              onClick={() => router.push("/earn/daily-rewards")}
            >
              <div className="w-full py-1 px-2 text-center text-xs font-bold text-black bg-[#FCC204] rounded-lg shadow-[0_0_10px_rgba(226,144,41,0.4)]">
                Claim
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AutoTap Section */}
      {(gameState.autoTapActive ||
        (gameState.autoTapEndTime &&
          !gameState.autoTapClaimed &&
          (gameState.autoTapCoins || 0) > 0)) && (
        <div className="absolute top-[35%] left-4 z-10">
          <div className="flex flex-col items-center relative">
            {/* AutoTap Icon */}
            <div
              className="w-16 h-16 relative rounded-lg bg-black border border-[rgba(226,144,41,0.4)] shadow-[0_0_10px_rgba(226,144,41,0.2)] flex items-center justify-center cursor-pointer"
              onClick={handleAutoTapIconClick}
            >
              <Image
                src={AutoTapBotIcon}
                alt="Auto Tap Icon"
                width={32}
                height={32}
                style={{ width: "auto", height: "auto" }}
                className={`relative z-10 ${
                  gameState.autoTapActive ? "animate-pulse" : ""
                }`}
              />
            </div>

            {/* Timer display for AutoTap */}
            <div className="relative w-full h-6 mt-1">
              {(() => {
                const now = Date.now();
                const endTime = gameState.autoTapEndTime;

                // First check if timer is active and not expired
                if (gameState.autoTapActive && endTime && endTime > now) {
                  // Show timer when active and not expired
                  const remainingMs = Math.max(0, endTime - now);
                  const remainingSecs = Math.floor(remainingMs / 1000);
                  const hours = Math.floor(remainingSecs / 3600);
                  const minutes = Math.floor((remainingSecs % 3600) / 60);
                  const secs = remainingSecs % 60;
                  return (
                    <div className="absolute inset-0 rounded-lg bg-black border border-[rgba(226,144,41,0.4)] shadow-[0_0_10px_rgba(226,144,41,0.2)]">
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                        {`${String(hours).padStart(2, "0")}:${String(
                          minutes
                        ).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
                      </span>
                    </div>
                  );
                } else if (
                  (gameState.autoTapCoins || 0) > 0 &&
                  !gameState.autoTapClaimed
                ) {
                  // Only show Claim button when there are actual coins to claim
                  return (
                    <div
                      className="w-full py-1 px-2 text-center text-xs font-bold text-black bg-[#FCC204] rounded-lg shadow-[0_0_10px_rgba(226,144,41,0.4)] cursor-pointer"
                      onClick={handleAutoTapIconClick}
                    >
                      Claim
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      {showAutoTapClaimPopup && (
        <AutoTapPopup
          isOpen={showAutoTapClaimPopup}
          onClose={() => {
            setShowAutoTapClaimPopup(false);
          }}
          autoTapSpark={gameState.autoTapCoins || 0}
          tapPowerLevel={
            gameState.autoTapInitialPower || gameState.upgrades?.tapLevel || 1
          }
        />
      )}

      <div className="fixed bottom-20 left-4 right-4 z-50">
        <div className="flex justify-between mb-2">
          {(() => {
            // Determine level directly from coins
            let completedLevel = 0;

            // Find the highest level completed
            for (let i = 1; i <= 10; i++) {
              if (gameState.coins >= levelConfig[i].sparkRequired) {
                completedLevel = i;
              } else {
                break;
              }
            }

            // Your current level is the highest level completed + 1, unless you've completed level 10
            const currentLevel = completedLevel < 10 ? completedLevel + 1 : 10;

            // After level 10, show "Lvl ∞" in the center
            if (currentLevel >= 10) {
              return (
                <div className="w-full text-center text-xs font-bold text-gray-500">
                  Lvl ∞
                </div>
              );
            }

            // For levels 1-9, show current and next level
            const nextLevel = Math.min(currentLevel + 1, 11);
            return (
              <>
                <div className="text-xs font-bold text-gray-500">
                  Lvl {currentLevel}
                </div>
                <div className="text-xs font-bold text-gray-500">
                  Lvl {nextLevel}
                </div>
              </>
            );
          })()}
        </div>

        <div className="relative h-3 bg-gray-800 rounded-[30px] overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-300"
            style={{
              width: `${(() => {
                // Determine level directly from coins
                let completedLevel = 0;

                // Find the highest level completed
                for (let i = 1; i <= 10; i++) {
                  if (gameState.coins >= levelConfig[i].sparkRequired) {
                    completedLevel = i;
                  } else {
                    break;
                  }
                }

                // Your current level is the highest level completed + 1, unless you've completed level 10
                const currentLevel =
                  completedLevel < 10 ? completedLevel + 1 : 10;

                // If we're at max level (10), show full progress bar
                if (currentLevel >= 10) {
                  return 100;
                }

                // Find requirement for the next level

                // For level 1, calculate based on progress to level 1 requirement
                if (currentLevel === 1) {
                  // When at level 1, we're working toward the level 1 threshold
                  const levelOneThreshold = levelConfig[1].sparkRequired;
                  const percentage =
                    (gameState.coins / levelOneThreshold) * 100;
                  return Math.min(100, Math.max(0, percentage));
                } else {
                  // For levels > 1, calculate based on progress between levels
                  const currentLevelThreshold =
                    levelConfig[currentLevel - 1].sparkRequired;
                  const nextLevelThreshold =
                    levelConfig[currentLevel].sparkRequired;
                  const progressToNextLevel = Math.max(
                    0,
                    gameState.coins - currentLevelThreshold
                  );
                  const rangeBetweenLevels =
                    nextLevelThreshold - currentLevelThreshold;
                  const percentage =
                    (progressToNextLevel / rangeBetweenLevels) * 100;
                  return Math.min(100, Math.max(0, percentage));
                }
              })()}%`,
            }}
          />
        </div>

        <div className="flex justify-between items-center mt-1 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div>
              <div className="relative w-4 h-4">
                <Image
                  src={FlameLevelIcon}
                  alt="Energy Icon"
                  fill
                  sizes="(max-width: 768px) 50vw, 16rem"
                  className="object-contain"
                />
              </div>
            </div>
            <div>
              <motion.div
                className="text-white font-bold"
                initial={{ scale: 1 }}
                animate={{
                  scale: [1, 1.1, 1],
                  transition: { duration: 0.2 },
                }}
                key={gameState.coins}
              >
                {gameState.coins.toLocaleString()}
              </motion.div>
              /
              {(() => {
                // Determine level directly from coins
                let completedLevel = 0;

                // Find the highest level completed
                for (let i = 1; i <= 10; i++) {
                  if (gameState.coins >= levelConfig[i].sparkRequired) {
                    completedLevel = i;
                  } else {
                    break;
                  }
                }

                // Your current level is the highest level completed + 1, unless you've completed level 10
                const currentLevel =
                  completedLevel < 10 ? completedLevel + 1 : 10;

                // If at level 10 or higher, show infinity symbol
                if (currentLevel >= 10) {
                  return "∞";
                }

                // Show the requirement for the current level
                return levelConfig[currentLevel].sparkRequired.toLocaleString();
              })()}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div>
              <Image
                src={EnergyCapacityIcon}
                alt="Energy Capacity Icon"
                width={16}
                height={16}
                style={{ width: "auto", height: "auto" }}
              />
            </div>
            <div>
              <motion.div
                className="text-white font-bold"
                initial={{ scale: 1 }}
                animate={{
                  scale: [1, 1.1, 1],
                  transition: { duration: 0.2 },
                }}
                key={gameState.currentRecharge}
              >
                {gameState.currentRecharge.toLocaleString()}
              </motion.div>
              /{gameState.energyCapacity.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      {/*spark tap effects */}
      {mounted && (
        <div
          className="fixed inset-0 z-1"
          onClick={(e) => {
            if (!wasTouchEvent.current) {
              handleTap(e);
            }
            wasTouchEvent.current = false;
          }}
          onTouchStart={(e) => {
            handleTouchStart(e);
          }}
          onTouchMove={(_e) => {
            // Just prevent scrolling without preventDefault
            return false;
          }}
          onTouchEnd={(e) => {
            handleTouchEnd(e);
            setTimeout(() => {
              wasTouchEvent.current = false;
            }, 0);
          }}
          onTouchCancel={handleTouchCancel}
          role="button"
          tabIndex={0}
          style={{
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
          }}
        >
          <div className="relative w-full h-full">
            {/* Placeholder for tap effects */}
          </div>
        </div>
      )}

      <AnimatePresence>
        {floatingNumbers.map((number) => (
          <motion.div
            key={number.id}
            initial={{
              position: "fixed",
              left: number.startX,
              top: number.startY,
              scale: 1,
              opacity: 1,
              zIndex: 9999,
            }}
            animate={{
              left: 20,
              top: 20,
              scale: [1, 1.2, 1],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
            }}
            className="text-[#FFFFFF] font-bold text-4xl pointer-events-none"
            style={{
              textShadow:
                "2px 2px 0 #961E1E, -2px -2px 0 #961E1E, 2px -2px 0 #961E1E, -2px 2px 0 #961E1E",
            }}
          >
            +{number.value.toLocaleString()}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Navigation Bar */}
      <NavBar />
    </div>
  );
};

export default PhoenixTapArea;
