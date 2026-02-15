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
  improvements: string;
  suggestedAnswer: string;
}

export async function submitAnswer(
  mockIdRef: string,
  question: string,
  correctAns: string,
  userAns: string,
  language?: string
) {
  const user = await currentUser();
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    throw new Error("Unauthorized");
  }
  const userEmail = user.emailAddresses[0].emailAddress;

  const feedbackPrompt = language === "ko"
    ? `당신은 전문 면접 코치입니다. 다음 면접 답변을 평가하세요.

질문: "${question}"
예상 답변: "${correctAns}"
지원자의 답변: "${userAns}"

중요한 채점 기준:
- 이것은 면접 연습입니다. 답변은 음성 인식으로 수집되므로 문법 오류, 불필요한 단어, 전사 오류는 무시하세요.
- 지원자가 핵심 개념과 주요 아이디어를 이해하고 있는지에 초점을 맞추세요.
- 지원자가 예상 답변의 핵심 요점을 다루고 있다면 (다른 표현이나 구조라도) 4점 이상을 주세요.
- 답변이 근본적으로 틀리거나, 완전히 주제에서 벗어나거나, 핵심 아이디어가 완전히 빠진 경우에만 낮은 점수(1-2점)를 주세요.
- "communicationClarity"는 아이디어 전달력을 측정합니다. 문법이나 문장 구조가 아닙니다.
- "relevance"는 답변이 질문의 핵심 주제를 다루는지를 측정합니다. 예상 답변과 단어가 일치하는지가 아닙니다.

다음 JSON 형식으로만 응답하세요 (마크다운이나 추가 텍스트 없이):
{
  "rating": <1-5점 전체 점수>,
  "competencies": {
    "technicalKnowledge": <1-5점>,
    "communicationClarity": <1-5점>,
    "problemSolving": <1-5점>,
    "relevance": <1-5점>
  },
  "strengths": "<잘한 점, 1-2문장, 한국어로>",
  "improvements": "<개선할 부분, 1-2문장, 한국어로>",
  "suggestedAnswer": "<더 나은 답변 예시, 2-3문장, 한국어로>"
}`
    : `You are an expert interview coach. Evaluate the following interview answer.

Question: "${question}"
Expected Answer: "${correctAns}"
User's Answer: "${userAns}"

IMPORTANT scoring guidelines:
- This is mock interview practice. Answers are captured via speech recognition, so ignore grammar mistakes, filler words, and transcription artifacts.
- Focus on whether the candidate demonstrates understanding of the KEY CONCEPTS and MAIN IDEAS.
- If the candidate covers the core points of the expected answer (even in different words or structure), score them 4 or higher.
- Only give low scores (1-2) if the answer is fundamentally wrong, completely off-topic, or missing the main idea entirely.
- "communicationClarity" measures how well the candidate conveys their IDEAS, NOT grammar or sentence structure.
- "relevance" measures whether the answer addresses the question's core topic, not whether it matches the expected answer word-for-word.

Respond with ONLY a JSON object (no markdown, no extra text) in this exact format:
{
  "rating": <overall score 1-5>,
  "competencies": {
    "technicalKnowledge": <score 1-5>,
    "communicationClarity": <score 1-5>,
    "problemSolving": <score 1-5>,
    "relevance": <score 1-5>
  },
  "strengths": "<what the candidate did well, 1-2 sentences>",
  "improvements": "<specific areas to improve, 1-2 sentences>",
  "suggestedAnswer": "<a stronger version of the answer, 2-3 sentences>"
}`;

  const responseText = await generateFromPrompt(feedbackPrompt);
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
    improvements: parsed.improvements,
    suggestedAnswer: parsed.suggestedAnswer,
  });

  await db.insert(UserAnswer).values({
    mockIdRef,
    question,
    correctAns,
    userAns,
    feedback: feedbackJson,
    rating: String(parsed.rating),
    userEmail,
    createdAt: new Date().toISOString(),
  });

  return { rating: parsed.rating, feedback: feedbackJson };
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
