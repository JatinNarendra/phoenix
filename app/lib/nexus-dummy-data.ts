import { Customer, SocialTaskLink } from "@/app/types/Customer";

// Platform types as string literals
type PlatformTypeString = 
  | "TELEGRAM_CHANNEL"
  | "TELEGRAM_GROUP"
  | "X"
  | "YOUTUBE_VIEWS" 
  | "YOUTUBE_SUBSCRIBERS";

// Simplified local interface just for the dummy data generator
interface SocialTaskLocal {
  enabled: boolean;
  clicks: number;
  links: SocialTaskLink[];
  linkStatuses?: { 
    [index: number]: { 
      enabled: boolean; 
      clicks: number; 
    } 
  };
}

// Generate a random date within the last 60 days
const getRandomDate = () => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 60);
  now.setDate(now.getDate() - daysAgo);
  return now;
};

// Generate random clicks (0-200)
const getRandomClicks = () => Math.floor(Math.random() * 200);

// Generate a random boolean with weight towards true
const getRandomBoolean = (trueWeight = 0.7) => Math.random() < trueWeight;

// Generate a random social task
const generateSocialTask = (platform: PlatformTypeString): SocialTaskLocal => {
  const enabled = getRandomBoolean();
  return {
    enabled,
    clicks: enabled ? getRandomClicks() : 0,
    links: enabled
      ? [
          {
            id: `dummy-${platform}-${Math.random().toString(36).substring(2, 9)}`,
            enabled: true,
            link_url: `https://example.com/${platform.toLowerCase()}`,
          },
        ]
      : [],
  };
};

// Generate a dummy customer
const generateDummyCustomer = (id: number): Customer => {
  const customerName = `Customer ${id}`;
  const slug = `customer-${id}`;
  
  return {
    id: id.toString(),
    customer_name: customerName,
    logo_url: null,
    slug,
    email: `customer${id}@example.com`,
    socialTasks: {
      TELEGRAM_CHANNEL: generateSocialTask("TELEGRAM_CHANNEL"),
      TELEGRAM_GROUP: generateSocialTask("TELEGRAM_GROUP"),
      X: generateSocialTask("X"),
      YOUTUBE_VIEWS: generateSocialTask("YOUTUBE_VIEWS"),
      YOUTUBE_SUBSCRIBERS: generateSocialTask("YOUTUBE_SUBSCRIBERS"),
    },
    createdAt: getRandomDate(),
    updatedAt: getRandomDate(),
  };
};

// Generate dummy customers
export const generateDummyCustomers = (count: number = 10): Customer[] => {
  return Array.from({ length: count }, (_, i) => generateDummyCustomer(i + 1));
};

// Generate dummy platform totals
export const generateDummyPlatformTotals = () => {
  return {
    telegramChannel: Math.floor(Math.random() * 30) + 10,
    telegramGroup: Math.floor(Math.random() * 20) + 5,
    x: Math.floor(Math.random() * 15) + 3,
    youtubeViews: Math.floor(Math.random() * 12) + 2,
    youtubeSubscribers: Math.floor(Math.random() * 10) + 1,
    telegramChannelInactive: Math.floor(Math.random() * 5) + 1,
    telegramGroupInactive: Math.floor(Math.random() * 4) + 1,
    xInactive: Math.floor(Math.random() * 3) + 1,
    youtubeViewsInactive: Math.floor(Math.random() * 2) + 1,
    youtubeSubscribersInactive: Math.floor(Math.random() * 2) + 1,
  };
}; 