'use client'
import { useEffect, useState, useCallback } from 'react';
import Image from "next/image";
import DailyRewardIcon from "@/public/assets/Earn/DailyRewardIcon.png";
import { useRouter } from 'next/navigation';
import { useGameFeatures } from '@/app/context/GameFeaturesContext';
import { useGame } from '@/app/context/GameContext';
import HourGlassIcon from "@/public/assets/Earn/HourGlassIcon.png"
import { FaChevronRight } from "react-icons/fa";

const DailyRewardTimer = () => {
  const router = useRouter();
  const { dailyRewards: { isRewardAvailable, timeUntilNext, checkRewardAvailability } } = useGameFeatures();
  const { gameState } = useGame();
  const [isLoading, setIsLoading] = useState(true);
  const [hoursUntilUtc, setHoursUntilUtc] = useState<number>(0);
  const [minutesUntilUtc, setMinutesUntilUtc] = useState<number>(0);

  // Check if reward was collected today
  const wasCollectedToday = useCallback(() => {
    const lastCollected = gameState.dailyRewards?.lastCollected;
    
    if (!lastCollected || lastCollected === "1970-01-01T00:00:00.000Z") return false;
    
    const now = new Date();
    const lastCollectedDate = new Date(lastCollected);
    
    return lastCollectedDate.getUTCFullYear() === now.getUTCFullYear() &&
           lastCollectedDate.getUTCMonth() === now.getUTCMonth() &&
           lastCollectedDate.getUTCDate() === now.getUTCDate();
  }, [gameState.dailyRewards?.lastCollected]);

  // Calculate time until UTC midnight if user already collected today
  const calculateTimeUntilUtcMidnight = useCallback(() => {
    if (!gameState.dailyRewards?.lastCollected) return;
    
    const now = new Date();
    const lastCollectedDate = new Date(gameState.dailyRewards.lastCollected);
    
    // Get UTC day boundaries
    const lastCollectedUtcDay = new Date(Date.UTC(
      lastCollectedDate.getUTCFullYear(),
      lastCollectedDate.getUTCMonth(),
      lastCollectedDate.getUTCDate()
    )).getTime();
    
    const nextUtcDay = new Date(lastCollectedUtcDay + 24 * 60 * 60 * 1000);
    const hoursUntilNextUtcDay = Math.floor((nextUtcDay.getTime() - now.getTime()) / (60 * 60 * 1000));
    const minutesUntilNextUtcDay = Math.floor(((nextUtcDay.getTime() - now.getTime()) % (60 * 60 * 1000)) / (60 * 1000));
    
    setHoursUntilUtc(hoursUntilNextUtcDay);
    setMinutesUntilUtc(minutesUntilNextUtcDay);
  }, [gameState.dailyRewards?.lastCollected]);

  useEffect(() => {
    // Check reward availability when component mounts
    checkRewardAvailability();
    
    // Calculate time until UTC midnight if already collected
    if (wasCollectedToday()) {
      calculateTimeUntilUtcMidnight();
    }
    
    setIsLoading(false);
    
    // Set up timer to update the UTC countdown every minute
    const timer = setInterval(() => {
      if (wasCollectedToday()) {
        calculateTimeUntilUtcMidnight();
      }
    }, 60000);
    
    return () => clearInterval(timer);
  }, [checkRewardAvailability, wasCollectedToday, calculateTimeUntilUtcMidnight]);

  const handleClick = () => {
    router.push('/earn/daily-rewards');
  };

  if (isLoading) {
    return <div className="w-full h-[140px] bg-[rgba(41,24,24,0.7)] backdrop-blur-[14px] rounded-[10px] animate-pulse" />;
  }

  // Check if today's reward has been collected
  const hasCollectedToday = wasCollectedToday();
  
  // If reward is available AND hasn't been collected today, show "Your Daily Reward Awaits!" with claim button
  if (isRewardAvailable && !hasCollectedToday) {
    return (
      <div 
        className="flex items-center justify-between w-full p-4 bg-[rgba(41,24,24,0.7)] backdrop-blur-[14px] rounded-[10px] cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex flex-col gap-3">
          <span className="text-white text-xl font-bold">
            Your Daily Reward Awaits!
          </span>
          <span className="text-[#909090] text-sm">
            Tap to claim your bonus coins now! Don&apos;t miss out!
          </span>
          <div className="flex items-center text-[#E18700] font-bold mt-1">
            <span>Claim Now</span>
            <FaChevronRight className="ml-1" size={12} />
          </div>
        </div>
        <Image
          src={DailyRewardIcon}
          alt="Daily Reward"
          width={92}
          height={100}
        />
      </div>
    );
  }

  // If reward is not available or has been collected today, show the countdown timer with hourglass
  // Use UTC time if already collected today, otherwise use timeUntilNext
  const hours = hasCollectedToday ? hoursUntilUtc : (typeof timeUntilNext === 'object' ? parseInt(timeUntilNext.hours) : 0);
  const minutes = hasCollectedToday ? minutesUntilUtc : (typeof timeUntilNext === 'object' ? parseInt(timeUntilNext.minutes) : 0);

  return (
    <div 
      className="flex items-center justify-between w-full p-4 bg-[rgba(41,24,24,0.7)] backdrop-blur-[14px] rounded-[10px] border border-[rgba(255,255,255,0.1)] cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Image
            src={HourGlassIcon}
            alt="Hourglass"
            width={32}
            height={32}
          />
          <span className="text-white text-lg font-bold">
            Next reward in
          </span>
        </div>
        <div className="text-white text-2xl font-bold">
          {hours}h {minutes}m
        </div>
        <span className="text-[#909090] text-sm mt-2">
          Come back tomorrow for more bonus coins! Keep the streak!
        </span>
      </div>
      <Image
        src={DailyRewardIcon}
        alt="Daily Reward"
        width={92}
        height={100}
      />
    </div>
  );
};

export default DailyRewardTimer; 