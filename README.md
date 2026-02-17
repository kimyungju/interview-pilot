# AI Mock Interview Generator

AI-powered mock interview platform with speech recognition, PDF resume upload, and personalized feedback.

## Features

- **AI-generated interview questions** — configurable type (general, behavioral, technical, system-design), difficulty (junior, mid, senior), and count (3, 5, or 10) via OpenAI
- **Two creation modes** — Auto Generate from job details, or From Your Content with a question bank and random/in-order selection
- **Follow-up questions** — AI generates contextual follow-up questions based on your answers
- **PDF resume upload** — server-side text extraction feeds context to AI question generation
- **Live speech recognition** — answer questions naturally using the Web Speech API
- **Text-to-speech** — questions read aloud with a countdown timer before recording; choose male or female interviewer voice (browser-native for English, OpenAI cloud TTS for Korean)
- **Webcam integration** — optional camera feed during interviews
- **AI-powered feedback** — difficulty-aware scoring with competency scores (Technical Knowledge, Communication Clarity, Problem Solving, Relevance) and sandwich feedback method
- **Per-question video recording** — records webcam + audio for each answer, uploads to Supabase Storage, and plays back on the feedback page
- **PDF feedback reports** — download a detailed breakdown of your performance with QR codes linking to recorded video answers
- **Dashboard filters** — search, filter by interview type and difficulty, and sort interviews
- **Internationalization** — English and Korean language support
- **Dark mode** — theme toggle via `next-themes`
- **Authentication** — Clerk-based sign-in/sign-up with protected dashboard routes

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Server Actions) |
| Language | TypeScript, React 19 |
| Auth | Clerk |
| Database | Supabase PostgreSQL via Drizzle ORM + Neon serverless driver |
| AI | OpenAI API (gpt-4o-mini) |
| Styling | Tailwind CSS v4, Shadcn UI (New York style) |
| Speech | Web Speech API (recognition), Web Speech API + OpenAI TTS (synthesis) |
| Video | MediaRecorder API + Supabase Storage |
| i18n | Custom context-based solution (English, Korean) |
| PDF | pdf-parse (extraction), jsPDF + qrcode (report generation) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Clerk](https://clerk.com) account
- An [OpenAI](https://platform.openai.com) API key
- A [Supabase](https://supabase.com) project (PostgreSQL)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/ai-resume-interview-generator.git
cd ai-resume-interview-generator

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in the values (see Environment Variables below)

# 4. Push database schema
npx drizzle-kit push

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Environment Variables

Create a `.env.local` file from `.env.example` and fill in the following:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (client-side) |
| `CLERK_SECRET_KEY` | Clerk secret key (server-side) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route (default: `/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route (default: `/sign-up`) |
| `OPENAI_API_KEY` | OpenAI API key (server-side only) |
| `SUPABASE_DB_URL` | PostgreSQL connection string from Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (for Storage video uploads) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (for Storage video uploads) |

## Project Structure

```
app/
├── actions/          # Server actions (interview, answer, pdf, speech)
├── dashboard/        # Protected routes
│   ├── _components/  # Dashboard-scoped components (AddNewInterview, InterviewCard, InterviewFilters, Header)
│   └── interview/    # Interview setup, live session, feedback
├── sign-in/          # Clerk sign-in page
└── sign-up/          # Clerk sign-up page
lib/
├── db.ts             # Drizzle ORM + Neon serverless connection
├── schema.ts         # MockInterview & UserAnswer tables
├── gemini.ts         # OpenAI client + JSON response cleaner
├── generatePdf.ts    # PDF feedback report generation (with QR codes)
├── mediaRecorder.ts  # Per-question video recording via MediaRecorder API
├── videoUpload.ts    # Upload recorded videos to Supabase Storage
├── supabaseClient.ts # Supabase client (lazy-init for Storage access)
├── voiceUtils.ts     # TTS voice selection and gender classification
├── cloudTts.ts       # OpenAI cloud TTS client for Korean speech synthesis
├── fontLoader.ts     # Korean font loader for PDF generation
├── i18n/             # Internationalization (en.json, ko.json, LanguageContext)
└── utils.ts          # Shadcn cn() helper
components/ui/        # Shadcn UI components
types/                # TypeScript declarations (Web Speech API)
```

## How It Works

1. **Create** — Enter job title, description, experience level, and optionally upload a resume. Configure interview type, difficulty, and question count. Choose to auto-generate questions or provide your own question bank. OpenAI generates tailored interview questions.
2. **Practice** — Answer each question via speech recognition or text input. Questions are read aloud (with selectable voice gender) followed by a countdown before recording begins. AI generates follow-up questions based on your answers. A webcam feed is available for simulating real interview conditions, and each answer is video-recorded and uploaded for later review.
3. **Review** — AI evaluates each answer with difficulty-aware scoring, detailed feedback, and competency scores across four dimensions. Follow-up Q&A is shown alongside main questions. Play back your recorded video for each answer. Export the full report as a PDF with QR codes linking to your video recordings.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npx drizzle-kit push` | Push schema changes to database |
