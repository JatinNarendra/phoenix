import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { PlatformType, SpecialTask, CampaignTask } from "@/app/types/Customer";




import { useGame } from "@/app/context/GameContext";
import { useUser } from "@/app/hooks/useUser";
import { gameToast } from "@/app/utility/customToast";











import PenaltyWarningPopup from "./penaltywarningpopup";
import { supabase } from "@/lib/supabase";
import { markTaskAsCompleted } from "@/app/lib/taskCompletionUtils";
import { getPlatformBaseUrl } from "@/app/lib/platformUtils";
import { useWebApp } from "@/app/hooks/useWebApp";
import TaskCompletedPopup from "./taskcompletedPopup";

interface TaskPopupProps {
  isOpen: boolean;
  onClose: () => void;
  task: SpecialTask | CampaignTask;
  customerName?: string;
  onTaskComplete?: () => void;
  isSpecialTask?: boolean;
}

const formatTaskTitle = (platform: PlatformType, customerName?: string) => {
  const name = customerName ? `${customerName}'s ` : "";
  switch (platform) {
    case "X":
      return "Follow us on X(Twitter)";
    case "TELEGRAM_GROUP":
      return `Join ${name}Telegram group`;
    case "TELEGRAM_CHANNEL":
      return `Join ${name}Telegram channel`;
    case "YOUTUBE_VIEWS":
    case "YOUTUBE_SUBSCRIBERS":
      return `Subscribe to ${name}Youtube`;
    default:
      return platform;
  }
};

const platformIcons = {
  TELEGRAM_CHANNEL: "/assets/Earn/bi_telegram.png",
  TELEGRAM_GROUP: "/assets/Earn/bi_telegram.png",
  X: "/assets/Earn/bi_twitter.png",
  X_RETWEET: "/assets/Earn/bi_twitter.png",
  YOUTUBE_VIEWS: "/assets/Earn/bi_youtube.png",
  YOUTUBE_SUBSCRIBERS: "/assets/Earn/bi_youtube.png",
  DISCORD: "/assets/discordicon.png",
};

const platformLabels = {
  TELEGRAM_CHANNEL: "Visit Telegram",
  TELEGRAM_GROUP: "Visit Telegram",
  X: "Visit X (Twitter)",
  YOUTUBE_VIEWS: "Subscribe to Youtube",
  YOUTUBE_SUBSCRIBERS: "Subscribe to Youtube",
  DISCORD: "Visit Discord",
  X_RETWEET: "Visit X (Twitter)",
};

export const socialIcons: Record<PlatformType, React.ReactNode> = {
  TELEGRAM_CHANNEL: (
    <Image src="/assets/TaskTelegramIcon.png" alt="Telegram" width={90} height={90} />
  ),
  X: <Image src="/assets/TaskXIcon.png" alt="X" width={90} height={90} />,
  X_RETWEET: <Image src="/assets/TaskXIcon.png" alt="X Retweet" width={90} height={90} />,
  YOUTUBE_VIEWS: (
    <Image src="/assets/TaskYoutubeIcon.png" alt="YouTube" width={90} height={90} />
  ),
  TELEGRAM_GROUP: (
    <Image src="/assets/TaskTelegramIcon.png" alt="Telegram" width={90} height={90} />
  ),
  YOUTUBE_SUBSCRIBERS: (
    <Image src="/assets/TaskYoutubeIcon.png" alt="YouTube" width={90} height={90} />
  ),
  DISCORD: <Image src="/assets/discordicon.png" alt="Discord" width={90} height={90} />,
};

