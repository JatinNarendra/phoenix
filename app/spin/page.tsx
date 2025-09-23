"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useProgression } from "../context/ProgressionContext";
import SpinBackground from "../../public/assets/SpinBackground.png";
import { useGame } from "../context/GameContext";
import "./spin.css";
import { useRouter } from "next/navigation";
import { useWebApp } from "../hooks/useWebApp";
import Tooltip from "../components/ui/Tooltip";
import { GameState, TimerType, TimerState } from "../types/gameTypes";
import timerService from "../services/timerService";
import { useGameFeatures } from "../context/GameFeaturesContext";

// Import separated components and utilities
import RotatingBackground from "./RotatingBackground";
import ProgressionBar from "./ProgressionBar";
import SpinsDisplay from "./SpinsDisplay";
import CoinsAndSpin from "../components/CoinsAndSpin";
import {
  SYMBOLS,
  REWARDS,
  SPIN_LEVELS,
  formatCompactNumber,
  type Reward,
  type AggregatedRewards,
  type RewardKey,
} from "./spinConstants";
import {
  generateReel,
  generateReelForMultiSpin,
  checkWinnerForReels,
} from "./spinLogic";

// Separated components and utilities are imported above
// CSS styles are now in ./spin.css file

const SpinPage = () => {
  const {
    updateProgressWithTokens,
    state,
    clearStepCompletion,
    clearTypeCompletion,
    hasPendingRewards,
    getTimeUntilNextTypeCompletion,
    getGlobalRotationInfo,
    getProgressionType,
  } = useProgression();
  const {
    gameState,
    increaseCoins,
    criticalStateUpdate,
    isTypeCompletionAllowed,
  } = useGame();
  const {
    timers: { timers: activeTimers },
  } = useGameFeatures();
  const [reels, setReels] = useState<number[][]>(() => [
    generateReel(),
    generateReel(),
    generateReel(),
  ]);
  const [spinning, setSpinning] = useState(false);
  const [spinningReels, setSpinningReels] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [stoppingReels, setStoppingReels] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [winner, setWinner] = useState(false);
  const [, setWinningCombination] = useState<RewardKey | null>(null);
  const [prize, setPrize] = useState<Reward | null>(null);
  const [spinLevel, setSpinLevel] = useState<number>(1);
  const [displaySpinLevel, setDisplaySpinLevel] = useState<number>(1);
  const [showRewardOverlay, setShowRewardOverlay] = useState(false);

  // New state for aggregated results
  const [aggregatedRewards, setAggregatedRewards] = useState<AggregatedRewards>(
    {
      sparkcoins: 0,
      spins: 0,
      turbo: 0,
      recharge: 0,
      sparkytokens: 0,
    }
  );

  // New state for final combined rewards (includes all sources)
  const [finalCombinedRewards, setFinalCombinedRewards] =
    useState<AggregatedRewards>({
      sparkcoins: 0,
      spins: 0,
      turbo: 0,
      recharge: 0,
      sparkytokens: 0,
    });

  const [displayRewards, setDisplayRewards] = useState<AggregatedRewards>({
    sparkcoins: 0,
    spins: 0,
    turbo: 0,
    recharge: 0,
    sparkytokens: 0,
  });

  // Note: typeCompletionReward state removed as it's no longer used in display calculations

  const [isMultiSpin, setIsMultiSpin] = useState(false);

  // New state for button press
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [showPressedState, setShowPressedState] = useState(false);

  // Add auto-spin state variables
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);
  const [progressInterval, setProgressInterval] =
    useState<NodeJS.Timeout | null>(null);

  // Add long press detection refs
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const touchStartTimeRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Add a state variable to track the last update time for UI updates
  const [, setLastUpdateTime] = useState<number>(Date.now());

  // Add a ref to track the latest UI state
  const latestStateRef = useRef<{
    spins: number;
    coins: number;
    spinLevel?: number;
    spinProcessAppliedRewards?: string | null;
  }>({
    spins: gameState.spins,
    coins: gameState.coins,
    spinLevel: gameState.spinLevel || 1,
    spinProcessAppliedRewards: null,
  });

  // Ref to track if we've already processed the current win
  const processedWinRef = useRef(false);

  // Ref to track if this is the initial page load
  const initialLoadRef = useRef(true);

  // Ref to track if we've already processed the current step completion
  const processedStepCompletionRef = useRef<string | null>(null);

  // Add this after the other useRef declarations
  const aggregatedRewardsRef = useRef<AggregatedRewards>({
    sparkcoins: 0,
    spins: 0,
    turbo: 0,
    recharge: 0,
    sparkytokens: 0,
  });

  // Debug state for tracking spin outcomes
  const [debugData, setDebugData] = useState<
    Array<{
      spinNumber: number;
      symbols: string[];
      winningCombo: string | null;
      reward: {
        type: string;
        amount: number;
      } | null;
      sparkytokens: number;
    }>
  >([]);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);

  // Timer state variables - Unified with global rotation timer
  const [timeUntilGlobalRotation, setTimeUntilGlobalRotation] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  // Get global rotation info
  const { tokenType: globalTokenType } = getGlobalRotationInfo();

  // Always use global type - no personal progression
  const currentGlobalType = globalTokenType;

  // Add a new state variable after other state declarations (around line 60)
  const [isChangingSpinLevel, setIsChangingSpinLevel] = useState(false);

  // Update type completion timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      // Always show time until next type completion is allowed
      const timeUntilNext = getTimeUntilNextTypeCompletion();
      setTimeUntilGlobalRotation(timeUntilNext);
    }, 1000);

    return () => clearInterval(timer);
  }, [
    getTimeUntilNextTypeCompletion,
    isTypeCompletionAllowed,
    gameState.characterProgression,
    gameState.spinProgression,
    currentGlobalType,
  ]);

  // Effect to initialize spinLevel from gameState
  useEffect(() => {
    if (gameState.spinLevel) {
      // Find the index in SPIN_LEVELS array
      const initialIndex = SPIN_LEVELS.indexOf(gameState.spinLevel);
      const validIndex = initialIndex !== -1 ? initialIndex : 0;
      const validLevel = SPIN_LEVELS[validIndex];

      // Update all state variables and refs consistently
      setSpinLevel(validLevel);
      setDisplaySpinLevel(validLevel);
      latestStateRef.current.spinLevel = validLevel;

      // Ensure DOM is updated on initial load
      setTimeout(() => {
        const spinLevelElement = document.querySelector(".spin-level-display");
        if (spinLevelElement) {
          spinLevelElement.textContent = `${validLevel}x`;
        }
      }, 0);
    }
  }, [gameState.spinLevel]);

  // Effect to ensure displaySpinLevel is always in sync with spinLevel
  useEffect(() => {
    // Update the display to match the state
    setDisplaySpinLevel(spinLevel);

    // Also update our ref to match
    latestStateRef.current.spinLevel = spinLevel;

    // Reset all reward states when spin level changes
    setLastReward({
      sparkcoins: 0,
      spins: 0,
      turbo: 0,
      recharge: 0,
      sparkytokens: 0,
    });
    setShowRewardOverlay(false);
    setShowRewardAnimations(false);
    setRewardDisplay({
      amount: 0,
      visible: false,
    });
    setAggregatedRewards({
      sparkcoins: 0,
      spins: 0,
      turbo: 0,
      recharge: 0,
      sparkytokens: 0,
    });
    setWinner(false);
    setWinningCombination(null);
    setPrize(null);
    processedWinRef.current = false;
    // Note: typeCompletionReward state removed
    // Reset other completion-related refs
    processedStepCompletionRef.current = null;
    appliedStepRewardsRef.current = null;
  }, [spinLevel]);

  // Effect to update DOM when displaySpinLevel changes
  useEffect(() => {
    // Update DOM to match the display state
    const spinLevelElement = document.querySelector(".spin-level-display");
    if (spinLevelElement) {
      spinLevelElement.textContent = `${displaySpinLevel}x`;
    }
  }, [displaySpinLevel]);

  // Effect to update latestStateRef when gameState changes
  useEffect(() => {
    // Update our local ref with the latest values from gameState
    if (gameState.coins !== undefined) {
      latestStateRef.current.coins = gameState.coins;
    }

    if (gameState.spins !== undefined) {
      latestStateRef.current.spins = gameState.spins;
    }

    if (gameState.spinLevel !== undefined) {
      latestStateRef.current.spinLevel = gameState.spinLevel;
    }

    // Force a re-render to update UI components
    setLastUpdateTime(Date.now());
  }, [gameState.spins, gameState.coins, gameState.spinLevel]);

  const getSymbol = useCallback(
    (reelIndex: number, itemIndex: number) => {
      const symbolIndex = reels[reelIndex]?.[itemIndex];
      if (symbolIndex >= 0 && symbolIndex < SYMBOLS.length) {
        return SYMBOLS[symbolIndex];
      }
      return null;
    },
    [reels]
  );

  const checkWinner = useCallback(() => {
    if (!reels[0]?.length || !reels[1]?.length || !reels[2]?.length) return;

    const symbols = reels.map((reel, index) => {
      const symbol = getSymbol(index, 1);
      return symbol ? symbol.id : "";
    });

    const symbolCounts: Record<string, number> = {};
    const uniqueSymbols = new Set<string>();

    symbols.forEach((symbol) => {
      symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
      uniqueSymbols.add(symbol);
    });

    let winningCombo: RewardKey | null = null;
    let newPrize: Reward | null = null;

    // First check for 3 of a kind
    if (Object.values(symbolCounts).some((count) => count === 3)) {
      // We have 3 of the same symbol
      for (const [symbolId, count] of Object.entries(symbolCounts)) {
        if (count === 3) {
          const combo = `3${symbolId}` as RewardKey;
          if (combo in REWARDS) {
            winningCombo = combo;
            newPrize = REWARDS[combo];
            break;
          }
        }
      }
    }
    // Special case: Check for "Treasure Trove + Sparky Token + Treasure Trove"
    else if (
      symbolCounts["treasuretrove"] === 2 &&
      symbolCounts["sparkytoken"] === 1
    ) {
      winningCombo = "1sparkytoken";
      newPrize = REWARDS[winningCombo];
    }
    // Special case: Check for "Sparky Token + Treasure Box + Sparky Token"
    else if (
      symbolCounts["sparkytoken"] === 2 &&
      symbolCounts["treasurebox"] === 1
    ) {
      winningCombo = "2sparkytoken-special";
      newPrize = REWARDS[winningCombo];
    }
    // Then check for 2 of a kind with treasuretrove or treasurebox
    else if (symbolCounts["treasuretrove"] === 2) {
      winningCombo = "2trove";
      newPrize = REWARDS[winningCombo];
    } else if (symbolCounts["treasurebox"] === 2) {
      if (symbolCounts["sparkytoken"] === 1) {
        winningCombo = "1sparkytoken";
        newPrize = REWARDS[winningCombo];
      } else {
        winningCombo = "2box";
        newPrize = REWARDS[winningCombo];
      }
    }
    // Then check for special combinations that take precedence over other 2 of a kind
    else if (
      (symbolCounts["treasuretrove"] === 1 &&
        symbolCounts["treasurebox"] === 2) ||
      (symbolCounts["treasuretrove"] === 2 && symbolCounts["treasurebox"] === 1)
    ) {
      winningCombo = "treasuretrove-treasurebox-other";
      newPrize = REWARDS[winningCombo];
    }
    // Then check for sparkytoken combinations
    else if (symbolCounts["sparkytoken"] === 1) {
      winningCombo = "1sparkytoken";
      newPrize = REWARDS[winningCombo];
    }
    // Then check for other 2 of a kind
    else if (Object.values(symbolCounts).some((count) => count === 2)) {
      // We have 2 of the same symbol
      for (const [symbolId, count] of Object.entries(symbolCounts)) {
        if (count === 2) {
          // Normal case: check for regular 2 of a kind
          const combo = `2${symbolId}` as RewardKey;
          if (combo in REWARDS) {
            winningCombo = combo;
            newPrize = REWARDS[combo];
            break;
          }
        }
      }
    }
    // Check for remaining sparkytoken combinations
    if (!winningCombo) {
      if (symbolCounts["sparkytoken"] === 2) {
        winningCombo = "2sparkytoken";
        newPrize = REWARDS[winningCombo];
      } else if (symbolCounts["sparkytoken"] === 3) {
        winningCombo = "3sparkytoken";
        newPrize = REWARDS[winningCombo];
      }
    }
    // Then check for other special combinations
    if (!winningCombo) {
      // Exclusive check for treasuretrove-turbo-spin
      if (
        uniqueSymbols.size === 3 &&
        symbolCounts["treasuretrove"] === 1 &&
        symbolCounts["turbo"] === 1 &&
        symbolCounts["spin"] === 1
      ) {
        winningCombo = "treasuretrove-turbo-spin";
        newPrize = REWARDS[winningCombo];
      }
      // Exclusive check for treasuretrove-recharge-spin
      if (
        !winningCombo &&
        uniqueSymbols.size === 3 &&
        symbolCounts["treasuretrove"] === 1 &&
        symbolCounts["recharge"] === 1 &&
        symbolCounts["spin"] === 1
      ) {
        winningCombo = "treasuretrove-recharge-spin";
        newPrize = REWARDS[winningCombo];
      }
      // Exclusive check for treasurebox-turbo-recharge
      if (
        !winningCombo &&
        uniqueSymbols.size === 3 &&
        symbolCounts["treasurebox"] === 1 &&
        symbolCounts["turbo"] === 1 &&
        symbolCounts["recharge"] === 1
      ) {
        winningCombo = "treasurebox-turbo-recharge";
        newPrize = REWARDS[winningCombo];
      }
      // If no special combination, check for any3 (only if no sparkytoken present and not 2 treasurebox)
      if (
        !winningCombo &&
        uniqueSymbols.size === 3 &&
        !uniqueSymbols.has("sparkytoken") &&
        symbolCounts["treasurebox"] !== 2
      ) {
        winningCombo = "any3";
        newPrize = REWARDS[winningCombo];
      }
    }

    return { winningCombo, newPrize };
  }, [reels, getSymbol]);

  // Effect to handle winning state and token addition
  useEffect(() => {
    // Skip if we're still spinning or if we've already processed this win
    if (spinning || processedWinRef.current) return;

    // Skip this effect for multi-spin mode as we handle it in the spin function
    if (isMultiSpin) return;

    // Skip on initial page load
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    // Only process token addition when there's an actual win from spinning
    // This prevents token progression when just changing spin level
    if (!spinning && reels[0]?.length && reels[1]?.length && reels[2]?.length) {
      const result = checkWinner();
      if (!result) {
        processedWinRef.current = false;
        return;
      }

      const { winningCombo, newPrize } = result;

      if (winningCombo && newPrize) {
        // Only set winner to true for single spins and when actually spinning (not just changing levels)
        if (spinLevel === 1 && !isButtonPressed) {
          setWinner(true);
        }
        setWinningCombination(winningCombo);
        setPrize(newPrize);

        // Mark as processed to prevent multiple updates
        processedWinRef.current = true;

        // Update the reward display if it's a sparkcoins prize and not just changing levels
        if (newPrize.type === "sparkcoins" && !isButtonPressed) {
          setRewardDisplay({
            amount: newPrize.amount,
            visible: true,
          });
        }
      } else {
        setWinner(false);
        setWinningCombination(null);
        setPrize(null);
        processedWinRef.current = false;
      }
    }
  }, [spinning, reels, checkWinner, spinLevel, isMultiSpin, isButtonPressed]);

  // Reset the processed flag when spinning starts
  useEffect(() => {
    if (spinning) {
      processedWinRef.current = false;
    }
  }, [spinning]);

  useEffect(() => {
    // Reset winner state on mount to prevent overlay from showing
    setWinner(false);
    setShowRewardOverlay(false);
    setShowRewardAnimations(false);

    // Reset initialLoadRef when component unmounts
    return () => {
      initialLoadRef.current = true;
    };
  }, []);

  // New state for last reward
  const [lastReward, setLastReward] = useState<{
    sparkcoins: number;
    spins: number;
    turbo: number;
    recharge: number;
    sparkytokens: number;
  }>({
    sparkcoins: 0,
    spins: 0,
    turbo: 0,
    recharge: 0,
    sparkytokens: 0,
  });

  // New state for persistent reward display
  const [rewardDisplay, setRewardDisplay] = useState<{
    amount: number;
    visible: boolean;
  }>({
    amount: 0,
    visible: false,
  });

  // Effect to update reward display when prize changes
  useEffect(() => {
    if (prize && prize.type === "sparkcoins" && prize.amount > 0) {
      // Exclude all sparkcoin rewards from display - users will still receive them but won't see them in animation
      setRewardDisplay({
        amount: 0,
        visible: false,
      });
    }
  }, [prize]);

  // Function to apply progression rewards to game state - wrap in useCallback
  const applyRewards = useCallback(async () => {
    // Get current earned rewards to avoid dependency issues
    const currentEarnedRewards = state.earnedRewards;

    // Apply the rewards to the game state
    if (currentEarnedRewards.sparkcoins > 0) {
      increaseCoins(currentEarnedRewards.sparkcoins);
    }

    if (currentEarnedRewards.spins > 0) {
      console.log("[SPIN DEBUG] Applying step completion spins:", {
        currentSpins: gameState.spins,
        earnedSpins: currentEarnedRewards.spins,
        newSpins: gameState.spins + currentEarnedRewards.spins,
        timestamp: new Date().toISOString(),
      });
      await criticalStateUpdate((prev) => ({
        ...prev,
        spins: prev.spins + currentEarnedRewards.spins,
      }));
    }

    if (currentEarnedRewards.turbo > 0) {
      await criticalStateUpdate((prev) => ({
        ...prev,
        boosts: {
          ...prev.boosts,
          rewardedTurbo:
            (prev.boosts.rewardedTurbo || 0) + currentEarnedRewards.turbo,
        },
      }));
    }

    if (currentEarnedRewards.recharge > 0) {
      await criticalStateUpdate((prev) => ({
        ...prev,
        boosts: {
          ...prev.boosts,
          rewardedRecharge:
            (prev.boosts.rewardedRecharge || 0) + currentEarnedRewards.recharge,
        },
      }));
    }

    // Update last reward for display
    setLastReward({
      sparkcoins: currentEarnedRewards.sparkcoins,
      spins: currentEarnedRewards.spins,
      turbo: currentEarnedRewards.turbo,
      recharge: currentEarnedRewards.recharge,
      sparkytokens: 0,
    });

    // Clear the rewards after applying them
    clearStepCompletion();
  }, [
    increaseCoins,
    criticalStateUpdate,
    setLastReward,
    clearStepCompletion,
    gameState.spins,
    state.earnedRewards,
  ]);

  // Watch for step completions
  useEffect(() => {
    // Don't process step completions during spinning to prevent race conditions
    if (spinning) {
      return;
    }

    if (state.lastCompletedStep) {
      // Create a unique key for this step
      const stepKey = `${state.lastCompletedStep.type}-${state.lastCompletedStep.step}`;

      // Only process if this is a new step
      if (lastProcessedStepRef.current !== stepKey) {
        lastProcessedStepRef.current = stepKey;

        // Don't clear step completion immediately as it also clears lastCompletedType
        // Instead, just handle the rewards and let the type completion status persist

        // Check if a type was completed
        if (state.lastCompletedType !== null) {
          // Only set type completion reward when a step is completed AND it's the last step in the type
          // This is determined by checking if the currentType has changed from what was completed
          if (state.currentType !== state.lastCompletedType) {
            // Check if we've already processed this type completion reward
            if (
              processedTypeCompletionRef.current !== state.lastCompletedType
            ) {
              // Note: typeCompletionReward state removed - no longer needed for display
              // Mark this type as processed to prevent duplicate rewards
              processedTypeCompletionRef.current = state.lastCompletedType;
            } else {
              // Type completion reward already processed
            }
          } else {
            // Note: typeCompletionReward state removed
          }
        } else {
          // Note: typeCompletionReward state removed
        }

        // Clear only the step completion rewards after they've been processed
        // but preserve the lastCompletedType
        // IMPORTANT: Only apply rewards if they haven't been applied during the spin process
        if (hasPendingRewards() && appliedStepRewardsRef.current !== stepKey) {
          console.log("[SPIN DEBUG] Step completion effect triggered:", {
            stepKey,
            earnedRewards: state.earnedRewards,
            timestamp: new Date().toISOString(),
          });

          // Check if we're currently in a spin process that has already applied these rewards
          // If the spin process has already applied the rewards, we should not apply them again
          const spinProcessAppliedRewards =
            latestStateRef.current.spinProcessAppliedRewards;
          console.log(
            "[SPIN DEBUG] Step completion effect checking for duplicate application:",
            {
              stepKey,
              spinProcessAppliedRewards,
              willSkip:
                spinProcessAppliedRewards &&
                spinProcessAppliedRewards === stepKey,
              timestamp: new Date().toISOString(),
            }
          );

          if (
            spinProcessAppliedRewards &&
            spinProcessAppliedRewards === stepKey
          ) {
            console.log(
              "[SPIN DEBUG] Step completion rewards already applied during spin process, skipping duplicate application"
            );
            // Mark this step's rewards as applied to prevent duplicate application
            appliedStepRewardsRef.current = stepKey;
            // Clear the flag since we've handled it
            latestStateRef.current.spinProcessAppliedRewards = null;
            // Clear the step completion rewards since they were already applied during spin
            clearStepCompletion();
          } else if (!spinning) {
            // Only apply rewards if not currently spinning to prevent race conditions
            // Apply rewards first, then clear the step completion
            applyRewards().then(() => {
              // Mark this step's rewards as applied to prevent duplicate application
              appliedStepRewardsRef.current = stepKey;

              // Only clear lastCompletedStep, not lastCompletedType
              // This is a workaround since we don't have direct access to modify the state
              // The proper fix would be to modify the clearStepCompletion function to preserve lastCompletedType
            });
          } else {
            console.log(
              "[SPIN DEBUG] Skipping step completion rewards application - currently spinning"
            );
          }
        } else if (
          hasPendingRewards() &&
          appliedStepRewardsRef.current === stepKey
        ) {
          // Step rewards already applied, just clear them
          clearStepCompletion();
        }
      } else {
        // Step already processed, skipping
      }
    }
  }, [
    state.lastCompletedStep,
    state.lastCompletedType,
    state.currentType,
    hasPendingRewards,
    applyRewards,
    spinning,
    clearStepCompletion,
    state.earnedRewards,
  ]);

  // Note: Removed redundant effect that was causing step completion rewards to be applied multiple times
  // The step completion effect above already handles applying rewards properly

  // Function to calculate rewards that will actually be given to the user
  const calculateUserRewards = useCallback(() => {
    const combined: AggregatedRewards = {
      sparkcoins: 0,
      spins: 0,
      turbo: 0,
      recharge: 0,
      sparkytokens: 0,
    };

    // Add spin rewards (from slot machine)
    if (isMultiSpin) {
      combined.sparkcoins += aggregatedRewards.sparkcoins;
      combined.spins += aggregatedRewards.spins;
      combined.turbo += aggregatedRewards.turbo;
      combined.recharge += aggregatedRewards.recharge;
      combined.sparkytokens += aggregatedRewards.sparkytokens;
    } else {
      // Single spin rewards
      if (prize?.type === "sparkcoins" && prize.amount > 0) {
        combined.sparkcoins += prize.amount;
      }
      if (prize?.type === "spins" && prize.amount > 0) {
        combined.spins += prize.amount;
      }
      if (prize?.type === "turbo" && prize.amount > 0) {
        combined.turbo += prize.amount;
      }
      if (prize?.type === "recharge" && prize.amount > 0) {
        combined.recharge += prize.amount;
      }
      if (lastReward.sparkytokens > 0) {
        combined.sparkytokens += lastReward.sparkytokens;
      }
    }

    // Add step completion rewards (only if they haven't been applied yet)
    const currentStepKey = state.lastCompletedStep
      ? `${state.lastCompletedStep.type}-${state.lastCompletedStep.step}`
      : null;
    if (
      hasPendingRewards() &&
      currentStepKey &&
      appliedStepRewardsRef.current !== currentStepKey
    ) {
      combined.sparkcoins += state.earnedRewards.sparkcoins;
      combined.spins += state.earnedRewards.spins;
      combined.turbo += state.earnedRewards.turbo;
      combined.recharge += state.earnedRewards.recharge;
    }

    return combined;
  }, [
    isMultiSpin,
    aggregatedRewards,
    prize,
    lastReward,
    hasPendingRewards,
    state.earnedRewards,
    state.lastCompletedStep,
    state.lastCompletedType,
  ]);

  // Function to calculate final combined rewards from all sources (including display-only rewards)
  const calculateFinalCombinedRewards = useCallback(() => {
    const userRewards = calculateUserRewards();

    // Type completion reward is now included in userRewards, so no additional calculation needed

    return userRewards;
  }, [calculateUserRewards]);

  // Function to calculate display rewards (excluding all sparkcoin rewards from animation)
  const calculateDisplayRewards = useCallback(() => {
    const combined = calculateFinalCombinedRewards();

    // Create a copy for display purposes
    const displayRewards: AggregatedRewards = { ...combined };

    // Remove all sparkcoin rewards from display - users will still receive them but won't see them in animation
    displayRewards.sparkcoins = 0;

    return displayRewards;
  }, [calculateFinalCombinedRewards]);

  // Update final combined rewards when any reward source changes
  useEffect(() => {
    const combined = calculateFinalCombinedRewards();
    setFinalCombinedRewards(combined);

    // Also calculate display rewards
    const display = calculateDisplayRewards();
    setDisplayRewards(display);
  }, [calculateFinalCombinedRewards, calculateDisplayRewards]);

  // Effect to handle reward overlay visibility
  useEffect(() => {
    // Skip showing reward overlay on initial page load
    if (initialLoadRef.current) return;

    // Skip showing reward overlay when changing spin level
    if (isChangingSpinLevel) return;

    if (winner && !spinning) {
      // For multi-spin, update lastReward when we have a winner
      if (isMultiSpin) {
        setLastReward(aggregatedRewards);
      }

      setShowRewardOverlay(true);
      setTimeout(() => {
        setShowRewardAnimations(true);
      }, 50);

      const timer = setTimeout(
        () => {
          setShowRewardOverlay(false);
          setShowRewardAnimations(false);
          // Note: typeCompletionReward state removed
          // Reset final combined rewards
          setFinalCombinedRewards({
            sparkcoins: 0,
            spins: 0,
            turbo: 0,
            recharge: 0,
            sparkytokens: 0,
          });
          // Reset display rewards
          setDisplayRewards({
            sparkcoins: 0,
            spins: 0,
            turbo: 0,
            recharge: 0,
            sparkytokens: 0,
          });
          // Don't reset processedTypeCompletionRef here - it should persist until user moves to a different type

          // Check if auto-spin should continue after reward animation completes
          if (isAutoSpinning && gameState.spins >= spinLevel) {
            // Auto-spin continuation will be handled by other effects
          }
        },
        isAutoSpinning ? 1000 : 2000
      );
      return () => {
        clearTimeout(timer);
      };
    }
  }, [
    winner,
    spinning,
    isMultiSpin,
    aggregatedRewards,
    isAutoSpinning,
    gameState.spins,
    spinLevel,
    isChangingSpinLevel,
  ]);

  // Effect to ensure reward animations are reset when overlay is hidden
  useEffect(() => {
    if (!showRewardOverlay) {
      setShowRewardAnimations(false);
    }
  }, [showRewardOverlay]);

  // Reset lastReward when starting a new spin
  useEffect(() => {
    if (spinning) {
      setLastReward({
        sparkcoins: 0,
        spins: 0,
        turbo: 0,
        recharge: 0,
        sparkytokens: 0,
      });
      // Also reset reward animations when starting a new spin
      setShowRewardAnimations(false);
    }
  }, [spinning]);

  // Add a ref to track if a state update is in progress to prevent duplicates
  const stateUpdateInProgressRef = useRef(false);

  // Add a ref for debouncing spin level changes
  const spinLevelDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add a ref to track if type completion reward has been processed for the current type
  const processedTypeCompletionRef = useRef<number | null>(null);

  // Add a ref to track the last step that was processed
  const lastProcessedStepRef = useRef<string | null>(null);

  // Add a ref to track if step rewards have been applied for the current step
  const appliedStepRewardsRef = useRef<string | null>(null);

  // Add a ref for the spin button
  const spinButtonRef = useRef<HTMLButtonElement>(null);

  // Add a queue for pending updates
  const pendingUpdatesQueueRef = useRef<
    Array<{
      updates: ((prev: GameState) => GameState) | Partial<GameState>;
      resolve: (value: unknown) => void;
      reject: (error: unknown) => void;
    }>
  >([]);

  // Function to process the next update in the queue - defined first to avoid circular dependency
  const processNextUpdate = useCallback(() => {
    // If there are no more updates in the queue, mark that we're done
    if (pendingUpdatesQueueRef.current.length === 0) {
      stateUpdateInProgressRef.current = false;
      return;
    }

    // Get the next update from the queue
    const { updates, resolve, reject } =
      pendingUpdatesQueueRef.current.shift()!;

    // Process this update
    try {
      // If updates is a function, execute it to get the actual updates
      let actualUpdates: Partial<GameState>;
      if (typeof updates === "function") {
        // Create a copy of the current state to pass to the function
        const currentState = { ...gameState };
        actualUpdates = updates(currentState);
      } else {
        actualUpdates = updates;
      }

      // Update our local ref with the new values for UI consistency BEFORE the database update
      if (actualUpdates.spins !== undefined) {
        latestStateRef.current.spins = actualUpdates.spins;
      }
      if (actualUpdates.coins !== undefined) {
        latestStateRef.current.coins = actualUpdates.coins;
      }
      if (actualUpdates.spinLevel !== undefined) {
        latestStateRef.current.spinLevel = actualUpdates.spinLevel;
      }

      // Perform the actual database update
      criticalStateUpdate(updates)
        .then((result) => {
          // Force a re-render to update UI components
          setLastUpdateTime(Date.now());

          // Resolve the promise with the result
          resolve(result);

          // Process the next update in the queue if any
          setTimeout(processNextUpdate, 50);
        })
        .catch((error) => {
          // Error in queued state update
          reject(error);

          // Even on error, try to process the next update
          setTimeout(processNextUpdate, 50);
        });
    } catch (error) {
      // Error processing queued update
      reject(error);

      // Even on error, try to process the next update
      setTimeout(processNextUpdate, 50);
    }
  }, [criticalStateUpdate, gameState]);

  // Wrapper for criticalStateUpdate to prevent duplicate updates
  const safeCriticalStateUpdate = useCallback(
    async (updates: ((prev: GameState) => GameState) | Partial<GameState>) => {
      // Return a promise that will be resolved when the update completes
      return new Promise<unknown>((resolve, reject) => {
        // If an update is already in progress, queue this update
        if (stateUpdateInProgressRef.current) {
          // Add to queue instead of recursively calling
          pendingUpdatesQueueRef.current.push({ updates, resolve, reject });
          return;
        }

        // Mark that an update is in progress
        stateUpdateInProgressRef.current = true;

        // Process the update
        const processUpdate = async () => {
          try {
            // If updates is a function, execute it to get the actual updates
            let actualUpdates: Partial<GameState>;
            if (typeof updates === "function") {
              // Create a copy of the current state to pass to the function
              const currentState = { ...gameState };
              actualUpdates = updates(currentState);
            } else {
              actualUpdates = updates;
            }

            // Update our local ref with the new values for UI consistency BEFORE the database update
            if (actualUpdates.spins !== undefined) {
              latestStateRef.current.spins = actualUpdates.spins;
            }
            if (actualUpdates.coins !== undefined) {
              latestStateRef.current.coins = actualUpdates.coins;
            }
            if (actualUpdates.spinLevel !== undefined) {
              latestStateRef.current.spinLevel = actualUpdates.spinLevel;
            }

            // Perform the actual database update
            const result = await criticalStateUpdate(updates);

            // Force a re-render to update UI components
            setLastUpdateTime(Date.now());

            // Resolve the promise with the result
            resolve(result);

            // Process the next update in the queue if any
            setTimeout(processNextUpdate, 50);
          } catch (error) {
            // Error in state update
            reject(error);

            // Even on error, try to process the next update
            setTimeout(processNextUpdate, 50);
          }
        };

        // Start processing the update
        processUpdate();
      });
    },
    [criticalStateUpdate, gameState, processNextUpdate]
  );

  // Note: Type completion reward effect removed - rewards are no longer given to user
  // but still displayed in ultimate price values

  // Effect to reset processed type completion ref when user moves to a different type
  useEffect(() => {
    // If the current type is different from the last processed type, reset the ref
    if (
      processedTypeCompletionRef.current !== null &&
      processedTypeCompletionRef.current !== state.currentType
    ) {
      processedTypeCompletionRef.current = null;
      // Also reset step rewards ref when moving to different type
      appliedStepRewardsRef.current = null;
    }
  }, [state.currentType]);

  // Effect to reset step rewards ref when user moves to a different step
  useEffect(() => {
    const currentStepKey = state.lastCompletedStep
      ? `${state.lastCompletedStep.type}-${state.lastCompletedStep.step}`
      : null;
    if (currentStepKey && appliedStepRewardsRef.current !== currentStepKey) {
      // Reset the applied step rewards ref when a new step is completed
      appliedStepRewardsRef.current = null;
    }
  }, [state.lastCompletedStep]);

  const spin = useCallback(async () => {
    if (spinning) {
      return;
    }

    // Trigger haptic feedback
    triggerHapticFeedback("heavy");

    // Check if user has enough spins
    if (gameState.spins < spinLevel) {
      return;
    }

    // Reset reward display when starting a new spin
    setRewardDisplay({
      amount: 0,
      visible: false,
    });

    // STEP 1: Deduct spin cost first
    const spinsAfterDeduction = gameState.spins - spinLevel;

    // STEP 2: Apply any pending step completion rewards to the deducted amount
    let finalStartingSpins = spinsAfterDeduction;
    console.log("[SPIN DEBUG] Checking for pending rewards at spin start:", {
      hasPendingRewards: hasPendingRewards(),
      earnedRewards: state.earnedRewards,
      lastCompletedStep: state.lastCompletedStep,
      timestamp: new Date().toISOString(),
    });

    if (hasPendingRewards()) {
      // Create a unique key for this step to track if it was applied during spin process
      const stepKey = state.lastCompletedStep
        ? `${state.lastCompletedStep.type}-${state.lastCompletedStep.step}`
        : null;

      // Check if this step was already applied in a previous spin
      if (stepKey && appliedStepRewardsRef.current === stepKey) {
        console.log(
          "[SPIN DEBUG] Step completion rewards already applied in previous spin, skipping:",
          {
            stepKey,
            timestamp: new Date().toISOString(),
          }
        );
        // Clear the step completion rewards without applying them again
        clearStepCompletion();
      } else {
        // Apply rewards to the deducted amount, not the original amount
        finalStartingSpins = spinsAfterDeduction + state.earnedRewards.spins;

        console.log(
          "[SPIN DEBUG] Step completion rewards applied during spin process:",
          {
            stepKey,
            spinsAfterDeduction,
            earnedSpins: state.earnedRewards.spins,
            finalStartingSpins,
            timestamp: new Date().toISOString(),
          }
        );

        // Mark that this step's rewards were applied during the spin process
        if (stepKey) {
          latestStateRef.current.spinProcessAppliedRewards = stepKey;
          // Also mark this step as applied to prevent the effect from applying it again
          appliedStepRewardsRef.current = stepKey;
        }

        // Clear the step completion rewards after using them
        clearStepCompletion();
      }
    }

    // Use the final starting spins (deducted + step rewards)
    const currentSpins = finalStartingSpins;

    try {
      // STEP 1: Use current spins (no deduction in memory needed)
      // Update our ref to match current game state for UI consistency
      latestStateRef.current.spins = currentSpins;
      setLastUpdateTime(Date.now()); // Force UI update
      setSpinning(true);
      setWinner(false);
      setWinningCombination(null);
      setSpinningReels([true, true, true]);
      setStoppingReels([false, false, false]);

      // Reset aggregate rewards ref
      aggregatedRewardsRef.current = {
        sparkcoins: 0,
        spins: 0,
        turbo: 0,
        recharge: 0,
        sparkytokens: 0,
      };
      setIsMultiSpin(spinLevel > 1);

      // Reset debug data for new spin session
      setDebugData([]);

      // Apply different CSS classes based on spin type
      if (spinLevel > 1) {
        // For multi-spin, use faster animation classes
        document.querySelectorAll(".slot-reel").forEach((reel) => {
          reel.classList.remove("spinning");
          reel.classList.add("multi-spinning");
        });
      } else {
        // For single spin, use normal animation classes
        document.querySelectorAll(".slot-reel").forEach((reel) => {
          reel.classList.remove("multi-spinning");
          reel.classList.add("spinning");
        });
      }

      // Generate all spins upfront
      const allSpins = Array(spinLevel)
        .fill(0)
        .map(() => {
          if (isMultiSpin) {
            // For multi-spin, use the multi-spin generator to create 3 reels
            // For 50x spins, add additional logic to reduce duplicate symbols across reels
            if (spinLevel >= 50) {
              // Generate first reel
              const reel1 = generateReelForMultiSpin(spinLevel);

              // Generate second reel with reduced chance of duplicating center symbol from first reel
              const reel2 = generateReelForMultiSpin(spinLevel).map(
                (symbolIndex, idx) => {
                  // For the center position, try to avoid the same symbol as first reel's center
                  if (
                    idx === 1 &&
                    symbolIndex === reel1[1] &&
                    Math.random() < 0.7
                  ) {
                    // Pick a different symbol while maintaining 20% probability for spin icon
                    const rand = Math.random();
                    if (rand < 0.2) {
                      // 20% chance to get spin icon (index 3)
                      // Only use it if it's not the same as reel1's center
                      if (reel1[1] !== 3) {
                        return 3;
                      } else {
                        // If reel1's center is already spin icon, pick another symbol
                        // Generate a random index between 0-5, excluding spin icon
                        const randomIndex = Math.floor(
                          Math.random() * (SYMBOLS.length - 1)
                        );
                        // If the index is >= 3, we need to shift it by 1 to skip the spin icon
                        return randomIndex >= 3 ? randomIndex + 1 : randomIndex;
                      }
                    } else {
                      // 80% chance to get any other symbol that's not the same as reel1's center
                      // and maintain the proper distribution
                      let newIndex;
                      do {
                        // Generate a random index between 0-5, excluding spin icon
                        const randomIndex = Math.floor(
                          Math.random() * (SYMBOLS.length - 1)
                        );
                        // If the index is >= 3, we need to shift it by 1 to skip the spin icon
                        newIndex =
                          randomIndex >= 3 ? randomIndex + 1 : randomIndex;
                      } while (newIndex === reel1[1]);
                      return newIndex;
                    }
                  }
                  return symbolIndex;
                }
              );

              // Generate third reel with reduced chance of duplicating center symbols from first two reels
              const reel3 = generateReelForMultiSpin(spinLevel).map(
                (symbolIndex, idx) => {
                  // For the center position (idx === 1), try to avoid the same symbols as other reels' centers
                  if (
                    idx === 1 &&
                    (symbolIndex === reel1[1] || symbolIndex === reel2[1]) &&
                    Math.random() < 0.7
                  ) {
                    // Pick a different symbol while maintaining 20% probability for spin icon
                    const rand = Math.random();
                    if (rand < 0.2) {
                      // 20% chance to get spin icon (index 3)
                      // Only use it if it's not the same as reel1 or reel2's center
                      if (reel1[1] !== 3 && reel2[1] !== 3) {
                        return 3;
                      } else {
                        // If either reel already has spin icon, pick another symbol
                        // Generate a random index between 0-5, excluding spin icon
                        let newIndex;
                        do {
                          const randomIndex = Math.floor(
                            Math.random() * (SYMBOLS.length - 1)
                          );
                          // If the index is >= 3, we need to shift it by 1 to skip the spin icon
                          newIndex =
                            randomIndex >= 3 ? randomIndex + 1 : randomIndex;
                        } while (
                          newIndex === reel1[1] ||
                          newIndex === reel2[1]
                        );
                        return newIndex;
                      }
                    } else {
                      // 80% chance to get any other symbol that's not the same as reel1 or reel2's center
                      let newIndex;
                      do {
                        // Generate a random index between 0-5, excluding spin icon
                        const randomIndex = Math.floor(
                          Math.random() * (SYMBOLS.length - 1)
                        );
                        // If the index is >= 3, we need to shift it by 1 to skip the spin icon
                        newIndex =
                          randomIndex >= 3 ? randomIndex + 1 : randomIndex;
                      } while (newIndex === reel1[1] || newIndex === reel2[1]);
                      return newIndex;
                    }
                  }
                  return symbolIndex;
                }
              );

              return [reel1, reel2, reel3];
            } else {
              // For lower spin levels, use the normal multi-spin generator
              return [
                generateReelForMultiSpin(spinLevel),
                generateReelForMultiSpin(spinLevel),
                generateReelForMultiSpin(spinLevel),
              ];
            }
          } else {
            // For single spin, use the regular generator
            return [generateReel(), generateReel(), generateReel()];
          }
        });

      // Start with the first spin
      let spinIndex = 0;

      // Define animation durations
      const TOTAL_SPIN_DURATION = 2000; // Total time for a single spin
      const STOP_ANIMATION_DURATION = 500; // Time for stopping animation
      const SPIN_DURATION = TOTAL_SPIN_DURATION - STOP_ANIMATION_DURATION * 3; // Time for actual spinning before stops
      const MULTI_SPIN_DURATION = 500; // Fast animation for multi-spin (0.5 seconds)
      const MULTI_SPIN_TRANSITION = 100; // Time between spins in multi-spin mode

      // Calculate delays for stopping reels
      const getSpinDelay = () => {
        return isMultiSpin ? MULTI_SPIN_DURATION : SPIN_DURATION; // Faster for multi-spin
      };

      const getStopDelay = () => {
        return isMultiSpin ? 100 : STOP_ANIMATION_DURATION; // Faster stops for multi-spin
      };

      // Function to update reels with transition
      const updateReelsWithTransition = (newReels: number[][]) => {
        if (!isMultiSpin) {
          setReels(newReels);
        }

        // For multi-spin, update reels without blur effect
        setReels(newReels);
      };

      // Define the processSpin function to handle each spin
      const processCurrentSpin = async (
        currentSpins: number
      ): Promise<void> => {
        console.log("[SPIN DEBUG] processCurrentSpin called with:", {
          currentSpins,
          spinIndex,
          spinLevel,
          timestamp: new Date().toISOString(),
        });

        try {
          // Log current state at the beginning of each spin
          console.log(
            "[SPIN DEBUG] Starting spin",
            spinIndex + 1,
            "of",
            spinLevel,
            ":",
            {
              spinNumber: spinIndex + 1,
              currentSpins,
              earnedRewards: state.earnedRewards,
              hasPendingRewards: hasPendingRewards(),
              lastCompletedStep: state.lastCompletedStep,
              timestamp: new Date().toISOString(),
            }
          );

          if (spinIndex >= spinLevel) {
            console.log(
              "[SPIN DEBUG] All spins complete, starting final calculation phase"
            );
            // All spins complete, show final stopping animation and results
            const stopDelay = getStopDelay();

            // Reset CSS classes for final stopping animation
            document.querySelectorAll(".slot-reel").forEach((reel) => {
              if (isMultiSpin) {
                reel.classList.remove("multi-spinning");
                reel.classList.add("stopping"); // Use normal stopping for final animation
              } else {
                reel.classList.remove("spinning");
                reel.classList.add("stopping");
              }
            });

            setStoppingReels((prev) => [true, prev[1], prev[2]]);
            setTimeout(() => {
              setSpinningReels((prev) => [false, prev[1], prev[2]]);

              setTimeout(() => {
                setStoppingReels((prev) => [prev[0], true, prev[2]]);
                setTimeout(() => {
                  setSpinningReels((prev) => [prev[0], false, prev[2]]);

                  setTimeout(() => {
                    setStoppingReels((prev) => [prev[0], prev[1], true]);
                    setTimeout(() => {
                      setSpinningReels([false, false, false]);
                      setStoppingReels([false, false, false]);
                      setSpinning(false); // Enable spin button

                      // Create aggregated prize - use ref instead of state
                      const totalSparkcoins =
                        aggregatedRewardsRef.current.sparkcoins;
                      const totalSpins = aggregatedRewardsRef.current.spins;
                      const totalTurbo = aggregatedRewardsRef.current.turbo;
                      const totalRecharge =
                        aggregatedRewardsRef.current.recharge;

                      // For multi-spins, set winner to true only once at the end
                      if (
                        isMultiSpin &&
                        (totalSparkcoins > 0 ||
                          totalSpins > 0 ||
                          totalTurbo > 0 ||
                          totalRecharge > 0)
                      ) {
                        setWinner(true);

                        // Update reward display for sparkcoins
                        if (totalSparkcoins > 0) {
                          setRewardDisplay({
                            amount: totalSparkcoins,
                            visible: true,
                          });
                        }
                      }

                      // Apply aggregated rewards following the same sequence as single spins
                      console.log(
                        "[SPIN DEBUG] About to call applyRewards function"
                      );
                      const applyRewards = async () => {
                        console.log(
                          "[SPIN DEBUG] applyRewards function started"
                        );
                        try {
                          // Calculate final values (currentSpins already has deduction applied)
                          // Calculate final spins: currentSpins + slot rewards + type completion rewards + accumulated step completion rewards
                          let finalSpins = currentSpins + totalSpins;

                          // Add any accumulated step completion rewards that were earned during the spin process
                          // Only apply if they weren't already applied at spin start
                          if (
                            hasPendingRewards() &&
                            !latestStateRef.current.spinProcessAppliedRewards
                          ) {
                            finalSpins += state.earnedRewards.spins;
                            console.log(
                              "[SPIN DEBUG] Accumulated step completion rewards added to final calculation:",
                              {
                                earnedSpins: state.earnedRewards.spins,
                                finalSpins,
                                lastCompletedStep: state.lastCompletedStep,
                                timestamp: new Date().toISOString(),
                              }
                            );

                            // Mark that step completion rewards were applied during the spin process
                            const stepKey = state.lastCompletedStep
                              ? `${state.lastCompletedStep.type}-${state.lastCompletedStep.step}`
                              : null;
                            if (stepKey) {
                              latestStateRef.current.spinProcessAppliedRewards =
                                stepKey;
                              console.log(
                                "[SPIN DEBUG] Marked step completion rewards as applied during spin process:",
                                {
                                  stepKey,
                                  timestamp: new Date().toISOString(),
                                }
                              );
                            }

                            // Clear the step completion rewards after including them in the final calculation
                            clearStepCompletion();
                          } else {
                            console.log(
                              "[SPIN DEBUG] No accumulated step completion rewards found at end of spin or already applied at spin start"
                            );
                          }

                          // Log detailed calculation breakdown
                          console.log(
                            "[SPIN DEBUG] Final calculation breakdown:",
                            {
                              currentSpins,
                              totalSpins,
                              finalSpins,
                              calculation: `${currentSpins} + ${totalSpins} = ${finalSpins}`,
                              spinProcessAppliedRewards:
                                latestStateRef.current
                                  .spinProcessAppliedRewards,
                              timestamp: new Date().toISOString(),
                            }
                          );

                          // Log spins after spin completes
                          console.log(
                            "[SPIN DEBUG] Spins after spin completes:",
                            {
                              currentSpins,
                              totalSpins,
                              finalSpins,
                              timestamp: new Date().toISOString(),
                            }
                          );

                          const finalCoins = gameState.coins + totalSparkcoins;
                          const finalTurbo =
                            (gameState.boosts.rewardedTurbo || 0) + totalTurbo;
                          const finalRecharge =
                            (gameState.boosts.rewardedRecharge || 0) +
                            totalRecharge;

                          // Calculate timer end time once if needed
                          const timerDuration = 1 * 60 * 1000; // 1 minute in milliseconds
                          const currentTime = Date.now();

                          // Clear timer if spins reach or exceed 50, otherwise set/keep timer
                          let newTimerEnd;
                          if (finalSpins >= 50) {
                            // Clear the timer from localStorage when spins are at or above 50
                            timerService.cancelTimer(TimerType.SPIN);
                            newTimerEnd = 0; // Set to 0 to indicate no active timer
                          } else {
                            // Set timer only if no active timer or current timer has expired
                            newTimerEnd =
                              !gameState.spinTimer ||
                              gameState.spinTimer < currentTime
                                ? currentTime + timerDuration
                                : gameState.spinTimer;
                          }

                          // Update database with final calculated values (deduction + aggregated rewards)
                          await safeCriticalStateUpdate((prev: GameState) => {
                            return {
                              ...prev,
                              spins: finalSpins,
                              coins: finalCoins,
                              totalSpins: prev.totalSpins + spinLevel,
                              boosts: {
                                ...prev.boosts,
                                rewardedTurbo: finalTurbo,
                                rewardedRecharge: finalRecharge,
                              },
                              spinTimer: newTimerEnd,
                            };
                          });

                          // Update our ref to match the final values
                          latestStateRef.current.spins = finalSpins;
                          latestStateRef.current.coins = finalCoins;
                          setLastUpdateTime(Date.now()); // Force UI update

                          // Type completion reward is now included in finalSpins calculation

                          // For large coin rewards, ensure they're properly persisted
                          if (totalSparkcoins > 100000) {
                            setTimeout(() => {
                              increaseCoins(0); // This will trigger DB update with current state
                            }, 500);
                          }

                          // Set winner state and prize for overlay
                          setWinningCombination("aggregated");
                          if (
                            prize?.type === "sparkcoins" &&
                            prize.amount > 0
                          ) {
                            setPrize(prize);
                          }
                          // Set winner to true only if there are actual rewards
                          if (
                            totalSparkcoins > 0 ||
                            totalSpins > 0 ||
                            totalTurbo > 0 ||
                            totalRecharge > 0
                          ) {
                            setWinner(true); // This will trigger the reward overlay
                          }
                        } catch {
                          // Ensure the spin button is re-enabled on error
                          setSpinning(false);
                        }
                      };

                      // Call applyRewards to update the database with final values
                      applyRewards();
                    }, stopDelay);
                  }, stopDelay);
                }, stopDelay);
              }, stopDelay);

              return;
            }, stopDelay);
          } else {
            // Process current spin
            const currentReels = allSpins[spinIndex];

            // For multi-spin, keep spinning and just update the reels without stopping animation
            if (isMultiSpin) {
              updateReelsWithTransition(currentReels);

              // Process results without stopping animation
              const result = checkWinnerForReels(currentReels);

              // Get symbols for debug logging
              const symbols = currentReels.map((reel) => {
                const symbolIndex = reel[1];
                if (symbolIndex >= 0 && symbolIndex < SYMBOLS.length) {
                  return SYMBOLS[symbolIndex].id;
                }
                return "unknown";
              });

              let tokensToAdd = 0;

              if (result && result.winningCombo && result.newPrize) {
                // Update progression immediately for each spin

                // Only add tokens if the winning combination includes sparkytoken
                if (result.winningCombo.includes("sparkytoken")) {
                  if (result.winningCombo === "1sparkytoken") {
                    tokensToAdd = 1;
                  } else if (result.winningCombo === "2sparkytoken") {
                    tokensToAdd = 3;
                  } else if (result.winningCombo === "2sparkytoken-special") {
                    tokensToAdd = 2;
                  } else if (result.winningCombo === "3sparkytoken") {
                    tokensToAdd = 9;
                  } else {
                    tokensToAdd = 1;
                  }

                  // Only update progression if we actually have tokens to add and type completion is allowed
                  // Do NOT multiply by spin level for token progression
                  if (tokensToAdd > 0 && isTypeCompletionAllowed()) {
                    updateProgressWithTokens(tokensToAdd);

                    // Log earned rewards after this spin to track accumulation
                    console.log(
                      "[SPIN DEBUG] After spin",
                      spinIndex + 1,
                      "progression update:",
                      {
                        spinNumber: spinIndex + 1,
                        tokensAdded: tokensToAdd,
                        earnedRewards: state.earnedRewards,
                        hasPendingRewards: hasPendingRewards(),
                        timestamp: new Date().toISOString(),
                      }
                    );
                  } else if (tokensToAdd > 0 && !isTypeCompletionAllowed()) {
                    // Type completion is not allowed - don't add tokens and stop processing more spins
                    // that would add tokens to prevent bypassing the type completion restriction
                    tokensToAdd = 0;
                  }
                }

                // Add debug data for this spin
                setDebugData((prev) => [
                  ...prev,
                  {
                    spinNumber: spinIndex + 1,
                    symbols: symbols,
                    winningCombo: result.winningCombo,
                    reward: result.newPrize
                      ? {
                          type: result.newPrize.type,
                          amount: result.newPrize.amount,
                        }
                      : null,
                    sparkytokens: tokensToAdd,
                  },
                ]);
              } else {
                // Add debug data for losing spin
                setDebugData((prev) => [
                  ...prev,
                  {
                    spinNumber: spinIndex + 1,
                    symbols: symbols,
                    winningCombo: null,
                    reward: null,
                    sparkytokens: 0,
                  },
                ]);
              }

              // Accumulate rewards directly in the ref to avoid state update race conditions
              if (result && result.winningCombo && result.newPrize) {
                // Update ref directly for consistent aggregation
                if (result.newPrize?.type === "sparkcoins") {
                  aggregatedRewardsRef.current.sparkcoins +=
                    result.newPrize.amount;
                } else if (result.newPrize?.type === "spins") {
                  aggregatedRewardsRef.current.spins += result.newPrize.amount;
                } else if (result.newPrize?.type === "turbo") {
                  aggregatedRewardsRef.current.turbo += result.newPrize.amount;
                } else if (result.newPrize?.type === "recharge") {
                  aggregatedRewardsRef.current.recharge +=
                    result.newPrize.amount;
                }

                // Add sparkytoken rewards - use the same logic as progression
                if (
                  result.winningCombo &&
                  result.winningCombo.includes("sparkytoken")
                ) {
                  if (result.winningCombo === "1sparkytoken") {
                    aggregatedRewardsRef.current.sparkytokens += 1;
                  } else if (result.winningCombo === "2sparkytoken") {
                    aggregatedRewardsRef.current.sparkytokens += 3;
                  } else if (result.winningCombo === "2sparkytoken-special") {
                    aggregatedRewardsRef.current.sparkytokens += 2;
                  } else if (result.winningCombo === "3sparkytoken") {
                    aggregatedRewardsRef.current.sparkytokens += 9;
                  } else {
                    // Fallback for any other sparkytoken combination
                    aggregatedRewardsRef.current.sparkytokens += 1;
                  }
                }

                // Update state to match ref for UI display
                setAggregatedRewards({ ...aggregatedRewardsRef.current });
              }

              // Check if type completion is not allowed and we have tokens to add
              // If so, stop processing more spins to prevent bypassing the type completion restriction
              if (tokensToAdd > 0 && !isTypeCompletionAllowed()) {
                // Type completion is not allowed - stop processing more spins
                // Set spinIndex to spinLevel to end the multispin session
                spinIndex = spinLevel;
              } else {
                // Simply move to the next spin without stopping animation
                spinIndex++;
              }

              // Check if next spin is the last one
              if (spinIndex >= spinLevel) {
                // If this is the last spin, process it after a short delay
                setTimeout(
                  () => processCurrentSpin(currentSpins),
                  MULTI_SPIN_DURATION
                );
              } else {
                // Otherwise, quickly move to the next spin
                setTimeout(
                  () => processCurrentSpin(currentSpins),
                  MULTI_SPIN_TRANSITION
                );
              }
            } else {
              // Single spin - show normal stopping animation
              const stopDelay = getStopDelay();

              // Update reels immediately like multi-spin to avoid sudden replacement
              updateReelsWithTransition(currentReels);

              // Add a delay to ensure the updated reels are visible during spinning
              const spinningVisibilityDelay = 500;

              // For single spin, let it spin for the main duration plus visibility delay before stopping
              setTimeout(() => {
                setStoppingReels((prev) => [true, prev[1], prev[2]]);
                setTimeout(() => {
                  setSpinningReels((prev) => [false, prev[1], prev[2]]);

                  setTimeout(() => {
                    setStoppingReels((prev) => [prev[0], true, prev[2]]);
                    setTimeout(() => {
                      setSpinningReels((prev) => [prev[0], false, prev[2]]);

                      setTimeout(() => {
                        setStoppingReels((prev) => [prev[0], prev[1], true]);
                        setTimeout(() => {
                          setSpinningReels([false, false, false]);
                          setStoppingReels([false, false, false]);

                          // Process results - don't update reels again as we've already done it
                          // updateReelsWithTransition(currentReels); - Removed this line
                          const result = checkWinnerForReels(currentReels);

                          // Calculate final values (currentSpins already has deduction applied)
                          let finalSpins = currentSpins;

                          // Log detailed calculation breakdown (single spin)
                          console.log(
                            "[SPIN DEBUG] Final calculation breakdown (single):",
                            {
                              currentSpins,
                              finalSpins,
                              timestamp: new Date().toISOString(),
                            }
                          );

                          // Log spins after spin completes (single spin)
                          console.log(
                            "[SPIN DEBUG] Spins after spin completes (single):",
                            {
                              currentSpins,
                              finalSpins,
                              timestamp: new Date().toISOString(),
                            }
                          );
                          let finalCoins = gameState.coins;
                          let finalTurbo = gameState.boosts.rewardedTurbo || 0;
                          let finalRecharge =
                            gameState.boosts.rewardedRecharge || 0;
                          let tokensToAdd = 0;

                          if (
                            result &&
                            result.winningCombo &&
                            result.newPrize
                          ) {
                            setWinningCombination(result.winningCombo);
                            setPrize(result.newPrize);

                            // Calculate rewards based on prize type
                            if (result.newPrize?.type === "sparkcoins") {
                              finalCoins =
                                gameState.coins + (result.newPrize.amount || 0);
                            } else if (result.newPrize?.type === "spins") {
                              const wonSpins = result.newPrize.amount;
                              finalSpins += wonSpins;

                              // Log slot spin rewards
                              console.log(
                                "[SPIN DEBUG] Slot spin rewards added:",
                                {
                                  wonSpins,
                                  finalSpins,
                                  timestamp: new Date().toISOString(),
                                }
                              );
                            } else if (result.newPrize?.type === "turbo") {
                              finalTurbo =
                                (gameState.boosts.rewardedTurbo || 0) +
                                result.newPrize.amount;
                            } else if (result.newPrize?.type === "recharge") {
                              finalRecharge =
                                (gameState.boosts.rewardedRecharge || 0) +
                                result.newPrize.amount;
                            }

                            // Calculate sparky tokens
                            if (
                              result.winningCombo &&
                              result.winningCombo.includes("sparkytoken")
                            ) {
                              if (result.winningCombo === "1sparkytoken") {
                                tokensToAdd = 1;
                              } else if (
                                result.winningCombo === "2sparkytoken"
                              ) {
                                tokensToAdd = 3;
                              } else if (
                                result.winningCombo === "2sparkytoken-special"
                              ) {
                                tokensToAdd = 2;
                              } else if (
                                result.winningCombo === "3sparkytoken"
                              ) {
                                tokensToAdd = 9;
                              } else {
                                tokensToAdd = 1;
                              }
                            }
                          } else {
                          }

                          // Calculate timer end time once if needed
                          const timerDuration = 1 * 60 * 1000; // 1 minute in milliseconds
                          const currentTime = Date.now();

                          // Clear timer if spins reach or exceed 50, otherwise set/keep timer
                          let newTimerEnd;
                          if (finalSpins >= 50) {
                            // Clear the timer from localStorage when spins are at or above 50
                            timerService.cancelTimer(TimerType.SPIN);
                            newTimerEnd = 0; // Set to 0 to indicate no active timer
                          } else {
                            // Set timer only if no active timer or current timer has expired
                            newTimerEnd =
                              !gameState.spinTimer ||
                              gameState.spinTimer < currentTime
                                ? currentTime + timerDuration
                                : gameState.spinTimer;
                          }

                          // STEP 4: Update database with final calculated values (deduction + rewards)
                          safeCriticalStateUpdate((prev: GameState) => ({
                            ...prev,
                            spins: finalSpins,
                            coins: finalCoins,
                            totalSpins: prev.totalSpins + spinLevel,
                            boosts: {
                              ...prev.boosts,
                              rewardedTurbo: finalTurbo,
                              rewardedRecharge: finalRecharge,
                            },
                            spinTimer: newTimerEnd,
                          }))
                            .then(() => {
                              // Update our ref to match the final values
                              latestStateRef.current.spins = finalSpins;
                              latestStateRef.current.coins = finalCoins;
                              setLastUpdateTime(Date.now()); // Force UI update

                              // Type completion reward is now included in finalSpins calculation

                              // Handle sparkytoken progression for single spins
                              // Do NOT multiply by spin level for token progression
                              if (
                                tokensToAdd > 0 &&
                                isTypeCompletionAllowed()
                              ) {
                                updateProgressWithTokens(tokensToAdd);
                              } else {
                              }

                              // Update lastReward state with all rewards
                              const newLastReward = {
                                sparkcoins:
                                  result?.newPrize?.type === "sparkcoins"
                                    ? result.newPrize.amount
                                    : 0,
                                spins:
                                  result?.newPrize?.type === "spins"
                                    ? result.newPrize.amount
                                    : 0,
                                turbo:
                                  result?.newPrize?.type === "turbo"
                                    ? result.newPrize.amount
                                    : 0,
                                recharge:
                                  result?.newPrize?.type === "recharge"
                                    ? result.newPrize.amount
                                    : 0,
                                sparkytokens: tokensToAdd,
                              };
                              setLastReward(newLastReward);

                              // For single spin, set winner to true to trigger the overlay
                              if (
                                spinLevel === 1 &&
                                result &&
                                result.winningCombo &&
                                result.newPrize
                              ) {
                                setWinner(true);
                              }

                              setSpinning(false); // Enable spin button
                            })
                            .catch((_error) => {
                              setSpinning(false); // Ensure spin button is enabled on error
                            });
                        }, stopDelay);
                      }, stopDelay);
                    }, stopDelay);
                  }, stopDelay);
                }, getSpinDelay() + spinningVisibilityDelay);
              }, getSpinDelay() + spinningVisibilityDelay);
            }
          }
        } catch (error) {
          console.log("[SPIN DEBUG] Error in processCurrentSpin:", error);
          throw error;
        }
      };

      // Start processing spins
      console.log(
        "[SPIN DEBUG] Calling processCurrentSpin with currentSpins:",
        currentSpins
      );
      processCurrentSpin(currentSpins);
    } catch (error) {
      console.log("[SPIN DEBUG] Error in spin process:", error);
      setSpinning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    spinning,
    gameState.spins,
    spinLevel,
    gameState.coins,
    gameState.spinTimer,
    gameState.boosts.rewardedRecharge,
    gameState.boosts.rewardedTurbo,
    criticalStateUpdate,
    increaseCoins,
    updateProgressWithTokens,
    safeCriticalStateUpdate,
    latestStateRef,
    setLastUpdateTime,
    setSpinning,
    setWinner,
    setWinningCombination,
    setSpinningReels,
    setStoppingReels,
    setAggregatedRewards,
    setIsMultiSpin,
    setDebugData,
    setPrize,
    setLastReward,
    setRewardDisplay,
  ]);

  // checkWinnerForReels function is now imported from ./spinLogic

  // Format timer
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    // Ensure we're using proper padding with leading zeros
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  // Function to check if there are rewards to show
  const hasRewardsToShow = () => {
    const combined = displayRewards;
    return (
      combined.sparkcoins > 0 ||
      combined.spins > 0 ||
      combined.recharge > 0 ||
      combined.turbo > 0 ||
      combined.sparkytokens > 0
    );
  };

  // getSparkyTokenCount function is now imported from ./spinLogic

  const [showRewardAnimations, setShowRewardAnimations] = useState(false);

  const router = useRouter();
  const { instance: WebApp, triggerHapticFeedback } = useWebApp(true);

  // Check if we're in Telegram WebApp
  const isTelegramWebApp = !!WebApp;

  // Function to cycle through spin levels - simplified for reliability
  const cycleSpinLevel = useCallback(() => {
    // Get the current spin level directly from the state
    const currentLevel = spinLevel;

    // Find its index in the SPIN_LEVELS array
    const currentIndex = SPIN_LEVELS.indexOf(currentLevel);

    // Calculate the next index, with fallback to 0 if current level is not found
    const validIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (validIndex + 1) % SPIN_LEVELS.length;

    // Get the new spin level value
    const newSpinLevel = SPIN_LEVELS[nextIndex];

    // Set flag that user is changing spin level
    setIsChangingSpinLevel(true);

    // Update the state value
    setSpinLevel(newSpinLevel);

    // Update the display immediately
    setDisplaySpinLevel(newSpinLevel);

    // Update our ref for consistency
    latestStateRef.current.spinLevel = newSpinLevel;

    // Direct DOM update for immediate visual feedback - AFTER we've validated the level
    const spinLevelElement = document.querySelector(".spin-level-display");
    if (spinLevelElement) {
      spinLevelElement.textContent = `${newSpinLevel}x`;
    }

    // Trigger haptic feedback
    triggerHapticFeedback("medium");

    // Clear any existing debounce timer
    if (spinLevelDebounceTimerRef.current) {
      clearTimeout(spinLevelDebounceTimerRef.current);
    }

    // Debounce database updates
    spinLevelDebounceTimerRef.current = setTimeout(() => {
      // Save to database
      criticalStateUpdate((prev) => ({
        ...prev,
        spinLevel: newSpinLevel,
      }));

      // Clear the timer reference
      spinLevelDebounceTimerRef.current = null;

      // Reset the changing spin level flag after a short delay
      setTimeout(() => {
        setIsChangingSpinLevel(false);
      }, 500);
    }, 300);
  }, [spinLevel, criticalStateUpdate, triggerHapticFeedback]);

  // Add back button functionality
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

  // Helper function for tooltip
  const getRewardImage = (type: string) => {
    switch (type) {
      case "turbo":
        return "/assets/spin/turbo.png";
      case "spins":
        return "/assets/spin/spin.png";
      case "recharge":
        return "/assets/spin/recharge.png";
      case "sparkcoins":
        return "/assets/spin/sparkcoin.png";
      case "sparkytoken":
        return "/assets/spin/token.png";
      default:
        return "/assets/spin/sparkcoin.png";
    }
  };

  // Info tooltip content
  const tooltipContent = (
    <div className=" text-xs relative">
      {/* Copy button */}
      <button
        onClick={() => {
          const tooltipText = `
Type: ${currentGlobalType}
${
  state.lastCompletedType
    ? `Last Completed: Type ${state.lastCompletedType}`
    : ""
}
Token Required: ${state.requiredTokens} tokens
Reward: ${
            typeof state.reward.value === "number"
              ? formatCompactNumber(state.reward.value)
              : state.reward.value
          } ${state.reward.type}

Spin Calculation Breakdown:
Starting spins: ${gameState.spins}
${
  hasPendingRewards()
    ? `Add step completion reward: ${gameState.spins - spinLevel} + ${
        state.earnedRewards.spins
      } = ${gameState.spins - spinLevel + state.earnedRewards.spins}`
    : ""
}
Current UI display: ${latestStateRef.current.spins}
GameState spins: ${gameState.spins}
          `.trim();

          navigator.clipboard
            .writeText(tooltipText)
            .then(() => {
              // Optional: Show a brief success message
              console.log("Tooltip content copied to clipboard");
            })
            .catch((err) => {
              console.error("Failed to copy tooltip content:", err);
            });
        }}
        className="relative px-2 py-1 bg-yellow-400/20 hover:bg-yellow-400/30 active:bg-yellow-400/40 text-yellow-400 rounded transition-all duration-150 text-xs font-medium border border-yellow-400/30 hover:border-yellow-400/50 "
        title="Copy tooltip content"
      >
        Copy
      </button>

      {/* Content with top margin to accommodate copy button */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold">Type:</span>
          <span className="text-yellow-400">{currentGlobalType}</span>
        </div>

        {state.lastCompletedType && (
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold">Last Completed:</span>
            <span className="text-green-400">
              Type {state.lastCompletedType}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold">Token Required:</span>
          <div className="flex items-center">
            <span className="text-yellow-400 mr-2">{state.requiredTokens}</span>
            <Image
              src="/assets/spin/token.png"
              alt="Token"
              width={16}
              height={16}
              style={{ width: "auto", height: "auto" }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold">Reward:</span>
          <div className="flex items-center">
            <span className="text-yellow-400 mr-2">
              {typeof state.reward.value === "number"
                ? formatCompactNumber(state.reward.value)
                : state.reward.value}
            </span>
            <Image
              src={getRewardImage(state.reward.type)}
              alt={state.reward.type}
              width={16}
              height={16}
              style={{ width: "auto", height: "auto" }}
            />
          </div>
        </div>

        {/* Spin Calculation Breakdown */}
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="font-bold text-yellow-400 mb-2">
            Spin Calculation Breakdown:
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Starting spins:</span>
              <span className="text-yellow-400">{gameState.spins}</span>
            </div>
            {hasPendingRewards() && (
              <div className="flex justify-between">
                <span>Add step completion reward:</span>
                <span className="text-yellow-400">
                  {gameState.spins - spinLevel} + {state.earnedRewards.spins} ={" "}
                  {gameState.spins - spinLevel + state.earnedRewards.spins}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Current UI display:</span>
              <span className="text-green-400">
                {latestStateRef.current.spins}
              </span>
            </div>
            <div className="flex justify-between">
              <span>GameState spins:</span>
              <span className="text-blue-400">{gameState.spins}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Fix image aspect ratio warning by ensuring proper style attributes
  const imageStyle = { width: "auto", height: "auto" };

  // Add auto-spin functions
  const startAutoSpin = useCallback(async () => {
    // Don't start auto-spin if already auto-spinning
    if (isAutoSpinning) {
      return;
    }

    // Check if user has enough spins for at least one spin
    if (gameState.spins < spinLevel) {
      return;
    }

    setIsAutoSpinning(true);

    // Trigger haptic feedback
    triggerHapticFeedback("heavy");

    // Start the first spin immediately if not already spinning
    if (!spinning) {
      await spin();
    }
  }, [
    spinning,
    isAutoSpinning,
    gameState.spins,
    spinLevel,
    triggerHapticFeedback,
    spin,
  ]);

  const stopAutoSpin = useCallback(() => {
    setIsAutoSpinning(false);
    setSpinning(false); // Ensure spinning state is reset

    // Re-enable vertical swipes when auto-spin stops
    const webApp = window.Telegram?.WebApp;
    if (webApp?.enableVerticalSwipes) {
      webApp.enableVerticalSwipes();
    }

    // Trigger haptic feedback
    triggerHapticFeedback("medium");
  }, [triggerHapticFeedback]);

  const handleSpinButtonRelease = useCallback(async () => {
    setIsButtonPressed(false);

    // Clear progress interval
    if (progressInterval) {
      clearInterval(progressInterval);
      setProgressInterval(null);
    }

    // Clear hold timer
    if (holdTimer) {
      clearTimeout(holdTimer);
      setHoldTimer(null);
    }

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // If this was a long press, don't trigger regular spin
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    // If we're not auto-spinning, this was a regular tap
    if (!isAutoSpinning) {
      await spin();
    }
  }, [holdTimer, isAutoSpinning, spin, progressInterval]);

  // Long press detection functions using pointer events (more reliable)
  const handlePointerDown = useCallback(
    async (_e: React.PointerEvent) => {
      // Prevent ALL default behaviors
      _e.preventDefault();
      _e.stopPropagation();

      // Prevent context menu
      (_e.target as HTMLElement).oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      // Capture the pointer to ensure we get all events
      (_e.target as HTMLElement).setPointerCapture(_e.pointerId);

      // If auto-spinning, stop it immediately
      if (isAutoSpinning) {
        stopAutoSpin();
        return;
      }

      if (spinning) {
        return;
      }

      setIsButtonPressed(true);
      setShowPressedState(true);
      hasMovedRef.current = false;
      touchStartTimeRef.current = Date.now();
      isLongPressRef.current = false;

      // Trigger haptic feedback
      triggerHapticFeedback("heavy");

      // Show pressed state briefly for tactile feedback, then show released state
      setTimeout(() => {
        // Only clear pressed state if we haven't started auto-spin yet
        if (!isLongPressRef.current) {
          setShowPressedState(false);
        }
      }, 100); // 100ms tactile feedback

      // Start long press timer (200ms for faster response)
      longPressTimerRef.current = setTimeout(() => {
        if (!hasMovedRef.current) {
          isLongPressRef.current = true;
          const webApp = window.Telegram?.WebApp;
          if (webApp) {
            // Disable swipes and closing confirmation before starting auto-spin
            if (webApp.disableVerticalSwipes) {
              webApp.disableVerticalSwipes();
            }
            webApp.disableClosingConfirmation();

            // Use Telegram's native haptic feedback for better response
            webApp.HapticFeedback.impactOccurred("medium");
          }
          startAutoSpin();
        }
      }, 200);
    },
    [
      spinning,
      isAutoSpinning,
      triggerHapticFeedback,
      startAutoSpin,
      stopAutoSpin,
    ]
  );

  const handlePointerUp = useCallback(
    async (_e: React.PointerEvent) => {
      // Prevent context menu and text selection for autospin functionality
      _e.preventDefault();
      _e.stopPropagation();

      // Ensure pressed state is cleared
      setShowPressedState(false);
      await handleSpinButtonRelease();
    },
    [handleSpinButtonRelease]
  );

  const handlePointerLeave = useCallback(
    async (_e: React.PointerEvent) => {
      // Prevent context menu and text selection for autospin functionality
      _e.preventDefault();
      _e.stopPropagation();

      // Mark as moved to prevent long press if user moves pointer away
      hasMovedRef.current = true;
      // Ensure pressed state is cleared
      setShowPressedState(false);
      await handleSpinButtonRelease();
    },
    [handleSpinButtonRelease]
  );

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
      }
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [holdTimer, progressInterval]);

  // Add Telegram WebApp specific handling
  useEffect(() => {
    if (isTelegramWebApp && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;

      // Disable vertical swipes to prevent context menu if available
      if (webApp.disableVerticalSwipes) {
        webApp.disableVerticalSwipes();
      }

      // Disable closing confirmation to prevent interference with long press
      webApp.disableClosingConfirmation();

      // Set viewport to fixed to prevent any unwanted gestures
      const meta = document.createElement("meta");
      meta.name = "viewport";
      meta.content =
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
      document.head.appendChild(meta);

      // Add targeted event listeners to prevent context menu only on spin button
      const spinButton = document.querySelector(".spin-button");
      if (spinButton) {
        const preventContext = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        };

        spinButton.addEventListener("contextmenu", preventContext);
        spinButton.addEventListener("touchstart", preventContext, {
          passive: false,
        });
        spinButton.addEventListener("touchmove", preventContext, {
          passive: false,
        });
        spinButton.addEventListener("touchend", preventContext, {
          passive: false,
        });
      }

      // Add CSS to body to prevent selection but allow touch actions
      document.body.style.setProperty("-webkit-touch-callout", "none");
      document.body.style.setProperty("-webkit-user-select", "none");
      document.body.style.setProperty("user-select", "none");

      return () => {
        // Re-enable vertical swipes when component unmounts if available
        if (webApp.enableVerticalSwipes) {
          webApp.enableVerticalSwipes();
        }
        webApp.enableClosingConfirmation();
        document.head.removeChild(meta);

        // Remove targeted event listeners
        const spinButton = document.querySelector(".spin-button");
        if (spinButton) {
          const preventContext = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          };

          spinButton.removeEventListener("contextmenu", preventContext);
          spinButton.removeEventListener("touchstart", preventContext);
          spinButton.removeEventListener("touchmove", preventContext);
          spinButton.removeEventListener("touchend", preventContext);
        }

        // Reset body styles
        document.body.style.setProperty("-webkit-touch-callout", "");
        document.body.style.setProperty("-webkit-user-select", "");
        document.body.style.setProperty("user-select", "");
      };
    }
  }, [isTelegramWebApp]);

  // Auto-stop when spins run out
  useEffect(() => {
    if (isAutoSpinning && gameState.spins < spinLevel) {
      stopAutoSpin();
    }
  }, [isAutoSpinning, gameState.spins, spinLevel, stopAutoSpin]);

  // Monitor reward overlay completion for auto-spin continuation
  useEffect(() => {
    // When reward overlay is hidden and auto-spin is active, check if we should continue
    if (!showRewardOverlay && isAutoSpinning && !spinning) {
      // Use the latest state ref for more accurate spin count
      if (latestStateRef.current.spins >= spinLevel) {
        // Add a small delay to ensure all state updates are complete
        const continueTimer = setTimeout(async () => {
          if (
            isAutoSpinning &&
            !spinning &&
            latestStateRef.current.spins >= spinLevel
          ) {
            await spin();
          }
        }, 300);

        return () => clearTimeout(continueTimer);
      } else {
        stopAutoSpin();
      }
    }
  }, [
    showRewardOverlay,
    isAutoSpinning,
    spinning,
    gameState.spins,
    spinLevel,
    spin,
    stopAutoSpin,
  ]);

  // Removed step completion animation monitoring as it's now integrated into combined rewards

  // Fallback auto-spin continuation check (safety net)
  useEffect(() => {
    if (!isAutoSpinning) return;

    const checkInterval = setInterval(async () => {
      if (
        isAutoSpinning &&
        !spinning &&
        latestStateRef.current.spins >= spinLevel
      ) {
        await spin();
      }
    }, 5000); // Check every 5 seconds as a safety net

    return () => clearInterval(checkInterval);
  }, [isAutoSpinning, spinning, spinLevel, spin]);

  // Monitor spinning state changes for auto-spin continuation
  useEffect(() => {
    // When spinning stops and auto-spin is active, check if we should continue
    if (!spinning && isAutoSpinning) {
      // Use the latest state ref for more accurate spin count
      const currentSpins = latestStateRef.current.spins;

      if (currentSpins >= spinLevel) {
        // Add a delay to allow reward animations to start
        const continueTimer = setTimeout(async () => {
          if (
            isAutoSpinning &&
            !spinning &&
            latestStateRef.current.spins >= spinLevel
          ) {
            await spin();
          }
        }, 1000); // 1 second delay to allow reward animations to start

        return () => clearTimeout(continueTimer);
      } else {
        stopAutoSpin();
      }
    }
  }, [
    spinning,
    isAutoSpinning,
    gameState.spins,
    spinLevel,
    spin,
    stopAutoSpin,
  ]);

  // Immediate auto-spin continuation check (more aggressive)
  useEffect(() => {
    if (
      !spinning &&
      isAutoSpinning &&
      latestStateRef.current.spins >= spinLevel
    ) {
      // Start the next spin immediately
      const immediateTimer = setTimeout(async () => {
        if (
          isAutoSpinning &&
          !spinning &&
          latestStateRef.current.spins >= spinLevel
        ) {
          await spin();
        }
      }, 500); // Shorter delay for immediate continuation

      return () => clearTimeout(immediateTimer);
    }
  }, [spinning, isAutoSpinning, spinLevel, spin]);

  // Get timer values from GameFeatures context
  const spinTimer = (activeTimers as TimerState)?.[TimerType.SPIN];
  const nextSpinsTimer = spinTimer?.remainingSec || 0;
  const nextSpinTime = spinTimer?.endTime || null;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="absolute inset-0 z-0">
        <Image
          src={SpinBackground}
          alt="Spin Background"
          fill
          sizes="100vw"
          priority
          className="object-cover"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        {/* Rest of your existing JSX */}
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black">
          {/* Slot Machine - Full Screen */}
          <div
            className="relative px-8 py-4 w-full h-full flex flex-col items-center"
            style={{
              backgroundImage: `url(${SpinBackground.src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Black gradient overlay */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent z-10" />

            {/* CoinsAndSpin Component - moved above the gradient in z-index */}
            <div className="absolute top-8 left-4 right-4 z-20">
              <CoinsAndSpin />
            </div>

            {/* Main Content Container with Flex Layout */}
            <div className="flex flex-col items-center w-full">
              {/* Slot Machine Container */}
              <div className="absolute top-[26%] flex flex-col items-center w-full max-w-md">
                {/* Slot Machine Section */}
                <div className="flex gap-1 mb-4">
                  {reels.map((reel, reelIndex) => (
                    <div
                      key={reelIndex}
                      className={`slot-machine ${
                        reelIndex === 2 ? "-ml-2" : ""
                      }`}
                    >
                      <div
                        className={`slot-reel ${
                          spinningReels[reelIndex] ? "spinning" : ""
                        } ${stoppingReels[reelIndex] ? "stopping" : ""}`}
                      >
                        {[0, 1, 2, 3, 4, 5, 6].map((itemIndex) => {
                          // For the extra items, generate random symbols
                          const symbol =
                            itemIndex <= 2
                              ? getSymbol(reelIndex, itemIndex)
                              : SYMBOLS[
                                  Math.floor(Math.random() * SYMBOLS.length)
                                ];
                          return (
                            <div
                              key={`first-${itemIndex}`}
                              className={`relative w-20 h-9 flex items-center justify-center rounded-lg overflow-hidden
                                ${
                                  winner && !spinning && itemIndex === 1
                                    ? ""
                                    : ""
                                }`}
                            >
                              {symbol ? (
                                <div
                                  className={`${
                                    winner && !spinning && itemIndex === 1
                                      ? "winning-symbol"
                                      : ""
                                  }`}
                                >
                                  <Image
                                    src={symbol.image}
                                    alt={symbol.name}
                                    width={24}
                                    height={24}
                                    style={imageStyle}
                                    className="object-contain"
                                  />
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls and Progress Container - Fixed to bottom */}
              <div className="fixed bottom-0 left-0 right-0 w-full h-[46%] flex flex-col space-y-2">
                {/* Progression Bar */}
                <div className="w-full">
                  <div className="w-full max-w-[300px] mx-auto">
                    <ProgressionBar
                      collectedTokens={state.collectedTokens}
                      requiredTokens={state.requiredTokens}
                      reward={state.reward}
                      isTypeCompletionRestricted={!isTypeCompletionAllowed()}
                      timeUntilNextCompletion={timeUntilGlobalRotation}
                      isGlobalTimer={false}
                      hasCompletedAllSteps={
                        // Check if user is on the current global type
                        gameState.characterProgression?.tokenType ===
                          currentGlobalType &&
                        // Check if user has completed all steps
                        // Either they're on the last step
                        (gameState.characterProgression?.currentStep >=
                          getProgressionType(currentGlobalType)?.steps.length -
                            1 ||
                          // Or they have completed the current step (collected enough tokens)
                          state.collectedTokens >= state.requiredTokens ||
                          // Or the lastCompletedType in spinProgression matches the current type
                          gameState.spinProgression?.lastCompletedType ===
                            currentGlobalType)
                      }
                    />
                  </div>
                </div>

                {/* SpinRewardBoard */}
                <div className="w-full" id="spinrewardboard">
                  <div className="h-4 flex items-center justify-center mb-1">
                    {rewardDisplay.visible && !spinning ? (
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-extrabold bg-gradient-radial from-[#FEFF0D] to-[#FFA501] text-transparent bg-clip-text">
                            {rewardDisplay.amount.toLocaleString()}
                          </span>
                          <span className="text-xl font-extrabold bg-gradient-radial from-[#FEFF0D] to-[#FFA501] text-transparent bg-clip-text">
                            SPARK
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* New Animated Reward Overlay */}
                {showRewardOverlay &&
                  showRewardAnimations &&
                  hasRewardsToShow() && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
                      <div
                        className="absolute inset-0 bg-black bg-opacity-50"
                        onClick={() => {
                          setShowRewardOverlay(false);
                        }}
                      ></div>
                      <RotatingBackground />
                      <div className="relative z-10 flex flex-wrap justify-center gap-6 max-w-[500px] p-6">
                        {/* Sparkcoins Reward - Only show if value is greater than 0 */}
                        {displayRewards.sparkcoins > 0 && (
                          <div
                            className={`reward-container min-w-[150px] ${
                              showRewardAnimations ? "show" : ""
                            }`}
                            style={{ animationDelay: "0ms" }}
                          >
                            <div
                              className="relative w-full h-[95px] rounded-[10px] bg-[rgba(31,14,14,0.98)] border border-[rgba(255,255,255,0.2)] backdrop-blur-[4px] py-4 flex items-center"
                              style={{
                                boxShadow:
                                  "inset 0 0 20px rgba(255,165,1,0.15), 0 2px 4px rgba(0,0,0,0.2)",
                              }}
                            >
                              <div className="flex flex-col items-center justify-center w-full">
                                <Image
                                  src="/assets/spin/sparkcoin.png"
                                  alt="Sparkcoin"
                                  width={40}
                                  height={40}
                                  className="mb-2 drop-shadow-lg"
                                  style={imageStyle}
                                />
                                <span className="text-[20px] font-bold text-[#FFA501]">
                                  {displayRewards.sparkcoins.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Spins Reward - Only show if value is greater than 0 */}
                        {displayRewards.spins > 0 && (
                          <div
                            className={`reward-container min-w-[150px] ${
                              showRewardAnimations ? "show" : ""
                            }`}
                            style={{ animationDelay: "150ms" }}
                          >
                            <div
                              className="relative w-full h-[95px] rounded-[10px] bg-[rgba(31,14,14,0.98)] border border-[rgba(255,255,255,0.2)] backdrop-blur-[4px] py-4 flex items-center"
                              style={{
                                boxShadow:
                                  "inset 0 0 20px rgba(255,165,1,0.15), 0 2px 4px rgba(0,0,0,0.2)",
                              }}
                            >
                              <div className="flex flex-col items-center justify-center w-full">
                                <Image
                                  src="/assets/spin/spin.png"
                                  alt="Spin"
                                  width={40}
                                  height={40}
                                  className="mb-2 drop-shadow-lg"
                                  style={imageStyle}
                                />
                                <span className="text-[20px] font-bold text-[#FFA501]">
                                  {displayRewards.spins.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Sparky Tokens Reward - Only show if value is greater than 0 */}
                        {displayRewards.sparkytokens > 0 && (
                          <div
                            className={`reward-container min-w-[150px] ${
                              showRewardAnimations ? "show" : ""
                            }`}
                            style={{ animationDelay: "150ms" }}
                          >
                            <div
                              className="relative w-full h-[95px] rounded-[10px] bg-[rgba(31,14,14,0.98)] border border-[rgba(255,255,255,0.2)] backdrop-blur-[4px] py-4 flex items-center"
                              style={{
                                boxShadow:
                                  "inset 0 0 20px rgba(255,165,1,0.15), 0 2px 4px rgba(0,0,0,0.2)",
                              }}
                            >
                              <div className="flex flex-col items-center justify-center w-full">
                                <Image
                                  src="/assets/spin/token.png"
                                  alt="Sparky Token"
                                  width={40}
                                  height={40}
                                  className="mb-2 drop-shadow-lg"
                                  style={imageStyle}
                                />
                                <span className="text-[20px] font-bold text-[#FFA501]">
                                  {displayRewards.sparkytokens}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Recharge Reward - Only show if value is greater than 0 */}
                        {displayRewards.recharge > 0 && (
                          <div
                            className={`reward-container min-w-[150px] ${
                              showRewardAnimations ? "show" : ""
                            }`}
                            style={{ animationDelay: "150ms" }}
                          >
                            <div
                              className="relative w-full h-[95px] rounded-[10px] bg-[rgba(31,14,14,0.98)] border border-[rgba(255,255,255,0.2)] backdrop-blur-[4px] py-4 flex items-center"
                              style={{
                                boxShadow:
                                  "inset 0 0 20px rgba(255,165,1,0.15), 0 2px 4px rgba(0,0,0,0.2)",
                              }}
                            >
                              <div className="flex flex-col items-center justify-center w-full">
                                <Image
                                  src="/assets/spin/recharge.png"
                                  alt="Recharge"
                                  width={40}
                                  height={40}
                                  className="mb-2 drop-shadow-lg"
                                  style={imageStyle}
                                />
                                <span className="text-[20px] font-bold text-[#FFA501]">
                                  {displayRewards.recharge.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Turbo Reward - Only show if value is greater than 0 */}
                        {displayRewards.turbo > 0 && (
                          <div
                            className={`reward-container min-w-[150px] ${
                              showRewardAnimations ? "show" : ""
                            }`}
                            style={{ animationDelay: "150ms" }}
                          >
                            <div
                              className="relative w-full h-[95px] rounded-[10px] bg-[rgba(31,14,14,0.98)] border border-[rgba(255,255,255,0.2)] backdrop-blur-[4px] py-4 flex items-center"
                              style={{
                                boxShadow:
                                  "inset 0 0 20px rgba(255,165,1,0.15), 0 2px 4px rgba(0,0,0,0.2)",
                              }}
                            >
                              <div className="flex flex-col items-center justify-center w-full">
                                <Image
                                  src="/assets/spin/turbo.png"
                                  alt="Turbo"
                                  width={40}
                                  height={40}
                                  className="mb-2 drop-shadow-lg"
                                  style={imageStyle}
                                />
                                <span className="text-[20px] font-bold text-[#FFA501]">
                                  {displayRewards.turbo.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Debug Overlay */}
                {showDebugOverlay && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden  z-40">
                    <div
                      className="absolute inset-0 bg-black bg-opacity-70"
                      onClick={() => setShowDebugOverlay(false)}
                    ></div>
                    <div className="relative bg-[rgba(31,14,14,0.98)] border border-[rgba(255,255,255,0.2)] rounded-[10px] p-4 max-w-[90vw] max-h-[80vh] overflow-y-auto">
                      {/* Header */}
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-[#FFA501] text-xl font-bold">
                          Multi-Spin Results
                        </h2>
                        <button
                          className="text-[#FFA501] text-2xl font-bold hover:opacity-70"
                          onClick={() => setShowDebugOverlay(false)}
                        >
                          &times;
                        </button>
                      </div>

                      {/* Debug Data */}
                      {debugData.length > 0 ? (
                        <>
                          {/* Table Header */}
                          <div className="grid grid-cols-5 gap-2 text-[#FFA501] font-bold text-center text-sm border-b border-[rgba(255,255,255,0.2)] pb-2">
                            <div>Spin #</div>
                            <div>1</div>
                            <div>2</div>
                            <div>3</div>
                            <div>Results</div>
                          </div>

                          {/* Table Rows */}
                          {debugData.map((spin, index) => {
                            // Helper function to get symbol image
                            const getSymbolImage = (symbolId: string) => {
                              const symbol = SYMBOLS.find(
                                (s) => s.id === symbolId
                              );
                              return symbol
                                ? symbol.image
                                : "/assets/spin/sparkcoin.png";
                            };

                            return (
                              <div
                                key={index}
                                className="grid grid-cols-5 gap-2 items-center bg-[rgba(0,0,0,0.3)] p-3 "
                              >
                                {/* Spin Number */}
                                <div className="text-[#FFA501] font-bold text-center">
                                  {spin.spinNumber}
                                </div>

                                {/* Symbol Icons */}
                                <div className="flex justify-center">
                                  <Image
                                    src={getSymbolImage(spin.symbols[0])}
                                    alt={spin.symbols[0]}
                                    width={24}
                                    height={24}
                                    style={imageStyle}
                                    className="object-contain"
                                  />
                                </div>
                                <div className="flex justify-center">
                                  <Image
                                    src={getSymbolImage(spin.symbols[1])}
                                    alt={spin.symbols[1]}
                                    width={24}
                                    height={24}
                                    style={imageStyle}
                                    className="object-contain"
                                  />
                                </div>
                                <div className="flex justify-center">
                                  <Image
                                    src={getSymbolImage(spin.symbols[2])}
                                    alt={spin.symbols[2]}
                                    width={24}
                                    height={24}
                                    style={imageStyle}
                                    className="object-contain"
                                  />
                                </div>

                                {/* Results */}
                                <div className="text-white text-xs text-center space-y-1">
                                  {spin.winningCombo ? (
                                    <>
                                      <div className="text-green-400 font-semibold text-[10px]">
                                        {spin.winningCombo}
                                      </div>
                                      {spin.reward && (
                                        <div className="flex items-center justify-center gap-1">
                                          <Image
                                            src={getRewardImage(
                                              spin.reward.type
                                            )}
                                            alt={spin.reward.type}
                                            width={16}
                                            height={16}
                                            style={imageStyle}
                                            className="object-contain"
                                          />
                                          <span>{spin.reward.amount}</span>
                                        </div>
                                      )}
                                      {spin.sparkytokens > 0 && (
                                        <div className="flex items-center justify-center gap-1">
                                          <span>{spin.sparkytokens}</span>
                                          <Image
                                            src="/assets/spin/token.png"
                                            alt="SparkTokens"
                                            width={16}
                                            height={16}
                                            style={imageStyle}
                                            className="object-contain"
                                          />
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="text-gray-400">No win</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Summary */}
                          <div className="mt-6 p-4 bg-[rgba(255,165,1,0.1)] rounded border border-[#FFA501]">
                            <div className="text-[#FFA501] font-bold mb-3 text-center">
                              Reward Overlay Summary
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-white text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-yellow-400">
                                  SparkCoins:
                                </span>
                                <div className="flex items-center gap-2">
                                  <span>
                                    {finalCombinedRewards.sparkcoins.toLocaleString()}
                                  </span>
                                  <Image
                                    src="/assets/spin/sparkcoin.png"
                                    alt="SparkCoins"
                                    width={20}
                                    height={20}
                                    style={imageStyle}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-yellow-400">Spins:</span>
                                <div className="flex items-center gap-2">
                                  <span>{finalCombinedRewards.spins}</span>
                                  <Image
                                    src="/assets/spin/spin.png"
                                    alt="Spins"
                                    width={20}
                                    height={20}
                                    style={imageStyle}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-yellow-400">Turbo:</span>
                                <div className="flex items-center gap-2">
                                  <span>{finalCombinedRewards.turbo}</span>
                                  <Image
                                    src="/assets/spin/turbo.png"
                                    alt="Turbo"
                                    width={20}
                                    height={20}
                                    style={imageStyle}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-yellow-400">
                                  Recharge:
                                </span>
                                <div className="flex items-center gap-2">
                                  <span>{finalCombinedRewards.recharge}</span>
                                  <Image
                                    src="/assets/spin/recharge.png"
                                    alt="Recharge"
                                    width={20}
                                    height={20}
                                    style={imageStyle}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between col-span-2">
                                <span className="text-yellow-400">
                                  SparkTokens:
                                </span>
                                <div className="flex items-center gap-2">
                                  <span>
                                    {finalCombinedRewards.sparkytokens}
                                  </span>
                                  <Image
                                    src="/assets/spin/token.png"
                                    alt="SparkTokens"
                                    width={20}
                                    height={20}
                                    style={imageStyle}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-white text-center py-8">
                          No debug data available. Perform a multi-spin to see
                          results.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Spin Level Selector */}
                <div className="w-full flex justify-center">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      // Only prevent during actual spinning
                      if (!spinning) {
                        cycleSpinLevel();
                      }
                    }}
                    // Removed onTouchStart handler to prevent double-firing on mobile devices
                    disabled={spinning}
                    className={`px-2 py-[6px] rounded-[40px] text-white font-bold text-xs transition-all flex items-center gap-1 relative
                      ${
                        spinning
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:opacity-90 active:scale-95"
                      }`}
                    style={{
                      background:
                        "linear-gradient(#CD1E08, #670F04) padding-box, linear-gradient(to bottom, #670F04, #CD1E08) border-box",
                      border: "1px solid transparent",
                      transition: "transform 0.15s ease-in-out",
                    }}
                  >
                    <div className="relative flex items-center gap-1">
                      <Image
                        src="/assets/spin/spin.png"
                        alt="Spin"
                        width={14}
                        height={14}
                        style={imageStyle}
                      />
                      <span>Spin</span>
                      <span className="spin-level-display">
                        {displaySpinLevel}x
                      </span>
                    </div>
                  </button>
                </div>

                {/* Spins Progress Bar */}
                <SpinsDisplay
                  gameState={gameState}
                  latestStateRef={latestStateRef}
                  nextSpinsTimer={nextSpinsTimer}
                  _nextSpinTime={nextSpinTime}
                  formatTime={formatTime}
                />

                {/* Spin Controls - Bottom */}
                <div className="w-full flex flex-col items-center pt-8 space-y-4">
                  <button
                    ref={spinButtonRef}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                    onPointerCancel={handlePointerUp}
                    onTouchStart={(e) => {
                      // Additional touch prevention as backup
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onContextMenu={(e) => {
                      // Always prevent context menu
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }}
                    onDragStart={(e: React.DragEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }}
                    disabled={spinning && !isAutoSpinning}
                    className={`relative transition-all ${
                      isAutoSpinning ? "auto-spin-active z-[9999]" : ""
                    }`}
                    style={
                      {
                        opacity: spinning && !isAutoSpinning ? 0.5 : 1,
                        cursor:
                          spinning && !isAutoSpinning
                            ? "not-allowed"
                            : "pointer",
                        touchAction: "manipulation",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        MozUserSelect: "none",
                        msUserSelect: "none",
                        WebkitTouchCallout: "none",
                        WebkitTapHighlightColor: "transparent",
                        WebkitUserDrag: "none",
                        KhtmlUserDrag: "none",
                        MozUserDrag: "none",
                        OUserDrag: "none",
                        userDrag: "none",
                        pointerEvents: "auto",
                        // Additional context menu prevention
                        contextMenu: "none",
                        WebkitContextMenu: "none",
                        // Prevent long-press selection on mobile
                        WebkitTouchSelect: "none",
                        KhtmlUserSelect: "none",
                        // Force touch-action at element level
                        WebkitTouchAction: "manipulation",
                      } as React.CSSProperties
                    }
                  >
                    <Image
                      src={
                        gameState.spins < spinLevel
                          ? "/assets/spin/spinbuttondisabled.png"
                          : isAutoSpinning
                          ? "/assets/spin/spinbuttonpressed.png"
                          : showPressedState
                          ? "/assets/spin/spinbuttonpressed.png"
                          : "/assets/spin/spinbuttonreleased.png"
                      }
                      alt="Spin Button"
                      width={150}
                      height={45}
                      className="h-auto object-contain"
                      style={imageStyle}
                      priority
                    />
                  </button>

                  {/* Auto-spin instruction text */}
                  <div
                    className={`absolute bottom-10 left-1/2 transform -translate-x-1/2 rounded-3xl px-4 py-1 text-center text-xs font-medium transition-all ${
                      gameState.spins < spinLevel
                        ? "opacity-50"
                        : isAutoSpinning
                        ? "z-[9999]"
                        : ""
                    }`}
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.66)",
                      border: "1px solid #670F04",
                    }}
                  >
                    <span className="text-white">
                      {gameState.spins < spinLevel
                        ? "Not enough spins"
                        : isAutoSpinning
                        ? "Click to stop"
                        : "Hold for auto spin"}
                    </span>
                  </div>

                  {/* Control Buttons Row - Moved to right end */}
                  <div className="flex-col justify-end pr-2 absolute right-0 space-y-2">
                    <Tooltip
                      content={tooltipContent}
                      position="top"
                      spinProgression={{
                        currentStep: state.currentStep,
                        totalSteps:
                          getProgressionType(currentGlobalType)?.steps.length ||
                          0,
                        collectedTokens: state.collectedTokens,
                        requiredTokens: state.requiredTokens,
                      }}
                    >
                      <div className="cursor-pointer bg-[#301402] rounded-full p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-yellow-500"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 16v-4"></path>
                          <path d="M12 8h.01"></path>
                        </svg>
                      </div>
                    </Tooltip>

                    {/* Debug icon */}
                    <div
                      className="cursor-pointer bg-[#301402] rounded-full p-2"
                      onClick={() => setShowDebugOverlay(true)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-green-500"
                      >
                        <path d="m8 2 1.88 1.88"></path>
                        <path d="M14.12 3.88 16 2"></path>
                        <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"></path>
                        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"></path>
                        <path d="M12 20v-9"></path>
                        <path d="M6.53 9C4.6 8.8 3 7.1 3 5"></path>
                        <path d="M6 13H2"></path>
                        <path d="M3 21c0-2.1 1.7-3.9 3.8-4"></path>
                        <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"></path>
                        <path d="M22 13h-4"></path>
                        <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpinPage;
