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
