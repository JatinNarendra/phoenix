import { PlatformType } from "@/app/types/Customer";

export const socialValidationPatterns: Record<PlatformType, RegExp> = {
  X: /^https:\/\/x\.com\/[a-zA-Z0-9_]+$/,
  X_RETWEET: /^https:\/\/x\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+$/,
  TELEGRAM_CHANNEL: /^https:\/\/(t\.me|telegram\.me)\/[a-zA-Z0-9_]+$/,
  TELEGRAM_GROUP: /^https:\/\/(t\.me|telegram\.me)\/[a-zA-Z0-9_]+$/,
  YOUTUBE_SUBSCRIBERS:
    /^https:\/\/(www\.)?youtube\.com\/channel\/[a-zA-Z0-9_-]+$/,
  YOUTUBE_VIEWS:
    /^https:\/\/((?:www\.)?youtube\.com\/(?:watch\?v=|playlist\?list=|channel\/|c\/|user\/)|youtu\.be\/)[a-zA-Z0-9_-]+(?:\?.*)?$/,
  DISCORD: /^https:\/\/discord\.gg\/[a-zA-Z0-9]+$/,
};

export const validateSocialLink = (
  platform: PlatformType,
  link: string
): boolean => {
  const pattern = socialValidationPatterns[platform];
  return pattern.test(link);
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
