"use client";
import React, { useState, useEffect } from "react";
import { useWebApp } from "@/app/hooks/useWebApp";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TaskTelegram from "@/public/assets/TaskTelegramIcon.png";
import TaskYoutube from "@/public/assets/TaskYoutubeIcon.png";
import TaskX from "@/public/assets/TaskXIcon.png";
import SparkyIcon from "@/public/assets/SparkyIcon.png";
import SpinIcon from "@/public/assets/SpinIcon.png";
import TaskCompletedDiamond from "@/public/assets/TaskCompletedDiamond.png";
import { PlatformType } from "@/app/types/Customer";
import SparkyCampaignBG from "@/public/assets/SparkyCampaign/SparkyCampaignBG.png";
import { gameToast } from "@/app/utility/customToast";
import { useUser } from "@/app/hooks/useUser";
import { supabase } from "@/lib/supabase";

const platformIcons = {
  TELEGRAM_CHANNEL: TaskTelegram.src,
  TELEGRAM_GROUP: TaskTelegram.src,
  X: TaskX.src,
  YOUTUBE_VIEWS: TaskYoutube.src,
  YOUTUBE_SUBSCRIBERS: TaskYoutube.src,
  YOUTUBE: TaskYoutube.src,
  TELEGRAM: TaskTelegram.src,
};

