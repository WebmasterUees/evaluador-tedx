import Link from "next/link";
import { prisma } from "../../lib/prisma";

export default async function ResultsViewBrowser() {
  const groups = await prisma.evaluationGroup.findMany({
    include: {
      evaluation_definitions: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Resultados</h2>
        <p className="mt-2 text-sm text-slate-600">
          No hay grupos de evaluacion disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Resultados por grupo</h2>
      <div className="mt-4 space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="rounded-xl border border-slate-200 p-4">
            <div>
              <p className="font-semibold text-slate-900">{group.name}</p>
              <p className="text-sm text-slate-600">{group.description || "Sin descripcion"}</p>
            </div>
            <div className="mt-3 space-y-2">
              {group.evaluation_definitions.length > 0 ? (
                group.evaluation_definitions.map((definition) => (
                  <div key={definition.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-800">{definition.title}</p>
                    <Link
                      href={`/dashboard/evaluation-group/${group.id}?definition=${definition.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      Ver dashboard
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Sin evaluaciones asociadas.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
