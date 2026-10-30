import { describe, expect, it } from "vitest";

import { formatFileSize, formatScore, formatYears, greeting, initials, toQuery } from "@/lib/utils";
import { jobSchema, registerSchema, validateResumeFile } from "@/lib/validations";

describe("formatting", () => {
  it("rounds scores and shows a dash when there is none", () => {
    expect(formatScore(88.4)).toBe("88%");
    expect(formatScore(0)).toBe("0%");
    expect(formatScore(null)).toBe("—");
  });

  it("formats file sizes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("formats years", () => {
    expect(formatYears(1)).toBe("1 yr");
    expect(formatYears(2.5)).toBe("2.5 yrs");
  });

  it("greets by time of day", () => {
    expect(greeting(9)).toBe("Good morning");
    expect(greeting(13)).toBe("Good afternoon");
    expect(greeting(20)).toBe("Good evening");
  });

  it("builds initials", () => {
    expect(initials("Asha Rao Kumar")).toBe("AR");
    expect(initials("asha")).toBe("A");
  });

  it("omits unset query parameters but keeps zero", () => {
    expect(toQuery({ search: "", status: undefined, page: 2, min: 0 })).toBe("?page=2&min=0");
    expect(toQuery({})).toBe("");
  });
});

describe("validateResumeFile", () => {
  it("accepts PDF and DOCX", () => {
    expect(validateResumeFile({ name: "cv.PDF", size: 100 })).toBeNull();
    expect(validateResumeFile({ name: "cv.docx", size: 100 })).toBeNull();
  });

  it("rejects other types, empty files and files over 5 MB", () => {
    expect(validateResumeFile({ name: "cv.exe", size: 100 })).toMatch(/PDF and DOCX/);
    expect(validateResumeFile({ name: "cv.pdf", size: 0 })).toMatch(/empty/);
    expect(validateResumeFile({ name: "cv.pdf", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });
});

describe("form schemas", () => {
  it("requires matching passwords", () => {
    const result = registerSchema.safeParse({
      fullName: "Asha Rao",
      email: "asha@example.com",
      password: "long-enough",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["confirmPassword"]);
  });

  it("requires at least one required skill on a job", () => {
    const result = jobSchema.safeParse({
      title: "Backend Developer",
      department: "",
      location: "",
      employment_type: "Full-time",
      experience_required: "2 years",
      description: "Build REST APIs for the platform team.",
      required_skills: [],
      preferred_skills: [],
      education_requirement: "",
      status: "Active",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/required skill/);
  });
});
