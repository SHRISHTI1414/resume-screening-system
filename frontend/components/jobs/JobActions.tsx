"use client";

import { Eye, Lock, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDeleteJob, useUpdateJob } from "@/hooks/useJobs";
import type { Job } from "@/types/job";

export function JobActions({
  job,
  onDeleted,
  showView = true,
}: {
  job: Job;
  onDeleted?: () => void;
  showView?: boolean;
}) {
  const [confirming, setConfirming] = useState<"close" | "delete" | null>(null);
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  function closeJob() {
    updateJob.mutate(
      { id: job.id, changes: { status: "Closed" } },
      {
        onSuccess: () => toast.success("Job closed"),
        onError: (error) => toast.error(error.message),
        onSettled: () => setConfirming(null),
      },
    );
  }

  function removeJob() {
    deleteJob.mutate(job.id, {
      onSuccess: () => {
        toast.success("Job deleted");
        onDeleted?.();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setConfirming(null),
    });
  }

  return (
    <div className="flex items-center gap-1">
      {showView && (
        <Link
          href={`/jobs/${job.id}`}
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          aria-label={`View ${job.title}`}
          title="View"
        >
          <Eye aria-hidden />
        </Link>
      )}
      <Link
        href={`/jobs/${job.id}/edit`}
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        aria-label={`Edit ${job.title}`}
        title="Edit"
      >
        <Pencil aria-hidden />
      </Link>
      {job.status !== "Closed" && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Close ${job.title}`}
          title="Close"
          onClick={() => setConfirming("close")}
        >
          <Lock aria-hidden />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${job.title}`}
        title="Delete"
        onClick={() => setConfirming("delete")}
      >
        <Trash2 aria-hidden />
      </Button>

      <ConfirmDialog
        open={confirming === "close"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Close this job?"
        description="No more resumes can be uploaded. Existing candidates and scores are kept."
        confirmLabel="Close Job"
        onConfirm={closeJob}
        pending={updateJob.isPending}
      />
      <ConfirmDialog
        open={confirming === "delete"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Delete this job?"
        description="This permanently deletes the job, its resumes and its screening results. This cannot be undone."
        confirmLabel="Delete Job"
        onConfirm={removeJob}
        pending={deleteJob.isPending}
      />
    </div>
  );
}
