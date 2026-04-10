"use client";

import { Cell, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = {
  name: string;
  total: number;
};

const COLORS = ["#0f172a", "#1d4ed8", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#be185d"];

export default function ParticipantRankingChart({ data }: { data: Row[] }) {
  return (
    <div className="h-[360px] w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 12, fill: "#475569" }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: "#475569" }} />
          <Tooltip
            formatter={(value: number | string | readonly (number | string)[] | undefined) => {
              const normalized = Array.isArray(value) ? value[0] : value;
              if (typeof normalized === "number") return normalized.toFixed(2);
              if (typeof normalized === "string") {
                const parsed = Number(normalized);
                return Number.isNaN(parsed) ? normalized : parsed.toFixed(2);
              }
              return "0.00";
            }}
          />
          <Bar dataKey="total" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}