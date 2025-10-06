import { OldGameState, GameState } from "../types/gameTypes";
import { AUTO_TAP_DURATION } from "../constants/gameConstants";

// Add type guard to check if state is in new format
export const isNewGameState = (
  state: OldGameState | GameState
): state is GameState => {
  return "boosts" in state && "inGameTurbo" in (state.boosts || {});
};

// Move the updateAutoTapState helper function here
export const updateAutoTapState = (
  state: GameState,
  updates: {
    autoTapActive?: boolean;
    autoTapEndTime?: number;
    autoTapStartTime?: number;
    autoTapProgress?: number;
    autoTapTimeLeft?: number;
    autoTapSpark?: number;
    autoTapCoins?: number;
    autoTapClaimed?: boolean;
  }
): GameState => {
  // Never modify coins in this function
  return {
    ...state,
    ...updates,
    application_state: {
      isAutotapPurchased: state.application_state?.isAutotapPurchased ?? false,
      has_visited_earn_page:
        state.application_state?.has_visited_earn_page ?? false,
      isAutotapActive: updates.autoTapActive ?? state.autoTapActive ?? false,
    },
  };
};

// Auto tap reward table based on tap power level (3 Hour TapBot Spark Coin)
const AUTO_TAP_REWARDS: Record<number, number> = {
  1: 64800,
  2: 64800,
  3: 64800,
  4: 129600,
  5: 129600,
  6: 129600,
  7: 129600,
  8: 194400,
  9: 194400,
  10: 194400,
  11: 194400,
  12: 259200,
  13: 259200,
  14: 259200,
  15: 259200,
  16: 320000,
  17: 320000,
  18: 320000,
  19: 320000,
  20: 402180,
  21: 402180,
  22: 402180,
  23: 402180,
  24: 470690,
  25: 470690,
  26: 470690,
  27: 470690,
  28: 470690,
  29: 540000,
  30: 540000,
  31: 540000,
  32: 540000,
  33: 630000,
  34: 630000,
  35: 630000,
  36: 630000,
  37: 690150,
  38: 690150,
  39: 690150,
  40: 690150,
};

// Helper function to calculate auto tap reward consistently
export const calculateAutoTapReward = (tapPowerLevel: number): number => {
  // Clamp tap power level to valid range
  const clampedLevel = Math.max(1, Math.min(40, tapPowerLevel));

  // Get reward from table, fallback to highest level if beyond table
  return AUTO_TAP_REWARDS[clampedLevel] || AUTO_TAP_REWARDS[40];
};
