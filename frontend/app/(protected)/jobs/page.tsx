"use client";

import { BriefcaseBusiness, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { JobTable } from "@/components/jobs/JobTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { TableSkeleton } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import { useJobs } from "@/hooks/useJobs";

const STATUS_OPTIONS = ["Active", "Closed", "Draft"].map((value) => ({ value, label: value }));

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, isPending, refetch } = useJobs({ search, status, page });
  const filtered = Boolean(search || status);

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Manage your openings and their candidates."
        actions={
          <Link href="/jobs/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Create Job
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBar
          value={search}
          placeholder="Search by title or department"
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <FilterDropdown
          label="Filter by status"
          placeholder="All statuses"
          value={status}
          options={STATUS_OPTIONS}
          className="w-40"
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </div>

      {isPending && <TableSkeleton />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data && data.items.length === 0 && (
        <EmptyState
          icon={BriefcaseBusiness}
          title={filtered ? "No jobs match your search." : "No jobs created yet."}
          description={
            filtered
              ? "Try a different search or filter."
              : "Create your first job to start screening candidates."
          }
          action={
            !filtered && (
              <Link href="/jobs/new" className={buttonVariants()}>
                Create Job
              </Link>
            )
          }
        />
      )}
      {data && data.items.length > 0 && (
        <>
          <JobTable jobs={data.items} />
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
