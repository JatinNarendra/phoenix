import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    console.log("Logout API called");
    const cookieStore = await cookies();
    
    // Clear the nexus_auth cookie (matches current authentication system)
    cookieStore.set({
      name: "nexus_auth",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      path: "/",
    });
    
    console.log("Authentication cookie cleared");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in logout API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ success: true });
}
