"use client";
import React, { useEffect, useState } from "react";
import { FaChevronRight } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useWebApp } from "../hooks/useWebApp";
import CoinsAndSpin from "../components/CoinsAndSpin";
import Image from "next/image";
import TaskTelegram from "../../public/assets/TaskTelegramIcon.png";
import TaskYoutube from "../../public/assets/TaskYoutubeIcon.png";
import TaskX from "../../public/assets/TaskXIcon.png";
import SparkyIcon from "../../public/assets/SparkyIcon.png";
import { supabase } from "@/lib/supabase";
import {
  PlatformType,
  ServiceType,
  SpecialTask,
  CampaignTask,
} from "@/app/types/Customer";
import SpinIcon from "../../public/assets/SpinIcon.png";
import { getPlatformName } from "../lib/platformUtils";
import SpecialTaskPopup from "./components/TaskPopup";
import TaskCompletedDiamond from "../../public/assets/TaskCompletedDiamond.png";
import WelcomeToEarnPopup from "./components/welcometoearnpopup";
import { useEarnPageVisit } from "../hooks/useEarnPageVisit";
import { useUser } from "@/app/hooks/useUser";
import TreasureBox from "../../public/assets/TreasureBox.png";
import DailyRewardTimer from "./components/DailyRewardTimer";
import CampaignIconBackground from "../../public/assets/Earn/campaignicongb.png";

const platformIcons = {
  TELEGRAM_CHANNEL: TaskTelegram.src,
  TELEGRAM_GROUP: TaskTelegram.src,
  X: TaskX.src,
  YOUTUBE_VIEWS: TaskYoutube.src,
  YOUTUBE_SUBSCRIBERS: TaskYoutube.src,
  YOUTUBE: TaskYoutube.src,
  TELEGRAM: TaskTelegram.src,
};

const getGradientForPlatform = (platform: PlatformType): string => {
  switch (platform) {
    case "TELEGRAM_CHANNEL":
    case "TELEGRAM_GROUP":
      return "linear-gradient(90deg, #27A7E7 0%, #1F76B3 100%)";
    case "X":
      return "linear-gradient(90deg, #1DA1F2 0%, #0C85D0 100%)";
    case "YOUTUBE_VIEWS":
    case "YOUTUBE_SUBSCRIBERS":
      return "linear-gradient(90deg, #FF0000 0%, #CC0000 100%)";
    default:
      return "linear-gradient(90deg, #E18700 0%, #D74600 100%)";
  }
};

const getGlowForPlatform = (platform: PlatformType): string => {
  switch (platform) {
    case "TELEGRAM_CHANNEL":
    case "TELEGRAM_GROUP":
      return "0px 0px 20px rgba(39, 167, 231, 0.3)";
    case "X":
      return "0px 0px 20px rgba(29, 161, 242, 0.3)";
    case "YOUTUBE_VIEWS":
    case "YOUTUBE_SUBSCRIBERS":
      return "0px 0px 20px rgba(255, 0, 0, 0.3)";
    default:
      return "0px 0px 20px rgba(225, 135, 0, 0.3)";
  }
};

interface TaskWithRewards {
  id: string;
  platform: PlatformType;
  rewards?: {
    coins?: number;
    spins?: number;
  };
  type?: ServiceType;
  link_url: string;
  enabled: boolean;
}

interface CustomerCampaign {
  id: string;
  customer_name: string;
  campaign_name?: string;
  logo_url: string | null;
  tasks: TaskWithRewards[];
  totalCoins: number;
  totalSpins: number;
  completedTasks: number;
  totalTasks: number;
  totalEarnedCoins: number;
  totalAvailableCoins: number;
  totalEarnedSpins: number;
  totalAvailableSpins: number;
  isCampaignCompleted?: boolean;
}

const formatTaskTitle = (platform: PlatformType) => {
  switch (platform) {
    case "X":
      return "Follow us on X(Twitter)";
    case "TELEGRAM_GROUP":
      return "Join us on our Telegram group";
    case "YOUTUBE_VIEWS":
    case "YOUTUBE_SUBSCRIBERS":
      return "Subscribe to Youtube";
    default:
      return getPlatformName(platform);
  }
};

