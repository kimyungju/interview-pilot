"use server";

import { db } from "@/lib/db";
import { MockInterview, UserAnswer } from "@/lib/schema";
import { generateFromPrompt, cleanJsonResponse } from "@/lib/gemini";
import { v4 as uuidv4 } from "uuid";
import { eq, desc, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

async function getAuthEmail(): Promise<string> {
  const user = await currentUser();
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    throw new Error("Unauthorized");
  }
  return user.emailAddresses[0].emailAddress;
}

export async function createInterview(
  jobPosition: string,
  jobDesc: string,
  jobExperience: string
) {
  const userEmail = await getAuthEmail();

  const inputPrompt = `Job position: ${jobPosition}, Job Description: ${jobDesc}, Years of Experience: ${jobExperience}. Based on this information, give me 5 interview questions with answers. Respond with ONLY a JSON array, no other text. Format: [{"question": "...", "answer": "..."}]`;

  const responseText = await generateFromPrompt(inputPrompt);
  let jsonMockResp: string;
  try {
    const cleaned = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleaned);
    // Normalize: extract array if wrapped in object
    const arr = Array.isArray(parsed) ? parsed : Object.values(parsed).find(Array.isArray);
    if (!arr) throw new Error("Invalid format");
    jsonMockResp = JSON.stringify(arr);
  } catch {
    throw new Error("AI returned invalid response. Please try again.");
  }

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

export async function getInterviewList() {
  const userEmail = await getAuthEmail();
  return db
    .select()
    .from(MockInterview)
    .where(eq(MockInterview.createdBy, userEmail))
    .orderBy(desc(MockInterview.id));
}

export async function getInterview(mockId: string) {
  const userEmail = await getAuthEmail();
  const result = await db
    .select()
    .from(MockInterview)
    .where(eq(MockInterview.mockId, mockId));
  if (result[0] && result[0].createdBy !== userEmail) {
    return null;
  }
  return result[0] || null;
}

export async function deleteInterview(mockId: string) {
  const userEmail = await getAuthEmail();
  await db
    .delete(UserAnswer)
    .where(eq(UserAnswer.mockIdRef, mockId));
  await db
    .delete(MockInterview)
    .where(
      and(eq(MockInterview.mockId, mockId), eq(MockInterview.createdBy, userEmail))
    );
}
