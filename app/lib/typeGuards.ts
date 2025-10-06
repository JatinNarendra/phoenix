import {
  Customer,
  SocialTaskConfig,
  WebsiteTaskConfig,
} from "@/app/types/Customer";
import { getAggregatedSocialTasks } from "@/app/lib/supabase/queries";

export interface DatabaseCustomer {
  id: string;
  customer_name: string;
  logo_url: string;
  slug: string;
  email: string | null;
  campaign_name?: string;
  campaign_details?: string;
  campaign_sparks?: number;
  campaign_spins?: number;
  social_tasks: {
    [K in keyof Customer["socialTasks"]]: SocialTaskConfig;
  };
  website_tasks: WebsiteTaskConfig;
  created_at: string;
  updated_at: string;
}

export async function mapDatabaseCustomerToCustomer(
  dbCustomer: DatabaseCustomer
): Promise<Customer> {
  if (!dbCustomer?.customer_name) {
    console.warn(`Missing customer name for ID: ${dbCustomer?.id}`);
  }

  // Fetch social tasks from customer_social_links instead
  const socialTasks = await getAggregatedSocialTasks(dbCustomer.id);

  return {
    id: dbCustomer.id,
    customer_name: dbCustomer.customer_name || "Unnamed Customer",
    logo_url: dbCustomer.logo_url || null,
    slug: dbCustomer.slug,
    email: dbCustomer.email,
    campaign_name: dbCustomer.campaign_name,
    campaign_details: dbCustomer.campaign_details,
    campaign_sparks: dbCustomer.campaign_sparks,
    campaign_spins: dbCustomer.campaign_spins,
    socialTasks,
    createdAt: new Date(dbCustomer.created_at),
    updatedAt: new Date(dbCustomer.updated_at),
  };
}

export function isSocialTaskConfig(obj: unknown): obj is SocialTaskConfig {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "enabled" in obj &&
    "links" in obj &&
    "clicks" in obj &&
    "type" in obj
  );
}
