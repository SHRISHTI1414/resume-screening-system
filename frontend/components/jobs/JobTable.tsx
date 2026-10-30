import Link from "next/link";

import { JobActions } from "@/components/jobs/JobActions";
import { JobCard } from "@/components/jobs/JobCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatScore } from "@/lib/utils";
import type { Job } from "@/types/job";

export function JobTable({ jobs }: { jobs: Job[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-white md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Candidates</TableHead>
              <TableHead>Avg. Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {job.title}
                  </Link>
                </TableCell>
                <TableCell>{job.department ?? "—"}</TableCell>
                <TableCell>{job.location ?? "—"}</TableCell>
                <TableCell>{job.employment_type ?? "—"}</TableCell>
                <TableCell>{job.candidate_count}</TableCell>
                <TableCell>{formatScore(job.average_score)}</TableCell>
                <TableCell>
                  <StatusBadge status={job.status} />
                </TableCell>
                <TableCell>{formatDate(job.created_at)}</TableCell>
                <TableCell>
                  <JobActions job={job} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </>
  );
}
