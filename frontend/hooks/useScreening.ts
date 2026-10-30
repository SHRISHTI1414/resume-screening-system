import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type ScreeningFilters } from "@/lib/api";
import type { ApplicationStatus } from "@/types/screening";

export function useScreening(filters: ScreeningFilters = {}) {
  return useQuery({
    queryKey: ["screening", filters],
    queryFn: () => api.screening.list(filters),
    placeholderData: keepPreviousData,
  });
}

export function useJobScreening(jobId: string, page: number) {
  return useQuery({
    queryKey: ["screening", "job", jobId, page],
    queryFn: () => api.screening.forJob(jobId, page),
    placeholderData: keepPreviousData,
  });
}

export function useRunScreening() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => api.screening.run(jobId),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      api.applications.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard.stats });
}
