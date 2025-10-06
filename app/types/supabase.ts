import { PlatformType } from "./Customer";

import { ServiceType } from "./Customer";

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          customer_name: string;
          email: string | null;
          social_tasks: {
            [key: string]: {
              enabled: boolean;
              clicks: number;
              links: string[];
            };
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_name: string;
          email?: string | null;
          social_tasks?: {
            [key: string]: {
              enabled: boolean;
              clicks: number;
              links: string[];
            };
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_name?: string;
          email?: string | null;
          social_tasks?: {
            [key: string]: {
              enabled: boolean;
              clicks: number;
              links: string[];
            };
          };
          created_at?: string;
          updated_at?: string;
        };
      };
      customer_social_links: {
        Row: {
          id: string;
          customer_id: string;
          customer_name: string;
          platform: PlatformType;
          platform_name: string;
          link_url: string;
          is_primary: boolean;
          enabled: boolean;
          clicks: number;
          type: ServiceType;
          engagements: {
            views: number;
            follows: number;
            shares: number;
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          customer_name: string;
          platform: PlatformType;
          platform_name: string;
          link_url: string;
          is_primary?: boolean;
          enabled?: boolean;
          clicks?: number;
          type: ServiceType;
          engagements?: {
            views: number;
            follows: number;
            shares: number;
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          customer_name?: string;
          platform?: PlatformType;
          platform_name?: string;
          link_url?: string;
          is_primary?: boolean;
          enabled?: boolean;
          clicks?: number;
          type?: ServiceType;
          engagements?: {
            views: number;
            follows: number;
            shares: number;
          };
          created_at?: string;
          updated_at?: string;
        };
      };
      campaign_completions: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string;
          completed_at: string;
          claimed_at: string | null;
          rewards_claimed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_id: string;
          completed_at?: string;
          claimed_at?: string | null;
          rewards_claimed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_id?: string;
          completed_at?: string;
          claimed_at?: string | null;
          rewards_claimed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
