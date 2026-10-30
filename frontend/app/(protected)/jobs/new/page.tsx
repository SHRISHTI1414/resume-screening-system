"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { JobForm } from "@/components/jobs/JobForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCreateJob } from "@/hooks/useJobs";
import type { JobInput } from "@/types/job";

export default function NewJobPage() {
  const router = useRouter();
  const createJob = useCreateJob();

  function submit(input: JobInput) {
    createJob.mutate(input, {
      onSuccess: (job) => {
        toast.success("Job created");
        router.push(`/jobs/${job.id}`);
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <>
      <PageHeader
        title="Create Job"
        description="AI analyzes the description to pull out structured requirements."
      />
      <JobForm
        submitLabel="Create Job"
        cancelHref="/jobs"
        onSubmit={submit}
        pending={createJob.isPending}
      />
    </>
  );
}
