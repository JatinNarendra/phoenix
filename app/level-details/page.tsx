"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useGame } from "../context/GameContext";
import { levelConfig } from "../utility/stageConfig";
import { motion } from "framer-motion";
// Remove image imports - we'll use src paths instead
import { supabase } from "@/lib/supabase";
import { FaChevronRight } from "react-icons/fa";
import { useWebApp } from "../hooks/useWebApp";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/app/ui/avatar";
import CustomYellowButton from "@/app/ui/CustomYellowButton";

const LevelDetailsPage = () => {
  const { gameState } = useGame();
  const router = useRouter();
  const { instance: WebApp } = useWebApp(true);

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

  const currentLevel = calculateCurrentLevel(gameState.coins);
  const [selectedLevel, setSelectedLevel] = useState(currentLevel);
  const [users, setUsers] = useState<
    Array<{
      name: string;
      spark: string;
      rank: number;
      level: number;
      photo_url: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [totalUsersInLevel, setTotalUsersInLevel] = useState(0);
  const [userPlace, setUserPlace] = useState(0);

  useEffect(() => {
    if (WebApp) {
      WebApp.BackButton.show();
      WebApp.enableClosingConfirmation();

      const handleBack = () => {
        router.push("/");
      };

      WebApp.BackButton.onClick(handleBack);

      return () => {
        WebApp.BackButton.offClick(handleBack);
      };
    }
  }, [WebApp, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!supabase) {
        console.error("Supabase client not available");
        return;
      }

      try {
        const { data: telegramUsers, error } = await supabase
          .from("telegram_users")
          .select("*")
          .not("game_state", "is", null);

        if (error) throw error;

        // Filter users by selected level using the new level calculation
        const usersInLevel = telegramUsers.filter((user) => {
          const userGameState = user.game_state as { coins?: number };
          const userLevel = calculateCurrentLevel(userGameState?.coins || 0);
          return userLevel === selectedLevel;
        });

        // Calculate total users in level
        setTotalUsersInLevel(usersInLevel.length);

        // Sort all users by coins
        const sortedUsers = [...usersInLevel].sort((a, b) => {
          const aCoins = (a.game_state as { coins?: number })?.coins || 0;
          const bCoins = (b.game_state as { coins?: number })?.coins || 0;
          return bCoins - aCoins;
        });

        // Find current user's place
        const currentUserIndex = sortedUsers.findIndex((user) => {
          const userGameState = user.game_state as { user_id?: string };
          return userGameState?.user_id === gameState.user_id;
        });
        setUserPlace(currentUserIndex >= 0 ? currentUserIndex + 1 : 0);

        // Get top 3 users
        const topUsers = sortedUsers.slice(0, 3);

        const formattedUsers = topUsers.map((user, index) => {
          const userGameState = user.game_state as { coins?: number };
          return {
            name: user.username || user.first_name || "Anonymous",
            spark: Math.max(0, userGameState?.coins || 0).toLocaleString(),
            rank: index + 1,
            level: selectedLevel,
            photo_url: user.photo_url || null,
          };
        });

        setUsers(formattedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [selectedLevel, gameState.user_id]);

  // Function to get the phoenix image based on level
  const getPhoenixImage = (level: number): string => {
    try {
      return `/assets/leveldetails/leveldetailsbg${level}.png`;
    } catch {
      return "/assets/leveldetails/leveldetailsbg1.png";
    }
  };

  // Function to get the badge image based on level
  const getBadgeImage = (level: number): string => {
    try {
      return `/assets/homebackground/badge${level}.png`;
    } catch {
      return "/assets/homebackground/badge1.png";
    }
  };

  // Function to get the learn more background image based on level
  const getLearnMoreBackground = (level: number): string => {
    try {
      return `/assets/leveldetails/levellearnmore${level}.png`;
    } catch {
      return "/assets/leveldetails/levellearnmore1.png";
    }
  };

  const handleBadgeClick = (level: number) => {
    setSelectedLevel(level);
  };

  return (
    <div className="min-h-screen text-white">
      {/* Phoenix Image Section */}
      <div className="fixed top-0 left-0 right-0 z-0">
        <Image
          src={getPhoenixImage(selectedLevel)}
          alt={`Level ${selectedLevel} Phoenix`}
          width={0}
          height={0}
          sizes="100vw"
          className="w-full h-auto"
          quality={100}
          priority
        />
      </div>

      {/* Content Section */}
      <div className="relative z-10 min-h-screen overflow-y-auto pb-12">
        <div className="relative min-h-screen">
          <div className="px-4 pt-4">
            {/* You are in section */}
            <div className="flex justify-center items-center gap-2 mb-36">
              <div className="backdrop-blur-xl rounded-2xl bg-black/60 border border-[rgba(226,144,41,0.4)] py-2 px-3 flex items-center gap-2">
                {selectedLevel > currentLevel ? (
                  <>
                    <Image
                      src={getBadgeImage(selectedLevel)}
                      alt={`Level ${selectedLevel} Badge`}
                      width={24}
                      height={24}
                    />
                    <span className="text-sm">
                      Level {selectedLevel} is Locked
                    </span>
                  </>
                ) : selectedLevel === currentLevel ? (
                  <>
                    <Image
                      src={getBadgeImage(selectedLevel)}
                      alt={`Level ${selectedLevel} Badge`}
                      width={24}
                      height={24}
                    />
                    <span className="text-sm">
                      You are in Level {selectedLevel}
                    </span>
                  </>
                ) : (
                  <>
                    <Image
                      src={getBadgeImage(selectedLevel)}
                      alt={`Level ${selectedLevel} Badge`}
                      width={24}
                      height={24}
                    />
                    <span className="text-sm">
                      Level {selectedLevel} is Completed
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* How it works section */}
            <div className="flex justify-center mb-10">
              <div
                className="backdrop-blur-xl rounded-lg bg-black/60 border border-[rgba(226,144,41,0.4)] px-[9px] py-1 flex flex-row items-center justify-start gap-2 cursor-pointer text-left text-sm text-[#e18700]"
                onClick={() => router.push("/level-howitworks")}
              >
                <span>How it works</span>
                <Image
                  src="/assets/BrownDiamondInfo.png"
                  alt="How it works"
                  width={16}
                  height={16}
                />
              </div>
            </div>
            {/* Spark Required Section */}
            {selectedLevel <= currentLevel && (
              <div className="w-full relative backdrop-blur-md rounded-lg bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] p-4 text-left text-base text-white mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Image src="/assets/SparkyIcon.png" alt="Spark" width={24} height={24} />
                    <span>
                      {(() => {
                        // For level 1, show level 1 requirement
                        if (selectedLevel === 1) {
                          return levelConfig[1]?.sparkRequired.toLocaleString();
                        }

                        // For other levels, show that level's requirement
                        return levelConfig[
                          selectedLevel
                        ]?.sparkRequired.toLocaleString();
                      })()}
                    </span>
                    SPARK to Reach
                  </div>
                  {selectedLevel < currentLevel && (
                    <Image
                      src="/assets/TaskCompletedDiamond.png"
                      alt="Task Completed"
                      width={24}
                      height={24}
                    />
                  )}
                </div>

                {/* Progress Bar - Only show for current level */}
                {selectedLevel === currentLevel && (
                  <>
                    <div className="relative h-2 bg-[rgba(41,24,24,0.9)] rounded-full overflow-hidden mb-2">
                      <motion.div
                        className="h-full bg-gradient-to-r from-orange-500 to-yellow-500"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(() => {
                            // For 0 coins, empty progress bar
                            if (gameState.coins === 0) {
                              return 0;
                            }

                            // Find the current level based on coins
                            const currentLevel = selectedLevel;

                            // For completed levels, show full progress bar
                            if (
                              selectedLevel <
                              calculateCurrentLevel(gameState.coins)
                            ) {
                              return 100;
                            }

                            const currentLevelSparkRequired =
                              levelConfig[currentLevel - 1]?.sparkRequired || 0;
                            const nextLevelSparkRequired =
                              levelConfig[currentLevel]?.sparkRequired || 0;

                            // If we're at max level (10), show full progress bar
                            if (currentLevel === 10) {
                              return 100;
                            }

                            // For level 1, use special calculation
                            if (currentLevel === 1) {
                              return Math.min(
                                100,
                                Math.max(
                                  0,
                                  (gameState.coins / nextLevelSparkRequired) *
                                    100
                                )
                              );
                            }

                            // Calculate progress percentage based on progress towards this level
                            const progress =
                              gameState.coins - currentLevelSparkRequired;
                            const totalNeeded =
                              nextLevelSparkRequired -
                              currentLevelSparkRequired;
                            const percentage = (progress / totalNeeded) * 100;

                            return Math.min(100, Math.max(0, percentage));
                          })()}%`,
                        }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                      <div className="flex items-center gap-1">
                        <Image
                          src="/assets/SparkyIcon.png"
                          alt="Spark"
                          width={14}
                          height={14}
                        />
                        <motion.span
                          className="text-white font-bold"
                          initial={{ scale: 1 }}
                          animate={{
                            scale: [1, 1.1, 1],
                            transition: { duration: 0.2 },
                          }}
                          key={gameState.coins}
                        >
                          {Math.max(0, gameState.coins).toLocaleString()}
                        </motion.span>
                        <span>/</span>
                        <span>
                          {(() => {
                            // For level 1, show level 1 requirement
                            if (selectedLevel === 1) {
                              return levelConfig[1]?.sparkRequired.toLocaleString();
                            }

                            // For other levels, show that level's requirement
                            return levelConfig[
                              selectedLevel
                            ]?.sparkRequired.toLocaleString();
                          })()}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Locked Level Message - Show above level description when level is locked */}
            {selectedLevel > currentLevel && (
              <div className="w-full relative backdrop-blur-md rounded-lg bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] p-4 text-left text-base text-white mb-4">
                <div className="text-sm mb-4">
                  <span className="text-white">Level {selectedLevel}</span>
                  <span className="text-gray-500 font-bold">
                    {" "}
                    is locked, complete previous levels. Keep playing to
                    maximize your earnings!
                  </span>
                </div>

                {/* SPARK to Reach Box */}
                <div className="w-full relative backdrop-blur-md rounded-lg bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] p-4 text-left text-base text-white mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-1">
                      <Image
                        src="/assets/SparkyIcon.png"
                        alt="Spark"
                        width={32}
                        height={32}
                      />
                    </div>
                    <span className="text-md text-white">
                      {levelConfig[
                        selectedLevel
                      ].sparkRequired.toLocaleString()}{" "}
                      SPARK to Reach
                    </span>
                  </div>
                </div>

                {/* Bonus Box */}
                <div className="w-full relative backdrop-blur-md rounded-lg bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] p-4 text-left text-base text-white mb-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/assets/CampaignOpenTreasure.png"
                      alt="Bonus"
                      width={48}
                      height={48}
                    />
                    <span className="text-md text-white">
                      +
                      {levelConfig[
                        selectedLevel
                      ].levelCompletionReward.toLocaleString()}{" "}
                      SPARK in Bonus
                    </span>
                  </div>
                </div>

                {/* Continue Playing Button */}
                <CustomYellowButton
                  onClick={() => router.push("/")}
                  className="w-[70%] mx-auto"
                >
                  Continue Playing
                </CustomYellowButton>
              </div>
            )}

            {/* Level Name and Description */}
            <div className=" h-[133px] relative backdrop-blur-md rounded-lg bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-base text-white mb-2 overflow-hidden">
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <p className="text-xl font-bold mb-2">
                    {levelConfig[selectedLevel].title}
                  </p>
                  <p className="text-sm text-gray-400 max-w-[60%] font-bold">
                    {(() => {
                      const descriptions = {
                        1: "Crack the mystery, unleash the Phoenix within.",
                        2: "From sparks to embers, the journey begins.",
                        3: "No longer small, it burns with purpose.",
                        4: "A fiery fighter ready for fierce battles.",
                        5: "Flame unchained. Spirit awakened.",
                        6: "Sparky ascends, glowing with starfire.",
                        7: "Solar power meets guardian strength.",
                        8: "Solar strength meets timeless knowledge.",
                        9: "Speed, power, and cosmic prestige combined.",
                        10: "Bends time, breaks limits, defines destiny.",
                      } as Record<number, string>;
                      return descriptions[selectedLevel] || descriptions[1];
                    })()}
                  </p>
                </div>
                <div
                  className="flex items-center text-[#E18700] font-bold cursor-pointer"
                  onClick={() =>
                    router.push(`/level-description?level=${selectedLevel}`)
                  }
                >
                  <span>Level Story</span>
                  <FaChevronRight className="ml-1" size={12} />
                </div>
              </div>

              {/* Level Background Image with Badge */}
              <div className="absolute top-0 h-full right-0 ">
                <div className="relative h-full w-[160px]">
                  <Image
                    src={getLearnMoreBackground(selectedLevel)}
                    alt={`Level ${selectedLevel} Learn More Background`}
                    fill
                    className="opacity-90"
                  />
                </div>
              </div>
            </div>

            {/* Users Section */}
            <div>
              <h3 className="text-lg font-bold mb-4 text-[#E18700]">Users</h3>
              <div
                className={`grid ${
                  selectedLevel === currentLevel ? "grid-cols-2" : "grid-cols-1"
                } gap-2 mb-4`}
              >
                <div
                  className={`relative backdrop-blur-md rounded-lg bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] p-4 flex items-center text-white ${
                    selectedLevel !== currentLevel ? "col-span-1" : ""
                  }`}
                >
                  <div className="mr-3">
                    <Image
                      src="/assets/totalusersicon.png"
                      alt="Total Users"
                      width={48}
                      height={48}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">
                      {totalUsersInLevel.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400 font-bold">
                      Total users
                    </span>
                  </div>
                </div>
                {selectedLevel === currentLevel && (
                  <div className="relative backdrop-blur-md rounded-lg bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] p-4 flex items-center text-white">
                    <div className="mr-3">
                      <Image
                        src="/assets/yourplaceicon.png"
                        alt="Your Place"
                        width={48}
                        height={48}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold">
                        {userPlace > 0 ? (
                          `${userPlace > 10000 ? "10,000+" : "#" + userPlace}`
                        ) : (
                          <span className="text-lg">Not Ranked</span>
                        )}
                      </span>
                      <span className="text-sm text-gray-400 font-bold">
                        Your place
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Level Users List */}
              <div className="pb-14">
                {loading ? (
                  <div className="text-center py-4">Loading users...</div>
                ) : (
                  <div className="relative backdrop-blur-md rounded-lg bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] overflow-hidden">
                    {users.map((user, index) => (
                      <div key={index}>
                        <div className="p-4 flex justify-between items-center text-left text-white">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="w-12 h-12 bg-[rgba(41,24,24,0.9)]">
                                {user.photo_url ? (
                                  <AvatarImage
                                    src={user.photo_url}
                                    alt={user.name}
                                  />
                                ) : (
                                  <AvatarFallback className="bg-[rgba(41,24,24,0.9)] text-white">
                                    {user.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 z-10">
                                <Image
                                  src={getBadgeImage(user.level)}
                                  alt={`Level ${user.level}`}
                                  width={16}
                                  height={16}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="font-bold text-lg">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-400 font-bold flex items-center gap-1">
                                <Image
                                  src="/assets/SparkyIcon.png"
                                  alt="Spark"
                                  width={14}
                                  height={14}
                                />
                                {user.spark}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg text-[#E18700]">
                              #{user.rank}
                            </span>
                          </div>
                        </div>
                        {index < users.length - 1 && (
                          <div className="h-px bg-[rgba(255,255,255,0.1)] mx-4"></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Level Badges - Sticky at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="w-full bg-[#150404] border-t border-[rgba(226,144,41,0.2)] box-border h-[90px] flex items-center">
          <div className="overflow-x-auto px-4 w-full">
            <div
              className="flex gap-4 justify-center"
              style={{ minWidth: "max-content" }}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                <div
                  key={level}
                  className={`w-[52px] relative backdrop-blur-md rounded-lg ${
                    level === selectedLevel
                      ? "bg-[#3a1c09]"
                      : "bg-[rgba(41,24,24,0.7)]"
                  } border border-[rgba(255,255,255,0.1)] box-border h-[52px] flex items-center justify-center cursor-pointer`}
                  onClick={() => handleBadgeClick(level)}
                >
                  <div className="relative">
                    <Image
                      src={getBadgeImage(level)}
                      alt={`Level ${level} Badge`}
                      width={40}
                      height={40}
                    />
                    {level > currentLevel ? (
                      <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2 rounded-lg bg-[rgb(41,24,24)] border border-[rgba(255,255,255,0.1)] box-border h-[20px] w-[20px] flex items-center justify-center">
                        <Image
                          src="/assets/LockedYellow.png"
                          alt="Locked"
                          width={14}
                          height={14}
                        />
                      </div>
                    ) : (
                      level < currentLevel && (
                        <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2">
                          <Image
                            src="/assets/TaskCompletedDiamond.png"
                            alt="Completed"
                            width={16}
                            height={16}
                          />
                        </div>
                      )
                    )}
                    {/* Add infinity symbol for level 10 when player is at max level */}
                    {level === 10 && currentLevel >= 10 && (
                      <div className="absolute top-0 right-0 bg-[#3a1c09] rounded-full w-4 h-4 flex items-center justify-center text-xs text-white">
                        ∞
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelDetailsPage;
