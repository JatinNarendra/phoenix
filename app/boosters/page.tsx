"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { FaChevronRight } from "react-icons/fa";
import { useGame } from "../context/GameContext";
import { GameState, TimerType } from "../types/gameTypes";
import {
  STORAGE_KEYS,
  AUTO_TAP_UNLOCK_COST,
  AUTO_TAP_DURATION,
} from "../constants/gameConstants";
import { calculateAutoTapReward } from "../utility/gameUtils";
import Image from "next/image";

// Remove image imports - we'll use src paths instead
import { useSearchParams, useRouter } from "next/navigation";
import { useWebApp } from "../hooks/useWebApp";

import { useGameFeatures } from "../context/GameFeaturesContext";
import { supabase } from "@/lib/supabase";
import BoostsPopup from "../components/BoostsPopup";
import AutoTapPopup from "../components/AutoTapPopup";
import TapPowerPopup from "../components/TapPowerPopup";
import EnergyCapacityPopup from "../components/EnergyCapacityPopup";
import RechargeSpeedPopup from "../components/RechargeSpeedPopup";
// Remove image imports - we'll use src paths instead
import { gameToast } from "../utility/customToast";
// Remove image imports - we'll use src paths instead
import { tapPowerConfig } from "../utility/tapPowerConfig";
import { energyConfig, getEnergyConfig } from "../utility/energyConfig";

type UpgradeLevel = "energyLevel" | "rechargeLevel" | "tapLevel";

interface Booster {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  inGameUses: number;
  rewardedUses: number;
  maxInGameUses: number;
  duration: number;
  color: string;
}

interface Upgrade {
  id: string;
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  price?: string;
  priceInCents?: number;
  coinPrice?: number;
  level?: number;
  maxLevel?: number;
  color: string;
  effect: string;
  currentCoins?: number;
  maxCoins?: number;
  availableUses?: number;
  maxUses?: number;
  tapPower?: number;
  canClaim?: boolean;
  isPurchased?: boolean;
}

const BOOSTER_REFILL_INTERVAL = 60000; // 60 seconds, adjust as needed
const AUTO_TAP_TIMER_TYPE = TimerType.AUTO_TAP;
const MAX_DAILY_AUTO_TAP_USES = 3;

// Helper function to check and reset daily auto tap uses
const checkAndResetDailyAutoTap = (
  gameState: GameState,
  persistState: (
    updates: Partial<GameState> | ((prev: GameState) => GameState)
  ) => void
) => {
  const now = new Date();
  const lastReset = new Date(gameState.autoTapDaily?.lastReset || 0);
  const isNewDay =
    now.getUTCDate() !== lastReset.getUTCDate() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCFullYear() !== lastReset.getUTCFullYear();

  if (isNewDay) {
    persistState((prev) => ({
      ...prev,
      autoTapDaily: {
        lastReset: now.toISOString(),
        usesRemaining: MAX_DAILY_AUTO_TAP_USES,
      },
    }));
  }
};

