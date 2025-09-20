import { PlatformType } from "@/app/types/Customer";
import React from "react";
import { FaTelegram, FaXTwitter, FaYoutube, FaDiscord } from "react-icons/fa6";

interface ServiceTypeCardProps {
  platform: PlatformType;
  stats: {
    active: number;
    inactive: number;
  };
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

const platformDisplayNames = {
  TELEGRAM_CHANNEL: "Telegram Channel",
  TELEGRAM_GROUP: "Telegram Group",
  X: "X",
  YOUTUBE_VIEWS: "YouTube Views",
  YOUTUBE_SUBSCRIBERS: "YouTube Subscribers",
  DISCORD: "Discord",
  X_RETWEET: "X Retweet",
};

export default function ServiceTypeCard({
  platform,
  stats = { active: 0, inactive: 0 },
}: ServiceTypeCardProps) {
  const Icon = platformIcons[platform as keyof typeof platformIcons];
  const colorClass = platformColors[platform as keyof typeof platformColors];
  const displayName =
    platformDisplayNames[platform as keyof typeof platformDisplayNames];

  return (
    <div className="bg-white rounded-xl p-4 shadow-md transition-shadow duration-200 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Icon
          className={`text-xl ${colorClass}`}
          style={{
            color:
              platform === "TELEGRAM_CHANNEL" || platform === "TELEGRAM_GROUP"
                ? "#3b82f6"
                : platform === "YOUTUBE_VIEWS" ||
                  platform === "YOUTUBE_SUBSCRIBERS"
                ? "#dc2626"
                : platform === "X" || platform === "X_RETWEET"
                ? "#111827"
                : platform === "DISCORD"
                ? "#7c3aed"
                : "#6b7280",
          }}
        />
        <h3 className="text-base font-medium text-gray-900">{displayName}</h3>
      </div>
      <div className="mt-2">
        <div className="flex justify-between items-end">
          <div>
            <div className="text-sm text-gray-500">Active</div>
            <div className="text-2xl font-semibold text-green-600">
              {stats.active}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Inactive</div>
            <div className="text-2xl font-semibold text-gray-400">
              {stats.inactive}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
