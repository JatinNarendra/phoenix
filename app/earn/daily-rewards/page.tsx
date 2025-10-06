"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useGame } from "../../context/GameContext";
import Image from "next/image";
import SparkIcon from "@/public/assets/SparkyIcon.png";
import TaskCompletedDiamond from "@/public/assets/TaskCompletedDiamond.png";
import DailyRewardConfetti from "@/public/assets/DailyRewardConfetti.png";
import TotalStreakIcon from "@/public/assets/Earn/totalstreakicon.png";
import WingsImage from "@/public/assets/Earn/wings.png";
import { useRouter } from "next/navigation";
import { useWebApp } from "@/app/hooks/useWebApp";
import { useUser } from "@/app/hooks/useUser";
import DailyRewardsClaim from "./DailyRewardsClaim";
import DailyRewardsSuccess from "./DailyRewardsSuccess";
import { getDailyRewardHistory } from "@/app/lib/dailyRewards";
import Loader from "@/app/components/ui/Loader";
import "./DailyRewards.css";
import { useGameFeatures } from '@/app/context/GameFeaturesContext';
import { gameToast } from "@/app/utility/customToast";

interface ProgressionTask {
  day: number;
  coins: number;
  completed: boolean;
}

interface DailyReward {
  collectedAt: string;
  coins: number;
}

interface DailyRewards {
  lastCollected: string;
  currentStreak: number;
  maxStreak: number;
  lastDay: number;
  collectedDays: { [key: number]: DailyReward };
}

