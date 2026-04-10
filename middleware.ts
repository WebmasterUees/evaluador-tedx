import { NextResponse } from "next/server";
import { auth } from "./src/auth";
import { canAccessAdmin, roleHomePath, type AppRole } from "./src/lib/auth";

function startsWith(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const role = request.auth?.user?.role as AppRole | undefined;

  const isAuthRoute = pathname.startsWith("/api/auth");
  if (isAuthRoute) {
    return NextResponse.next();
  }

  if (pathname === "/login" && role) {
    return NextResponse.redirect(new URL(roleHomePath(role), request.url));
  }

  const needsAdminOrOperator = startsWith(pathname, ["/admin", "/dashboards"]);
  const needsEvaluator = startsWith(pathname, ["/evaluator"]);
  const needsAnyAuth = startsWith(pathname, ["/dashboard"]);

  if ((needsAdminOrOperator || needsEvaluator || needsAnyAuth) && !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (role && needsAdminOrOperator && !canAccessAdmin(role)) {
    return NextResponse.redirect(new URL(roleHomePath(role), request.url));
  }

  if (role && needsEvaluator && role !== "EVALUATOR") {
    return NextResponse.redirect(new URL(roleHomePath(role), request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
