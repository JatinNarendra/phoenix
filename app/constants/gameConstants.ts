import { levelConfig } from "../utility/stageConfig";
import { TimerType, GameState } from "../types/gameTypes";

// Export constants that need to be used early
export const BOOSTER_REFILL_INTERVAL = 18000000; // 5 hours in milliseconds
export const BOOSTER_REFILL_TIME = BOOSTER_REFILL_INTERVAL / 1000;
export const MAX_BOOSTER_USES = 3;

// Current app version - update this when making significant changes to game state structure
export const CURRENT_GAME_VERSION = "1.0";

export const initialGameState: GameState = {
  user_id: "",
  coins: 0,
  spins: 50,
  totalSpins: 0,
  totalCoins: 0,
  tapPower: 1,
  level: 1,
  stage: 1,
  FlameCapacityTap: levelConfig[1].sparkRequired,
  minPhoenixEnergy: 0,
  RechargeLevel: 1,
  currentRecharge: 1500,
  phoenixEnergyProgress: 0,
  energyCapacity: 1500,
  spinLevel: 1,
  isSpinning: false,
  spinTimer: 0,
  spinLimit: 50,
  gameVersion: CURRENT_GAME_VERSION,
  lastUpdate: Date.now(),
  spinGoals: [],
  boosts: {
    inGameTurbo: 3,
    rewardedTurbo: 0,
    inGameRecharge: 3,
    rewardedRecharge: 0,
    turboActive: false,
    rechargeActive: false,
    turboTimeLeft: 0,
    rechargeTimeLeft: 0,
    turboRefillTime: 0,
    rechargeRefillTime: 0,
    autoTapUses: 3,
    turboEndTime: undefined,
    rechargeEndTime: undefined,
    maxTurboUses: MAX_BOOSTER_USES,
    maxRechargeUses: MAX_BOOSTER_USES,
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
    currentCharacter: "1",
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
  timers: {
    turboTimeLeft: 0,
    rechargeTimeLeft: 0,
    turboRefillTime: 0,
    rechargeRefillTime: 0,
  },
  application_state: {
    isAutotapPurchased: false,
    has_visited_earn_page: false,
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
    directMiniAppLink: "",
    startCommandLink: "",
  },
  _needsSync: false,
  characterProgression: {
    tokenType: 1,
    nextRotationTime: Date.now() + 72 * 60 * 60 * 1000, // 72 hours from now
    currentTokens: 0,
    requiredTokens: 10,
    currentStep: 0,
  },
  // Add initial spin progression data
  spinProgression: {
    currentType: 0, // Start with type 1 (0-indexed)
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
  autoTapInitialPower: 1,
  lastActiveTime: Date.now(), // Initialize with current time
};

// Storage keys
export const STORAGE_KEYS = {
  USER: "phoenix_state",
  TIMERS: "phoenix_timers", // Single key for all timer data
};

// Constants
export const AUTO_TAP_UNLOCK_COST = 100;
export const AUTO_TAP_DURATION = 180; // 3 minutes

// Timer configuration
export const TIMER_CONFIG: Record<
  TimerType,
  { maxDuration: number; maxUses: number; resetInterval: number }
> = {
  [TimerType.AUTO_TAP]: {
    maxDuration: AUTO_TAP_DURATION * 1000,
    maxUses: 3,
    resetInterval: 24 * 60 * 60 * 1000, // 24 hours
  },
  [TimerType.TURBO]: {
    maxDuration: 300000, // 5 minutes
    maxUses: 5,
    resetInterval: 60 * 60 * 1000, // 1 hour
  },
  [TimerType.RECHARGE]: {
    maxDuration: 300000, // 5 minutes
    maxUses: 5,
    resetInterval: 60 * 60 * 1000, // 1 hour
  },
  [TimerType.DAILY_REWARD]: {
    maxDuration: 24 * 60 * 60 * 1000, // 24 hours
    maxUses: 1,
    resetInterval: 24 * 60 * 60 * 1000, // 24 hours
  },
  [TimerType.SPIN]: {
    // Production code - 2 hours timer
    maxDuration: 2 * 60 * 60 * 1000, // 2 hours

    // Testing code (commented out)
    // maxDuration: 1 * 60 * 1000, // 1 minute
    maxUses: 50,
    resetInterval: 24 * 60 * 60 * 1000, // 24 hours
  },
};

export const energyCapacityConfig: Record<
  1 | 2 | 3 | 4 | 5,
  { capacity: number; cost: number }
> = {
  1: {
    capacity: 2500,
    cost: 1000,
  },
  2: {
    capacity: 5000,
    cost: 2500,
  },
  3: {
    capacity: 10000,
    cost: 5000,
  },
  4: {
    capacity: 20000,
    cost: 10000,
  },
  5: {
    capacity: 40000,
    cost: 20000,
  },
};
