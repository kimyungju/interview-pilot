# AI Mock Interview Generator

## 1. Overview & Motivation

Preparing for technical interviews is a feedback-starved process. Candidates rehearse answers in their heads, record themselves on their phones, or pay for one-off coaching sessions — none of which provide structured, repeatable, diagnostic feedback. The gap is not access to questions; it is access to a realistic interview loop that evaluates *what you said* against *what you should have said*, broken down by competency.

This project is a full-stack AI mock interview platform that closes that gap. Users describe a target role — job title, description, experience level — and the system generates a tailored set of interview questions with model answers via OpenAI. The interview itself runs in the browser: the platform reads each question aloud using text-to-speech, records the candidate's spoken response via the Web Speech API, captures webcam video per question, and submits each answer for AI-powered multi-dimensional feedback. After each answer, the AI generates a contextual follow-up question — probing vague claims, requesting examples, or exploring trade-offs — simulating the back-and-forth of a real interview. Results are stored per-session, displayed in a collapsible review interface with video playback, and exportable as a formatted PDF report with embedded QR codes linking to each recording.

Key capabilities:

- **Three creation modes** — standard form, reference-material-based (paste or upload a PDF), and resume-personalized interviews that probe specific claims from the candidate's background
- **Configurable interviews** — type (behavioral, technical, system design), difficulty (junior/mid/senior), question count, and a question bank with random or sequential selection
- **Live speech interface** — TTS reads the question (browser-native for English, OpenAI cloud TTS for Korean), a visual countdown starts, speech recognition captures the answer, and webcam video records the candidate's delivery
- **Follow-up questions** — after each answer, the AI generates a contextual follow-up, creating a multi-turn conversational flow with parent-child answer linking
- **Difficulty-aware feedback** — AI scores across four competency dimensions using sandwich-method feedback, with leniency calibrated to the interview's difficulty level
- **Bilingual support** — full English and Korean localization including AI prompts, dual TTS pipeline (browser-native for English, OpenAI cloud TTS for Korean with gendered voice selection), and PDF rendering with CJK font injection
- **PDF export with video QR codes** — client-side report generation with per-question breakdowns, competency bar charts, and scannable QR codes linking to recorded videos
- **Dashboard filters** — search, type/difficulty filtering, and sort controls for managing interview history

The platform targets job seekers, CS students, and career changers who want structured practice without scheduling a human coach. It exists at the intersection of a real product and an engineering demonstration — every architectural decision serves both goals simultaneously.

---

## 2. Technical Architecture & Workflow

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                           │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │  react-webcam │  │ Web Speech   │  │  jsPDF + QRCode            │ │
│  │  (video feed) │  │ API (STT)    │  │  (PDF export + QR links)   │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────────────┘ │
│         │  MediaRecorder  │                                         │
│         │  (per-question  │  spoken answer    TTS playback          │
│         │   video)        │                   ▲                     │
│         │                 │    ┌──────────────┴──────────────┐      │
│         │                 │    │ English: Web Speech API     │      │
│         │                 │    │ Korean:  OpenAI TTS (server)│      │
│         │                 │    └─────────────────────────────┘      │
│         ▼                                        ▼                  │
│  ┌──────────────────────────────────────────────┐                   │
│  │  Next.js 16 App Router (React 19)            │                   │
│  │  Client pages: dashboard, interview, feedback │                   │
│  └───────────┬──────────────────┬───────────────┘                   │
└──────────────┼──────────────────┼───────────────────────────────────┘
               │ Server Actions   │ Video Upload (fire-and-forget)
               ▼                  ▼
