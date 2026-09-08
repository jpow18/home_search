import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const [username, suppliedPassword] = atob(authorization.slice(6)).split(":");
      if (username === "owner" && suppliedPassword === password) return NextResponse.next();
    } catch {
      // The browser will receive a fresh login prompt below.
    }
  }

  return new NextResponse("HomeSeek is private.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="HomeSeek"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron).*)"],
};
