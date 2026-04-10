import Link from "next/link";
import type { ReactNode } from "react";
import LogoutButton from "../../components/LogoutButton";
import { requireRoles } from "../../lib/auth-server";

export default async function EvaluatorLayout({ children }: { children: ReactNode }) {
  const session = await requireRoles(["EVALUATOR"]);

  return (
    <main className="min-h-screen bg-[#ececf4]">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <h1 className="text-sm font-semibold text-slate-700">Evaluador: {session.user.email}</h1>
          <div className="flex items-center gap-2">
            <Link href="/evaluator" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Ver mis evaluaciones</Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
