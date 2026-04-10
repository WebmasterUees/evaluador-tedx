"use client";

import { useState } from "react";

type Props = {
  groupId: string;
  groupName: string;
  participants: { id: string; name: string }[];
  initialSelected: string[];
  action: (formData: FormData) => Promise<void>;
};

export default function GroupParticipantSelector({ groupId, groupName, participants, initialSelected, action }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initialSelected));

  const allSelected = checked.size === participants.length;

  const toggleAll = () => {
    if (allSelected) {
      setChecked(new Set());
    } else {
      setChecked(new Set(participants.map((p) => p.id)));
    }
  };

  return (
    <form action={action} className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{groupName}</p>
          <p className="text-xs text-slate-500">Selecciona los participantes que pertenecen a este grupo.</p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {participants.map((participant) => (
          <label key={participant.id} className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="participant_ids"
              value={participant.id}
              checked={checked.has(participant.id)}
              onChange={(e) => {
                setChecked((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) {
                    next.add(participant.id);
                  } else {
                    next.delete(participant.id);
                  }
                  return next;
                });
              }}
              className="h-4 w-4"
            />
            {participant.name}
          </label>
        ))}
      </div>

      <input type="hidden" name="group_id" value={groupId} />
      <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
        Guardar participantes
      </button>
    </form>
  );
}
