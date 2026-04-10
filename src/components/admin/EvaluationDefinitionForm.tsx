"use client";

import { useEffect, useMemo, useState } from "react";

type Option = { id: string; name: string };

type EditableDefinition = {
  id: string;
  title: string;
  creator_id: string;
  evaluation_group_id: string | null;
  groupName: string;
  questions: { text: string; weight: string; scale_min: string; scale_max: string }[];
  evaluator_ids: string[];
  evaluator_emails: string[];
  participant_ids: string[];
  participantCount: number;
  participantDetail: string;
};

type Props = {
  participants: Option[];
  evaluators: Option[];
  groups: Option[];
  creators: Option[];
  groupParticipantsMap: Record<string, string[]>;
  action: (formData: FormData) => Promise<void>;
  cloneAction?: (formData: FormData) => Promise<void>;
  deleteAction?: (formData: FormData) => Promise<void>;
  definitions?: EditableDefinition[];
};

type QuestionForm = {
  text: string;
  weight: string;
  scale_min: string;
  scale_max: string;
};

export default function EvaluationDefinitionForm({ participants, evaluators, groups, creators, groupParticipantsMap, action, cloneAction, deleteAction, definitions }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [selectedCreatorId, setSelectedCreatorId] = useState(creators[0]?.id || "");
  const [questions, setQuestions] = useState<QuestionForm[]>([
    { text: "", weight: "1", scale_min: "1", scale_max: "10" },
  ]);
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || "");
  const [checkedEvaluatorIds, setCheckedEvaluatorIds] = useState<Set<string>>(new Set());

  const questionsJson = useMemo(() => JSON.stringify(questions), [questions]);
  const defaultGroupParticipantIds = useMemo(() => {
    if (!selectedGroupId) return new Set<string>();
    return new Set(groupParticipantsMap[selectedGroupId] || []);
  }, [groupParticipantsMap, selectedGroupId]);

  const [checkedParticipantIds, setCheckedParticipantIds] = useState<Set<string>>(defaultGroupParticipantIds);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) {
      setCheckedParticipantIds(defaultGroupParticipantIds);
    }
  }, [defaultGroupParticipantIds, editingId]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSelectedCreatorId(creators[0]?.id || "");
    setSelectedGroupId(groups[0]?.id || "");
    setQuestions([{ text: "", weight: "1", scale_min: "1", scale_max: "10" }]);
    setCheckedEvaluatorIds(new Set());
    setCheckedParticipantIds(defaultGroupParticipantIds);
    setError(null);
  };

  const loadDefinition = (def: EditableDefinition) => {
    setEditingId(def.id);
    setTitle(def.title);
    setSelectedCreatorId(def.creator_id);
    setSelectedGroupId(def.evaluation_group_id || groups[0]?.id || "");
    setQuestions(def.questions.length > 0 ? def.questions : [{ text: "", weight: "1", scale_min: "1", scale_max: "10" }]);
    setCheckedEvaluatorIds(new Set(def.evaluator_ids));
    setCheckedParticipantIds(new Set(def.participant_ids));
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectClasses = "h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M6%208l4%204%204-4%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:14px_14px] bg-[right_0.75rem_center] bg-no-repeat px-3 pr-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

  return (
    <>
      <form
        action={action}
        onSubmit={(e) => {
          if (checkedParticipantIds.size === 0) {
            e.preventDefault();
            setError("Debes seleccionar al menos un participante.");
            return;
          }
          setError(null);
        }}
        className="space-y-5 rounded-2xl bg-white p-6 shadow-sm"
      >
        {editingId ? (
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
            <p className="text-sm font-medium text-blue-800">Editando evaluacion — los cambios reemplazaran la version anterior.</p>
            <button type="button" onClick={resetForm} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
              Cancelar edicion
            </button>
          </div>
        ) : null}

        <input type="hidden" name="editing_id" value={editingId || ""} />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Titulo de la evaluacion</span>
            <input
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Ej. Evaluacion de ponencias - ESTUDIANTES"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Creador</span>
            <select name="creator_id" required value={selectedCreatorId} onChange={(e) => setSelectedCreatorId(e.target.value)} className={selectClasses}>
              {creators.map((creator) => (
                <option key={creator.id} value={creator.id}>{creator.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Grupo de dashboard</span>
            <select
              name="evaluation_group_id"
              required
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
              className={selectClasses}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="space-y-2 rounded-xl border border-slate-200 p-4">
          <legend className="px-2 text-sm font-semibold text-slate-700">Evaluadores asignados</legend>
          <p className="px-2 text-xs text-slate-500">Marca uno o varios evaluadores para esta evaluacion.</p>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {evaluators.map((evaluator) => (
              <label key={evaluator.id} className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="evaluator_ids"
                  value={evaluator.id}
                  checked={checkedEvaluatorIds.has(evaluator.id)}
                  onChange={(e) => {
                    setCheckedEvaluatorIds((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) { next.add(evaluator.id); } else { next.delete(evaluator.id); }
                      return next;
                    });
                  }}
                  className="h-4 w-4"
                />
                {evaluator.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
          <legend className="px-2 text-sm font-semibold text-slate-700">Preguntas y escala de puntuacion</legend>
          <p className="px-2 text-sm text-slate-500">Define el texto de cada pregunta, su peso en el calculo final y el rango de puntuacion permitido.</p>
          {questions.map((question, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_90px_90px_auto] md:items-end">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Pregunta</span>
                <input
                  value={question.text}
                  onChange={(event) => {
                    const next = [...questions];
                    next[index].text = event.target.value;
                    setQuestions(next);
                  }}
                  placeholder={`Pregunta ${index + 1}`}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Peso</span>
                <input
                  value={question.weight}
                  onChange={(event) => {
                    const next = [...questions];
                    next[index].weight = event.target.value;
                    setQuestions(next);
                  }}
                  type="number"
                  min="0"
                  step="0.1"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Minimo</span>
                <input
                  value={question.scale_min}
                  onChange={(event) => {
                    const next = [...questions];
                    next[index].scale_min = event.target.value;
                    setQuestions(next);
                  }}
                  type="number"
                  min="1"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Maximo</span>
                <input
                  value={question.scale_max}
                  onChange={(event) => {
                    const next = [...questions];
                    next[index].scale_max = event.target.value;
                    setQuestions(next);
                  }}
                  type="number"
                  min="1"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  required
                />
              </label>
              <button
                type="button"
                onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}
                className="h-11 rounded-lg border border-rose-300 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={questions.length === 1}
              >
                Eliminar
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setQuestions((prev) => [...prev, { text: "", weight: "1", scale_min: "1", scale_max: "10" }])}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Agregar pregunta
          </button>
        </fieldset>

        <fieldset className="space-y-2 rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between px-2">
            <div>
              <legend className="text-sm font-semibold text-slate-700">Participantes asignados</legend>
              <p className="text-xs text-slate-500">Se marcan por defecto los participantes asignados al grupo seleccionado.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (checkedParticipantIds.size === participants.length) {
                  setCheckedParticipantIds(new Set());
                } else {
                  setCheckedParticipantIds(new Set(participants.map((p) => p.id)));
                  setError(null);
                }
              }}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {checkedParticipantIds.size === participants.length ? "Deseleccionar todos" : "Seleccionar todos"}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {participants.map((participant) => (
              <label key={participant.id} className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="participant_ids"
                  value={participant.id}
                  checked={checkedParticipantIds.has(participant.id)}
                  onChange={(event) => {
                    setCheckedParticipantIds((prev) => {
                      const next = new Set(prev);
                      if (event.target.checked) {
                        next.add(participant.id);
                      } else {
                        next.delete(participant.id);
                      }
                      if (next.size > 0) setError(null);
                      return next;
                    });
                  }}
                  className="h-4 w-4"
                />
                {participant.name}
              </label>
            ))}
          </div>
        </fieldset>

        <input type="hidden" name="questions_json" value={questionsJson} />

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600">{error}</p>
        ) : null}

        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          {editingId ? "Guardar cambios" : "Crear evaluacion"}
        </button>
      </form>

      {definitions && definitions.length > 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Evaluaciones creadas</h3>
          <div className="mt-4 space-y-3">
            {definitions.map((def) => (
              <article key={def.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">{def.title}</h4>
                    <p className="mt-1 text-sm text-slate-600">Grupo: {def.groupName}</p>
                    <p className="mt-1 text-sm text-slate-600">Preguntas: {def.questions.length}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Evaluadores: {def.evaluator_emails.join(", ") || "Sin evaluadores"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Participantes: {def.participantCount}{def.participantDetail ? ` (${def.participantDetail})` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadDefinition(def)}
                      className="rounded-lg border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      Editar
                    </button>
                    {cloneAction ? (
                      <form action={cloneAction}>
                        <input type="hidden" name="definition_id" value={def.id} />
                        <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                          Clonar
                        </button>
                      </form>
                    ) : null}
                    {deleteAction ? (
                      <form action={deleteAction}>
                        <input type="hidden" name="definition_id" value={def.id} />
                        <button type="submit" className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                          Eliminar
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
