export interface RechargeSpeedConfig {
  rechargeSpeed: number;
  refillInterval: number;
  rechargeSpeedupgradePrice: number;
}

export const rechargeSpeedConfig: Record<number, RechargeSpeedConfig> = {
  1: {
    rechargeSpeed: 1,
    refillInterval: 100,
    rechargeSpeedupgradePrice: 100,
  },
  2: {
    rechargeSpeed: 2,
    refillInterval: 100,
    rechargeSpeedupgradePrice: 2000,
  },
  3: {
    //MAX LEVEL

    rechargeSpeed: 3,
    refillInterval: 100,
    rechargeSpeedupgradePrice: 4000,
  },
} as const;

export type RechargeLevel = keyof typeof rechargeSpeedConfig;

// Helper function to get recharge config for a specific level
export const getRechargeSpeedConfig = (level: number) => {
  const safeLevel = Math.min(3, Math.max(1, level)) as RechargeLevel;
  return rechargeSpeedConfig[safeLevel];
};
