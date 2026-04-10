"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/",
      });

      if (!result || result.error) {
        setError("Credenciales invalidas");
        return;
      }

      router.push(result.url || "/");
      router.refresh();
    } catch {
      setError("Error de conexion. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesion</h1>
        <p className="mt-1 text-sm text-slate-600">Accede con tu usuario para ver tu vista por rol.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Correo</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-cyan-400 focus:ring-2"
              placeholder="admin@demo.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-cyan-400 focus:ring-2"
            />
          </label>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
