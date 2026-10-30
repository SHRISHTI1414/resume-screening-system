import Link from "next/link";

import { JobActions } from "@/components/jobs/JobActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatScore } from "@/lib/utils";
import type { Job } from "@/types/job";

export function JobCard({ job }: { job: Job }) {
  return (
    <article className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/jobs/${job.id}`} className="block truncate font-medium hover:text-primary">
            {job.title}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {[job.department, job.location, job.employment_type].filter(Boolean).join(" · ")}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Candidates</dt>
          <dd className="font-medium">{job.candidate_count}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Avg. Score</dt>
          <dd className="font-medium">{formatScore(job.average_score)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Created</dt>
          <dd className="font-medium">{formatDate(job.created_at)}</dd>
        </div>
      </dl>
      <div className="mt-2 flex justify-end">
        <JobActions job={job} />
      </div>
    </article>
  );
}