const getTaskTitle = (platform: string, customerName: string) => {
  switch (platform) {
    case "X":
      return `Follow ${customerName} on X(Twitter)`;
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

interface CompletedTask {
  id: string;
  platform: PlatformType;
  customer_name: string;
  link_url: string;
  rewards: {
    coins: number;
    spins: number;
  };
  completed_at: string;
}

interface CompletedCampaign {
  id: string;
  customer_name: string;
  campaign_name?: string;
  logo_url: string | null;
  completed_at: string;
  totalCoins: number;
  totalSpins: number;
}

interface SupabaseResponse {
  task_id: string;
  completed_at: string;
  customer_social_links: {
    id: string;
    platform: PlatformType;
    link_url: string;
    rewards: {
      coins: number;
      spins: number;
    };
    customer_id: string;
    customers: {
      customer_name: string;
    };
  };
}

export default function ArchivedTasksPage() {
  const router = useRouter();
  const { instance: WebApp } = useWebApp(true);
  const { id: userId } = useUser();
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [completedCampaigns, setCompletedCampaigns] = useState<
    CompletedCampaign[]
  >([]);

  const fetchCompletedTasks = React.useCallback(async () => {
    if (!userId) return;

    if (!supabase) {
      console.error("Supabase client not available");
      return;
    }

    try {
      const { data: completions, error: completionsError } = await supabase
        .from("user_task_completions")
        .select(
          `
          task_id,
          completed_at,
          customer_social_links!inner (
            id,
            platform,
            link_url,
            rewards,
            customer_id,
            customers!inner (
              customer_name
            )
          )
        `
        )
        .eq("user_id", userId.toString())
        .eq("verification_status", "verified")
        .order("completed_at", { ascending: false });

      if (completionsError) throw completionsError;

      if (!completions) return;

      const formattedTasks = (completions as unknown as SupabaseResponse[])
        .filter((completion) => completion.customer_social_links)
        .map((completion) => ({
          id: completion.customer_social_links.id,
          platform: completion.customer_social_links.platform,
          customer_name:
            completion.customer_social_links.customers.customer_name,
          link_url: completion.customer_social_links.link_url,
          rewards: completion.customer_social_links.rewards,
          completed_at: completion.completed_at,
        }));

      setCompletedTasks(formattedTasks);
    } catch (error) {
      console.error("Error fetching completed tasks:", error);
      gameToast.error("Failed to load completed tasks");
    }
  }, [userId]);

  const fetchCompletedCampaigns = React.useCallback(async () => {
    if (!userId) return;

    if (!supabase) {
      console.error("Supabase client not available");
      return;
    }

    try {
      const { data: campaigns, error: campaignsError } = await supabase
        .from("customers")
        .select(
          `
          id,
          customer_name,
          campaign_name,
          logo_url,
          campaign_completed_by,
          customer_social_links (
            rewards
          )
        `
        )
        .neq("customer_name", "Sparky")
        .not("campaign_completed_by", "is", null);

      if (campaignsError) throw campaignsError;

      if (!campaigns) return;

      const userCompletedCampaigns = campaigns
        .filter((campaign) =>
          campaign.campaign_completed_by?.includes(userId.toString())
        )
        .map((campaign) => {
          const tasks = campaign.customer_social_links || [];
          const totalCoins = tasks.reduce(
            (sum: number, task: any) => sum + (task.rewards?.coins || 0),
            0
          );
          const totalSpins = tasks.reduce(
            (sum: number, task: any) => sum + (task.rewards?.spins || 0),
            0
          );

          return {
            id: campaign.id,
            customer_name: campaign.customer_name,
            campaign_name: campaign.campaign_name,
            logo_url: campaign.logo_url,
            completed_at: new Date().toISOString(), // We'll need to track this properly in the future
            totalCoins,
            totalSpins,
          };
        });

      setCompletedCampaigns(userCompletedCampaigns);
    } catch (error) {
      console.error("Error fetching completed campaigns:", error);
      gameToast.error("Failed to load completed campaigns");
    }
  }, [userId]);

  useEffect(() => {
    fetchCompletedTasks();
    fetchCompletedCampaigns();
  }, [fetchCompletedTasks, fetchCompletedCampaigns]);

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
          src={SparkyCampaignBG}
          alt="Campaign Background"
          fill
          style={{ objectFit: "cover" }}
          quality={100}
          priority
        />
      </div>

      <div className="relative z-10 container mx-auto p-4 pt-[300px]">
        <div className="flex justify-center w-full mb-6">
          <span className="inline-block w-[302px] relative text-[30px] tracking-[-0.02em] leading-[36px] capitalize text-white text-center">
            Archive
          </span>
        </div>

        {/* Tasks List */}
        <div className="w-full relative backdrop-blur-[14px] rounded-[10px] bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] flex flex-col items-start justify-start p-5 gap-4">
          {/* Completed Campaigns */}
          {completedCampaigns.map((campaign, index) => (
            <React.Fragment key={`campaign-${campaign.id}`}>
              <div className="w-full p-2 rounded-lg transition-colors">
                <div className="grid grid-cols-[auto,1fr,auto] gap-4 items-center">
                  <div className="flex items-center">
                    <Image
                      src={campaign.logo_url || SparkyIcon}
                      alt={campaign.customer_name}
                      width={32}
                      height={32}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-white font-bold">
                      {campaign.campaign_name || campaign.customer_name}{" "}
                      Campaign
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Image
                          src={SparkyIcon}
                          alt="Sparky"
                          width={16}
                          height={16}
                        />
                        <span className="text-xs text-[#909090] font-bold">
                          {campaign.totalCoins.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Image
                          src={SpinIcon}
                          alt="Spin"
                          width={16}
                          height={16}
                          style={{ objectFit: "contain" }}
                        />
                        <span className="text-xs text-[#909090] font-bold">
                          +{campaign.totalSpins}
                        </span>
                      </div>
                      <div className="text-xs text-[#909090] ml-2 font-bold">
                        Campaign Completed
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Image
                      src={TaskCompletedDiamond}
                      alt="Completed"
                      width={24}
                      height={24}
                    />
                  </div>
                </div>
              </div>
              {(index < completedCampaigns.length - 1 ||
                completedTasks.length > 0) && (
                <div className="w-full pt-2">
                  <hr className="border-t border-white/20" />
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Completed Tasks */}
          {completedTasks.map((task, index) => (
            <React.Fragment key={task.id}>
              <div className="w-full p-2 rounded-lg transition-colors">
                <div className="grid grid-cols-[auto,1fr,auto] gap-4 items-center">
                  <div className="flex items-center">
                    <Image
                      src={platformIcons[task.platform] || SparkyIcon}
                      alt={task.platform}
                      width={32}
                      height={32}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-white">
                      {getTaskTitle(task.platform, task.customer_name)}
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Image
                          src={SparkyIcon}
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
                          src={SpinIcon}
                          alt="Spin"
                          width={16}
                          height={16}
                          style={{ objectFit: "contain" }}
                        />
                        <span className="text-xs text-[#909090] font-bold">
                          +{task.rewards?.spins || 0}
                        </span>
                      </div>
                      <div className="text-xs text-[#909090] ml-2 font-bold">
                        {new Date(task.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Image
                      src={TaskCompletedDiamond}
                      alt="Completed"
                      width={24}
                      height={24}
                    />
                  </div>
                </div>
              </div>
              {index < completedTasks.length - 1 && (
                <div className="w-full pt-2">
                  <hr className="border-t border-white/20" />
                </div>
              )}
            </React.Fragment>
          ))}

          {completedTasks.length === 0 && completedCampaigns.length === 0 && (
            <div className="w-full text-center text-white/60 py-8">
              No completed tasks or campaigns yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
