/**
 * Spin Configuration
 *
 * This file contains configuration settings for the spin feature, including
 * reward calculations, token mappings, and character goals.
 */

// Token name mappings
export const TOKEN_NAMES = {
  TREASURE_BOX: "treasurebox",
  TREASURE_TROVE: "treasuretrove",
  ENERGY_CAN: "energycan",
  TURBO: "turbo",
  SPARK_TOKEN: "sparktoken",
  SPIN: "spin",
  SPARK_COIN: "sparkcoin",
  SPARKY_TOKEN: "sparkytoken",
  RECHARGE: "recharge",
};

// Spin purchase options
export const SPIN_PURCHASE_OPTIONS = [
  {
    id: "starter_20",
    icon: "yellow",
    spins: 20,
    bonus: "",
    price: 6,
    freeForNow: false,
  },
  {
    id: "basic_100",
    icon: "purple",
    spins: 100,
    bonus: "20% more!",
    price: 23,
    freeForNow: false,
  },
  {
    id: "standard_500",
    icon: "skyblue",
    spins: 500,
    bonus: "33% more!",
    price: 103,
    freeForNow: false,
  },
  {
    id: "premium_1000",
    icon: "green",
    spins: 1000,
    bonus: "52% more!",
    price: 182,
    freeForNow: false,
  },
  {
    id: "elite_5000",
    icon: "golden",
    spins: 5000,
    bonus: "92% more!",
    price: 715,
    freeForNow: false,
  },
  {
    id: "ultimate_15000",
    icon: "red",
    spins: 15000,
    bonus: "146% more!",
    price: 1672,
    freeForNow: false,
  },
];

// Numeric value to token name mapping
export const VALUE_TO_TOKEN: Record<string, string> = {
  "1": TOKEN_NAMES.TREASURE_BOX,
  "2": TOKEN_NAMES.SPARK_COIN,
  "3": TOKEN_NAMES.ENERGY_CAN,
  "8": TOKEN_NAMES.SPARK_TOKEN,
  "13": TOKEN_NAMES.TREASURE_TROVE,
  "14": TOKEN_NAMES.SPIN,
  "15": TOKEN_NAMES.TURBO,
  "16": TOKEN_NAMES.SPARKY_TOKEN,
  "17": TOKEN_NAMES.RECHARGE,
};

// Token to numeric value mapping for backward compatibility
export const TOKEN_TO_VALUE: Record<string, string> = {
  [TOKEN_NAMES.TREASURE_BOX]: "1",
  [TOKEN_NAMES.SPARK_COIN]: "2",
  [TOKEN_NAMES.ENERGY_CAN]: "3",
  [TOKEN_NAMES.SPARK_TOKEN]: "8",
  [TOKEN_NAMES.TREASURE_TROVE]: "13",
  [TOKEN_NAMES.SPIN]: "14",
  [TOKEN_NAMES.TURBO]: "15",
  [TOKEN_NAMES.SPARKY_TOKEN]: "16",
  [TOKEN_NAMES.RECHARGE]: "17",
};

// Character goal key to token name mapping
export const CHARACTER_KEY_TO_NAME: Record<string, string> = {
  "3": TOKEN_NAMES.ENERGY_CAN,
  "4": TOKEN_NAMES.TURBO,
  "5": TOKEN_NAMES.TURBO,
  "6": TOKEN_NAMES.TREASURE_BOX,
  "7": TOKEN_NAMES.TREASURE_BOX,
  "8": TOKEN_NAMES.SPARK_TOKEN,
  "9": TOKEN_NAMES.TREASURE_TROVE,
  "10": TOKEN_NAMES.TREASURE_TROVE,
  "11": TOKEN_NAMES.SPARK_TOKEN,
};

// Spin reward configurations
export const SPIN_REWARDS = {
  // Basic combinations
  ANY_THREE_DIFFERENT: 2500, // Any 3 different symbols

  // Treasure Box rewards
  TREASURE_BOX: {
    ONE: 4000, // 1 Treasure Box
    TWO: 40000, // 2 Treasure Box
    THREE: 150000, // 3 Treasure Box
  },

  // Treasure Trove rewards
  TREASURE_TROVE: {
    ONE: 5000, // 1 Treasure Trove
    TWO: 25000, // 2 Treasure Trove
    THREE: 500000, // 3 Treasure Trove
  },

  // Spark Coin rewards
  SPARK_COIN: {
    TWO: 20000, // 2 Spark Coin
    THREE: 250000, // 3 Spark Coin
  },

  // Sparky Token rewards
  SPARKY_TOKEN: {
    ONE: { tokens: 1, coins: 2500 }, // 1 Sparky Token + 2500 Spark Coin
    TWO: { tokens: 3, coins: 20000 }, // 2 Sparky Token + 20000 Spark Coin
    THREE: { tokens: 9, coins: 75000 }, // 3 Sparky Token + 75000 Spark Coin
  },

  // Special combinations
  SPECIAL_COMBO: 7500, // 1 Treasure Trove & 1 Treasure Box & One any other
  TROVE_BOX_SPIN: 5000, // Trove - Box - SPIN
  TROVE_TURBO_SPIN: 7500, // Trove - Turbo - SPIN
  TROVE_RECHARGE_SPIN: 7500, // Trove - Recharge - SPIN
  BOX_TURBO_RECHARGE: 5000, // Box - Turbo - Recharge

  // Spinner rewards
  SPINNER: {
    TWO: 2, // 2 Spinner = 2 Spins
    THREE: 6, // 3 Spinner = 6 Spins
  },

  // Turbo rewards
  TURBO: {
    TWO: 2, // 2 Turbo = 2 Turbo
    THREE: 9, // 3 Turbo = 9 Turbo
  },

  // Energy Can rewards (for recharge)
  ENERGY_CAN: {
    TWO: 2, // 2 Energy Can = 2 Recharge
    THREE: 3, // 3 Energy Can = 3 Recharge
  },

  // Recharge rewards
  RECHARGE: {
    TWO: 2, // 2 Recharge = 2 Recharge
    THREE: 3, // 3 Recharge = 3 Recharge
  },
};

