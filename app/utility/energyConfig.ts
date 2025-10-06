export interface EnergyConfig {
  maxRecharge: number;
  initialValue: number;
  upgradePrice: number;
}

export const energyConfig: Record<number, EnergyConfig> = {
  1: {
    maxRecharge: 1500,
    initialValue: 1500,
    upgradePrice: 100
  },
  2: {
    maxRecharge: 2000,
    initialValue: 2000,
    upgradePrice: 2000
  },
  3: {
    maxRecharge: 2500,
    initialValue: 2500,
    upgradePrice: 4000
  },
  4: {
    maxRecharge: 3000,
    initialValue: 3000,
    upgradePrice: 8000
  },
  5: {
    maxRecharge: 3500,
    initialValue: 3500,
    upgradePrice: 16000
  },
  6: {
    maxRecharge: 4000,
    initialValue: 4000,
    upgradePrice: 32000
  },
  7: {
    maxRecharge: 4500,
    initialValue: 4500,
    upgradePrice: 64000
  },
  8: {
    maxRecharge: 5000,
    initialValue: 5000,
    upgradePrice: 128000
  },
  9: {
    maxRecharge: 5500,
    initialValue: 5500,
    upgradePrice: 256000
  },
  10: {
    maxRecharge: 6000,
    initialValue: 6000,
    upgradePrice: 512000
  },
  11: {
    maxRecharge: 6500,
    initialValue: 6500,
    upgradePrice: 1024000
  },
  12: {
    maxRecharge: 7000,
    initialValue: 7000,
    upgradePrice: 2048000
  },
  13: {
    maxRecharge: 7500,
    initialValue: 7500,
    upgradePrice: 4096000
  },
  14: {
    maxRecharge: 8000,
    initialValue: 8000,
    upgradePrice: 8192000
  },
  15: {
    maxRecharge: 8500,
    initialValue: 8500,
    upgradePrice: 16384000
  },
  16: {
    maxRecharge: 9000,
    initialValue: 9000,
    upgradePrice: 32768000
  },
  17: {
    maxRecharge: 9500,
    initialValue: 9500,
    upgradePrice: 65536000
  },
  18: {
    maxRecharge: 10000,
    initialValue: 10000,
    upgradePrice: 131072000
  },
  19: {
    maxRecharge: 10500,
    initialValue: 10500,
    upgradePrice: 262144000
  },
  20: {
    maxRecharge: 11000,
    initialValue: 11000,
    upgradePrice: 524288000
  },
  21: {
    maxRecharge: 11500,
    initialValue: 11500,
    upgradePrice: 1048576000
  },
  22: {
    maxRecharge: 12000,
    initialValue: 12000,
    upgradePrice: 2097152000
  },
  23: {
    maxRecharge: 12500,
    initialValue: 12500,
    upgradePrice: 4194304000
  },
  24: {
    maxRecharge: 13000,
    initialValue: 13000,
    upgradePrice: 8388608000
  },
  25: {
    maxRecharge: 13500,
    initialValue: 13500,
    upgradePrice: 16777216000
  },
  26: {
    maxRecharge: 14000,
    initialValue: 14000,
    upgradePrice: 33554432000
  },
  27: {
    maxRecharge: 14500,
    initialValue: 14500,
    upgradePrice: 67108864000
  },
  28: {
    maxRecharge: 15000,
    initialValue: 15000,
    upgradePrice: 134217728000
  },
  29: {
    maxRecharge: 15500,
    initialValue: 15500,
    upgradePrice: 268435456000
  },
  30: {
    maxRecharge: 16000,
    initialValue: 16000,
    upgradePrice: 536870912000
  },
  31: {
    maxRecharge: 16500,
    initialValue: 16500,
    upgradePrice: 1073741824000
  },
  32: {
    maxRecharge: 17000,
    initialValue: 17000,
    upgradePrice: 2147483648000
  },
  33: {
    maxRecharge: 17500,
    initialValue: 17500,
    upgradePrice: 4294967296000
  },
  34: {
    maxRecharge: 18000,
    initialValue: 18000,
    upgradePrice: 8589934592000
  },
  35: {
    maxRecharge: 18500,
    initialValue: 18500,
    upgradePrice: 17179869184000
  },
  36: {
    maxRecharge: 19000,
    initialValue: 19000,
    upgradePrice: 34359738368000
  },
  37: {
    maxRecharge: 19500,
    initialValue: 19500,
    upgradePrice: 68719476736000
  },
  38: {
    maxRecharge: 20000,
    initialValue: 20000,
    upgradePrice: 137438953472000
  },
  39: {
    maxRecharge: 20500,
    initialValue: 20500,
    upgradePrice: 274877906944000
  },
  40: {
    maxRecharge: 21000,
    initialValue: 21000,
    upgradePrice: 549755813888000
  }
} as const;

export type EnergyLevel = keyof typeof energyConfig;

// Helper function to get energy config for a specific level
export const getEnergyConfig = (level: number) => {
  const safeLevel = Math.min(40, Math.max(1, level)) as EnergyLevel;
  return energyConfig[safeLevel];
};