const TaskPopup: React.FC<TaskPopupProps> = ({
  isOpen,
  onClose,
  task,
  customerName,
  onTaskComplete,
}) => {
  const { persistState } = useGame();
  const { id: userId } = useUser();
  const { instance: WebApp } = useWebApp(true);
  const [hasClicked, setHasClicked] = useState(false);
  const [timerComplete, setTimerComplete] = useState(false);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "PENDING" | "COMPLETED" | "FAILED" | null
  >(null);
  const [isPenaltyWarningOpen, setIsPenaltyWarningOpen] = useState(false);
  const [isTaskCompletedOpen, setIsTaskCompletedOpen] = useState(false);
  const displayCustomerName = customerName;

  // Format the task URL with proper base URL if needed
  const taskUrl = useMemo(() => {
    const baseUrl = getPlatformBaseUrl(task.platform);
    // Use the appropriate URL property with type assertion
    const rawUrl =
      (task as { link_url?: string }).link_url || task.linkUrl || "";
    const trimmedUrl = rawUrl.trim();

    // If URL already starts with http/https, use it as is
    if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
      return trimmedUrl;
    }

    // If URL is empty, return empty string (instead of null)
    if (!trimmedUrl) {
      console.warn("Task URL is empty:", {
        taskId: task.id,
        platform: task.platform,
        url: trimmedUrl,
      });
      return "";
    }

    // Remove any leading slashes or @ symbols
    const cleanUrl = trimmedUrl.replace(/^[/@]+/, "");

    // Combine base URL with cleaned URL
    return `${baseUrl}${cleanUrl}`;
  }, [task]);

  // Log any URL issues for debugging
  useEffect(() => {
    if (!taskUrl) {
      console.warn("Task URL is missing or invalid:", {
        taskId: task.id,
        platform: task.platform,
        url: (task as { link_url?: string }).link_url || task.linkUrl,
      });
    }
  }, [taskUrl, task]);

  // Reset states when popup opens
  useEffect(() => {
    if (isOpen) {
      setHasClicked(false);
      setTimerComplete(false);

      // Check for existing pending task when popup opens
      if (userId && supabase) {
        supabase
          .from("user_task_completions")
          .select("verification_status, updated_at")
          .eq("user_id", userId.toString())
          .eq("task_id", task.id)
          .single()
          .then(({ data }) => {
            if (data?.verification_status === "pending") {
              // For pending tasks, check if 30 seconds have passed since last update
              const lastUpdateTime = new Date(data.updated_at).getTime();
              const currentTime = new Date().getTime();
              const timeDifference = currentTime - lastUpdateTime;

              if (timeDifference >= 30000) {
                // If 30 seconds have passed, enable check button
                setHasClicked(true);
                setTimerComplete(true);
              } else {
                // If 30 seconds haven't passed, start timer from remaining time
                setHasClicked(true);
                setTimerComplete(false);
              }
            }
          });
      }
    }
  }, [isOpen, userId, task.id]);

  // Add timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (hasClicked) {
      console.log("Starting 30 second timer...", {
        hasClicked,
        taskId: task.id,
      });
      setTimerComplete(false); // Reset timer state when starting

      timer = setTimeout(() => {
        console.log("Timer complete, enabling check button", {
          taskId: task.id,
        });
        setTimerComplete(true);
      }, 30000); // 30 seconds
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [hasClicked, task.id]);

  const handleVisitLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId || userId === 0) {
      gameToast.error("Please login to complete tasks");
      return;
    }

    if (!supabase) {
      gameToast.error("Database connection not available");
      return;
    }

    try {
      // Log task data for debugging
      console.log("Task data:", {
        taskId: task.id,
        platform: task.platform,
        userId: userId,
        taskUrl: taskUrl,
      });

      if (!taskUrl) {
        gameToast.error("Task URL is missing. Please contact support.");
        return;
      }

      // Record the click in customer_social_links table
      try {
        console.log("Recording click for user:", userId.toString());
        const { data: socialLinkData, error: socialLinkError } = await supabase
          .from("customer_social_links")
          .select("id, clicks")
          .eq("platform", task.platform)
          .eq("customer_id", task.customerId)
          .single();

        if (socialLinkError && socialLinkError.code !== "PGRST116") {
          console.error("Error finding social link:", socialLinkError);
        } else if (socialLinkData) {
          // Prepare the clicks data - either use existing JSONB array or create new one
          let clicksData = socialLinkData.clicks || [];

          // Check if clicks is a valid JSONB array, if not, initialize it
          if (!Array.isArray(clicksData)) {
            clicksData = [];
          }

          // Add user ID to clicks array if not already present
          if (!clicksData.includes(userId.toString())) {
            clicksData.push(userId.toString());

            // Update the social link with the new clicks data
            const { error: updateError } = await supabase
              .from("customer_social_links")
              .update({ clicks: clicksData })
              .eq("id", socialLinkData.id);

            if (updateError) {
              console.error("Error updating clicks:", updateError);
            } else {
              console.log(
                "Successfully recorded click for user",
                userId.toString()
              );
            }
          } else {
            console.log("User click already recorded");
          }
        } else {
          console.log("No matching social link found for this task");
        }
      } catch (socialLinkError) {
        console.error("Error recording click:", socialLinkError);
        // Continue with task - don't block the user if click recording fails
      }

      // Check if task attempt exists for user
      const { data: completionData, error: completionError } = await supabase
        .from("user_task_completions")
        .select("verification_status, updated_at")
        .eq("user_id", userId.toString())
        .eq("task_id", task.id)
        .single();

      if (completionError && completionError.code !== "PGRST116") {
        console.error("Completion check error:", completionError);
        throw new Error(
          `Failed to check completion status: ${completionError.message}`
        );
      }

      // Handle different verification statuses
      if (completionData) {
        console.log("Existing task attempt found:", completionData);

        if (completionData.verification_status === "verified") {
          // Task already completed - just open URL
          WebApp?.openLink(taskUrl, { try_instant_view: false });
          return;
        } else if (completionData.verification_status === "pending") {
          // For pending tasks, check if 30 seconds have passed since last update
          const lastUpdateTime = new Date(completionData.updated_at).getTime();
          const currentTime = new Date().getTime();
          const timeDifference = currentTime - lastUpdateTime;

          if (timeDifference >= 30000) {
            // If 30 seconds have passed, enable check button
            setHasClicked(true);
            setTimerComplete(true);
          } else {
            // If 30 seconds haven't passed, start timer from remaining time
            setHasClicked(true);
            setTimerComplete(false);
            // Timer will be started by useEffect
          }

          // Update timestamp
          const { error: updateError } = await supabase
            .from("user_task_completions")
            .update({ updated_at: new Date().toISOString() })
            .eq("user_id", userId.toString())
            .eq("task_id", task.id);

          if (updateError) {
            console.error("Error updating task attempt:", updateError);
            throw new Error(
              `Failed to update task attempt: ${updateError.message}`
            );
          }
        }
      }

      // Create new attempt if no existing entry or rejected status
      if (
        !completionData ||
        completionData.verification_status === "rejected"
      ) {
        const { error: insertError } = await supabase
          .from("user_task_completions")
          .insert({
            user_id: userId.toString(),
            task_id: task.id,
            platform: task.platform,
            customer_id: task.customerId,
            verification_status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error creating task attempt:", insertError);
          throw new Error(
            `Failed to create task attempt: ${insertError.message}`
          );
        }

        // For new attempts, start the timer
        setHasClicked(true);
        setTimerComplete(false);
      }

      // Open URL externally using Telegram WebApp
      WebApp?.openLink(taskUrl, { try_instant_view: false });
    } catch (error) {
      console.error("Detailed error in handleVisitLink:", error);
      gameToast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again later"
      );
    }
  };

  const handleCheckTask = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId || !task) {
      gameToast.error("Please login to complete tasks");
      return;
    }

    console.log("Check task clicked:", {
      hasClicked,
      timerComplete,
      taskId: task.id,
    });

    if (!hasClicked || !timerComplete) {
      console.log("Task not ready for check:", {
        hasClicked,
        timerComplete,
        taskId: task.id,
      });
      gameToast.error(
        "Please visit the link and wait for 30 seconds before checking the task"
      );
      return;
    }

    // Make sure task completed popup is closed before showing penalty warning
    if (isTaskCompletedOpen) {
      setIsTaskCompletedOpen(false);
      // Add a small delay to ensure the popup is closed
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("Opening penalty warning popup", { taskId: task.id });
    setIsPenaltyWarningOpen(true);
  };

  const handlePenaltyWarningClose = () => {
    setIsPenaltyWarningOpen(false);
  };

  const handleTaskCompletedClose = () => {
    setIsTaskCompletedOpen(false);
    onClose();
  };

  const handleYesCompleted = async () => {
    if (!userId || !task) return;

    try {
      console.log("Starting task completion process...", {
        userId: userId.toString(),
        taskId: task.id,
        platform: task.platform,
        customerId: task.customerId,
        hasClicked,
        timerComplete,
        coins: task.coins,
        spins: task.spins,
      });

      // Double check timer completion
      if (!hasClicked || !timerComplete) {
        console.error("Timer conditions not met:", {
          hasClicked,
          timerComplete,
        });
        gameToast.error("Please wait for the verification period to complete");
        return;
      }

      // Note: We no longer need to close the penalty popup here.
      // The PenaltyWarningPopup component calls this function AFTER its close animation completes

      const success = await markTaskAsCompleted(
        userId.toString(),
        task.id,
        task.platform,
        task.customerId,
        task.coins,
        task.spins
      );

      // Open the task completed popup
      setIsTaskCompletedOpen(true);

      if (success) {
        console.log("Task marked as completed successfully", {
          taskId: task.id,
          coins: task.coins,
          spins: task.spins,
        });
        setIsTaskCompleted(true);
        refreshStateFromSupabase();
        onTaskComplete?.();

        // Update local state for immediate feedback
        persistState((prev) => ({
          ...prev,
          coins: prev.coins + task.coins,
          spins: prev.spins + task.spins,
        }));

        // Trigger a refresh of platform totals by dispatching a custom event
        const refreshEvent = new CustomEvent("refreshPlatformTotals", {
          detail: {
            platform: task.platform,
            taskId: task.id,
          },
        });
        window.dispatchEvent(refreshEvent);
      }
    } catch (error) {
      console.error("Error completing task:", error);
      // Show the task completed popup even if there was an error
      setIsTaskCompletedOpen(true);
    }
  };

  const refreshStateFromSupabase = React.useCallback(async () => {
    if (!userId || !task) return;

    if (!supabase) {
      console.error("Supabase client not available");
      return;
    }

    try {
      const { data: completionData } = await supabase
        .from("user_task_completions")
        .select("verification_status")
        .eq("user_id", userId.toString())
        .eq("task_id", task.id)
        .single();

      setVerificationStatus(completionData?.verification_status || null);
      setIsTaskCompleted(completionData?.verification_status === "COMPLETED");

      const { data: userData } = await supabase
        .from("telegram_users")
        .select("coins, spins")
        .eq("user_id", userId.toString())
        .single();

      if (userData) {
        persistState((prev) => ({
          ...prev,
          coins: userData.coins || prev.coins,
          spins: userData.spins || prev.spins,
        }));
      }
    } catch (error) {
      console.error("Error refreshing state:", error);
      gameToast.error("Failed to refresh task state");
    }
  }, [userId, task, persistState]);

  useEffect(() => {
    if (isOpen) {
      refreshStateFromSupabase();
    }
  }, [isOpen, refreshStateFromSupabase]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!task) return null;

  return (
    <>
      {/* Main TaskPopup - completely hidden when child popups are shown */}
      {!isPenaltyWarningOpen && !isTaskCompletedOpen && (
        <>
          <div
            className={`fixed inset-0 backdrop-blur-[14px] bg-black/50 z-40 transition-all duration-300 ${
              isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
          />
          <div
            className={`fixed inset-x-0 bottom-0 transform transition-all duration-300 max-w-md mx-auto z-50 ${
              isOpen
                ? "opacity-100"
                : "opacity-0 translate-y-full pointer-events-none"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border h-[700px]">
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />
              <div className="relative h-full flex flex-col p-6">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white"
                  >
                    <Image src="/assets/Close.png" alt="Close" width={32} height={32} />
                  </button>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-5xl mb-4">
                    {socialIcons[task.platform]}
                  </div>

                  {/* Rewards Row */}
                  <div className="flex justify-center gap-3 w-full mb-6">
                    <div className="inline-flex items-center justify-center px-3 bg-black rounded-[8px] border border-[#E29029]/30 h-[38px] min-w-[60px]">
                      <Image
                        src="/assets/SparkyIcon.png"
                        alt="Sparky"
                        width={18}
                        height={18}
                        className="object-contain flex-shrink-0"
                        unoptimized
                      />
                      <span className="text-[#E18700] font-bold text-xs whitespace-nowrap text-center flex-shrink-0 ml-2">
                        +{task.coins.toLocaleString()}
                      </span>
                    </div>
                    <div className="inline-flex items-center justify-center px-3 bg-black rounded-[8px] border border-[#E29029]/30 h-[38px] min-w-[60px]">
                      <Image
                        src="/assets/SpinIcon.png"
                        alt="Spin"
                        width={18}
                        height={18}
                        className="object-contain flex-shrink-0"
                        unoptimized
                      />
                      <span className="text-[#E18700] font-bold text-xs whitespace-nowrap text-center flex-shrink-0 ml-2">
                        +{task.spins}
                      </span>
                    </div>
                  </div>

                  <div className="text-white text-center mb-4 text-lg font-medium">
                    {formatTaskTitle(task.platform, displayCustomerName)}
                  </div>

                  {/* Complete Task Background */}
                  <div className="relative w-full">
                    <div className="w-full relative backdrop-blur-[14px] rounded-[10px] bg-[#3a1c09] border border-white/10 p-4 flex items-center">
                      <div className="grid grid-cols-10 gap-4">
                        <div className="flex items-center justify-center col-span-3">
                          <Image
                            src={platformIcons[task.platform]}
                            alt={task.platform}
                            width={24}
                            height={24}
                            className="text-2xl text-white"
                          />
                        </div>
                        <div className="flex flex-col col-span-7">
                          <span className="text-[#909090] text-sm font-bold">
                            Complete the task via
                          </span>
                          <span className="text-white/80 text-md font-bold">
                            <span
                              className="text-[#E18700] underline cursor-pointer font-bold text-[14px]"
                              onClick={handleVisitLink}
                            >
                              {platformLabels[task.platform]}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex justify-start w-full">
                    <div className="w-[1px] h-[20px] bg-white/10 ml-6"></div>
                  </div>

                  <div className="w-full space-y-4 pb-2">
                    <div className="relative w-full">
                      <div className="relative">
                        <div className="w-full relative backdrop-blur-[14px] rounded-[10px] bg-[#3a1c09] border border-white/10 p-4">
                          <div className="flex flex-col gap-4">
                            {/* Row 1 */}
                            <div className="flex flex-col items-center gap-4">
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                  <Image
                                    src="/assets/Earn/CheckMarkIcon.png"
                                    alt="Check Mark"
                                    width={24}
                                    height={24}
                                    className="text-green-500"
                                  />
                                </div>
                                <div className="flex-grow">
                                  <p className="text-[#909090] text-sm font-bold">
                                    Tap below to submit for verification!
                                  </p>
                                </div>
                              </div>
                              {/* Only show the "Your task is under verification..." row while timer is running after user clicks the link */}
                              {hasClicked && !timerComplete && (
                                <div
                                  className="flex items-center gap-3 border-t-2 border-white/10 pt-2 rounded-2xl px-4"
                                  style={{
                                    background:
                                      "linear-gradient(180deg, #3A1C09 20%, #3A1C09 100%)",
                                  }}
                                >
                                  <div className="flex-shrink-0">
                                    <Image
                                      src="/assets/Earn/VerifyGreenDiamondIcon.png"
                                      alt="Verify Green Diamond"
                                      width={24}
                                      height={24}
                                      className="w-auto h-auto"
                                    />
                                  </div>
                                  <div className="flex items-center gap-3  text-[#909090] text-sm font-bold">
                                    Your task is under verification. The status
                                    will update once it&apos;s checked.
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Row 2 - Verification Status */}
                            {hasClicked &&
                              !timerComplete &&
                              verificationStatus === "PENDING" && (
                                <div className="flex items-center gap-3">
                                  <div
                                    id="verification-status"
                                    className="w-full relative backdrop-blur-[14px] rounded-[10px] bg-[#3a1c09] border border-white/10 box-border text-left text-[14px] text-[#909090] font-['Rounded_Mplus_1c_Bold'] p-4 transition-all duration-200"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="flex-shrink-0">
                                        <Image
                                          src="/assets/Earn/VerifyGreenDiamondIcon.png"
                                          alt="Verify Green Diamond"
                                          width={24}
                                          height={24}
                                          className="text-green-500"
                                        />
                                      </div>
                                      <div className="flex-grow">
                                        <p className="text-white text-sm">
                                          Your task is under verification. The
                                          status will update once it&apos;s
                                          checked.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* Row 3 */}
                            <div
                              className="flex justify-center mt-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  if (isTaskCompleted) {
                                    gameToast.error(
                                      "You have already completed this task!"
                                    );
                                  } else if (!hasClicked) {
                                    gameToast.error(
                                      "Please complete the task by visiting the link first"
                                    );
                                  } else if (!timerComplete) {
                                    // Add vibration and shake animation
                                    if (WebApp?.HapticFeedback) {
                                      WebApp.HapticFeedback.notificationOccurred(
                                        "error"
                                      );
                                    }
                                    const verificationDiv =
                                      document.getElementById(
                                        "verification-status"
                                      );
                                    if (verificationDiv) {
                                      verificationDiv.classList.remove(
                                        "shake-animation"
                                      );
                                      void verificationDiv.offsetWidth; // Trigger reflow
                                      verificationDiv.classList.add(
                                        "shake-animation"
                                      );
                                    }
                                    gameToast.error(
                                      "Wait while we verify the task"
                                    );
                                  } else {
                                    handleCheckTask(e);
                                  }
                                }}
                                className={`w-full transition-all duration-200 ${
                                  hasClicked &&
                                  timerComplete &&
                                  !isTaskCompleted
                                    ? "opacity-100 cursor-pointer hover:scale-[1.02]"
                                    : "opacity-50 cursor-not-allowed"
                                }`}
                                disabled={
                                  !hasClicked ||
                                  !timerComplete ||
                                  isTaskCompleted
                                }
                                type="button"
                              >
                                <Image
                                  src="/assets/Earn/CheckTheTask.png"
                                  alt="Check The Task"
                                  width={280}
                                  height={40}
                                  className="w-full"
                                  style={{ color: "transparent" }}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 w-full my-4"></div>

                  {/* Warning Message Row */}
                  <div className="flex items-center gap-2 p-2">
                    <Image
                      src="/assets/Earn/WarningIcon.png"
                      alt="Warning"
                      width={20}
                      height={20}
                      className="text-yellow-400"
                    />
                    <p className="text-yellow-400 text-xs">
                      This is a promotional campaign. We do not control or take
                      responsibility for its content.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <PenaltyWarningPopup
        isOpen={isPenaltyWarningOpen}
        onClose={handlePenaltyWarningClose}
        onYesCompleted={handleYesCompleted}
        sparkyValue={task.coins}
      />

      <TaskCompletedPopup
        isOpen={isTaskCompletedOpen}
        onClose={handleTaskCompletedClose}
        sparkyValue={task.coins}
        spinValue={task.spins}
        taskId={task.id}
        platform={task.platform}
        customerName={displayCustomerName}
      />

      <style jsx global>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-2px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(2px);
          }
        }

        .shake-animation {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>
    </>
  );
};

export default TaskPopup;
