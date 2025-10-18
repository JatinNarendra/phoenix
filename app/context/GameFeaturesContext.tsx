"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useGame } from "./GameContext";
import { useUser } from "../hooks/useUser";
import timerService from "../services/timerService";
import { toast } from "react-hot-toast";
import {
  TimerType,
  TimerData,
  TimerState,
  TimerMetadata,
} from "../types/gameTypes";
import { AUTO_TAP_DURATION } from "../constants/gameConstants";
import { AutoTapReward } from "../services/timerService";
import { checkRewardAvailability as checkReward } from "../lib/dailyRewards";

// Types
interface SpinResult {
  id: string;
  multiplier: number;
  coins: number;
  timestamp: number;
}

interface SpinFeatures {
  isSpinning: boolean;
  isAutoSpinning: boolean;
  spinCount: number;
  spinResults: SpinResult[];
  startSpin: () => Promise<void>;
  stopSpin: () => void;
  startAutoSpin: () => Promise<void>;
  stopAutoSpin: () => void;
  canSpin: boolean;
  spinMultiplier: number;
  lastSpinTime: number | null;
  spinHistory: SpinResult[];
  clearSpinHistory: () => void;
  shouldShowSpin: boolean;
}

interface AutoTapFeatures {
  autoTapSpeed: number;
  autoTapPower: number;
  autoTapCoinsEarned: number;
  dailyUsesRemaining: number;
  uncollectedRewards: AutoTapReward[];
  startAutoTap: () => Promise<void>;
  stopAutoTap: () => Promise<void>;
  collectReward: (timerId: string, sparkAmount: number) => Promise<void>;
  resetAutoTapCoinsEarned: () => void;
}

interface DailyRewardsFeatures {
  isRewardAvailable: boolean;
  timeUntilNext: {
    hours: string;
    minutes: string;
    seconds: string;
    raw: number;
  };
  checkRewardAvailability: () => {
    canCollect: boolean;
    missedDay: boolean;
    timeUntilNext: number;
  };
}

interface TimerFeatures {
  timers: TimerState;
  isLoading: boolean;
  startTimer: (
    timerType: TimerType,
    duration: number,
    metadata?: TimerMetadata
  ) => Promise<TimerData | null>;
  completeTimer: (timerType: TimerType) => Promise<void>;
  getTimerInfo: (timerType: TimerType) => TimerData | null;
  formatTime: (seconds: number) => string;
}

interface GameFeaturesContextType {
  spin: SpinFeatures;
  autoTap: AutoTapFeatures;
  dailyRewards: DailyRewardsFeatures;
  timers: TimerFeatures;
}

const GameFeaturesContext = createContext<GameFeaturesContextType | undefined>(
  undefined
);

// Add an interface for the window with our custom property
interface CustomWindow extends Window {
  __stopAutoTapInProgress?: boolean;
}

