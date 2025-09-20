"use client";

import {
  TimerType,
  TimerData,
  TimerState as GameTimerState,
} from "../types/gameTypes";
import { STORAGE_KEYS, TIMER_CONFIG } from "../constants/gameConstants";
import { supabase } from "../lib/supabase";
import { GameState } from "../types/gameTypes";
import { calculateRetroactiveSpins } from "../utility/spinUtils";

// Local interfaces
interface Timer extends TimerData {
  timerId: string;
  userId: string;
  timeoutId?: NodeJS.Timeout;
}

// Add new interfaces for auto-tap
export interface AutoTapReward {
  id: string;
  userId: string;
  timerId: string;
  coinsEarned: number;
  collected: boolean;
  createdAt: string;
  collectedAt: string | null;
}

export interface AutoTapState {
  dailyUsesRemaining: number;
  lastDailyReset: string;
  coinsEarned: number;
}

// In-memory cache for active timers
let timerCache: GameTimerState = {};
let lastSync = 0;
const SYNC_INTERVAL = 1000; // Sync every second

// Helper function to get current timestamp
const getCurrentTimestamp = () => Date.now();

// Batch timer updates to reduce localStorage operations
const batchedUpdates = new Set<TimerType>();
let updateTimeout: NodeJS.Timeout | null = null;

// Save timers to localStorage with batching
const saveTimersToLocalStorage = () => {
  if (typeof window === "undefined" || batchedUpdates.size === 0) return;

  // Check if STORAGE_KEYS is defined
  if (!STORAGE_KEYS || !STORAGE_KEYS.TIMERS) {
    console.error("STORAGE_KEYS.TIMERS is not defined");
    return;
  }

  try {
    const storedTimers = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.TIMERS) || "{}"
    );
    const updates: GameTimerState = { ...storedTimers };

    batchedUpdates.forEach((timerType) => {
      if (timerCache[timerType]) {
        updates[timerType] = timerCache[timerType];
      } else {
        delete updates[timerType];
      }
    });

    localStorage.setItem(STORAGE_KEYS.TIMERS, JSON.stringify(updates));
    batchedUpdates.clear();
  } catch (error) {
    console.error("Error saving timers:", error);
  }
};

// Queue timer update for batching
const queueTimerUpdate = (timerType: TimerType) => {
  batchedUpdates.add(timerType);

  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }

  updateTimeout = setTimeout(saveTimersToLocalStorage, 100);
};

// Load timers from localStorage with caching
const loadTimersFromLocalStorage = (): GameTimerState => {
  if (typeof window === "undefined") return {};

  const now = getCurrentTimestamp();
  if (now - lastSync < SYNC_INTERVAL && Object.keys(timerCache).length > 0) {
    return timerCache;
  }

  try {
    // Check if STORAGE_KEYS is defined before accessing it
    if (!STORAGE_KEYS || !STORAGE_KEYS.TIMERS) {
      console.error("STORAGE_KEYS.TIMERS is not defined");
      return timerCache;
    }

    const storedTimers = localStorage.getItem(STORAGE_KEYS.TIMERS);
    if (storedTimers) {
      timerCache = JSON.parse(storedTimers);
      lastSync = now;
    }
  } catch (error) {
    console.error("Error loading timers:", error);
  }

  return timerCache;
};

// Initialize timer service
export const initializeTimerService = () => {
  if (typeof window === "undefined") return;

  timerCache = loadTimersFromLocalStorage();

  // Set up active timers
  Object.entries(timerCache).forEach(([type, timer]) => {
    if (!timer.endTime) return;

    const timeLeft = Math.max(0, timer.endTime - getCurrentTimestamp());
    if (timeLeft > 0) {
      scheduleTimerCompletion(type as TimerType, timeLeft);
    } else {
      completeTimer(type as TimerType);
    }
  });
};

// Schedule timer completion
const scheduleTimerCompletion = (timerType: TimerType, delay: number) => {
  setTimeout(() => {
    completeTimer(timerType);
  }, delay);
};

