"use client";
import React from "react";
import Image from "next/image";
import { levelConfig } from "../utility/stageConfig";
import { useWebApp } from "../hooks/useWebApp";
import { useRouter } from "next/navigation";
import sparkicon from "../../public/assets/SparkyIcon.png";
import TopYourLevelIcon from "../../public/assets/topyourlevelicon.png";
import BundleIcon from "../../public/assets/sparkbundelicon.png";
import SparkEvolutionIcon from "../../public/assets/sparkevolutionicon.png";
import telegramIcon from "../../public/assets/telegramicon.png";
import xIcon from "../../public/assets/xicon.png";
import discordIcon from "../../public/assets/discordicon.png";
import websiteIcon from "../../public/assets/websiteicon.png";
import { useGame } from "../context/GameContext";

const LevelHowItWorksPage = () => {
  const router = useRouter();
  const { instance: WebApp } = useWebApp(true);
  const { gameState } = useGame();

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

  // Function to get the badge image based on level
  const getBadgeImage = (level: number): string => {
    try {
      return `/assets/homebackground/badge${level}.png`;
    } catch {
      return '/assets/homebackground/badge1.png';
    }
  };

  // Function to calculate current level based on coins
  const calculateCurrentLevel = (coins: number): number => {
    // For 0 coins, we're working toward level 1
    if (coins === 0) {
      return 1;
    }

    // Find the highest completed level
    let completedLevel = 0;
    for (let i = 1; i <= 10; i++) {
      if (coins >= levelConfig[i].sparkRequired) {
        completedLevel = i;
      } else {
        break;
      }
    }
    
    // Current level is the one we're working toward
    // If we've completed level 10, stay at 10
    return completedLevel < 10 ? completedLevel + 1 : 10;
  };

  return (
    <div className="min-h-screen text-white bg-[#150404] overflow-y-auto">
      {/* Top Section with Icon */}
      <div className="relative w-full aspect-[2/1] overflow-hidden mt-6">
        <div className="absolute inset-0">
          <Image
            src={TopYourLevelIcon}
            alt="Top Your Level"
            fill
            style={{ objectFit:"contain"}}
            quality={100}
            priority
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="relative px-6 pb-8">
        {/* Top Your Level Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Top Your Level</h1>
          <p className="text-sm text-gray-500 font-bold">
            The leaderboard is divided into levels. You compete against the
            users from your own level. Collect as much SPARK to enter a new one.
          </p>
        </div>

        {/* Sparky Bonus Rewards Section */}
        <div className="py-6">
          <div className="flex items-center gap-3 mb-4">
            <Image src={BundleIcon} alt="Sparky Bonus" width={24} height={24} />
            <h2 className="text-lg font-bold">Sparky Bonus Rewards</h2>
          </div>
            <p className="text-sm text-gray-500 font-bold mb-6">
            Earn powerful bonuses as you rise through the legendary phoenix tiers.
          </p>

          {/* Level Rewards List */}
          <div className="flex flex-col rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(41,24,24,0.70)] backdrop-blur-[14px]">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((level, index) => {
              const currentLevel = calculateCurrentLevel(gameState.coins);
              const isCurrentLevel = level === currentLevel;
              return (
                <React.Fragment key={level}>
                  <div
                    className={`flex items-center justify-between p-4 ${
                      isCurrentLevel ? "bg-[rgba(255,215,0,0.1)]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={getBadgeImage(level)}
                        alt={`Level ${level}`}
                        width={32}
                        height={32}
                      />
                      <span className="text-base">Level {level}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 mt-1">
                        
                        <Image
                          src={sparkicon}
                          alt="Spark"
                          width={14}
                          height={14}
                        />
                        <span className="text-base font-medium text-[#909090]">
                          {levelConfig[
                            level
                          ].levelCompletionReward.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {index < 9 && (
                    <div className="h-px w-[90%] mx-auto bg-[rgba(255,255,255,0.1)]"></div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Sparky Evolution Levels Section */}
        <div className="py-6">
          <div className="flex items-center gap-3 mb-2">
            <Image
              src={SparkEvolutionIcon}
              alt="Sparky Evolution"
              width={24}
              height={24}
            />
            <h2 className="text-lg font-bold">Sparky Evolution Levels</h2>
          </div>
          <p className="text-sm text-gray-400 font-bold mb-6">
            Required SPARK to reach each stage of transformation.
          </p>

          {/* Evolution Levels List */}
          <div className="flex flex-col rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(41,24,24,0.70)] backdrop-blur-[14px] mb-8">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((level, index) => {
              const currentLevel = calculateCurrentLevel(gameState.coins);
              const isCurrentLevel = level === currentLevel;
              return (
                <React.Fragment key={level}>
                  <div
                    className={`flex items-center justify-between p-4 ${
                      isCurrentLevel ? "bg-[rgba(255,215,0,0.1)]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {level >= 9 ? (
                        <Image
                          src={getBadgeImage(level)}
                          alt={`Level ${level}`}
                          width={32}
                          height={32}
                          className="transform scale-110"
                        />
                      ) : (
                        <Image
                          src={getBadgeImage(level)}
                          alt={`Level ${level}`}
                          width={32}
                          height={32}
                        />
                      )}
                      <span className="text-base text-gray-300 font-bold">
                        Level {level}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 mt-1">
                        
                        <Image
                          src={sparkicon}
                          alt="Spark"
                          width={14}
                          height={14}
                        />
                        <span className="text-base font-medium text-[#909090]">
                          {levelConfig[
                            level
                          ].sparkRequired.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {index < 9 && (
                    <div className="h-px w-[90%] mx-auto bg-[rgba(255,255,255,0.1)]"></div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-2 gap-3">
            <button
              className="flex items-center justify-center gap-2 bg-[#1F1212] rounded-[10px] p-4 hover:bg-[#2A1818]"
              onClick={() => window.open("https://t.me/SparkyTapGame", "_blank")}
            >
              <Image src={telegramIcon} alt="Telegram" width={24} height={24} />
              <span>Telegram</span>
            </button>
            <button
              className="flex items-center justify-center gap-2 bg-[#1F1212] rounded-[10px] p-4 hover:bg-[#2A1818]"
              onClick={() =>
                window.open("https://x.com/TheSparkyVerse", "_blank")
              }
            >
              <Image src={xIcon} alt="X (Twitter)" width={24} height={24} />
              <span>X (Twitter)</span>
            </button>
            <button
              className="flex items-center justify-center gap-2 bg-[#1F1212] rounded-[10px] p-4 hover:bg-[#2A1818]"
              onClick={() =>
                window.open("https://discord.gg/vXfzRqBSPH", "_blank")
              }
            >
              <Image src={discordIcon} alt="Discord" width={24} height={24} />
              <span>Discord</span>
            </button>
            <button
              className="flex items-center justify-center gap-2 bg-[#1F1212] rounded-[10px] p-4 hover:bg-[#2A1818]"
              onClick={() => window.open("https://sparky.zone", "_blank")}
            >
              <Image src={websiteIcon} alt="Website" width={24} height={24} />
              <span>Website</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelHowItWorksPage; 