export const GameFeaturesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Spin state
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [spinResults, setSpinResults] = useState<SpinResult[]>([]);
  const [lastSpinTime, setLastSpinTime] = useState<number | null>(null);
  const [spinHistory, setSpinHistory] = useState<SpinResult[]>([]);
  const [spinMultiplier, setSpinMultiplier] = useState(1);

  // Auto tap state
  const [autoTapSpeed] = useState(100); // milliseconds between taps
  const [autoTapPower, setAutoTapPower] = useState(1);
  const [autoTapCoinsEarned, setAutoTapCoinsEarned] = useState(0);
  const [dailyUsesRemaining, setDailyUsesRemaining] = useState(3);
  const [uncollectedRewards, setUncollectedRewards] = useState<AutoTapReward[]>(
    []
  );

  // Daily rewards state
  const [isRewardAvailable, setIsRewardAvailable] = useState(false);
  const [timeUntilNext, setTimeUntilNext] = useState({
    hours: "00",
    minutes: "00",
    seconds: "00",
    raw: 0,
  });

  const {
    increaseCoins,
    gameState,
    calculateTotalCoinsWithTurbo,
    decreaseSpins,
    persistState,
  } = useGame();
  const { id: userId } = useUser();

  // Timer state
  const [timersState, setTimersState] = useState<TimerState>({});
  const [isTimerLoading, setIsTimerLoading] = useState(true);

  // Add a ref to store previous timer state
  const prevTimersRef = useRef<TimerState>({});

  // Add function to handle spin timer completion
  const handleSpinTimerComplete = useCallback(() => {
    if (gameState.spins < 50) {
      // Add 5 spins for the completed timer
      persistState((prev) => ({
        ...prev,
        spins: Math.min(50, (prev.spins || 0) + 5),
        lastActiveTime: Date.now(), // Update last active time
      }));

      // Game toast: notify user about awarded spins
      toast.success("+5 spins added");

      // Restart timer if still under 50 spins after adding
      const newSpinCount = Math.min(50, gameState.spins + 5);
      if (newSpinCount < 50) {
        timerService.startTimer(TimerType.SPIN, 2.5 * 60 * 60 * 1000); // 2.5 hours
      }
    }
  }, [gameState.spins, persistState]);

  // Initialize timer service and register callbacks
  useEffect(() => {
    timerService.initializeTimerService();

    // Register spin timer completion callback
    timerService.onTimerComplete(TimerType.SPIN, handleSpinTimerComplete);

    return () => {
      // Unregister callback on cleanup
      timerService.offTimerComplete(TimerType.SPIN);
      timerService.cleanupTimerService();
    };
  }, [handleSpinTimerComplete]);

  // Initialize spin timer when spins are below 50
  useEffect(() => {
    if (gameState.spins < 50) {
      const spinTimer = timerService.getTimerInfo(TimerType.SPIN);
      if (!spinTimer || spinTimer.status !== "active") {
        // Start a new spin timer for 2.5 hours
        timerService.startTimer(TimerType.SPIN, 2.5 * 60 * 60 * 1000);
      }
    }
  }, [gameState.spins]);

  // Load user timers
  useEffect(() => {
    if (!userId) {
      setTimersState({});
      setIsTimerLoading(false);
      return;
    }

    const loadTimers = async () => {
      setIsTimerLoading(true);
      const activeTimers = timerService.getAllActiveTimers();

      // Initialize or resolve spin timer state correctly
      if (gameState.spins < 50) {
        const spinTimer = activeTimers.spin;

        if (!spinTimer) {
          // No timer → start fresh
          timerService.startTimer(TimerType.SPIN, 2.5 * 60 * 60 * 1000); // 2.5 hours
          const updatedTimers = timerService.getAllActiveTimers();
          setTimersState(updatedTimers);
        } else if (
          spinTimer.status === "completed" ||
          (spinTimer.endTime && spinTimer.endTime <= Date.now())
        ) {
          // Completed/expired → award 5 spins, then restart inside handler if still <50
          handleSpinTimerComplete();
          const updatedTimers = timerService.getAllActiveTimers();
          setTimersState(updatedTimers);
        } else {
          // Active → just use it
          setTimersState(activeTimers);
        }
      } else {
        setTimersState(activeTimers);
      }

      setIsTimerLoading(false);
    };

    loadTimers();

    // Create a ref to track if component is mounted
    const isMounted = { current: true };

    // Set up an interval to update timer UI every second
    const intervalId = setInterval(() => {
      // Only update state if component is still mounted
      if (isMounted.current) {
        const timers = timerService.getAllActiveTimers();

        // Check if spin timer needs to be restarted
        if (gameState.spins < 50) {
          const spinTimer = timers.spin;

          // If timer doesn't exist, start a fresh 2.5h timer
          if (!spinTimer) {
            timerService.startTimer(TimerType.SPIN, 2.5 * 60 * 60 * 1000);
            const updatedTimers = timerService.getAllActiveTimers();
            if (
              JSON.stringify(updatedTimers) !==
              JSON.stringify(prevTimersRef.current)
            ) {
              prevTimersRef.current = updatedTimers;
              setTimersState(updatedTimers);
            }
          } else if (spinTimer.status === "completed") {
            // If timer completed, award spins and possibly restart inside handler
            handleSpinTimerComplete();
            const updatedTimers = timerService.getAllActiveTimers();
            if (
              JSON.stringify(updatedTimers) !==
              JSON.stringify(prevTimersRef.current)
            ) {
              prevTimersRef.current = updatedTimers;
              setTimersState(updatedTimers);
            }
          } else if (
            JSON.stringify(timers) !== JSON.stringify(prevTimersRef.current)
          ) {
            prevTimersRef.current = timers;
            setTimersState(timers);
          }
        } else if (
          JSON.stringify(timers) !== JSON.stringify(prevTimersRef.current)
        ) {
          prevTimersRef.current = timers;
          setTimersState(timers);
        }
      }
    }, 1000);

    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
    };
  }, [userId, gameState.spins]);

  // When spins drop from >=50 to <50, start a fresh 2.5h timer
  useEffect(() => {
    const prevSpinsRef = { current: gameState.spins } as { current: number };
    return () => {
      prevSpinsRef.current = gameState.spins;
    };
  }, []);

  useEffect(() => {
    // Track previous spins using a static ref on the window to avoid rerender issues
    const w = window as unknown as { __prevSpins?: number };
    const prevSpins = w.__prevSpins;
    if (typeof prevSpins === "number") {
      if (prevSpins >= 50 && gameState.spins < 50) {
        // Start a new timer from now when dropping below 50
        timerService.startTimer(TimerType.SPIN, 2.5 * 60 * 60 * 1000);
        setTimersState(timerService.getAllActiveTimers());
      }
    }
    w.__prevSpins = gameState.spins;
  }, [gameState.spins]);

  // Load auto-tap state
  useEffect(() => {
    if (!userId) return;

    const loadAutoTapState = async () => {
      const state = await timerService.getAutoTapState(userId.toString());
      if (state) {
        setDailyUsesRemaining(state.dailyUsesRemaining);
        setAutoTapCoinsEarned(state.coinsEarned);
      }

      const rewards = await timerService.getUncollectedRewards(
        userId.toString()
      );
      setUncollectedRewards(rewards);
    };

    loadAutoTapState();
    // Refresh state every minute
    const intervalId = setInterval(loadAutoTapState, 60000);
    return () => clearInterval(intervalId);
  }, [userId]);

  // Timer functions
  const startTimer = useCallback(
    async (
      timerType: TimerType,
      duration: number,
      metadata?: TimerMetadata
    ) => {
      try {
        const timer = timerService.startTimer(timerType, duration, metadata);
        setTimersState(timerService.getAllActiveTimers());
        return Promise.resolve(timer);
      } catch (error) {
        console.error("Error starting timer:", error);
        return Promise.resolve(null);
      }
    },
    []
  );

  const completeTimer = useCallback(async (timerType: TimerType) => {
    try {
      timerService.completeTimer(timerType);
      setTimersState(timerService.getAllActiveTimers());
      return Promise.resolve();
    } catch (error) {
      console.error("Error completing timer:", error);
    }
  }, []);

  const getTimerInfo = useCallback((timerType: TimerType) => {
    return timerService.getTimerInfo(timerType);
  }, []);

  const formatTime = useCallback((seconds: number) => {
    return timerService.formatTime(seconds);
  }, []);

  // Spin functions
  const generateSpinResult = useCallback(() => {
    const rand = Math.random() * 100;
    let multiplier = 1;

    if (rand < 40) multiplier = 1; // 40% chance
    else if (rand < 70) multiplier = 2; // 30% chance
    else if (rand < 85) multiplier = 3; // 15% chance
    else if (rand < 95) multiplier = 5; // 10% chance
    else multiplier = 10; // 5% chance

    multiplier *= gameState.upgrades.spinLevel || 1;

    const baseCoins = 1000;
    const totalCoins = baseCoins * multiplier;

    return {
      id: `spin-${Date.now()}-${Math.random()}`,
      multiplier,
      coins: totalCoins,
      timestamp: Date.now(),
    };
  }, [gameState.upgrades.spinLevel]);

  const canSpin = useCallback(() => {
    const spinTimer = timerService.getTimerInfo(TimerType.SPIN);
    if (
      !spinTimer ||
      (spinTimer.status !== "active" && spinTimer.remainingSec === 0)
    ) {
      return gameState.spins > 0;
    }
    return false;
  }, [gameState.spins]);

  const startSpin = useCallback(async () => {
    if (!canSpin() || isSpinning) return;

    setIsSpinning(true);
    const result = generateSpinResult();

    await new Promise((resolve) => setTimeout(resolve, 3000));

    decreaseSpins(1);
    increaseCoins(result.coins);
    setSpinResults((prev) => [...prev, result]);
    setSpinHistory((prev) => [...prev.slice(-9), result]);
    setLastSpinTime(Date.now());
    setSpinCount((prev) => prev + 1);

    toast.success(
      `Won ${result.coins.toLocaleString()} coins! (${result.multiplier}x)`
    );
    setIsSpinning(false);
  }, [canSpin, isSpinning, generateSpinResult, decreaseSpins, increaseCoins]);

  const stopSpin = useCallback(() => {
    setIsSpinning(false);
  }, []);

  const startAutoSpin = useCallback(async () => {
    if (isAutoSpinning || !canSpin()) return;

    setIsAutoSpinning(true);
    while (canSpin() && isAutoSpinning) {
      await startSpin();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    setIsAutoSpinning(false);
  }, [isAutoSpinning, canSpin, startSpin]);

  const stopAutoSpin = useCallback(() => {
    setIsAutoSpinning(false);
  }, []);

  const clearSpinHistory = useCallback(() => {
    setSpinHistory([]);
  }, []);

  // Auto tap functions
  const startAutoTap = useCallback(async () => {
    if (!userId || gameState.autoTapActive) return;

    try {
      // Get current auto tap state from database
      const autoTapState = await timerService.getAutoTapState(
        userId.toString()
      );

      // Check if user has remaining uses
      if (!autoTapState || autoTapState.dailyUsesRemaining <= 0) {
        toast.error("No auto tap uses remaining today. Try again tomorrow!");
        return;
      }

      const now = Date.now();
      const timerId = `autoTap-${now}`;
      const duration = AUTO_TAP_DURATION * 1000;

      // Create timer metadata with user info
      const metadata: TimerMetadata = {
        autoTapSpark: 0,
        coinsEarned: 0,
        userId: userId.toString(),
        timerId: timerId,
      };

      // Start the auto-tap timer using our new API
      const timer = await startTimer(TimerType.AUTO_TAP, duration, metadata);

      if (!timer) {
        toast.error("Failed to start auto-tap timer");
        return;
      }

      // Decrease uses remaining in the database
      await timerService.updateAutoTapUses(
        userId.toString(),
        autoTapState.dailyUsesRemaining - 1
      );

      // Update local state
      setAutoTapCoinsEarned(0);
      setDailyUsesRemaining(autoTapState.dailyUsesRemaining - 1);

      // Update game state
      persistState((prev) => ({
        ...prev,
        autoTapActive: true,
        autoTapStartTime: now,
        autoTapEndTime: now + duration,
        autoTapProgress: 0,
        autoTapTimeLeft: AUTO_TAP_DURATION,
        autoTapSpark: 0,
        lastAutoTapUpdate: now,
      }));

      // Start the auto-tap interval for coins
      const intervalId = setInterval(async () => {
        const coinsPerTap = calculateTotalCoinsWithTurbo(autoTapPower, false);
        const newTotal = autoTapCoinsEarned + coinsPerTap;
        setAutoTapCoinsEarned(newTotal);
      }, autoTapSpeed);

      // Set up a timeout to automatically stop auto-tap when timer completes
      setTimeout(() => {
        clearInterval(intervalId);

        // Check for uncollected rewards
        const rewards = [
          {
            id: timerId,
            userId: userId.toString(),
            timerId: timerId,
            coinsEarned: autoTapCoinsEarned,
            collected: false,
            createdAt: new Date().toISOString(),
            collectedAt: null,
          },
        ];

        setUncollectedRewards(rewards);

        // Update game state to inactive
        persistState((prev) => ({
          ...prev,
          autoTapActive: false,
          autoTapEndTime: now + duration,
          autoTapProgress: 100,
          autoTapTimeLeft: 0,
        }));
      }, duration);
    } catch (error) {
      console.error("Error starting auto-tap:", error);
      toast.error("Failed to start auto-tap");
    }
  }, [
    userId,
    gameState.autoTapActive,
    autoTapPower,
    autoTapSpeed,
    autoTapCoinsEarned,
    calculateTotalCoinsWithTurbo,
    startTimer,
    persistState,
  ]);

  const stopAutoTap = useCallback(async () => {
    if (!userId || !gameState.autoTapActive) return;

    // Create and use a stable ID to avoid multiple calls
    const stableTimerId = `autotap-stable-${userId}`;

    // Get the current state of the auto-tap timer
    const autoTapTimer = timerService.getTimerInfo(TimerType.AUTO_TAP);

    if (autoTapTimer) {
      // Set a flag to prevent concurrent calls
      const customWindow = window as CustomWindow;

      if (customWindow.__stopAutoTapInProgress) {
        console.log(
          "Stop auto tap already in progress, skipping duplicate call"
        );
        return;
      }

      // Set the flag
      customWindow.__stopAutoTapInProgress = true;

      try {
        // Complete the timer
        await completeTimer(TimerType.AUTO_TAP);

        // Calculate final reward based on what was earned
        const finalReward =
          autoTapCoinsEarned || autoTapPower * AUTO_TAP_DURATION;

        // Update game state
        persistState((prev) => ({
          ...prev,
          autoTapActive: false,
          autoTapEndTime: Date.now(),
          autoTapCoins: finalReward,
          autoTapClaimed: false,
          // Ensure we have clean state for the next session
          autoTapProgress: 100,
          autoTapTimeLeft: 0,
          autoTapSpark: finalReward,
        }));

        // Create an uncollected reward
        const reward: AutoTapReward = {
          id: stableTimerId,
          userId: userId.toString(),
          timerId: stableTimerId,
          coinsEarned: finalReward,
          collected: false,
          createdAt: new Date().toISOString(),
          collectedAt: null,
        };

        setUncollectedRewards([reward]);
      } finally {
        // Clear the flag after a short delay to prevent race conditions
        setTimeout(() => {
          customWindow.__stopAutoTapInProgress = false;
        }, 500);
      }
    }
  }, [
    userId,
    gameState.autoTapActive,
    autoTapPower,
    autoTapCoinsEarned,
    persistState,
    completeTimer,
  ]);

  const collectReward = useCallback(
    async (timerId: string, sparkAmount: number) => {
      if (!userId) return;

      try {
        // Update both coins and autotap state in a single update
        // Use immediate state update to ensure UI reflects changes immediately
        const newCoins = gameState.coins + sparkAmount;

        persistState((prev) => ({
          ...prev,
          coins: newCoins,
          autoTapClaimed: true,
          autoTapCoins: 0,
        }));

        // Dispatch a custom event to notify components about the coin update
        window.dispatchEvent(
          new CustomEvent("coinUpdate", {
            detail: {
              newAmount: newCoins,
              source: "autotap",
            },
          })
        );

        // Remove the reward from uncollected rewards
        setUncollectedRewards((prev) =>
          prev.filter((r) => r.timerId !== timerId)
        );

        // Don't show toast here as the component will handle it with gameToast
      } catch (error) {
        console.error("Error collecting auto-tap reward:", error);
        toast.error("Failed to collect auto-tap reward");
      }
    },
    [userId, persistState, gameState.coins]
  );

  const resetAutoTapCoinsEarned = useCallback(() => {
    setAutoTapCoinsEarned(0);
  }, []);

  // Daily rewards functions - completely rewritten to avoid infinite loops

  // This function doesn't update state directly, it just calculates values
  const calculateRewardAvailability = useCallback(() => {
    // If we're still initializing (no dailyRewards object yet), assume no reward is available
    if (!gameState.dailyRewards) {
      return {
        canCollect: false,
        missedDay: false,
        timeUntilNext: 0,
        formattedTime: {
          hours: "00",
          minutes: "00",
          seconds: "00",
          raw: 0,
        },
      };
    }

    const result = checkReward(gameState.dailyRewards.lastCollected);

    let formattedTime = {
      hours: "00",
      minutes: "00",
      seconds: "00",
      raw: 0,
    };

    if (!result.canCollect) {
      const timeUntilNext = result.timeUntilNext;
      const hours = Math.floor(timeUntilNext / (1000 * 60 * 60));
      const minutes = Math.floor(
        (timeUntilNext % (1000 * 60 * 60)) / (1000 * 60)
      );
      const seconds = Math.floor((timeUntilNext % (1000 * 60)) / 1000);

      formattedTime = {
        hours: hours.toString().padStart(2, "0"),
        minutes: minutes.toString().padStart(2, "0"),
        seconds: seconds.toString().padStart(2, "0"),
        raw: timeUntilNext,
      };
    }

    return {
      ...result,
      formattedTime,
    };
  }, [gameState.dailyRewards]);

  // Function that updates state based on calculation
  const checkRewardAvailability = useCallback(() => {
    const result = calculateRewardAvailability();
    setIsRewardAvailable(result.canCollect);
    setTimeUntilNext(result.formattedTime);
    return result;
  }, [calculateRewardAvailability]);

  // Set up timer update interval - completely rewritten
  useEffect(() => {
    // Create a ref to track if component is mounted
    const isMounted = { current: true };

    // Function to update timer display without causing infinite loops
    const updateTimer = () => {
      if (!isMounted.current) return;

      const result = calculateRewardAvailability();

      // Only update state if component is still mounted and values have changed
      if (
        isMounted.current &&
        (result.canCollect !== isRewardAvailable ||
          result.formattedTime.raw !== timeUntilNext.raw)
      ) {
        setIsRewardAvailable(result.canCollect);
        setTimeUntilNext(result.formattedTime);
      }
    };

    // Run immediately
    updateTimer();

    // Set up interval
    const timer = setInterval(updateTimer, 1000);

    // Clean up
    return () => {
      isMounted.current = false;
      clearInterval(timer);
    };
  }, [calculateRewardAvailability, isRewardAvailable, timeUntilNext.raw]);

  // Effects
  useEffect(() => {
    setAutoTapPower(gameState.upgrades?.tapLevel || 1);
  }, [gameState.upgrades?.tapLevel]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let lastUpdateTime = Date.now();

    if (gameState.autoTapActive) {
      const autoTapTimer = timerService.getTimerInfo(TimerType.AUTO_TAP);

      if (autoTapTimer && autoTapTimer.status === "active") {
        intervalId = setInterval(() => {
          const now = Date.now();
          const timeDiff = now - lastUpdateTime;

          if (timeDiff >= 1000) {
            const coinsPerTap = calculateTotalCoinsWithTurbo(
              autoTapPower,
              false
            );
            // Only accumulate coins, don't increase them directly
            setAutoTapCoinsEarned((prev) => prev + coinsPerTap);
            // Update the game state to show progress
            persistState((prev) => ({
              ...prev,
              autoTapCoins: (prev.autoTapCoins || 0) + coinsPerTap,
              autoTapSpark: (prev.autoTapSpark || 0) + coinsPerTap,
            }));
            lastUpdateTime = now;
          }
        }, 100);
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [
    gameState.autoTapActive,
    autoTapPower,
    persistState,
    calculateTotalCoinsWithTurbo,
  ]);

  useEffect(() => {
    const autoTapTimer = timerService.getTimerInfo(TimerType.AUTO_TAP);
    if (!autoTapTimer || autoTapTimer.status !== "active") {
      if (gameState.autoTapActive) {
        stopAutoTap();
      }
    }
  }, [timersState, stopAutoTap, gameState.autoTapActive]);

  useEffect(() => {
    setSpinMultiplier(gameState.upgrades.spinLevel || 1);
  }, [gameState.upgrades.spinLevel]);

  useEffect(() => {
    if (!canSpin()) {
      stopAutoSpin();
    }
  }, [canSpin, stopAutoSpin]);

  useEffect(() => {
    if (!userId) return;

    // Check if auto tap uses should be reset at midnight UTC
    const checkAutoTapReset = async () => {
      const autoTapState = await timerService.getAutoTapState(
        userId.toString()
      );
      if (autoTapState) {
        setDailyUsesRemaining(autoTapState.dailyUsesRemaining);
      }
    };

    // Run immediately and then set up interval
    checkAutoTapReset();

    // Set up interval to check every minute
    const intervalId = setInterval(checkAutoTapReset, 60000);

    return () => clearInterval(intervalId);
  }, [userId]);

  const shouldShowSpin = gameState.spins >= 50;

  const autoTapFeatures: AutoTapFeatures = {
    autoTapSpeed,
    autoTapPower,
    autoTapCoinsEarned,
    dailyUsesRemaining,
    uncollectedRewards,
    startAutoTap,
    stopAutoTap,
    collectReward,
    resetAutoTapCoinsEarned,
  };

  const value = {
    spin: {
      isSpinning,
      isAutoSpinning,
      spinCount,
      spinResults,
      startSpin,
      stopSpin,
      startAutoSpin,
      stopAutoSpin,
      canSpin: canSpin(),
      spinMultiplier,
      lastSpinTime,
      spinHistory,
      clearSpinHistory,
      shouldShowSpin,
    },
    autoTap: autoTapFeatures,
    dailyRewards: {
      isRewardAvailable,
      timeUntilNext,
      checkRewardAvailability,
    },
    timers: {
      timers: timersState,
      isLoading: isTimerLoading,
      startTimer,
      completeTimer,
      getTimerInfo,
      formatTime,
    },
  };

  return (
    <GameFeaturesContext.Provider value={value}>
      {children}
    </GameFeaturesContext.Provider>
  );
};

export const useGameFeatures = () => {
  const context = useContext(GameFeaturesContext);

  // Check if we're on a Nexus route and handle gracefully
  if (context === undefined) {
    if (
      typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/nexus") ||
        window.location.pathname === "/nexuslogin")
    ) {
      console.warn(
        "useGameFeatures called on Nexus route without GameFeaturesProvider, returning null context"
      );
      // Return a safe default context for Nexus routes
      return {
        spin: {
          isSpinning: false,
          isAutoSpinning: false,
          spinCount: 0,
          spinResults: [],
          startSpin: async () => {},
          stopSpin: () => {},
          startAutoSpin: async () => {},
          stopAutoSpin: () => {},
          canSpin: false,
          spinMultiplier: 1,
          lastSpinTime: null,
          spinHistory: [],
          clearSpinHistory: () => {},
          shouldShowSpin: false,
        },
        dailyRewards: {
          isRewardAvailable: false,
          timeUntilNext: 0,
          checkRewardAvailability: () => false,
          collectReward: async () => ({
            success: false,
            error: "Not available in nexus",
          }),
          getRewardInfo: () => ({ coins: 0, spins: 0, day: 0 }),
        },
        autoTap: {
          autoTapSpeed: 0,
          autoTapPower: 0,
          autoTapCoinsEarned: 0,
          dailyUsesRemaining: 0,
          uncollectedRewards: [],
          startAutoTap: async () => {},
          stopAutoTap: async () => {},
          collectReward: async () => {},
          resetAutoTapCoinsEarned: () => {},
        },
        timers: {
          timers: {},
          startTimer: () => {},
          stopTimer: () => {},
          getTimeRemaining: () => 0,
        },
        boosters: {
          activateTurbo: () => {},
          activateRecharge: () => {},
          getBoosterState: () => ({ active: false, timeLeft: 0 }),
        },
        socialTasks: {
          completeTask: () => {},
          getTaskStatus: () => ({ completed: false, reward: 0 }),
        },
        referrals: {
          generateLink: () => "",
          getReferralStats: () => ({ count: 0, rewards: 0 }),
        },
      };
    }
    throw new Error(
      "useGameFeatures must be used within a GameFeaturesProvider"
    );
  }
  return context;
};
