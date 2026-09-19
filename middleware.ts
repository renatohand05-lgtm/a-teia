import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

function isLoggedIn(req: { auth?: { user?: { id?: string | null } | null } | null }) {
  return Boolean(req.auth?.user?.id);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/cron") ||
    pathname === "/api/integrations/status" ||
    pathname === "/favicon.ico" ||
    pathname === "/logo-teia.png";

  const loggedIn = isLoggedIn(req);

  if (isPublic) {
    if (loggedIn && pathname === "/login") {
      return NextResponse.redirect(new URL("/cockpit", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!loggedIn) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
