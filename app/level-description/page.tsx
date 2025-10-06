"use client";
import React from "react";
import { levelConfig } from "../utility/stageConfig";
import { useWebApp } from "../hooks/useWebApp";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";



import { FaChevronRight } from "react-icons/fa";
import { useGame } from "../context/GameContext";

const LevelDescriptionPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { instance: WebApp } = useWebApp(true);
  const { gameState } = useGame();

  // Get level from query parameter, default to current level if not provided
  const level = parseInt(searchParams.get('level') || '1', 10);

  // Function to calculate current level based on coins
  const calculateCurrentLevel = (coins: number): number => {
    if (coins === 0) return 1;
    let currentLevel = 1;
    for (let i = 1; i <= 10; i++) {
      if (coins >= levelConfig[i].sparkRequired) {
        currentLevel = i;
      } else {
        break;
      }
    }
    return currentLevel;
  };

  const currentLevel = calculateCurrentLevel(gameState.coins);

  // Function to get Phoenix status message
  const getPhoenixStatus = () => {
    if (level > currentLevel) return "Sparky Not Ready";
    if (level === currentLevel) return "Sparky In Training";
    return "Sparky Power Mastered";
  };

  React.useEffect(() => {
    if (WebApp) {
      WebApp.BackButton.show();
      WebApp.enableClosingConfirmation();
      
      const handleBack = () => {
        router.push('/level-details');
      };

      WebApp.BackButton.onClick(handleBack);
      
      return () => {
        WebApp.BackButton.offClick(handleBack);
      };
    }
  }, [WebApp, router]);

  // Function to get the phoenix image based on level
  const getPhoenixImage = (level: number): string => {
    try {
      return  `/assets/leveldetails/leveldetailsbg${level}.png`;
    } catch {
      return "/assets/leveldetails/leveldetailsbg1.png";
    }
  };

  return (
    <div className="min-h-screen text-white">
      {/* Background Image Section */}
      <div className="fixed -inset-4 h-[80vh] z-0 overflow-hidden">
        <Image
          src={getPhoenixImage(level)}
          alt={`Level ${level} Phoenix`}
          width={0}
          height={0}
          sizes="120vw"
          className="w-[120%] h-auto scale-110 translate-y-[10%]"
          quality={100}
          priority
        />
      </div>

      {/* Content Section */}
      <div className="relative z-10 min-h-screen overflow-y-auto ">
        <div className="px-4 pt-6">
          {/* Level Status Banner */}
          <div className="flex justify-center">
            <div className="flex items-center justify-center gap-3 bg-black/30 rounded-full px-4 py-4 w-fit border border-[#3D2A2A] h-8">
              <div className="flex items-center justify-center w-4 h-4">
                <Image
                  src={
                    level > currentLevel
                      ? "/assets/LockedYellow.png"
                      : "/assets/TaskCompletedDiamond.png"
                  }
                  alt="Level Status"
                  width={16}
                  height={16}
                />
              </div>
              <div className="flex items-center justify-center">
                <span className="text-sm text-white flex-shrink-0 leading-none">
                  {getPhoenixStatus()}
                </span>
              </div>
              <div className="flex items-center justify-center w-3 h-3">
                <FaChevronRight className="text-white" size={12} />
              </div>
            </div>
          </div>

          {/* Spark Requirements */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 bg-[rgba(41,24,24,0.7)] rounded-[10px] p-4 border border-[rgba(255,255,255,0.1)] mt-72">
              <Image src="/assets/SparkyIcon.png" alt="Spark" width={36} height={36} />
              <div className="flex-1">
                <span className="text-lg font-bold">
                  {levelConfig[level].sparkRequired.toLocaleString()} SPARK to
                  Reach
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[rgba(41,24,24,0.7)] rounded-[10px] p-3 border border-[rgba(255,255,255,0.1)]">
              <Image
                src="/assets/CampaignOpenTreasure.png"
                alt="Bonus"
                width={48}
                height={48}
              />
              <div className="flex-1">
                <span className="text-lg font-bold">
                  +{levelConfig[level].levelCompletionReward.toLocaleString()}{" "}
                  SPARK in Bonus
                </span>
              </div>
            </div>
          </div>

          {/* Level Title and Description */}
          <div className="p-2 mb-4">
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
              {levelConfig[level].title}
              <span className="text-sm text-gray-400">LVL {level}</span>
            </h1>
            <p className="text-gray-300 whitespace-pre-line leading-relaxed">
              {levelConfig[level].levelDescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelDescriptionPage; 