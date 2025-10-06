import { PlatformType } from "../types/Customer";

/**
 * Gets a readable name for a platform
 */
export function getPlatformName(platform: PlatformType): string {
  switch (platform) {
    case "TELEGRAM_CHANNEL":
      return "Telegram Channel";
    case "TELEGRAM_GROUP":
      return "Telegram Group";
    case "X":
      return "X";
    case "YOUTUBE_SUBSCRIBERS":
      return "YouTube Subscribers";
    case "YOUTUBE_VIEWS":
      return "YouTube Views";
    case "DISCORD":
      return "Discord";
    case "X_RETWEET":
      return "X Retweet";
    default:
      return platform;
  }
}

/**
 * Gets a default action for a platform
 */
export function getPlatformDefaultAction(platform: PlatformType): string {
  switch (platform) {
    case "TELEGRAM_CHANNEL":
      return "Follow";
    case "TELEGRAM_GROUP":
      return "Join";
    case "X":
      return "Follow";
    case "YOUTUBE_SUBSCRIBERS":
      return "Subscribe";
    case "YOUTUBE_VIEWS":
      return "Watch";
    case "DISCORD":
      return "Join";
    case "X_RETWEET":
      return "Retweet";
    default:
      return "Visit";
  }
}

/**
 * Checks if a platform is any YouTube-related platform
 */
export function isYoutubePlatform(platform: string): boolean {
  if (!platform) return false;
  return String(platform).toUpperCase().includes("YOUTUBE");
}

/**
 * Gets an appropriate display type for a YouTube task
 */
export function getYoutubeTaskType(type: string): string {
  if (!type) return "YouTube";

  const typeStr = String(type).toUpperCase();
  if (typeStr.includes("SUBSCRIBERS")) return "Subscribers";
  if (typeStr.includes("VIEW")) return "Views";
  return "YouTube";
}

/**
 * Checks if a platform is related to YouTube Subscribers
 */
export function isYoutubeSubscriberPlatform(platform: string): boolean {
  const platformUpper = String(platform).toUpperCase();
  return (
    platformUpper === "YOUTUBE_SUBSCRIBERS" ||
    (platformUpper.includes("YOUTUBE") && !platformUpper.includes("VIEW"))
  );
}

/**
 * Checks if a platform is related to YouTube Views
 */
export function isYoutubeViewsPlatform(platform: string): boolean {
  const platformUpper = String(platform).toUpperCase();
  return (
    platformUpper === "YOUTUBE_VIEWS" ||
    (platformUpper.includes("YOUTUBE") && platformUpper.includes("VIEW"))
  );
}

/**
 * Standardizes a platform string to a valid PlatformType
 */
export function standardizePlatform(platform: string): PlatformType {
  const platformUpper = String(platform).toUpperCase();

  if (
    platformUpper === "YOUTUBE_SUBSCRIBERS" ||
    isYoutubeSubscriberPlatform(platformUpper)
  ) {
    return "YOUTUBE_SUBSCRIBERS";
  }

  if (
    platformUpper === "YOUTUBE_VIEWS" ||
    isYoutubeViewsPlatform(platformUpper)
  ) {
    return "YOUTUBE_VIEWS";
  }

  if (platformUpper.includes("TELEGRAM") && platformUpper.includes("CHANNEL")) {
    return "TELEGRAM_CHANNEL";
  }

  if (platformUpper.includes("TELEGRAM") && platformUpper.includes("GROUP")) {
    return "TELEGRAM_GROUP";
  }

  if (platformUpper === "X" || platformUpper === "TWITTER") {
    return "X";
  }

  if (platformUpper === "DISCORD") {
    return "DISCORD";
  }

  if (platformUpper === "X_RETWEET" || platformUpper === "TWITTER_RETWEET") {
    return "X_RETWEET";
  }

  // Default case, return as is if it's already a valid PlatformType
  return platform as PlatformType;
}

export const getPlatformBaseUrl = (platform: PlatformType): string => {
  switch (platform) {
    case "TELEGRAM_CHANNEL":
    case "TELEGRAM_GROUP":
      return "https://t.me/";
    case "X":
      return "https://x.com/";
    case "YOUTUBE_SUBSCRIBERS":
      return "https://youtube.com/channel/";
    case "YOUTUBE_VIEWS":
      return "https://youtube.com/watch?v=";
    case "DISCORD":
      return "https://discord.gg/";
    case "X_RETWEET":
      return "https://x.com/";
    default:
      return "";
  }
};

/**
 * Safely calls WebApp BackButton methods with proper null checks
 */
export const safeWebAppBackButton = {
  show: (webApp: any) => {
    if (webApp?.BackButton && typeof webApp.BackButton.show === "function") {
      try {
        webApp.BackButton.show();
      } catch (error) {
        console.warn("Error calling WebApp.BackButton.show:", error);
      }
    }
  },

  hide: (webApp: any) => {
    if (webApp?.BackButton && typeof webApp.BackButton.hide === "function") {
      try {
        webApp.BackButton.hide();
      } catch (error) {
        console.warn("Error calling WebApp.BackButton.hide:", error);
      }
    }
  },

  onClick: (webApp: any, callback: () => void) => {
    if (webApp?.BackButton && typeof webApp.BackButton.onClick === "function") {
      try {
        webApp.BackButton.onClick(callback);
      } catch (error) {
        console.warn("Error calling WebApp.BackButton.onClick:", error);
      }
    }
  },

  offClick: (webApp: any, callback: () => void) => {
    if (
      webApp?.BackButton &&
      typeof webApp.BackButton.offClick === "function"
    ) {
      try {
        webApp.BackButton.offClick(callback);
      } catch (error) {
        console.warn("Error calling WebApp.BackButton.offClick:", error);
      }
    }
  },
};

/**
 * Safely calls WebApp methods with proper null checks
 */
export const safeWebApp = {
  enableClosingConfirmation: (webApp: any) => {
    if (webApp && typeof webApp.enableClosingConfirmation === "function") {
      try {
        webApp.enableClosingConfirmation();
      } catch (error) {
        console.warn("Error calling WebApp.enableClosingConfirmation:", error);
      }
    }
  },

  disableClosingConfirmation: (webApp: any) => {
    if (webApp && typeof webApp.disableClosingConfirmation === "function") {
      try {
        webApp.disableClosingConfirmation();
      } catch (error) {
        console.warn("Error calling WebApp.disableClosingConfirmation:", error);
      }
    }
  },
};