const DailyRewards = () => {
  const router = useRouter();
  const { instance: WebApp } = useWebApp(true);
  const { persistState, gameState } = useGame();
  const { dailyRewards: { checkRewardAvailability } } = useGameFeatures();
  const { id: userId } = useUser();
  const [showClaimPopup, setShowClaimPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [selectedReward, setSelectedReward] = useState<{ day: number; coins: number } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rewardStatus, setRewardStatus] = useState<{ missedDay: boolean }>({ missedDay: false });

  // Get the last collected day and yellow highlight state
  const lastCollectedDay = gameState.dailyRewards?.lastDay || 0;
  const shouldShowYellow = useCallback((day: number) => {
    // Special case for first time users - highlight day 1
    if ((gameState.dailyRewards?.lastDay === 0 || 
         (gameState.dailyRewards && gameState.dailyRewards.lastDay <= 0) || 
         !gameState.dailyRewards?.lastDay) && day === 1) {
      return true;
    }
    // Regular case - highlight next day in sequence
    return !Boolean(gameState.dailyRewards?.collectedDays?.[day]) && day === (lastCollectedDay > 0 ? lastCollectedDay + 1 : 1);
  }, [gameState.dailyRewards, lastCollectedDay]);

  useEffect(() => {
    if (WebApp) {
      if (isLoading) {
        WebApp.BackButton.hide();
        const preventBack = (e: Event) => {
          e.preventDefault();
          return false;
        };
        window.addEventListener('popstate', preventBack);
        return () => {
          window.removeEventListener('popstate', preventBack);
        };
      } else {
        WebApp.BackButton.show();
        WebApp.enableClosingConfirmation();
        
        const handleBack = () => {
          setIsLoading(false);
          router.push('/earn');
        };

        WebApp.BackButton.onClick(handleBack);
        
        return () => {
          WebApp.BackButton.offClick(handleBack);
          setIsLoading(false);
        };
      }
    }
  }, [WebApp, router, isLoading]);

  // Memoize the initialization function with optimized dependencies
  const initializeDailyRewards = useCallback(async () => {
    if (!userId || isInitialized) return;

    try {
      // Get complete reward history
      const rewardHistory = await getDailyRewardHistory(userId.toString());

      // Initialize with default state for new users
      let newState = {
        lastCollected: new Date(0).toISOString(), // Use epoch time for new users
        currentStreak: 0,
        maxStreak: 0,
        lastDay: 0, // Changed from -1 to 0
        collectedDays: {},
      };

      if (rewardHistory && rewardHistory.length > 0) {
        // Sort rewards by collection date
        const sortedRewards = rewardHistory.sort(
          (a, b) =>
            new Date(b.collected_at).getTime() -
            new Date(a.collected_at).getTime()
        );

        // Get the most recent reward
        const lastReward = sortedRewards[0];

        // Create a map of all collected days
        const collectedDays = sortedRewards.reduce((acc, reward) => {
          acc[reward.day] = {
            collectedAt: reward.collected_at,
            coins: reward.coins + (reward.streak_bonus || 0),
          };
          return acc;
        }, {} as { [key: number]: { collectedAt: string; coins: number } });

        newState = {
          lastCollected: lastReward.collected_at,
          currentStreak: lastReward.current_streak,
          maxStreak: lastReward.max_streak,
          lastDay: lastReward.day,
          collectedDays,
        };
      }

      // Update state with complete history or default state
      persistState((prev) => {
        // Check if user is new or has no daily rewards data
        const isNewUser = !prev.dailyRewards || 
                         prev.dailyRewards.lastDay === undefined || 
                         prev.dailyRewards.lastDay === 0 ||
                         !prev.dailyRewards.lastCollected || 
                         prev.dailyRewards.lastCollected === "1970-01-01T00:00:00.000Z";

        // If it's a new user or the data was reset, use the default new user state
        if (isNewUser) {
          return {
            ...prev,
            dailyRewards: {
              lastCollected: new Date(0).toISOString(),
              currentStreak: 0,
              maxStreak: 0,
              lastDay: 0,
              collectedDays: {}
            }
          };
        }

        // For existing users, update only if new data is more recent
        const shouldUpdate = newState.lastCollected !== "1970-01-01T00:00:00.000Z" && 
                           new Date(newState.lastCollected).getTime() > 
                           new Date(prev.dailyRewards?.lastCollected || 0).getTime();

        return shouldUpdate ? { ...prev, dailyRewards: newState } : prev;
      });

      // Force a refresh of the game state
      window.dispatchEvent(new Event('forceGameRefresh'));
      setIsInitialized(true);
    } catch (error) {
      console.error("Error initializing daily rewards:", error);
      // On error, set default state for new user
      persistState((prev) => ({
        ...prev,
        dailyRewards: {
          lastCollected: new Date(0).toISOString(),
          currentStreak: 0,
          maxStreak: 0,
          lastDay: 0,
          collectedDays: {}
        }
      }));
      setIsInitialized(true);
    }
  }, [userId, persistState, isInitialized]);

  // Update initialization effect with condition
  useEffect(() => {
    if (!isInitialized && userId) {
      initializeDailyRewards();
    }
  }, [userId, isInitialized, initializeDailyRewards]);

  // Memoize the next day calculation
  const nextDayToCollect = useMemo(() => {
    const { missedDay } = rewardStatus;
    const lastDay = typeof gameState.dailyRewards?.lastDay === 'string' 
      ? 0  // If lastDay is a string (timestamp), treat as no days collected
      : (gameState.dailyRewards?.lastDay || 0);

    // If we missed a day, or have no progress, start at day 1
    if (missedDay || lastDay <= 0) return 1;
    
    const nextDay = lastDay + 1;
    return nextDay;
  }, [rewardStatus, gameState.dailyRewards]);

  // Generate progression tasks with specific rewards
  const progressionTasks: ProgressionTask[] = useMemo(() => {
    const rewards = [
      5000, 8000, 12000, 25000, 50000, 100000, 180000, 250000, 310000,
      370000, 400000, 550000, 710000, 900000, 1000000, 1500000, 2100000,
      2600000, 3000000, 3500000, 4200000, 4700000, 5000000, 5600000,
      6100000, 6900000, 7400000, 8000000, 8500000, 9100000, 10000000
    ];
    
    const tasks = Array.from(
      { length: 31 },
      (_, i) => {
        const day = i + 1;
        const isCollectedInDays = Boolean(gameState.dailyRewards?.collectedDays?.[day]);
       

        return {
          day,
          coins: rewards[i],
          completed: isCollectedInDays
        };
      }
    );
    return tasks;
  }, [gameState.dailyRewards?.collectedDays]);

  // Effect to check reward availability
  useEffect(() => {
    const status = checkRewardAvailability();
    
    // Enhanced logging with more detailed information
    const nextDay = nextDayToCollect;
    const canCollectIn = (typeof status === 'object' && status.timeUntilNext) ? `${Math.floor(status.timeUntilNext / 3600)}:${Math.floor((status.timeUntilNext % 3600) / 60).toString().padStart(2, '0')}` : 'Now';
    const todayCollected = (typeof status === 'object' && status.canCollect) ? 'No' : 'Yes'; // If canCollect is false, it means today was already collected
    const isFirstDay = (gameState.dailyRewards?.lastDay === 0 || !gameState.dailyRewards?.lastDay) ? 'Yes' : 'No';
    
    // Get the latest collected day with timestamp
    let lastDayCollected = "None";
    let lastDayCollectedTime = "";
    if (gameState.dailyRewards?.lastDay && gameState.dailyRewards?.lastDay > 0) {
      lastDayCollected = gameState.dailyRewards.lastDay.toString();
      if (gameState.dailyRewards?.lastCollected) {
        const collectedDate = new Date(gameState.dailyRewards.lastCollected);
        lastDayCollectedTime = collectedDate.toISOString();
      }
    }
    
    console.log('Daily Rewards Status:', {
      'Can collect Day': nextDay,
      'Can collect next day in': canCollectIn,
      'Today collected': todayCollected,
      'Is first day of collection': isFirstDay,
      'Best streak': gameState.dailyRewards?.maxStreak || 0,
      'Current streak': gameState.dailyRewards?.currentStreak || 0,
      'Missed day': typeof status === 'object' ? status.missedDay : false,
      'Last day collected': lastDayCollected,
      'Last collection time': lastDayCollectedTime
    });
    
    setRewardStatus(typeof status === 'object' ? status : { missedDay: false });
  }, [checkRewardAvailability, gameState.dailyRewards?.lastDay, gameState.dailyRewards?.maxStreak, gameState.dailyRewards?.currentStreak, nextDayToCollect, gameState.dailyRewards?.lastCollected]);

  const handleClaimReward = async () => {
    if (!selectedReward || !userId) return;
    
    try {
      // Set loading state to prevent UI interactions during processing
      setIsLoading(true);
      
      // Get the current date for reward collection timestamp
      const collectionDate = new Date().toISOString();
      const { day, coins } = selectedReward;
      
      // 1. Update local state - important to do this first for UI feedback
      persistState((prev) => {
        // For day numbers up to 15, current streak should directly match day number when collecting sequentially
        let newStreak;
        
        if (day === 1) {
          // First day always has streak of 1
          newStreak = 1;
        } else if (day <= 15 && day === (prev.dailyRewards?.lastDay || 0) + 1) {
          // For sequential collection of days 1-15, streak equals day number
          // This ensures day 3 has streak 3, day 4 has streak 4, etc.
          newStreak = day;
        } else if (day === (prev.dailyRewards?.lastDay || 0) + 1) {
          // For sequential collection of days > 15
          newStreak = (prev.dailyRewards?.currentStreak || 0) + 1;
        } else {
          // Reset to 1 if not consecutive
          newStreak = 1;
        }
        
        // Calculate max streak - ensure it's at least equal to the current day for sequential collections
        let maxStreak = Math.max(newStreak, prev.dailyRewards?.maxStreak || 0);
        
        // For sequential collections up to day 15, explicitly ensure max streak matches day number if higher
        if (day <= 15 && day === (prev.dailyRewards?.lastDay || 0) + 1) {
          maxStreak = Math.max(maxStreak, day);
        }
        
        // Prepare the new collected day entry
        const newCollectedDay = {
          collectedAt: collectionDate,
          coins: coins
        };
        
        // Update dailyRewards state with new values
        return {
          ...prev,
          dailyRewards: {
            ...prev.dailyRewards,
            lastCollected: collectionDate,
            currentStreak: newStreak,
            maxStreak: maxStreak,
            lastDay: day,
            collectedDays: {
              ...(prev.dailyRewards?.collectedDays || {}),
              [day]: newCollectedDay
            }
          }
        };
      });
      
      // Simulate database operation (replace with actual DB operation)
      // This would be your actual API call to record the collection in the database
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulated delay
      
      // 2. Database operation to record the reward claim
      // Note: This would be your actual API call implementation
      /* 
      await fetch('/api/daily-rewards/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          day: selectedReward.day,
          coins: selectedReward.coins,
          collectedAt: collectionDate
        }),
      });
      */
      
      // Force a refresh of the game state to ensure UI updates
      window.dispatchEvent(new Event('forceGameRefresh'));
      
      // Update console log after collection
      const status = checkRewardAvailability();
      const nextDay = day + 1;
      const canCollectIn = (typeof status === 'object' && status.timeUntilNext) ? `${Math.floor(status.timeUntilNext / 3600)}:${Math.floor((status.timeUntilNext % 3600) / 60).toString().padStart(2, '0')}` : 'Now';
      // Now that we've collected, today is collected
      const todayCollected = 'Yes';
      const isFirstDay = (day === 1 && !Object.keys(gameState.dailyRewards?.collectedDays || {}).length) ? 'Yes' : 'No';
      
      console.log('Daily Rewards Status AFTER Collection:', {
        'Can collect Day': nextDay,
        'Can collect next day in': canCollectIn,
        'Today collected': todayCollected,
        'Is first day of collection': isFirstDay,
        'Best streak': gameState.dailyRewards?.maxStreak || 0,
        'Current streak': gameState.dailyRewards?.currentStreak || 0,
        'Missed day': typeof status === 'object' ? status.missedDay : false,
        'Last day collected': day.toString(),
        'Last collection time': collectionDate
      });
      
      // 3. Hide claim popup and show success popup only after everything is done
      setShowClaimPopup(false);
      setShowSuccessPopup(true);

      // Removed navigation to /earn after successful claim
      // setTimeout(() => {
      //   router.push('/earn');
      // }, 1500);
    } catch (error) {
      console.error("Error claiming daily reward:", error);
      // Handle error - perhaps show an error message to the user
    } finally {
      // Always reset loading state
      setIsLoading(false);
    }
  };

  const handleClosePopups = () => {
    setShowSuccessPopup(false);
    setSelectedReward(null);
  };

  // Memoize the reset check with optimized dependencies
  const checkAndResetRewards = useCallback(() => {
    if (!isInitialized) return;

    const status = checkRewardAvailability();
    const missedDay = typeof status === 'object' ? status.missedDay : false;
    if (missedDay && gameState.dailyRewards?.lastCollected) {
      const lastDay = gameState.dailyRewards?.lastDay || 0;
      const preservedStreak = lastDay >= 15 ? 15 : 0;

      persistState((prev) => ({
        ...prev,
        dailyRewards: {
          ...prev.dailyRewards,
          lastCollected: new Date(0).toISOString(),
          currentStreak: preservedStreak,
          maxStreak: prev.dailyRewards?.maxStreak || 0,
          lastDay: preservedStreak,
          collectedDays: {},
        },
      }));
    }
  }, [
    checkRewardAvailability,
    gameState.dailyRewards?.lastCollected,
    persistState,
    isInitialized,
    gameState.dailyRewards?.lastDay,
  ]);

  // Update reset effect with conditions
  useEffect(() => {
    if (isInitialized && userId) {
      checkAndResetRewards();
    }
  }, [isInitialized, userId, checkAndResetRewards]);

  return (
    <div className="relative min-h-screen bg-black overflow-auto">
      <div className="max-w-md mx-auto pb-20">
        {/* Header and Content Container */}
        <div className="flex flex-col items-center justify-start gap-8 pt-4">
          {/* Header Section */}
          <div className="flex flex-col items-center justify-start gap-2 w-[240px] py-4">
            <b className="self-stretch relative text-[36px] leading-[140%] tracking-[-0.02em] font-bold text-[#e18700]">
              Daily Rewards
            </b>
            <div className="flex flex-col gap-4 ">
              <span className="text-[#909090] text-sm font-bold">
                Tap to claim your bonus
                <br />
                coins now! Don&apos;t miss out!
              </span>
            </div>
          </div>

          {/* Content Container with consistent padding */}
          <div className="w-full px-4">
            {/* Total Streak Section */}
            <div className="relative flex items-center justify-center mb-8">
              <div className="relative h-[120px] w-[380px]">
                <div className="absolute inset-0 backdrop-blur-[14px] rounded-[10px] bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] box-border z-10 flex items-center p-4">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col flex-grow">
                      <div className="text-[18px] leading-[140%] tracking-[-0.36px] font-bold text-[#E18700]">
                        Daily Streak Rewards!
                      </div>
                      <div className="text-[14px] leading-[140%] tracking-[-0.28px] text-[#909090] font-bold">
                        Claim daily & earn 100Mn
                      </div>
                      <div className="text-[14px] leading-[140%] tracking-[-0.28px] text-[#909090] font-bold">
                        SPARK in 31 days!
                      </div>
                    </div>
                    <div className="w-[40%] flex justify-end">
                      <Image
                        src={TotalStreakIcon}
                        alt="Total Streak"
                        width={140}
                        height={80}
                        className="object-contain"
                        priority
                        style={{ width: "auto", height: "auto" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Streak Section */}
            <div className="relative pt-[100px] -mt-[100px]">
              <div className="flex flex-row items-center justify-center gap-[13px] mb-8">
                <div className="relative h-[80px] w-[180px]">
                  <Image
                    src={DailyRewardConfetti.src}
                    alt=""
                    width={80}
                    height={74}
                    className="absolute top-[-250px] left-[-20px] z-0 pointer-events-none"
                    style={{ width: "auto", height: "auto" }}
                  />
                  <div className="absolute inset-0 backdrop-blur-[14px] rounded-[10px] bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] box-border z-10">
                    <div className="absolute top-4 left-4 text-[14px] leading-[140%] tracking-[-0.02em] font-bold text-[#909090]">
                      Current Streak
                    </div>
                    <b className="absolute top-[39px] left-4 text-[18px] leading-[140%] tracking-[-0.02em] font-bold text-[#E18700]">
                      {gameState.dailyRewards?.lastDay && gameState.dailyRewards.lastDay > 0 
                        ? (gameState.dailyRewards.lastDay <= 15 
                            ? gameState.dailyRewards.lastDay 
                            : gameState.dailyRewards?.currentStreak || 0)
                        : 0} Days
                    </b>
                  </div>
                </div>

                <div className="relative h-[80px] w-[180px]">
                  <Image
                    src={DailyRewardConfetti.src}
                    alt=""
                    width={80}
                    height={74}
                    className="absolute top-[-250px] right-[-20px] z-0 scale-x-[-1] pointer-events-none"
                    style={{ width: "auto", height: "auto" }}
                  />
                  <div className="absolute inset-0 backdrop-blur-[14px] rounded-[10px] bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] box-border z-10">
                    <div className="absolute top-4 left-4 text-[14px] leading-[140%] tracking-[-0.02em] font-bold text-[#909090]">
                      Best Streak
                    </div>
                    <b className="absolute top-[39px] left-4 text-[18px] leading-[140%] tracking-[-0.02em] font-bold text-[#E18700]">
                      {Math.max(
                        gameState.dailyRewards?.maxStreak || 0,
                        gameState.dailyRewards?.lastDay && gameState.dailyRewards.lastDay > 0
                          ? (gameState.dailyRewards.lastDay <= 15
                              ? gameState.dailyRewards.lastDay
                              : gameState.dailyRewards?.currentStreak || 0)
                          : 0
                      )} Days
                    </b>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Grid */}
            <div className="grid grid-cols-3 gap-4">
              {progressionTasks.map((task) => (
                <div
                  key={task.day}
                  className={`relative flex flex-col items-center justify-center w-[120px] h-[140px] rounded-[10px] border ${
                    task.completed
                      ? "bg-[rgba(41,24,24,0.7)] border-[rgba(255,255,255,0.1)]"
                      : shouldShowYellow(task.day)
                      ? "bg-[rgba(225,135,0,0.2)] border-[#E18700] cursor-pointer"
                      : "bg-[rgba(41,24,24,0.7)] border-[rgba(255,255,255,0.1)]"
                  }`}
                  onClick={() => {
                    const status = checkRewardAvailability();

                    // Get the most up-to-date collected status from gameState
                    const isCollected = Boolean(
                      gameState.dailyRewards?.collectedDays?.[task.day]
                    );

                    // If already collected, do nothing
                    if (isCollected || task.completed) {
                      gameToast.error(
                        `You've already collected day ${task.day}.`,
                        {
                          duration: 3000,
                        }
                      );
                      return;
                    }

                    // Check for first-time user or reset user
                    const isFirstTimeUser =
                      !gameState.dailyRewards ||
                      gameState.dailyRewards.lastDay === undefined ||
                      gameState.dailyRewards.lastDay === 0 ||
                      !gameState.dailyRewards.lastCollected ||
                      gameState.dailyRewards.lastCollected ===
                        "1970-01-01T00:00:00.000Z";

                    // For first time or reset users, only allow collecting day 1
                    if (isFirstTimeUser) {
                      if (task.day === 1 && (typeof status === 'object' && status.canCollect)) {
                        setShowClaimPopup(true);
                        setSelectedReward({ day: task.day, coins: task.coins });
                      } else if (task.day !== 1) {
                        gameToast.error("You must collect day 1 first.", {
                          duration: 3000,
                        });
                      }
                      return;
                    }

                    // Check if a full UTC day has passed since last collection
                    const lastCollectedTime = gameState.dailyRewards
                      ?.lastCollected
                      ? new Date(gameState.dailyRewards.lastCollected)
                      : new Date(0);

                    const now = new Date();
                    const lastCollectedUtcDay = new Date(
                      Date.UTC(
                        lastCollectedTime.getUTCFullYear(),
                        lastCollectedTime.getUTCMonth(),
                        lastCollectedTime.getUTCDate()
                      )
                    ).getTime();
                    const currentUtcDay = new Date(
                      Date.UTC(
                        now.getUTCFullYear(),
                        now.getUTCMonth(),
                        now.getUTCDate()
                      )
                    ).getTime();

                    const fullUtcDayPassed =
                      currentUtcDay > lastCollectedUtcDay;

                    // If it's the next day to collect and you can collect today and a full UTC day has passed
                    if (
                      task.day === nextDayToCollect &&
                      task.day === nextDayToCollect &&
                      (typeof status === 'object' && status.canCollect) &&
                      fullUtcDayPassed
                    ) {
                      setShowClaimPopup(true);
                      setSelectedReward({ day: task.day, coins: task.coins });
                    }
                    // If it's not yet time for collection because UTC day hasn't changed
                    else if (
                      task.day === nextDayToCollect &&
                      !fullUtcDayPassed
                    ) {
                      const nextUtcDay = new Date(
                        lastCollectedUtcDay + 24 * 60 * 60 * 1000
                      );
                      const hoursUntilNextUtcDay = Math.floor(
                        (nextUtcDay.getTime() - now.getTime()) /
                          (60 * 60 * 1000)
                      );
                      const minutesUntilNextUtcDay = Math.floor(
                        ((nextUtcDay.getTime() - now.getTime()) %
                          (60 * 60 * 1000)) /
                          (60 * 1000)
                      );

                      gameToast.error(
                        `You can collect this reward after UTC midnight. Available in ${hoursUntilNextUtcDay}h ${minutesUntilNextUtcDay}m.`,
                        {
                          duration: 3000,
                        }
                      );
                    }
                    // If it's not yet time for collection (already collected today)
                    else if (
                      task.day === nextDayToCollect &&
                      !(typeof status === 'object' && status.canCollect)
                    ) {
                      const timeRemaining = (typeof status === 'object' && status.timeUntilNext)
                        ? `${Math.floor(
                            status.timeUntilNext / 3600
                          )}h ${Math.floor(
                            (status.timeUntilNext % 3600) / 60
                          )}m`
                        : "some time";
                      gameToast.error(
                        `You've already collected today's reward. Next reward available in ${timeRemaining}.`,
                        {
                          duration: 3000,
                        }
                      );
                    }
                    // If trying to collect a day that's too early (difference < 1)
                    else if (task.day <= lastCollectedDay) {
                      gameToast.error(
                        `You've already collected day ${task.day}.`,
                        {
                          duration: 3000,
                        }
                      );
                    }
                    // If trying to collect a future day
                    else if (task.day > nextDayToCollect) {
                      gameToast.error(
                        `You need to collect day ${
                          nextDayToCollect > 0 ? nextDayToCollect : 1
                        } first.`,
                        {
                          duration: 3000,
                        }
                      );
                    }
                  }}
                >
                  {/* Base layout for all states */}
                  <div
                    className={`absolute h-full w-full top-0 right-0 bottom-0 left-0 backdrop-blur-[7px] rounded-[10px] box-border ${
                      task.completed
                        ? "bg-[rgba(58,28,9,0.7)] border border-[rgba(255,255,255,0.1)]"
                        : task.day === nextDayToCollect && !task.completed
                        ? "bg-[rgba(41,24,24,0.7)] border-2 border-[#e18700]"
                        : task.day === 15
                        ? "bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)]"
                        : "bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] opacity-50"
                    }`}
                  />

                  {/* Bottom section */}
                  <div
                    className={`absolute h-[32.52%] w-full top-[67.48%] right-0 bottom-0 left-0 backdrop-blur-[7px] rounded-b-[10px] border-t box-border ${
                      task.completed
                        ? "bg-[#3a1c09] border-[rgba(255,255,255,0.1)]"
                        : task.day === nextDayToCollect && !task.completed
                        ? "bg-[#e18700] border-[rgba(255,255,255,0.1)]"
                        : task.day === 15
                        ? "bg-[#960000]"
                        : "bg-[rgba(41,24,24,0.7)] border-[rgba(255,255,255,0.1)]"
                    }`}
                  />

                  {/* Content section */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div
                      className={`text-[14px] leading-[140%] tracking-[-0.02em] text-[#909090] font-bold mb-3`}
                    >
                      Day {task.day}
                    </div>
                    <div className="relative">
                      <div className="relative overflow-visible">
                        {task.day === 15 && (
                          <Image
                            src={WingsImage}
                            alt="Wings"
                            width={60}
                            height={30}
                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
                            style={{ maxWidth: 'none', width: "auto", height: "auto" }}
                          />
                        )}
                        <Image
                          className="w-[30px] h-[30px] mb-3 relative z-10"
                          width={24}
                          height={24}
                          alt="Spark"
                          src={SparkIcon}
                          style={{ width: "auto", height: "auto" }}
                        />
                        {task.completed && (
                          <Image
                            className="absolute h-[20px] w-[20px] top-[-2px] right-[-15px] z-30"
                            width={20}
                            height={20}
                            alt="Task Completed"
                            src={TaskCompletedDiamond}
                            style={{ width: "auto", height: "auto" }}
                          />
                        )}
                      </div>
                    </div>
                    <b
                      className={`text-[18px] leading-[140%] tracking-[-0.02em] font-bold text-white pt-2 text-center w-full`}
                    >
                      {task.coins >= 1000000
                        ? `${(task.coins / 1000000).toFixed(1)}M`
                        : task.coins >= 1000
                        ? `${(task.coins / 1000).toFixed(1)}K`
                        : task.coins}
                    </b>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Popups */}
      {showClaimPopup && selectedReward && (
        <DailyRewardsClaim
          coins={selectedReward.coins}
          day={selectedReward.day}
          userId={userId?.toString() || "0"}
          onClose={handleClosePopups}
          onClaim={handleClaimReward}
          isLoading={isLoading}
          persistState={persistState}
          gameState={gameState}
        />
      )}
      {showSuccessPopup && selectedReward && (
        <DailyRewardsSuccess
          coins={selectedReward.coins}
          onClose={handleClosePopups}
        />
      )}

      {/* Loader Overlay */}
      <Loader isLoading={isLoading} />
    </div>
  );
};

export default DailyRewards;