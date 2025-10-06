import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Simple password list
const VALID_PASSWORDS = ["admin123", "partner123", "phoenix2024"];

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    if (!VALID_PASSWORDS.includes(password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Set simple session cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "nexus_auth",
      value: "authenticated",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
