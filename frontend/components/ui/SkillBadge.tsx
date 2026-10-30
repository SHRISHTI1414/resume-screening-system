import { Check, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const VARIANTS = {
  neutral: { className: "bg-slate-100 text-slate-700", icon: null, label: "" },
  matched: { className: "bg-green-50 text-green-800", icon: Check, label: "Matched: " },
  missing: { className: "bg-amber-50 text-amber-800", icon: TriangleAlert, label: "Missing: " },
};

export function SkillBadge({
  skill,
  variant = "neutral",
}: {
  skill: string;
  variant?: keyof typeof VARIANTS;
}) {
  const { className, icon: Icon, label } = VARIANTS[variant];
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {Icon && <Icon className="size-3 shrink-0" aria-hidden />}
      <span className="sr-only">{label}</span>
      <span className="truncate">{skill}</span>
    </span>
  );
}

export function SkillList({
  skills,
  variant,
  empty = "None",
}: {
  skills: string[];
  variant?: keyof typeof VARIANTS;
  empty?: string;
}) {
  if (skills.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <SkillBadge key={skill} skill={skill} variant={variant} />
      ))}
    </div>
  );
}
