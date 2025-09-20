import type React from "react";
import { useState } from "react";
import { FaTelegram, FaXTwitter, FaYoutube, FaDiscord } from "react-icons/fa6";
import type { PlatformType, ServiceType } from "@/app/types/Customer";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { getPlatformName } from "@/app/lib/platformUtils";
import type { IconType } from "react-icons";
import type { TaskDefaults } from "../[customerSlug]/page";
import type { TaskResponse } from "@/app/types/Customer";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/ui/dialog";
import { Input } from "@/app/ui/input";
import { Button } from "@/app/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/ui/select";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerId: string;
  onTaskAdded: () => Promise<void>;
  onPlatformSelect: (platform: PlatformType) => void;
  defaultTaskTypes: Record<PlatformType, TaskDefaults>;
  setTasks: React.Dispatch<React.SetStateAction<TaskResponse[]>>;
}

const platformConfig: Record<PlatformType, { icon: IconType; color: string }> =
  {
    TELEGRAM_CHANNEL: { icon: FaTelegram, color: "text-blue-500" },
    X: { icon: FaXTwitter, color: "text-gray-900" },
    YOUTUBE_VIEWS: { icon: FaYoutube, color: "text-red-600" },
    TELEGRAM_GROUP: { icon: FaTelegram, color: "text-blue-500" },
    YOUTUBE_SUBSCRIBERS: { icon: FaYoutube, color: "text-red-600" },
    DISCORD: { icon: FaDiscord, color: "text-purple-600" },
    X_RETWEET: { icon: FaXTwitter, color: "text-gray-900" },
  };

const platformOptions = [
  { value: "TELEGRAM_CHANNEL", label: "Telegram Channel" },
  { value: "TELEGRAM_GROUP", label: "Telegram Group" },
  { value: "X", label: "X (Twitter)" },
  { value: "YOUTUBE_VIEWS", label: "YouTube Views" },
  { value: "YOUTUBE_SUBSCRIBERS", label: "YouTube Subscribers" },
  { value: "DISCORD", label: "Discord" },
  { value: "X_RETWEET", label: "X Retweet" },
];

