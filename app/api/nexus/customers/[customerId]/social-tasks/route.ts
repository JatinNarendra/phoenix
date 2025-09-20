import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { taskId, updates } = await request.json();

    const { error } = await supabase!
      .from("customer_social_links")
      .update({
        link_url: updates.linkUrl,
        rewards: updates.rewards,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("customer_id", (await params).customerId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating social task:", error);
    return NextResponse.json(
      { error: "Failed to update social task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const { platform, linkIndex } = await request.json();

    // Validate required fields
    if (!platform || linkIndex === undefined) {
      return NextResponse.json(
        { error: "Platform and linkIndex are required" },
        { status: 400 }
      );
    }

    // Get the social link to delete
    const { data: socialLinks, error: fetchError } = await supabase!
      .from("customer_social_links")
      .select("id, link_url")
      .eq("customer_id", customerId)
      .eq("platform", platform)
      .order("created_at", { ascending: true });

    if (fetchError) throw fetchError;

    if (!socialLinks || linkIndex >= socialLinks.length) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const linkToDelete = socialLinks[linkIndex];

    // Delete the specific link
    const { error: deleteError } = await supabase!
      .from("customer_social_links")
      .delete()
      .eq("id", linkToDelete.id)
      .eq("customer_id", customerId);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: "Social link deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting social link:", error);
    return NextResponse.json(
      { error: "Failed to delete social link" },
      { status: 500 }
    );
  }
}
