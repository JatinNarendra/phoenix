"use client";
import React, { useState, useEffect } from "react";
import { useWebApp } from "@/app/hooks/useWebApp";
import { useRouter } from "next/navigation";
import Image from "next/image";
// Remove image imports - we'll use src paths instead
import { CustomerSocialLink } from "@/app/types/Customer";
// Remove image imports - we'll use src paths instead
import CampaignTaskPopup from "@/app/earn/components/TaskPopup";
import { gameToast } from "@/app/utility/customToast";
import { getTaskCompletionStatus } from "@/app/lib/taskCompletionUtils";
import { useUser } from "@/app/hooks/useUser";
// Remove image imports - we'll use src paths instead
// Remove image imports - we'll use src paths instead
import CampaignRewardPopup from "@/app/earn/components/CampaignRewardPopup";
import { supabase } from "@/lib/supabase";
import { useGame } from "@/app/context/GameContext";

const platformIcons = {
  TELEGRAM_CHANNEL: "/assets/TaskTelegramIcon.png",
  TELEGRAM_GROUP: "/assets/TaskTelegramIcon.png",
  X: "/assets/TaskXIcon.png",
  X_RETWEET: "/assets/TaskXIcon.png",
  YOUTUBE_VIEWS: "/assets/TaskYoutubeIcon.png",
  YOUTUBE_SUBSCRIBERS: "/assets/TaskYoutubeIcon.png",
  YOUTUBE: "/assets/TaskYoutubeIcon.png",
  TELEGRAM: "/assets/TaskTelegramIcon.png",
  DISCORD: "/assets/discordicon.png",
};

const getTaskTitle = (platform: string, customerName: string) => {
  switch (platform) {
    case "X":
      return `Follow us on X(Twitter)`;
    case "TELEGRAM_GROUP":
      return `Join ${customerName} Telegram group`;
    case "TELEGRAM_CHANNEL":
      return `Join ${customerName} Telegram channel`;
    case "YOUTUBE_VIEWS":
      return `Watch ${customerName} on YouTube`;
    case "YOUTUBE_SUBSCRIBERS":
      return `Subscribe to ${customerName} on YouTube`;
    default:
      return platform;
  }
};

interface CustomerCampaignClientProps {
  customerData: {
    id: string;
    customer_name: string;
    campaign_name?: string;
    campaign_details?: string;
    logo_url: string | null;
    tasks: CustomerSocialLink[];
    totalCoins: number;
    totalSpins: number;
    totalTasks: number;
  };
}

