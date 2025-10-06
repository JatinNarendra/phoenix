// One-time purchase cost for unlocking auto-tap feature
export const AUTO_TAP_PURCHASE_COST = 100;

export interface TapPowerConfig {
  tapPower: number;
  upgradeCost: number;
  tapBotSparkCoinPer3Hours: number;  // Earnings for 3 hours when auto-tap is active (if purchased)
}

export const tapPowerConfig: Record<number, TapPowerConfig> = {
  1: { tapPower: 1, upgradeCost: 100, tapBotSparkCoinPer3Hours: 64800 },
  2: { tapPower: 2, upgradeCost: 2000, tapBotSparkCoinPer3Hours: 64800 },
  3: { tapPower: 3, upgradeCost: 4000, tapBotSparkCoinPer3Hours: 64800 },
  4: { tapPower: 4, upgradeCost: 8000, tapBotSparkCoinPer3Hours: 129600 },
  5: { tapPower: 5, upgradeCost: 16000, tapBotSparkCoinPer3Hours: 129600 },
  6: { tapPower: 6, upgradeCost: 32000, tapBotSparkCoinPer3Hours: 129600 },
  7: { tapPower: 7, upgradeCost: 64000, tapBotSparkCoinPer3Hours: 129600 },
  8: { tapPower: 8, upgradeCost: 128000, tapBotSparkCoinPer3Hours: 194400 },
  9: { tapPower: 9, upgradeCost: 256000, tapBotSparkCoinPer3Hours: 194400 },
  10: { tapPower: 10, upgradeCost: 512000, tapBotSparkCoinPer3Hours: 194400 },
  11: { tapPower: 11, upgradeCost: 1024000, tapBotSparkCoinPer3Hours: 194400 },
  12: { tapPower: 12, upgradeCost: 2048000, tapBotSparkCoinPer3Hours: 259200 },
  13: { tapPower: 13, upgradeCost: 4096000, tapBotSparkCoinPer3Hours: 259200 },
  14: { tapPower: 14, upgradeCost: 8192000, tapBotSparkCoinPer3Hours: 259200 },
  15: { tapPower: 15, upgradeCost: 16384000, tapBotSparkCoinPer3Hours: 259200 },
  16: { tapPower: 16, upgradeCost: 32768000, tapBotSparkCoinPer3Hours: 320000 },
  17: { tapPower: 17, upgradeCost: 65536000, tapBotSparkCoinPer3Hours: 320000 },
  18: { tapPower: 18, upgradeCost: 131072000, tapBotSparkCoinPer3Hours: 320000 },
  19: { tapPower: 19, upgradeCost: 262144000, tapBotSparkCoinPer3Hours: 320000 },
  20: { tapPower: 20, upgradeCost: 524288000, tapBotSparkCoinPer3Hours: 402180 },
  21: { tapPower: 21, upgradeCost: 1048576000, tapBotSparkCoinPer3Hours: 402180 },
  22: { tapPower: 22, upgradeCost: 2097152000, tapBotSparkCoinPer3Hours: 402180 },
  23: { tapPower: 23, upgradeCost: 4194304000, tapBotSparkCoinPer3Hours: 402180 },
  24: { tapPower: 24, upgradeCost: 8388608000, tapBotSparkCoinPer3Hours: 470690 },
  25: { tapPower: 25, upgradeCost: 16777216000, tapBotSparkCoinPer3Hours: 470690 },
  26: { tapPower: 26, upgradeCost: 33554432000, tapBotSparkCoinPer3Hours: 470690 },
  27: { tapPower: 27, upgradeCost: 67108864000, tapBotSparkCoinPer3Hours: 470690 },
  28: { tapPower: 28, upgradeCost: 134217728000, tapBotSparkCoinPer3Hours: 470690 },
  29: { tapPower: 29, upgradeCost: 268435456000, tapBotSparkCoinPer3Hours: 540000 },
  30: { tapPower: 30, upgradeCost: 536870912000, tapBotSparkCoinPer3Hours: 540000 },
  31: { tapPower: 31, upgradeCost: 1073741824000, tapBotSparkCoinPer3Hours: 540000 },
  32: { tapPower: 32, upgradeCost: 2147483648000, tapBotSparkCoinPer3Hours: 540000 },
  33: { tapPower: 33, upgradeCost: 4294967296000, tapBotSparkCoinPer3Hours: 630000 },
  34: { tapPower: 34, upgradeCost: 8589934592000, tapBotSparkCoinPer3Hours: 630000 },
  35: { tapPower: 35, upgradeCost: 17179869184000, tapBotSparkCoinPer3Hours: 630000 },
  36: { tapPower: 36, upgradeCost: 34359738368000, tapBotSparkCoinPer3Hours: 630000 },
  37: { tapPower: 37, upgradeCost: 68719476736000, tapBotSparkCoinPer3Hours: 690150 },
  38: { tapPower: 38, upgradeCost: 137438953472000, tapBotSparkCoinPer3Hours: 690150 },
  39: { tapPower: 39, upgradeCost: 274877906944000, tapBotSparkCoinPer3Hours: 690150 },
  40: { tapPower: 40, upgradeCost: 549755813888000, tapBotSparkCoinPer3Hours: 690150 }
};

export const getTapPowerConfig = (level: number) => {
  const safeLevel = Math.min(40, Math.max(1, level));
  return tapPowerConfig[safeLevel];
}; 