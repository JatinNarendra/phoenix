import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow all /nexus routes to pass through - authentication is handled in the layout
  // This allows the AccessCodeModal to be shown when needed
  if (pathname.startsWith("/nexus")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/nexus/:path*"],
};
