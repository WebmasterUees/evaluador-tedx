import { createHash } from "node:crypto";

export type AppRole = "ADMIN" | "OPERATOR" | "EVALUATOR";

export function hashPassword(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function roleHomePath(role: AppRole): string {
  if (role === "ADMIN") return "/admin";
  if (role === "OPERATOR") return "/operador";
  return "/evaluator";
}

export function canAccessAdmin(role: AppRole): boolean {
  return role === "ADMIN" || role === "OPERATOR";
}

export function isAdmin(role: AppRole): boolean {
  return role === "ADMIN";
}

export function canAccessOperatorResults(role: AppRole): boolean {
  return role === "ADMIN" || role === "OPERATOR";
}

export function canAccessDashboardDetail(role: AppRole): boolean {
  return role === "ADMIN" || role === "OPERATOR" || role === "EVALUATOR";
}
