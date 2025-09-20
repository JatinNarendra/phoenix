"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaRotate } from "react-icons/fa6";
import { FaCheckCircle, FaRegCircle, FaCoins } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  ServiceType,
  PlatformType,
  SpecialTask,
  CampaignTask,
} from "@/app/types/Customer";
import { getPlatformName } from "@/app/lib/platformUtils";
import { useGame } from "@/app/context/GameContext";
import { useWebApp } from "@/app/hooks/useWebApp";
import { useRouter } from "next/navigation";
import TaskPopup, { socialIcons } from "@/app/earn/components/TaskPopup";
import TaskCompletedDiamond from "../../../public/assets/Earn/TaskCompletedDiamond.png";
import Image from "next/image";

interface SocialTask {
  id: string;
  customerId: string;
  customerName: string;
  platform: PlatformType;
  linkUrl: string;
  isPrimary: boolean;
  isEnabled: boolean;
  clicks: number;
  type: ServiceType;
  coins: number;
  spins: number;
  completed: boolean;
  gradient: string;
  hoverGlow: string;
}

interface DatabaseResponse {
  id: string;
  customer_id: string;
  platform: PlatformType;
  link_url: string;
  is_primary: boolean;
  enabled: boolean;
  clicks: number;
  type: ServiceType;
  customers: {
    customer_name: string;
  } | null;
}

const gradients: Record<PlatformType, string> = {
  TELEGRAM_CHANNEL: "from-[#0088cc]/20 to-[#0088cc]/5",
  X: "from-white/20 to-white/5",
  YOUTUBE_VIEWS: "from-[#FF0000]/20 to-[#FF0000]/5",
  TELEGRAM_GROUP: "from-[#0088cc]/20 to-[#0088cc]/5",
  YOUTUBE_SUBSCRIBERS: "from-[#FF0000]/20 to-[#FF0000]/5",
};

const glows: Record<PlatformType, string> = {
  TELEGRAM_CHANNEL: "hover:shadow-[#0088cc]/20",
  X: "hover:shadow-white/20",
  YOUTUBE_VIEWS: "hover:shadow-[#FF0000]/20",
  TELEGRAM_GROUP: "hover:shadow-[#0088cc]/20",
  YOUTUBE_SUBSCRIBERS: "hover:shadow-[#FF0000]/20",
};

const SocialTasksPage = () => {
  const { gameState } = useGame();
  const [selectedTask, setSelectedTask] = useState<SocialTask | null>(null);
  const [tasks, setTasks] = useState<SocialTask[]>([]);
  const { instance: WebApp } = useWebApp(true);
  const router = useRouter();

  const fetchTasks = useCallback(async () => {
    if (!supabase) {
      console.error("Supabase client not available");
      return;
    }

    try {
      const { data: socialLinks, error } = await supabase
        .from("customer_social_links")
        .select(
          `
          *,
          customers (
            customer_name
          )
        `
        )
        .eq("enabled", true);

      if (error) throw error;

      const formatTaskData = (link: DatabaseResponse): SocialTask => ({
        id: link.id,
        customerId: link.customer_id,
        customerName: link.customers?.customer_name || "Unknown Customer",
        platform: link.platform,
        linkUrl: link.link_url,
        isPrimary: link.is_primary,
        isEnabled: link.enabled,
        clicks: link.clicks,
        type: link.type,
        coins: 3000,
        spins: 2,
        completed:
          gameState.socialTasks?.[link.platform]?.completedTasks?.includes(
            link.id
          ) || false,
        gradient: gradients[link.platform],
        hoverGlow: glows[link.platform],
      });

      const formattedTasks: SocialTask[] = (socialLinks as DatabaseResponse[])
        .filter(
          (link) =>
            link.platform &&
            link.enabled &&
            link.customers?.customer_name !== "Sparky"
        )
        .map(formatTaskData);

      setTasks(formattedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }, [gameState]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
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
    <main className="min-h-[100dvh] max-w-md mx-auto bg-[#0A0B1E]">
      <div className="p-4 h-[calc(100dvh-100px)] overflow-y-auto">
        {tasks.length > 0 && (
          <div className="space-y-4 pb-20">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={(e) => {
                  e.preventDefault();
                  if (!task.completed) {
                    setSelectedTask(task);
                  }
                }}
                className={`relative p-4 rounded-xl cursor-pointer transition-all duration-300
                  bg-gradient-to-br ${task.gradient} backdrop-blur-sm
                  border border-white/5
                  shadow-lg ${
                    task.hoverGlow
                  } hover:shadow-xl hover:-translate-y-0.5
                  ${task.completed ? "opacity-60" : "opacity-100"}`}
              >
                {task.completed && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <Image
                      src={TaskCompletedDiamond}
                      alt="Completed"
                      width={32}
                      height={32}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{socialIcons[task.platform]}</div>
                    <div>
                      <h3 className="font-semibold text-white">
                        Follow {task.customerName}
                      </h3>
                      <p className="text-sm text-white/70">
                        on {getPlatformName(task.platform)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <FaCoins className="text-yellow-400" />
                      <span className="text-white">
                        {task.coins.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FaRotate className="text-blue-400" />
                      <span className="text-white">{task.spins}</span>
                    </div>
                    {task.completed ? (
                      <FaCheckCircle className="text-xl text-green-400" />
                    ) : (
                      <FaRegCircle className="text-xl text-white/30" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/70 text-center">
              No social tasks available at the moment.
            </p>
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskPopup
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask as unknown as SpecialTask | CampaignTask}
          isSpecialTask={false}
        />
      )}
    </main>
  );
};

export default SocialTasksPage;
