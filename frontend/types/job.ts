export type JobStatus = "Active" | "Closed" | "Draft";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface JobInput {
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  experience_required: string | null;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  education_requirement: string | null;
  status: "Active" | "Draft";
}

export interface Job extends Omit<JobInput, "status"> {
  id: string;
  status: JobStatus;
  structured_requirements: Record<string, unknown> | null;
  candidate_count: number;
  shortlisted_count: number;
  average_score: number | null;
  highest_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface FailedResume {
  id: string;
  file_name: string;
  error_message: string | null;
}

export interface JobDetail extends Job {
  processing_count: number;
  failed_resumes: FailedResume[];
}