/**
 * Gets the coin reward based on token type and count
 * @param {string} value - Token value (numeric string)
 * @param {number} count - Number of matching tokens
 * @returns {number} - Coin reward amount
 */
export const getCoinReward = (value: string, count: number): number => {
  // Treasure Trove rewards (value "13")
  if (value === TOKEN_TO_VALUE[TOKEN_NAMES.TREASURE_TROVE]) {
    if (count === 3) return SPIN_REWARDS.TREASURE_TROVE.THREE;
    if (count === 2) return SPIN_REWARDS.TREASURE_TROVE.TWO;
    if (count === 1) return SPIN_REWARDS.TREASURE_TROVE.ONE;
  }

  // Treasure Box rewards (value "1")
  if (value === TOKEN_TO_VALUE[TOKEN_NAMES.TREASURE_BOX]) {
    if (count === 3) return SPIN_REWARDS.TREASURE_BOX.THREE;
    if (count === 2) return SPIN_REWARDS.TREASURE_BOX.TWO;
    if (count === 1) return SPIN_REWARDS.TREASURE_BOX.ONE;
  }

  // Spark Coin rewards (value "2")
  if (value === TOKEN_TO_VALUE[TOKEN_NAMES.SPARK_COIN] && count === 2) {
    return SPIN_REWARDS.SPARK_COIN.TWO;
  }

  // Sparky Token rewards (values "3" through "11")
  if (value >= "3" && value <= "11") {
    if (count === 3) return SPIN_REWARDS.SPARKY_TOKEN.THREE.coins;
    if (count === 2) return SPIN_REWARDS.SPARKY_TOKEN.TWO.coins;
    if (count === 1) return SPIN_REWARDS.SPARKY_TOKEN.ONE.coins;
  }

  // Special combination: Treasure Trove + Treasure Box + Any other
  if (count === 0) return SPIN_REWARDS.SPECIAL_COMBO;

  // Any three different symbols
  return SPIN_REWARDS.ANY_THREE_DIFFERENT;
};

/**
 * Gets the token reward for character tokens
 * @param {number} tokenCount - Number of matching tokens
 * @returns {object} - Object containing tokens, refillCoins, and points values
 */
export const getCharacterReward = (tokenCount: number) => {
  switch (tokenCount) {
    case 3:
      return {
        tokens: SPIN_REWARDS.SPARKY_TOKEN.THREE.tokens,
        refillCoins: SPIN_REWARDS.SPARKY_TOKEN.THREE.tokens,
        points: SPIN_REWARDS.SPARKY_TOKEN.THREE.coins,
      };
    case 2:
      return {
        tokens: SPIN_REWARDS.SPARKY_TOKEN.TWO.tokens,
        refillCoins: SPIN_REWARDS.SPARKY_TOKEN.TWO.tokens,
        points: SPIN_REWARDS.SPARKY_TOKEN.TWO.coins,
      };
    case 1:
      return {
        tokens: SPIN_REWARDS.SPARKY_TOKEN.ONE.tokens,
        refillCoins: SPIN_REWARDS.SPARKY_TOKEN.ONE.tokens,
        points: SPIN_REWARDS.SPARKY_TOKEN.ONE.coins,
      };
    default:
      return { tokens: 0, refillCoins: 0, points: 0 };
  }
};

/**
 * Gets spinner reward based on count
 * @param {number} count - Number of spinner tokens
 * @returns {number} - Number of spins awarded
 */
export const getSpinnerReward = (count: number): number => {
  if (count === 3) return SPIN_REWARDS.SPINNER.THREE;
  if (count === 2) return SPIN_REWARDS.SPINNER.TWO;
  return 0;
};

/**
 * Gets turbo reward based on count
 * @param {number} count - Number of turbo tokens
 * @returns {number} - Number of turbo boosts awarded
 */
export const getTurboReward = (count: number): number => {
  if (count === 3) return SPIN_REWARDS.TURBO.THREE;
  if (count === 2) return SPIN_REWARDS.TURBO.TWO;
  return 0;
};

/**
 * Gets energy can reward based on count (for recharge)
 * @param {number} count - Number of energy can tokens
 * @returns {number} - Number of recharge boosts awarded
 */
export const getEnergyCanReward = (count: number): number => {
  if (count === 3) return SPIN_REWARDS.ENERGY_CAN.THREE;
  if (count === 2) return SPIN_REWARDS.ENERGY_CAN.TWO;
  return 0;
};

/**
 * Gets recharge reward based on count
 * @param {number} count - Number of recharge tokens
 * @returns {number} - Number of recharge boosts awarded
 */
export const getRechargeReward = (count: number): number => {
  if (count === 3) return SPIN_REWARDS.RECHARGE.THREE;
  if (count === 2) return SPIN_REWARDS.RECHARGE.TWO;
  return 0;
};

const spinConfig = {
  TOKEN_NAMES,
  VALUE_TO_TOKEN,
  TOKEN_TO_VALUE,
  CHARACTER_KEY_TO_NAME,
  SPIN_REWARDS,
  SPIN_PURCHASE_OPTIONS,
  getCoinReward,
  getCharacterReward,
  getSpinnerReward,
  getTurboReward,
  getEnergyCanReward,
  getRechargeReward,
};

export default spinConfig;
