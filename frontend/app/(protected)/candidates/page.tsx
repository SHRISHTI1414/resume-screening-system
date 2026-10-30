"use client";

import { Users } from "lucide-react";
import { useState } from "react";

import { CandidateTable } from "@/components/candidates/CandidateTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { TableSkeleton } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import { useCandidates } from "@/hooks/useCandidates";
import { useJobs } from "@/hooks/useJobs";
import { EXPERIENCE_OPTIONS, SCORE_OPTIONS } from "@/lib/filters";
import { APPLICATION_STATUSES } from "@/types/screening";

const EMPTY_FILTERS = { search: "", status: "", job_id: "", min_score: "", min_experience: "" };

export default function CandidatesPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const { data, error, isPending, refetch } = useCandidates({ ...filters, page });
  const jobs = useJobs();
  const filtered = Object.values(filters).some(Boolean);

  function setFilter(name: keyof typeof EMPTY_FILTERS, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  return (
    <>
      <PageHeader title="Candidates" description="Everyone who has applied to your jobs." />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBar
          value={filters.search}
          placeholder="Search by name, email or skill"
          onChange={(value) => setFilter("search", value)}
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
      </div>

      {isPending && <TableSkeleton />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data && data.items.length === 0 && (
        <EmptyState
          icon={Users}
          title="No candidates found."
          description={filtered ? "Try a different search or filter." : "Upload a resume to begin."}
        />
      )}
      {data && data.items.length > 0 && (
        <>
          <CandidateTable
            items={data.items}
            columns={["candidate", "job", "experience", "score", "category", "status", "actions"]}
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
