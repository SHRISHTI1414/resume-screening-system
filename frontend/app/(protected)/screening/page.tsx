"use client";

import { FileSearch } from "lucide-react";
import { useState } from "react";

import { FAIRNESS_NOTE } from "@/components/candidates/AIRecommendation";
import { CandidateTable } from "@/components/candidates/CandidateTable";
import { ExportButton } from "@/components/jobs/ExportButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { TableSkeleton } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import { useJobs } from "@/hooks/useJobs";
import { useScreening } from "@/hooks/useScreening";
import { EXPERIENCE_OPTIONS, SCORE_OPTIONS } from "@/lib/filters";
import { APPLICATION_STATUSES } from "@/types/screening";

const SORT_OPTIONS = [
  { value: "highest", label: "Highest Score" },
  { value: "lowest", label: "Lowest Score" },
  { value: "newest", label: "Newest" },
];

const EMPTY_FILTERS = { job_id: "", status: "", min_score: "", min_experience: "", skill: "" };

export default function ScreeningPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState("highest");
  const [page, setPage] = useState(1);
  const { data, error, isPending, refetch } = useScreening({ ...filters, sort, page });
  const jobs = useJobs();
  const selectedJob = jobs.data?.items.find((job) => job.id === filters.job_id);
  const filtered = Object.values(filters).some(Boolean);

  function setFilter(name: keyof typeof EMPTY_FILTERS, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="Screening"
        description={FAIRNESS_NOTE}
        actions={
          selectedJob && <ExportButton jobId={selectedJob.id} jobTitle={selectedJob.title} />
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBar
          value={filters.skill}
          placeholder="Filter by skill"
          onChange={(value) => setFilter("skill", value)}
        />
        <FilterDropdown
          label="Filter by job"
          placeholder="All jobs"
          value={filters.job_id}
          options={(jobs.data?.items ?? []).map((job) => ({ value: job.id, label: job.title }))}
          onChange={(value) => setFilter("job_id", value)}
          className="w-48"
        />
        <FilterDropdown
          label="Filter by score"
          placeholder="Any score"
          value={filters.min_score}
          options={SCORE_OPTIONS}
          onChange={(value) => setFilter("min_score", value)}
          className="w-40"
        />
        <FilterDropdown
          label="Filter by status"
          placeholder="All statuses"
          value={filters.status}
          options={APPLICATION_STATUSES.map((value) => ({ value, label: value }))}
          onChange={(value) => setFilter("status", value)}
          className="w-40"
        />
        <FilterDropdown
          label="Filter by experience"
          placeholder="Any experience"
          value={filters.min_experience}
          options={EXPERIENCE_OPTIONS}
          onChange={(value) => setFilter("min_experience", value)}
          className="w-40"
        />
        <FilterDropdown
          label="Sort results"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(value) => {
            setSort(value);
            setPage(1);
          }}
          className="w-40"
        />
      </div>

      {isPending && <TableSkeleton />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data && data.items.length === 0 && (
        <EmptyState
          icon={FileSearch}
          title="No screening results found."
          description={
            filtered ? "Try a different filter." : "Upload resumes to a job to see results here."
          }
        />
      )}
      {data && data.items.length > 0 && (
        <>
          <CandidateTable
            items={data.items}
            quickActions
            columns={[
              "rank",
              "candidate",
              "job",
              "score",
              "category",
              "matched",
              "missing",
              "status",
              "actions",
            ]}
          />
          <Pagination
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  );
}
