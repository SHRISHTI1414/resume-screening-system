import { BrainCircuit, Gauge, ListChecks, ScanSearch, Target } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "AI Resume Analysis",
    text: "Turn PDF and DOCX resumes into structured candidate profiles automatically.",
  },
  {
    icon: Target,
    title: "Smart Candidate Matching",
    text: "Compare skills, experience, projects and education against each job.",
  },
  {
    icon: Gauge,
    title: "Explainable Scoring",
    text: "See exactly how every score was calculated, component by component.",
  },
  {
    icon: ListChecks,
    title: "Candidate Shortlisting",
    text: "Rank candidates, review them and track each decision in one place.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanSearch className="size-4" aria-hidden />
          </span>
          ResumeScreen AI
        </span>
        <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
          Login
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            AI-Powered Resume Screening
          </h1>
          <p className="mt-3 text-xl text-primary sm:text-2xl">Find the right candidates faster.</p>
          <p className="mt-4 text-muted-foreground">
            Automatically analyze resumes, match candidates against job requirements, and get
            explainable AI-powered recommendations.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Get Started
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Login
            </Link>
          </div>
        </section>

        <section aria-label="Features" className="border-t bg-muted/40 py-16">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-xl border bg-white p-5 shadow-sm">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-3 font-medium">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        AI-Based Resume Screening and Candidate Shortlisting System
      </footer>
    </div>
  );
}
