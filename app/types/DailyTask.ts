export interface DailyTask {
  id: string;
  title: string;
  description: string;
  reward: {
    type: "coins" | "spins" | "energy";
    amount: number;
  };
  progress: {
    current: number;
    target: number;
  };
  completed: boolean;
}
