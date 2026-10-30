import { z } from "zod";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const passwordField = z.string().min(8, "Use at least 8 characters");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    email: z.email("Enter a valid email address"),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const jobSchema = z.object({
  title: z.string().trim().min(2, "Enter a job title").max(255),
  department: z.string().trim().max(255),
  location: z.string().trim().max(255),
  employment_type: z.string().trim().max(100),
  experience_required: z.string().trim().max(100),
  description: z.string().trim().min(20, "Describe the job in at least 20 characters"),
  required_skills: z.array(z.string()).min(1, "Add at least one required skill"),
  preferred_skills: z.array(z.string()),
  education_requirement: z.string().trim().max(255),
  status: z.enum(["Active", "Draft"]),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
});

export const passwordSchema = z
  .object({ password: passwordField, confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type JobFormValues = z.infer<typeof jobSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type PasswordValues = z.infer<typeof passwordSchema>;

/** Returns a message when a file cannot be uploaded, or null when it is fine. */
export function validateResumeFile(file: { name: string; size: number }): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "pdf" && extension !== "docx") return "Only PDF and DOCX files are supported.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_FILE_BYTES) return "Files must be 5 MB or smaller.";
  return null;
}
