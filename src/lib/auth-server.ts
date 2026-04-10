import { redirect } from "next/navigation";
import { auth } from "../auth";
import { roleHomePath, type AppRole } from "./auth";

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
