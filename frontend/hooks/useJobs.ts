import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type JobFilters } from "@/lib/api";
import type { JobInput, JobStatus } from "@/types/job";

export function useJobs(filters: JobFilters = {}) {
  return useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => api.jobs.list(filters),
    placeholderData: keepPreviousData,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => api.jobs.get(id),
    // Resumes are processed in the background, so keep watching until they finish.
    refetchInterval: (query) => ((query.state.data?.processing_count ?? 0) > 0 ? 3000 : false),
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (job: JobInput) => api.jobs.create(job),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string;
      changes: Partial<JobInput> | { status: JobStatus };
    }) => api.jobs.update(id, changes),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.jobs.remove(id),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