export function CustomerCampaignClient({
  customerData,
}: CustomerCampaignClientProps) {
  const router = useRouter();
  const { instance: WebApp } = useWebApp(true);
  const { persistState } = useGame();
  const [selectedTask, setSelectedTask] = useState<CustomerSocialLink | null>(
    null
  );
  const { id: userId } = useUser();
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(
    {}
  );
  const [isRewardPopupOpen, setIsRewardPopupOpen] = useState(false);
  const [isRewardClaimPopupOpen, setIsRewardClaimPopupOpen] = useState(false);
  const [isCampaignCompleted, setIsCampaignCompleted] = useState(false);

  // Calculate campaign rewards once
  const campaignRewards = React.useMemo(
    () => ({
      spark: customerData.tasks.reduce(
        (sum, task) => sum + (task.rewards?.coins || 0),
        0
      ),
      spin: customerData.tasks.reduce(
        (sum, task) => sum + (task.rewards?.spins || 0),
        0
      ),
    }),
    [customerData.tasks]
  );

  const checkCompletedTasks = React.useCallback(async () => {
    if (!userId) {
      setCompletedTasksCount(0);
      setCompletedTasks({});
      return;
    }

    const completionStatuses = await Promise.all(
      customerData.tasks.map(async (task) => {
        const isCompleted = await getTaskCompletionStatus(
          userId.toString(),
          task.id,
          task.platform
        );
        return { taskId: task.id, isCompleted };
      })
    );

    const completedTasksMap = completionStatuses.reduce(
      (acc, { taskId, isCompleted }) => {
        acc[taskId] = isCompleted;
        return acc;
      },
      {} as Record<string, boolean>
    );

    // Calculate total completed tasks
    const completedCount =
      Object.values(completedTasksMap).filter(Boolean).length;
    setCompletedTasksCount(completedCount);
    setCompletedTasks(completedTasksMap);
  }, [userId, customerData.tasks]);

  // Check if user has completed the campaign
  const checkCampaignCompletion = React.useCallback(async () => {
    if (!userId) return;

    if (!supabase) {
      console.error("Supabase client not available");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("campaign_completed_by")
        .eq("id", customerData.id)
        .single();

      if (error) {
        console.error("Error checking campaign completion:", error);
        return;
      }

      setIsCampaignCompleted(
        data?.campaign_completed_by?.includes(userId.toString()) || false
      );
    } catch (error) {
      console.error("Error checking campaign completion:", error);
    }
  }, [userId, customerData.id]);

  useEffect(() => {
    checkCompletedTasks();
    checkCampaignCompletion();
  }, [checkCompletedTasks, checkCampaignCompletion]);

  const handleTaskClick = async (task: CustomerSocialLink) => {
    if (!userId) {
      gameToast.error("Please login to complete tasks");
      return;
    }

    const isCompleted = completedTasks[task.id];

    if (isCompleted) {
      gameToast.success(
        `${getTaskTitle(task.platform, customerData.customer_name)} completed!`
      );
      return;
    }

    setSelectedTask(task);
  };

  const handleTaskComplete = React.useCallback(() => {
    checkCompletedTasks();
  }, [checkCompletedTasks]);

  const handleTreasureClick = () => {
    if (completedTasksCount === customerData.totalTasks) {
      setIsRewardPopupOpen(true);
    }
  };

  const handleRewardPopupClick = () => {
    setIsRewardPopupOpen(false);
    setIsRewardClaimPopupOpen(true);
  };

  const handleClaimPopupClose = async () => {
    if (!userId) return;

    if (!supabase) {
      console.error("Supabase client not available");
      return;
    }

    try {
      const { data: currentData, error: fetchError } = await supabase
        .from("customers")
        .select("campaign_completed_by")
        .eq("id", customerData.id)
        .single();

      if (fetchError) throw fetchError;

      const completedBy = currentData?.campaign_completed_by || [];
      if (!completedBy.includes(userId.toString())) {
        const { error: updateError } = await supabase
          .from("customers")
          .update({
            campaign_completed_by: [...completedBy, userId.toString()],
          })
          .eq("id", customerData.id);

        if (updateError) throw updateError;

        // Add campaign rewards to user's balance
        persistState((prev) => ({
          ...prev,
          coins: prev.coins + campaignRewards.spark,
          spins: prev.spins + campaignRewards.spin,
        }));

        gameToast.success(
          `Claimed ${campaignRewards.spark.toLocaleString()} coins and ${
            campaignRewards.spin
          } spins!`
        );
      }

      setIsRewardClaimPopupOpen(false);
      checkCampaignCompletion();
    } catch (error) {
      console.error("Error updating campaign completion:", error);
      gameToast.error("Failed to claim rewards. Please try again.");
    }
  };

  React.useEffect(() => {
    if (WebApp) {
      WebApp.BackButton.show();
      WebApp.enableClosingConfirmation();

      const handleBack = () => {
        router.push("/earn");
      };

      WebApp.BackButton.onClick(handleBack);

      return () => {
        WebApp.BackButton.offClick(handleBack);
      };
    }
  }, [WebApp, router]);

  return (
    <div className="min-h-screen relative overflow-y-auto pb-20">
      <div className="fixed inset-0 z-0">
        <Image
          src="/assets/SparkyCampaign/SparkyCampaignBG.png"
          alt="Campaign Background"
          fill
          style={{ objectFit: "cover" }}
          quality={100}
          priority
        />
      </div>

      <div className="relative z-10 container mx-auto p-4 pt-[270px]">
        <div className="flex justify-center w-full mb-6">
          <span className="inline-block w-[302px] relative text-[30px] tracking-[-0.02em] leading-[36px] capitalize text-white text-center">
            {customerData.campaign_name || customerData.customer_name} Campaign
          </span>
        </div>

        {/* Campaign Overview Card */}
        <div className="w-full relative backdrop-blur-[14px] rounded-[10px] bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] box-border p-4 mb-4">
          <div className="flex items-center gap-2.5">
            <Image
              src={customerData.logo_url || "/assets/SparkyIcon.png"}
              alt={customerData.customer_name}
              width={36}
              height={36}
            />
            <h2 className="text-white text-lg">
              Earn{" "}
              {customerData.tasks
                .reduce((sum, task) => sum + (task.rewards?.coins || 0), 0)
                .toLocaleString()}{" "}
              Coins
            </h2>
          </div>

          {customerData.campaign_details && (
            <div className="mt-4 mb-2">
              <p className="text-[#909090] font-bold text-sm">
                {customerData.campaign_details}
              </p>
            </div>
          )}

          <div className="relative mt-4">
            <div className="w-full relative rounded-[30px] bg-[#32363c] border-[0.5px] border-[rgba(85,85,85,0.75)] box-border h-3">
              <div
                className="relative rounded-[30px] bg-gradient-to-r from-[#fcf04f] via-[#fcc204] via-[28.6%] to-[#d74600] to-[75.37%] h-3"
                style={{
                  width: `${
                    (completedTasksCount / customerData.totalTasks) * 100
                  }%`,
                }}
              />
            </div>
            <Image
              src="/assets/TreasureBox.png"
              alt="Treasure Box"
              width={24}
              height={24}
              className="absolute -right-2.5 -top-[1px]"
            />
          </div>
          {/* customer campaign detail overview card*/}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1">
              <Image src="/assets/SparkyIcon.png" alt="Sparky" width={16} height={16} />
              <span className="text-xs text-[#909090] font-bold">
                {customerData.tasks
                  .filter((task) => completedTasks[task.id])
                  .reduce((sum, task) => sum + (task.rewards?.coins || 0), 0)
                  .toLocaleString()}
                /
                {customerData.tasks
                  .reduce((sum, task) => sum + (task.rewards?.coins || 0), 0)
                  .toLocaleString()}{" "}
                SPARK
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Image src="/assets/SpinIcon.png" alt="Spin" width={16} height={16} />
              <span className="text-xs text-[#909090] font-bold">
                {customerData.tasks
                  .filter((task) => completedTasks[task.id])
                  .reduce((sum, task) => sum + (task.rewards?.spins || 0), 0)}
                /
                {customerData.tasks.reduce(
                  (sum, task) => sum + (task.rewards?.spins || 0),
                  0
                )}{" "}
                SPIN
              </span>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="w-full relative backdrop-blur-[14px] rounded-[10px] bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] flex flex-col items-start justify-start p-5 gap-4">
          {customerData.tasks.map((task, index) => {
            const isCompleted = completedTasks[task.id];

            return (
              <React.Fragment key={task.id}>
                <div
                  className={`w-full p-2 ${
                    !isCompleted ? "cursor-pointer hover:bg-white/5" : ""
                  } rounded-lg transition-colors relative`}
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="grid grid-cols-[auto,1fr,auto] gap-4 items-center">
                    <div className="flex items-center">
                      <Image
                         src={platformIcons[task.platform] || "/assets/SparkyIcon.png"}
                        alt={task.platform}
                        width={32}
                        height={32}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-white">
                        {getTaskTitle(
                          task.platform,
                          customerData.customer_name
                        )}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <Image
                             src="/assets/SparkyIcon.png"
                            alt="Sparky"
                            width={16}
                            height={16}
                          />
                          <span className="text-xs text-[#909090] font-bold">
                            {(task.rewards?.coins || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Image
                            src="/assets/SpinIcon.png"
                            alt="Spin"
                            width={16}
                            height={16}
                          />
                          <span className="text-xs text-[#909090] font-bold">
                            +{task.rewards?.spins || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isCompleted && (
                      <div className="flex items-center justify-center">
                        <Image
                          src="/assets/TaskCompletedDiamond.png"
                          alt="Completed"
                          width={24}
                          height={24}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {index < customerData.tasks.length - 1 && (
                  <div className="w-full pt-2">
                    <hr className="border-t border-white/20" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Unlock Reward Section */}
        <div className="flex items-center justify-between w-full p-4 mb-4">
          <Image
            src="/assets/GoldDownArrows.png"
            alt="Gold Arrows"
            width={20}
            height={20}
            className="ml-4"
          />
          <div className="flex items-center gap-1 px-4 py-2 bg-[#3A1C09] rounded-lg w-[210px] h-[40px]">
            <Image src="/assets/RedStar.png" alt="Red Star" width={14} height={14} />
            <span className="text-[#909090] text-sm">Unlock your reward</span>
            <Image src="/assets/RedStar.png" alt="Red Star" width={14} height={14} />
          </div>
          <Image
            src="/assets/GoldDownArrows.png"
            alt="Gold Arrows"
            width={20}
            height={20}
            className="mr-4"
          />
        </div>

        {/* Treasure Chest Section */}
        <div className="w-full relative backdrop-blur-[14px] rounded-xl bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] flex flex-col items-start justify-start text-left text-lg text-white p-3 font-rounded-mplus font-bold mt-4">
          <div
            className={`flex items-center justify-between w-full ${
              completedTasksCount === customerData.totalTasks &&
              !isCampaignCompleted
                ? "cursor-pointer hover:opacity-80"
                : ""
            }`}
            onClick={() => {
              if (
                completedTasksCount === customerData.totalTasks &&
                !isCampaignCompleted
              ) {
                handleTreasureClick();
              }
            }}
          >
            <div className="flex items-center gap-2">
              <div className="bg-[#3A1C09] rounded-lg p-2">
                <Image
                  src="/assets/TreasureBox.png"
                  alt="Mystery Treasure"
                  width={32}
                  height={32}
                />
              </div>
              <div className="flex flex-col text-[#909090] text-sm">
                <span>The prize? A mystery! Complete the</span>
                <span>tasks for a surprise reward!</span>
              </div>
            </div>
            {isCampaignCompleted ? (
              <Image
                src="/assets/TaskCompletedDiamond.png"
                alt="All Tasks Completed"
                width={28}
                height={28}
              />
            ) : completedTasksCount === customerData.totalTasks ? null : (
              <Image src="/assets/LockedYellow.png" alt="Locked" width={32} height={32} />
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
        <CampaignTaskPopup
          isOpen={!!selectedTask}
          onClose={() => {
            setSelectedTask(null);
            checkCompletedTasks();
          }}
          task={{
            id: selectedTask.id,
            customerId: customerData.id,
            platform: selectedTask.platform,
            platform_name: selectedTask.platform_name,
            linkUrl: selectedTask.link_url,
            coins: selectedTask.rewards?.coins || 0,
            spins: selectedTask.rewards?.spins || 0,
            completed: completedTasks[selectedTask.id] || false,
            type: selectedTask.type || "LINK_VISITOR",
            taskType: "campaign",
          }}
          customerName={customerData.customer_name}
          onTaskComplete={handleTaskComplete}
          isSpecialTask={false}
        />
      )}

      <CampaignRewardPopup
        isOpen={isRewardPopupOpen || isRewardClaimPopupOpen}
        onClose={
          isRewardClaimPopupOpen
            ? handleClaimPopupClose
            : () => setIsRewardPopupOpen(false)
        }
        onClaimClick={
          isRewardClaimPopupOpen
            ? handleClaimPopupClose
            : handleRewardPopupClick
        }
        campaignSpark={campaignRewards.spark}
        campaignSpin={campaignRewards.spin}
      />
    </div>
  );
}
