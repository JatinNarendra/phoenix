import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useUser } from "@/app/hooks/useUser";
import { gameToast } from "@/app/utility/customToast";
import { PlatformType } from "@/app/types/Customer";
import SparkyIcon from "@/public/assets/SparkyIcon.png";
import SpinIcon from "@/public/assets/SpinIcon.png";
import Close from "@/public/assets/Close.png";
import TaskYoutubeIcon from "../../../public/assets/TaskYoutubeIcon.png";
import TaskTelegramIcon from "../../../public/assets/TaskTelegramIcon.png";
import TaskXIcon from "../../../public/assets/TaskXIcon.png";
import TaskCompletedDiamond from "../../../public/assets/TaskCompletedDiamond.png";
import { supabase } from "@/lib/supabase";

interface TaskCompletedProps {
  isOpen: boolean;
  onClose: () => void;
  sparkyValue: number;
  spinValue: number;
  taskId: string;
  platform: PlatformType;
  customerId?: string;
  customerName?: string;
}

const platformIcons = {
  TELEGRAM_CHANNEL: TaskTelegramIcon,
  TELEGRAM_GROUP: TaskTelegramIcon,
  X: TaskXIcon,
  YOUTUBE_VIEWS: TaskYoutubeIcon,
  YOUTUBE_SUBSCRIBERS: TaskYoutubeIcon,
};

const platformLabels = {
  TELEGRAM_CHANNEL: "Join Telegram Channel",
  TELEGRAM_GROUP: "Join Telegram Group",
  X: "Follow on X (Twitter)",
  YOUTUBE_VIEWS: "Watch on YouTube",
  YOUTUBE_SUBSCRIBERS: "Subscribe on YouTube",
};

const TaskCompletedPopup: React.FC<TaskCompletedProps> = ({
  isOpen,
  onClose,
  sparkyValue,
  spinValue,
  taskId,
  platform,
  customerName,
}) => {
  const { id: userId } = useUser();
  const [rewardsDisplayed, setRewardsDisplayed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const checkRewardStatus = async () => {
      if (!userId || !isOpen) return;

      if (!supabase) {
        console.error("Supabase client not available");
        return;
      }

      try {
        // Check if task is marked as verified
        const { data: completion } = await supabase
          .from("user_task_completions")
          .select("verification_status")
          .eq("user_id", userId.toString())
          .eq("task_id", taskId)
          .single();

        // If the task is verified and we haven't displayed rewards yet, show them
        if (
          completion?.verification_status === "verified" &&
          !rewardsDisplayed
        ) {
          // Display the rewards in UI only (actual update already happened in database)
          gameToast.success(
            `Earned ${sparkyValue.toLocaleString()} coins and ${spinValue} spins!`
          );
          setRewardsDisplayed(true);
        }
      } catch (error) {
        console.error("Error checking task status:", error);
      }
    };

    checkRewardStatus();
  }, [isOpen, userId, taskId, sparkyValue, spinValue, rewardsDisplayed]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setIsAnimating(false);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleCloseWithAnimation = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`fixed inset-0 backdrop-blur-[14px] bg-black/50 z-40 transition-all duration-500 ${
          isAnimating ? "opacity-0" : "opacity-100"
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCloseWithAnimation();
          }
        }}
      />
      <div
        className={`fixed inset-x-0 bottom-0 transform transition-all duration-500 max-w-md mx-auto z-50 ${
          isAnimating ? "opacity-0 translate-y-full" : "opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border h-[500px]">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />
          <div className="relative h-full flex flex-col px-6 py-4">
            <div className="flex justify-end mb-2">
              <button
                onClick={handleCloseWithAnimation}
                className="text-gray-400 hover:text-white"
              >
                <Image src={Close} alt="Close" width={32} height={32} />
              </button>
            </div>

            <div className="flex flex-col items-center">
              {/* Platform Icon */}
              <Image
                src={platformIcons[platform]}
                alt="Platform"
                width={90}
                height={60}
                priority
              />

              {/* Rewards Section */}
              <div className="flex justify-center gap-2 w-full mb-10 mt-6">
                {/* Sparky Reward Container */}
                <div className="relative w-auto">
                  <div className="relative backdrop-blur-[14px] bg-black rounded-[12px] border border-[#E29029]/30 flex items-center justify-center px-4 py-3">
                    <div className="flex items-center gap-2 ">
                      <Image
                        src={SparkyIcon}
                        alt="Sparky"
                        width={18}
                        height={18}
                      />
                      <span className="text-[#E18700] text-[14px] font-medium">
                        +{sparkyValue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Spin Reward Container */}
                <div className="relative w-auto">
                  <div className="relative backdrop-blur-[14px] bg-black rounded-[12px] border border-[#E29029]/30 flex items-center justify-center px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Image src={SpinIcon} alt="Spin" width={18} height={18} />
                      <span className="text-[#E18700] text-[14px] font-medium">
                        +{spinValue}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Title */}
            <div className="text-center space-y-10 ">
              <h2 className="text-white text-md font-bold">
                Checkout the official <br /> announcement
              </h2>
              <h2 className="text-[#E18700] text-sm font-bold underline mb-4">
                {platformLabels[platform]}
              </h2>
              <div>
                <div className="w-full max-w-[280px] h-[1px] bg-white/10 mx-auto mt-4" />

                {/* Success Message */}
                <div className="flex items-center gap-2 px-2 mt-4">
                  <Image
                    src={TaskCompletedDiamond}
                    alt="Success"
                    width={24}
                    height={24}
                  />
                  <span className="text-[#909090] text-sm">
                    {customerName
                      ? "Task Completed! Your coin reward has been paid out!"
                      : "Task Completed! Your coin reward has been paid out!"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskCompletedPopup;
