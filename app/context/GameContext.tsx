"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { levelConfig } from "../utility/stageConfig";
import { toast } from "react-hot-toast";
import { updateTelegramUserProgress } from "../lib/telegram";
import { useUser } from "../hooks/useUser";
import { supabase } from "../lib/supabase";
import { TimerType } from "../types/gameTypes";
import timerService from "../services/timerService";
import debounce from "lodash/debounce";
import { gameToast } from "../utility/customToast";
import { getEnergyConfig } from "../utility/energyConfig";
import { useLevelUp } from "./LevelUpContext";
import { rechargeSpeedConfig } from "../utility/rechargeSpeedConfig";
import {
  initializeCharacterProgression,
  getProgressionType,
  getGlobalRotationInfo,
  getCurrentlyActiveType,
} from "./ProgressionContext";
import { tapPowerConfig } from "../utility/tapPowerConfig";
import { resetUserProgressionData } from "../lib/userInitializer";
import { updateLastActiveTime } from "../utility/spinUtils";

// Import types from game types
import type {
  Boosts,
  GameState,
  GameContextType,
  OldGameState,
} from "../types/gameTypes";

// Import constants
import {
  MAX_BOOSTER_USES,
  AUTO_TAP_DURATION,
  BOOSTER_REFILL_INTERVAL,
  CURRENT_GAME_VERSION,
  STORAGE_KEYS,
  initialGameState,
  AUTO_TAP_UNLOCK_COST,
  energyCapacityConfig,
} from "../constants/gameConstants";

// Import utility functions
import {
  isNewGameState,
  updateAutoTapState,
  calculateAutoTapReward,
} from "../utility/gameUtils";

// Context creation
const GameContext = createContext<GameContextType | undefined>(undefined);
// Below is an essential helper function that is used only for user 6042897820 (production user) and 123456789(localhost testing). This is needed for when developer
// wants to cleanup the storage cache for specifically these 2 users.
// Helper function to detect users that should be re-initialized when DB entry is missing
const shouldReinitializeOnMissing = (userId: string): boolean => {
  const reinitUserIds = [
    "6042897820", // Real Telegram user
    "123456789", // Dummy user (for localhost testing)
  ];

  return reinitUserIds.includes(userId);
};

// Helper function to detect dummy user
const isDummyUser = (userId: string): boolean => {
  return userId === "123456789";
};

