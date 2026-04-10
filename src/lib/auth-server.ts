import { redirect } from "next/navigation";
import { auth } from "../auth";
import { canAccessDashboardDetail, isAdmin, roleHomePath, type AppRole } from "./auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }
  return session;
}

export async function requireRoles(roles: AppRole[]) {
  const session = await requireUser();
  const role = session.user.role as AppRole;
  if (!roles.includes(role)) {
    redirect(roleHomePath(role));
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  const role = session.user.role as AppRole;
  if (!isAdmin(role)) {
    redirect(roleHomePath(role));
  }
  return session;
}

export async function requireDashboardViewer() {
  const session = await requireUser();
  const role = session.user.role as AppRole;
  if (!canAccessDashboardDetail(role)) {
    redirect(roleHomePath(role));
  }
  return session;
}
