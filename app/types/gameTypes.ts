import { PlatformType } from "./Customer";

// Interfaces defining the shape of game state and related types
export interface Boosts {
  inGameTurbo: number;
  rewardedTurbo: number;
  inGameRecharge: number;
  rewardedRecharge: number;
  turboActive: boolean;
  rechargeActive: boolean;
  turboEndTime?: number;
  rechargeEndTime?: number;
  autoTapUses: number;
  turboTimeLeft: number;
  rechargeTimeLeft: number;
  turboRefillTime: number;
  rechargeRefillTime: number;
  maxTurboUses: number;
  maxRechargeUses: number;
}

export interface SocialTaskState {
  completedTasks: string[];
  lastUpdated?: number;
}

export interface SpinGoal {
  id: number;
  icon: string;
  required: number;
  collected: number;
  reward: number;
  completed: boolean;
}

export interface SpinCard {
  id: string;
  icon: string;
  spins: number;
  bonus: string;
  price: number;
  freeForNow?: boolean;
}

export interface DailyReward {
  collectedAt: string;
  coins: number;
}

export interface ApplicationState {
  isAutotapPurchased: boolean;
  isAutotapActive?: boolean;
  has_visited_earn_page: boolean;
  // Add any other known properties here
  [additionalKey: string]: boolean | undefined;
}

/**
 * OldGameState interface represents the older version of the game state.
 * This interface is used for backward compatibility when converting old saved states
 * to the new format. It supports both the original structure with nested objects
 * and the newer flattened structure with different property names.
 *
 * The interface is designed to handle multiple versions of the state schema to ensure
 * smooth migrations for users who have older saved states.
 */
export interface OldGameState {
  user_id?: string;
  coins?: number;
  spins?: number;
  totalSpins?: number;
  totalCoins?: number;
  level?: number;
  stage?: number;
  // Supports both old nested booster structure and new flattened structure
  boosts?:
    | {
        turbo?: {
          uses?: number;
          active?: boolean;
        };
        recharge?: {
          uses?: number;
          active?: boolean;
        };
      }
    | Boosts;
  energy?: {
    current?: number;
    capacity?: number;
    rechargeLevel?: number;
  };
  currentRecharge?: number;
  progress?: {
    daily?: {
      streak: number;
      lastDay: number;
    };
    social: {
      x: string[];
      youtube: string[];
      telegram: string[];
    };
  };
  // Supports both old and new upgrade property names
  upgrades?: {
    // Old format
    tap?: number;
    spin?: number;
    energy?: number;
    energyLevel?: number;
    recharge?: number;
    // New format
    tapLevel?: number;
    spinLevel?: number;
    rechargeLevel?: number;
  };
  application_state?: ApplicationState;
  _needsSync?: boolean;
  autoTapProgress?: number;
  lastAutoTapUpdate?: number;
  pendingLevelUp?: boolean;
  pendingTapUpgrade?: number;
}

export interface GameState {
  user_id: string;
  coins: number;
  spins: number;
  totalSpins: number;
  totalCoins: number;
  tapPower: number;
  level: number;
  stage: number;
  FlameCapacityTap: number;
  minPhoenixEnergy: number;
  RechargeLevel: number;
  currentRecharge: number;
  phoenixEnergyProgress: number;
  energyCapacity: number;
  spinLevel: number;
  isSpinning: boolean;
  spinTimer: number;
  spinLimit: number;
  gameVersion: string;
  lastUpdate: number;
  spinGoals: SpinGoal[];
  boosts: Boosts;
  upgrades: {
    tapLevel: number;
    energyLevel: number;
    rechargeLevel: number;
    spinLevel: number;
  };
  progress: {
    daily: {
      streak: number;
      lastDay: number;
    };
    social: {
      x: string[];
      youtube: string[];
      telegram: string[];
    };
  };
  characterProgress: {
    currentCharacter: string;
    currentTokens: number;
    requiredTokens: number;
  };
  dailyRewards: {
    lastCollected: string;
    currentStreak: number;
    maxStreak: number;
    lastDay: number;
    collectedDays: { [key: number]: DailyReward };
  };
  socialTasks: {
    [key in PlatformType]?: SocialTaskState;
  };
  application_state?: ApplicationState;
  autoTapDaily: {
    lastReset: string;
    usesRemaining: number;
  };
  timers: {
    turboTimeLeft: number;
    rechargeTimeLeft: number;
    turboRefillTime: number;
    rechargeRefillTime: number;
  };
  autoTapCoins: number;
  autoTapTotalCoins: number;
  autoTapClaimed: boolean;
  autoTapEndTime: number;
  autoTapStartTime: number;
  autoTapActive: boolean;
  autoTapTimeLeft: number;
  autoTapSpark: number;
  autoTapProgress: number;
  lastAutoTapUpdate: number;
  pendingTapUpgrade?: number;
  pendingLevelUp?: boolean;
  phoenixEnergyFrozen?: boolean;
  referral?: {
    inviteLink: string;
    referredFriends: number;
    totalRewards: number;
    directMiniAppLink?: string;
    startCommandLink?: string;
  };
  _needsSync?: boolean;
  characterProgression?: {
    tokenType: number; // 1, 2, or 3
    nextRotationTime: number; // timestamp in milliseconds
    currentTokens: number;
    requiredTokens: number;
    currentStep: number; // current step in the progression
  };
  // Add spin progression data to GameState for database sync
  spinProgression?: {
    currentType: number;
    currentStep: number;
    collectedTokens: number;
    requiredTokens: number;
    reward: {
      type: "sparkcoins" | "spins" | "turbo" | "recharge";
      value: number;
    };
    earnedRewards: {
      sparkcoins: number;
      spins: number;
      turbo: number;
      recharge: number;
    };
    lastCompletedStep: {
      type: number;
      step: number;
      reward: {
        type: "sparkcoins" | "spins" | "turbo" | "recharge";
        value: number;
      };
    } | null;
    lastCompletedType: number | null;
  };
  autoTapInitialPower?: number;
  lastActiveTime?: number; // timestamp in milliseconds for tracking user activity
}

