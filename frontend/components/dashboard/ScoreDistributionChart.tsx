"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ChartPoint } from "@/types/screening";

const BAR_COLOR = "#4f46e5";

export function ScoreDistributionChart({ data }: { data: ChartPoint[] }) {
  const rows = data.map((point) => ({ ...point, label: point.label.replace(" Match", "") }));

  return (
    <figure aria-label="Number of candidates in each score category">
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke="#e7e5e4" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              interval={0}
              stroke="#71717a"
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              stroke="#71717a"
            />
            <Tooltip
              cursor={{ fill: "rgba(79, 70, 229, 0.06)" }}
              formatter={(value) => [value, "Candidates"]}
              contentStyle={{ borderRadius: 8, borderColor: "#e4e4e7", fontSize: 13 }}
            />
            <Bar
              dataKey="value"
              fill={BAR_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {rows.map((row) => `${row.label}: ${row.value}`).join(", ")}
      </figcaption>
    </figure>
  );
}
