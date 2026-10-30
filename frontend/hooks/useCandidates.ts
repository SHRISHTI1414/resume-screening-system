import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api, type CandidateFilters } from "@/lib/api";

export function useCandidates(filters: CandidateFilters = {}) {
  return useQuery({
    queryKey: ["candidates", filters],
    queryFn: () => api.candidates.list(filters),
    placeholderData: keepPreviousData,
  });
}

export function useCandidate(id: string) {
  return useQuery({ queryKey: ["candidate", id], queryFn: () => api.candidates.get(id) });
}