export interface GameContextType {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  persistState: (
    updates: Partial<GameState> | ((prev: GameState) => GameState)
  ) => void;
  addBoosterUses: (
    type: "turbo" | "recharge",
    amount: number,
    isRewarded?: boolean
  ) => void;
  addCoins: (amount: number) => void;
  calculateNextRefillTime: (lastRefillTime: number) => number;
  decreaseEnergy: (amount: number) => void;
  decreaseSpins: (amount: number) => void;
  formatRefillTime: (refillTime: number) => string;
  getBoosterState: (type: "turbo" | "recharge") => {
    active: boolean;
    timeLeft: number;
    refillTime: number;
  };
  getCurrentLevelConfig: () => {
    sparkRequired: number;
    rewardCoins: number;
  };
  increaseCoins: (amount: number) => void;
  increaseSpins: (amount: number) => void;
  purchaseItem: (cost: number, rewards?: Partial<GameState>) => boolean;
  purchaseUpgrade: (upgradeType: string) => void;
  resetGame: () => void;
  setBoosterActive: (type: "turbo" | "recharge", active: boolean) => void;
  setBoosterEndTime: (type: "turbo" | "recharge", endTime: number) => void;
  setBoosterRefillTime: (
    type: "turbo" | "recharge",
    refillTime: number
  ) => void;
  updateBoosts: (updates: Partial<Boosts>) => void;
  updateEnergy: (amount: number) => void;
  updateSpins: (amount: number) => void;
  updateLevel: (level: number) => void;
  updateTaps: (taps: number) => void;
  handleBoosterRefill: (
    updateCallback: (update: Partial<GameState>) => void
  ) => void;
  calculateTapPower: (level: number) => number;
  energyCapacityConfig: Record<
    1 | 2 | 3 | 4 | 5,
    { capacity: number; cost: number }
  >;
  setIsSpinning: React.Dispatch<React.SetStateAction<boolean>>;
  startAutoSpin: (
    spinFunction: () => Promise<{ success: boolean; reason?: string }>
  ) => void;
  stopAutoSpin: () => void;
  isAutoSpinning: boolean;
  criticalStateUpdate: (
    updates: Partial<GameState> | ((prev: GameState) => GameState)
  ) => Promise<void>;
  isSpinning: boolean;
  spinTimer: number;
  spinLimit: number;
  formatTime: (seconds: number) => string;
  calculateTotalCoins: (tapPower: number) => number;
  calculateAutoTapDuration: (tapPower: number, totalCoins: number) => number;
  calculateTotalCoinsWithTurbo: (
    tapPower: number,
    turboActive: boolean
  ) => number;
  turboActive: boolean;
  setTurboActive: (active: boolean) => void;
  rechargeActive: boolean;
  setRechargeActive: (active: boolean) => void;
  setTurboTimeLeft: (timeLeft: number) => void;
  setRechargeTimeLeft: (timeLeft: number) => void;
  autoTapActive: boolean;
  autoTapTimeLeft: number;
  autoTapProgress: number;
  purchaseAutoTap: () => Promise<boolean>;
  timers: {
    spin: TimerData | undefined;
    autoTap: TimerData | undefined;
    turbo: TimerData | undefined;
  };
  setPhoenixEnergyFrozen: (frozen: boolean) => void;
  initializeCharacterProgressionState: () => void;
  updateCharacterProgressionTokens: (tokensToAdd: number) => void;
  checkCharacterProgressionRotation: () => void;
  updateSpinProgression: (
    spinProgressionData: GameState["spinProgression"]
  ) => void;
  _debug: {
    testLevelUp: (targetLevel: number) => void;
  };
  forceRefreshFromDatabase: () => Promise<boolean>;
  isTypeCompletionAllowed: () => boolean;
  getTimeUntilNextTypeCompletion: () => {
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  };
}

// Timer-related types and enums
export enum TimerType {
  AUTO_TAP = "autoTap",
  TURBO = "turbo",
  RECHARGE = "recharge",
  DAILY_REWARD = "dailyReward",
  SPIN = "spin",
}

export interface TimerMetadata {
  autoTapSpark?: number;
  coinsEarned?: number;
  [key: string]: unknown;
}

export interface TimerData {
  endTime?: number;
  duration?: number;
  status: "active" | "completed" | "cancelled";
  metadata?: TimerMetadata;
  remainingSec?: number;
}

export interface TimerState {
  [TimerType.AUTO_TAP]?: TimerData;
  [TimerType.TURBO]?: TimerData;
  [TimerType.RECHARGE]?: TimerData;
  [TimerType.DAILY_REWARD]?: TimerData;
  [TimerType.SPIN]?: TimerData;
}
