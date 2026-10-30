import { ScoreProgress } from "@/components/candidates/ScoreProgress";
import type { Screening } from "@/types/screening";

const COMPONENTS: { key: keyof Screening; label: string; weight: number }[] = [
  { key: "skills_score", label: "Required Skills", weight: 35 },
  { key: "experience_score", label: "Experience", weight: 20 },
  { key: "semantic_score", label: "Semantic Match", weight: 20 },
  { key: "projects_score", label: "Projects", weight: 10 },
  { key: "education_score", label: "Education", weight: 5 },
  { key: "certifications_score", label: "Certifications", weight: 5 },
  { key: "ai_score", label: "AI Evaluation", weight: 5 },
];

export function ScoreBreakdown({ screening }: { screening: Screening }) {
  return (
    <div className="space-y-3">
      {COMPONENTS.map(({ key, label, weight }) => (
        <ScoreProgress key={key} label={label} weight={weight} value={screening[key] as number} />
      ))}
    </div>
  );
}
