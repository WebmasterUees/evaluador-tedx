import Link from "next/link";
import type { ReactNode } from "react";
import LogoutButton from "../../components/LogoutButton";
import NavLink from "../../components/NavLink";
import { requireAdmin } from "../../lib/auth-server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Administrador</p>
            <h1 className="text-lg font-semibold text-slate-900">{session.user.email}</h1>
          </div>
          <div className="flex items-center gap-2">
            <NavLink href="/admin" exact>
              Inicio
            </NavLink>
            <NavLink href="/admin/participants">Participantes</NavLink>
            <NavLink href="/admin/evaluations">Evaluaciones</NavLink>
            <NavLink href="/admin/dashboards">Dashboards</NavLink>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
