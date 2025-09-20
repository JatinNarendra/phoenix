import { ServiceType, PlatformType } from "./Customer";

export interface ServiceMetric {
  type: ServiceType;
  platform: PlatformType;
  activeUsers: number;
  totalEngagements: number;
}

export interface DashboardMetrics {
  totalCustomers: number;
  activeCustomers: number;
  totalServices: number;
  servicesByType: {
    [key in ServiceType]: number;
  };
  serviceMetrics: ServiceMetric[];
}
