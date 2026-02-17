"use server";

import { db } from "@/lib/db";
import { UserAnswer } from "@/lib/schema";
import { generateFromPrompt } from "@/lib/gemini";
import { eq, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

interface EnhancedFeedback {
  rating: number;
  competencies: {
    technicalKnowledge: number;
    communicationClarity: number;
    problemSolving: number;
    relevance: number;
  };
  strengths: string;
  praise: string;
  correction: string;
  actionableTip: string;
  improvements: string;
  suggestedAnswer: string;
}

function getLeniency(difficulty: string): { label: string; instructions: string; labelKo: string; instructionsKo: string } {
  switch (difficulty) {
    case "junior":
      return {
        label: "SUPPORTIVE",
        instructions: "SUPPORTIVE — This candidate is entry-level. Be encouraging. If the answer is on-topic and shows basic understanding, the minimum overall rating is 3. Focus on building confidence.",
        labelKo: "격려 모드",
        instructionsKo: "격려 모드 — 이 지원자는 신입입니다. 격려해 주세요. 답변이 주제에 맞고 기본적인 이해를 보여주면 최소 전체 점수는 3점입니다. 자신감을 키워주는 데 집중하세요.",
      };
    case "senior":
      return {
        label: "STRICT",
        instructions: "STRICT — This candidate is senior-level. Hold to high standards. Expect depth, precision, and real-world examples.",
        labelKo: "엄격 모드",
        instructionsKo: "엄격 모드 — 이 지원자는 시니어입니다. 높은 기준을 유지하세요. 깊이, 정확성, 실무 예시를 기대하세요.",
      };
    default:
      return {
        label: "BALANCED",
        instructions: "BALANCED — Standard evaluation. Recognize effort while maintaining fair standards.",
        labelKo: "균형 모드",
        instructionsKo: "균형 모드 — 표준 평가입니다. 노력을 인정하되 공정한 기준을 유지하세요.",
      };
  }
}

export async function submitAnswer(
  mockIdRef: string,
  question: string,
  correctAns: string,
  userAns: string,
  language?: string,
  parentAnswerId?: number | null,
  difficulty?: string
) {
  const user = await currentUser();
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    throw new Error("Unauthorized");
  }
  const userEmail = user.emailAddresses[0].emailAddress;

  const leniency = getLeniency(difficulty || "mid");

  const feedbackPrompt = language === "ko"
    ? `당신은 격려하면서도 정직한 면접 코치입니다. 다음 면접 답변을 평가하세요.

평가 모드: ${leniency.labelKo}
${leniency.instructionsKo}

질문: "${question}"
예상 답변: "${correctAns}"
지원자의 답변: "${userAns}"

채점 기준:

1. 키워드 인식: 예상 답변에서 핵심 기술 용어를 파악하세요. 지원자가 이 용어들을 하나라도 올바르게 사용하면 (비격식 표현이라도) technicalKnowledge는 반드시 3 이상이어야 합니다.

2. 내용 vs 전달: "technicalKnowledge"는 사실적 정확성과 핵심 요점 포함 여부만으로 채점하세요. "communicationClarity"는 아이디어의 구조, 흐름, 일관성만으로 채점하세요. 음성 인식으로 인한 문법 오류나 불필요한 단어는 두 점수 모두 감점하지 마세요.

3. 척도:
   - 5점: 우수 — 포괄적이고 체계적이며 예시를 포함
   - 4점: 양호 — 대부분의 핵심 요점을 다루며 사소한 부분만 부족
   - 3점: 보통 — 핵심 개념의 이해를 보여주며 일부 부족한 점 있음
   - 2점: 미흡 — 상당한 오해 또는 대부분 주제에서 벗어남
   - 1점: 부족 — 근본적으로 틀리거나 빈 답변

4. 답변은 음성 인식으로 수집됩니다 — 문법, 불필요한 단어, 전사 오류는 무시하세요. 실질적 내용에 집중하세요.

피드백 형식 (샌드위치 기법):

- "praise": 지원자가 올바르게 한 한 가지를 구체적으로 인정 (실제 답변 내용을 참조)
- "correction": 하나의 기술적 오류나 부족한 점을 부드럽게 교정 ("~을 고려해 보세요" / "~을 보완하면 좋겠습니다" 등의 표현 사용)
- "actionableTip": 다음에 사용할 수 있는 구체적인 전문 표현이나 키워드 한 가지

다음 JSON 형식으로만 응답하세요:
{
  "rating": <전체 1-5점>,
  "competencies": {
    "technicalKnowledge": <1-5점>,
    "communicationClarity": <1-5점>,
    "problemSolving": <1-5점>,
    "relevance": <1-5점>
  },
  "strengths": "<잘한 점, 1-2문장, 한국어로>",
  "praise": "<올바르게 한 점을 구체적으로 인정, 한국어로>",
  "correction": "<하나의 오류나 부족한 점을 부드럽게 교정, 한국어로>",
  "actionableTip": "<다음에 사용할 전문 표현이나 키워드, 한국어로>",
  "suggestedAnswer": "<더 나은 답변 예시, 2-3문장, 한국어로>"
}`
    : `You are an encouraging yet honest interview coach. Evaluate the following answer.

Evaluation Mode: ${leniency.label}
${leniency.instructions}

Question: "${question}"
Expected Answer: "${correctAns}"
Candidate's Answer: "${userAns}"

SCORING RULES:

1. Keyword Recognition: Identify key technical terms from the Expected Answer. If the candidate uses ANY of these terms correctly (even with informal phrasing), technicalKnowledge MUST be ≥ 3.

2. Content vs. Clarity: Score "technicalKnowledge" based ONLY on factual correctness and coverage of key points. Score "communicationClarity" based ONLY on structure, flow, and coherence of ideas. Poor grammar or filler words from speech recognition must NOT reduce either score.

3. Scale:
   - 5: Excellent — comprehensive, well-structured, with examples
   - 4: Good — covers most key points, minor gaps
   - 3: Adequate — shows understanding of core concepts, some gaps
   - 2: Weak — significant misunderstanding or mostly off-topic
   - 1: Poor — fundamentally wrong or empty

4. Answers are captured via speech recognition — ignore grammar, filler words, and transcription errors. Focus on substance.

FEEDBACK FORMAT (Sandwich Method):

- "praise": Acknowledge ONE specific thing the candidate got right (reference their actual words)
- "correction": Gently correct ONE technical error or gap (use "consider" / "you might refine" instead of "wrong")
- "actionableTip": Give ONE specific professional phrase or keyword to use next time

Respond with ONLY JSON:
{
  "rating": <overall 1-5>,
  "competencies": {
    "technicalKnowledge": <1-5>,
    "communicationClarity": <1-5>,
    "problemSolving": <1-5>,
    "relevance": <1-5>
  },
  "strengths": "<what was done well, 1-2 sentences>",
  "praise": "<specific acknowledgment of something correct>",
  "correction": "<gentle correction of one error or gap>",
  "actionableTip": "<one professional phrase or keyword to use next time>",
  "suggestedAnswer": "<a stronger version, 2-3 sentences>"
}`;

  const responseText = await generateFromPrompt(feedbackPrompt, 0.7);
  let parsed: EnhancedFeedback;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error("AI returned invalid response. Please try again.");
  }

  const feedbackJson = JSON.stringify({
    rating: parsed.rating,
    competencies: parsed.competencies,
    strengths: parsed.strengths,
    praise: parsed.praise || "",
    correction: parsed.correction || "",
    actionableTip: parsed.actionableTip || "",
    improvements: parsed.correction || parsed.improvements || "",
    suggestedAnswer: parsed.suggestedAnswer,
  });

  const [inserted] = await db.insert(UserAnswer).values({
    mockIdRef,
    question,
    correctAns,
    userAns,
    feedback: feedbackJson,
    rating: String(parsed.rating),
    userEmail,
    createdAt: new Date().toISOString(),
    parentAnswerId: parentAnswerId ?? null,
  }).returning({ id: UserAnswer.id });

  return { rating: parsed.rating, feedback: feedbackJson, answerId: inserted.id };
}

