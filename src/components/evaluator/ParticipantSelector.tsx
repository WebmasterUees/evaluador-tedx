"use client";

import { useRouter } from "next/navigation";

type ParticipantOption = {
  id: string;
  name: string;
  isComplete: boolean;
};

type Props = {
  selectedId: string;
  options: ParticipantOption[];
  assignmentId?: string;
};

export default function ParticipantSelector({ selectedId, options, assignmentId }: Props) {
  const router = useRouter();

  return (
    <select
      value={selectedId}
      onChange={(event) => {
        const params = new URLSearchParams({ pe: event.target.value });
        if (assignmentId) params.set("a", assignmentId);
        router.replace(`/evaluator?${params.toString()}`);
      }}
      className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M6%208l4%204%204-4%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:14px_14px] bg-[right_0.75rem_center] bg-no-repeat px-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name} {option.isComplete ? "(Completado)" : ""}
        </option>
      ))}
    </select>
  );
}
