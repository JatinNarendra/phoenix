import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("nexus_auth")?.value;
    
    return NextResponse.json({ 
      authenticated: session === "authenticated" 
    });
  } catch (error) {
    console.error("Error checking session:", error);
    return NextResponse.json({ authenticated: false });
  }
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    // Simple password list (same as login endpoint)
    const VALID_PASSWORDS = ["admin123", "partner123", "phoenix2024"];
    
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
    console.error("Error in session POST:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
