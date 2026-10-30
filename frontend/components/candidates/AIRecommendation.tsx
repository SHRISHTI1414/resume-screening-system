import { CircleMinus, CirclePlus, Sparkles } from "lucide-react";

import type { Screening } from "@/types/screening";

export const FAIRNESS_NOTE =
  "AI recommendations are decision-support tools. Final hiring decisions should be made by a human recruiter.";

function ReasonList({
  title,
  items,
  positive,
}: {
  title: string;
  items: string[];
  positive: boolean;
}) {
  if (items.length === 0) return null;
  const Icon = positive ? CirclePlus : CircleMinus;
  return (
    <div>
      <h3 className="mb-1 text-sm font-medium">{title}</h3>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AIRecommendation({ screening }: { screening: Screening }) {
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 font-medium">
        <Sparkles className="size-4 text-primary" aria-hidden />
        {screening.recommendation ?? "No AI recommendation (sample data)"}
      </p>
      {screening.ai_summary && <p className="text-sm leading-6">{screening.ai_summary}</p>}
      <ReasonList title="Strengths" items={screening.strengths} positive />
      <ReasonList title="Weaknesses" items={screening.weaknesses} positive={false} />
      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{FAIRNESS_NOTE}</p>
    </div>
  );
}
