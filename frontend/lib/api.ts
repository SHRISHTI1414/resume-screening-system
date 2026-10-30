import { createClient } from "@/lib/supabase";
import { toQuery } from "@/lib/utils";
import type { CandidateDetail } from "@/types/candidate";
import type { Job, JobDetail, JobInput, JobStatus, Page } from "@/types/job";
import type {
  ApplicationStatus,
  DashboardStats,
  ResumeInfo,
  ScreeningItem,
} from "@/types/screening";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const {
    data: { session },
  } = await createClient().auth.getSession();

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Cannot reach the server. It may be waking up, so please try again in a minute.",
      0,
    );
  }

  if (response.status === 401 && typeof window !== "undefined") {
    // A full page load on purpose: it drops everything cached for the expired session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.message ?? "Something went wrong", response.status);
  }
  return response;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init);
  const body = await response.json();
  return body.data as T;
}

function sendJson<T>(path: string, method: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export interface JobFilters {
  search?: string;
  status?: string;
  page?: number;
}

export interface CandidateFilters {
  search?: string;
  status?: string;
  job_id?: string;
  min_score?: string;
  min_experience?: string;
  page?: number;
}

export interface ScreeningFilters {
  job_id?: string;
  status?: string;
  min_score?: string;
  min_experience?: string;
  skill?: string;
  sort?: string;
  page?: number;
}

export const api = {
  jobs: {
    list: (filters: JobFilters = {}) => request<Page<Job>>(`/api/jobs${toQuery(filters)}`),
    get: (id: string) => request<JobDetail>(`/api/jobs/${id}`),
    create: (job: JobInput) => sendJson<JobDetail>("/api/jobs", "POST", job),
    update: (id: string, changes: Partial<JobInput> | { status: JobStatus }) =>
      sendJson<JobDetail>(`/api/jobs/${id}`, "PUT", changes),
    remove: (id: string) => request<unknown>(`/api/jobs/${id}`, { method: "DELETE" }),
    exportCsv: async (id: string) => (await send(`/api/jobs/${id}/export`)).blob(),
  },
  candidates: {
    list: (filters: CandidateFilters = {}) =>
      request<Page<ScreeningItem>>(`/api/candidates${toQuery(filters)}`),
    get: (id: string) => request<CandidateDetail>(`/api/candidates/${id}`),
  },
  resumes: {
    upload: (jobId: string, file: File) => {
      const form = new FormData();
      form.append("job_id", jobId);
      form.append("file", file);
      return request<ResumeInfo>("/api/resumes/upload", { method: "POST", body: form });
    },
    get: (id: string, download = false) =>
      request<ResumeInfo>(`/api/resumes/${id}${toQuery({ download: download || undefined })}`),
  },
  screening: {
    list: (filters: ScreeningFilters = {}) =>
      request<Page<ScreeningItem>>(`/api/screening${toQuery(filters)}`),
    forJob: (jobId: string, page = 1) =>
      request<Page<ScreeningItem>>(`/api/screening/${jobId}${toQuery({ page })}`),
    run: (jobId: string) =>
      request<{ queued: number }>(`/api/screening/${jobId}`, { method: "POST" }),
  },
  applications: {
    updateStatus: (id: string, status: ApplicationStatus) =>
      sendJson<unknown>(`/api/applications/${id}/status`, "PATCH", { status }),
  },
  dashboard: {
    stats: () => request<DashboardStats>("/api/dashboard/stats"),
  },
};