export default function AddTaskModal({
  isOpen,
  onClose,
  customerName,
  customerId,
  onTaskAdded,
  onPlatformSelect,
  defaultTaskTypes,
  setTasks,
}: AddTaskModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | "">(
    ""
  );
  const [selectedTaskType, setSelectedTaskType] = useState<ServiceType>(
    "YOUTUBE_SUBSCRIBERS"
  );
  const [handle, setHandle] = useState("");
  const [sparkValue, setSparkValue] = useState<number>(0);
  const [spinValue, setSpinValue] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check if form is valid
  const isFormValid =
    selectedPlatform !== "" &&
    handle.trim() !== "" &&
    sparkValue >= 0 &&
    spinValue >= 0;

  // Reset form state when modal closes
  const handleClose = () => {
    setSelectedPlatform("");
    setHandle("");
    setSparkValue(0);
    setSpinValue(0);
    setSelectedTaskType("YOUTUBE_SUBSCRIBERS");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!supabase) {
        toast.error("Database connection not available");
        return;
      }

      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("slug", customerId)
        .single();

      if (customerError || !customer) throw new Error("Customer not found");

      const rewards = {
        coins: sparkValue,
        spins: spinValue,
      };

      const newTask = {
        customer_id: customer.id,
        customer_name: customer.customer_name,
        platform: selectedPlatform,
        type: selectedTaskType,
        link_url: handle,
        rewards: rewards,
      };

      const { data: taskData, error: taskError } = await supabase
        .from("customer_social_links")
        .insert(newTask)
        .select()
        .single();

      if (taskError) throw taskError;

      // Update local state immediately
      if (taskData) {
        const formattedTask: TaskResponse = {
          id: taskData.id,
          platform: taskData.platform,
          linkUrl: taskData.link_url,
          isEnabled: taskData.is_enabled,
          type: taskData.type,
        };
        setTasks((prevTasks: TaskResponse[]) => [...prevTasks, formattedTask]);
      }

      toast.success("Task created successfully");

      await onTaskAdded();
      onClose();
      setHandle("");
      setSelectedPlatform("");
      router.refresh();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholderText = (platform: PlatformType | ""): string => {
    switch (platform) {
      case "TELEGRAM_CHANNEL":
        return "e.g., t.me/yourchannel or @yourchannel";
      case "TELEGRAM_GROUP":
        return "e.g., t.me/yourgroup or @yourgroup";
      case "X":
        return "e.g., x.com/yourhandle or @yourhandle";
      case "YOUTUBE_VIEWS":
        return "e.g., youtube.com/watch?v=VIDEO_ID";
      case "YOUTUBE_SUBSCRIBERS":
        return "e.g., youtube.com/channel/CHANNEL_ID";
      case "DISCORD":
        return "e.g., discord.gg/invitecode or discord.com/invite/invitecode";
      case "X_RETWEET":
        return "e.g., x.com/username/status/TWEET_ID";
      default:
        return "Enter the URL or handle";
    }
  };

  const getInputLabel = (platform: PlatformType | ""): string => {
    switch (platform) {
      case "TELEGRAM_CHANNEL":
        return "Channel Handle or URL";
      case "TELEGRAM_GROUP":
        return "Group Handle or URL";
      case "X":
        return "X Handle or Profile URL";
      case "YOUTUBE_VIEWS":
        return "Video URL";
      case "YOUTUBE_SUBSCRIBERS":
        return "Channel URL";
      case "DISCORD":
        return "Discord Server Invite";
      case "X_RETWEET":
        return "Tweet URL";
      default:
        return "Enter Handle or Channel URL";
    }
  };

  const handlePlatformChange = (platform: PlatformType) => {
    console.log("Selected platform:", platform);
    setSelectedPlatform(platform);
    onPlatformSelect(platform);

    // Set default task type based on platform
    if (platform === "YOUTUBE_VIEWS") {
      console.log("Setting task type to YOUTUBE_VIEWS");
      setSelectedTaskType("YOUTUBE_VIEWS");
    } else if (platform === "X") {
      console.log("Setting task type to X");
      setSelectedTaskType("X");
    } else if (platform === "DISCORD") {
      console.log("Setting task type to DISCORD");
      setSelectedTaskType("DISCORD");
    } else if (platform === "X_RETWEET") {
      console.log("Setting task type to X_RETWEET");
      setSelectedTaskType("X_RETWEET");
    } else {
      console.log("Setting default task type for platform:", platform);
      const defaults = defaultTaskTypes[platform];
      setSelectedTaskType(defaults.defaultType);
    }
  };

  if (!isOpen) return null;

  const PlatformIcon = selectedPlatform
    ? platformConfig[selectedPlatform as PlatformType]?.icon
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px] bg-white text-black p-6 space-y-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Add Task for {customerName}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Add a new social task for this customer
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium">Select Platform</label>
            <Select
              value={selectedPlatform}
              onValueChange={(value) =>
                handlePlatformChange(value as PlatformType)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a platform" />
              </SelectTrigger>
              <SelectContent>
                {platformOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">
              {getInputLabel(selectedPlatform)}
            </label>
            <Input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={getPlaceholderText(selectedPlatform)}
              className="text-black"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">SPARK Value</label>
            <Input
              type="number"
              value={sparkValue}
              onChange={(e) =>
                setSparkValue(Math.max(0, parseInt(e.target.value) || 0))
              }
              placeholder="Enter SPARK value"
              className="text-black"
              min="0"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">SPIN Value</label>
            <Input
              type="number"
              value={spinValue}
              onChange={(e) =>
                setSpinValue(Math.max(0, parseInt(e.target.value) || 0))
              }
              placeholder="Enter SPIN value"
              className="text-black"
              min="0"
            />
          </div>

          {selectedPlatform && handle && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4 text-gray-700">
              <div className="flex items-center gap-3 text-grey-700">
                {PlatformIcon && (
                  <PlatformIcon
                    className={`text-5xl text-gray-700 ${
                      platformConfig[selectedPlatform as PlatformType].color
                    }`}
                  />
                )}
                <div>
                  <div className="text-sm text-gray-600">
                    Task:{" "}
                    <span className="font-medium">
                      {getPlatformName(selectedPlatform)}
                    </span>
                  </div>
                  <div className="font-medium text-gray-900">
                    Handle: {handle.split("/").pop()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="min-w-[100px]"
            >
              {loading ? "Adding..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
