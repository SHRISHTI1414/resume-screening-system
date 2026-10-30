"use client";

import { useParams } from "next/navigation";

import { CandidateProfile } from "@/components/candidates/CandidateProfile";
import { ErrorState } from "@/components/ui/ErrorState";
import { DetailSkeleton } from "@/components/ui/LoadingState";
import { useCandidate } from "@/hooks/useCandidates";

export default function CandidatePage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isPending, refetch } = useCandidate(id);

  if (isPending) return <DetailSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return <CandidateProfile candidate={data} />;
}
