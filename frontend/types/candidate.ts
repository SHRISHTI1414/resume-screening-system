import type { ApplicationStatus, Screening } from "@/types/screening";

export interface EducationEntry {
  degree?: string | null;
  field?: string | null;
  institution?: string | null;
  year?: string | null;
}

export interface ExperienceEntry {
  title?: string | null;
  company?: string | null;
  duration?: string | null;
  description?: string | null;
}

export interface ProjectEntry {
  name?: string | null;
  description?: string | null;
  technologies?: string[] | null;
}

export interface CandidateApplication {
  application_id: string;
  job_id: string;
  job_title: string;
  resume_id: string;
  resume_file_name: string;
  status: ApplicationStatus;
  screening: Screening | null;
}

export interface CandidateDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  summary: string | null;
  created_at: string;
  skills: string[];
  programming_languages: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  certifications: string[];
  total_experience_years: number;
  applications: CandidateApplication[];
}
