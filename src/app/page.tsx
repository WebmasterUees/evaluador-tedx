import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../auth";
import { roleHomePath } from "../lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.role) {
    redirect(roleHomePath(session.user.role));
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <section className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Evaluador TEDx</h1>
        <p className="text-slate-600">
          {session?.user?.role ? `Sesion activa: ${session.user.email} (${session.user.role})` : "Debes iniciar sesion para continuar."}
        </p>
        <div className="flex flex-wrap gap-3">
          {session?.user?.role ? (
            <Link
              href={roleHomePath(session.user.role)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Ir a mi panel
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Ir a login
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
