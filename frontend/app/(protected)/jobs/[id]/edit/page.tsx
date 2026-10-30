"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { JobForm } from "@/components/jobs/JobForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { DetailSkeleton } from "@/components/ui/LoadingState";
import { useJob, useUpdateJob } from "@/hooks/useJobs";
import type { JobInput } from "@/types/job";

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: job, error, isPending, refetch } = useJob(id);
  const updateJob = useUpdateJob();

  function submit(input: JobInput) {
    // The form has no status field for closed jobs; saving an edit must not reopen one.
    const { status, ...details } = input;
    const changes = job?.status === "Closed" ? details : { ...details, status };
    updateJob.mutate(
      { id, changes },
      {
        onSuccess: () => {
          toast.success("Job updated. Re-run screening to apply any requirement changes.");
          router.push(`/jobs/${id}`);
        },
        onError: (mutationError) => toast.error(mutationError.message),
      },
    );
  }

  return (
    <>
      <PageHeader title="Edit Job" />
      {isPending && <DetailSkeleton />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {job && (
        <JobForm
          job={job}
          submitLabel="Save Changes"
          cancelHref={`/jobs/${id}`}
          onSubmit={submit}
          pending={updateJob.isPending}
        />
      )}
    </>
  );
}
