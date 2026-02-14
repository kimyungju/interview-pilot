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