export default function EarnPage() {
  const router = useRouter();
  const { instance: WebApp } = useWebApp(true);
  const [tasks, setTasks] = useState<SpecialTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<SpecialTask | null>(null);
  const { showWelcome, handleCloseWelcome } = useEarnPageVisit();
  const [nonSparkyCustomers, setNonSparkyCustomers] = useState<
    CustomerCampaign[]
  >([]);
  const { id: userId } = useUser();
  const [totalCompletedTasks, setTotalCompletedTasks] = useState(0);

  // Loading states
  const [loadingSpecialTasks, setLoadingSpecialTasks] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Only show one spinner if either is loading
  const isLoading = loadingSpecialTasks || loadingCampaigns;

  useEffect(() => {
    const fetchTasks = async () => {
      // Skip if no user ID is available
      if (!userId) return;

      if (!supabase) {
        console.error("Supabase client not available");
        return;
      }

      setLoadingSpecialTasks(true);
      try {
        // First get all completed tasks for the user
        const { data: completedTasksData } = await supabase
          .from("user_task_completions")
          .select("task_id")
          .eq("user_id", userId.toString());

        const completedTaskIds = new Set(
          (completedTasksData || []).map((task) => task.task_id)
        );

        const { data: links } = await supabase
          .from("customer_social_links")
          .select("*")
          .eq("customer_name", "Sparky")
          .eq("enabled", true);

        if (links) {
          const mappedTasks = links.map((link) => ({
            id: link.id,
            customerId: link.customer_id,
            customerName: link.customer_name,
            platform: link.platform as PlatformType,
            platform_name: getPlatformName(link.platform as PlatformType),
            linkUrl: link.link_url,
            isPrimary: link.is_primary || false,
            isEnabled: link.enabled,
            clicks: link.clicks,
            type: link.type as ServiceType,
            coins: link.rewards?.coins || 0,
            spins: link.rewards?.spins || 0,
            completed: completedTaskIds.has(link.id),
            gradient: getGradientForPlatform(link.platform as PlatformType),
            hoverGlow: getGlowForPlatform(link.platform as PlatformType),
          }));
          setTasks(mappedTasks);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoadingSpecialTasks(false);
      }
    };

    if (userId) {
      fetchTasks();
    }
    // Remove gameState from dependency if not strictly needed for task fetching
  }, [userId]);

  useEffect(() => {
    const fetchNonSparkyCustomers = async () => {
      // Skip if no user ID is available
      if (!userId) return;

      if (!supabase) {
        console.error("Supabase client not available");
        return;
      }

      setLoadingCampaigns(true);
      try {
        // Fetch all non-Sparky customers
        const { data: customers, error: customersError } = await supabase
          .from("customers")
          .select(
            `
            id,
            customer_name,
            campaign_name,
            logo_url,
            campaign_completed_by,
            customer_social_links (
              id,
              platform,
              link_url,
              enabled,
              rewards
            )
          `
          )
          .neq("customer_name", "Sparky");

        if (customersError) throw customersError;

        if (!customers) return;

        // First, get all completed tasks for the user
        const { data: completedTasksData } = await supabase
          .from("user_task_completions")
          .select("task_id")
          .eq("user_id", userId.toString());

        const completedTaskIds = new Set(
          (completedTasksData || []).map((task) => task.task_id)
        );

        const mappedCustomers = customers.map(
          ({
            id,
            customer_name,
            campaign_name,
            logo_url,
            customer_social_links,
            campaign_completed_by,
          }) => {
            const tasks = customer_social_links || ([] as TaskWithRewards[]);

            // Calculate total available rewards
            const totalAvailableCoins = tasks.reduce(
              (sum: number, task: TaskWithRewards) =>
                sum + (task.rewards?.coins || 0),
              0
            );
            const totalAvailableSpins = tasks.reduce(
              (sum: number, task: TaskWithRewards) =>
                sum + (task.rewards?.spins || 0),
              0
            );

            // Calculate completed tasks count using the Set of completed task IDs
            const completedTasksList = tasks.filter((task) =>
              completedTaskIds.has(task.id)
            );
            const completedTasks = completedTasksList.length;

            // Calculate earned rewards based on completed tasks
            const totalEarnedCoins = completedTasksList.reduce(
              (sum: number, task: TaskWithRewards) =>
                sum + (task.rewards?.coins || 0),
              0
            );

            const totalEarnedSpins = completedTasksList.reduce(
              (sum: number, task: TaskWithRewards) =>
                sum + (task.rewards?.spins || 0),
              0
            );

            // Check if user has completed this campaign
            const isCampaignCompleted =
              campaign_completed_by?.includes(userId.toString()) || false;

            return {
              id,
              customer_name,
              campaign_name,
              logo_url,
              tasks,
              totalCoins: totalAvailableCoins,
              totalSpins: totalAvailableSpins,
              completedTasks,
              totalTasks: tasks.length,
              totalEarnedCoins,
              totalAvailableCoins,
              totalEarnedSpins,
              totalAvailableSpins,
              isCampaignCompleted,
            };
          }
        );

        // Filter out completed campaigns from the main view
        const activeCampaigns = mappedCustomers.filter(
          (customer) => !customer.isCampaignCompleted
        ) as CustomerCampaign[];

        setNonSparkyCustomers(activeCampaigns);

        // Remove total completed tasks calculation since we now handle it in a separate useEffect
      } catch (error) {
        console.error("Error fetching non-Sparky customers:", error);
      } finally {
        setLoadingCampaigns(false);
      }
    };

    fetchNonSparkyCustomers();
    // Remove 'tasks' from dependency array to avoid re-fetching on each task change
  }, [userId]);

  // Add a separate effect to update total completed tasks when either tasks or nonSparkyCustomers change
  useEffect(() => {
    const calculateArchiveCount = async () => {
      if (!userId) return;

      if (!supabase) {
        console.error("Supabase client not available");
        return;
      }

      try {
        // Calculate completed special tasks
        const sparkyCompleted = tasks.filter((task) => task.completed).length;

        // Calculate completed campaign tasks
        const nonSparkyCompleted = nonSparkyCustomers.reduce(
          (sum, customer) => sum + customer.completedTasks,
          0
        );

        // Calculate completed campaigns count
        const { data: completedCampaignsData } = await supabase
          .from("customers")
          .select("campaign_completed_by")
          .neq("customer_name", "Sparky")
          .not("campaign_completed_by", "is", null);

        const completedCampaignsCount =
          completedCampaignsData?.filter((customer) =>
            customer.campaign_completed_by?.includes(userId.toString())
          ).length || 0;

        // Total archive count = completed special tasks + completed campaign tasks + completed campaigns
        setTotalCompletedTasks(
          sparkyCompleted + nonSparkyCompleted + completedCampaignsCount
        );
      } catch (error) {
        console.error("Error calculating archive count:", error);
      }
    };

    calculateArchiveCount();
  }, [tasks, nonSparkyCustomers, userId]);

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

  return (
    <main className="min-h-[100dvh] max-w-md mx-auto bg-black rounded-mplus overflow-y-auto relative">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <div className="container mx-auto p-4">
        <CoinsAndSpin />
        <h1 className="text-[#E18700] text-xl font-bold my-5">Daily Rewards</h1>
        <DailyRewardTimer />
        {/* Special Tasks Section - Only show if there are Sparky tasks */}
        {tasks && tasks.length > 0 && (
          <div>
            <h1 className="text-[#E18700] text-xl font-bold my-4">
              Special Tasks
            </h1>
            <div className="relative">
              <div className="w-full relative backdrop-blur-[14px] rounded-xl bg-[#291818]/70 border border-white/10 flex flex-col items-start justify-start text-left text-lg text-white p-4 font-rounded-mplus font-bold">
                <div className="space-y-4 w-full">
                  {tasks.map((task: SpecialTask, index: number) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between cursor-pointer relative ${
                        index < tasks.length - 1
                          ? "border-b border-white/10 pb-4"
                          : ""
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedTask(task);
                      }}
                    >
                      <div className="w-10">
                        <Image
                          src={
                            platformIcons[
                              task.platform as keyof typeof platformIcons
                            ]
                          }
                          alt={task.platform}
                          width={32}
                          height={32}
                        />
                      </div>
                      <div className="flex-1 pl-4">
                        <h3 className="text-white">
                          {formatTaskTitle(task.platform)}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <Image
                            src={SparkyIcon}
                            alt="Sparky"
                            width={20}
                            height={20}
                          />
                          <span className="text-[#E18700]">
                            {task.coins.toLocaleString()}
                          </span>
                          <Image
                            src={SpinIcon}
                            alt="Spins"
                            width={20}
                            height={20}
                            style={{ objectFit: "contain" }}
                          />
                          <span className="text-[#E18700]">
                            +{task.spins.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {task.completed && (
                        <div className="flex-shrink-0 ml-2">
                          <Image
                            src={TaskCompletedDiamond}
                            alt="Task Completed"
                            width={20}
                            height={20}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Archive Link - Show when there are completed items but no active campaigns */}
        {nonSparkyCustomers.length === 0 && totalCompletedTasks > 0 && (
          <div className="flex justify-end items-center my-4">
            <span
              className="text-[#E18700] text-sm font-bold underline cursor-pointer hover:text-gray-300 transition-colors"
              onClick={() => router.push("/earn/archived-tasks")}
            >
              View Archive ({totalCompletedTasks})
            </span>
          </div>
        )}

        {/* Campaigns Section - Only show if there are campaigns */}
        {nonSparkyCustomers.length > 0 && (
          <div>
            <div className="flex justify-between items-center">
              <h1 className="text-[#E18700] text-xl font-bold my-4">
                Campaigns
              </h1>
              <span
                className="text-[#E18700] text-sm font-bold underline cursor-pointer hover:text-gray-300 transition-colors"
                onClick={() => router.push("/earn/archived-tasks")}
              >
                View Archive ({totalCompletedTasks})
              </span>
            </div>
            {nonSparkyCustomers.map((customer) => (
              <div
                key={customer.id}
                className="relative pb-2"
                onClick={() =>
                  router.push(`/earn/campaigns/${customer.customer_name}`)
                }
              >
                <div className="w-full relative backdrop-blur-[14px] rounded-xl bg-[#291818]/70 border border-white/10 cursor-pointer">
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          {/* Background image behind the logo */}
                          <Image
                            src={CampaignIconBackground}
                            alt="Logo Background"
                            fill
                            className="absolute inset-0 rounded-full object-cover z-0"
                            style={{ zIndex: 0 }}
                          />
                          <Image
                            src={customer.logo_url || ""}
                            alt={customer.customer_name}
                            width={30}
                            height={30}
                            className="rounded-full relative z-10"
                            style={{ zIndex: 1 }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-bold">
                            {customer.campaign_name || customer.customer_name}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {customer.totalTasks} tasks
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaChevronRight className="text-white w-4 h-4" />
                      </div>
                    </div>
                    <div className="absolute left-0 right-0 h-[1px] bg-white/10 my-4 mt-4"></div>
                    <div className="mt-10">
                      <div className="flex items-center justify-between">
                        <div className="w-full">
                          <div className="h-2 bg-gray-700 rounded-full">
                            <div
                              className="h-2 bg-[#E18700] rounded-full"
                              style={{
                                width: `${
                                  (customer.completedTasks /
                                    customer.totalTasks) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                        <Image
                          src={TreasureBox}
                          alt="TreasureBox"
                          width={24}
                          height={24}
                          className="absolute right-2"
                        />
                      </div>
                      {/* customer campaign card*/}
                      <div className="flex items-center gap-2.5 mt-2">
                        <div className="flex items-center gap-1">
                          <Image
                            src={SparkyIcon}
                            alt="Sparky"
                            width={16}
                            height={16}
                          />
                          <span className="text-[#909090] text-sm font-bold">
                            {customer.totalEarnedCoins.toLocaleString()}/
                            {customer.totalAvailableCoins.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Image
                            src={SpinIcon}
                            alt="Spins"
                            width={16}
                            height={16}
                          />
                          <span className="text-[#909090] text-sm font-bold">
                            {customer.totalEarnedSpins}/
                            {customer.totalAvailableSpins}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTask && (
          <SpecialTaskPopup
            isOpen={true}
            onClose={() => setSelectedTask(null)}
            customerName={selectedTask.customerName}
            onTaskComplete={() => {}}
            isSpecialTask={true}
            task={selectedTask as SpecialTask | CampaignTask}
          />
        )}

        {showWelcome && (
          <WelcomeToEarnPopup
            isOpen={showWelcome}
            onClose={handleCloseWelcome}
          />
        )}
      </div>
    </main>
  );
}
