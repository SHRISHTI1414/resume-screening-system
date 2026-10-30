import Link from "next/link";

import { CandidateActions } from "@/components/candidates/CandidateActions";
import { SkillList } from "@/components/ui/SkillBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatScore, formatYears } from "@/lib/utils";
import type { ScreeningItem } from "@/types/screening";

export function CandidateCard({
  item,
  quickActions,
}: {
  item: ScreeningItem;
  quickActions?: boolean;
}) {
  const screening = item.screening;
  return (
    <article className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/candidates/${item.candidate_id}`}
            className="block truncate font-medium hover:text-primary"
          >
            {item.rank ? `#${item.rank} ` : ""}
            {item.candidate_name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {item.job_title} · {formatYears(item.experience_years)}
          </p>
        </div>
        <p className="text-xl font-semibold tabular-nums">
          {formatScore(screening?.overall_score)}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {screening && <StatusBadge status={screening.category} />}
        <StatusBadge status={item.status} />
      </div>
      {screening && screening.missing_skills.length > 0 && (
        <div className="mt-3">
          <SkillList skills={screening.missing_skills.slice(0, 4)} variant="missing" />
        </div>
      )}
      <div className="mt-2 flex justify-end">
        <CandidateActions item={item} quickActions={quickActions} />
      </div>
    </article>
  );
}
