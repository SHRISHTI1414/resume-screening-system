import type { Job } from "@/types/job";

export const APPLICATION_STATUSES = [
  "New",
  "Under Review",
  "Shortlisted",
  "Interview",
  "Rejected",
  "Hired",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface Screening {
  overall_score: number;
  category: string;
  skills_score: number;
  experience_score: number;
  semantic_score: number;
  projects_score: number;
  education_score: number;
  certifications_score: number;
  ai_score: number;
  matched_skills: string[];
  missing_skills: string[];
  ai_summary: string | null;
  strengths: string[];
  weaknesses: string[];
  recommendation: string | null;
}

export interface ScreeningItem {
  rank: number | null;
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string | null;
  job_id: string;
  job_title: string;
  status: ApplicationStatus;
  experience_years: number;
  skills: string[];
  created_at: string;
  screening: Screening | null;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface DashboardStats {
  total_jobs: number;
  active_jobs: number;
  total_candidates: number;
  shortlisted: number;
  average_score: number | null;
  score_distribution: ChartPoint[];
  status_distribution: ChartPoint[];
  recent_jobs: Job[];
  top_candidates: ScreeningItem[];
}

export interface ResumeInfo {
  id: string;
  job_id: string;
  candidate_id: string | null;
  file_name: string;
  file_type: string;
  processing_status: "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  download_url?: string | null;
}