// Provider component
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [isSpinning, setIsSpinning] = useState(false);
  const { id: user_id } = useUser();

  // Debug logging for user_id
  useEffect(() => {
    console.log("GameContext: user_id changed:", user_id);
  }, [user_id]);
  const lastSaveRef = useRef<number>(Date.now());
  const isAutoSpinningRef = useRef(false);
  const turboTimeRef = useRef(gameState.boosts.turboTimeLeft);
  const turboEndTimeRef = useRef(gameState.boosts.turboEndTime);
  const turboActiveRef = useRef(gameState.boosts.turboActive);
  const { showLevelUpAnimation } = useLevelUp();

  // Request queue for database updates to prevent multiple simultaneous requests
  const updateQueueRef = useRef<{
    inProgress: boolean;
    pendingUpdate: Partial<GameState> | null;
    lastUpdateTime: number;
  }>({
    inProgress: false,
    pendingUpdate: null,
    lastUpdateTime: Date.now(),
  });

  // Function to update user activity timestamp
  const updateUserActivity = useCallback(() => {
    setGameState((prev) => updateLastActiveTime(prev));
  }, []);

  // Define criticalStateUpdate first before it's used
  const criticalStateUpdate = useCallback(
    async (updates: Partial<GameState> | ((prev: GameState) => GameState)) => {
      try {
        if (!user_id) {
          return;
        }

        if (!supabase) {
          console.error("Supabase client not available");
          return;
        }

        // Get the current state for comparison
        const { error: fetchError } = await supabase
          .from("telegram_users")
          .select("game_state")
          .eq("user_id", user_id.toString())
          .single();

        if (fetchError) {
          // fetchError is intentionally ignored
        }

        let updatedState: Partial<GameState>;
        if (typeof updates === "function") {
          updatedState = updates(gameState);
        } else {
          updatedState = updates;
        }

        const finalState = {
          ...gameState,
          ...updatedState,
          gameVersion: CURRENT_GAME_VERSION,
          lastUpdate: Date.now(),
        };

        // Special logging for spin updates
        if ("spins" in updatedState && gameState.spins !== updatedState.spins) {
          // Only log if this update is due to a type completion reward (step completion)
          if (
            typeof (updatedState as Record<string, unknown>)
              ._typeCompletionReward !== "undefined"
          ) {
            // _typeCompletionReward is intentionally ignored
          }
        }

        // If there's already an update in progress, store this update as pending
        if (updateQueueRef.current.inProgress) {
          updateQueueRef.current.pendingUpdate = updateQueueRef.current
            .pendingUpdate
            ? { ...updateQueueRef.current.pendingUpdate, ...finalState }
            : finalState;

          setGameState((prev) => ({
            ...prev,
            ...updatedState,
            gameVersion: CURRENT_GAME_VERSION,
            lastUpdate: Date.now(),
          }));
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(finalState));
          return;
        }

        // Check if we need to rate limit the requests
        const now = Date.now();
        const timeSinceLastUpdate = now - updateQueueRef.current.lastUpdateTime;
        const MIN_TIME_BETWEEN_UPDATES = 1000; // 1 second minimum between updates

        // Skip rate limiting for spinLevel updates and spin updates as they need to be responsive
        const isSpinLevelUpdate =
          "spinLevel" in updatedState && Object.keys(updatedState).length === 1;
        const isSpinUpdate = "spins" in updatedState;

        if (
          timeSinceLastUpdate < MIN_TIME_BETWEEN_UPDATES &&
          !isSpinLevelUpdate &&
          !isSpinUpdate
        ) {
          // Get current coins value for proper merging
          const currentCoins = gameState.coins;

          // Properly handle coin merging for pending updates
          if (updateQueueRef.current.pendingUpdate && "coins" in updatedState) {
            // If we already have a pending update with coins, ensure we don't lose the difference
            if ("coins" in updateQueueRef.current.pendingUpdate) {
              const pendingCoins = updateQueueRef.current.pendingUpdate
                .coins as number;
              const updatedCoins = updatedState.coins as number;

              // Calculate the difference this update is making
              const coinDifference = updatedCoins - currentCoins;

              // Apply that difference to the pending update
              updateQueueRef.current.pendingUpdate = {
                ...updateQueueRef.current.pendingUpdate,
                ...updatedState,
                coins: pendingCoins + coinDifference,
              };
            } else {
              // No coins in pending update, just merge normally
              updateQueueRef.current.pendingUpdate = {
                ...updateQueueRef.current.pendingUpdate,
                ...updatedState,
              };
            }
          } else {
            // No coins in this update or no pending update yet, just merge normally
            updateQueueRef.current.pendingUpdate = updateQueueRef.current
              .pendingUpdate
              ? { ...updateQueueRef.current.pendingUpdate, ...updatedState }
              : { ...updatedState };
          }

          // Update local state immediately
          setGameState((prev) => ({
            ...prev,
            ...updatedState,
            gameVersion: CURRENT_GAME_VERSION,
            lastUpdate: Date.now(),
          }));
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(finalState));
          return;
        }

        // Mark that we're processing an update
        updateQueueRef.current.inProgress = true;
        updateQueueRef.current.lastUpdateTime = now;

        // Add retry logic for database updates
        let retries = 0;
        const maxRetries = 3;
        let success = false;

        while (retries < maxRetries && !success) {
          try {
            const { error } = await supabase
              .from("telegram_users")
              .update({
                game_state: finalState,
              })
              .eq("user_id", user_id);

            if (error) {
              retries++;

              if (retries >= maxRetries) {
                throw error;
              }

              // Wait before retrying (exponential backoff)
              await new Promise((resolve) =>
                setTimeout(resolve, 500 * Math.pow(2, retries))
              );
            } else {
              success = true;
            }
          } catch (err) {
            retries++;

            if (retries >= maxRetries) {
              throw err;
            }

            // Wait before retrying
            await new Promise((resolve) =>
              setTimeout(resolve, 500 * Math.pow(2, retries))
            );
          }
        }

        // If Supabase update successful, update local state
        setGameState((prev) => ({
          ...prev,
          ...updatedState,
          gameVersion: CURRENT_GAME_VERSION,
          lastUpdate: Date.now(),
        }));
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(finalState));

        // Update complete - check if we have pending updates
        updateQueueRef.current.inProgress = false;

        if (updateQueueRef.current.pendingUpdate) {
          const pendingUpdate = updateQueueRef.current.pendingUpdate;
          updateQueueRef.current.pendingUpdate = null;

          // Wait a moment before processing the next update
          setTimeout(() => {
            criticalStateUpdate(pendingUpdate as Partial<GameState>);
          }, MIN_TIME_BETWEEN_UPDATES);
        }
      } catch (error: unknown) {
        toast.error("Failed to update game state");

        // Mark as not in progress even if there was an error
        updateQueueRef.current.inProgress = false;
        throw error;
      }
    },
    [gameState, user_id]
  );

  // Move timers into useMemo
  const timers = useMemo(() => {
    const activeTimers = timerService.getAllActiveTimers();
    return {
      spin: activeTimers[TimerType.SPIN],
      autoTap: activeTimers[TimerType.AUTO_TAP],
      turbo: activeTimers[TimerType.TURBO],
    };
  }, []);

  // Move debouncedPersistAutoTapState inside component
  const debouncedPersistAutoTapState = useMemo(
    () =>
      debounce((updates: Partial<GameState>) => {
        if (!gameState.user_id) return;

        if (!supabase) {
          console.error("Supabase client not available");
          return;
        }

        supabase
          .from("telegram_users")
          .update({
            game_state: updates,
          })
          .eq("user_id", gameState.user_id);
      }, 5000),
    [gameState.user_id]
  );

  // Move recalculateAutoTapState inside component
  const recalculateAutoTapState = useCallback(
    (state: GameState): GameState => {
      if (
        !state.autoTapActive ||
        !state.autoTapStartTime ||
        !state.autoTapEndTime
      ) {
        const newState = updateAutoTapState(state, {
          autoTapActive: false,
          autoTapProgress: 0,
          autoTapTimeLeft: 0,
          autoTapSpark: 0,
          autoTapCoins: state.autoTapCoins || 0,
          autoTapClaimed: state.autoTapClaimed || false,
        });

        // Only persist final state
        debouncedPersistAutoTapState.flush();
        debouncedPersistAutoTapState(newState);
        return newState;
      }

      const now = Date.now();
      const endTime = state.autoTapEndTime;
      const startTime = state.autoTapStartTime;
      const totalDuration = AUTO_TAP_DURATION * 1000;

      if (now >= endTime) {
        // Use stored initial power level if available, otherwise fallback to current level
        const initialTapPower =
          state.autoTapInitialPower || state.upgrades.tapLevel || 1;
        const finalReward = calculateAutoTapReward(initialTapPower);

        const finalState = updateAutoTapState(state, {
          autoTapActive: false,
          autoTapEndTime: endTime,
          autoTapCoins: state.autoTapClaimed ? 0 : finalReward,
          autoTapClaimed: state.autoTapClaimed || false,
          autoTapProgress: 100,
          autoTapTimeLeft: 0,
          autoTapSpark: finalReward,
        });

        // Persist final state immediately
        debouncedPersistAutoTapState.flush();
        debouncedPersistAutoTapState(finalState);
        return finalState;
      }

      const remaining = Math.max(0, endTime - now);
      const elapsed = Math.min(totalDuration, now - startTime);
      const progressPercent = Math.min(100, (elapsed / totalDuration) * 100);
      const elapsedSeconds = Math.floor(elapsed / 1000);
      // Use stored initial power level if available, otherwise fallback to current level
      const initialTapPower =
        state.autoTapInitialPower || state.upgrades.tapLevel || 1;
      const currentSparkEarned = Math.min(
        elapsedSeconds * initialTapPower,
        calculateAutoTapReward(initialTapPower)
      );

      const newState = updateAutoTapState(state, {
        autoTapActive: true,
        autoTapProgress: progressPercent,
        autoTapTimeLeft: Math.floor(remaining / 1000),
        autoTapSpark: currentSparkEarned,
        autoTapCoins: state.autoTapClaimed ? 0 : currentSparkEarned,
      });

      // Only persist state if significant time has passed
      if (elapsedSeconds % 30 === 0) {
        debouncedPersistAutoTapState(newState);
      }

      return newState;
    },
    [debouncedPersistAutoTapState]
  );

  // Clean up debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedPersistAutoTapState.cancel();
    };
  }, [debouncedPersistAutoTapState]);

  // Transform function
  const transformOldStateToNew = useCallback(
    (oldState: OldGameState | GameState): GameState => {
      if (!oldState) return initialGameState;

      // Helper function to safely extract values from potentially different boost formats
      const getBoostValue = (
        boosts: OldGameState["boosts"] | undefined,
        key:
          | "turbo.uses"
          | "turbo.active"
          | "recharge.uses"
          | "recharge.active",
        defaultValue: number | boolean
      ): number | boolean => {
        if (!boosts) return defaultValue;

        // If new format (checking for inGameTurbo as a property)
        if (boosts && typeof boosts === "object" && "inGameTurbo" in boosts) {
          const newBoosts = boosts as Boosts;
          if (key === "turbo.uses") return newBoosts.inGameTurbo;
          if (key === "turbo.active") return newBoosts.turboActive;
          if (key === "recharge.uses") return newBoosts.inGameRecharge;
          if (key === "recharge.active") return newBoosts.rechargeActive;
          return defaultValue;
        }

        // If old format with nested objects
        const oldBoosts = boosts as {
          turbo?: { uses?: number; active?: boolean };
          recharge?: { uses?: number; active?: boolean };
        };

        if (key === "turbo.uses") return oldBoosts.turbo?.uses ?? defaultValue;
        if (key === "turbo.active")
          return oldBoosts.turbo?.active ?? defaultValue;
        if (key === "recharge.uses")
          return oldBoosts.recharge?.uses ?? defaultValue;
        if (key === "recharge.active")
          return oldBoosts.recharge?.active ?? defaultValue;

        return defaultValue;
      };

      if (isNewGameState(oldState)) {
        // Make sure application_state is preserved and recharge values are properly set
        const rechargeLevel = Math.min(
          3,
          oldState.upgrades?.rechargeLevel || 1
        );
        const energyLevel = Math.min(40, oldState.upgrades?.energyLevel || 1);
        const energyConfig = getEnergyConfig(energyLevel);
        return {
          ...oldState,
          currentRecharge:
            oldState.currentRecharge || energyConfig.initialValue,
          gameVersion: CURRENT_GAME_VERSION,
          lastUpdate: Date.now(),
          upgrades: {
            ...oldState.upgrades,
            rechargeLevel: rechargeLevel,
          },
          dailyRewards: oldState.dailyRewards || {
            lastCollected: new Date(0).toISOString(),
            currentStreak: 0,
            maxStreak: 0,
            lastDay: 0,
            collectedDays: {},
          },
          application_state: {
            isAutotapPurchased:
              oldState.application_state?.isAutotapPurchased ??
              initialGameState.application_state?.isAutotapPurchased ??
              false,
            has_visited_earn_page:
              oldState.application_state?.has_visited_earn_page ??
              initialGameState.application_state?.has_visited_earn_page ??
              false,
            isAutotapActive:
              oldState.application_state?.isAutotapActive ??
              initialGameState.application_state?.isAutotapActive ??
              false,
            ...(initialGameState.application_state || {}),
            ...(oldState.application_state || {}),
          },
        };
      }

      // For old state format, ensure proper recharge initialization
      const rechargeLevel = Math.min(3, oldState.energy?.rechargeLevel || 1);
      const energyLevel = Math.min(40, oldState.upgrades?.energyLevel || 1);
      const energyConfig = getEnergyConfig(energyLevel);

      return {
        user_id: oldState.user_id || "0",
        coins: oldState.coins || 0,
        spins: oldState.spins || 50,
        totalSpins: oldState.totalSpins || 0,
        totalCoins: oldState.totalCoins || 0,
        tapPower: oldState.upgrades?.tap || 1,
        level: oldState.level || 1,
        stage: oldState.stage || 1,
        FlameCapacityTap: oldState.energy?.current || 5000,
        minPhoenixEnergy: 0,
        RechargeLevel: rechargeLevel,
        currentRecharge: energyConfig.initialValue,
        gameVersion: CURRENT_GAME_VERSION,
        lastUpdate: Date.now(),

        phoenixEnergyProgress: 0,
        spinLevel: oldState.upgrades?.spin || 1,
        boosts: {
          inGameTurbo: Number(getBoostValue(oldState.boosts, "turbo.uses", 0)),
          rewardedTurbo: 0,
          inGameRecharge: Number(
            getBoostValue(oldState.boosts, "recharge.uses", 0)
          ),
          rewardedRecharge: 0,
          turboActive: Boolean(
            getBoostValue(oldState.boosts, "turbo.active", false)
          ),
          rechargeActive: Boolean(
            getBoostValue(oldState.boosts, "recharge.active", false)
          ),
          turboEndTime: undefined,
          rechargeEndTime: undefined,
          autoTapUses: 0,
          turboTimeLeft: 0,
          rechargeTimeLeft: 0,
          turboRefillTime: 0,
          rechargeRefillTime: 0,
          maxTurboUses: 0,
          maxRechargeUses: 0,
        },
        upgrades: {
          tapLevel: oldState.upgrades?.tap || 1,
          energyLevel: oldState.upgrades?.energy || 1,
          rechargeLevel: rechargeLevel,
          spinLevel: oldState.upgrades?.spin || 1,
        },
        progress: {
          daily: oldState.progress?.daily || {
            streak: 0,
            lastDay: 0,
          },
          social: oldState.progress?.social || {
            x: [],
            youtube: [],
            telegram: [],
          },
        },
        timers: {
          turboTimeLeft: 0,
          rechargeTimeLeft: 0,
          turboRefillTime: 0,
          rechargeRefillTime: 0,
        },
        energyCapacity: oldState.energy?.capacity || 2500,
        isSpinning: false,
        characterProgress: {
          currentCharacter: "3",
          currentTokens: 0,
          requiredTokens: 10,
        },
        dailyRewards: {
          lastCollected: new Date(0).toISOString(),
          currentStreak: 0,
          maxStreak: 0,
          lastDay: 0,
          collectedDays: {},
        },
        socialTasks: {
          TELEGRAM_CHANNEL: { completedTasks: [] },
          X: { completedTasks: [] },
          YOUTUBE_VIEWS: { completedTasks: [] },
        },
        spinGoals: [],
        spinTimer: 0,
        spinLimit: 5,
        application_state: {
          isAutotapPurchased:
            oldState.application_state?.isAutotapPurchased ??
            initialGameState.application_state?.isAutotapPurchased ??
            false,
          has_visited_earn_page:
            oldState.application_state?.has_visited_earn_page ??
            initialGameState.application_state?.has_visited_earn_page ??
            false,
          isAutotapActive:
            oldState.application_state?.isAutotapActive ??
            initialGameState.application_state?.isAutotapActive ??
            false,
          ...(initialGameState.application_state || {}),
          ...(oldState.application_state || {}),
        },
        autoTapDaily: {
          lastReset: new Date(0).toISOString(),
          usesRemaining: 3,
        },
        autoTapCoins: 0,
        autoTapTotalCoins: 0,
        autoTapClaimed: false,
        autoTapEndTime: 0,
        autoTapStartTime: 0,
        autoTapActive: false,
        autoTapTimeLeft: 0,
        autoTapSpark: 0,
        autoTapProgress: 0,
        lastAutoTapUpdate: 0,
        pendingLevelUp: false,
        phoenixEnergyFrozen: false,
        referral: {
          inviteLink: "",
          referredFriends: 0,
          totalRewards: 0,
        },
        _needsSync: oldState._needsSync,
      };
    },
    []
  );

  // Transform GameState to TelegramGameState
  const transformStateForTelegram = useCallback(
    (state: GameState) => {
      return {
        ...state,
        dailyRewards: {
          ...(state.dailyRewards || {
            lastCollected: new Date(0).toISOString(),
            currentStreak: 0,
            maxStreak: 0,
            lastDay: 0,
            collectedDays: {},
          }),
          user_id: user_id?.toString() || state.user_id,
        },
        socialTasks: {
          TELEGRAM_CHANNEL: {
            completedTasks:
              state.socialTasks?.TELEGRAM_CHANNEL?.completedTasks || [],
          },
          X: {
            completedTasks: state.socialTasks?.X?.completedTasks || [],
          },
          YOUTUBE_VIEWS: {
            completedTasks:
              state.socialTasks?.YOUTUBE_VIEWS?.completedTasks || [],
          },
        },
        boosts: {
          ...state.boosts,
          maxTurboUses: state.boosts.maxTurboUses || MAX_BOOSTER_USES,
          maxRechargeUses: state.boosts.maxRechargeUses || MAX_BOOSTER_USES,
        },
      };
    },
    [user_id]
  );

  // Initialize state
  useEffect(() => {
    const initializeState = async () => {
      console.log("GameContext: initializeState called with user_id:", user_id);
      if (typeof window === "undefined" || !user_id) {
        console.log(
          "GameContext: Skipping initialization - no user_id or window"
        );
        return;
      }

      // Check for user switching and handle localStorage appropriately
      try {
        const storedStateStr = localStorage.getItem(STORAGE_KEYS.USER);
        const lastUserId = localStorage.getItem("lastActiveUserId");

        if (storedStateStr) {
          const storedState = JSON.parse(storedStateStr);
          const currentUserId = user_id.toString();

          // If stored state belongs to a different user
          if (storedState.user_id && storedState.user_id !== currentUserId) {
            // Check if this is a legitimate user switch (not first-time initialization)
            if (lastUserId && lastUserId !== currentUserId) {
              console.log(
                "GameContext: User switch detected, clearing localStorage data:",
                {
                  lastUserId: lastUserId,
                  storedUserId: storedState.user_id,
                  currentUserId: currentUserId,
                }
              );
              // Clear localStorage data from previous user
              localStorage.removeItem(STORAGE_KEYS.USER);
              localStorage.removeItem("playerScore");
              localStorage.removeItem("boosterUsage");
              localStorage.removeItem("spinProgression");
              // Set a flag to indicate we cleared data due to user switch
              localStorage.setItem("userSwitchCleared", "true");
            } else {
              console.log(
                "GameContext: Different user detected but no previous user, preserving data:",
                {
                  storedUserId: storedState.user_id,
                  currentUserId: currentUserId,
                }
              );
              // Don't clear data - this might be a legitimate account addition
            }
          }
        }

        // Update the last active user ID
        localStorage.setItem("lastActiveUserId", user_id.toString());
      } catch (error) {
        console.error(
          "GameContext: Error checking localStorage for user data:",
          error
        );
        // Clear localStorage if there's any error parsing it
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem("playerScore");
        localStorage.removeItem("boosterUsage");
        localStorage.removeItem("spinProgression");
        localStorage.removeItem("lastActiveUserId");
      }

      // Initialize timer service early to ensure timers are loaded from localStorage
      timerService.initializeTimerService();

      try {
        // Try to get database state FIRST
        let dbState: GameState | null = null;
        let dbError = false;

        try {
          if (!supabase) {
            console.error("Supabase client not available");
            return;
          }

          const { data: userData, error: _error } = await supabase
            .from("telegram_users")
            .select("game_state")
            .eq("user_id", user_id.toString())
            .single();

          if (_error) {
            // Check if this is a "not found" error (PGRST116 = record not found)
            if (
              _error.code === "PGRST116" ||
              _error.message.includes("not found")
            ) {
              dbError = false; // Not treating this as a regular database error
              dbState = null; // Ensure we create a new state

              // ESSENTIAL: Check if this user should be re-initialized when DB entry is missing
              if (shouldReinitializeOnMissing(user_id.toString())) {
                const storedStateStr = localStorage.getItem(STORAGE_KEYS.USER);
                if (storedStateStr) {
                  try {
                    const cachedState = JSON.parse(storedStateStr);
                    if (
                      cachedState &&
                      cachedState.user_id === user_id.toString()
                    ) {
                      console.log(
                        "[GAME CONTEXT DEBUG] User database entry manually removed, re-initializing with cached data:",
                        {
                          userId: user_id.toString(),
                          cachedCoins: cachedState.coins,
                          cachedLevel: cachedState.level,
                          isDummyUser: isDummyUser(user_id.toString()),
                        }
                      );

                      // Mark this user for re-initialization
                      localStorage.setItem(`needsReinit_${user_id}`, "true");

                      // Use cached state as the base
                      dbState = cachedState;
                    }
                  } catch (e) {
                    console.error("Error parsing cached state:", e);
                  }
                }
              }
            } else {
              // This is another type of database error
              dbError = true;
            }
          } else {
            // Successfully fetched user data
            if (userData?.game_state) {
              dbState = transformOldStateToNew(userData.game_state);
            } else {
              // User exists in database but has no game_state - this is a valid case
              // We should not treat this as a database error, but rather as a user needing initialization
              dbState = null;
              dbError = false;
            }
          }
        } catch {
          dbError = true;
        }

        // AFTER trying database, check if we have local storage data as fallback
        let storedState: GameState | null = null;
        try {
          const storedStateStr = localStorage.getItem(STORAGE_KEYS.USER);
          if (storedStateStr) {
            storedState = JSON.parse(storedStateStr);
            // Additional validation: ensure stored state belongs to current user
            if (storedState && storedState.user_id !== user_id.toString()) {
              console.log(
                "GameContext: Stored state belongs to different user, ignoring:",
                {
                  storedUserId: storedState.user_id,
                  currentUserId: user_id.toString(),
                }
              );
              storedState = null;
              // Clear the invalid data
              localStorage.removeItem(STORAGE_KEYS.USER);
            }
          }
        } catch {
          localStorage.removeItem(STORAGE_KEYS.USER);
        }

        // Check if this user needs re-initialization
        const needsReinit =
          localStorage.getItem(`needsReinit_${user_id}`) === "true";

        let newState: GameState;

        console.log("[GAME CONTEXT DEBUG] Decision logic inputs:", {
          dbState: dbState ? "exists" : "null",
          dbStateCoins: dbState?.coins,
          dbStateLevel: dbState?.level,
          dbError,
          storedState: storedState ? "exists" : "null",
          storedStateCoins: storedState?.coins,
          storedStateUserId: storedState?.user_id,
          currentUserId: user_id.toString(),
          userSwitchCleared:
            localStorage.getItem("userSwitchCleared") === "true",
          needsReinit,
          shouldReinitializeOnMissing: shouldReinitializeOnMissing(
            user_id.toString()
          ),
          isDummyUser: isDummyUser(user_id.toString()),
        });

        // Decision logic for which state to use:
        const userSwitchCleared =
          localStorage.getItem("userSwitchCleared") === "true";

        // ESSENTIAL: If user needs re-initialization, use cached state and mark for DB sync
        if (needsReinit && storedState) {
          console.log(
            "[GAME CONTEXT DEBUG] Using cached state for re-initialization"
          );
          newState = {
            ...storedState,
            user_id: user_id.toString(),
            gameVersion: CURRENT_GAME_VERSION,
            lastUpdate: Date.now(),
            // Initialize spin progression if not present in stored state
            spinProgression: storedState.spinProgression || {
              currentType: getCurrentlyActiveType() - 1,
              currentStep: 0,
              collectedTokens: 0,
              requiredTokens: 10,
              reward: {
                type: "sparkcoins",
                value: 100,
              },
              earnedRewards: {
                sparkcoins: 0,
                spins: 0,
                turbo: 0,
                recharge: 0,
              },
              lastCompletedStep: null,
              lastCompletedType: null,
            },
          };

          // Clear the re-init flag
          localStorage.removeItem(`needsReinit_${user_id}`);

          // Mark for immediate database sync
          setTimeout(async () => {
            try {
              // First, ensure the user exists in the database
              console.log(
                "[GAME CONTEXT DEBUG] Creating database entry for re-initialized user"
              );

              // Import the initializeOrUpdateUser function
              const { initializeOrUpdateUser } = await import(
                "../lib/telegram"
              );

              // Create user data from the current WebApp context
              // Try to get real user data from WebApp, fallback to dummy data
              let userData;

              if (
                typeof window !== "undefined" &&
                (window as any).Telegram?.WebApp?.initDataUnsafe?.user
              ) {
                // Real Telegram user data
                const telegramUser = (window as any).Telegram.WebApp
                  .initDataUnsafe.user;
                userData = {
                  id: telegramUser.id,
                  username: telegramUser.username,
                  first_name: telegramUser.first_name,
                  last_name: telegramUser.last_name,
                  language_code: telegramUser.language_code,
                  photo_url: telegramUser.photo_url,
                  is_bot: false,
                };
              } else {
                // Fallback to dummy user data
                userData = {
                  id: parseInt(user_id.toString()),
                  username: "testuser",
                  first_name: "Test",
                  last_name: "User",
                  language_code: "en",
                  photo_url: undefined,
                  is_bot: false,
                };
              }

              // Initialize the user in the database
              const initResult = await initializeOrUpdateUser(userData, false);

              if (initResult.success) {
                console.log(
                  "[GAME CONTEXT DEBUG] User database entry created successfully"
                );

                // Now save the game state
                debouncedSave(newState);
                debouncedSave.flush(); // Force immediate save
              } else {
                console.error(
                  "[GAME CONTEXT DEBUG] Failed to create user database entry:",
                  initResult.error
                );
              }
            } catch (error) {
              console.error(
                "[GAME CONTEXT DEBUG] Error during user re-initialization:",
                error
              );
            }
          }, 1000);
        } else if (dbState) {
          // Database state exists - check if it has meaningful data
          // If database has 0 coins but localStorage has coins, prefer localStorage
          // UNLESS we cleared localStorage due to user switching
          const hasLocalCoins = storedState && storedState.coins > 0;
          const hasDbCoins = dbState.coins > 0;

          if (
            hasLocalCoins &&
            !hasDbCoins &&
            storedState &&
            !userSwitchCleared
          ) {
            // Database has 0 coins but localStorage has coins - use localStorage and sync to database
            console.log(
              "[GAME CONTEXT DEBUG] Using localStorage coins over database (0 coins)"
            );
            newState = {
              ...storedState,
              user_id: user_id.toString(), // Ensure user_id is always set
              coins: storedState.coins || 0, // Ensure coins is always a number
              gameVersion: CURRENT_GAME_VERSION,
              lastUpdate: Date.now(),
              // Initialize spin progression if not present in stored state
              spinProgression: storedState.spinProgression || {
                currentType: getCurrentlyActiveType() - 1, // Convert to 0-based index
                currentStep: 0,
                collectedTokens: 0,
                requiredTokens: 10,
                reward: {
                  type: "sparkcoins" as const,
                  value: 1000,
                },
                earnedRewards: {
                  sparkcoins: 0,
                  spins: 0,
                  turbo: 0,
                  recharge: 0,
                },
                lastCompletedStep: null,
                lastCompletedType: null,
              },
            };

            // Immediately sync the localStorage state to database to prevent future issues
            setTimeout(async () => {
              try {
                if (!supabase) {
                  console.error("Supabase client not available");
                  return;
                }

                await supabase!
                  .from("telegram_users")
                  .update({
                    game_state: newState,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("user_id", user_id.toString());
                console.log(
                  "[GAME CONTEXT DEBUG] Successfully synced localStorage coins to database"
                );
              } catch (error) {
                console.error(
                  "[GAME CONTEXT DEBUG] Failed to sync localStorage coins to database:",
                  error
                );
              }
            }, 1000);
          } else {
            // Use database state (either it has coins or localStorage doesn't have coins or user switch cleared)
            console.log("[GAME CONTEXT DEBUG] Using database state:", {
              hasDbCoins: hasDbCoins,
              hasLocalCoins: hasLocalCoins,
              userSwitchCleared: userSwitchCleared,
              currentUserId: user_id.toString(),
            });

            newState = {
              ...dbState,
              gameVersion: CURRENT_GAME_VERSION,
              lastUpdate: Date.now(),
              characterProgression:
                dbState.characterProgression ||
                initializeCharacterProgression(),
              // Initialize spin progression if not present in database
              spinProgression: dbState.spinProgression || {
                currentType: getCurrentlyActiveType() - 1, // Convert to 0-based index
                currentStep: 0,
                collectedTokens: 0,
                requiredTokens: 10,
                reward: {
                  type: "sparkcoins" as const,
                  value: 1000,
                },
                earnedRewards: {
                  sparkcoins: 0,
                  spins: 0,
                  turbo: 0,
                  recharge: 0,
                },
                lastCompletedStep: null,
                lastCompletedType: null,
              },
            };

            // Clear the user switch flag after successful database state load
            if (userSwitchCleared) {
              localStorage.removeItem("userSwitchCleared");
              console.log(
                "GameContext: Successfully loaded database state after user switch"
              );
            }
          }
        } else if (
          dbError &&
          storedState &&
          storedState.user_id === user_id.toString()
        ) {
          // Regular database errors - use stored state but mark for sync
          newState = {
            ...storedState,
            gameVersion: CURRENT_GAME_VERSION,
            lastUpdate: Date.now(),
            _needsSync: true, // Flag to attempt re-sync later
            characterProgression:
              storedState.characterProgression ||
              initializeCharacterProgression(),
            // Initialize spin progression if not present in stored state
            spinProgression: storedState.spinProgression || {
              currentType: getCurrentlyActiveType() - 1, // Convert to 0-based index
              currentStep: 0,
              collectedTokens: 0,
              requiredTokens: 10,
              reward: {
                type: "sparkcoins" as const,
                value: 1000,
              },
              earnedRewards: {
                sparkcoins: 0,
                spins: 0,
                turbo: 0,
                recharge: 0,
              },
              lastCompletedStep: null,
              lastCompletedType: null,
            },
          };
        } else if (
          !dbError &&
          storedState &&
          storedState.user_id === user_id.toString()
        ) {
          // User exists in database but has no game_state - use stored state
          newState = {
            ...storedState,
            gameVersion: CURRENT_GAME_VERSION,
            lastUpdate: Date.now(),
            characterProgression:
              storedState.characterProgression ||
              initializeCharacterProgression(),
            // Initialize spin progression if not present in stored state
            spinProgression: storedState.spinProgression || {
              currentType: getCurrentlyActiveType() - 1, // Convert to 0-based index
              currentStep: 0,
              collectedTokens: 0,
              requiredTokens: 10,
              reward: {
                type: "sparkcoins" as const,
                value: 1000,
              },
              earnedRewards: {
                sparkcoins: 0,
                spins: 0,
                turbo: 0,
                recharge: 0,
              },
              lastCompletedStep: null,
              lastCompletedType: null,
            },
          };
        } else if (!dbError && dbState !== null) {
          // No localStorage but database state exists - use database state
          console.log(
            "[GAME CONTEXT DEBUG] Using database state (no localStorage):",
            {
              hasDbState: !!dbState,
              currentUserId: user_id.toString(),
            }
          );
          newState = {
            ...(dbState as GameState),
            gameVersion: CURRENT_GAME_VERSION,
            lastUpdate: Date.now(),
            characterProgression:
              (dbState as GameState).characterProgression ||
              initializeCharacterProgression(),
            // Initialize spin progression if not present in database
            spinProgression: (dbState as GameState).spinProgression || {
              currentType: getCurrentlyActiveType() - 1, // Convert to 0-based index
              currentStep: 0,
              collectedTokens: 0,
              requiredTokens: 10,
              reward: {
                type: "sparkcoins" as const,
                value: 1000,
              },
              earnedRewards: {
                sparkcoins: 0,
                spins: 0,
                turbo: 0,
                recharge: 0,
              },
              lastCompletedStep: null,
              lastCompletedType: null,
            },
          };
        } else {
          // No valid database state or local storage - create new state
          // Clear the spinProgression data from localStorage since this is a new user
          resetUserProgressionData();

          console.log("[GAME CONTEXT DEBUG] Creating new initial state:", {
            dbError,
            hasDbState: !!dbState,
            hasStoredState: !!storedState,
            currentUserId: user_id.toString(),
          });

          newState = {
            ...initialGameState,
            user_id: user_id.toString(),
            level: 1,
            stage: 1,
            FlameCapacityTap: levelConfig[1].sparkRequired,
            gameVersion: CURRENT_GAME_VERSION,
            lastUpdate: Date.now(),
            characterProgression: initializeCharacterProgression(),
            // Initialize spin progression for new users
            spinProgression: {
              currentType: getCurrentlyActiveType() - 1, // Convert to 0-based index
              currentStep: 0,
              collectedTokens: 0,
              requiredTokens: 10,
              reward: {
                type: "sparkcoins" as const,
                value: 1000,
              },
              earnedRewards: {
                sparkcoins: 0,
                spins: 0,
                turbo: 0,
                recharge: 0,
              },
              lastCompletedStep: null,
              lastCompletedType: null,
            },
          };
        }

        // Calculate and apply retroactive spins if user was inactive
        if (newState.lastActiveTime && newState.spins < 50) {
          try {
            const retroactiveResult =
              await timerService.calculateAndApplyRetroactiveSpins(
                user_id.toString(),
                newState
              );

            if (retroactiveResult && retroactiveResult.spinsAdded > 0) {
              // Update the local state with the new spin count
              newState.spins = Math.min(
                50,
                newState.spins + retroactiveResult.spinsAdded
              );
              newState.lastActiveTime = Date.now();

              // Show a toast notification to the user
              toast.success(
                `Welcome back! You earned ${retroactiveResult.spinsAdded} spins while away.`
              );
            }
          } catch {}
        }

        // Always update localStorage with the decided state
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newState));

        // Make sure level is set correctly based on accumulated spark
        if (newState.coins) {
          let correctLevel = 1;

          // Find the highest level the user should be at based on their spark
          for (let i = 1; i <= 10; i++) {
            if (newState.coins >= levelConfig[i].sparkRequired) {
              correctLevel = i;
            } else {
              break; // Stop when we find a level the user hasn't reached
            }
          }

          // Simple level calculation for someone with 5000 spark
          if (newState.coins >= 4000 && newState.coins < 10000) {
            correctLevel = 4;
          }

          // Adjust level to next one to work towards
          if (correctLevel < 10) {
            correctLevel += 1;
          }

          // Update the level if needed
          if (correctLevel != newState.level) {
            newState.level = correctLevel;
            newState.stage = correctLevel;
          }
        }

        setGameState(newState);
        setMounted(true);
      } catch {
        toast.error("Failed to load game state");

        // Clear localStorage in case of critical error
        localStorage.removeItem(STORAGE_KEYS.USER);

        // Set fallback state
        setGameState({
          ...initialGameState,
          user_id: user_id?.toString(),
          gameVersion: CURRENT_GAME_VERSION,
          lastUpdate: Date.now(),
        });
      }
    };

    initializeState();
  }, [
    user_id,
    transformOldStateToNew,
    recalculateAutoTapState,
    transformStateForTelegram,
  ]);

  // Debounced save function
  const debouncedSave = useMemo(
    () =>
      debounce(async (state: GameState) => {
        if (user_id) {
          try {
            const transformedState = isNewGameState(state)
              ? state
              : transformOldStateToNew(state);

            // Add retry logic for database updates
            let retries = 0;
            const maxRetries = 3;
            let success = false;

            while (retries < maxRetries && !success) {
              try {
                if (!supabase) {
                  console.error("Supabase client not available");
                  return;
                }

                await updateTelegramUserProgress(
                  user_id.toString(),
                  transformStateForTelegram(transformedState)
                );
                success = true;
                lastSaveRef.current = Date.now();
              } catch (error) {
                retries++;

                if (retries >= maxRetries) {
                  throw error;
                }

                // Wait before retrying (exponential backoff)
                await new Promise((resolve) =>
                  setTimeout(resolve, 500 * Math.pow(2, retries))
                );
              }
            }
          } catch {
            toast.error("Failed to save progress");
          }
        }
      }, 2000), // 2 second debounce
    [user_id, transformOldStateToNew, transformStateForTelegram]
  );

  // Add periodic save mechanism
  useEffect(() => {
    if (!mounted || !user_id) return;

    // Force save every 5 seconds if there are changes
    const periodicSave = setInterval(() => {
      const timeSinceLastSave = Date.now() - lastSaveRef.current;
      // If it's been more than 5 seconds since last save and state has changed
      if (timeSinceLastSave > 5000) {
        debouncedSave(gameState);
      }
    }, 5000);

    return () => clearInterval(periodicSave);
  }, [mounted, user_id, gameState, debouncedSave]);

  // Persist state function
  const persistState = useCallback(
    (updates: Partial<GameState> | ((prev: GameState) => GameState)) => {
      setGameState((prev) => {
        const newState =
          typeof updates === "function"
            ? updates(prev)
            : { ...prev, ...updates };

        // If the new state is identical to the previous state, return the previous state
        if (JSON.stringify(newState) === JSON.stringify(prev)) {
          return prev;
        }

        // Store in localStorage
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newState));

        // Trigger debounced save to ensure database is updated
        debouncedSave(newState);

        return newState;
      });
    },
    [debouncedSave]
  );

  // Utility functions
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  }, []);

  const calculateTotalCoins = useCallback((tapPower: number) => {
    return tapPower * AUTO_TAP_DURATION;
  }, []);

  const calculateAutoTapDuration = useCallback(
    (tapPower: number, totalCoins: number) => {
      return Math.ceil(totalCoins / tapPower);
    },
    []
  );

  const calculateTotalCoinsWithTurbo = useCallback(
    (tapPower: number, turboActive: boolean) => {
      return turboActive ? tapPower * 10 : tapPower * 1;
    },
    []
  );

  const startAutoSpin = useCallback(
    async (
      spinFunction: () => Promise<{ success: boolean; reason?: string }>
    ) => {
      if (!gameState.isSpinning && !isAutoSpinningRef.current) {
        let currentSpins = gameState.spins;

        if (currentSpins < gameState.spinLevel) {
          toast.error("Not enough spins to start auto-spin!");
          return;
        }

        setGameState((prev) => ({
          ...prev,
          isSpinning: true,
        }));
        isAutoSpinningRef.current = true;

        const spinLoop = async () => {
          while (isAutoSpinningRef.current) {
            if (currentSpins < gameState.spinLevel) {
              isAutoSpinningRef.current = false;
              setGameState((prev) => ({
                ...prev,
                isSpinning: false,
              }));
              toast.error("Auto-spin stopped: Not enough spins!");
              break;
            }

            const result = await spinFunction();

            if (result.success) {
              currentSpins -= gameState.spinLevel;
            }

            if (!result.success || result.reason === "not-enough-spins") {
              isAutoSpinningRef.current = false;
              setGameState((prev) => ({
                ...prev,
                isSpinning: false,
              }));
              break;
            }

            if (!isAutoSpinningRef.current) break;

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        };

        try {
          await spinLoop();
        } catch (error) {
          console.error("Error in spinLoop:", error);
        } finally {
          setGameState((prev) => ({
            ...prev,
            isSpinning: false,
          }));
          isAutoSpinningRef.current = false;
        }
      }
    },
    [gameState.spins, gameState.spinLevel, gameState.isSpinning]
  );

  const stopAutoSpin = useCallback(() => {
    isAutoSpinningRef.current = false;
    persistState((prev) => ({ ...prev, isSpinning: false }));
  }, [persistState]);

  const getCurrentLevelConfig = useCallback(() => {
    const currentLevel = gameState.level;
    const config = levelConfig[currentLevel];
    return {
      sparkRequired: config.sparkRequired,
      rewardCoins: config.levelCompletionReward,
    };
  }, [gameState.level]);

  const decreaseEnergy = useCallback(
    (amount: number) => {
      persistState((prev) => {
        const currentRecharge = Math.max(0, prev.currentRecharge - amount);
        return {
          ...prev,
          currentRecharge,
        };
      });
    },
    [persistState]
  );

  // Replace increaseCoins with optimized version
  const increaseCoins = useCallback(
    (amount: number) => {
      // Update user activity timestamp
      updateUserActivity();

      // For actual coin increases, update the state and trigger animations
      persistState((prev) => {
        const newState = { ...prev };
        const newCoins = (prev.coins || 0) + amount;
        newState.coins = newCoins;

        // Check for level up
        let shouldLevelUp = false;
        let nextLevel = prev.level;

        // Only check for level up if we're not already in a level up process
        if (!prev.pendingLevelUp) {
          // Find the highest level the player qualifies for
          for (let i = prev.level + 1; i <= 10; i++) {
            if (newCoins >= levelConfig[i].sparkRequired) {
              nextLevel = i;
              shouldLevelUp = true;
            } else {
              // Break when we find a level the player doesn't qualify for
              break;
            }
          }
        }

        if (shouldLevelUp && nextLevel > prev.level) {
          newState.level = nextLevel;
          newState.stage = nextLevel;
          newState.pendingLevelUp = true;

          // Add the level completion reward for the level they completed
          const completedLevel = prev.level;
          const levelReward = levelConfig[completedLevel].levelCompletionReward;
          newState.coins += levelReward;

          // Force a database update immediately for level up
          setTimeout(() => {
            criticalStateUpdate((prevDb) => ({
              ...prevDb,
              coins: newState.coins,
              level: nextLevel,
              stage: nextLevel,
              pendingLevelUp: true,
            }));

            // Only show the level up animation without a toast notification
            if (showLevelUpAnimation) {
              showLevelUpAnimation(nextLevel);
            }

            // Clear pending level up flag after animation
            setTimeout(() => {
              persistState((prev) => ({
                ...prev,
                pendingLevelUp: false,
              }));
            }, 2000);
          }, 500);
        }

        return newState;
      });
    },
    [
      criticalStateUpdate,
      persistState,
      showLevelUpAnimation,
      updateUserActivity,
    ]
  );

  const decreaseSpins = useCallback(
    async (amount: number) => {
      // Update user activity timestamp
      updateUserActivity();

      // Get the current coins value to preserve it
      const currentCoins = gameState.coins;

      try {
        // Update local state immediately for UI responsiveness
        setGameState((prev) => ({
          ...prev,
          spins: Math.max(0, prev.spins - amount),
        }));

        // Then update the database
        return await criticalStateUpdate((prev) => {
          // Get the most up-to-date spins value from the previous state
          const currentSpins = prev.spins;

          return {
            ...prev,
            spins: Math.max(0, currentSpins - amount),
            totalSpins: prev.totalSpins + amount,
            coins: currentCoins, // Explicitly preserve the current coins value
          };
        });
      } catch {
        // Still return the updated state even if there was an error
        return { ...gameState, spins: Math.max(0, gameState.spins - amount) };
      }
    },
    [criticalStateUpdate, gameState, setGameState, updateUserActivity]
  );

  const increaseSpins = useCallback(
    async (amount: number) => {
      // Get the current coins value to preserve it
      const currentCoins = gameState.coins;

      try {
        // Update local state immediately for UI responsiveness
        setGameState((prev) => ({
          ...prev,
          spins: prev.spins + amount,
        }));

        // Then update the database
        await criticalStateUpdate((prev) => {
          // Get the most up-to-date spins value from the previous state
          const currentSpins = prev.spins;

          return {
            ...prev,
            spins: currentSpins + amount,
            coins: currentCoins, // Explicitly preserve the current coins value
          };
        });
      } catch {}
    },
    [criticalStateUpdate, gameState.coins, setGameState]
  );

  const updateEnergy = useCallback(
    (amount: number) => {
      persistState((prev) => {
        const rechargeLevel = Math.min(3, prev.upgrades?.rechargeLevel || 1);
        const energyConfig = getEnergyConfig(rechargeLevel);
        const newRecharge = Math.min(
          energyConfig.maxRecharge,
          Math.max(0, prev.currentRecharge + amount)
        );

        return {
          ...prev,
          currentRecharge: newRecharge,
        };
      });
    },
    [persistState]
  );

  const updateBoosts = useCallback(
    (boostUpdates: Partial<GameState["boosts"]>) => {
      persistState((prev) => ({
        ...prev,
        boosts: {
          ...prev.boosts,
          ...boostUpdates,
        },
      }));
    },
    [persistState]
  );

  const purchaseItem = useCallback(
    (cost: number, rewards?: Partial<GameState>) => {
      if (gameState.coins < cost) return false;

      persistState((prev) => ({
        ...prev,
        coins: prev.coins - cost,
        ...(rewards || {}),
      }));
      return true;
    },
    [gameState.coins, persistState]
  );

  const resetGame = useCallback(() => {
    persistState(() => initialGameState);
  }, [persistState]);

  const updateSpins = useCallback(
    (amount: number) => {
      // Get the current coins value to preserve it
      const currentCoins = gameState.coins;

      try {
        // Update local state immediately for UI responsiveness
        setGameState((prev) => ({
          ...prev,
          spins: Math.max(0, prev.spins + amount),
        }));

        // Use criticalStateUpdate to ensure database is updated immediately
        criticalStateUpdate((prev) => {
          // Get the most up-to-date spins value from the previous state
          const currentSpins = prev.spins;

          return {
            ...prev,
            spins: Math.max(0, currentSpins + amount),
            totalSpins: prev.totalSpins + (amount < 0 ? Math.abs(amount) : 0),
            coins: currentCoins, // Explicitly preserve the current coins value
          };
        }).catch((_error) => {
          // Fallback to persistState if criticalStateUpdate fails
          persistState((prev) => ({
            ...prev,
            spins: Math.max(0, prev.spins + amount),
            totalSpins: prev.totalSpins + (amount < 0 ? Math.abs(amount) : 0),
            coins: currentCoins, // Explicitly preserve the current coins value
          }));
        });
      } catch {}
    },
    [persistState, criticalStateUpdate, gameState.coins, setGameState]
  );

  const addCoins = useCallback(
    (amount: number) => {
      persistState((prev) => ({
        ...prev,
        coins: prev.coins + amount,
      }));
    },
    [persistState]
  );

  const updateTaps = useCallback(
    (newTaps: number) => {
      persistState((prev) => {
        // Get current energy level
        const energyLevel = Math.min(40, prev.upgrades.energyLevel || 1);
        const energyConfig = getEnergyConfig(energyLevel);
        const maxEnergy = energyConfig.maxRecharge;

        // Update recharge instead of FlameCapacityTap
        const clampedRecharge = Math.max(0, Math.min(newTaps, maxEnergy));

        return {
          ...prev,
          currentRecharge: clampedRecharge,
          maxPhoenixEnergy: maxEnergy,
          energyCapacity: maxEnergy,
        };
      });
    },
    [persistState]
  );

  const updateLevel = useCallback(
    async (newLevel: number) => {
      try {
        await criticalStateUpdate((prev) => {
          // Only add the reward if this is an actual level up
          if (newLevel > prev.level) {
            // Get the reward for the completed level
            const completedLevel = prev.level;
            const levelReward =
              levelConfig[completedLevel].levelCompletionReward;

            // Add the reward to the user's coins
            return {
              ...prev,
              level: newLevel,
              stage: newLevel,
              coins: prev.coins + levelReward,
              pendingLevelUp: false,
            };
          }

          return {
            ...prev,
            level: newLevel,
            pendingLevelUp: false,
          };
        });

        // Show a toast notification about the reward if this is a level up
        if (newLevel > gameState.level) {
          const levelReward =
            levelConfig[gameState.level].levelCompletionReward;
          setTimeout(() => {
            gameToast.reward(
              `Level ${newLevel} reached!\nLevel bonus: ${levelReward.toLocaleString()} coins`,
              { duration: 5000 }
            );
          }, 1000);
        }

        // Show level up animation if available
        if (showLevelUpAnimation) {
          showLevelUpAnimation(newLevel);
        }
      } catch {
        toast.error("Failed to update level");
      }
    },
    [criticalStateUpdate, gameState.level, showLevelUpAnimation]
  );

  const addBoosterUses = useCallback(
    (type: "turbo" | "recharge", amount: number, isRewarded?: boolean) => {
      // Skip processing for zero or negative values
      if (amount <= 0) return;

      // Capture the current state snapshot to use in the critical update
      const currentBoosts = {
        inGameTurbo: gameState.boosts.inGameTurbo,
        rewardedTurbo: gameState.boosts.rewardedTurbo,
        inGameRecharge: gameState.boosts.inGameRecharge,
        rewardedRecharge: gameState.boosts.rewardedRecharge,
        turboActive: gameState.boosts.turboActive,
        rechargeActive: gameState.boosts.rechargeActive,
        turboTimeLeft: gameState.boosts.turboTimeLeft,
        rechargeTimeLeft: gameState.boosts.rechargeTimeLeft,
        turboRefillTime: gameState.boosts.turboRefillTime,
        rechargeRefillTime: gameState.boosts.rechargeRefillTime,
        autoTapUses: gameState.boosts.autoTapUses,
        maxTurboUses: gameState.boosts.maxTurboUses,
        maxRechargeUses: gameState.boosts.maxRechargeUses,
        turboEndTime: gameState.boosts.turboEndTime,
        rechargeEndTime: gameState.boosts.rechargeEndTime,
      };

      try {
        // Calculate the new value for the specific type being updated
        const newTurboValue =
          type === "turbo" && isRewarded
            ? currentBoosts.rewardedTurbo + amount
            : currentBoosts.rewardedTurbo;

        const newRechargeValue =
          type === "recharge" && isRewarded
            ? currentBoosts.rewardedRecharge + amount
            : currentBoosts.rewardedRecharge;

        const newInGameTurbo =
          type === "turbo" && !isRewarded
            ? currentBoosts.inGameTurbo + amount
            : currentBoosts.inGameTurbo;

        const newInGameRecharge =
          type === "recharge" && !isRewarded
            ? currentBoosts.inGameRecharge + amount
            : currentBoosts.inGameRecharge;

        // Create the updated boost state with all values explicitly set
        const updatedBoosts = {
          ...currentBoosts,
          rewardedTurbo: newTurboValue,
          rewardedRecharge: newRechargeValue,
          inGameTurbo: newInGameTurbo,
          inGameRecharge: newInGameRecharge,
        };

        // Update local state first
        persistState((prev) => ({
          ...prev,
          boosts: updatedBoosts,
        }));

        // For rewarded boosters, we need a critical state update
        if (isRewarded) {
          // Immediately trigger a critical state update without timeouts
          criticalStateUpdate({
            boosts: updatedBoosts,
          }).catch((_error) => {});
        }
      } catch {}
    },
    [gameState, persistState, criticalStateUpdate]
  );

  // Add a processing flag at the component level to prevent infinite updates
  const autoTapProcessingRef = useRef(false);
  // Add this ref to always have the latest gameState
  const gameStateRef = useRef(gameState);

  // Keep gameStateRef updated
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Consolidate auto-tap updates
  useEffect(() => {
    if (!mounted) return;

    const handleMajorAutoTapEvents = async () => {
      // Check if we're already processing an update
      if (autoTapProcessingRef.current) {
        return;
      }

      let hasChanges = false;
      let updates: Partial<GameState> = {};

      try {
        // Set the processing flag
        autoTapProcessingRef.current = true;

        // Use the ref to get the latest state
        const currentState = gameStateRef.current;

        // Auto-tap Start Event - check if autoTapActive just became true and autoTapStartTime exists
        if (
          currentState.autoTapActive &&
          currentState.autoTapStartTime &&
          currentState.autoTapProgress === 0
        ) {
          // Prevent duplicate start event processing
          const needsStartUpdate =
            currentState.autoTapTimeLeft !== AUTO_TAP_DURATION ||
            currentState.application_state?.isAutotapActive !== true;

          if (needsStartUpdate) {
            hasChanges = true;
            updates = {
              autoTapActive: true,
              autoTapStartTime: currentState.autoTapStartTime,
              autoTapEndTime: currentState.autoTapEndTime || 0,
              autoTapProgress: 0,
              autoTapTimeLeft: AUTO_TAP_DURATION,
              autoTapSpark: 0,
              application_state: {
                ...currentState.application_state,
                isAutotapPurchased:
                  currentState.application_state?.isAutotapPurchased ?? false,
                has_visited_earn_page:
                  currentState.application_state?.has_visited_earn_page ??
                  false,
                isAutotapActive: true,
              },
            };
          }
        }

        // Auto-tap End Event - check if autoTapActive just became false but we have a non-zero autoTapProgress
        if (
          !currentState.autoTapActive &&
          currentState.autoTapProgress > 0 &&
          !currentState.autoTapClaimed
        ) {
          // Prevent duplicate end event processing by checking if values actually need to change
          const needsEndUpdate =
            currentState.autoTapProgress !== 100 ||
            currentState.autoTapTimeLeft !== 0 ||
            currentState.application_state?.isAutotapActive !== false;

          if (needsEndUpdate) {
            hasChanges = true;
            updates = {
              autoTapActive: false,
              autoTapEndTime: Date.now(),
              autoTapProgress: 100,
              autoTapTimeLeft: 0,
              autoTapSpark: currentState.autoTapSpark || 0,
              autoTapCoins: currentState.autoTapSpark || 0,
              autoTapClaimed: false,
              application_state: {
                ...currentState.application_state,
                isAutotapPurchased:
                  currentState.application_state?.isAutotapPurchased ?? false,
                has_visited_earn_page:
                  currentState.application_state?.has_visited_earn_page ??
                  false,
                isAutotapActive: false,
              },
            };
          }
        }

        // Auto-tap Claim Event
        if (currentState.autoTapClaimed && currentState.autoTapCoins) {
          // Prevent duplicate claim processing
          const needsClaimUpdate =
            currentState.autoTapCoins > 0 ||
            currentState.autoTapSpark > 0 ||
            currentState.autoTapProgress > 0 ||
            currentState.autoTapEndTime !== 0 ||
            currentState.autoTapStartTime !== 0;

          if (needsClaimUpdate) {
            hasChanges = true;
            updates = {
              autoTapActive: false,
              autoTapEndTime: 0,
              autoTapStartTime: 0,
              autoTapProgress: 0,
              autoTapTimeLeft: 0,
              autoTapSpark: 0,
              autoTapCoins: 0,
              autoTapClaimed: true,
              application_state: {
                ...currentState.application_state,
                isAutotapPurchased:
                  currentState.application_state?.isAutotapPurchased ?? false,
                has_visited_earn_page:
                  currentState.application_state?.has_visited_earn_page ??
                  false,
                isAutotapActive: false,
              },
            };
          }
        }

        if (hasChanges) {
          // Use a single critical update for major events
          await criticalStateUpdate(updates);
        }
      } finally {
        // Always reset the processing flag when done
        setTimeout(() => {
          autoTapProcessingRef.current = false;
        }, 100); // Add small delay to ensure state has time to settle
      }
    };

    handleMajorAutoTapEvents();

    // Cleanup
    return () => {
      debouncedPersistAutoTapState.cancel();
    };
  }, [
    mounted,
    // Only depend on core triggers that should cause the effect to run
    gameState.autoTapActive,
    gameState.autoTapClaimed,
    gameState.autoTapProgress,
    criticalStateUpdate,
    debouncedPersistAutoTapState,
  ]);

  // Remove the sync effect since we're handling updates in major events
  useEffect(() => {
    if (!mounted || !user_id) return;
    const lastSave = lastSaveRef.current;
    const now = Date.now();

    if (now - lastSave < 5000) return;
    lastSaveRef.current = now;
  }, [mounted, user_id]);

  // Effect for updating turbo timer
  useEffect(() => {
    let lastUpdate = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      // Ensure we're updating every second
      if (now - lastUpdate < 1000) return;

      const endTime = turboEndTimeRef.current;
      if (endTime && endTime > now) {
        const newTimeLeft = Math.floor((endTime - now) / 1000);

        // Only update if time has actually changed
        if (newTimeLeft !== turboTimeRef.current) {
          turboTimeRef.current = newTimeLeft;
          persistState((prev) => ({
            ...prev,
            boosts: {
              ...prev.boosts,
              turboTimeLeft: newTimeLeft,
            },
          }));
        }
      } else if (turboActiveRef.current) {
        turboActiveRef.current = false;
        turboTimeRef.current = 0;
        persistState((prev) => ({
          ...prev,
          boosts: {
            ...prev.boosts,
            turboActive: false,
            turboTimeLeft: 0,
          },
        }));
      }
      lastUpdate = now;
    }, 100); // Run more frequently but check time delta

    return () => clearInterval(interval);
  }, [persistState]);

  // Update refs when props change
  useEffect(() => {
    turboTimeRef.current = gameState.boosts.turboTimeLeft;
    turboEndTimeRef.current = gameState.boosts.turboEndTime;
    turboActiveRef.current = gameState.boosts.turboActive;
  }, [
    gameState.boosts.turboTimeLeft,
    gameState.boosts.turboEndTime,
    gameState.boosts.turboActive,
  ]);

  // Modified setBoosterActive to update refs
  const setBoosterActive = useCallback(
    (boostType: "turbo" | "recharge", active: boolean) => {
      // Only proceed with activation if 'active' is true
      if (!active) {
        // For deactivation, just update the active state
        persistState((prev) => ({
          ...prev,
          boosts: {
            ...prev.boosts,
            [boostType === "turbo" ? "turboActive" : "rechargeActive"]: false,
            [boostType === "turbo" ? "turboEndTime" : "rechargeEndTime"]:
              undefined,
          },
        }));

        // Remove localStorage items for deactivation
        if (boostType === "turbo") {
          localStorage.removeItem("turboEndTime");
        } else {
          localStorage.removeItem("rechargeEndTime");
          localStorage.removeItem("rechargeJustActivated");
          localStorage.removeItem("rechargeBoosterActive");
        }

        return;
      }

      // Add a last activation timestamp in localStorage to prevent double calls
      const now = Date.now();
      const lastActivationKey = `last${boostType}Activation`;
      const lastActivation = Number(
        localStorage.getItem(lastActivationKey) || "0"
      );

      // Prevent activations within 500ms of each other
      if (now - lastActivation < 500) {
        return;
      }

      // Check if we have an active session already to prevent duplicate counter decrement
      const storageEndTimeKey =
        boostType === "turbo" ? "turboEndTime" : "rechargeEndTime";
      const existingEndTime = Number(
        localStorage.getItem(storageEndTimeKey) || "0"
      );
      if (existingEndTime > now) {
        // Just update the UI state without decrementing the counter again
        persistState((prev) => ({
          ...prev,
          boosts: {
            ...prev.boosts,
            [boostType === "turbo" ? "turboActive" : "rechargeActive"]: true,
            [boostType === "turbo" ? "turboEndTime" : "rechargeEndTime"]:
              existingEndTime,
          },
        }));
        return;
      }

      // Set activation timestamp
      localStorage.setItem(lastActivationKey, now.toString());

      // Get the appropriate keys for this booster type
      const inGameKey =
        boostType === "turbo" ? "inGameTurbo" : "inGameRecharge";
      const rewardedKey =
        boostType === "turbo" ? "rewardedTurbo" : "rewardedRecharge";
      const activeKey =
        boostType === "turbo" ? "turboActive" : "rechargeActive";
      const endTimeKey =
        boostType === "turbo" ? "turboEndTime" : "rechargeEndTime";

      // Calculate endTime based on booster type
      const duration = boostType === "turbo" ? 10 * 1000 : 30 * 1000; // 10 seconds for turbo, 30 for recharge
      const endTime = now + duration;

      // Set localStorage values first
      localStorage.setItem(storageEndTimeKey, endTime.toString());
      if (boostType === "recharge") {
        localStorage.setItem("rechargeJustActivated", "true");
        localStorage.setItem("rechargeBoosterActive", "true");
      }

      // Check if user has any boosters available
      const totalUses =
        (gameState.boosts[inGameKey] || 0) +
        (gameState.boosts[rewardedKey] || 0);

      if (totalUses <= 0) {
        return;
      }

      // Determine whether to use from rewarded or in-game pool
      const hasRewardedUses = (gameState.boosts[rewardedKey] || 0) > 0;

      // IMPORTANT: Store the counter values in localStorage to recover if they get reset
      const newInGameCount = !hasRewardedUses
        ? Math.max(0, (gameState.boosts[inGameKey] || 0) - 1)
        : gameState.boosts[inGameKey] || 0;

      const newRewardedCount = hasRewardedUses
        ? Math.max(0, (gameState.boosts[rewardedKey] || 0) - 1)
        : gameState.boosts[rewardedKey] || 0;

      // Store the updated counter values in localStorage
      localStorage.setItem(`${boostType}InGameCount`, String(newInGameCount));
      localStorage.setItem(
        `${boostType}RewardedCount`,
        String(newRewardedCount)
      );

      // First update local state immediately for UI feedback
      persistState((prev) => ({
        ...prev,
        boosts: {
          ...prev.boosts,
          [activeKey]: true,
          [endTimeKey]: endTime,
          [inGameKey]: newInGameCount,
          [rewardedKey]: newRewardedCount,
        },
      }));

      // Then update database to ensure persistence - use immediate non-batched update
      try {
        // Use user_id from useUser hook if available, otherwise fallback to gameState.user_id
        const userId = user_id?.toString() || gameState.user_id;

        if (userId) {
          // Create the boosts object with all current values
          const updatedBoosts = {
            ...gameState.boosts,
            [activeKey]: true,
            [endTimeKey]: endTime,
            [inGameKey]: newInGameCount,
            [rewardedKey]: newRewardedCount,
          };

          // Update database directly with new boosts
          if (!supabase) {
            console.error("Supabase client not available");
            return;
          }
          supabase
            .from("telegram_users")
            .update({
              game_state: {
                ...gameState,
                boosts: updatedBoosts,
              },
            })
            .eq("user_id", userId)
            .then(({ error: _error }) => {});
        }
      } catch {}

      // Force sync across all components
      window.dispatchEvent(new Event(`${boostType}StateChange`));
    },
    [gameState, persistState, user_id]
  );

  // Add protection against counter resets by checking localStorage in useEffect
  useEffect(() => {
    if (!mounted) return;

    // Recovery function to check and restore counter values if they've been reset
    const checkAndRestoreCounters = () => {
      const now = Date.now();

      // Check turbo counters
      const turboEndTime = Number(localStorage.getItem("turboEndTime") || "0");
      if (turboEndTime > now) {
        // Turbo is active, check if counters match saved values
        const savedInGameTurbo = Number(
          localStorage.getItem("turboInGameCount") || "-1"
        );
        const savedRewardedTurbo = Number(
          localStorage.getItem("turboRewardedCount") || "-1"
        );

        // Only restore if we have valid saved values
        if (
          savedInGameTurbo >= 0 &&
          gameState.boosts.inGameTurbo > savedInGameTurbo
        ) {
          persistState((prev) => ({
            ...prev,
            boosts: {
              ...prev.boosts,
              inGameTurbo: savedInGameTurbo,
              rewardedTurbo:
                savedRewardedTurbo >= 0
                  ? savedRewardedTurbo
                  : prev.boosts.rewardedTurbo,
            },
          }));
        }
      } else {
        // Clear saved counters if turbo is not active
        localStorage.removeItem("turboInGameCount");
        localStorage.removeItem("turboRewardedCount");
      }

      // Check recharge counters
      const rechargeEndTime = Number(
        localStorage.getItem("rechargeEndTime") || "0"
      );
      if (rechargeEndTime > now) {
        // Recharge is active, check if counters match saved values
        const savedInGameRecharge = Number(
          localStorage.getItem("rechargeInGameCount") || "-1"
        );
        const savedRewardedRecharge = Number(
          localStorage.getItem("rechargeRewardedCount") || "-1"
        );

        // Only restore if we have valid saved values
        if (
          savedInGameRecharge >= 0 &&
          gameState.boosts.inGameRecharge > savedInGameRecharge
        ) {
          persistState((prev) => ({
            ...prev,
            boosts: {
              ...prev.boosts,
              inGameRecharge: savedInGameRecharge,
              rewardedRecharge:
                savedRewardedRecharge >= 0
                  ? savedRewardedRecharge
                  : prev.boosts.rewardedRecharge,
            },
          }));
        }
      } else {
        // Clear saved counters if recharge is not active
        localStorage.removeItem("rechargeInGameCount");
        localStorage.removeItem("rechargeRewardedCount");
      }
    };

    // Check immediately on mount
    checkAndRestoreCounters();

    // Also check periodically
    const intervalId = setInterval(checkAndRestoreCounters, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    mounted,
    gameState.boosts.inGameTurbo,
    gameState.boosts.inGameRecharge,
    persistState,
  ]);

  // Modified setBoosterEndTime to update refs
  const setBoosterEndTime = useCallback(
    (boosterType: "turbo" | "recharge", endTime?: number) => {
      const storageKey = STORAGE_KEYS.TIMERS;
      const timers = JSON.parse(localStorage.getItem(storageKey) || "{}");

      if (endTime) {
        timers[boosterType] = {
          endTime,
          status: "active",
        };
        localStorage.setItem(storageKey, JSON.stringify(timers));
      } else {
        delete timers[boosterType];
        localStorage.setItem(storageKey, JSON.stringify(timers));
      }

      persistState((prev) => ({
        ...prev,
        boosts: {
          ...prev.boosts,
          [`${boosterType}EndTime`]: endTime,
        },
      }));
    },
    [persistState]
  );

  const setBoosterRefillTime = useCallback(
    (boosterType: "turbo" | "recharge", time: number) => {
      persistState((prev) => ({
        ...prev,
        boosts: {
          ...prev.boosts,
          [boosterType === "turbo" ? "turboRefillTime" : "rechargeRefillTime"]:
            time,
        },
      }));
    },
    [persistState]
  );

  const getBoosterState = useCallback(
    (type: "turbo" | "recharge") => {
      const active =
        type === "turbo"
          ? gameState.boosts.turboActive
          : gameState.boosts.rechargeActive;
      const timeLeft =
        type === "turbo"
          ? gameState.timers.turboTimeLeft
          : gameState.timers.rechargeTimeLeft;
      const refillTime =
        type === "turbo"
          ? gameState.timers.turboRefillTime
          : gameState.timers.rechargeRefillTime;

      return {
        active,
        timeLeft,
        refillTime,
      };
    },
    [gameState.boosts, gameState.timers]
  );

  const calculateNextRefillTime = useCallback((lastRefillTime: number) => {
    const now = Date.now();
    const timeSinceLastRefill = now - lastRefillTime;
    const nextRefillTime =
      BOOSTER_REFILL_INTERVAL - (timeSinceLastRefill % BOOSTER_REFILL_INTERVAL);
    return Math.ceil(nextRefillTime / 1000);
  }, []);

  const formatRefillTime = useCallback((timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }, []);

  // Add new function to check and reset boosters at UTC midnight
  const checkAndResetDailyBoosters = useCallback(
    async (currentState: GameState) => {
      const now = new Date();
      const lastResetStr = localStorage.getItem("lastBoosterReset");
      const lastReset = lastResetStr ? new Date(lastResetStr) : new Date(0);

      // Check if it's a new UTC day
      const isNewDay =
        now.getUTCDate() !== lastReset.getUTCDate() ||
        now.getUTCMonth() !== lastReset.getUTCMonth() ||
        now.getUTCFullYear() !== lastReset.getUTCFullYear();

      if (isNewDay) {
        const turboUses =
          (currentState.boosts?.inGameTurbo || 0) +
          (currentState.boosts?.rewardedTurbo || 0);
        const rechargeUses =
          (currentState.boosts?.inGameRecharge || 0) +
          (currentState.boosts?.rewardedRecharge || 0);

        const initialBoosts: Boosts = {
          ...currentState.boosts,
          inGameTurbo: currentState.boosts.inGameTurbo,
          rewardedTurbo: currentState.boosts.rewardedTurbo,
          inGameRecharge: currentState.boosts.inGameRecharge,
          rewardedRecharge: currentState.boosts.rewardedRecharge,
          turboActive: currentState.boosts.turboActive,
          rechargeActive: currentState.boosts.rechargeActive,
          turboTimeLeft: currentState.boosts.turboTimeLeft,
          rechargeTimeLeft: currentState.boosts.rechargeTimeLeft,
          turboRefillTime: currentState.boosts.turboRefillTime,
          rechargeRefillTime: currentState.boosts.rechargeRefillTime,
          autoTapUses: currentState.boosts.autoTapUses,
          maxTurboUses: currentState.boosts.maxTurboUses,
          maxRechargeUses: currentState.boosts.maxRechargeUses,
        };

        const updates: Partial<GameState> = { boosts: initialBoosts };
        let needsUpdate = false;

        // Reset turbo if 2 or fewer
        if (turboUses <= 2) {
          updates.boosts = {
            ...initialBoosts,
            inGameTurbo: 3,
            rewardedTurbo: 0,
          };
          needsUpdate = true;
        }

        // Reset recharge if 2 or fewer
        if (rechargeUses <= 2) {
          updates.boosts = {
            ...initialBoosts,
            inGameRecharge: 3,
            rewardedRecharge: 0,
          };
          needsUpdate = true;
        }

        if (needsUpdate) {
          await criticalStateUpdate(updates);
          localStorage.setItem("lastBoosterReset", now.toISOString());
        }
      }
    },
    [criticalStateUpdate]
  );

  // Modify handleBoosterRefill to include daily reset check
  const handleBoosterRefill = useCallback(
    async (updateCallback: (update: Partial<GameState>) => void) => {
      const now = Date.now();
      const storageKey = STORAGE_KEYS.USER;
      const currentState = JSON.parse(localStorage.getItem(storageKey) || "{}");

      // First check for daily reset
      await checkAndResetDailyBoosters(currentState);

      // Track if any updates were made to send to database
      const databaseUpdates: Partial<GameState> = {};

      // Check turbo refill
      const turboLastRefill = Number(
        localStorage.getItem("turboLastRefillTime")
      );
      if (turboLastRefill && now - turboLastRefill >= BOOSTER_REFILL_INTERVAL) {
        if (currentState.boosts?.inGameTurbo < MAX_BOOSTER_USES) {
          const turboUpdates = {
            boosts: {
              ...currentState.boosts,
              inGameTurbo: Math.min(
                (currentState.boosts?.inGameTurbo || 0) + 1,
                MAX_BOOSTER_USES
              ),
            },
          };
          updateCallback(turboUpdates);
          databaseUpdates.boosts = {
            ...(databaseUpdates.boosts || {}),
            ...(turboUpdates.boosts || {}),
          };
          localStorage.setItem("turboLastRefillTime", now.toString());
        } else {
          localStorage.removeItem("turboLastRefillTime");
        }
      }

      // Check recharge refill
      const rechargeLastRefill = Number(
        localStorage.getItem("rechargeLastRefillTime")
      );
      if (
        rechargeLastRefill &&
        now - rechargeLastRefill >= BOOSTER_REFILL_INTERVAL
      ) {
        if (currentState.boosts?.inGameRecharge < MAX_BOOSTER_USES) {
          const rechargeUpdates = {
            boosts: {
              ...currentState.boosts,
              inGameRecharge: Math.min(
                (currentState.boosts?.inGameRecharge || 0) + 1,
                MAX_BOOSTER_USES
              ),
            },
          };
          updateCallback(rechargeUpdates);
          databaseUpdates.boosts = {
            ...(databaseUpdates.boosts || {}),
            ...(rechargeUpdates.boosts || {}),
          };
          localStorage.setItem("rechargeLastRefillTime", now.toString());
        } else {
          localStorage.removeItem("rechargeLastRefillTime");
        }
      }

      // If any updates were made, update the database
      if (databaseUpdates.boosts) {
        await criticalStateUpdate(databaseUpdates);
      }
    },
    [criticalStateUpdate, checkAndResetDailyBoosters]
  );

  const calculateTapPower = useCallback((level: number) => {
    return level; // Direct correlation: level 1 = 1 coin, level 20 = 20 coins
  }, []);

  const purchaseUpgrade = useCallback(
    (upgradeType: string) => {
      const upgradeKey = (upgradeType.split("-")[0] +
        "Level") as keyof typeof gameState.upgrades;
      const currentLevel = gameState.upgrades[upgradeKey] as number;

      if (upgradeType === "energy-capacity") {
        if (currentLevel < 5) {
          const nextLevel = (currentLevel + 1) as 1 | 2 | 3 | 4 | 5;
          const config = energyCapacityConfig[nextLevel];

          const currentPercentage =
            gameState.FlameCapacityTap / gameState.RechargeLevel;
          const newEnergyValue = Math.round(
            config.capacity * currentPercentage
          );

          persistState((prev) => ({
            ...prev,
            energyCapacity: config.capacity,
            FlameCapacityTap: newEnergyValue,
            maxFlameCapacityTapRecharge: config.capacity,
            upgrades: {
              ...prev.upgrades,
              energyLevel: nextLevel,
            },
          }));
        }
      } else if (upgradeType === "tap") {
        // For tap power upgrades, we need to handle the autotap state
        const nextLevel = currentLevel + 1;

        // If autotap is not active, apply the upgrade immediately
        if (!gameState.autoTapActive) {
          persistState((prev) => ({
            ...prev,
            upgrades: {
              ...prev.upgrades,
              tapLevel: nextLevel,
            },
          }));
          gameToast.success(`Tap Power upgraded to level ${nextLevel}!`);
          return;
        }

        // Calculate remaining time for autotap
        const now = Date.now();
        const remainingTime = Math.max(
          0,
          (gameState.autoTapEndTime || 0) - now
        );
        const remainingSeconds = Math.ceil(remainingTime / 1000);

        // If autotap is active, store as pending upgrade to apply after autotap finishes
        persistState((prev) => ({
          ...prev,
          pendingTapUpgrade: nextLevel,
          upgrades: {
            ...prev.upgrades,
            // Keep the current tapLevel until autotap finishes
            tapLevel: prev.upgrades.tapLevel,
          },
        }));

        gameToast.info(
          `Tap Power upgrade will take effect in ${remainingSeconds} seconds after Auto Tap completes`
        );
      } else {
        persistState((prev) => ({
          ...prev,
          upgrades: {
            ...prev.upgrades,
            [upgradeKey]: currentLevel + 1,
          },
        }));
      }
    },
    [gameState, persistState]
  );

  // Add effect to handle pending tap power upgrade when autotap finishes
  useEffect(() => {
    if (!gameState.autoTapActive && gameState.pendingTapUpgrade) {
      // AutoTap has finished and we have a pending upgrade
      const pendingLevel = gameState.pendingTapUpgrade;

      // Small delay to ensure autotap completion is processed first
      setTimeout(() => {
        // Get the upgrade cost for the current level
        const currentLevel = gameState.upgrades?.tapLevel || 1;
        const upgradeCost = tapPowerConfig[currentLevel]?.upgradeCost || 0;

        persistState((prev) => ({
          ...prev,
          // Deduct the cost from the coins as it wasn't deducted during the purchase
          coins: prev.coins - upgradeCost,
          upgrades: {
            ...prev.upgrades,
            tapLevel: pendingLevel,
          },
          pendingTapUpgrade: undefined,
        }));

        // Notify user that the tap power upgrade has now been applied
        gameToast.success(
          `Tap Power upgrade to level ${pendingLevel} has been applied!`
        );
      }, 100);
    }
  }, [
    gameState.autoTapActive,
    gameState.pendingTapUpgrade,
    gameState.upgrades?.tapLevel,
    persistState,
  ]);

  const purchaseAutoTap = useCallback(async () => {
    if (gameState.coins >= AUTO_TAP_UNLOCK_COST) {
      try {
        await criticalStateUpdate({
          ...gameState,
          coins: gameState.coins - AUTO_TAP_UNLOCK_COST,
          application_state: {
            isAutotapPurchased: true,
            has_visited_earn_page: true,
            isAutotapActive: false,
          },
        });
        return true;
      } catch {
        toast.error("Failed to purchase autotap");
        return false;
      }
    }
    return false;
  }, [gameState, criticalStateUpdate]);

  // Add a listener for force refresh events (e.g., after autotap claim)
  useEffect(() => {
    const handleForceRefresh = () => {
      // Force a refresh of the game state by triggering a non-destructive update
      // This ensures the UI reflects the latest state immediately
      persistState((prev) => ({
        ...prev,
        // Add a timestamp to force React to recognize a state change
        _lastForceUpdate: Date.now(),
      }));
    };

    window.addEventListener("forceGameRefresh", handleForceRefresh);

    return () => {
      window.removeEventListener("forceGameRefresh", handleForceRefresh);
    };
  }, [persistState]);

  // Initialize character progression if needed
  const initializeCharacterProgressionState = useCallback(() => {
    if (!gameState.characterProgression) {
      const initialProgression = initializeCharacterProgression();
      setGameState((prevState) => ({
        ...prevState,
        characterProgression: {
          ...initialProgression,
          lastTypeCompletionTime: undefined,
        },
      }));
    }
  }, [gameState.characterProgression, setGameState]);

  // Update character progression tokens
  const updateCharacterProgressionTokens = useCallback(
    (tokensToAdd: number) => {
      if (!gameState.characterProgression) {
        initializeCharacterProgressionState();
        return;
      }

      const {
        tokenType,
        currentTokens,
        requiredTokens,
        currentStep,
        nextRotationTime,
      } = gameState.characterProgression;
      const progressionType = getProgressionType(tokenType);

      // Add tokens
      let newTokens = currentTokens + tokensToAdd;
      let newStep = currentStep;
      let newRequiredTokens = requiredTokens;

      // Check if we need to move to the next step
      if (newTokens >= requiredTokens) {
        // Apply rewards for current step
        const currentStepData = progressionType.steps[currentStep];
        const reward = currentStepData.reward;

        // Apply rewards
        if (reward.spark) {
          addCoins(reward.spark);
        }

        if (reward.spins) {
          updateSpins(reward.spins);
        }

        if (reward.turbo) {
          addBoosterUses("turbo", reward.turbo, true);
        }

        if (reward.recharge) {
          addBoosterUses("recharge", reward.recharge, true);
        }

        // Move to next step
        newStep = currentStep + 1;
        newTokens = 0;

        // Check if we've completed all steps
        if (newStep >= progressionType.steps.length) {
          // Check if type completion is allowed based on global rotation timer
          const now = Date.now();
          const timeUntilRotation = nextRotationTime - now;

          if (timeUntilRotation > 0) {
            // Type completion not allowed - stay on the last step and don't progress
            // Don't move to next step, don't change type, just stay where we are
            setGameState((prevState) => ({
              ...prevState,
              characterProgression: {
                tokenType,
                nextRotationTime,
                currentTokens: newTokens, // Keep the tokens but don't progress
                requiredTokens,
                currentStep: newStep - 1, // Stay on the last step
              },
            }));
            return;
          }

          // Type completion is allowed - proceed with type completion
          // We've reached the end - the ultimate reward is already awarded in the last step

          // Get the current global rotation info
          const {
            tokenType: globalTokenType,
            nextRotationTime: globalNextRotation,
          } = getGlobalRotationInfo();

          // Move to the next token type in the rotation or use the current global one
          const nextTokenType = globalTokenType;
          const nextProgressionType = getProgressionType(nextTokenType);

          // Reset to first step of the new token type
          newStep = 0;
          newRequiredTokens = nextProgressionType.steps[0].tokensRequired;

          setGameState((prevState) => ({
            ...prevState,
            characterProgression: {
              tokenType: nextTokenType,
              nextRotationTime: globalNextRotation,
              currentTokens: newTokens,
              requiredTokens: newRequiredTokens,
              currentStep: newStep,
            },
          }));
        } else {
          // Move to next step in current progression type
          newRequiredTokens = progressionType.steps[newStep].tokensRequired;

          setGameState((prevState) => ({
            ...prevState,
            characterProgression: {
              tokenType,
              nextRotationTime,
              currentTokens: newTokens,
              requiredTokens: newRequiredTokens,
              currentStep: newStep,
            },
          }));
        }
      } else {
        // Just update tokens without changing step
        setGameState((prevState) => ({
          ...prevState,
          characterProgression: {
            tokenType,
            nextRotationTime,
            currentTokens: newTokens,
            requiredTokens,
            currentStep,
          },
        }));
      }
    },
    [
      gameState.characterProgression,
      initializeCharacterProgressionState,
      addCoins,
      updateSpins,
      addBoosterUses,
      setGameState,
    ]
  );

  // Check if it's time to rotate character progression type
  const checkCharacterProgressionRotation = useCallback(() => {
    if (!gameState.characterProgression) {
      initializeCharacterProgressionState();
      return;
    }

    // Get the global rotation information
    const { tokenType: globalTokenType, nextRotationTime: globalNextRotation } =
      getGlobalRotationInfo();
    const { tokenType: currentTokenType } = gameState.characterProgression;

    // Check if we need to update to the global token type
    if (globalTokenType !== currentTokenType) {
      const progressionType = getProgressionType(globalTokenType);

      // Update to match the global rotation schedule
      // Reset lastTypeCompletionTime when moving to a new global token type
      setGameState((prevState) => ({
        ...prevState,
        characterProgression: {
          tokenType: globalTokenType,
          nextRotationTime: globalNextRotation,
          currentTokens: 0,
          requiredTokens: progressionType.steps[0].tokensRequired,
          currentStep: 0,
        },
      }));
    } else {
      // Just update the next rotation time if needed
      if (
        gameState.characterProgression.nextRotationTime !== globalNextRotation
      ) {
        setGameState((prevState) => ({
          ...prevState,
          characterProgression: {
            ...prevState.characterProgression!,
            nextRotationTime: globalNextRotation,
          },
        }));
      }
    }
  }, [
    gameState.characterProgression,
    setGameState,
    initializeCharacterProgressionState,
  ]);

  // Add initialization to an effect
  useEffect(() => {
    // Initialize character progression if needed
    initializeCharacterProgressionState();

    // Check for token type rotation
    checkCharacterProgressionRotation();

    // Set up interval to check for token rotation
    const rotationCheckInterval = setInterval(
      checkCharacterProgressionRotation,
      60000
    ); // Check every minute

    return () => {
      clearInterval(rotationCheckInterval);
    };
  }, [initializeCharacterProgressionState, checkCharacterProgressionRotation]);

  // Global recharge mechanism
  useEffect(() => {
    if (!mounted || !user_id) return;

    let lastIncrementTime = Date.now();
    let refillInterval: NodeJS.Timeout | null = null;
    let hasShownBoosterToast = false;

    // Define refill intervals based on recharge level (how fast refill happens)
    const REFILL_INTERVALS = {
      1: 2000, // 2 seconds for level 1
      2: 1000, // 1 second for level 2
      3: 500, // 500ms for level 3
    };

    const incrementRecharge = () => {
      if (gameState.boosts.rechargeActive) return;

      const now = Date.now();
      const rechargeLevel = Math.min(3, gameState.upgrades?.rechargeLevel || 1);
      const energyLevel = Math.min(40, gameState.upgrades?.energyLevel || 1);
      const rechargeSpeedValue =
        rechargeSpeedConfig[rechargeLevel as 1 | 2 | 3].rechargeSpeed;
      const energyConfig = getEnergyConfig(energyLevel);
      const currentRecharge = gameState.currentRecharge;

      // Get custom refill interval based on recharge level
      const customRefillInterval =
        REFILL_INTERVALS[rechargeLevel as keyof typeof REFILL_INTERVALS];

      // Check if booster is active from either localStorage or state
      const isBoosterActive =
        localStorage.getItem("rechargeBoosterActive") === "true" ||
        gameState.boosts.rechargeActive;

      // If booster is active, instantly set to max recharge
      // Also ensure this is a legitimate boost activation, not triggered by accidental rapid tapping at 0 energy
      if (
        isBoosterActive &&
        (currentRecharge > 0 ||
          localStorage.getItem("rechargeJustActivated") === "true")
      ) {
        // Make sure we don't repeatedly trigger this by checking if we've already maximized the recharge
        if (currentRecharge < energyConfig.maxRecharge) {
          persistState((prev) => ({
            ...prev,
            currentRecharge: energyConfig.maxRecharge,
            boosts: {
              ...prev.boosts,
              rechargeActive: false,
            },
          }));

          // Clear booster flags
          localStorage.removeItem("rechargeBoosterActive");
          localStorage.removeItem("rechargeJustActivated");
          // Clear the last recharge value cache to prevent issues
          localStorage.removeItem("lastRechargeValue");

          // Show booster toast
          if (!hasShownBoosterToast) {
            hasShownBoosterToast = true;
            gameToast.success(
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">
                  Recharge Booster Activated - Energy Refilled!
                </span>
              </div>
            );
          }
        } else {
          // Already at max, just clear the flags
          localStorage.removeItem("rechargeBoosterActive");
          localStorage.removeItem("rechargeJustActivated");
        }
        return;
      }

      // Only increment if enough time has passed since last increment
      const timeSinceLastIncrement = now - lastIncrementTime;
      if (timeSinceLastIncrement >= customRefillInterval) {
        if (currentRecharge < energyConfig.maxRecharge) {
          const newRecharge = Math.min(
            currentRecharge + rechargeSpeedValue,
            energyConfig.maxRecharge
          );

          persistState((prev) => ({
            ...prev,
            currentRecharge: Math.round(newRecharge),
          }));

          lastIncrementTime = now;
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
    mounted,
    user_id,
    gameState.upgrades?.rechargeLevel,
    gameState.upgrades?.energyLevel,
    gameState.currentRecharge,
    gameState.boosts.rechargeActive,
    persistState,
  ]);

  // Add a helper method for debugging level ups
  const debugTestLevelUp = useCallback(
    (targetLevel: number) => {
      // Calculate current level
      let currentLevel = 1;
      for (let i = 1; i <= 10; i++) {
        if (gameState.coins >= levelConfig[i].sparkRequired) {
          currentLevel = i;
        } else {
          break;
        }
      }

      if (targetLevel <= currentLevel) {
        return;
      }

      // Get level completion reward
      const levelReward = levelConfig[currentLevel].levelCompletionReward;

      // Force a database update immediately for level up
      criticalStateUpdate((prevDb) => {
        return {
          ...prevDb,
          coins: prevDb.coins + levelReward,
          level: targetLevel,
          stage: targetLevel,
          pendingLevelUp: false,
        };
      }).catch((_error) => {
        // Handle any potential errors from the criticalStateUpdate function
        console.error("Error in debugTestLevelUp:", _error);
      });

      // Show toast and animation
      setTimeout(() => {
        gameToast.reward(
          `Level ${targetLevel} reached\nLevel bonus ${levelReward.toLocaleString()}`,
          {
            duration: 5000,
            style: {
              zIndex: 9999,
            },
          }
        );
        if (showLevelUpAnimation) {
          showLevelUpAnimation(targetLevel);
        }
      }, 500);
      // Update state locally
      persistState((prev) => ({
        ...prev,
        level: targetLevel,
        stage: targetLevel,
        coins: prev.coins + levelReward,
      }));
    },
    [gameState.coins, criticalStateUpdate, persistState, showLevelUpAnimation]
  );

  // Function to ensure spinGoals are properly initialized
  const ensureSpinGoalsInitialized = (state: GameState): GameState => {
    // If spinGoals are empty or undefined, initialize them
    if (!state.spinGoals || state.spinGoals.length === 0) {
      // Create default spin goals for character tokens
      const defaultSpinGoals = [
        {
          id: 1,
          icon: "3", // Energy Can
          required: 10,
          collected: 0,
          reward: 5000,
          completed: false,
        },
        {
          id: 2,
          icon: "4", // Turbo
          required: 15,
          collected: 0,
          reward: 7500,
          completed: false,
        },
        {
          id: 3,
          icon: "8", // Phoenix
          required: 35,
          collected: 0,
          reward: 10000,
          completed: false,
        },
        {
          id: 4,
          icon: "11", // Phoenix II
          required: 50,
          collected: 0,
          reward: 25000,
          completed: false,
        },
      ];

      return {
        ...state,
        spinGoals: defaultSpinGoals,
      };
    }

    return state;
  };

  // Add this to the initialization logic in useEffect - but not dependent on gameState to avoid loops
  useEffect(() => {
    // This is a one-time initialization that should run once when the component mounts
    if (!gameState.spinGoals || gameState.spinGoals.length === 0) {
      const initializedState = ensureSpinGoalsInitialized({ ...gameState });

      // Update state with initialized spinGoals
      setGameState(initializedState);
    }
  }, [gameState]);

  // In the GameProvider component, add this useEffect to initialize spinGoals
  useEffect(() => {
    // This should run only once after initial state is loaded
    if (mounted && (!gameState.spinGoals || gameState.spinGoals.length === 0)) {
      // Create default spin goals for character tokens
      const defaultSpinGoals = [
        {
          id: 1,
          icon: "3", // Energy Can
          required: 10,
          collected: 0,
          reward: 5000,
          completed: false,
        },
        {
          id: 2,
          icon: "4", // Turbo
          required: 15,
          collected: 0,
          reward: 7500,
          completed: false,
        },
        {
          id: 3,
          icon: "8", // Phoenix
          required: 35,
          collected: 0,
          reward: 10000,
          completed: false,
        },
        {
          id: 4,
          icon: "11", // Phoenix II
          required: 50,
          collected: 0,
          reward: 25000,
          completed: false,
        },
      ];

      // Update state with initialized spinGoals
      setGameState((prevState) => ({
        ...prevState,
        spinGoals: defaultSpinGoals,
      }));
    }
  }, [mounted, gameState.spinGoals]);

  // Force refresh from database
  const forceRefreshFromDatabase = useCallback(async () => {
    if (!user_id) {
      return false;
    }

    try {
      if (!supabase) {
        console.error("Supabase client not available");
        return false;
      }

      const { data: userData, error: _error } = await supabase!
        .from("telegram_users")
        .select("game_state")
        .eq("user_id", user_id.toString())
        .single();

      if (_error) {
        toast.error("Failed to refresh game data");
        return false;
      }

      if (userData?.game_state) {
        const dbState = transformOldStateToNew(userData.game_state);

        // Update state with database values
        const newState = {
          ...dbState,
          gameVersion: CURRENT_GAME_VERSION,
          lastUpdate: Date.now(),
        };

        // Update local state and localStorage
        setGameState(newState);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newState));

        toast.success("Game data refreshed");
        return true;
      } else {
        toast.error("No game data found");
        return false;
      }
    } catch {
      toast.error("Failed to refresh game data");
      return false;
    }
  }, [user_id, transformOldStateToNew]);

  // Add function to update spin progression
  const updateSpinProgression = useCallback(
    (spinProgressionData: GameState["spinProgression"]) => {
      if (!spinProgressionData) return;

      // Only update via criticalStateUpdate to avoid infinite loops
      criticalStateUpdate((prev) => ({
        ...prev,
        spinProgression: spinProgressionData,
        gameVersion: CURRENT_GAME_VERSION,
        lastUpdate: Date.now(),
      })).catch((error) => {
        // Handle any potential errors from the criticalStateUpdate function
        console.error("Error updating spin progression:", error);
      });
    },
    [criticalStateUpdate]
  );

  // Final value object
  const value = useMemo(
    () => ({
      gameState,
      setGameState,
      persistState,
      addBoosterUses,
      addCoins,
      calculateNextRefillTime,
      decreaseEnergy,
      decreaseSpins,
      formatRefillTime,
      getBoosterState,
      getCurrentLevelConfig,
      increaseCoins,
      increaseSpins,
      purchaseItem,
      purchaseUpgrade,
      resetGame,
      setBoosterActive,
      setBoosterEndTime,
      setBoosterRefillTime,
      updateBoosts,
      updateEnergy,
      updateSpins,
      updateLevel,
      updateTaps,
      handleBoosterRefill,
      calculateTapPower,
      energyCapacityConfig,
      setIsSpinning,
      startAutoSpin,
      stopAutoSpin,
      isAutoSpinning: isAutoSpinningRef.current,
      criticalStateUpdate,
      isSpinning,
      spinTimer: gameState.spinTimer,
      spinLimit: gameState.spinLimit,
      formatTime,
      calculateTotalCoins,
      calculateAutoTapDuration,
      calculateTotalCoinsWithTurbo,
      turboActive: gameState.boosts.turboActive,
      setTurboActive: (active: boolean) => setBoosterActive("turbo", active),
      rechargeActive: gameState.boosts.rechargeActive,
      setRechargeActive: (active: boolean) =>
        setBoosterActive("recharge", active),
      setTurboTimeLeft: (timeLeft: number) =>
        persistState((prev) => ({
          ...prev,
          boosts: { ...prev.boosts, turboTimeLeft: timeLeft },
        })),
      setRechargeTimeLeft: (timeLeft: number) =>
        persistState((prev) => ({
          ...prev,
          boosts: { ...prev.boosts, rechargeTimeLeft: timeLeft },
        })),
      autoTapActive: Boolean(gameState.autoTapActive),
      autoTapTimeLeft: gameState.autoTapTimeLeft || 0,
      autoTapProgress: gameState.autoTapProgress || 0,
      purchaseAutoTap,
      timers,
      setPhoenixEnergyFrozen: (frozen: boolean) =>
        persistState((prev) => ({
          ...prev,
          phoenixEnergyFrozen: frozen,
        })),
      initializeCharacterProgressionState,
      updateCharacterProgressionTokens,
      checkCharacterProgressionRotation,
      // Add spin progression update function
      updateSpinProgression,
      // Add the debug method to the context
      _debug: {
        testLevelUp: debugTestLevelUp,
      },
      // Add our new function
      forceRefreshFromDatabase,
      // Add functions to check type completion status
      isTypeCompletionAllowed: () => {
        // Get the current global rotation info to determine the current running type
        const { tokenType: currentRunningType } = getGlobalRotationInfo();

        // Check if the user is currently on the same type as the global rotation
        if (gameState.characterProgression?.tokenType !== currentRunningType) {
          // User is not on the current running type, so no restriction applies
          return true;
        }

        // User is on the current running type, now check if they've completed all steps
        const progressionType = getProgressionType(currentRunningType);
        const isOnLastStep =
          gameState.characterProgression.currentStep >=
          progressionType.steps.length - 1;

        if (!isOnLastStep) {
          // User hasn't completed all steps yet, so no restriction applies
          return true;
        }

        // User has completed all steps in the current running type
        // Check if they have already completed this type (received reward and marked as completed)
        if (
          gameState.spinProgression?.lastCompletedType === currentRunningType
        ) {
          // User has already completed this type, so restrict further progress until timer expires
          if (!gameState.characterProgression?.nextRotationTime) {
            return false; // Restrict if no rotation time is set
          }

          const now = Date.now();
          const timeUntilRotation =
            gameState.characterProgression.nextRotationTime - now;

          // Allow progression to next type only if the global rotation timer has completed
          return timeUntilRotation <= 0;
        }

        // User hasn't completed this type yet, so no restriction applies
        return true;
      },
      getTimeUntilNextTypeCompletion: () => {
        // Get the current global rotation info to determine the current running type
        const { tokenType: currentRunningType } = getGlobalRotationInfo();

        // Check if the user is currently on the same type as the global rotation
        if (gameState.characterProgression?.tokenType !== currentRunningType) {
          // User is not on the current running type, so no timer applies
          return { hours: 0, minutes: 0, seconds: 0, total: 0 };
        }

        // User is on the current running type, now check if they've completed all steps
        const progressionType = getProgressionType(currentRunningType);
        const isOnLastStep =
          gameState.characterProgression.currentStep >=
          progressionType.steps.length - 1;

        if (!isOnLastStep) {
          // User hasn't completed all steps yet, so no timer applies
          return { hours: 0, minutes: 0, seconds: 0, total: 0 };
        }

        // User has completed all steps in the current running type
        // Check if they have already completed this type (received reward and marked as completed)
        if (
          gameState.spinProgression?.lastCompletedType === currentRunningType
        ) {
          // User has already completed this type, return the global rotation timer
          if (!gameState.characterProgression?.nextRotationTime) {
            return { hours: 0, minutes: 0, seconds: 0, total: 0 };
          }

          const now = Date.now();
          const timeLeft = Math.max(
            0,
            gameState.characterProgression.nextRotationTime - now
          );

          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor(
            (timeLeft % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

          return { hours, minutes, seconds, total: timeLeft };
        }

        // User hasn't completed this type yet, so no timer applies
        return { hours: 0, minutes: 0, seconds: 0, total: 0 };
      },
    }),
    [
      gameState,
      updateSpinProgression,
      setGameState,
      persistState,
      addBoosterUses,
      addCoins,
      calculateNextRefillTime,
      decreaseEnergy,
      decreaseSpins,
      formatRefillTime,
      getBoosterState,
      getCurrentLevelConfig,
      increaseCoins,
      increaseSpins,
      purchaseItem,
      purchaseUpgrade,
      resetGame,
      setBoosterActive,
      setBoosterEndTime,
      setBoosterRefillTime,
      updateBoosts,
      updateEnergy,
      updateSpins,
      updateLevel,
      updateTaps,
      handleBoosterRefill,
      calculateTapPower,
      isSpinning,
      setIsSpinning,
      startAutoSpin,
      stopAutoSpin,

      criticalStateUpdate,
      formatTime,
      calculateTotalCoins,
      calculateAutoTapDuration,
      calculateTotalCoinsWithTurbo,
      purchaseAutoTap,
      timers,
      initializeCharacterProgressionState,
      updateCharacterProgressionTokens,
      checkCharacterProgressionRotation,
      debugTestLevelUp,
      forceRefreshFromDatabase,
    ]
  );

  if (!mounted) {
    return null;
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// Hook for consuming the context
export const useGame = (): GameContextType => {
  const context = useContext(GameContext);

  // Check if we're on a Nexus route and handle gracefully
  if (!context) {
    if (
      typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/nexus") ||
        window.location.pathname === "/nexuslogin")
    ) {
      console.warn(
        "useGame called on Nexus route without GameProvider, returning null context"
      );
      // Return a safe default context for Nexus routes
      return {
        gameState: {
          user_id: "",
          coins: 0,
          spins: 0,
          totalSpins: 0,
          totalCoins: 0,
          tapPower: 1,
          level: 1,
          stage: 1,
          FlameCapacityTap: 1,
          minPhoenixEnergy: 0,
          RechargeLevel: 1,
          currentRecharge: 0,
          phoenixEnergyProgress: 0,
          energyCapacity: 100,
          spinLevel: 1,
          isSpinning: false,
          spinTimer: 0,
          spinLimit: 0,
          gameVersion: "1.0.0",
          lastUpdate: Date.now(),
          spinGoals: [],
          boosts: {
            inGameTurbo: 0,
            rewardedTurbo: 0,
            inGameRecharge: 0,
            rewardedRecharge: 0,
            turboActive: false,
            rechargeActive: false,
            autoTapUses: 0,
            turboTimeLeft: 0,
            rechargeTimeLeft: 0,
            turboRefillTime: 0,
            rechargeRefillTime: 0,
            maxTurboUses: 0,
            maxRechargeUses: 0,
          },
          upgrades: {
            tapLevel: 1,
            energyLevel: 1,
            rechargeLevel: 1,
            spinLevel: 1,
          },
          progress: {
            daily: {
              streak: 0,
              lastDay: 0,
            },
            social: {
              x: [],
              youtube: [],
              telegram: [],
            },
          },
          characterProgress: {
            currentCharacter: "",
            currentTokens: 0,
            requiredTokens: 0,
          },
          dailyRewards: {
            lastCollected: "",
            currentStreak: 0,
            maxStreak: 0,
            lastDay: 0,
            collectedDays: {},
          },
          socialTasks: {},
          autoTapDaily: {
            lastReset: "",
            usesRemaining: 0,
          },
          timers: {
            turboTimeLeft: 0,
            rechargeTimeLeft: 0,
            turboRefillTime: 0,
            rechargeRefillTime: 0,
          },
          autoTapCoins: 0,
          autoTapTotalCoins: 0,
          autoTapClaimed: false,
          autoTapEndTime: 0,
          autoTapStartTime: 0,
          autoTapActive: false,
          autoTapTimeLeft: 0,
          autoTapSpark: 0,
          autoTapProgress: 0,
          lastAutoTapUpdate: 0,
        },
        setGameState: () => {},
        persistState: () => {},
        addBoosterUses: () => {},
        addCoins: () => {},
        calculateNextRefillTime: () => 0,
        decreaseEnergy: () => {},
        decreaseSpins: () => {},
        formatRefillTime: () => "",
        getBoosterState: () => ({ active: false, timeLeft: 0, refillTime: 0 }),
        getCurrentLevelConfig: () => ({ sparkRequired: 0, rewardCoins: 0 }),
        increaseCoins: () => {},
        increaseSpins: () => {},
        purchaseItem: () => false,
        purchaseUpgrade: () => {},
        resetGame: () => {},
        setBoosterActive: () => {},
        setBoosterEndTime: () => {},
        setBoosterRefillTime: () => {},
        updateBoosts: () => {},
        updateEnergy: () => {},
        updateSpins: () => {},
        updateLevel: () => {},
        updateTaps: () => {},
        handleBoosterRefill: () => {},
        calculateTapPower: () => 1,
        energyCapacityConfig: {} as any,
        setIsSpinning: () => {},
        startAutoSpin: () => {},
        stopAutoSpin: () => {},
        isAutoSpinning: false,
        criticalStateUpdate: async () => {},
        isSpinning: false,
        spinTimer: 0,
        spinLimit: 0,
        formatTime: () => "",
        calculateTotalCoins: () => 0,
        calculateAutoTapDuration: () => 0,
        calculateTotalCoinsWithTurbo: () => 0,
        turboActive: false,
        setTurboActive: () => {},
        rechargeActive: false,
        setRechargeActive: () => {},
        setTurboTimeLeft: () => {},
        setRechargeTimeLeft: () => {},
        autoTapActive: false,
        autoTapTimeLeft: 0,
        autoTapProgress: 0,
        purchaseAutoTap: async () => false,
        timers: {
          spin: undefined,
          autoTap: undefined,
          turbo: undefined,
        },
        setPhoenixEnergyFrozen: () => {},
        initializeCharacterProgressionState: () => {},
        updateCharacterProgressionTokens: () => {},
        checkCharacterProgressionRotation: () => {},
        updateSpinProgression: () => {},
        _debug: {
          testLevelUp: () => {},
        },
        forceRefreshFromDatabase: async () => false,
        isTypeCompletionAllowed: () => false,
        getTimeUntilNextTypeCompletion: () => ({
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
        }),
      };
    }
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};

// After the other exports, add a re-export for TimerType
export { TimerType };
