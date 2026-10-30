# Project Report: AI-Based Resume Screening and Candidate Shortlisting System

## 1. Project Overview

A web application where a recruiter creates jobs, uploads resumes and receives a ranked, explainable
shortlist. Code calculates 95% of each score and AI contributes 5%, so results can be explained
component by component. A human makes every final decision.

## 2. Features Implemented

Authentication, job management, multi-file PDF/DOCX upload, text extraction, AI resume and job
analysis, hybrid scoring, ranking, matched and missing skills, AI summaries and recommendations,
candidate profiles, status tracking, search, filters, pagination, dashboard analytics, CSV export,
demo data, responsive layout, loading, empty and error states.

## 3. Technology Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Recharts
- **Backend:** Python, FastAPI, Pydantic, SQLAlchemy, Alembic
- **Data:** Supabase PostgreSQL, Auth and Storage
- **AI and matching:** Groq (`openai/gpt-oss-20b`), scikit-learn TF-IDF, PyMuPDF, python-docx

## 4. Architecture

Three parts: a Next.js frontend on Vercel, a FastAPI backend on Render, and hosted services
(Supabase and Groq). The browser talks to Supabase only for sign-in. All data access goes through
FastAPI, which verifies the token and limits each query to the signed-in recruiter.

## 5. Database Structure

Six tables: `profiles`, `jobs`, `candidates`, `resumes`, `applications` and `screening_results`. An
application links one candidate to one job and holds the recruiter's status. Each application has at
most one screening result. Foreign keys cascade, so deleting a job removes its data, and candidates
left with no applications are removed too.

## 6. Resume Processing Workflow

Upload, validate type, signature and size, store in a private bucket, extract and clean text,
extract structured data with Groq, validate with Pydantic, save the candidate, score, generate the
AI evaluation, save the result. Steps after upload run in the background while the page polls.

## 7. AI Workflow

Groq has three jobs: extract resume data, extract job requirements, and evaluate a candidate. All
calls go through `ai_service.py`, which retries rate limits and malformed replies with backoff.
Extraction results are saved and reused by file hash, so a resume is never sent twice.

## 8. Candidate Scoring Algorithm

Required Skills 35%, Experience 20%, Semantic Match 20%, Projects 10%, Education 5%, Certifications
5%, AI Evaluation 5%. The total maps to Excellent (90+), Strong (80+), Good (70+), Review (60+) or
Weak Match. Semantic similarity is scaled so that a cosine of 0.5 counts as a full match.

## 9. Explainability Features

Every candidate shows each component score with its weight, matched and missing skills, an AI
summary, strengths, weaknesses and a reasoned recommendation. Name, contact details and location are
withheld from the AI's evaluation, and a decision-support note appears next to recommendations.

## 10. Authentication

Supabase Auth with email and password. `proxy.ts` redirects signed-out visitors away from protected
pages. FastAPI independently validates each token and checks ownership, returning 404 for another
recruiter's records. Row Level Security blocks direct access through Supabase's public REST API.

## 11. Testing

- **Backend:** 78 Pytest tests covering matching, scoring, categories, text extraction, the AI
  service, API validation, ownership isolation and the full pipeline with hosted services faked.
- **Frontend:** 14 Vitest tests for utilities, validation and components.
- **End to end:** a Playwright test covering login, dashboard, job creation and job viewing.

The database migration and JSON filters were run against real PostgreSQL 16. The full flow was run
in a real browser against the production frontend build and the real backend, with local stand-ins
replacing Supabase Auth, Supabase Storage and Groq. Update this section after testing against the
live services.

## 12. CI/CD

GitHub Actions runs Ruff, Black, MyPy, Pytest, ESLint, TypeScript, Vitest and a production build on
each push and pull request. Vercel and Render deploy automatically from GitHub.

## 13. Deployment

Frontend on Vercel, backend on Render through `render.yaml`, database, auth and files on Supabase, AI
on Groq. No Docker is used. Step-by-step instructions are in the README.

## 14. Free-Tier Services Used

Vercel Hobby, Render Free, Supabase Free, Groq free API access, GitHub and GitHub Actions.

## 15. Local Setup Instructions

Copy both `.env.example` files and fill them in, run `alembic upgrade head` and
`python -m scripts.setup_storage`, start `uvicorn app.main:app --reload`, then run `npm install` and
`npm run dev` in `frontend`.

## 16. Production Setup

Create the Supabase project and use its Session pooler connection string. Deploy the Render
Blueprint, deploy `frontend` on Vercel, then point `FRONTEND_URL`, `NEXT_PUBLIC_API_URL` and the
Supabase Site URL at the deployed addresses.

## 17. Known Limitations

No OCR for scanned PDFs, TF-IDF matches words rather than meaning, skill matching relies on an alias
list, candidates are merged by email only, and free tiers bring cold starts, quotas and rate limits.
Editing a job applies to existing candidates only after Re-run Screening.

## 18. Future Improvements

Vector embeddings with pgvector, background workers with Redis/Celery, email notifications,
interview scheduling, advanced analytics, resume comparison, recruiter collaboration, multiple
organizations, role-based access control and ATS integrations.
