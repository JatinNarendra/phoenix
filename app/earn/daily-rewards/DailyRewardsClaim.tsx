import type { NextPage } from 'next';
import Image from "next/image";
// Remove image imports - we'll use src paths instead
import { gameToast } from "@/app/utility/customToast";
import { useState } from 'react';
import { GameState } from '@/app/types/gameTypes';
import CustomYellowButton from '@/app/ui/CustomYellowButton';

interface DailyRewardsClaimProps {
  coins: number;
  day: number;
  userId: string;
  onClose: () => void;
  onClaim: () => void;
  isLoading?: boolean;
  persistState: (state: GameState) => void;
  gameState: GameState;
}

const DailyRewardsClaim: NextPage<DailyRewardsClaimProps> = ({ 
  coins: totalReward, 
  day,
  userId,
  onClose, 
  onClaim,
  isLoading: parentIsLoading = false,
  persistState,
  gameState
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClaim = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      // Initialize dailyRewards with default values if it doesn't exist
      const dailyRewards = gameState.dailyRewards || {
        lastCollected: new Date(0).toISOString(),
        currentStreak: 0,
        maxStreak: 0,
        lastDay: 0,
        collectedDays: {}
      };
      
      // Get the last collection time and convert to UTC date
      const lastCollectedTime = dailyRewards.lastCollected 
        ? new Date(dailyRewards.lastCollected) 
        : new Date(0);
      
      const now = new Date();
      const lastCollectedUtcDay = new Date(
        Date.UTC(lastCollectedTime.getUTCFullYear(), lastCollectedTime.getUTCMonth(), lastCollectedTime.getUTCDate())
      ).getTime();
      const currentUtcDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      ).getTime();
      
      // Calculate time difference in days
      const daysDifference = Math.floor((currentUtcDay - lastCollectedUtcDay) / (24 * 60 * 60 * 1000));
      
      // Get the last collected day number and current streak
      const lastDay = dailyRewards.lastDay ?? 0;
      const prevStreak = dailyRewards.currentStreak ?? 0;
      
      // Check if this is a new user or reset user
      const isNewUser = !dailyRewards || 
                       dailyRewards.lastDay === undefined ||
                       dailyRewards.lastDay === 0 ||
                       !dailyRewards.lastCollected || 
                       dailyRewards.lastCollected === "1970-01-01T00:00:00.000Z";

      // Validate sequential collection
      if (!isNewUser && day !== lastDay + 1) {
        throw new Error(`You must collect day ${lastDay + 1} before collecting day ${day}`);
      }

      // For new users, only allow collecting day 1
      if (isNewUser && day !== 1) {
        throw new Error('New users must start with day 1');
      }

      // Calculate current streak - CRITICAL FIX:
      // For day numbers up to 15, current streak should directly match day number when collecting sequentially
      let currentStreak = 0;
      
      if (isNewUser || lastDay === 0 || Object.keys(dailyRewards.collectedDays || {}).length === 0) {
        // First time collection
        currentStreak = 1;
      } else if (day <= 15) {
        // For first 15 days, streak equals the day number when collecting sequentially
        if (day === lastDay + 1 && daysDifference <= 1) {
          currentStreak = day; // This sets streak to 3 when collecting day 3
        } else {
          // Reset streak for missed days
          currentStreak = 1;
        }
      } else if (daysDifference === 1 && day === lastDay + 1) {
        // Consecutive day collection for days > 15
        currentStreak = prevStreak + 1;
      } else if (daysDifference > 1) {
        // Missed a day - check for streak preservation
        if (lastDay >= 15 && daysDifference <= 2) {
          // Preserve streak at 15 if only one day was missed
          currentStreak = 15;
        } else {
          // Reset streak for missed days
          currentStreak = 1;
        }
      } else if (daysDifference === 0) {
        // Same day collection attempt
        throw new Error('You have already collected a reward today. Please come back tomorrow.');
      } else {
        // Any other case - reset streak
        currentStreak = 1;
      }

      // Calculate max streak - ensure it's at least equal to day number for sequential collections
      let maxStreak = Math.max(dailyRewards.maxStreak ?? 0, currentStreak);
      
      // For sequential collections up to day 15, max streak should match the day number if higher
      if (day <= 15 && day === lastDay + 1 && daysDifference <= 1) {
        maxStreak = Math.max(maxStreak, day);
      }
      
      const streakBonus = Math.floor(totalReward * 0.1); // 10% streak bonus

      // Update local state first for immediate feedback
      const updatedGameState = {
        ...gameState,
        coins: Number(gameState.coins) + totalReward,
        dailyRewards: {
          ...dailyRewards,
          lastCollected: new Date().toISOString(),
          currentStreak,
          maxStreak,
          lastDay: day,
          collectedDays: {
            ...(dailyRewards.collectedDays || {}),
            [day]: {
              collectedAt: new Date().toISOString(),
              coins: totalReward
            }
          }
        }
      };

      // Update UI immediately
      persistState(updatedGameState);

      // Call the API endpoint in the background
      const response = await fetch('/api/daily-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId.toString(),
          day: day,
          coins: totalReward - streakBonus, // Base coins without streak bonus
          streak_bonus: streakBonus,
          current_streak: currentStreak,
          max_streak: maxStreak
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'Daily reward already collected for today') {
          gameToast.error('You have already collected today\'s reward!');
          setIsLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to collect reward');
      }

      onClaim();
    } catch (error) {
      console.error('Error collecting reward:', error);
      gameToast.error(error instanceof Error ? error.message : 'Failed to collect reward');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      <div
        className="fixed inset-0 backdrop-blur-[14px] bg-black/50"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 transform transition-all duration-300 max-w-md mx-auto">
        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border min-h-[520px] py-2">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-10 text-gray-400 hover:text-white"
            disabled={isLoading || parentIsLoading}
          >
            <Image src="/assets/Close.png" alt="Close" width={32} height={32} />
          </button>

          {/* Main Content */}
          <div className="relative h-full flex flex-col items-center justify-center p-8 gap-10">
            {/* Claw Image */}
            <div className="relative mb-2 mt-8">
              <Image
                src="/assets/Earn/ClawHoldingSpark.png"
                alt="Claw holding Sparky"
                className="object-contain"
                width={160}
                height={80}
                style={{ width: "auto", height: "auto" }}
              />
            </div>

            {/* Reward Amount */}
            <div className="flex items-center justify-center gap-3">
              <Image src="/assets/SparkyIcon.png" alt="SparkIcon" width={36} height={36} />
              <p className="text-4xl font-bold text-white">
                {totalReward.toLocaleString()}
              </p>
            </div>

            <span className="text-lg text-gray-400 text-center mb-2">
              Collect your allotted coins <br />
              now and boost your rewards!
            </span>

            {/* Claim Button */}
            <CustomYellowButton
              onClick={handleClaim}
              disabled={isLoading || parentIsLoading}
              className={`w-[200px] max-w-xs rounded-lg text-lg font-semibold text-white
                ${
                  isLoading || parentIsLoading
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
                }`}
            >
              {isLoading || parentIsLoading ? "Claiming..." : "Claim"}
            </CustomYellowButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyRewardsClaim; 