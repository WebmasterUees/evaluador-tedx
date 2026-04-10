"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = {
  question: string;
  total: number;
};

export default function WeightedQuestionsBarChart({ data }: { data: Row[] }) {
  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="question"
            interval={0}
            height={40}
            tick={{ fontSize: 12, fill: "#475569" }}
            tickFormatter={(_, index) => `P${index + 1}`}
          />
          <YAxis tick={{ fontSize: 12, fill: "#475569" }} />
          <Tooltip
            labelFormatter={(label) => String(label)}
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
          <Bar dataKey="total" fill="#0f172a" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
