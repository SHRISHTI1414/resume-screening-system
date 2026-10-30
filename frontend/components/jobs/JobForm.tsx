"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";

import { TagInput } from "@/components/jobs/TagInput";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { jobSchema, type JobFormValues } from "@/lib/validations";
import type { Job, JobInput } from "@/types/job";

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];

function toFormValues(job?: Job): JobFormValues {
  return {
    title: job?.title ?? "",
    department: job?.department ?? "",
    location: job?.location ?? "",
    employment_type: job?.employment_type ?? "Full-time",
    experience_required: job?.experience_required ?? "",
    description: job?.description ?? "",
    required_skills: job?.required_skills ?? [],
    preferred_skills: job?.preferred_skills ?? [],
    education_requirement: job?.education_requirement ?? "",
    status: job?.status === "Draft" ? "Draft" : "Active",
  };
}

function toInput(values: JobFormValues): JobInput {
  return {
    ...values,
    department: values.department || null,
    location: values.location || null,
    employment_type: values.employment_type || null,
    experience_required: values.experience_required || null,
    education_requirement: values.education_requirement || null,
  };
}

export function JobForm({
  job,
  submitLabel,
  cancelHref,
  onSubmit,
  pending,
}: {
  job?: Job;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (input: JobInput) => void;
  pending: boolean;
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: toFormValues(job),
  });

  function textProps(
    name: "title" | "department" | "location" | "experience_required" | "education_requirement",
  ) {
    return {
      id: name,
      "aria-invalid": Boolean(errors[name]),
      "aria-describedby": errors[name] ? `${name}-error` : undefined,
      ...register(name),
    };
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(toInput(values)))}
      className="max-w-3xl space-y-5 rounded-xl border bg-white p-5 shadow-sm"
    >
      <FormField id="title" label="Job Title" error={errors.title?.message}>
        <Input placeholder="Backend Developer" {...textProps("title")} />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="department" label="Department" error={errors.department?.message}>
          <Input placeholder="Engineering" {...textProps("department")} />
        </FormField>
        <FormField id="location" label="Location" error={errors.location?.message}>
          <Input placeholder="Bengaluru (Hybrid)" {...textProps("location")} />
        </FormField>
        <FormField id="employment_type" label="Employment Type">
          <select
            id="employment_type"
            {...register("employment_type")}
            className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </FormField>
        <FormField
          id="experience_required"
          label="Experience Required"
          error={errors.experience_required?.message}
          hint='For example "2 years" or "3-5 years". The first number is the minimum.'
        >
          <Input placeholder="2 years" {...textProps("experience_required")} />
        </FormField>
      </div>

      <FormField id="description" label="Job Description" error={errors.description?.message}>
        <Textarea
          id="description"
          rows={8}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "description-error" : undefined}
          placeholder="Describe the role, responsibilities and requirements."
          {...register("description")}
        />
      </FormField>

      <FormField
        id="required_skills"
        label="Required Skills"
        error={errors.required_skills?.message}
        hint="Press Enter or comma after each skill."
      >
        <Controller
          control={control}
          name="required_skills"
          render={({ field }) => (
            <TagInput
              id="required_skills"
              value={field.value}
              onChange={field.onChange}
              placeholder="Python, FastAPI, SQL"
              invalid={Boolean(errors.required_skills)}
            />
          )}
        />
      </FormField>

      <FormField id="preferred_skills" label="Preferred Skills">
        <Controller
          control={control}
          name="preferred_skills"
          render={({ field }) => (
            <TagInput
              id="preferred_skills"
              value={field.value}
              onChange={field.onChange}
              placeholder="Docker, AWS"
            />
          )}
        />
      </FormField>

      <FormField
        id="education_requirement"
        label="Education Requirement"
        error={errors.education_requirement?.message}
      >
        <Input
          placeholder="Bachelor's degree in Computer Science"
          {...textProps("education_requirement")}
        />
      </FormField>

      {(!job || job.status !== "Closed") && (
        <FormField id="status" label="Status">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <FilterDropdown
                label="Job status"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Draft", label: "Draft" },
                ]}
                className="max-w-48"
              />
            )}
          />
        </FormField>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? "Saving and analyzing..." : submitLabel}
        </Button>
        <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
