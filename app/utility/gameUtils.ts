import { OldGameState, GameState } from "../types/gameTypes";
import { AUTO_TAP_DURATION } from "../constants/gameConstants";

// Add type guard to check if state is in new format
export const isNewGameState = (state: OldGameState | GameState): state is GameState => {
  return 'boosts' in state && 'inGameTurbo' in (state.boosts || {});
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
      has_visited_earn_page: state.application_state?.has_visited_earn_page ?? false,
      isAutotapActive: updates.autoTapActive ?? state.autoTapActive ?? false
    }
  };
};

// Helper function to calculate auto tap reward consistently
export const calculateAutoTapReward = (tapPowerLevel: number): number => {
  return AUTO_TAP_DURATION * tapPowerLevel;
}; 