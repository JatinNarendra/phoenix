import { ServiceType, Customer, PlatformType } from "../types/Customer";
import { calculateServiceTypeMetrics } from "./metrics";

// Map platforms to their service types
export const platformToServiceType: Record<PlatformType, ServiceType> = {
  X: "X",
  TELEGRAM_CHANNEL: "TELEGRAM_CHANNEL",
  TELEGRAM_GROUP: "TELEGRAM_GROUP",
  YOUTUBE_SUBSCRIBERS: "YOUTUBE_SUBSCRIBERS",
  YOUTUBE_VIEWS: "YOUTUBE_VIEWS",
};

// Map service types to their display properties
export const serviceTypeConfig = {
  TELEGRAM_CHANNEL: {
    label: "Telegram Channel",
    description: "Track direct link clicks and visits",
    metrics: ["clicks"] as const,
  },
  TELEGRAM_GROUP: {
    label: "Telegram Group",
    description: "Track social media following and engagement",
    metrics: ["follows", "shares"] as const,
  },
  YOUTUBE_VIEWS: {
    label: "Youtube Views",
    description: "Track content consumption and engagement",
    metrics: ["views", "shares"] as const,
  },
  YOUTUBE_SUBSCRIBERS: {
    label: "Youtube Subscribers",
    description: "Track content consumption and engagement",
    metrics: ["subscribers"] as const,
  },
} as const;

// Platform categorization
export const platformCategories = {
  TELEGRAM_CHANNEL: ["telegram"] as const,
  X: ["x"] as const,
  YOUTUBE_VIEWS: ["youtube", "twitch"] as const,
} as const;

export function calculateServiceMetrics(customers: Customer[]) {
  const metrics = new Map<
    string,
    {
      type: ServiceType;
      platform: PlatformType;
      activeUsers: number;
      totalEngagements: {
        clicks: number;
      };
    }
  >();

  customers.forEach((customer) => {
    Object.entries(customer.socialTasks).forEach(([platform, task]) => {
      if (task.enabled) {
        const platformKey = platform as PlatformType;
        const type = platformToServiceType[platformKey];
        const key = `${type}-${platform}`;

        if (!metrics.has(key)) {
          metrics.set(key, {
            type,
            platform: platformKey,
            activeUsers: 1,
            totalEngagements: {
              clicks: task.clicks || 0,
            },
          });
        } else {
          const current = metrics.get(key)!;
          metrics.set(key, {
            ...current,
            activeUsers: current.activeUsers + 1,
            totalEngagements: {
              clicks: current.totalEngagements.clicks + (task.clicks || 0),
            },
          });
        }
      }
    });
  });

  return Array.from(metrics.values());
}

export { calculateServiceTypeMetrics };
