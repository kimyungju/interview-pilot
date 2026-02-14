# AI Mock Interview App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack AI mock interview app where users create interviews from job details, practice answering via speech, and receive AI-powered feedback.

**Architecture:** Next.js 16 App Router with Server Actions for all mutations/AI calls. Clerk for auth, Drizzle ORM over Supabase PostgreSQL for data, Google Gemini for AI, browser Speech APIs for voice I/O.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Shadcn UI, Clerk, Drizzle ORM, Supabase PostgreSQL, Google Gemini API, react-webcam, Web Speech API

**Design doc:** `docs/plans/2026-02-14-ai-mock-interview-design.md`

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`
- Create: `.env.local` (not committed)

**Step 1: Install production dependencies**

Run:
```bash
npm install drizzle-orm @google/generative-ai @clerk/nextjs react-webcam lucide-react uuid
```

**Step 2: Install dev dependencies**

Run:
```bash
npm install -D drizzle-kit @types/uuid postgres
```

**Step 3: Initialize Shadcn UI**

Run:
```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

**Step 4: Add required Shadcn components**

Run:
```bash
npx shadcn@latest add button dialog input textarea collapsible
```

**Step 5: Create `.env.local`**

Create `.env.local` at project root with placeholder values:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_XXXXX
CLERK_SECRET_KEY=sk_test_XXXXX

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

NEXT_PUBLIC_GEMINI_API_KEY=XXXXX

NEXT_PUBLIC_SUPABASE_URL=https://XXXXX.supabase.co
SUPABASE_DB_URL=postgresql://postgres:XXXXX@db.XXXXX.supabase.co:5432/postgres
```

**Step 6: Commit**

```bash
git add package.json package-lock.json components.json tailwind.config.ts lib/ components/
git commit -m "chore: install dependencies and initialize Shadcn UI"
```

---

### Task 2: Database Schema & Connection

**Files:**
- Create: `lib/schema.ts`
- Create: `lib/db.ts`
- Create: `drizzle.config.ts`

**Step 1: Create Drizzle schema**

Create `lib/schema.ts`:

```typescript
import { serial, text, varchar, pgTable } from "drizzle-orm/pg-core";

export const MockInterview = pgTable("mockInterview", {
  id: serial("id").primaryKey(),
  jsonMockResp: text("jsonMockResp").notNull(),
  jobPosition: varchar("jobPosition").notNull(),
  jobDesc: varchar("jobDesc").notNull(),
  jobExperience: varchar("jobExperience").notNull(),
  createdBy: varchar("createdBy").notNull(),
  createdAt: varchar("createdAt"),
  mockId: varchar("mockId").notNull(),
});

export const UserAnswer = pgTable("userAnswer", {
  id: serial("id").primaryKey(),
  mockIdRef: varchar("mockIdRef").notNull(),
  question: varchar("question").notNull(),
  correctAns: text("correctAns"),
  userAns: text("userAns"),
  feedback: text("feedback"),
  rating: varchar("rating"),
  userEmail: varchar("userEmail"),
  createdAt: varchar("createdAt"),
});
```

**Step 2: Create Drizzle database client**

Create `lib/db.ts`:

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.SUPABASE_DB_URL!);
export const db = drizzle(sql, { schema });
```

Note: Supabase Postgres works with Neon's serverless driver over HTTP, which is ideal for Vercel serverless functions.

**Step 3: Install neon serverless driver**

Run:
```bash
npm install @neondatabase/serverless
```

**Step 4: Create Drizzle config**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL!,
  },
});
```

**Step 5: Push schema to database**

Run:
```bash
npx drizzle-kit push
```

Expected: Tables `mockInterview` and `userAnswer` created in Supabase.

**Step 6: Commit**

```bash
git add lib/schema.ts lib/db.ts drizzle.config.ts package.json package-lock.json
git commit -m "feat: add Drizzle ORM schema and Supabase connection"
```

---

### Task 3: Gemini API Client

**Files:**
- Create: `lib/gemini.ts`

**Step 1: Create Gemini client**

Create `lib/gemini.ts`:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

export const chatSession = genAI
  .getGenerativeModel({ model: "gemini-1.5-flash" })
  .startChat({
    generationConfig: {
      maxOutputTokens: 8192,
    },
  });

export function cleanJsonResponse(text: string): string {
  return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}
```

