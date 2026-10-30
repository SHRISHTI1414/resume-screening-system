import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { ScoreBreakdown } from "@/components/candidates/ScoreBreakdown";
import { TagInput } from "@/components/jobs/TagInput";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Screening } from "@/types/screening";

const SCREENING: Screening = {
  overall_score: 88.4,
  category: "Strong Match",
  skills_score: 92,
  experience_score: 90,
  semantic_score: 84,
  projects_score: 80,
  education_score: 100,
  certifications_score: 70,
  ai_score: 88,
  matched_skills: [],
  missing_skills: [],
  ai_summary: null,
  strengths: [],
  weaknesses: [],
  recommendation: null,
};

describe("StatusBadge", () => {
  it("states the status in text, not only in color", () => {
    render(<StatusBadge status="Shortlisted" />);
    expect(screen.getByText("Shortlisted")).toBeInTheDocument();
  });
});

describe("SkillBadge", () => {
  it("tells screen readers when a skill is missing", () => {
    render(<SkillBadge skill="Docker" variant="missing" />);
    expect(screen.getByText("Missing:")).toHaveClass("sr-only");
  });
});

describe("ScoreBreakdown", () => {
  it("shows all seven components as accessible progress bars", () => {
    render(<ScoreBreakdown screening={SCREENING} />);
    const bars = screen.getAllByRole("progressbar");
    expect(bars).toHaveLength(7);
    expect(screen.getByRole("progressbar", { name: "AI Evaluation" })).toHaveAttribute(
      "aria-valuenow",
      "88",
    );
  });
});

describe("TagInput", () => {
  function Harness() {
    const [tags, setTags] = useState(["Python"]);
    return <TagInput id="skills" value={tags} onChange={setTags} placeholder="Add" />;
  }

  it("adds tags on Enter, ignores duplicates and removes tags", () => {
    render(<Harness />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "FastAPI" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("FastAPI")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "python" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getAllByRole("button")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Remove Python" }));
    expect(screen.queryByText("Python")).not.toBeInTheDocument();
  });
});
