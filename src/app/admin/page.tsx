export default function AdminHomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Panel Admin</h2>
        <p className="mt-2 text-sm text-slate-600">
          Desde aqui puedes administrar usuarios, evaluaciones, grupos y asignaciones globales.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/admin/participants" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Participantes</a>
          <a href="/admin/evaluations" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Evaluaciones</a>
          <a href="/admin/dashboards" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Dashboards</a>
        </div>
      </div>
    </section>
  );
}