// Start a new timer
export const startTimer = (
  timerType: TimerType,
  duration: number,
  metadata?: TimerData["metadata"]
): TimerData => {
  const config = TIMER_CONFIG[timerType];
  if (!config) throw new Error(`Invalid timer type: ${timerType}`);

  // Check if there's already an active timer of this type
  const existingTimer = timerCache[timerType];
  if (
    existingTimer &&
    existingTimer.status === "active" &&
    existingTimer.endTime &&
    existingTimer.endTime > getCurrentTimestamp()
  ) {
    // Return the existing timer without creating a new one
    return existingTimer;
  }

  const now = getCurrentTimestamp();
  const timer: TimerData = {
    endTime: now + Math.min(duration, config.maxDuration),
    duration: Math.min(duration, config.maxDuration),
    status: "active",
    metadata,
    remainingSec: Math.floor(Math.min(duration, config.maxDuration) / 1000),
  };

  timerCache[timerType] = timer;
  queueTimerUpdate(timerType);
  scheduleTimerCompletion(timerType, timer.duration!);

  return timer;
};

// Complete a timer
export const completeTimer = (timerType: TimerType): void => {
  const timer = timerCache[timerType];
  if (!timer) return;

  // Only mark as completed if it's currently active
  if (timer.status === "active") {
    timer.status = "completed";
    timer.endTime = getCurrentTimestamp();
    timer.remainingSec = 0;

    queueTimerUpdate(timerType);
  }
};

// Cancel a timer
export const cancelTimer = (timerType: TimerType): void => {
  const timer = timerCache[timerType];
  if (!timer) return;

  timer.status = "cancelled";
  timer.endTime = getCurrentTimestamp();
  timer.remainingSec = 0;

  queueTimerUpdate(timerType);
};

// Get timer info
export const getTimerInfo = (timerType: TimerType): TimerData | null => {
  const timers = loadTimersFromLocalStorage();
  const timer = timers[timerType];

  if (timer && timer.endTime) {
    const now = getCurrentTimestamp();

    // If timer has ended, mark as completed
    if (timer.status === "active" && timer.endTime <= now) {
      timer.status = "completed";
      timer.remainingSec = 0;
      timerCache[timerType] = timer;
      queueTimerUpdate(timerType);
    } else if (timer.status === "active") {
      const remainingMs = Math.max(0, timer.endTime - now);
      const remainingSec = Math.floor(remainingMs / 1000);

      timer.remainingSec = remainingSec;

      // Update the timer in the cache and save to localStorage immediately
      timerCache[timerType] = timer;
      queueTimerUpdate(timerType);

      // Force save to localStorage now
      saveTimersToLocalStorage();
    }
  }

  return timer || null;
};

// Cleanup timer service - improved to be more robust
export const cleanupTimerService = () => {
  if (typeof window === "undefined") return;

  // Process any pending updates
  if (batchedUpdates.size > 0) {
    saveTimersToLocalStorage();
  }

  // Clear any pending timeouts
  if (updateTimeout) {
    clearTimeout(updateTimeout);
    updateTimeout = null;
  }
};

// Register a callback for timer completion
export const onTimerComplete = (
  _timerId: string,
  _callback: () => void
): void => {
  // Implementation needed
};

// Update auto tap coins
export const updateAutoTapCoins = async (
  _userId: string,
  _timerId: string,
  _coinsEarned: number
): Promise<boolean> => {
  // Implementation needed
  return false;
};

// Start auto tap
export const startAutoTap = async (
  _userId: string,
  _timerId: string,
  _durationMs: number
): Promise<Timer | null> => {
  // Implementation needed
  return null;
};

// Complete auto tap
export const completeAutoTap = async (
  _userId: string,
  _timerId: string
): Promise<boolean> => {
  // Implementation needed
  return false;
};

// Get uncollected rewards
export const getUncollectedRewards = async (
  _userId: string
): Promise<AutoTapReward[]> => {
  // Implementation needed
  return [];
};

// Collect auto tap reward
export const collectAutoTapReward = async (
  _userId: string,
  _timerId: string,
  _rewardAmount: number
): Promise<number> => {
  // Implementation needed
  return 0;
};

