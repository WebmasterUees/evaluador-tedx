import Link from "next/link";
import { redirect } from "next/navigation";
import ParticipantSelector from "../../components/evaluator/ParticipantSelector";
import { prisma } from "../../lib/prisma";
import { requireRoles } from "../../lib/auth-server";

async function submitEvaluation(formData: FormData) {
  "use server";

  const session = await requireRoles(["EVALUATOR"]);
  const participantEvaluationId = String(formData.get("participant_evaluation_id") || "");
  const assignmentId = String(formData.get("assignment_id") || "");

  if (!participantEvaluationId) {
    redirect("/evaluator");
  }

  const evaluation = await prisma.participantEvaluation.findFirst({
    where: {
      id: participantEvaluationId,
      is_complete: false,
      assignment: {
        evaluator_id: session.user.id,
      },
    },
    include: {
      assignment: {
        include: {
          evaluation_definition: {
            include: { questions: true },
          },
        },
      },
    },
  });

  if (!evaluation) {
    redirect("/evaluator");
  }

  const scores: { questionId: string; score: number }[] = [];

  for (const question of evaluation.assignment.evaluation_definition.questions) {
    const raw = formData.get(`q_${question.id}`);
    if (raw === null) {
      const params = new URLSearchParams({ pe: participantEvaluationId });
      if (assignmentId) params.set("a", assignmentId);
      redirect(`/evaluator?${params.toString()}`);
    }
    const score = Number(raw);
    if (!Number.isInteger(score) || score < question.scale_min || score > question.scale_max) {
      const params = new URLSearchParams({ pe: participantEvaluationId });
      if (assignmentId) params.set("a", assignmentId);
      redirect(`/evaluator?${params.toString()}`);
    }
    scores.push({ questionId: question.id, score });
  }

  await prisma.$transaction(async (tx) => {
    for (const { questionId, score } of scores) {
      await tx.response.upsert({
        where: {
          participant_evaluation_id_question_id: {
            participant_evaluation_id: participantEvaluationId,
            question_id: questionId,
          },
        },
        update: { score },
        create: {
          participant_evaluation_id: participantEvaluationId,
          question_id: questionId,
          score,
        },
      });
    }

    await tx.participantEvaluation.update({
      where: {
        id: participantEvaluationId,
        assignment: {
          evaluator_id: session.user.id,
        },
      },
      data: { is_complete: true },
    });
  });

  const nextInSameAssignment = assignmentId
    ? await prisma.participantEvaluation.findFirst({
        where: {
          assignment_id: assignmentId,
          is_complete: false,
          assignment: {
            evaluator_id: session.user.id,
          },
        },
        orderBy: { createdAt: "asc" },
      })
    : null;

  const next = await prisma.participantEvaluation.findFirst({
    where: {
      is_complete: false,
      assignment: {
        evaluator_id: session.user.id,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const base = new URLSearchParams({
    submitted: "1",
    a: evaluation.assignment.id,
    group: evaluation.assignment.evaluation_group_id,
    definition: evaluation.assignment.evaluation_definition_id,
  });

  if (next) {
    if (nextInSameAssignment) {
      base.set("next", nextInSameAssignment.id);
    }
    redirect(`/evaluator?${base.toString()}`);
  }

  base.set("completed", "1");
  redirect(`/evaluator?${base.toString()}`);
}

export default async function EvaluatorPage({
  searchParams,
}: {
  searchParams: Promise<{ pe?: string; a?: string; completed?: string; group?: string; submitted?: string; next?: string; definition?: string }>;
}) {
  const session = await requireRoles(["EVALUATOR"]);
  const params = await searchParams;

  const assigned = await prisma.participantEvaluation.findMany({
    where: {
      assignment: {
        evaluator_id: session.user.id,
      },
    },
    include: {
      participant: true,
      assignment: {
        include: {
          evaluation_definition: {
            include: {
              questions: true,
            },
          },
        },
      },
      responses: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (assigned.length === 0) {
    return (
      <section className="mx-auto max-w-3xl p-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">No tienes participantes asignados</h2>
        </div>
      </section>
    );
  }

  const assignmentMap = new Map<
    string,
    {
      id: string;
      title: string;
      groupId: string;
      definitionId: string;
      total: number;
      pending: number;
      firstPendingId: string | null;
    }
  >();

  for (const item of assigned) {
    const existing = assignmentMap.get(item.assignment.id);
    if (!existing) {
      assignmentMap.set(item.assignment.id, {
        id: item.assignment.id,
        title: item.assignment.evaluation_definition.title,
        groupId: item.assignment.evaluation_group_id,
        definitionId: item.assignment.evaluation_definition_id,
        total: 1,
        pending: item.is_complete ? 0 : 1,
        firstPendingId: item.is_complete ? null : item.id,
      });
      continue;
    }

    existing.total += 1;
    if (!item.is_complete) {
      existing.pending += 1;
      if (!existing.firstPendingId) existing.firstPendingId = item.id;
    }
  }

  const assignmentOptions = Array.from(assignmentMap.values()).sort((a, b) => a.title.localeCompare(b.title));

  if (params.submitted === "1") {
    const hasFinishedAll = params.completed === "1";
    const continueHref = params.next && params.a ? `/evaluator?a=${params.a}&pe=${params.next}` : "/evaluator";
    const resultsHref = params.group
      ? `/dashboard/evaluation-group/${params.group}${params.definition ? `?definition=${params.definition}` : ""}`
      : null;

    return (
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <h1 className="text-2xl font-semibold text-emerald-900">Gracias, tu voto fue registrado con exito</h1>
          <p className="mt-2 text-sm text-emerald-800">
            {hasFinishedAll
              ? "Ya completaste todas tus evaluaciones pendientes."
              : "Puedes continuar evaluando o revisar resultados ahora."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {hasFinishedAll ? (
              <Link
                href="/evaluator"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Ver mis evaluaciones
              </Link>
            ) : (
              <Link
                href={continueHref}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Continuar
              </Link>
            )}
            {hasFinishedAll && resultsHref ? (
              <Link
                href={resultsHref}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver resultados de votos
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  const hasValidAssignmentParam = Boolean(params.a && assignmentMap.has(params.a));
  if (!hasValidAssignmentParam) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex justify-center">
          <h1 className="text-5xl font-black tracking-tight text-black">
            <span className="text-[#e10613]">TEDx</span>
            <span className="ml-1 text-black">UEES</span>
          </h1>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-8 py-6">
            <h2 className="text-3xl font-semibold text-slate-700">Selecciona una evaluacion pendiente</h2>
            <p className="mt-2 text-sm text-slate-500">Elige la evaluacion que quieres continuar.</p>
          </div>

          <div className="space-y-3 px-8 py-6">
            {assignmentOptions.map((assignment) => (
              <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{assignment.title}</p>
                  <p className="text-sm text-slate-600">
                    Pendientes: {assignment.pending} de {assignment.total}
                  </p>
                </div>
                <div className="flex gap-2">
                  {assignment.pending === 0 ? (
                    <Link
                      href={`/dashboard/evaluation-group/${assignment.groupId}?definition=${assignment.definitionId}`}
                      className="rounded-lg bg-[#e10613] px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Ver resultados
                    </Link>
                  ) : null}
                  <Link
                    href={
                      assignment.firstPendingId
                        ? `/evaluator?a=${assignment.id}&pe=${assignment.firstPendingId}`
                        : `/evaluator?a=${assignment.id}`
                    }
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    {assignment.pending > 0 ? "Continuar" : "Ver"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const selectedAssignmentId = String(params.a);
  const scopedAssigned = assigned.filter((item) => item.assignment.id === selectedAssignmentId);
  if (scopedAssigned.length === 0) {
    redirect("/evaluator");
  }

  const selectedByPe = params.pe ? scopedAssigned.find((item) => item.id === params.pe) : undefined;
  if (params.pe && !selectedByPe) {
    redirect(`/evaluator?a=${selectedAssignmentId}`);
  }
  const selected =
    selectedByPe ||
    scopedAssigned.find((item) => !item.is_complete) ||
    scopedAssigned[0];
  const isReadOnly = selected.is_complete;

  const questions = selected.assignment.evaluation_definition.questions;
  const responseMap = new Map(selected.responses.map((r) => [r.question_id, r.score]));

  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex justify-center">
        <h1 className="text-5xl font-black tracking-tight text-black">
          <span className="text-[#e10613]">TEDx</span>
          <span className="ml-1 text-black">UEES</span>
        </h1>
      </div>

      <form action={submitEvaluation} className="rounded-sm border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-8 py-6">
          <h2 className="text-3xl font-semibold text-slate-700">{selected.assignment.evaluation_definition.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pendientes en esta evaluacion: {scopedAssigned.filter((item) => !item.is_complete).length}
          </p>
          {isReadOnly ? <p className="mt-1 text-sm font-semibold text-slate-600">Modo solo lectura (participante ya evaluado)</p> : null}
        </div>

        <div className="space-y-8 px-8 py-6">
          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-600">Seleccione el nombre del participante a ser evaluado <span className="text-red-500">*</span></label>
            <ParticipantSelector
              selectedId={selected.id}
              assignmentId={selectedAssignmentId}
              options={scopedAssigned.map((item) => ({
                id: item.id,
                name: item.participant.name,
                isComplete: item.is_complete,
              }))}
            />
          </div>

          {questions.map((question) => (
            <fieldset key={question.id} className="space-y-3">
              <legend className="text-2xl font-medium leading-tight text-slate-700">
                {question.text} <span className="text-red-500">*</span>
              </legend>

              <div className="flex items-center justify-between gap-2">
                {Array.from(
                  { length: Math.max(question.scale_max - question.scale_min + 1, 0) },
                  (_, i) => question.scale_min + i,
                ).map((score) => {
                  const inputId = `${question.id}_${score}`;
                  const defaultChecked = responseMap.get(question.id) === score;

                  return (
                    <label key={score} htmlFor={inputId} className="group flex flex-col items-center gap-2">
                      <input
                        id={inputId}
                        type="radio"
                        name={`q_${question.id}`}
                        value={score}
                        defaultChecked={defaultChecked}
                        required={!isReadOnly}
                        disabled={isReadOnly}
                        className="peer sr-only"
                      />
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-sm font-medium text-slate-500 transition peer-checked:border-[#e10613] peer-checked:bg-[#e10613] peer-checked:text-white">
                        {score}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>Peor</span>
                <span>Mejor</span>
              </div>
            </fieldset>
          ))}
        </div>

        <div className="border-t border-slate-200 px-8 py-7 text-center">
          <input type="hidden" name="participant_evaluation_id" value={selected.id} />
          <input type="hidden" name="assignment_id" value={selectedAssignmentId} />
          {!isReadOnly ? (
            <button type="submit" className="h-11 rounded-md bg-[#e10613] px-12 text-sm font-semibold text-white">
              Evaluar
            </button>
          ) : (
            <Link href="/evaluator" className="inline-flex h-11 items-center rounded-md border border-slate-300 px-8 text-sm font-semibold text-slate-700">
              Volver
            </Link>
          )}
        </div>
      </form>
    </section>
  );
}
