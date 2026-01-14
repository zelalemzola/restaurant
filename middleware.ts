import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

function hasBetterAuthSession(request: NextRequest) {
  // Use Better Auth's default cookie detection. It already handles the
  // "__Secure-" prefix in production when using the default config.
  const cookie = getSessionCookie(request);
  return Boolean(cookie);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and public pages
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/register" ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // If already authenticated, don't allow staying on /login (prevents blank screen loops)
  if (pathname === "/login" && hasBetterAuthSession(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // For protected routes, require a session cookie
  if (pathname.startsWith("/dashboard") && !hasBetterAuthSession(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
