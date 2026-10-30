import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Screening } from "@/types/screening";

export function ScoreCard({ screening }: { screening: Screening }) {
  return (
    <section
      aria-label="Overall match"
      className="flex flex-col items-center rounded-xl border bg-white p-6 text-center shadow-sm"
    >
      <h2 className="text-sm text-muted-foreground">Overall Match</h2>
      <p className="my-2 text-5xl font-semibold tracking-tight tabular-nums">
        {Math.round(screening.overall_score)}%
      </p>
      <StatusBadge status={screening.category} />
    </section>
  );
}