export async function updateVideoUrl(answerId: number, videoUrl: string) {
  const user = await currentUser();
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    throw new Error("Unauthorized");
  }
  await db
    .update(UserAnswer)
    .set({ videoUrl })
    .where(eq(UserAnswer.id, answerId));
}

export async function getAnswers(mockIdRef: string) {
  const user = await currentUser();
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    throw new Error("Unauthorized");
  }
  const userEmail = user.emailAddresses[0].emailAddress;

  return db
    .select()
    .from(UserAnswer)
    .where(
      and(eq(UserAnswer.mockIdRef, mockIdRef), eq(UserAnswer.userEmail, userEmail))
    );
}

export async function generateFollowUpQuestion(
  originalQuestion: string,
  expectedAnswer: string,
  userAnswer: string,
  language?: string
) {
  const user = await currentUser();
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    throw new Error("Unauthorized");
  }

  const prompt = language === "ko"
    ? `당신은 전문 면접관입니다. 지원자의 답변을 바탕으로 더 깊이 파고드는 후속 질문 1개를 생성하세요.

원래 질문: "${originalQuestion}"
예상 답변: "${expectedAnswer}"
지원자의 답변: "${userAnswer}"

후속 질문은 다음 중 하나여야 합니다:
- 모호하거나 불완전한 부분을 구체적으로 묻기
- 실제 예시나 경험 요청
- 기술적 세부사항 탐색
- 트레이드오프나 실제 적용 방법 질문

실제 면접관처럼 자연스럽고 대화적인 톤으로 작성하세요.

JSON 형식으로만 응답하세요:
{ "followUpQuestion": "후속 질문..." }`
    : `You are an expert interviewer. Generate ONE follow-up question that probes deeper based on the candidate's answer.

Original Question: "${originalQuestion}"
Expected Answer: "${expectedAnswer}"
Candidate's Answer: "${userAnswer}"

The follow-up should do one of:
- Address vague or incomplete parts of the answer
- Ask for a specific example or scenario
- Probe deeper technical details
- Explore trade-offs or real-world application

Use a natural, conversational tone like a real interviewer.

Respond with ONLY JSON:
{ "followUpQuestion": "Your follow-up question..." }`;

  const responseText = await generateFromPrompt(prompt);
  const parsed = JSON.parse(responseText);
  return { followUpQuestion: parsed.followUpQuestion as string };
}