// Check if it's a new day in UTC time
const isNewUTCDay = (lastResetTime: string): boolean => {
  const now = new Date();
  const lastReset = new Date(lastResetTime);

  return (
    now.getUTCDate() !== lastReset.getUTCDate() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCFullYear() !== lastReset.getUTCFullYear()
  );
};

// Reset daily auto tap uses in both local storage and database
export const resetDailyAutoTapUses = async (
  userId: string
): Promise<boolean> => {
  if (!userId) return false;

  if (!supabase) {
    console.error("Supabase client not available");
    return false;
  }

  try {
    // First, get the current game state
    const { data: userData, error: fetchError } = await supabase
      .from("telegram_users")
      .select("game_state")
      .eq("user_id", userId)
      .single();

    if (fetchError) throw fetchError;

    const gameState = userData?.game_state as GameState;

    if (!gameState) return false;

    // Update the auto tap daily usage
    const updatedGameState = {
      ...gameState,
      autoTapDaily: {
        lastReset: new Date().toISOString(),
        usesRemaining: 3, // Reset to max uses
      },
    };

    // Update the database
    const { error: updateError } = await supabase
      .from("telegram_users")
      .update({
        game_state: updatedGameState,
      })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    // Update local storage if needed
    if (typeof window !== "undefined") {
      const storageKey = localStorage.getItem("phoenix_state");
      if (storageKey) {
        const localState = JSON.parse(storageKey);
        localStorage.setItem(
          "phoenix_state",
          JSON.stringify({
            ...localState,
            autoTapDaily: {
              lastReset: new Date().toISOString(),
              usesRemaining: 3,
            },
          })
        );
      }
    }

    return true;
  } catch (error) {
    console.error("Error resetting daily auto tap uses:", error);
    return false;
  }
};

// Get auto tap state
export const getAutoTapState = async (
  userId: string
): Promise<AutoTapState | null> => {
  if (!userId) return null;

  if (!supabase) {
    console.error("Supabase client not available");
    return null;
  }

  try {
    // Get game state from database
    const { data: userData, error } = await supabase
      .from("telegram_users")
      .select("game_state")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    const gameState = userData?.game_state as GameState;

    if (!gameState?.autoTapDaily) {
      // If no auto tap state exists, create a default one
      return {
        dailyUsesRemaining: 3,
        lastDailyReset: new Date().toISOString(),
        coinsEarned: 0,
      };
    }

    // Check if we need to reset for a new day
    if (isNewUTCDay(gameState.autoTapDaily.lastReset)) {
      // Reset uses if it's a new day
      await resetDailyAutoTapUses(userId);
      return {
        dailyUsesRemaining: 3,
        lastDailyReset: new Date().toISOString(),
        coinsEarned: gameState.autoTapCoins || 0,
      };
    }

    // Return current state
    return {
      dailyUsesRemaining: gameState.autoTapDaily.usesRemaining,
      lastDailyReset: gameState.autoTapDaily.lastReset,
      coinsEarned: gameState.autoTapCoins || 0,
    };
  } catch (error) {
    console.error("Error getting auto tap state:", error);
    return null;
  }
};

// Update auto tap uses remaining
export const updateAutoTapUses = async (
  userId: string,
  usesRemaining: number
): Promise<boolean> => {
  if (!userId) return false;

  try {
    // Get current game state
    const { data: userData, error: fetchError } = await supabase!
      .from("telegram_users")
      .select("game_state")
      .eq("user_id", userId)
      .single();

    if (fetchError) throw fetchError;

    const gameState = userData?.game_state as GameState;

    if (!gameState) return false;

    // Update the auto tap daily usage
    const updatedGameState = {
      ...gameState,
      autoTapDaily: {
        ...gameState.autoTapDaily,
        usesRemaining: Math.max(0, usesRemaining),
      },
    };

    // Update the database
    const { error: updateError } = await supabase!
      .from("telegram_users")
      .update({
        game_state: updatedGameState,
      })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error("Error updating auto tap uses:", error);
    return false;
  }
};

// Load active timers from database
export const loadTimersFromDatabase = async (
  _userId: string
): Promise<{ [timerId: string]: Timer }> => {
  // Implementation needed
  return {};
};

// Get the remaining time for a timer in seconds
export const getTimerRemaining = (_timerId: string): number => {
  // Implementation needed
  return 0;
};

