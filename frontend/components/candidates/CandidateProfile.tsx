"use client";

import { ExternalLink, FileText, Globe, Mail, MapPin, Phone } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AIRecommendation } from "@/components/candidates/AIRecommendation";
import { ScoreBreakdown } from "@/components/candidates/ScoreBreakdown";
import { ScoreCard } from "@/components/candidates/ScoreCard";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { SkillList } from "@/components/ui/SkillBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useUpdateStatus } from "@/hooks/useScreening";
import { api } from "@/lib/api";
import { formatYears } from "@/lib/utils";
import type { CandidateDetail } from "@/types/candidate";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types/screening";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-medium">{title}</h2>
      {children}
    </section>
  );
}

function ContactLink({ href, icon, label }: { href?: string; icon: ReactNode; label: string }) {
  const content = (
    <>
      {icon}
      <span className="truncate">{label}</span>
    </>
  );
  const className = "flex max-w-full items-center gap-1.5 text-sm text-muted-foreground";
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={`${className} hover:text-primary`}>
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  );
}

export function CandidateProfile({ candidate }: { candidate: CandidateDetail }) {
  const [applicationId, setApplicationId] = useState(candidate.applications[0]?.application_id);
  const application =
    candidate.applications.find((item) => item.application_id === applicationId) ??
    candidate.applications[0];
  const screening = application?.screening;
  const updateStatus = useUpdateStatus();

  function changeStatus(status: string) {
    updateStatus.mutate(
      { id: application.application_id, status: status as ApplicationStatus },
      {
        onSuccess: () => toast.success(`Status changed to ${status}`),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  async function openResume() {
    // Opened first: browsers block pop-ups that are not a direct result of the click.
    const tab = window.open("", "_blank");
    try {
      const resume = await api.resumes.get(application.resume_id, true);
      if (!resume.download_url) throw new Error("This resume file is not available.");
      if (tab) tab.location.href = resume.download_url;
    } catch (error) {
      tab?.close();
      toast.error(error instanceof Error ? error.message : "This resume file is not available.");
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{candidate.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatYears(candidate.total_experience_years)} of experience
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {candidate.email && (
                <ContactLink
                  href={`mailto:${candidate.email}`}
                  icon={<Mail className="size-3.5 shrink-0" aria-hidden />}
                  label={candidate.email}
                />
              )}
              {candidate.phone && (
                <ContactLink
                  icon={<Phone className="size-3.5 shrink-0" aria-hidden />}
                  label={candidate.phone}
                />
              )}
              {candidate.location && (
                <ContactLink
                  icon={<MapPin className="size-3.5 shrink-0" aria-hidden />}
                  label={candidate.location}
                />
              )}
              {candidate.linkedin_url && (
                <ContactLink
                  href={candidate.linkedin_url}
                  icon={<ExternalLink className="size-3.5 shrink-0" aria-hidden />}
                  label="LinkedIn"
                />
              )}
              {candidate.github_url && (
                <ContactLink
                  href={candidate.github_url}
                  icon={<Globe className="size-3.5 shrink-0" aria-hidden />}
                  label="GitHub"
                />
              )}
            </div>
          </div>
          {application && (
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={application.status} />
              <FilterDropdown
                label="Change candidate status"
                value={application.status}
                disabled={updateStatus.isPending}
                onChange={changeStatus}
                options={APPLICATION_STATUSES.map((status) => ({ value: status, label: status }))}
                className="w-40"
              />
              <Button variant="outline" onClick={openResume}>
                <FileText aria-hidden />
                View Resume
              </Button>
            </div>
          )}
        </div>

        {candidate.applications.length > 1 && (
          <FilterDropdown
            label="Job to show results for"
            value={application?.application_id ?? ""}
            onChange={setApplicationId}
            options={candidate.applications.map((item) => ({
              value: item.application_id,
              label: item.job_title,
            }))}
            className="mt-4 max-w-sm"
          />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {screening ? (
            <Section title="AI Recommendation">
              <AIRecommendation screening={screening} />
            </Section>
          ) : (
            <Section title="AI Recommendation">
              <p className="text-sm text-muted-foreground">
                This candidate has not been scored yet. Use Re-run Screening on the job page.
              </p>
            </Section>
          )}

          {candidate.summary && (
            <Section title="Resume Summary">
              <p className="text-sm leading-6">{candidate.summary}</p>
            </Section>
          )}

          <Section title="Experience">
            {candidate.experience.length === 0 ? (
              <p className="text-sm text-muted-foreground">No experience listed.</p>
            ) : (
              <ol className="space-y-4 border-l pl-4">
                {candidate.experience.map((entry, index) => (
                  <li key={index}>
                    <p className="text-sm font-medium">
                      {[entry.title, entry.company].filter(Boolean).join(" · ")}
                    </p>
                    {entry.duration && (
                      <p className="text-xs text-muted-foreground">{entry.duration}</p>
                    )}
                    {entry.description && (
                      <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                        {entry.description}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Projects">
            {candidate.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects listed.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {candidate.projects.map((project, index) => (
                  <article key={index} className="rounded-lg border p-3">
                    <h3 className="text-sm font-medium">{project.name}</h3>
                    {project.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="mt-2">
                        <SkillList skills={project.technologies} />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          {screening && <ScoreCard screening={screening} />}
          {screening && (
            <Section title="Score Breakdown">
              <ScoreBreakdown screening={screening} />
            </Section>
          )}
          {screening && (
            <Section title="Matched Skills">
              <SkillList skills={screening.matched_skills} variant="matched" />
            </Section>
          )}
          {screening && (
            <Section title="Missing Skills">
              <SkillList
                skills={screening.missing_skills}
                variant="missing"
                empty="No required skills are missing."
              />
            </Section>
          )}
          <Section title="All Skills">
            <SkillList
              skills={[...new Set([...candidate.skills, ...candidate.programming_languages])]}
            />
          </Section>
          <Section title="Education">
            {candidate.education.length === 0 ? (
              <p className="text-sm text-muted-foreground">No education listed.</p>
            ) : (
              <ul className="space-y-2">
                {candidate.education.map((entry, index) => (
                  <li key={index} className="text-sm">
                    <p className="font-medium">
                      {[entry.degree, entry.field].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[entry.institution, entry.year].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Certifications">
            <SkillList skills={candidate.certifications} empty="No certifications listed." />
          </Section>
        </div>
      </div>
    </div>
  );
}
