import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PlatformType, ServiceType } from "@/app/types/Customer";
import { getPlatformName } from "@/app/lib/platformUtils";

// Create a service role client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET() {
  try {
    const { data: customers, error } = await supabaseAdmin
      .from("customers")
      .select(
        `
        *,
        customer_social_links (
          id,
          platform,
          link_url,
          enabled,
          
          engagements
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, slug, logo_url } = await request.json();

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!slug?.trim()) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Validate slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid slug format" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const { data: existingCustomer, error: slugCheckError } =
      await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("slug", slug)
        .single();

    if (slugCheckError && slugCheckError.code !== "PGRST116") {
      throw slugCheckError;
    }

    if (existingCustomer) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 400 }
      );
    }

    // Create customer
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .insert({
        customer_name: name.trim(),
        slug: slug.trim(),
        logo_url: logo_url || null,
      })
      .select()
      .single();

    if (customerError) throw customerError;

    // Create default social links for platforms
    const defaultPlatforms = [
      { platform: "TELEGRAM_CHANNEL", type: "TELEGRAM_CHANNEL" as ServiceType },
      { platform: "X", type: "X" as ServiceType },
      { platform: "YOUTUBE_VIEWS", type: "YOUTUBE_VIEWS" as ServiceType },
    ];

    const socialLinksPromises = defaultPlatforms.map(({ platform, type }) =>
      supabaseAdmin.from("customer_social_links").insert({
        customer_id: customer.id,
        platform,
        platform_name: getPlatformName(platform as PlatformType),
        link_url: "",
        enabled: false,
        clicks: 0,
        type,
        display_order: 0,
        rewards: {
          coins: 0,
          spins: 0,
        },
        completion_status: {
          completed_at: null,
          completed_by: [],
        },
        task_requirements: {
          verification_type: "AUTOMATIC",
          required_duration_seconds: 0,
          required_engagement_count: 0,
        },
        engagements: {
          views: 0,
        },
      })
    );

    await Promise.all(socialLinksPromises);

    // Return customer with social links
    const { data: customerWithLinks } = await supabaseAdmin
      .from("customers")
      .select(
        `
        *,
        customer_social_links (*)
      `
      )
      .eq("id", customer.id)
      .single();

    return NextResponse.json(customerWithLinks);
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
