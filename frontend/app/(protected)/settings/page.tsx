"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FAIRNESS_NOTE } from "@/components/candidates/AIRecommendation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase";
import {
  passwordSchema,
  profileSchema,
  type PasswordValues,
  type ProfileValues,
} from "@/lib/validations";

const WEIGHTS = [
  ["Required Skills", 35],
  ["Experience", 20],
  ["Semantic Match", 20],
  ["Projects", 10],
  ["Education", 5],
  ["Certifications", 5],
  ["AI Evaluation", 5],
] as const;

function ProfileForm() {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "" },
  });

  useEffect(() => {
    if (user) reset({ fullName: user.fullName });
  }, [user, reset]);

  async function onSubmit({ fullName }: ProfileValues) {
    const { error } = await createClient().auth.updateUser({ data: { full_name: fullName } });
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["user"] });
    toast.success("Profile updated");
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField id="fullName" label="Full Name" error={errors.fullName?.message}>
        <Input id="fullName" aria-invalid={Boolean(errors.fullName)} {...register("fullName")} />
      </FormField>
      <FormField id="email" label="Email">
        <Input id="email" value={user?.email ?? ""} readOnly disabled />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        Save Profile
      </Button>
    </form>
  );
}

function PasswordForm() {
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  async function onSubmit({ password }: PasswordValues) {
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      return;
    }
    reset({ password: "", confirmPassword: "" });
    toast.success("Password changed");
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField id="password" label="New Password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </FormField>
      <FormField
        id="confirmPassword"
        label="Confirm New Password"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        Change Password
      </Button>
    </form>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Your account and how scoring works." />
      <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-medium">Profile</h2>
          <ProfileForm />
        </section>
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-medium">Password</h2>
          <PasswordForm />
        </section>
        <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-1 font-medium">How scores are calculated</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Sensitive characteristics such as gender, religion, race, caste, age or marital status
            are never scored.
          </p>
          <ul className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {WEIGHTS.map(([label, weight]) => (
              <li key={label} className="flex justify-between border-b py-1">
                <span>{label}</span>
                <span className="font-medium tabular-nums">{weight}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{FAIRNESS_NOTE}</p>
        </section>
      </div>
    </>
  );
}
