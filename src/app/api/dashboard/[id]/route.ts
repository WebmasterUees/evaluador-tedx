import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { canAccessDashboardDetail } from "../../../../lib/auth";
import { isEvaluatorWorkComplete, getWeightedResultsByGroup } from "../../../../lib/evaluator-progress";
import { prisma } from "../../../../lib/prisma";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await context.params;
  const url = new URL(_.url);
  const definitionId = url.searchParams.get("definition") || undefined;

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessDashboardDetail(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!definitionId) {
    return NextResponse.json({ error: "Missing required parameter: definition" }, { status: 400 });
  }

  if (session.user.role === "EVALUATOR") {
    const completed = await isEvaluatorWorkComplete(session.user.id, id, definitionId);
    if (!completed) {
      return NextResponse.json(
        {
          locked: true,
          message: "Por favor completa todas tus evaluaciones asignadas para ver tu dashboard.",
        },
        { status: 403 },
      );
    }
  }

  const [group, results] = await Promise.all([
    prisma.evaluationGroup.findUnique({ where: { id } }),
    getWeightedResultsByGroup(id, definitionId),
  ]);

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    group: { id: group.id, name: group.name },
    results,
  });
}