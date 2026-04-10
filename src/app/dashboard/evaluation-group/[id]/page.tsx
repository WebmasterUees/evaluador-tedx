import LiveDashboardPanel from "../../../../components/dashboard/LiveDashboardPanel";
import { redirect } from "next/navigation";
import { requireRoles } from "../../../../lib/auth-server";
import { isEvaluatorWorkComplete, getWeightedResultsByGroup } from "../../../../lib/evaluator-progress";
import { prisma } from "../../../../lib/prisma";

export default async function EvaluationGroupDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ definition?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await requireRoles(["EVALUATOR", "ADMIN", "OPERATOR"]);

  let definitionId = query.definition;
  if (!definitionId) {
    const firstDefinition = await prisma.evaluationDefinition.findFirst({
      where: { evaluation_group_id: id },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (firstDefinition?.id) {
      redirect(`/dashboard/evaluation-group/${id}?definition=${firstDefinition.id}`);
    }
  }

  if (session.user.role === "EVALUATOR") {
    const completed = await isEvaluatorWorkComplete(session.user.id, id, definitionId);
    if (!completed) {
      return (
        <section className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h1 className="text-xl font-semibold text-amber-900">Dashboard bloqueado</h1>
            <p className="mt-2 text-sm text-amber-800">Por favor completa todas tus evaluaciones asignadas para ver tu dashboard.</p>
          </div>
        </section>
      );
    }
  }

  const [group, results] = await Promise.all([
    prisma.evaluationGroup.findUnique({ where: { id } }),
    getWeightedResultsByGroup(id, definitionId),
  ]);

  return (
    <LiveDashboardPanel
      evaluationGroupId={id}
      evaluationDefinitionId={definitionId}
      initialGroupName={group?.name || "Grupo"}
      initialResults={results}
    />
  );
}
