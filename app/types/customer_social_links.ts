import { PlatformType, ServiceType } from "./Customer";

export interface CustomerSocialLink {
  id: string;
  customerId: string;
  platform: PlatformType;
  platform_name: string;
  linkUrl: string;
  isPrimary: boolean;
  isEnabled: boolean;
  clicks: number;
  type: ServiceType;
  engagements: {
    views: number;
    follows: number;
    shares: number;
  };
}