export default function BoostersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showAutoTap = searchParams.get("showAutoTap");
  const { instance: WebApp } = useWebApp(true);
  const {
    gameState,
    persistState,
    turboActive,
    setTurboActive,
    rechargeActive,
    setRechargeActive,

    setTurboTimeLeft,
    setRechargeTimeLeft,
    handleBoosterRefill,
    autoTapActive,
  } = useGame();

  // Track initialization state with useRef instead of local variable
  const autoTapInitialized = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);
  const tapPowerLevel = gameState.upgrades?.tapLevel || 1;

  const {
    timers: { timers, startTimer },
  } = useGameFeatures();
  const autoTapTimer =
    timers && "autoTap" in timers ? timers[TimerType.AUTO_TAP] : undefined;
  const [currentSpark, setCurrentSpark] = useState(gameState.autoTapSpark || 0);
  // Use the initial tap power level when available, otherwise use current level
  const tapPowerForAutoTap =
    gameState.autoTapInitialPower || gameState.upgrades?.tapLevel || 1;

  const [selectedBooster, setSelectedBooster] = useState<
    "turbo" | "recharge" | null
  >(null);

  // Memoize state sync function with stable dependencies
  const syncStoredState = useCallback(() => {
    // Check if STORAGE_KEYS is defined before accessing it
    if (!STORAGE_KEYS || !STORAGE_KEYS.USER) {
      console.error("STORAGE_KEYS.USER is not defined");
      return;
    }

    const storedState = localStorage.getItem(STORAGE_KEYS.USER);
    if (!storedState) return;

    try {
      const currentState = JSON.parse(storedState);
      if (
        currentState?.boosts?.turboEndTime ||
        currentState?.boosts?.rechargeEndTime
      ) {
        persistState((prev) => ({
          ...prev,
          boosts: {
            ...prev.boosts,
            ...currentState.boosts,
          },
        }));
      }
    } catch (error) {
      console.error("Error parsing stored state:", error);
    }
  }, [persistState]);

  // Memoize turbo state sync with stable dependencies
  const syncTurboState = useCallback(() => {
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
  }, [turboActive, setTurboActive]);

  // Memoize totalCoins calculation
  const getTotalCoins = useCallback((power: number) => {
    return power * AUTO_TAP_DURATION;
  }, []);

  // Helper function to process autotap data (moved before useEffect)
  const processAutoTapData = useCallback(
    (gameState: {
      autoTapActive: boolean;
      autoTapStartTime: number;
      upgrades?: { tapLevel?: number };
      autoTapInitialPower?: number;
    }) => {
      if (!gameState.autoTapActive || !gameState.autoTapStartTime) return;

      const now = Date.now();
      const startTime = gameState.autoTapStartTime;
      const totalDuration = AUTO_TAP_DURATION;
      const elapsedSeconds = Math.min(
        totalDuration,
        Math.floor((now - startTime) / 1000)
      );
      // Use initial tap power when available, otherwise fallback to current level
      const tapPower =
        gameState.autoTapInitialPower || gameState.upgrades?.tapLevel || 1;
      const totalPossibleCoins = totalDuration * tapPower;
      const earnedCoins = Math.min(
        elapsedSeconds * tapPower,
        totalPossibleCoins
      );

      setCurrentSpark(earnedCoins);
      console.log(
        "BoostersPage - Earned Coins:",
        earnedCoins,
        "Elapsed Seconds:",
        elapsedSeconds,
        "Tap Power:",
        tapPower,
        "Total Possible:",
        totalPossibleCoins
      );

      persistState((prev) => ({
        ...prev,
        autoTapCoins: earnedCoins,
        autoTapTotalCoins: totalPossibleCoins,
        autoTapActive: true,
        autoTapStartTime: startTime,
        autoTapEndTime: startTime + totalDuration * 1000,
      }));

      const remainingTime = startTime + totalDuration * 1000 - now;
      if (remainingTime > 0 && startTimer && !autoTapTimer) {
        startTimer(AUTO_TAP_TIMER_TYPE, remainingTime, {
          callback: () => {
            persistState((p) => ({
              ...p,
              autoTapActive: false,
              autoTapEndTime: 0,
              autoTapStartTime: 0,
              autoTapTimeLeft: 0,
              autoTapCoins: totalPossibleCoins,
              autoTapTotalCoins: totalPossibleCoins,
              autoTapProgress: 100,
              autoTapClaimed: false,
            }));
          },
        });
      }
    },
    [persistState, startTimer, autoTapTimer, setCurrentSpark]
  );

  // Simplified autotap initialization with useRef to prevent multiple runs
  useEffect(() => {
    if (!gameState.user_id || autoTapInitialized.current) return;

    const initializeAutoTapData = async () => {
      try {
        // Check if we have recent data in localStorage first
        const cachedData = localStorage.getItem("autoTapData");
        const now = Date.now();
        if (cachedData) {
          const { data: cachedState, timestamp } = JSON.parse(cachedData);
          // Use cached data if it's less than 1 minute old
          if (now - timestamp < 60000 && cachedState.userData) {
            // Process cached data
            const { userData } = cachedState;
            if (userData.game_state && userData.game_state.autoTapActive) {
              processAutoTapData(userData.game_state);
            }
            return;
          }
        }

        // Get user ID from useUser hook if available
        const userId =
          WebApp?.initDataUnsafe?.user?.id?.toString() || gameState.user_id;

        if (!userId || userId === "0") {
          console.log("No valid user ID for initializeAutoTapData");
          return;
        }

        // Fetch data from telegram_users table only
        console.log("[BoostersPage] Database Request - initializeAutoTapData");
        const { data: userData, error: userError } = await supabase!
          .from("telegram_users")
          .select("game_state")
          .eq("user_id", userId)
          .single();

        if (userError) throw userError;

        // Process the data
        if (userData?.game_state && userData.game_state.autoTapActive) {
          processAutoTapData(userData.game_state);
        }

        // Cache the results
        localStorage.setItem(
          "autoTapData",
          JSON.stringify({
            data: { userData },
            timestamp: now,
          })
        );
      } catch (error) {
        console.error("Error initializing autotap data:", error);
      }

      // Mark as initialized regardless of outcome
      autoTapInitialized.current = true;
    };

    initializeAutoTapData();
  }, [gameState.user_id, processAutoTapData, WebApp]);

  // Add event listener for coin updates from autotap
  useEffect(() => {
    const handleCoinUpdate = (event: CustomEvent) => {
      const { source } = event.detail;

      // Only update if the source is autotap to avoid conflicts with other coin updates
      if (source === "autotap") {
        // Force a re-render by updating local state that reflects game state
        // This ensures the spark amount is updated immediately in the UI
        setCurrentSpark(0); // Reset autotap display
      }
    };

    // Add event listener
    window.addEventListener("coinUpdate", handleCoinUpdate as EventListener);

    // Clean up
    return () => {
      window.removeEventListener(
        "coinUpdate",
        handleCoinUpdate as EventListener
      );
    };
  }, []);

  // Combine related initialization effects
  useEffect(() => {
    // Initial setup
    syncStoredState();

    if (showAutoTap) {
      setSelectedUpgrade("auto-tap");
    }

    // Setup event listeners and intervals
    window.addEventListener("turboStateChange", syncTurboState);
    const turboInterval = setInterval(syncTurboState, 1000);

    return () => {
      window.removeEventListener("turboStateChange", syncTurboState);
      clearInterval(turboInterval);
    };
  }, [syncStoredState, syncTurboState, showAutoTap]);

  // Memoize free boosters with more granular dependencies
  const freeBoosters = useMemo((): Booster[] => {
    // Get max uses from game state or fall back to default
    const maxTurboUses = gameState.boosts?.maxTurboUses || 3;
    const maxRechargeUses = gameState.boosts?.maxRechargeUses || 3;

    return [
      {
        id: "turbo",
        title: "Turbo",
        description: "",
        icon: <Image src="/assets/TurboIcon.png" alt="Turbo" width={46} height={46} />,
        inGameUses: gameState.boosts?.inGameTurbo,
        rewardedUses: gameState.boosts?.rewardedTurbo,
        maxInGameUses: maxTurboUses,
        duration: 30,
        color: "yellow",
      },
      {
        id: "recharge",
        title: "Recharge",
        description: "",
        icon: (
          <Image src="/assets/RechargeIcon.png" alt="Recharge" width={46} height={46} />
        ),
        inGameUses: gameState.boosts?.inGameRecharge,
        rewardedUses: gameState.boosts?.rewardedRecharge,
        maxInGameUses: maxRechargeUses,
        duration: 0,
        color: "blue",
      },
    ];
  }, [
    gameState.boosts?.inGameTurbo,
    gameState.boosts?.rewardedTurbo,
    gameState.boosts?.inGameRecharge,
    gameState.boosts?.rewardedRecharge,
    gameState.boosts?.maxTurboUses,
    gameState.boosts?.maxRechargeUses,
  ]);

  // Combine turbo and recharge state effects to sync UI to gameState
  useEffect(() => {
    // Immediately check and update the state when component mounts
    const syncBoosterStates = () => {
      const newTurboActive = gameState.boosts?.turboActive || false;
      const newRechargeActive = gameState.boosts?.rechargeActive || false;

      if (newTurboActive !== turboActive) {
        setTurboActive(newTurboActive);
      }
      if (newRechargeActive !== rechargeActive) {
        setRechargeActive(newRechargeActive);
      }
    };

    syncBoosterStates();
  }, [
    gameState.boosts?.turboActive,
    gameState.boosts?.rechargeActive,
    turboActive,
    rechargeActive,
    setTurboActive,
    setRechargeActive,
  ]);

  // Update spark display with real-time increments
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (autoTapActive && autoTapTimer?.remainingSec !== undefined) {
      const elapsedTime = Math.min(
        AUTO_TAP_DURATION,
        AUTO_TAP_DURATION - autoTapTimer.remainingSec
      );
      const sparkCount = Math.min(
        elapsedTime * tapPowerLevel,
        AUTO_TAP_DURATION * tapPowerLevel
      );
      setCurrentSpark(sparkCount);

      intervalRef.current = setInterval(() => {
        const remainingSec = autoTapTimer.remainingSec;
        if (remainingSec !== undefined && remainingSec > 0) {
          const newElapsedTime =
            AUTO_TAP_DURATION - Math.max(0, remainingSec - 1);
          const newSparkCount = Math.min(
            newElapsedTime * tapPowerLevel,
            AUTO_TAP_DURATION * tapPowerLevel
          );
          setCurrentSpark(newSparkCount);

          persistState((prev) => ({
            ...prev,
            autoTapSpark: newSparkCount,
            autoTapCoins: newSparkCount,
          }));
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoTapActive, autoTapTimer?.remainingSec, tapPowerLevel, persistState]);

  // Add this effect to keep currentSpark in sync with gameState
  useEffect(() => {
    if (gameState.autoTapSpark !== undefined) {
      setCurrentSpark(gameState.autoTapSpark);
    }
  }, [gameState.autoTapSpark]);

  // Combine booster refill with daily reset checks
  useEffect(() => {
    // Initial check when component mounts
    handleBoosterRefill((update) =>
      persistState((prev) => ({ ...prev, ...update }))
    );
    checkAndResetDailyAutoTap(gameState, persistState);

    // Set up interval for active session
    const interval = setInterval(() => {
      handleBoosterRefill((update) =>
        persistState((prev) => ({ ...prev, ...update }))
      );
      checkAndResetDailyAutoTap(gameState, persistState);
    }, BOOSTER_REFILL_INTERVAL);

    return () => clearInterval(interval);
  }, [persistState, handleBoosterRefill, gameState]);

  // Simplified autoTap total coins update
  useEffect(() => {
    if (autoTapActive) {
      try {
        const totalPossibleCoins = getTotalCoins(tapPowerLevel);
        persistState((prev) => ({
          ...prev,
          autoTapTotalCoins: totalPossibleCoins,
        }));
      } catch (error) {
        console.error("Error updating autoTap state:", error);
      }
    }
  }, [tapPowerLevel, autoTapActive, persistState, getTotalCoins]);

  // Add daily booster reset check effect
  useEffect(() => {
    // Check for daily reset on mount
    const checkDailyReset = () => {
      const now = new Date();
      const lastResetStr = localStorage.getItem("lastBoosterReset");
      const lastReset = lastResetStr ? new Date(lastResetStr) : new Date(0);

      // Check if it's a new UTC day
      const isNewDay =
        now.getUTCDate() !== lastReset.getUTCDate() ||
        now.getUTCMonth() !== lastReset.getUTCMonth() ||
        now.getUTCFullYear() !== lastReset.getUTCFullYear();

      if (isNewDay) {
        handleBoosterRefill((update) =>
          persistState((prev) => ({ ...prev, ...update }))
        );
      }
    };

    // Check immediately
    checkDailyReset();

    // Set up interval to check near UTC midnight
    const interval = setInterval(() => {
      checkDailyReset();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [handleBoosterRefill, persistState]);

  // Memoize popup rendering to reduce re-renders

  const handleUpgrade = useCallback(
    async (upgrade: Upgrade) => {
      const upgradeKey = `${upgrade.id.split("-")[0]}Level` as UpgradeLevel;
      const currentLevel = gameState.upgrades?.[upgradeKey] || 0;

      if (
        upgrade.id !== "tap-upgrade" &&
        upgrade.maxLevel &&
        currentLevel >= upgrade.maxLevel
      ) {
        if (upgrade.id === "recharge-upgrade" && currentLevel >= 3) {
          gameToast.info("Recharge Rate is already at maximum level!");
        }
        return;
      }

      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        if (upgrade.id === "recharge-upgrade") {
          // Check if already at max level
          if (currentLevel >= 3) {
            gameToast.info("Recharge Rate is already at maximum level!");
            return;
          }

          const nextLevel = Math.min(3, currentLevel + 1) as 1 | 2 | 3;
          const upgradeCost = 100 * (currentLevel + 1);

          // Check if user has enough sparks
          if (gameState.coins < upgradeCost) {
            gameToast.error(
              `Not enough sparks! You need ${upgradeCost.toLocaleString()} sparks to upgrade Recharge Rate.`
            );
            return;
          }

          persistState((prev) => ({
            ...prev,
            coins: Math.max(0, prev.coins - upgradeCost),
            RechargeLevel: nextLevel,
            upgrades: {
              ...prev.upgrades,
              rechargeLevel: nextLevel,
            },
          }));

          if (nextLevel === 3) {
            gameToast.success("Recharge Rate upgraded to maximum level!");
          } else {
            gameToast.success(`Recharge Rate upgraded to level ${nextLevel}!`);
          }
        } else if (
          upgrade.id === "energy-capacity" ||
          upgrade.id === "energy-upgrade"
        ) {
          const currentLevel = gameState.upgrades?.energyLevel || 1;
          if (currentLevel >= 40) {
            gameToast.info("Energy Capacity is already at maximum level!");
            return;
          }

          const nextLevel = Math.min(40, currentLevel + 1);
          const energyConfig = getEnergyConfig(nextLevel);
          const upgradeCost = energyConfig.upgradePrice;

          // Check if user has enough sparks
          if (gameState.coins < upgradeCost) {
            gameToast.error(
              `Not enough sparks! You need ${upgradeCost.toLocaleString()} sparks to upgrade Energy Capacity.`
            );
            return;
          }

          persistState((prev) => ({
            ...prev,
            coins: Math.max(0, prev.coins - upgradeCost),
            energyCapacity: energyConfig.maxRecharge,
            maxPhoenixEnergy: energyConfig.maxRecharge,
            upgrades: {
              ...prev.upgrades,
              energyLevel: nextLevel,
            },
          }));

          // Add success toast message for Energy Capacity upgrade
          if (nextLevel >= 40) {
            gameToast.success("Energy Capacity upgraded to maximum level!");
          } else {
            gameToast.success(
              `Energy Capacity upgraded to level ${nextLevel}!`
            );
          }
        } else {
          persistState((prev) => ({
            ...prev,
            upgrades: {
              ...prev.upgrades,
              [upgradeKey]: currentLevel + 1,
            },
          }));
        }

        setSelectedUpgrade(null);
      } catch {
        // Handle error silently
      }
    },
    [gameState.upgrades, gameState.coins, persistState, setSelectedUpgrade]
  );

  const handleCoinPurchase = useCallback(
    (upgrade: Upgrade) => {
      if (!upgrade.coinPrice) return;

      if (gameState.coins < upgrade.coinPrice) {
        return;
      }

      // For tap power upgrades, handle autotap state
      if (upgrade.id === "tap-upgrade") {
        const nextTapLevel = (gameState.upgrades?.tapLevel || 0) + 1;

        // If autotap is active, store as pending upgrade to apply after autotap finishes and is claimed
        if (gameState.autoTapActive) {
          persistState((prev) => ({
            ...prev,
            // Don't deduct coins yet - this will happen when the upgrade is actually applied
            pendingTapUpgrade: nextTapLevel,
          }));

          // Calculate remaining time for autotap
          const now = Date.now();
          const remainingTime = Math.max(
            0,
            (gameState.autoTapEndTime || 0) - now
          );
          const remainingSeconds = Math.ceil(remainingTime / 1000);

          gameToast.info(
            `Tap Power upgrade will be applied after Auto Tap completes in ${remainingSeconds} seconds`
          );

          // Close the popup
          setSelectedUpgrade(null);
          return;
        }

        // If autotap is not active, apply the upgrade immediately
        persistState((prev) => ({
          ...prev,
          coins: Math.max(0, prev.coins - upgrade.coinPrice!),
          upgrades: {
            ...prev.upgrades,
            tapLevel: nextTapLevel,
          },
        }));

        gameToast.success(`Tap Power upgraded to level ${nextTapLevel}!`);

        // Close the popup
        setSelectedUpgrade(null);
      } else {
        // Handle other upgrade types
        persistState((prev) => ({
          ...prev,
          coins: Math.max(0, prev.coins - upgrade.coinPrice!),
          upgrades: {
            ...prev.upgrades,
            tapLevel: (prev.upgrades.tapLevel || 0) + 1,
          },
        }));
      }
    },
    [
      gameState.coins,
      gameState.upgrades?.tapLevel,
      gameState.autoTapActive,
      gameState.autoTapEndTime,
      persistState,
      setSelectedUpgrade,
    ]
  );

  const handleCloseUpgrade = useCallback(() => {
    // If the autotap is active and was recently activated, don't close the popup
    if (selectedUpgrade === "auto-tap" && gameState.autoTapActive) {
      const now = Date.now();
      const activationTime = gameState.autoTapStartTime || 0;
      const timeSinceActivation = now - activationTime;

      // If autotap was activated in the last 2 seconds, keep popup open
      if (timeSinceActivation < 2000) {
        console.log(
          "[BoostersPage] Keeping AutoTapPopup open - recent activation"
        );
        return;
      }
    }

    // Otherwise close the popup
    setSelectedUpgrade(null);
  }, [selectedUpgrade, gameState.autoTapActive, gameState.autoTapStartTime]);

  // Timer effect for Turbo
  useEffect(() => {
    if (turboActive) {
      const endTime = Number(localStorage.getItem("turboEndTime") || 0);
      const updateTimer = () => {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
        setTurboTimeLeft(timeLeft);
        if (timeLeft === 0) {
          setTurboActive(false);
          localStorage.removeItem("turboEndTime");
          // Clear turbo state in game state
          persistState((prev) => ({
            ...prev,
            boosts: {
              ...prev.boosts,
              turboActive: false,
              turboEndTime: undefined,
            },
          }));
          // Force sync across all components
          window.dispatchEvent(new Event("turboStateChange"));
        }
      };
      updateTimer(); // Initial update
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [turboActive, setTurboActive, setTurboTimeLeft, persistState]);

  // Timer effect for Recharge
  useEffect(() => {
    if (rechargeActive) {
      const endTime = Number(localStorage.getItem("rechargeEndTime") || 0);
      const updateTimer = () => {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
        setRechargeTimeLeft(timeLeft);
        if (timeLeft === 0) {
          setRechargeActive(false);

          localStorage.removeItem("rechargeEndTime");
        }
      };
      updateTimer(); // Initial update
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [rechargeActive, setRechargeActive, setRechargeTimeLeft]);

  useEffect(() => {
    if (WebApp && typeof WebApp === "object") {
      try {
        WebApp.BackButton.show();
        WebApp.enableClosingConfirmation();

        const handleBack = () => {
          router.push("/");
        };

        WebApp.BackButton.onClick(handleBack);

        return () => {
          try {
            WebApp.BackButton.offClick(handleBack);
            WebApp.BackButton.hide();
            WebApp.enableClosingConfirmation();
          } catch (error) {
            console.error("Error in WebApp cleanup:", error);
          }
        };
      } catch (error) {
        console.error("Error initializing WebApp:", error);
      }
    }
  }, [WebApp, router]);

  // Define upgrades here, before it's used in renderPopups
  const upgrades = useMemo(() => {
    const currentTapLevel = gameState.upgrades?.tapLevel || 1;
    const currentEnergyLevel = gameState.upgrades?.energyLevel || 1;
    const currentRechargeLevel = gameState.upgrades?.rechargeLevel || 1;

    const energyConfigData = energyConfig[currentEnergyLevel + 1];

    return [
      {
        id: "auto-tap",
        title: !gameState.application_state?.isAutotapPurchased
          ? "Activate Tap Bot"
          : "Tap Bot",
        description: (
          <div className="text-[#909090] text-sm">
            {!gameState.application_state?.isAutotapPurchased ? (
              <div className="flex items-center space-x-2 text-[#909090]">
                <Image
                  src="/assets/SparkyIcon.png"
                  alt="PHIP"
                  width={14}
                  height={14}
                  style={{ width: "auto", height: "auto" }}
                />
                <span>{AUTO_TAP_UNLOCK_COST}</span>
              </div>
            ) : (
              <div className="flex flex-row items-center justify-center">
                {autoTapActive && autoTapTimer?.remainingSec !== undefined ? (
                  <div className="flex items-center justify-center space-x-2 text-[#909090]">
                    <Image
                      src="/assets/SparkyIcon.png"
                      alt="PHIP"
                      width={14}
                      height={14}
                      style={{ width: "auto", height: "auto" }}
                    />
                    <span>{currentSpark.toLocaleString()}</span>
                    <span className="text-gray-400">
                      /{calculateAutoTapReward(tapPowerLevel).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2 text-[#909090]">
                    <Image
                      src="/assets/SparkyIcon.png"
                      alt="PHIP"
                      width={14}
                      height={14}
                      style={{ width: "auto", height: "auto" }}
                    />
                    <span>
                      {calculateAutoTapReward(tapPowerLevel).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center text-[#909090] ml-1">
                  <span className="text-gray-400 mx-1">•</span>
                  <div className="flex items-center ml-1">
                    <span>{gameState.autoTapDaily?.usesRemaining || 0}</span>
                    <span className="mx-0.5">/</span>
                    <span>{MAX_DAILY_AUTO_TAP_USES}</span>
                  </div>
                  <span className="ml-1">Available</span>
                </div>
              </div>
            )}
          </div>
        ),
        icon: (
          <Image
            src="/assets/AutoTapBotIcon.png"
            alt="Auto Tap"
            width={34}
            height={34}
            style={{ width: "auto", height: "auto" }}
          />
        ),
        price: "$1.99",
        priceInCents: 199,
        color: "red",
        effect: "Auto tap for 3 hours",
        currentCoins: gameState.autoTapCoins || 0,
        maxCoins:
          gameState.autoTapTotalCoins ||
          getTotalCoins(gameState.upgrades?.tapLevel || 1),
        availableUses: gameState.boosts?.autoTapUses || 0,
        maxUses: 3,
        tapPower: gameState.upgrades?.tapLevel || 1,
        canClaim:
          (gameState.autoTapCoins || 0) > 0 &&
          !gameState.autoTapClaimed &&
          !gameState.autoTapActive,
        isPurchased: gameState.coins >= AUTO_TAP_UNLOCK_COST,
      },
      {
        id: "tap-upgrade",
        title: "Tap Power",
        description: (
          <span className="flex items-center space-x-2 text-[#909090]">
            <Image
              src="/assets/SparkyIcon.png"
              alt="PHIP"
              width={14}
              height={14}
              style={{ width: "auto", height: "auto" }}
            />
            <span>
              {tapPowerConfig[
                gameState.upgrades?.tapLevel || 1
              ].upgradeCost.toLocaleString()}
            </span>
          </span>
        ),
        icon: (
          <Image
            src="/assets/TapPowerIcon.png"
            alt="Tap Power"
            width={34}
            height={34}
            style={{ width: "auto", height: "auto" }}
          />
        ),
        coinPrice:
          tapPowerConfig[gameState.upgrades?.tapLevel || 1].upgradeCost,
        level: currentTapLevel,
        color: "purple",
        effect: `Level ${currentTapLevel + 1}`,
      },
      {
        id: "energy-upgrade",
        title: "Energy Capacity",
        description: (
          <span className="flex items-center space-x-2 text-[#909090]">
            <Image
              src="/assets/SparkyIcon.png"
              alt="PHIP"
              width={14}
              height={14}
              style={{ width: "auto", height: "auto" }}
            />
            <span>{energyConfigData?.upgradePrice.toLocaleString() || 0}</span>

            <span className="text-gray-400 mx-1">•</span>

            <span className="text-sm text-gray-400">
              {energyConfigData?.initialValue.toLocaleString()}
            </span>
          </span>
        ),
        icon: (
          <Image
            src="/assets/EnergyCapacityIcon.png"
            alt="Energy Capacity"
            width={34}
            height={34}
            style={{ width: "auto", height: "auto" }}
          />
        ),
        coinPrice: energyConfigData?.upgradePrice || 0,
        level: currentEnergyLevel,
        maxLevel: 5,
        color: "orange",
        effect: `Max energy +${energyConfigData?.maxRecharge || 0}`,
      },
      {
        id: "recharge-upgrade",
        title: "Recharge Speed",
        description: (
          <span className="flex items-center space-x-2 text-[#909090]">
            {currentRechargeLevel >= 3 ? (
              <span>Max Upgrade</span>
            ) : (
              <>
                <Image
                  src="/assets/SparkyIcon.png"
                  alt="PHIP"
                  width={14}
                  height={14}
                  style={{ width: "auto", height: "auto" }}
                />
                <span>
                  {(100 * (currentRechargeLevel + 1)).toLocaleString()}
                </span>
              </>
            )}
          </span>
        ),
        icon: (
          <Image
            src="/assets/RechargingSpeedIcon.png"
            alt="Recharge Speed"
            width={34}
            height={34}
            style={{ width: "auto", height: "auto" }}
          />
        ),
        coinPrice: 100 * (currentRechargeLevel + 1),
        level: currentRechargeLevel,
        maxLevel: 3,
        color: "blue",
        effect: "Recharge speed +25%",
      },
    ];
  }, [
    currentSpark,
    autoTapActive,
    gameState.autoTapActive,
    gameState.autoTapClaimed,
    gameState.autoTapCoins,
    gameState.autoTapTotalCoins,
    gameState.application_state?.isAutotapPurchased,
    autoTapTimer?.remainingSec,
    gameState.autoTapDaily?.usesRemaining,
    gameState.boosts?.autoTapUses,
    gameState.upgrades?.tapLevel,
    gameState.upgrades?.energyLevel,
    gameState.upgrades?.rechargeLevel,
    gameState.coins,
    tapPowerLevel,
    getTotalCoins,
  ]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen font-rounded-mplus">
      {/* Background Image */}
      <div
        className="fixed top-0 inset-0 z-0 no-scroll"
        style={{ top: "-90px" }}
      >
        <Image
          src="/images/BooseterBackground.png"
          alt="Booster Background"
          style={{ objectFit: "cover" }}
          quality={100}
          priority
        />
      </div>

      <div className="relative z-10 py-2 w-full px-6 overflow-y-auto overflow-x-hidden">
        {/* Free Boosters Section */}
        <div className="space-y-4 z-10">
          <h2 className="text-sm font-bold text-[#909090]">Your Balance</h2>
          <div className="flex items-center space-x-2">
            <Image
              src="/assets/SparkyIcon.png"
              alt="PHIP"
              width={48}
              height={48}
              style={{ width: "auto", height: "auto" }}
            />
            <h4 className="text-4xl font-bold text-white">
              {Math.max(0, gameState.coins).toLocaleString()}
            </h4>
          </div>
          <h2
            className="text-sm font-bold text-[#E18700] underline"
            onClick={() => router.push("/boosters/howitworks")}
          >
            How it works!
          </h2>
          <h4 className="text-xl font-bold Rounded Mplus text-[#E18700]">
            Free Boosts
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {freeBoosters.map((booster) => (
              <div
                key={booster.id}
                onClick={() => {
                  // Always show popup for both booster types
                  setSelectedBooster(booster.id as "turbo" | "recharge");
                }}
                className="relative cursor-pointer hover:opacity-90 transition-all duration-300 w-full"
              >
                <div className="relative w-full h-[78px] rounded-[10px] bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] backdrop-blur-[14px] py-4 flex items-center">
                  <div className="flex items-start px-2 space-x-4">
                    <div className="relative">{booster.icon}</div>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-[18px] text-white font-semibold">
                        {booster.title}
                      </span>
                      <div className="text-[#909090] font-medium mt-1">
                        {booster.inGameUses === 0 && booster.rewardedUses === 0
                          ? "0"
                          : booster.inGameUses + booster.rewardedUses}
                        /{booster.maxInGameUses}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Upgrades Section */}
          <h2 className="text-xl font-bold font-rounded-mplus text-[#E18700]">
            Upgrades
          </h2>
          <div className="space-y-3 rounded-xl p-2 relative overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
              <Image
                src="/assets/UpgradesBackground.png"
                alt="Upgrades Background"
                fill
                style={{ objectFit: "cover" }}
                quality={100}
              />
            </div>
            <div className="relative z-10">
              {upgrades.map((upgrade: Upgrade) => (
                <div key={upgrade.id}>
                  <div
                    className={`rounded-xl p-2 backdrop-blur-sm`}
                    onClick={() => {
                      if (upgrade.id === "auto-tap") {
                        setSelectedUpgrade("auto-tap");
                        return;
                      }

                      // Check for tap power upgrade
                      if (upgrade.id === "tap-upgrade") {
                        const requiredCoins =
                          tapPowerConfig[gameState.upgrades?.tapLevel || 1]
                            .upgradeCost;
                        if (gameState.coins < requiredCoins) {
                          gameToast.error(
                            `Not enough sparks! You need ${requiredCoins.toLocaleString()} sparks to upgrade Tap Power.`
                          );
                          return;
                        }
                      }

                      // Check for energy capacity upgrade
                      if (upgrade.id === "energy-upgrade") {
                        const nextLevel =
                          (gameState.upgrades?.energyLevel || 1) + 1;
                        const requiredCoins =
                          energyConfig[nextLevel]?.upgradePrice || 0;
                        if (gameState.coins < requiredCoins) {
                          gameToast.error(
                            `Not enough sparks! You need ${requiredCoins.toLocaleString()} sparks to upgrade Energy Capacity.`
                          );
                          return;
                        }
                      }

                      // Check for recharge upgrade
                      if (upgrade.id === "recharge-upgrade") {
                        if ((gameState.upgrades?.rechargeLevel || 0) >= 3) {
                          gameToast.info(
                            "Recharge Rate is already at maximum level!"
                          );
                          return;
                        }
                        const requiredCoins =
                          100 * ((gameState.upgrades?.rechargeLevel || 0) + 1);
                        if (gameState.coins < requiredCoins) {
                          gameToast.error(
                            `Not enough sparks! You need ${requiredCoins.toLocaleString()} sparks to upgrade Recharge Rate.`
                          );
                          return;
                        }
                      }

                      if (
                        upgrade.id !== "tap-upgrade" &&
                        upgrade.maxLevel &&
                        (upgrade.level || 0) >= (upgrade.maxLevel || 0)
                      ) {
                        return;
                      }
                      setSelectedUpgrade(upgrade.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 flex items-center justify-center w-[50px] h-[50px]">
                          {upgrade.icon}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-bold text-white">
                              {upgrade.title}
                            </h3>
                            {upgrade.id !== "auto-tap" && (
                              <span
                                className={`text-xs font-bold text-[#E18700]`}
                              >
                                {upgrade.id === "tap-upgrade"
                                  ? `Level ${upgrade.level}`
                                  : upgrade.id === "recharge-upgrade"
                                  ? (upgrade.level || 0) >= 3
                                    ? "Lvl 3/3"
                                    : `Lvl ${upgrade.level}/${upgrade.maxLevel}`
                                  : upgrade.id === "energy-upgrade"
                                  ? `Lvl ${upgrade.level}`
                                  : `Lvl ${upgrade.level} / ${upgrade.maxLevel}`}
                              </span>
                            )}
                          </div>
                          <div className="text-gray-400 text-sm font-semibold">
                            {upgrade.description}
                          </div>
                        </div>
                      </div>
                      {upgrade.id === "auto-tap" ? (
                        !gameState.application_state?.isAutotapPurchased &&
                        !autoTapActive &&
                        gameState.coins < AUTO_TAP_UNLOCK_COST ? (
                          <Image
                            src="/assets/LockedYellow.png"
                            alt="Locked"
                            width={24}
                            height={24}
                            style={{ width: "24px", height: "24px" }}
                          />
                        ) : (
                          <FaChevronRight className="text-gray-400" />
                        )
                      ) : upgrade.id === "recharge-upgrade" ? (
                        (gameState.upgrades?.rechargeLevel || 0) >= 3 ? (
                          <Image
                            src="/assets/TaskCompletedDiamond.png"
                            alt="Completed"
                            width={24}
                            height={24}
                            style={{ width: "auto", height: "auto" }}
                          />
                        ) : gameState.coins < AUTO_TAP_UNLOCK_COST ? (
                          <Image
                            src="/assets/LockedYellow.png"
                            alt="Locked"
                            width={24}
                            height={24}
                            style={{ width: "24px", height: "24px" }}
                          />
                        ) : (
                          <FaChevronRight className="text-gray-400" />
                        )
                      ) : upgrade.id === "tap-upgrade" ? (
                        gameState.coins <
                        tapPowerConfig[gameState.upgrades?.tapLevel || 1]
                          .upgradeCost ? (
                          <Image
                            src="/assets/LockedYellow.png"
                            alt="Locked"
                            width={24}
                            height={24}
                            style={{ width: "24px", height: "24px" }}
                          />
                        ) : (
                          <FaChevronRight className="text-gray-400" />
                        )
                      ) : upgrade.id === "energy-upgrade" ? (
                        gameState.coins <
                        (energyConfig[
                          (gameState.upgrades?.energyLevel || 1) + 1
                        ]?.upgradePrice || 0) ? (
                          <Image
                            src="/assets/LockedYellow.png"
                            alt="Locked"
                            width={24}
                            height={24}
                            style={{ width: "24px", height: "24px" }}
                          />
                        ) : (
                          <FaChevronRight className="text-gray-400" />
                        )
                      ) : (
                        <FaChevronRight className="text-gray-400" />
                      )}
                    </div>
                  </div>
                  {upgrade.id !== upgrades[upgrades.length - 1].id && (
                    <div className="border-b border-gray-700/50 my-2 w-[90%] mx-auto"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Direct conditionals for the popups instead of the memoized component */}
      {selectedUpgrade === "auto-tap" && (
        <>
          {autoTapTimer && gameState.autoTapActive ? (
            <AutoTapPopup
              isOpen={true}
              onClose={handleCloseUpgrade}
              autoTapSpark={currentSpark}
              tapPowerLevel={tapPowerForAutoTap}
            />
          ) : !gameState.autoTapActive &&
            gameState.autoTapCoins &&
            !gameState.autoTapClaimed ? (
            <AutoTapPopup
              isOpen={true}
              onClose={handleCloseUpgrade}
              autoTapSpark={currentSpark}
              tapPowerLevel={tapPowerForAutoTap}
            />
          ) : (
            <AutoTapPopup
              isOpen={true}
              onClose={handleCloseUpgrade}
              autoTapSpark={currentSpark}
              tapPowerLevel={tapPowerForAutoTap}
            />
          )}
        </>
      )}

      {selectedUpgrade === "tap-upgrade" && (
        <TapPowerPopup
          isOpen={true}
          onClose={handleCloseUpgrade}
          onUpgrade={() =>
            handleCoinPurchase({
              id: "tap-upgrade",
              coinPrice:
                tapPowerConfig[gameState.upgrades?.tapLevel || 1].upgradeCost,
            } as Upgrade)
          }
        />
      )}

      {selectedUpgrade === "energy-upgrade" && (
        <EnergyCapacityPopup
          isOpen={true}
          onClose={handleCloseUpgrade}
          onUpgrade={() =>
            handleUpgrade({
              id: "energy-upgrade",
              maxLevel: 5,
            } as Upgrade)
          }
        />
      )}

      {selectedUpgrade === "recharge-upgrade" && (
        <RechargeSpeedPopup
          isOpen={true}
          onClose={handleCloseUpgrade}
          onUpgrade={() =>
            handleUpgrade({
              id: "recharge-upgrade",
              maxLevel: 3,
            } as Upgrade)
          }
        />
      )}

      {selectedBooster && (
        <BoostsPopup
          isOpen={true}
          boostType={selectedBooster}
          onClose={() => setSelectedBooster(null)}
        />
      )}
    </main>
  );
}