// Get all active timers
export const getAllActiveTimers = (): GameTimerState => {
  const timers = loadTimersFromLocalStorage();
  const now = getCurrentTimestamp();

  // Update remaining seconds for all timers
  Object.entries(timers).forEach(([_, timer]) => {
    if (timer.endTime) {
      const remainingMs = Math.max(0, timer.endTime - now);
      timer.remainingSec = Math.floor(remainingMs / 1000);
    }
  });

  return timers;
};

// Format seconds into hours:minutes:seconds
export const formatTime = (_seconds: number): string => {
  const hours = Math.floor(_seconds / 3600);
  const minutes = Math.floor((_seconds % 3600) / 60);
  const secs = _seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`;
};

// Calculate and apply retroactive spins based on user inactivity
export const calculateAndApplyRetroactiveSpins = async (
  userId: string,
  gameState: GameState
): Promise<{ spinsAdded: number; explanation: string } | null> => {
  if (!userId || !gameState.lastActiveTime) {
    return null;
  }

  if (!supabase) {
    console.error("Supabase client not available");
    return null;
  }

  // Calculate retroactive spins
  const result = calculateRetroactiveSpins(
    gameState.lastActiveTime,
    gameState.spins,
    50 // Max spins
  );

  // If no spins to add, return early
  if (result.spinsToAdd === 0) {
    return {
      spinsAdded: 0,
      explanation: result.explanation,
    };
  }

  try {
    // Update the game state in database with new spins and updated lastActiveTime
    const updatedGameState = {
      ...gameState,
      spins: Math.min(50, gameState.spins + result.spinsToAdd),
      lastActiveTime: Date.now(), // Update last active time
    };

    const { error } = await supabase!
      .from("telegram_users")
      .update({
        game_state: updatedGameState,
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating retroactive spins:", error);
      return null;
    }

    console.log(`Retroactive spins applied: ${result.explanation}`);

    return {
      spinsAdded: result.spinsToAdd,
      explanation: result.explanation,
    };
  } catch (error) {
    console.error("Error applying retroactive spins:", error);
    return null;
  }
};

// Scheduled task to reset auto tap uses at midnight UTC
let autoTapResetInterval: NodeJS.Timeout | null = null;

const scheduleNextAutoTapReset = () => {
  // Get current time
  const now = new Date();

  // Calculate time until next midnight UTC
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  const timeUntilMidnight = tomorrow.getTime() - now.getTime();

  // Schedule the reset
  if (autoTapResetInterval) {
    clearTimeout(autoTapResetInterval);
  }

  autoTapResetInterval = setTimeout(async () => {
    console.log("Auto tap daily reset triggered at:", new Date().toISOString());

    try {
      // Reset all users in the database (for real implementation)
      // This would require a server-side cron job in production
      // Here we're simulating it client-side for development

      // Reschedule for next day
      scheduleNextAutoTapReset();
    } catch (error) {
      console.error("Error in scheduled auto tap reset:", error);
      // Still reschedule even if there was an error
      scheduleNextAutoTapReset();
    }
  }, timeUntilMidnight);

  // console.log(`Next auto tap reset scheduled for ${tomorrow.toISOString()} (in ${Math.floor(timeUntilMidnight / 60000)} minutes)`);
};

// Include reset initialization in the timer service initialization
const initializeTimerServiceWithReset = () => {
  initializeTimerService();
  scheduleNextAutoTapReset();
};

// Update the timerService object to use the new initialization
const timerService = {
  initializeTimerService: initializeTimerServiceWithReset,
  cleanupTimerService,
  startTimer,
  completeTimer,
  cancelTimer,
  getTimerInfo,
  onTimerComplete,
  startAutoTap,
  completeAutoTap,
  updateAutoTapCoins,
  getUncollectedRewards,
  collectAutoTapReward,
  resetDailyAutoTapUses,
  getAutoTapState,
  loadTimersFromDatabase,
  getTimerRemaining,
  formatTime,
  getAllActiveTimers,
  updateAutoTapUses,
  isNewUTCDay,
  calculateAndApplyRetroactiveSpins,
};

export default timerService;
