import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/register", "/verify"];

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (pathname.startsWith("/api/auth") || isPublic) return NextResponse.next();

  if (!req.auth) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
