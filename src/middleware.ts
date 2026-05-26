import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/students",
  "/learn",
  "/tutor",
  "/onboarding",
  "/diagnostic",
  "/skill-profile",
  "/admin",
];

const authRoutes = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // In demo mode, allow all routes
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  const token = request.cookies.get("mathpath_token")?.value;

  // Protected routes: redirect to login if no token (unless demo mode)
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  if (isProtected && !token && !isDemoMode) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes: redirect to dashboard if already logged in
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/students/:path*",
    "/learn/:path*",
    "/tutor/:path*",
    "/onboarding/:path*",
    "/diagnostic/:path*",
    "/skill-profile/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
