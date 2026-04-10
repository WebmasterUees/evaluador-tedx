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

  const definition = await prisma.evaluationDefinition.create({
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
    const assignment = await prisma.evaluationAssignment.create({
      data: {
        evaluator_id,
        evaluation_definition_id: definition.id,
        evaluation_group_id,
      },
    });

    if (participantIdsToUse.length > 0) {
      await prisma.participantEvaluation.createMany({
        data: participantIdsToUse.map((participant_id) => ({
          assignment_id: assignment.id,
          participant_id,
        })),
      });
    }
  }

  revalidatePath("/admin/evaluations");
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
    include: { questions: true, assignments: true },
  });

  if (!source) return;

  await prisma.evaluationDefinition.create({
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

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <EvaluationDefinitionForm
        action={createEvaluation}
        participants={participants.map((p) => ({ id: p.id, name: p.name }))}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        creators={creators.map((u) => ({ id: u.id, name: u.email }))}
        evaluators={evaluators.map((u) => ({ id: u.id, name: u.email }))}
        groupParticipantsMap={groupParticipantsMap}
      />

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Evaluaciones creadas</h3>
        <div className="mt-4 space-y-3">
          {definitions.map((definition) => (
            <article key={definition.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">{definition.title}</h4>
                  <p className="mt-1 text-sm text-slate-600">Grupo: {definition.evaluation_group?.name || "Sin grupo"}</p>
                  <p className="mt-1 text-sm text-slate-600">Preguntas: {definition.questions.length}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Evaluadores: {definition.assignments.map((assignment) => assignment.evaluator.email).join(", ") || "Sin evaluadores"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Participantes: {definition.assignments.reduce((sum, a) => sum + a._count.participant_evaluations, 0) || 0}
                    {definition.assignments.length > 0 ? ` (${definition.assignments.map((a) => `${a.evaluator.email}: ${a._count.participant_evaluations}`).join(", ")})` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={cloneEvaluation}>
                    <input type="hidden" name="definition_id" value={definition.id} />
                    <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      Clonar
                    </button>
                  </form>
                  <form action={deleteEvaluation}>
                    <input type="hidden" name="definition_id" value={definition.id} />
                    <button type="submit" className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
