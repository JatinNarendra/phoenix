import React from "react";
import { FaPlus, FaSpinner, FaCheck } from "react-icons/fa";
import { PlatformType } from "@/app/types/Customer";
import { validateSocialLink } from "@/app/lib/validation";

interface SocialLinkInputProps {
  selectedPlatform: PlatformType | "";
  currentLink: string;
  isSubmitting: boolean;
  onPlatformChange: (platform: PlatformType | "") => void;
  onLinkChange: (link: string) => void;
  onAddLink: () => void;
}

export default function SocialLinkInput({
  selectedPlatform,
  currentLink,
  isSubmitting,
  onPlatformChange,
  onLinkChange,
  onAddLink,
}: SocialLinkInputProps) {
  const platformOptions: PlatformType[] = [
    "TELEGRAM_CHANNEL",
    "X",
    "YOUTUBE_VIEWS",
  ];

  const isValid = selectedPlatform
    ? validateSocialLink(selectedPlatform, currentLink)
    : false;

  return (
    <div className="flex gap-4 items-start">
      <select
        value={selectedPlatform}
        onChange={(e) => onPlatformChange(e.target.value as PlatformType)}
        className="px-3 py-2 border bg-gray-50 text-gray-400 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Select Platform</option>
        {platformOptions.map((platform) => (
          <option key={platform} value={platform}>
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </option>
        ))}
      </select>

      <div className="flex-1">
        <input
          type="url"
          value={currentLink}
          onChange={(e) => onLinkChange(e.target.value)}
          placeholder="Enter social media link"
          className="w-full px-4 py-2 border bg-gray-50 text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <button
        onClick={onAddLink}
        disabled={isSubmitting || !isValid}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? (
          <FaSpinner className="animate-spin text-sm" />
        ) : isValid ? (
          <FaCheck className="text-sm" />
        ) : (
          <FaPlus className="text-sm" />
        )}
      </button>
    </div>
  );
}
