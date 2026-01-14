import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

function hasBetterAuthSession(request: NextRequest) {
  // Better Auth uses "__Secure-" prefix for cookies on HTTPS in production.
  // This helper reads the right cookie name(s) based on the request + env.
  const cookie = getSessionCookie(request, {
    cookiePrefix: process.env.NODE_ENV === "production" ? "__Secure-" : undefined,
  });
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
