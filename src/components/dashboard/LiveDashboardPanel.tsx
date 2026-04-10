"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ParticipantRankingChart from "../charts/ParticipantRankingChart";

type ParticipantRow = {
  id: string;
  name: string;
  total: number;
};

type DashboardResults = {
  total: number;
  participants: ParticipantRow[];
  winner: ParticipantRow | null;
};

type Props = {
  evaluationGroupId: string;
  evaluationDefinitionId?: string;
  initialGroupName: string;
  initialResults: DashboardResults;
};

export default function LiveDashboardPanel({ evaluationGroupId, evaluationDefinitionId, initialGroupName, initialResults }: Props) {
  const [groupName, setGroupName] = useState(initialGroupName);
  const [results, setResults] = useState(initialResults);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>(new Date());
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(4);

  useEffect(() => {
    let active = true;
    let countdownTimer: ReturnType<typeof setInterval> | undefined;
    let syncInProgress = false;

    const sync = async () => {
      if (syncInProgress) return;
      syncInProgress = true;

      try {
        const params = new URLSearchParams();
        if (evaluationDefinitionId) params.set("definition", evaluationDefinitionId);
        const query = params.toString();
        const response = await fetch(`/api/dashboard/${evaluationGroupId}${query ? `?${query}` : ""}`, {
          cache: "no-store",
        });

        if (!active) return;

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { locked?: boolean; message?: string } | null;
          if (response.status === 403 && payload?.locked) {
            setLockedMessage(payload.message || "Dashboard bloqueado");
          }
          return;
        }

        const payload = (await response.json()) as { group: { name: string }; results: DashboardResults };
        setGroupName(payload.group.name);
        setResults(payload.results);
        setLockedMessage(null);
        setLastUpdatedAt(new Date());
        setSecondsUntilRefresh(4);
      } catch {
        // Keep the previous data visible if a refresh fails.
      } finally {
        syncInProgress = false;
      }
    };

    void sync();
    countdownTimer = setInterval(() => {
      if (!document.hidden) {
        setSecondsUntilRefresh((current) => {
          if (current <= 1) {
            void sync();
            return 4;
          }

          return current - 1;
        });
      }
    }, 1000);

    return () => {
      active = false;
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [evaluationDefinitionId, evaluationGroupId]);

  if (lockedMessage) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-xl font-semibold">Dashboard bloqueado</h1>
        <p className="mt-2 text-sm">{lockedMessage}</p>
      </div>
    );
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[1fr_320px]">
      <article className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard - {groupName}</h1>
            <p className="mt-1 text-sm text-slate-600">Ranking ponderado por participante</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
            Actualiza cada 2s
          </div>
        </div>

        <div className="mt-5 min-w-0">
          <ParticipantRankingChart data={results.participants} />
        </div>
      </article>

      <aside className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
        <div className="mb-4">
          <Link
            href="/evaluator"
            className="inline-flex rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-white/10"
          >
            Ver mis evaluaciones
          </Link>
        </div>
        <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Puntaje del ganador</p>
        <p className="mt-2 text-5xl font-bold text-[#e10613]">{results.winner ? results.winner.total.toFixed(2) : "0.00"}</p>
        <p className="mt-6 text-xs text-slate-400">Próxima actualización en {secondsUntilRefresh} s</p>
        {results.winner ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-300">Ganador parcial</p>
            <p className="mt-2 text-lg font-semibold text-white">{results.winner.name}</p>
            <p className="text-sm text-slate-300">{results.winner.total.toFixed(2)} puntos</p>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
