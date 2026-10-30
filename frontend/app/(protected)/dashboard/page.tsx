"use client";

import { BriefcaseBusiness, Gauge, Star, Users } from "lucide-react";
import Link from "next/link";

import { CandidateTable } from "@/components/candidates/CandidateTable";
import { ScoreDistributionChart } from "@/components/dashboard/ScoreDistributionChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { JobTable } from "@/components/jobs/JobTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { DashboardSkeleton } from "@/components/ui/LoadingState";
import { useDashboard } from "@/hooks/useScreening";
import { useUser } from "@/hooks/useUser";
import { formatScore, greeting } from "@/lib/utils";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-medium">{title}</h2>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const { data: user } = useUser();
  const { data: stats, error, isPending, refetch } = useDashboard();

  return (
    <>
      <PageHeader
        title={`${greeting(new Date().getHours())}${user ? `, ${user.fullName}` : ""}`}
        description="Here's what's happening with your recruitment."
      />

      {isPending && <DashboardSkeleton />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {stats && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active Jobs" value={stats.active_jobs} icon={BriefcaseBusiness} />
            <StatCard label="Total Candidates" value={stats.total_candidates} icon={Users} />
            <StatCard label="Shortlisted" value={stats.shortlisted} icon={Star} />
            <StatCard
              label="Average Match Score"
              value={formatScore(stats.average_score)}
              icon={Gauge}
            />
          </div>

          {stats.total_jobs === 0 ? (
            <EmptyState
              icon={BriefcaseBusiness}
              title="No jobs created yet."
              description="Create your first job to start screening candidates."
              action={
                <Link href="/jobs/new" className={buttonVariants()}>
                  Create Job
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Candidate Score Distribution">
                  <ScoreDistributionChart data={stats.score_distribution} />
                </Panel>
                <Panel title="Candidate Status Distribution">
                  <StatusChart data={stats.status_distribution} />
                </Panel>
              </div>

              <section>
                <h2 className="mb-3 font-medium">Recent Jobs</h2>
                <JobTable jobs={stats.recent_jobs} />
              </section>

              {stats.top_candidates.length > 0 && (
                <section>
                  <h2 className="mb-3 font-medium">Top Candidates</h2>
                  <CandidateTable
                    items={stats.top_candidates}
                    columns={["candidate", "job", "score", "category", "status", "actions"]}
                  />
                </section>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
