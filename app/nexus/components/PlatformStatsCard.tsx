import React, { useEffect, useState } from "react";
import { FaTelegram, FaXTwitter, FaYoutube, FaDiscord } from "react-icons/fa6";
import { PlatformType } from "@/app/types/Customer";
import {
  getPlatformMemberGrowth,
  getPlatformChannelFollowers,
  getPlatformViews,
  getPlatformFollowers,
  getPlatformSubscribers,
} from "@/app/lib/supabase/queries";

interface PlatformStatsCardProps {
  platform: PlatformType;
  title: string;
  label: string;
  value?: number;
}

const platformIcons = {
  TELEGRAM_CHANNEL: FaTelegram,
  TELEGRAM_GROUP: FaTelegram,
  X: FaXTwitter,
  YOUTUBE_VIEWS: FaYoutube,
  YOUTUBE_SUBSCRIBERS: FaYoutube,
  DISCORD: FaDiscord,
  X_RETWEET: FaXTwitter,
};

const platformColors = {
  TELEGRAM_CHANNEL: "text-blue-500",
  TELEGRAM_GROUP: "text-blue-500",
  X: "text-gray-900",
  YOUTUBE_VIEWS: "text-red-600",
  YOUTUBE_SUBSCRIBERS: "text-red-600",
  DISCORD: "text-purple-600",
  X_RETWEET: "text-gray-900",
};

const PlatformStatsCard = ({
  platform,
  title,
  label,
  value,
}: PlatformStatsCardProps) => {
  const Icon = platformIcons[platform];
  const colorClass = platformColors[platform];
  const [metricValue, setMetricValue] = useState<number | null>(null);

  useEffect(() => {
    const fetchMetric = async () => {
      if (value !== undefined) {
        setMetricValue(value);
        return;
      }

      try {
        let metric = 0;
        switch (platform) {
          case "TELEGRAM_CHANNEL":
            metric = await getPlatformChannelFollowers(platform);
            break;
          case "TELEGRAM_GROUP":
            metric = await getPlatformMemberGrowth(platform);
            break;
          case "X":
            metric = await getPlatformFollowers(platform);
            break;
          case "YOUTUBE_VIEWS":
            metric = await getPlatformViews(platform);
            break;
          case "YOUTUBE_SUBSCRIBERS":
            metric = await getPlatformSubscribers(platform);
            break;
          case "DISCORD":
            // For Discord, we'll use the value prop or default to 0
            metric = value || 0;
            break;
          case "X_RETWEET":
            // For X Retweet, we'll use the value prop or default to 0
            metric = value || 0;
            break;
          default:
            metric = 0;
        }
        setMetricValue(metric);
      } catch (error) {
        console.error("Error fetching metric:", error);
        setMetricValue(null);
      }
    };

    fetchMetric();
  }, [platform, value]);

  if (!Icon) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-md transition-shadow duration-200 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`text-lg ${colorClass}`} />
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      </div>
      <div className="mt-2">
        <div className="text-2xl font-semibold text-gray-900">
          {metricValue !== null ? metricValue.toLocaleString() : "N/A"}
        </div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
};

export default PlatformStatsCard;
