// Define the symbols and their images
export const SYMBOLS = [
  { id: 'treasurebox', name: 'Treasure Box', image: '/assets/spin/treasurebox.png' },
  { id: 'treasuretrove', name: 'Treasure Trove', image: '/assets/spin/treasuretrove.png' },
  { id: 'turbo', name: 'Turbo', image: '/assets/spin/turbo.png' },
  { id: 'spin', name: 'Spin', image: '/assets/spin/spin.png' },
  { id: 'recharge', name: 'Recharge', image: '/assets/spin/recharge.png' },
  { id: 'sparkytoken', name: 'Sparky Token', image: '/assets/spin/token.png' },
  { id: 'sparkcoin', name: 'Spark Coin', image: '/assets/spin/sparkcoin.png' }
] as const;

export type RewardType = 'sparkcoins' | 'spins' | 'turbo' | 'recharge';

export interface Reward {
  type: RewardType;
  amount: number;
}

export interface AggregatedRewards {
  sparkcoins: number;
  spins: number;
  turbo: number;
  recharge: number;
  sparkytokens: number;
}

export type RewardKey = 
  | 'any3'
  | '2box' | '3box'
  | '2trove' | '3trove'
  | '1sparkytoken' | '2sparkytoken' | '3sparkytoken'
  | '2sparkytoken-special'
  | '2sparkcoin' | '3sparkcoin'
  | '2spin' | '3spin'
  | '2turbo' | '3turbo'
  | '2recharge' | '3recharge'
  | 'treasuretrove-treasurebox-other'
  | 'treasuretrove-treasurebox-spin'
  | 'treasuretrove-turbo-spin'
  | 'treasuretrove-recharge-spin'
  | 'treasurebox-turbo-recharge'
  | 'aggregated';

// Define the reward combinations
export const REWARDS: Record<RewardKey, Reward> = {
  // Any 3 different
  'any3': { type: 'sparkcoins', amount: 2500 },
  
  // Treasure Box combinations
  '2box': { type: 'sparkcoins', amount: 40000 },
  '3box': { type: 'sparkcoins', amount: 150000 },
  
  // Treasure Trove combinations
  '2trove': { type: 'sparkcoins', amount: 25000 },
  '3trove': { type: 'sparkcoins', amount: 500000 },
  
  // Sparky Token combinations
  '2sparkytoken': { type: 'sparkcoins', amount: 20000 },
  '3sparkytoken': { type: 'sparkcoins', amount: 75000 },
  
  // Special Sparky Token combinations
  '2sparkytoken-special': { type: 'sparkcoins', amount: 20000 },
  
  // Single Sparky Token
  '1sparkytoken': { type: 'sparkcoins', amount: 2500 },
  
  // Spark Coin combinations
  '2sparkcoin': { type: 'sparkcoins', amount: 20000 },
  '3sparkcoin': { type: 'sparkcoins', amount: 250000 },
  
  // Spin combinations
  '2spin': { type: 'spins', amount: 2 },
  '3spin': { type: 'spins', amount: 6 },
  
  // Turbo combinations
  '2turbo': { type: 'turbo', amount: 2 },
  '3turbo': { type: 'turbo', amount: 9 },
  
  // Recharge combinations
  '2recharge': { type: 'recharge', amount: 2 },
  '3recharge': { type: 'recharge', amount: 3 },
  
  // Special combinations
  'treasuretrove-treasurebox-other': { type: 'sparkcoins', amount: 7500 },
  'treasuretrove-treasurebox-spin': { type: 'sparkcoins', amount: 5000 },
  'treasuretrove-turbo-spin': { type: 'sparkcoins', amount: 7500 },
  'treasuretrove-recharge-spin': { type: 'sparkcoins', amount: 7500 },
  'treasurebox-turbo-recharge': { type: 'sparkcoins', amount: 5000 },
  
  // Aggregated result
  'aggregated': { type: 'sparkcoins', amount: 0 }
};

// Add compact number formatter function
export const formatCompactNumber = (number: number) => {
  if (number < 1000) return number.toString();
  const tiers = [
    { threshold: 1e12, suffix: 't' },
    { threshold: 1e9, suffix: 'b' },
    { threshold: 1e6, suffix: 'm' },
    { threshold: 1e3, suffix: 'k' }
  ];

  const tier = tiers.find(tier => number >= tier.threshold);
  if (!tier) return number.toString();

  const scaled = number / tier.threshold;
  // Return whole number without decimal part
  return Math.floor(scaled) + tier.suffix;
};

// Spin level options
export const SPIN_LEVELS = [1, 2, 3, 5, 10, 50]; 