**Step 2: Commit**

```bash
git add lib/gemini.ts
git commit -m "feat: add Gemini API client and response helper"
```

---

### Task 4: Clerk Authentication Setup

**Files:**
- Modify: `app/layout.tsx`
- Create: `middleware.ts` (project root)

**Step 1: Wrap root layout with ClerkProvider**

Modify `app/layout.tsx`:

```tsx
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Mock Interview",
  description: "Practice interviews with AI-generated questions and feedback",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

**Step 2: Create Clerk middleware**

Create `middleware.ts` at project root:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

**Step 3: Verify dev server starts**

Run:
```bash
npm run dev
```

Expected: App starts without errors. Visiting `/dashboard` redirects to Clerk sign-in.

**Step 4: Commit**

```bash
git add app/layout.tsx middleware.ts
git commit -m "feat: add Clerk auth with route protection middleware"
```

---

### Task 5: Dashboard Layout & Page

**Files:**
- Create: `app/dashboard/layout.tsx`
- Create: `app/dashboard/page.tsx`
- Create: `app/dashboard/_components/Header.tsx`
- Create: `app/dashboard/_components/InterviewCard.tsx`
- Create: `app/dashboard/_components/AddNewInterview.tsx`
- Create: `app/actions/interview.ts`

**Step 1: Create interview server actions**

Create `app/actions/interview.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { MockInterview } from "@/lib/schema";
import { chatSession, cleanJsonResponse } from "@/lib/gemini";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";

export async function createInterview(
  jobPosition: string,
  jobDesc: string,
  jobExperience: string,
  userEmail: string
) {
  const inputPrompt = `Job position: ${jobPosition}, Job Description: ${jobDesc}, Years of Experience: ${jobExperience}. Based on this information, give me 5 interview questions with answers in JSON format. Each object should have "question" and "answer" fields.`;

  const result = await chatSession.sendMessage(inputPrompt);
  const responseText = result.response.text();
  const jsonMockResp = cleanJsonResponse(responseText);

  // Validate it's parseable JSON
  JSON.parse(jsonMockResp);

  const mockId = uuidv4();

  await db.insert(MockInterview).values({
    mockId,
    jsonMockResp,
    jobPosition,
    jobDesc,
    jobExperience,
    createdBy: userEmail,
    createdAt: new Date().toISOString(),
  });

  return { mockId };
}

export async function getInterviewList(userEmail: string) {
  return db
    .select()
    .from(MockInterview)
    .where(eq(MockInterview.createdBy, userEmail))
    .orderBy(desc(MockInterview.id));
}

export async function getInterview(mockId: string) {
  const result = await db
    .select()
    .from(MockInterview)
    .where(eq(MockInterview.mockId, mockId));
  return result[0] || null;
}
```

**Step 2: Create dashboard header**

Create `app/dashboard/_components/Header.tsx`:

```tsx
"use client";

import { UserButton } from "@clerk/nextjs";
import { Brain } from "lucide-react";
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4 bg-secondary shadow-sm">
      <Link href="/dashboard" className="flex items-center gap-2">
        <Brain className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">AI Mock Interview</span>
      </Link>
      <UserButton />
    </header>
  );
}
```

**Step 3: Create dashboard layout**

Create `app/dashboard/layout.tsx`:

```tsx
import Header from "./_components/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header />
      <div className="mx-5 md:mx-20 lg:mx-36">{children}</div>
    </div>
  );
}
```

**Step 4: Create interview card component**

Create `app/dashboard/_components/InterviewCard.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface InterviewCardProps {
  mockId: string;
  jobPosition: string;
  jobExperience: string;
  createdAt: string | null;
}

