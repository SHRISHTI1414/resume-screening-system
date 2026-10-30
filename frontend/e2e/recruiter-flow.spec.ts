import { expect, test } from "@playwright/test";

// Registers a new account each run. Needs "Confirm email" turned off in Supabase Auth.
test("register, create a job, view it, log out and log back in", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "e2e-password-123";
  const title = `Backend Developer ${Date.now()}`;

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/register");
  await page.getByLabel("Full Name").fill("E2E Recruiter");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /E2E Recruiter/ })).toBeVisible();

  await page.goto("/jobs/new");
  await page.getByLabel("Job Title").fill(title);
  await page.getByLabel("Experience Required").fill("2 years");
  await page
    .getByLabel("Job Description")
    .fill("Build and maintain REST APIs with Python, FastAPI and PostgreSQL.");
  const skills = page.getByLabel("Required Skills");
  for (const skill of ["Python", "FastAPI", "PostgreSQL", "REST API", "Git"]) {
    await skills.fill(skill);
    await skills.press("Enter");
  }
  await page.getByRole("button", { name: "Create Job" }).click();

  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("FastAPI", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/jobs");
  await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
});
