export type SocialServiceName = "telegram" | "x" | "youtube";

export type SocialTaskKey = SocialServiceName;

export interface SocialTaskConfig {
  enabled: boolean;
  links: string[];
  type?: string;
  clicks?: number;
  linkStatuses: {
    [key: number]: {
      enabled: boolean;
    };
  };
  engagements?: {
    views: number;
    follows: number;
    shares: number;
  };
}
