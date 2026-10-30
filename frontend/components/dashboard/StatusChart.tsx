"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { ChartPoint } from "@/types/screening";

// A fixed color per status, so filtering or empty statuses never repaint the others.
const STATUS_COLORS: Record<string, string> = {
  New: "#2a78d6",
  "Under Review": "#eb6834",
  Shortlisted: "#1baf7a",
  Interview: "#eda100",
  Rejected: "#e87ba4",
  Hired: "#6250d6",
};

export function StatusChart({ data }: { data: ChartPoint[] }) {
  const slices = data.filter((point) => point.value > 0);
  const total = data.reduce((sum, point) => sum + point.value, 0);

  return (
    <figure
      aria-label="Number of candidates in each status"
      className="flex flex-col items-center gap-4 sm:flex-row"
    >
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={slices.length > 1 ? 2 : 0}
              isAnimationActive={false}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {slices.map((slice) => (
                <Cell key={slice.label} fill={STATUS_COLORS[slice.label]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e4e4e7", fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">{total}</span>
          <span className="text-xs text-muted-foreground">applications</span>
        </div>
      </div>
      <ul className="w-full flex-1 space-y-1.5 text-sm">
        {data.map((point) => (
          <li key={point.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: STATUS_COLORS[point.label] }}
              />
              {point.label}
            </span>
            <span className="font-medium tabular-nums">{point.value}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
