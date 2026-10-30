"use client";

import { Check, Eye, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { useUpdateStatus } from "@/hooks/useScreening";
import type { ApplicationStatus, ScreeningItem } from "@/types/screening";

export function CandidateActions({
  item,
  quickActions,
}: {
  item: ScreeningItem;
  quickActions?: boolean;
}) {
  const updateStatus = useUpdateStatus();

  function setStatus(status: ApplicationStatus) {
    updateStatus.mutate(
      { id: item.application_id, status },
      {
        onSuccess: () => toast.success(`${item.candidate_name}: ${status}`),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/candidates/${item.candidate_id}`}
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        aria-label={`View ${item.candidate_name}`}
      >
        <Eye aria-hidden />
      </Link>
      {quickActions && (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Shortlist ${item.candidate_name}`}
            title="Shortlist"
            disabled={updateStatus.isPending || item.status === "Shortlisted"}
            onClick={() => setStatus("Shortlisted")}
          >
            <Check aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Reject ${item.candidate_name}`}
            title="Reject"
            disabled={updateStatus.isPending || item.status === "Rejected"}
            onClick={() => setStatus("Rejected")}
          >
            <X aria-hidden />
          </Button>
        </>
      )}
    </div>
  );
}