┌──────────────────────────┐  ┌──────────────────────┐
│    Server (Node.js)      │  │  Supabase Storage    │
│                          │  │  (video blobs)       │
│  ┌──────────────┐        │  └──────────────────────┘
│  │ Clerk Auth   │        │
│  │ (middleware + │        │
│  │  currentUser) │        │
│  └──────────────┘        │
│  ┌──────────────┐        │
│  │ OpenAI API   │        │
│  │ (gpt-4o-mini │        │
│  │  json_object) │        │
│  └──────────────┘        │
│  ┌──────────────┐        │
│  │ Drizzle ORM  │        │
│  │ + PostgreSQL │        │
│  │  (Supabase)  │        │
│  └──────────────┘        │
└──────────────────────────┘
```

### Auth & Data Isolation

Clerk middleware guards all `/dashboard/**` routes at the edge. Every server action independently calls `currentUser()` as a second authentication check before touching the database — defense in depth that prevents data access even if middleware is bypassed:

```typescript
// app/actions/interview.ts — dual-layer auth guard
async function getAuthEmail(): Promise<string> {
  const user = await currentUser();
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    throw new Error("Unauthorized");
  }
  return user.emailAddresses[0].emailAddress;
}
```

Every query filters on the authenticated user's email. Delete operations enforce ownership with a compound `WHERE` clause (`mockId = ? AND createdBy = ?`), preventing IDOR vulnerabilities even if an attacker guesses a valid UUID.

### Data Model

Two tables in Drizzle ORM handle the full lifecycle:

- **MockInterview** — stores job metadata, interview configuration (type, difficulty, language), and AI-generated Q&A pairs as a JSON string (`jsonMockResp`). The `mockId` (UUID) serves as the application-level join key, decoupling the external identifier from the auto-increment primary key.
- **UserAnswer** — stores per-question user responses, structured AI feedback as JSON, a denormalized `rating` field for quick aggregation, a `parentAnswerId` for follow-up question chaining (self-referential FK), and a `videoUrl` for the recorded webcam clip.

### Interview Lifecycle

```
Create    →  OpenAI generates Q&A pairs  →  Drizzle INSERT (MockInterview)
Execute   →  TTS reads question → countdown → Speech Recognition + Video Recording
Submit    →  OpenAI scores answer (4 competencies, sandwich feedback)
                → Drizzle INSERT (UserAnswer)
                → fire-and-forget video upload → late URL patch
Follow-up →  OpenAI generates contextual follow-up → record + submit → link to parent
Review    →  Collapsible feedback + video playback → PDF with QR codes
```

---

## 3. Tech Stack Deep Dive

| Technology | Role | Why Over Alternatives | Tradeoff |
|---|---|---|---|
| **Next.js 16 + React 19** | Framework | App Router enables server actions — no API routes needed. All AI calls and DB mutations are colocated `"use server"` functions with type-safe client invocation | Newer ecosystem; middleware file naming conventions still shifting |
| **OpenAI (gpt-4o-mini)** | Question generation + answer evaluation + follow-up generation | `json_object` response format reduces parsing failures. Cost-efficient for structured output tasks (~10x cheaper than GPT-4o with sufficient quality for rubric scoring) | Per-call latency adds 2-4s to each answer submission; no streaming for structured JSON mode |
| **Drizzle ORM + Supabase PostgreSQL** | Relational database | Type-safe schema with zero codegen. Push-based migrations via `drizzle-kit push` — no migration files to manage during rapid iteration | No automatic rollback; push-based workflow requires manual recovery if a schema change fails |
| **Supabase Storage** | Video blob hosting | Integrated with the existing Supabase project. Public URL generation via `getPublicUrl()` — no signed-URL expiration management | Separate client from the Drizzle database connection; requires lazy-init singleton to avoid build-time crashes when credentials are absent |
| **Clerk** | Authentication | Drop-in auth with webhook sync, social login, and per-request JWT validation. Avoids building session management and OAuth flows from scratch | External dependency on a critical path; webhook ordering requires defensive coding |
| **Web Speech API + OpenAI TTS + MediaRecorder** | Speech I/O + video capture | Dual TTS strategy: browser-native synthesis for English (zero cost, low latency), OpenAI cloud TTS for Korean (reliable gendered voices via `nova`/`onyx` where browser voices are unreliable). Speech recognition and video recording through native browser APIs | English TTS quality varies by OS; Korean TTS adds ~$0.008/interview API cost; no Safari STT |
| **Tailwind CSS v4 + shadcn/ui** | Styling | CSS variable-based theming enables dark mode with a single provider. Radix primitives handle accessibility (focus traps, ARIA) without custom implementation | Design token migration from v3 to v4 required reworking the globals.css structure |

---

## 4. Technical Challenges & Solutions

### Challenge 1: Multi-Turn Interview Flow with Fire-and-Forget Video Upload

**Constraint:** After each answer, the system must submit the response for AI feedback, upload the recorded video to Supabase Storage, generate a contextual follow-up question, and transition the UI to follow-up mode — all without blocking the user. The video upload alone takes 1-5 seconds depending on recording length. The follow-up question must reference the original answer, and the follow-up's own answer must link back to the parent via `parentAnswerId`.

**Why the naive approach fails:** Sequentially awaiting video upload before generating the follow-up adds perceptible lag. Blocking on upload also means a network failure would prevent the interview from continuing — a non-critical feature breaking a critical path.

**Solution:** A three-phase pipeline: (1) submit the answer synchronously to get immediate AI feedback and an `answerId`, (2) fire-and-forget the video upload as an unlinked Promise chain that patches the `videoUrl` column when it resolves, (3) generate the follow-up question in parallel with the upload:

```typescript
// app/dashboard/interview/[interviewId]/start/page.tsx — lines 297-345
const result = await submitAnswer(
  params.interviewId,
  questions[activeIndex].question,
  questions[activeIndex].answer,
  userAnswer, language, null, difficulty
);

// Fire-and-forget video upload — non-blocking
if (currentVideoBlob) {
  uploadVideoBlob(currentVideoBlob, params.interviewId, result.answerId)
    .then((url) => {
      if (url) updateVideoUrl(result.answerId, url).catch(console.error);
    })
    .catch(console.error);
}

// Generate follow-up question (does not wait for upload)
const followUp = await generateFollowUpQuestion(
  questions[activeIndex].question,
  questions[activeIndex].answer,
  userAnswer, language
);
setParentAnswerId(result.answerId);
setFollowUpQuestion(followUp.followUpQuestion);
setIsFollowUpMode(true);
```

The `uploadVideoBlob` wrapper returns `null` on failure rather than throwing, ensuring upload errors are non-fatal. The `updateVideoUrl` server action patches a single column on the already-inserted `UserAnswer` row. On the feedback page, video playback renders conditionally — a question without a `videoUrl` simply omits the player.

**Tradeoff:** The feedback page and PDF may briefly show questions without video if the user navigates there before uploads complete. The PDF generator handles this gracefully — QR codes are only rendered for answers where `videoUrl` is non-null. Accepting eventual consistency here saves 1-5 seconds of perceived latency per question.

### Challenge 2: Difficulty-Calibrated AI Feedback with Speech Noise Isolation

**Constraint:** AI feedback must be calibrated to the interview's difficulty level — a junior candidate using the right keywords should score at least 3/5, while a senior candidate must demonstrate depth. Simultaneously, answers are captured via speech recognition, which introduces transcription artifacts (filler words, grammar errors, repeated phrases) that are properties of the *input channel*, not the candidate's competence.

**Why the naive approach fails:** A single scoring prompt treats all difficulty levels identically, frustrating junior candidates with harsh scores and failing to challenge senior candidates. Without explicit instructions to ignore speech artifacts, the model penalizes transcription noise as poor communication — conflating delivery medium with content quality.

**Solution:** A leniency tier system with orthogonal competency axes and explicit speech-noise isolation rules:

```typescript
// app/actions/answer.ts — lines 25-49
function getLeniency(difficulty: string) {
  switch (difficulty) {
    case "junior":
      return {
        label: "SUPPORTIVE",
        instructions: "SUPPORTIVE — This candidate is entry-level. Be encouraging. "
          + "If the answer is on-topic and shows basic understanding, "
          + "the minimum overall rating is 3.",
      };
    case "senior":
      return {
        label: "STRICT",
        instructions: "STRICT — Hold to high standards. "
          + "Expect depth, precision, and real-world examples.",
      };
    default:
      return {
        label: "BALANCED",
        instructions: "BALANCED — Standard evaluation.",
      };
  }
}
```

The feedback prompt separates `technicalKnowledge` (factual accuracy) from `communicationClarity` (structure and coherence) and enforces: *"Poor grammar or filler words from speech recognition must NOT reduce either score."* A keyword recognition rule requires `technicalKnowledge >= 3` if the candidate uses any key term from the expected answer. Feedback follows the sandwich method — praise, correction, actionable tip — framed as coaching rather than judgment.

**Tradeoff:** Floor constraints per difficulty level compress the scoring range. A junior candidate cannot score below 3 on an on-topic answer, which reduces granularity at the lower end. The alternative — no floors — produces discouraging scores for entry-level candidates who gave reasonable but incomplete answers, which defeats the product's purpose as a practice tool.

### Challenge 3: MediaRecorder Lifecycle and Cross-Browser MIME Negotiation

**Constraint:** Each interview question requires an independent video recording that starts after TTS playback and countdown, stops when the user submits, and produces a self-contained Blob for upload. The browser's `MediaRecorder` API has no standardized MIME type — VP9+Opus works in Chrome, VP8+Opus in Firefox, and the codec list varies by OS. Additionally, `MediaRecorder.stop()` is asynchronous: the final `ondataavailable` fires before `onstop`, and calling `stop()` on an inactive recorder throws.

**Why the naive approach fails:** Hardcoding `video/webm;codecs=vp9,opus` fails silently in Firefox. Calling `recorder.stop()` without checking state crashes if the user navigates away mid-recording. Using raw `MediaRecorder` in the component mixes imperative browser API with React's declarative model, creating cleanup bugs.

**Solution:** A factory-pattern abstraction that encapsulates MIME negotiation, Promise-wrapped stop, and defensive cleanup:

```typescript
// lib/mediaRecorder.ts — lines 8-20, 47-64
const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function getSupportedMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const mime of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

// RecordingSession.stop() — Promise wrapper
stop(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!recorder || recorder.state === "inactive") {
      reject(new Error("Recorder not active"));
      return;
    }
    recorder.onstop = () => {
      const mime = recorder?.mimeType || "video/webm";
      resolve(new Blob(chunks, { type: mime }));
      chunks = [];
      recorder = null;
    };
    recorder.stop();
  });
}
```

The `cleanup()` method wraps `recorder.stop()` in a try/catch for component unmount — the recorder may already be inactive if the user submitted before navigating. Each question creates a fresh `RecordingSession` via the factory, preventing track leaks across questions. The audio track is acquired once via `getUserMedia` with echo cancellation and reused across all sessions.

**Tradeoff:** The MIME candidate list requires manual maintenance as browser codec support evolves. The fallback to bare `video/webm` without explicit codecs produces larger files with less efficient compression. The alternative — server-side transcoding — would standardize output format but adds infrastructure and latency for a non-critical feature.

---

## 5. Impact & Future Roadmap

### Current State

- End-to-end interview pipeline: create, execute with speech I/O and video recording, receive multi-dimensional AI feedback with follow-up probing, and export a PDF report with embedded video QR codes
- Multi-turn conversational flow: AI-generated follow-up questions create realistic interview dynamics, with parent-child answer linking for structured review
- Difficulty-calibrated feedback: leniency tiers (junior/mid/senior) with sandwich-method coaching and speech-noise isolation across four competency dimensions
- Bilingual support (English + Korean) across all layers: UI, AI prompts, dual TTS pipeline (browser-native English, OpenAI cloud Korean), and PDF rendering with CJK font injection
- Dashboard management: search, filter by type/difficulty, sort by date/rating, with `useMemo`-filtered client-side rendering

### Scalability Considerations

- Server actions with per-request auth verification scale horizontally behind Vercel's edge network without session affinity requirements
- JSON-stringified feedback in the `UserAnswer` table avoids schema migrations when adding new competency dimensions — the parsing layer handles both legacy and enhanced formats transparently
- Fire-and-forget video uploads decouple the critical path (answer submission + feedback) from the optional path (video storage), ensuring interview flow is never blocked by network conditions
- Stateless interview execution (each question submission is an independent server action) means no server-side session state to manage or lose

### Planned Features

- **Multi-provider AI support** — abstract the OpenAI dependency behind a provider interface to support Gemini, Claude, and local models. The structured JSON response format constraint narrows viable providers to those supporting equivalent output modes, which Gemini and Claude both now offer. The `generateFromPrompt` wrapper in `lib/gemini.ts` is already a single integration point, making the swap surface area small.
- **Performance analytics** — aggregate scores across sessions to surface trends over time, identify weak competency dimensions, and recommend targeted practice areas. The `UserAnswer` table's denormalized `rating` field and structured `competencies` JSON already support this query pattern without schema changes.

The architecture is designed for this kind of extension: server actions isolate AI provider logic, the schema accommodates new feedback dimensions without migrations, and the client-side speech pipeline operates independently of the backend. Each layer evolves without cascading rewrites.
