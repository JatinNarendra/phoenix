import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create a service role client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required Supabase environment variables:", {
    url: !!supabaseUrl,
    serviceKey: !!supabaseServiceKey,
  });
}

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: "public",
        },
      })
    : null;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database connection not configured" },
        { status: 500 }
      );
    }

    const { customerId } = await params;

    const { data: customer, error } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database connection not configured" },
        { status: 500 }
      );
    }

    const { customerId } = await params;
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

    // Check if slug already exists (excluding current customer)
    const { data: existingCustomer, error: slugCheckError } =
      await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("slug", slug)
        .neq("id", customerId)
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

    // Update customer
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .update({
        customer_name: name.trim(),
        slug: slug.trim(),
        logo_url: logo_url || null,
      })
      .eq("id", customerId)
      .select()
      .single();

    if (customerError) throw customerError;

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  console.log("DELETE method called for customer:", customerId);
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database connection not configured" },
        { status: 500 }
      );
    }
    console.log("Customer ID:", customerId);
    const { password } = await request.json();
    console.log("Password provided:", !!password);

    // Validate password (you can customize this validation)
    if (!password || password.trim() === "") {
      return NextResponse.json(
        { error: "Password is required for deletion" },
        { status: 400 }
      );
    }

    // Check if customer exists
    const { data: customer, error: customerCheckError } = await supabaseAdmin
      .from("customers")
      .select("id, customer_name")
      .eq("id", customerId)
      .single();

    if (customerCheckError) {
      if (customerCheckError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
      throw customerCheckError;
    }

    // First, get all social link IDs for this customer
    const { data: socialLinks, error: socialLinksError } = await supabaseAdmin
      .from("customer_social_links")
      .select("id")
      .eq("customer_id", customerId);

    if (socialLinksError) {
      console.error("Error fetching social links:", socialLinksError);
      throw socialLinksError;
    }

    // Delete user_task_completions that reference these social links
    if (socialLinks && socialLinks.length > 0) {
      const socialLinkIds = socialLinks.map((link) => link.id);
      const { error: taskCompletionsError } = await supabaseAdmin
        .from("user_task_completions")
        .delete()
        .in("task_id", socialLinkIds);

      if (taskCompletionsError) {
        console.error("Error deleting task completions:", taskCompletionsError);
        // Continue anyway - this might not be critical
      }
    }

    // Delete customer (this will cascade delete social links)
    const { error: deleteError } = await supabaseAdmin
      .from("customers")
      .delete()
      .eq("id", customerId);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: `Customer "${customer.customer_name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting customer:", error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    }

    // Return more specific error information
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to delete customer",
        details: errorMessage,
        customerId: customerId,
      },
      { status: 500 }
    );
  }
}
