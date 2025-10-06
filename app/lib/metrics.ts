import { Customer, ServiceType, PlatformType } from "../types/Customer";

export interface ServiceMetrics {
  totalEngagements: number;
  activeUsers: number;
  platformBreakdown: {
    [key: string]: {
      clicks: number;
      views?: number;
      follows?: number;
      shares?: number;
    };
  };
}

// Helper function to create empty metrics
export function createEmptyMetrics(): ServiceMetrics {
  return {
    totalEngagements: 0,
    activeUsers: 0,
    platformBreakdown: {},
  };
}

// Map platforms to their default service types
const platformToServiceType: Record<PlatformType, ServiceType> = {
  TELEGRAM_CHANNEL: "TELEGRAM_CHANNEL",
  X: "X",
  YOUTUBE_VIEWS: "YOUTUBE_VIEWS",
  TELEGRAM_GROUP: "TELEGRAM_GROUP",
  YOUTUBE_SUBSCRIBERS: "YOUTUBE_SUBSCRIBERS",
  DISCORD: "DISCORD",
  X_RETWEET: "X_RETWEET",
};

export function calculateServiceTypeMetrics(
  customers: Customer[]
): Record<ServiceType, ServiceMetrics> {
  // Initialize metrics with all service types
  const metrics: Record<ServiceType, ServiceMetrics> = {
    YOUTUBE_VIEWS: createEmptyMetrics(),
    YOUTUBE_SUBSCRIBERS: createEmptyMetrics(),
    TELEGRAM_CHANNEL: createEmptyMetrics(),
    TELEGRAM_GROUP: createEmptyMetrics(),
    X: createEmptyMetrics(),
    DISCORD: createEmptyMetrics(),
    X_RETWEET: createEmptyMetrics(),
  };

  customers.forEach((customer) => {
    Object.entries(customer.socialTasks).forEach(([platform, task]) => {
      if (task?.enabled) {
        // Get the service type based on platform
        const serviceType = platformToServiceType[platform as PlatformType];
        const metric = metrics[serviceType];

        if (metric) {
          metric.activeUsers++;
          metric.totalEngagements += task.clicks || 0;

          // Add null checks for engagements

          metric.platformBreakdown[platform] = {
            clicks:
              (metric.platformBreakdown[platform]?.clicks || 0) +
              (task.clicks || 0),
          };
        }
      }
    });
  });

  return metrics;
}

export function getServiceTypeDescription(
  type: ServiceType,
  metrics: ServiceMetrics
): string {
  const totalEngagements = Object.values(metrics.platformBreakdown).reduce(
    (acc, curr) =>
      acc +
      (type === "YOUTUBE_VIEWS"
        ? curr.views || 0
        : type === "YOUTUBE_SUBSCRIBERS"
        ? curr.follows || 0
        : type === "TELEGRAM_CHANNEL"
        ? curr.follows || 0
        : curr.clicks || 0),
    0
  );

  return `${metrics.activeUsers} active services with ${totalEngagements} ${
    type === "YOUTUBE_VIEWS"
      ? "views"
      : type === "YOUTUBE_SUBSCRIBERS"
      ? "subscribers"
      : type === "TELEGRAM_CHANNEL"
      ? "follows"
      : "clicks"
  }`;
}
