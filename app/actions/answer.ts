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
  userAns: string
) {
  const user = await currentUser();
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    throw new Error("Unauthorized");
  }
  const userEmail = user.emailAddresses[0].emailAddress;

  const feedbackPrompt = `You are an expert interview coach. Evaluate the following interview answer.

Question: "${question}"
Expected Answer: "${correctAns}"
User's Answer: "${userAns}"

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
