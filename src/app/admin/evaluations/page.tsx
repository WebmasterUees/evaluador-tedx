import { revalidatePath } from "next/cache";
import EvaluationDefinitionForm from "../../../components/admin/EvaluationDefinitionForm";
import { requireRoles } from "../../../lib/auth-server";
import { prisma } from "../../../lib/prisma";

const db = prisma as any;

type QuestionInput = {
  text: string;
  weight: string;
  scale_min: string;
  scale_max: string;
};

async function createEvaluation(formData: FormData) {
  "use server";

  await requireRoles(["ADMIN", "OPERATOR"]);
  const editingId = String(formData.get("editing_id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const creator_id = String(formData.get("creator_id") || "");
  const evaluation_group_id = String(formData.get("evaluation_group_id") || "");
  const evaluator_ids = Array.from(
    new Set(
      formData
        .getAll("evaluator_ids")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );
  const participant_ids = formData.getAll("participant_ids").map((value) => String(value));
  const questions_json = String(formData.get("questions_json") || "[]");

  let parsedQuestions: QuestionInput[];
  try {
    parsedQuestions = JSON.parse(questions_json) as QuestionInput[];
  } catch {
    return;
  }
  const validQuestions = parsedQuestions
    .map((q) => ({
      text: String(q.text || "").trim(),
      weight: Number(q.weight || 1),
      scale_min: Number(q.scale_min || 1),
      scale_max: Number(q.scale_max || 10),
    }))
    .filter((q) => q.text.length > 0);

  if (!title || !creator_id || !evaluation_group_id || evaluator_ids.length === 0 || validQuestions.length === 0) {
    return;
  }

  const groupParticipants = (await db.groupParticipant.findMany({
    where: { evaluation_group_id },
    select: { participant_id: true },
  })) as Array<{ participant_id: string }>;

  const participantIdsToUse: string[] = Array.from(
    new Set(
      (participant_ids.length > 0 ? participant_ids : groupParticipants.map((item: { participant_id: string }) => item.participant_id)).filter(Boolean),
    ),
  );

  if (editingId) {
    const existing = await prisma.evaluationDefinition.findUnique({
      where: { id: editingId },
      include: {
        assignments: {
          include: { _count: { select: { participant_evaluations: { where: { is_complete: true } } } } },
        },
      },
    });

    if (!existing) return;

    const completedCount = existing.assignments.reduce((sum, a) => sum + a._count.participant_evaluations, 0);
    if (completedCount > 0) {
      return;
    }
  }

  await prisma.$transaction(async (tx) => {
    if (editingId) {
      await tx.evaluationDefinition.delete({ where: { id: editingId } });
    }

    const definition = await tx.evaluationDefinition.create({
      data: {
        title,
        creator_id,
        evaluation_group_id,
        questions: {
          create: validQuestions,
        },
      },
    });

    for (const evaluator_id of evaluator_ids) {
      const assignment = await tx.evaluationAssignment.create({
        data: {
          evaluator_id,
          evaluation_definition_id: definition.id,
          evaluation_group_id,
        },
      });

      if (participantIdsToUse.length > 0) {
        await tx.participantEvaluation.createMany({
          data: participantIdsToUse.map((participant_id) => ({
            assignment_id: assignment.id,
            participant_id,
          })),
        });
      }
    }
  });

  revalidatePath("/admin/evaluations");
  revalidatePath("/admin/dashboards");
}

async function deleteEvaluation(formData: FormData) {
  "use server";

  await requireRoles(["ADMIN", "OPERATOR"]);
  const definitionId = String(formData.get("definition_id") || "").trim();
  if (!definitionId) return;

  await prisma.evaluationDefinition.delete({ where: { id: definitionId } });
  revalidatePath("/admin/evaluations");
  revalidatePath("/admin/dashboards");
}

async function cloneEvaluation(formData: FormData) {
  "use server";

  await requireRoles(["ADMIN", "OPERATOR"]);
  const definitionId = String(formData.get("definition_id") || "").trim();
  if (!definitionId) return;

  const source = await prisma.evaluationDefinition.findUnique({
    where: { id: definitionId },
    include: {
      questions: true,
      assignments: {
        include: {
          participant_evaluations: { select: { participant_id: true } },
        },
      },
    },
  });

  if (!source) return;

  const definition = await prisma.evaluationDefinition.create({
    data: {
      title: `${source.title} (copia)`,
      creator_id: source.creator_id,
      evaluation_group_id: source.evaluation_group_id,
      questions: {
        create: source.questions.map((q) => ({
          text: q.text,
          weight: q.weight,
          scale_min: q.scale_min,
          scale_max: q.scale_max,
        })),
      },
    },
  });

  for (const sourceAssignment of source.assignments) {
    const assignment = await prisma.evaluationAssignment.create({
      data: {
        evaluator_id: sourceAssignment.evaluator_id,
        evaluation_definition_id: definition.id,
        evaluation_group_id: sourceAssignment.evaluation_group_id,
      },
    });

    const participantIds = sourceAssignment.participant_evaluations.map((pe) => pe.participant_id);
    if (participantIds.length > 0) {
      await prisma.participantEvaluation.createMany({
        data: participantIds.map((participant_id) => ({
          assignment_id: assignment.id,
          participant_id,
        })),
      });
    }
  }

  revalidatePath("/admin/evaluations");
}

export default async function EvaluationsPage() {
  const [participants, groups, creators, evaluators, definitions, groupParticipants] = await Promise.all([
    prisma.participant.findMany({ orderBy: { name: "asc" } }),
    prisma.evaluationGroup.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "OPERATOR"] } }, orderBy: { email: "asc" } }),
    prisma.user.findMany({ where: { role: "EVALUATOR" }, orderBy: { email: "asc" } }),
    prisma.evaluationDefinition.findMany({
      include: {
        questions: true,
        evaluation_group: true,
        assignments: {
          include: {
            evaluator: true,
            participant_evaluations: { select: { participant_id: true } },
            _count: { select: { participant_evaluations: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.groupParticipant.findMany({
      select: { evaluation_group_id: true, participant_id: true },
    }),
  ]);

  const groupParticipantsMap = (groupParticipants as Array<{ evaluation_group_id: string; participant_id: string }>).reduce<Record<string, string[]>>((acc, item) => {
    if (!acc[item.evaluation_group_id]) acc[item.evaluation_group_id] = [];
    acc[item.evaluation_group_id].push(item.participant_id);
    return acc;
  }, {});

  const editableDefinitions = definitions.map((d) => ({
    id: d.id,
    title: d.title,
    creator_id: d.creator_id,
    evaluation_group_id: d.evaluation_group_id,
    groupName: d.evaluation_group?.name || "Sin grupo",
    questions: d.questions.map((q) => ({
      text: q.text,
      weight: String(q.weight),
      scale_min: String(q.scale_min),
      scale_max: String(q.scale_max),
    })),
    evaluator_ids: d.assignments.map((a) => a.evaluator_id),
    evaluator_emails: d.assignments.map((a) => a.evaluator.email),
    participant_ids: Array.from(new Set(d.assignments.flatMap((a) => a.participant_evaluations.map((pe) => pe.participant_id)))),
    participantCount: Array.from(new Set(d.assignments.flatMap((a) => a.participant_evaluations.map((pe) => pe.participant_id)))).length,
    participantDetail: d.assignments.length > 0 ? d.assignments.map((a) => `${a.evaluator.email}: ${a._count.participant_evaluations}`).join(", ") : "",
  }));

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <EvaluationDefinitionForm
        key={definitions.map((d) => d.id).join(",")}
        action={createEvaluation}
        cloneAction={cloneEvaluation}
        deleteAction={deleteEvaluation}
        participants={participants.map((p) => ({ id: p.id, name: p.name }))}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        creators={creators.map((u) => ({ id: u.id, name: u.email }))}
        evaluators={evaluators.map((u) => ({ id: u.id, name: u.email }))}
        groupParticipantsMap={groupParticipantsMap}
        definitions={editableDefinitions}
      />
    </section>
  );
}
