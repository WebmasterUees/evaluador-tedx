import Link from "next/link";
import type { ReactNode } from "react";
import LogoutButton from "../../components/LogoutButton";
import { requireRoles } from "../../lib/auth-server";

export default async function OperadorLayout({ children }: { children: ReactNode }) {
  const session = await requireRoles(["OPERATOR", "ADMIN"]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Resultados</p>
            <h1 className="text-lg font-semibold text-slate-900">{session.user.email}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/operador" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Inicio</Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
