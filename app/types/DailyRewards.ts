export interface DailyRewards {
  lastCollected: string;
  currentStreak: number;
  maxStreak: number;
  collectedDays: number[];
  rewards: {
    [key: string]: {
      coins: number;
      collected: boolean;
    };
  };
}