export default function InterviewCard({
  mockId,
  jobPosition,
  jobExperience,
  createdAt,
}: InterviewCardProps) {
  return (
    <div className="border rounded-lg shadow-sm p-4">
      <h2 className="font-bold text-primary text-lg">{jobPosition}</h2>
      <p className="text-sm text-gray-600">{jobExperience} Years of Experience</p>
      <p className="text-xs text-gray-400 mt-1">
        Created: {createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"}
      </p>
      <div className="flex gap-3 mt-4">
        <Link href={`/dashboard/interview/${mockId}/feedback`}>
          <Button size="sm" variant="outline">Feedback</Button>
        </Link>
        <Link href={`/dashboard/interview/${mockId}`}>
          <Button size="sm">Start</Button>
        </Link>
      </div>
    </div>
  );
}
```

**Step 5: Create AddNewInterview component**

Create `app/dashboard/_components/AddNewInterview.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader, Plus } from "lucide-react";
import { createInterview } from "@/app/actions/interview";

export default function AddNewInterview() {
  const [open, setOpen] = useState(false);
  const [jobPosition, setJobPosition] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobExperience, setJobExperience] = useState("");
  const [loading, setLoading] = useState(false);

  const { user } = useUser();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.primaryEmailAddress?.emailAddress) return;

    setLoading(true);
    try {
      const { mockId } = await createInterview(
        jobPosition,
        jobDesc,
        jobExperience,
        user.primaryEmailAddress.emailAddress
      );
      setOpen(false);
      router.push(`/dashboard/interview/${mockId}`);
    } catch (error) {
      console.error("Failed to create interview:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="p-10 border rounded-lg bg-secondary hover:scale-105 hover:shadow-md cursor-pointer transition-all">
          <h2 className="text-lg text-center">
            <Plus className="inline mr-1" /> Add New
          </h2>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Tell us more about your interview</DialogTitle>
          <DialogDescription>
            Add details about the job position, description, and experience.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Job Position</label>
            <Input
              placeholder="e.g. Full Stack Developer"
              required
              value={jobPosition}
              onChange={(e) => setJobPosition(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Job Description / Tech Stack</label>
            <Textarea
              placeholder="e.g. React, Node.js, PostgreSQL..."
              required
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Years of Experience</label>
            <Input
              type="number"
              placeholder="e.g. 3"
              required
              max={50}
              value={jobExperience}
              onChange={(e) => setJobExperience(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader className="animate-spin mr-2" /> Generating...
                </>
              ) : (
                "Start Interview"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 6: Create dashboard page**

Create `app/dashboard/page.tsx`:

```tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import AddNewInterview from "./_components/AddNewInterview";
import InterviewCard from "./_components/InterviewCard";
import { getInterviewList } from "@/app/actions/interview";

interface Interview {
  id: number;
  mockId: string;
  jobPosition: string;
  jobExperience: string;
  createdAt: string | null;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [interviews, setInterviews] = useState<Interview[]>([]);

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      getInterviewList(user.primaryEmailAddress.emailAddress).then(setInterviews);
    }
  }, [user]);

  return (
    <div className="py-10">
      <h2 className="font-bold text-2xl">Dashboard</h2>
      <p className="text-gray-500">Create and start your AI Mock Interview</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-5">
        <AddNewInterview />
        {interviews.map((interview) => (
          <InterviewCard
            key={interview.id}
            mockId={interview.mockId}
            jobPosition={interview.jobPosition}
            jobExperience={interview.jobExperience}
            createdAt={interview.createdAt}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 7: Verify dashboard renders**

Run:
```bash
npm run dev
```

Expected: Dashboard renders with header, "Add New" card, and empty interview list. Clicking "Add New" opens the dialog.

**Step 8: Commit**

```bash
git add app/dashboard/ app/actions/interview.ts
git commit -m "feat: add dashboard with interview list and create dialog"
```

---

### Task 6: Interview Start Page

**Files:**
- Create: `app/dashboard/interview/[interviewId]/page.tsx`

**Step 1: Create interview start page**

Create `app/dashboard/interview/[interviewId]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInterview } from "@/app/actions/interview";
import { Button } from "@/components/ui/button";
import { Lightbulb, WebcamIcon } from "lucide-react";
import Webcam from "react-webcam";

interface InterviewData {
  jobPosition: string;
  jobDesc: string;
  jobExperience: string;
}

export default function InterviewPage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);

  useEffect(() => {
    if (params.interviewId) {
      getInterview(params.interviewId).then(setInterview);
    }
  }, [params.interviewId]);

  if (!interview) return <p className="p-10">Loading...</p>;

  return (
    <div className="py-10">
      <h2 className="font-bold text-2xl">Let's Get Started</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-7">
        <div className="flex flex-col gap-5">
          <div className="p-5 rounded-lg border">
            <h3 className="text-lg">
              <strong>Job Position: </strong>{interview.jobPosition}
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Description: </strong>{interview.jobDesc}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Experience: </strong>{interview.jobExperience} years
            </p>
          </div>

          <div className="p-5 rounded-lg border border-yellow-300 bg-yellow-50">
            <h3 className="flex items-center gap-2 text-yellow-600">
              <Lightbulb /> <strong>Information</strong>
            </h3>
            <p className="text-sm text-yellow-600 mt-2">
              Enable your webcam and microphone to start the AI-generated mock interview.
              You'll be asked 5 questions and receive feedback on each answer.
              Note: We never record your video. You can disable the webcam at any time.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          {webcamEnabled ? (
            <Webcam
              onUserMediaError={() => setWebcamEnabled(false)}
              mirrored
              className="rounded-lg w-full h-72 object-cover"
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center w-full h-72 rounded-lg border bg-secondary cursor-pointer"
              onClick={() => setWebcamEnabled(true)}
            >
              <WebcamIcon className="h-16 w-16 text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Click to enable webcam</p>
            </div>
          )}

          <Button
            className="w-full mt-5"
            onClick={() => router.push(`/dashboard/interview/${params.interviewId}/start`)}
          >
            Start Interview
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify page renders**

Run dev server and navigate to `/dashboard/interview/{mockId}`.
Expected: Shows job details, webcam toggle, and "Start Interview" button.

**Step 3: Commit**

```bash
git add app/dashboard/interview/
git commit -m "feat: add interview start page with webcam preview"
```

---

### Task 7: Answer Server Actions

**Files:**
- Create: `app/actions/answer.ts`

**Step 1: Create answer server actions**

Create `app/actions/answer.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { UserAnswer } from "@/lib/schema";
import { chatSession, cleanJsonResponse } from "@/lib/gemini";
import { eq } from "drizzle-orm";

export async function submitAnswer(
  mockIdRef: string,
  question: string,
  correctAns: string,
  userAns: string,
  userEmail: string
) {
  const feedbackPrompt = `Question: "${question}". User Answer: "${userAns}". Based on the question and user answer, please give a rating out of 5 and feedback in 3-5 lines in JSON format with "rating" and "feedback" fields.`;

  const result = await chatSession.sendMessage(feedbackPrompt);
  const responseText = result.response.text();
  const parsed = JSON.parse(cleanJsonResponse(responseText));

  await db.insert(UserAnswer).values({
    mockIdRef,
    question,
    correctAns,
    userAns,
    feedback: parsed.feedback,
    rating: String(parsed.rating),
    userEmail,
    createdAt: new Date().toISOString(),
  });

  return { rating: parsed.rating, feedback: parsed.feedback };
}

export async function getAnswers(mockIdRef: string) {
  return db
    .select()
    .from(UserAnswer)
    .where(eq(UserAnswer.mockIdRef, mockIdRef));
}
```

**Step 2: Commit**

```bash
git add app/actions/answer.ts
git commit -m "feat: add answer submission and feedback server actions"
```

---

### Task 8: Live Interview Page

**Files:**
- Create: `app/dashboard/interview/[interviewId]/start/page.tsx`

**Step 1: Create live interview page**

Create `app/dashboard/interview/[interviewId]/start/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { getInterview } from "@/app/actions/interview";
import { submitAnswer } from "@/app/actions/answer";
import { Button } from "@/components/ui/button";
import { Loader, Mic, MicOff, Volume2 } from "lucide-react";
import Webcam from "react-webcam";

interface QuestionAnswer {
  question: string;
  answer: string;
}

export default function StartInterviewPage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();
  const { user } = useUser();

  const [questions, setQuestions] = useState<QuestionAnswer[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if (params.interviewId) {
      getInterview(params.interviewId).then((data) => {
        if (data?.jsonMockResp) {
          const parsed = JSON.parse(data.jsonMockResp);
          setQuestions(parsed);
        }
      });
    }
  }, [params.interviewId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = "en-US";
        rec.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((r) => r[0].transcript)
            .join(" ");
          setUserAnswer(transcript);
        };
        setRecognition(rec);
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) return;
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setUserAnswer("");
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleTextToSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!user?.primaryEmailAddress?.emailAddress || !questions[activeIndex]) return;
    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
    }

    setLoading(true);
    try {
      await submitAnswer(
        params.interviewId,
        questions[activeIndex].question,
        questions[activeIndex].answer,
        userAnswer,
        user.primaryEmailAddress.emailAddress
      );

      if (activeIndex < questions.length - 1) {
        setActiveIndex((prev) => prev + 1);
        setUserAnswer("");
      } else {
        router.push(`/dashboard/interview/${params.interviewId}/feedback`);
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
    } finally {
      setLoading(false);
    }
  };

  if (questions.length === 0) return <p className="p-10">Loading questions...</p>;

  return (
    <div className="py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Questions Panel */}
        <div className="flex flex-col gap-5">
          {/* Question Tabs */}
          <div className="flex flex-wrap gap-2">
            {questions.map((_, index) => (
              <Button
                key={index}
                size="sm"
                variant={activeIndex === index ? "default" : "outline"}
                onClick={() => setActiveIndex(index)}
              >
                Question #{index + 1}
              </Button>
            ))}
          </div>

          {/* Current Question */}
          <div className="p-5 rounded-lg border">
            <h3 className="text-lg font-medium">
              {questions[activeIndex].question}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => handleTextToSpeech(questions[activeIndex].question)}
            >
              <Volume2 className="mr-1 h-4 w-4" /> Read Aloud
            </Button>
          </div>

          {/* User Answer Display */}
          <div className="p-5 rounded-lg border min-h-[100px]">
            <p className="text-sm text-gray-500 mb-2">Your Answer:</p>
            <p>{userAnswer || "Start recording to see your answer here..."}</p>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              variant={isRecording ? "destructive" : "default"}
              onClick={toggleRecording}
            >
              {isRecording ? (
                <><MicOff className="mr-2 h-4 w-4" /> Stop Recording</>
              ) : (
                <><Mic className="mr-2 h-4 w-4" /> Record Answer</>
              )}
            </Button>

            <Button onClick={handleSubmitAnswer} disabled={loading || !userAnswer}>
              {loading ? (
                <><Loader className="animate-spin mr-2 h-4 w-4" /> Submitting...</>
              ) : activeIndex === questions.length - 1 ? (
                "Submit & Finish"
              ) : (
                "Submit & Next"
              )}
            </Button>
          </div>
        </div>

        {/* Webcam Panel */}
        <div className="flex justify-center">
          <Webcam
            mirrored
            className="rounded-lg w-full h-72 object-cover"
          />
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Add Web Speech API type declarations**

If TypeScript complains about `webkitSpeechRecognition`, create or update `next-env.d.ts` or add a `types/speech.d.ts`:

Create `types/speech.d.ts`:

```typescript
interface Window {
  webkitSpeechRecognition: typeof SpeechRecognition;
}
```

**Step 3: Verify live interview works**

Run dev server, create an interview, navigate to start page.
Expected: Questions displayed, webcam visible, recording works, answers submit.

**Step 4: Commit**

```bash
git add app/dashboard/interview/[interviewId]/start/ types/
git commit -m "feat: add live interview page with speech recording"
```

---

### Task 9: Feedback Page

**Files:**
- Create: `app/dashboard/interview/[interviewId]/feedback/page.tsx`

**Step 1: Create feedback page**

Create `app/dashboard/interview/[interviewId]/feedback/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAnswers } from "@/app/actions/answer";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Star } from "lucide-react";

interface AnswerData {
  id: number;
  question: string;
  correctAns: string | null;
  userAns: string | null;
  feedback: string | null;
  rating: string | null;
}

export default function FeedbackPage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();
  const [answers, setAnswers] = useState<AnswerData[]>([]);

  useEffect(() => {
    if (params.interviewId) {
      getAnswers(params.interviewId).then(setAnswers);
    }
  }, [params.interviewId]);

  const overallRating = answers.length
    ? (
        answers.reduce((sum, a) => sum + (parseFloat(a.rating || "0") || 0), 0) /
        answers.length
      ).toFixed(1)
    : "0";

  if (answers.length === 0) return <p className="p-10">Loading feedback...</p>;

  return (
    <div className="py-10">
      <h2 className="text-3xl font-bold text-green-600">Congratulations!</h2>
      <p className="text-lg text-gray-600 mt-2">Here is your interview feedback</p>

      <div className="my-5 p-5 rounded-lg border bg-secondary">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Star className="text-yellow-500" />
          Overall Rating: <span className="text-primary">{overallRating}/5</span>
        </h3>
      </div>

      <div className="space-y-4">
        {answers.map((answer, index) => (
          <Collapsible key={answer.id}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg bg-secondary hover:bg-secondary/80 text-left">
              <span className="font-medium">
                Question #{index + 1}: {answer.question}
              </span>
              <ChevronDown className="h-5 w-5" />
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border rounded-b-lg space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-500">Rating</p>
                <p className="text-primary font-bold">{answer.rating}/5</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-500">Your Answer</p>
                <p className="text-sm bg-red-50 p-3 rounded">{answer.userAns || "No answer recorded"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-500">Correct Answer</p>
                <p className="text-sm bg-green-50 p-3 rounded">{answer.correctAns || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-500">Feedback</p>
                <p className="text-sm bg-blue-50 p-3 rounded">{answer.feedback || "No feedback"}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <Button className="mt-8" onClick={() => router.push("/dashboard")}>
        Go to Dashboard
      </Button>
    </div>
  );
}
```

**Step 2: Verify feedback page**

Run dev server, complete a full interview flow, verify feedback page shows all answers with ratings.

**Step 3: Commit**

```bash
git add app/dashboard/interview/[interviewId]/feedback/
git commit -m "feat: add interview feedback page with collapsible results"
```

---

### Task 10: Landing Page

**Files:**
- Modify: `app/page.tsx`

**Step 1: Replace default landing page**

Replace `app/page.tsx` with:

```tsx
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-secondary">
      <div className="text-center max-w-2xl px-4">
        <div className="flex justify-center mb-6">
          <Brain className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          AI Mock Interview
        </h1>
        <p className="text-xl text-muted-foreground mt-4">
          Practice job interviews with AI-generated questions tailored to your
          role. Get real-time feedback and improve your answers.
        </p>
        <div className="mt-8">
          <Link href="/dashboard">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify landing page**

Run dev server, visit `/`. Expected: Hero with app name, description, and CTA button.

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add landing page with hero section"
```

---

### Task 11: Clean Up & Final Verification

**Files:**
- Modify: `app/globals.css` (if needed for Shadcn)
- Remove: unused default SVG files from `public/`

**Step 1: Remove unused public assets**

```bash
rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

**Step 2: Run full build check**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 3: Run linter**

```bash
npm run lint
```

Expected: No errors (warnings are acceptable).

**Step 4: Manual smoke test**

Test the full flow:
1. Visit `/` → see landing page
2. Click "Get Started" → sign in via Clerk
3. Dashboard loads → click "Add New"
4. Fill in job details → submit → redirected to interview start
5. Enable webcam → click "Start Interview"
6. Answer all 5 questions via speech → get feedback
7. View feedback page → return to dashboard → see interview in list

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove unused assets and finalize project"
```
