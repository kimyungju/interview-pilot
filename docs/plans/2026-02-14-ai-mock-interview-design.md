# AI Mock Interview Application — Design Document

**Date:** 2026-02-14
**Status:** Approved

## Overview

A web application where job seekers practice mock interviews powered by AI. Users input job details, receive AI-generated interview questions, answer them via speech, and get AI feedback with ratings.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + Shadcn UI + Lucide React icons
- **Auth:** Clerk
- **AI:** Google Gemini API (`@google/generative-ai`, `gemini-1.5-flash`)
- **Database:** Supabase PostgreSQL + Drizzle ORM
- **Media:** `react-webcam` + Web Speech API (SpeechRecognition & SpeechSynthesis)
- **Deployment:** Vercel
- **Architecture:** Next.js Server Actions (no separate API routes)

## Project Structure

```
app/
├── layout.tsx                          # ClerkProvider wrapper, global fonts
├── page.tsx                            # Landing page
├── dashboard/
│   ├── layout.tsx                      # Dashboard layout (nav, auth guard)
│   ├── page.tsx                        # List past interviews + "New" button
│   └── interview/
│       └── [interviewId]/
│           ├── page.tsx                # Interview info + "Start" button
│           ├── start/
│           │   └── page.tsx            # Live interview (webcam, mic, questions)
│           └── feedback/
│               └── page.tsx            # Results & feedback display
├── actions/
│   ├── interview.ts                    # createInterview, getInterview, getInterviewList
│   └── answer.ts                       # submitAnswer, getAnswers, generateFeedback
lib/
├── db.ts                               # Drizzle client + Supabase connection
├── schema.ts                           # Drizzle table definitions
├── gemini.ts                           # Gemini API client + prompt helpers
└── utils.ts                            # Shared utilities
```

## Database Schema

### MockInterview

| Column       | Type    | Notes                              |
|-------------|---------|-------------------------------------|
| id          | serial  | Primary key                         |
| mockId      | varchar | UUID, unique, used in URLs          |
| jobPosition | varchar | e.g. "Frontend Developer"           |
| jobDesc     | text    | Job description text                |
| jobExperience | varchar | e.g. "3 years"                    |
| jsonMockResp | text   | Gemini's JSON response (5 Q&A pairs)|
| createdBy   | varchar | User's email from Clerk             |
| createdAt   | varchar | UTC timestamp string                |

### UserAnswer

| Column      | Type    | Notes                               |
|------------|---------|--------------------------------------|
| id         | serial  | Primary key                          |
| mockIdRef  | varchar | References MockInterview.mockId      |
| question   | varchar | The interview question               |
| correctAns | text    | AI-generated ideal answer            |
| userAns    | text    | User's spoken answer (speech-to-text)|
| feedback   | text    | Gemini's feedback on the answer      |
| rating     | varchar | Gemini's rating (e.g. "3/5")        |
| userEmail  | varchar | User's email                         |
| createdAt  | varchar | UTC timestamp string                 |

## Core Workflows

### Flow 1: Interview Setup

1. User clicks "New Interview" on dashboard — Shadcn Dialog opens
2. User fills in: job position, job description, years of experience
3. On submit — Server Action calls Gemini with prompt: "Based on job position, description, and experience, give me 5 interview questions and answers in JSON format"
4. Clean response (strip markdown code fences) — parse JSON
5. Insert into MockInterview table with generated UUID
6. Redirect to `/dashboard/interview/{mockId}`

### Flow 2: Interview Execution

1. Interview start page shows job info + "Start" button
2. Navigate to `/dashboard/interview/{mockId}/start`
3. Fetch questions from DB, parse jsonMockResp
4. Display one question at a time (activeIndex state, 0-4)
5. Browser SpeechSynthesis reads the question aloud
6. Webcam preview shown via react-webcam (visual only, not recorded)
7. User clicks "Record" — SpeechRecognition captures speech to text
8. User clicks "Stop" — Server Action sends answer + question to Gemini for rating/feedback
9. Save to UserAnswer table
10. "Next" button increments activeIndex — repeat until all 5 done
11. After question 5 — redirect to feedback page

### Flow 3: Feedback

1. Fetch all UserAnswer rows for this mockId
2. Display overall rating summary at top
3. Each question in a Shadcn Collapsible: Question, Rating, Your Answer, Correct Answer, Feedback

## Authentication

- ClerkProvider wraps root layout.tsx
- Middleware protects `/dashboard/**` — unauthenticated users redirected to sign-in
- useUser() provides current user email for DB writes
- UserButton in dashboard nav for profile/sign-out
- Interview data scoped to logged-in user (queries filter by email)

## AI Integration

- Two Gemini prompts:
  1. **Question generation:** job position + description + experience → 5 Q&A pairs (JSON)
  2. **Answer feedback:** question + correct answer + user's answer → rating + feedback
- Response cleaning: strip markdown code fences before JSON.parse()
- API key in .env.local, accessed server-side only via Server Actions

## Speech & Media

- **SpeechSynthesis:** reads each question aloud when displayed
- **SpeechRecognition:** captures user's spoken answer during recording
  - Fallback to text input if browser doesn't support it
- **react-webcam:** live camera preview during interview (not saved)

## UI Pages

- **Landing page (/):** Hero section + CTA to sign in / dashboard
- **Dashboard (/dashboard):** Grid of past interview cards + "New Interview" button
- **Interview Dialog:** Shadcn Dialog with 3 form fields + loading spinner
- **Interview Start:** Job info summary + "Start Interview" button
- **Live Interview:** Left panel webcam, right panel question + controls (Record/Stop, Next/Previous)
- **Feedback:** Overall rating + 5 collapsible question/answer/feedback sections

## Coding Conventions

- Tailwind CSS responsive grid layouts
- Lucide React icons (Brain, Mic, Loader, WebcamIcon, ChevronDown, etc.)
- Loading states: animate-spin on buttons during AI calls, inputs disabled
- UTC timezone-aware timestamps for all DB records
