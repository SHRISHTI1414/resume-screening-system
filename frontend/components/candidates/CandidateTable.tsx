"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CandidateActions } from "@/components/candidates/CandidateActions";
import { CandidateCard } from "@/components/candidates/CandidateCard";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatScore, formatYears } from "@/lib/utils";
import type { ScreeningItem } from "@/types/screening";

export type CandidateColumn =
  | "rank"
  | "candidate"
  | "job"
  | "experience"
  | "skillsMatch"
  | "score"
  | "category"
  | "matched"
  | "missing"
  | "status"
  | "actions";

const HEADINGS: Record<CandidateColumn, string> = {
  rank: "Rank",
  candidate: "Candidate",
  job: "Job",
  experience: "Experience",
  skillsMatch: "Skills Match",
  score: "Score",
  category: "Category",
  matched: "Matched Skills",
  missing: "Missing Skills",
  status: "Status",
  actions: "Actions",
};

function SkillPreview({ skills, variant }: { skills: string[]; variant: "matched" | "missing" }) {
  if (skills.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex max-w-56 flex-wrap gap-1">
      {skills.slice(0, 3).map((skill) => (
        <SkillBadge key={skill} skill={skill} variant={variant} />
      ))}
      {skills.length > 3 && (
        <span className="self-center text-xs text-muted-foreground">+{skills.length - 3}</span>
      )}
    </div>
  );
}

function renderCell(
  column: CandidateColumn,
  item: ScreeningItem,
  quickActions: boolean,
): ReactNode {
  const screening = item.screening;
  switch (column) {
    case "rank":
      return <span className="font-medium tabular-nums">{item.rank ?? "—"}</span>;
    case "candidate":
      return (
        <div className="min-w-36">
          <Link
            href={`/candidates/${item.candidate_id}`}
            className="font-medium hover:text-primary hover:underline"
          >
            {item.candidate_name}
          </Link>
          {item.candidate_email && (
            <p className="text-xs text-muted-foreground">{item.candidate_email}</p>
          )}
        </div>
      );
    case "job":
      return <span className="text-sm">{item.job_title}</span>;
    case "experience":
      return formatYears(item.experience_years);
    case "skillsMatch":
      return formatScore(screening?.skills_score);
    case "score":
      return (
        <span className="font-semibold tabular-nums">{formatScore(screening?.overall_score)}</span>
      );
    case "category":
      return screening ? (
        <StatusBadge status={screening.category} />
      ) : (
        <span className="text-xs text-muted-foreground">Not scored</span>
      );
    case "matched":
      return <SkillPreview skills={screening?.matched_skills ?? []} variant="matched" />;
    case "missing":
      return <SkillPreview skills={screening?.missing_skills ?? []} variant="missing" />;
    case "status":
      return <StatusBadge status={item.status} />;
    case "actions":
      return <CandidateActions item={item} quickActions={quickActions} />;
  }
}

/** Wide tables on larger screens, cards on phones. Pages choose which columns they show. */
export function CandidateTable({
  items,
  columns,
  quickActions = false,
}: {
  items: ScreeningItem[];
  columns: CandidateColumn[];
  quickActions?: boolean;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-white md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{HEADINGS[column]}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.application_id}>
                {columns.map((column) => (
                  <TableCell key={column}>{renderCell(column, item, quickActions)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <CandidateCard key={item.application_id} item={item} quickActions={quickActions} />
        ))}
      </div>
    </>
  );
}
