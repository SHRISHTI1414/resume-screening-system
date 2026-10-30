"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase";
import { registerSchema, type RegisterValues } from "@/lib/validations";

const FIELDS = [
  { name: "fullName", label: "Full Name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
  {
    name: "confirmPassword",
    label: "Confirm Password",
    type: "password",
    autoComplete: "new-password",
  },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmEmailTo, setConfirmEmailTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit({ fullName, email, password }: RegisterValues) {
    setFormError(null);
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setFormError(error.message);
    } else if (data.session) {
      router.replace("/dashboard");
      router.refresh();
    } else {
      // Supabase's "Confirm email" setting is on: there is no session until the link is clicked.
      setConfirmEmailTo(email);
    }
  }

  const footer = (
    <>
      Already have an account?{" "}
      <Link href="/login" className="font-medium text-primary hover:underline">
        Login
      </Link>
    </>
  );

  if (confirmEmailTo) {
    return (
      <AuthCard
        title="Check your email"
        subtitle={`We sent a confirmation link to ${confirmEmailTo}. Open it, then log in.`}
        footer={footer}
      >
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Go to login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start screening candidates in minutes."
      footer={footer}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {FIELDS.map(({ name, label, type, autoComplete }) => (
          <FormField key={name} id={name} label={label} error={errors[name]?.message}>
            <Input
              id={name}
              type={type}
              autoComplete={autoComplete}
              aria-invalid={Boolean(errors[name])}
              {...register(name)}
            />
          </FormField>
        ))}
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create Account"}
        </Button>
      </form>
    </AuthCard>
  );
}
