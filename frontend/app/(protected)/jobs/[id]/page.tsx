"use client";

import { CircleAlert, Gauge, Loader2, RefreshCw, Star, Trophy, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { FAIRNESS_NOTE } from "@/components/candidates/AIRecommendation";
import { CandidateTable } from "@/components/candidates/CandidateTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { ExportButton } from "@/components/jobs/ExportButton";
import { JobActions } from "@/components/jobs/JobActions";
import { ResumeUploader } from "@/components/jobs/ResumeUploader";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { DetailSkeleton, TableSkeleton } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { SkillList } from "@/components/ui/SkillBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useJob } from "@/hooks/useJobs";
import { useJobScreening, useRunScreening } from "@/hooks/useScreening";
import { formatScore } from "@/lib/utils";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-medium">{title}</h2>
      {children}
    </section>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data: job, error, isPending, refetch } = useJob(id);
  const ranking = useJobScreening(id, page);
  const runScreening = useRunScreening();

  if (isPending) return <DetailSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  function rerun() {
    runScreening.mutate(id, {
      onSuccess: ({ queued }) =>
        toast.success(
          queued ? `Screening ${queued} resume${queued === 1 ? "" : "s"}` : "Nothing to screen yet",
        ),
      onError: (mutationError) => toast.error(mutationError.message),
    });
  }

  const details = [
    ["Department", job.department],
    ["Location", job.location],
    ["Experience", job.experience_required],
    ["Employment Type", job.employment_type],
    ["Education", job.education_requirement],
  ].filter(([, value]) => value);

  return (
    <>
      <PageHeader
        title={job.title}
        actions={
          <>
            <StatusBadge status={job.status} />
            <ExportButton jobId={job.id} jobTitle={job.title} />
            <Button
              variant="outline"
              onClick={rerun}
              disabled={runScreening.isPending || job.processing_count > 0}
            >
              <RefreshCw aria-hidden />
              Re-run Screening
            </Button>
            <JobActions job={job} showView={false} onDeleted={() => router.replace("/jobs")} />
          </>
        }
      />

      <div className="space-y-4">
        {job.processing_count > 0 && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Processing {job.processing_count} resume{job.processing_count === 1 ? "" : "s"}...
          </p>
        )}

        {job.structured_requirements === null && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            AI analysis of this job is not available yet, so candidates are scored against the
            skills you entered. It is tried again the next time a resume is screened.
          </p>
        )}

        {job.failed_resumes.length > 0 && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4">
            <h2 className="flex items-center gap-2 text-sm font-medium text-red-800">
              <CircleAlert className="size-4" aria-hidden />
              {job.failed_resumes.length} resume{job.failed_resumes.length === 1 ? "" : "s"} could
              not be processed
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-red-800">
              {job.failed_resumes.map((resume) => (
                <li key={resume.id}>
                  <span className="font-medium">{resume.file_name}:</span>{" "}
                  {resume.error_message ?? "Unable to process this resume."}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Candidates" value={job.candidate_count} icon={Users} />
          <StatCard label="Shortlisted" value={job.shortlisted_count} icon={Star} />
          <StatCard label="Average Score" value={formatScore(job.average_score)} icon={Gauge} />
          <StatCard label="Highest Score" value={formatScore(job.highest_score)} icon={Trophy} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Panel title="Job Information">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {details.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <Panel title="Job Description">
              <p className="text-sm leading-6 whitespace-pre-line">{job.description}</p>
            </Panel>
          </div>
          <div className="space-y-4">
            <Panel title="Required Skills">
              <SkillList skills={job.required_skills} />
            </Panel>
            <Panel title="Preferred Skills">
              <SkillList skills={job.preferred_skills} empty="None specified." />
            </Panel>
          </div>
        </div>

        {job.status === "Closed" ? (
          <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            This job is closed, so new resumes cannot be uploaded.
          </p>
        ) : (
          <Panel title="Upload Resume">
            <ResumeUploader jobId={job.id} />
          </Panel>
        )}

        <section>
          <h2 className="mb-3 font-medium">Candidate Ranking</h2>
          {ranking.isPending && <TableSkeleton />}
          {ranking.error && <ErrorState error={ranking.error} onRetry={ranking.refetch} />}
          {ranking.data?.items.length === 0 && (
            <EmptyState
              icon={Users}
              title="No candidates found."
              description="Upload a resume to begin."
            />
          )}
          {ranking.data && ranking.data.items.length > 0 && (
            <>
              <CandidateTable
                items={ranking.data.items}
                columns={[
                  "rank",
                  "candidate",
                  "experience",
                  "skillsMatch",
                  "score",
                  "category",
                  "status",
                  "actions",
                ]}
              />
              <Pagination
                page={ranking.data.page}
                pageSize={ranking.data.page_size}
                total={ranking.data.total}
                onPageChange={setPage}
              />
              <p className="mt-3 text-xs text-muted-foreground">{FAIRNESS_NOTE}</p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
