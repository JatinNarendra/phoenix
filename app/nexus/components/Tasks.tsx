import { useState, useEffect } from "react";
import { PlatformType } from "@/app/types/Customer";
import { FaTelegram, FaXTwitter, FaYoutube, FaDiscord } from "react-icons/fa6";
import type { Customer, TaskResponse } from "@/app/types/Customer";
import { supabase } from "@/lib/supabase";
import EditTaskModal from "./EditTaskModal";
import { mapDatabaseCustomerToCustomer } from "@/app/lib/typeGuards";
import { IconType } from "react-icons";
import { Card, CardContent } from "@/app/ui/card";
import { FaEdit } from "react-icons/fa";
import { Button } from "@/app/ui/button";
import { toast } from "react-hot-toast";

interface TasksProps {
  customer: Customer;
  setCustomer: React.Dispatch<React.SetStateAction<Customer | null>>;
  tasks: TaskResponse[];
  setTasks: React.Dispatch<React.SetStateAction<TaskResponse[]>>;
}

// Platform configuration for consistent styling and icons
const platformConfig: Record<
  PlatformType,
  { icon: IconType; color: string; bgColor: string }
> = {
  TELEGRAM_CHANNEL: {
    icon: FaTelegram,
    color: "text-blue-500",
    bgColor: "from-blue-50 to-blue-100",
  },
  X: {
    icon: FaXTwitter,
    color: "text-gray-900",
    bgColor: "from-gray-50 to-gray-100",
  },
  YOUTUBE_VIEWS: {
    icon: FaYoutube,
    color: "text-red-600",
    bgColor: "from-red-50 to-red-100",
  },
  TELEGRAM_GROUP: {
    icon: FaTelegram,
    color: "text-blue-500",
    bgColor: "from-blue-50 to-blue-100",
  },
  YOUTUBE_SUBSCRIBERS: {
    icon: FaYoutube,
    color: "text-red-600",
    bgColor: "from-red-50 to-red-100",
  },
  DISCORD: {
    icon: FaDiscord,
    color: "text-purple-600",
    bgColor: "from-purple-50 to-purple-100",
  },
  X_RETWEET: {
    icon: FaXTwitter,
    color: "text-gray-900",
    bgColor: "from-gray-50 to-gray-100",
  },
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

export default function Tasks({
  customer,
  setCustomer,
  tasks,
  setTasks,
}: TasksProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<{
    taskId: string;
    platform: PlatformType;
    handle: string;
    sparkValue: number;
    spinValue: number;
  } | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!supabase) {
        console.error("Supabase client not available");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("customer_social_links")
          .select("*")
          .eq("customer_id", customer.id);

        if (error) throw error;

        const formattedTasks = data.map((task) => ({
          id: task.id,
          platform: task.platform,
          linkUrl: task.link_url,
          isEnabled: task.enabled,
          type: task.type,
          rewards: task.rewards,
          completion_status: task.completion_status || {
            completed_at: null,
            completed_by: [],
          },
        }));

        setTasks(formattedTasks as TaskResponse[]);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(null);
      }
    };

    fetchTasks();
  }, [customer.id, setTasks]);

  useEffect(() => {
    const checkConnection = async () => {
      if (!supabase) {
        console.error("Supabase client not available");
        return;
      }

      try {
        const { error } = await supabase
          .from("customer_social_links")
          .select("*")
          .limit(1);

        if (error) {
          console.error("Supabase connection error:", error);
          // Handle connection error
        }
      } catch (err) {
        console.error("Error checking Supabase connection:", err);
      }
    };

    checkConnection();
  }, []);

  const toggleStatus = async (taskId: string, currentStatus: boolean) => {
    setLoading(taskId);
    try {
      await withRetry(async () => {
        if (!supabase) {
          throw new Error("Supabase client not available");
        }

        const { error } = await supabase
          .from("customer_social_links")
          .update({ enabled: !currentStatus })
          .eq("id", taskId);

        if (error) throw error;
      });

      // Update both local state and customer state
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, isEnabled: !currentStatus } : task
        )
      );

      setCustomer((prev) => {
        if (!prev) return null;

        const updatedSocialTasks = { ...prev.socialTasks };
        Object.keys(updatedSocialTasks).forEach((platform) => {
          const links = updatedSocialTasks[platform as PlatformType]?.links;
          if (links) {
            const linkIndex = links.findIndex((link) => link.id === taskId);
            if (linkIndex !== -1) {
              links[linkIndex] = {
                ...links[linkIndex],
                enabled: !currentStatus,
              };
            }
          }
        });

        return {
          ...prev,
          socialTasks: updatedSocialTasks,
        };
      });

      toast.success(
        `Task ${!currentStatus ? "enabled" : "disabled"} successfully`
      );
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status");
    } finally {
      setLoading(null);
    }
  };

  const updateTaskInState = (
    taskId: string,
    newData: Partial<TaskResponse>
  ) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, ...newData } : task
      )
    );
  };

  const renderTaskCard = (task: TaskResponse) => {
    const {
      icon: PlatformIcon,
      color,
      bgColor,
    } = platformConfig[task.platform];
    const isEnabled = task.isEnabled;
    const tagText =
      {
        YOUTUBE_VIEWS: "Views",
        YOUTUBE_SUBSCRIBERS: "Subscribers",
        TELEGRAM_CHANNEL: "Channel",
        TELEGRAM_GROUP: "Group",
        X: "Followers",
        DISCORD: "Server",
        X_RETWEET: "Retweet",
      }[task.type] || task.type;

    return (
      <Card key={task.id} className="py-4 relative min-h-[120px]">
        <CardContent className="pt-1">
          <div className="absolute top-[-5px] left-0 z-10">
            <span
              className="py-1 px-2 capitalize rounded-tl-xl rounded-br-none"
              style={{
                fontSize: "10px",
                backgroundColor: bgColor.replace("from-", "bg-").split(" ")[0],
                color: "black",
                borderRadius: "10px 0 10px 0",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                backgroundImage: "linear-gradient(to right, #f0f0f0, #e0e0e0)",
              }}
            >
              {tagText}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mt-4">
              <div className={`p-1.5 rounded-lg bg-gradient-to-br ${bgColor}`}>
                <PlatformIcon
                  className={`text-xl ${color}`}
                  style={{
                    color:
                      task.platform === "TELEGRAM_CHANNEL" ||
                      task.platform === "TELEGRAM_GROUP"
                        ? "#3b82f6"
                        : task.platform === "YOUTUBE_SUBSCRIBERS" ||
                          task.platform === "YOUTUBE_VIEWS"
                        ? "#dc2626"
                        : task.platform === "X" || task.platform === "X_RETWEET"
                        ? "#111827"
                        : task.platform === "DISCORD"
                        ? "#7c3aed"
                        : "#6b7280",
                  }}
                />
              </div>
              <div className="max-w-[160px]">
                <div className="font-medium text-sm text-foreground truncate">
                  {task.linkUrl.split("/").pop()}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-gray-600">SPARK:</span>
                <span className="font-medium text-gray-900">
                  {task.rewards?.coins?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-600">SPIN:</span>
                <span className="font-medium text-gray-900">
                  {task.rewards?.spins || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t flex justify-between items-center">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setEditingTask({
                    taskId: task.id,
                    platform: task.platform,
                    handle: task.linkUrl,
                    sparkValue: task.rewards?.coins || 0,
                    spinValue: task.rewards?.spins || 0,
                  })
                }
              >
                <FaEdit
                  className="text-gray-600 hover:text-gray-900"
                  size={14}
                />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleStatus(task.id, isEnabled)}
              className={`flex items-center gap-1 ${
                isEnabled ? "text-green-600" : "text-red-600"
              }`}
              disabled={loading === task.id}
            >
              {loading === task.id ? (
                <div className="flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-300 border-t-green-600" />
                  <span className="text-xs">Updating...</span>
                </div>
              ) : (
                <>
                  {isEnabled ? "Online" : "Offline"}
                  <div
                    className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                      isEnabled ? "bg-green-500" : "bg-red-500"
                    } relative`}
                  >
                    {isEnabled && (
                      <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                    )}
                  </div>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">No tasks added yet</div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-screen-xl mx-auto">
        {tasks.map(renderTaskCard)}
      </div>

      {editingTask && (
        <EditTaskModal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          taskId={editingTask.taskId}
          platform={editingTask.platform}
          currentHandle={editingTask.handle}
          currentSparkValue={editingTask.sparkValue}
          currentSpinValue={editingTask.spinValue}
          customerId={customer.id}
          onTaskUpdated={async (
            updatedHandle: string,
            updatedSparkValue: number,
            updatedSpinValue: number
          ) => {
            updateTaskInState(editingTask.taskId, {
              linkUrl: updatedHandle,
              rewards: {
                coins: updatedSparkValue,
                spins: updatedSpinValue,
              },
            });

            if (!supabase) {
              console.error("Supabase client not available");
              return;
            }

            const { data: updatedCustomer } = await supabase
              .from("customers")
              .select("*")
              .eq("id", customer.id)
              .single();

            if (updatedCustomer) {
              const mappedCustomer = await mapDatabaseCustomerToCustomer(
                updatedCustomer
              );
              setCustomer(mappedCustomer);
            }
          }}
        />
      )}
    </div>
  );
}
