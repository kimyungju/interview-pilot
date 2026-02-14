"use server";

import { db } from "@/lib/db";
import { MockInterview, UserAnswer } from "@/lib/schema";
import { generateFromPrompt } from "@/lib/gemini";
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

function buildTypeInstruction(type: string): string {
  switch (type) {
    case "behavioral":
      return "Focus on behavioral and situational questions using the STAR format (Situation, Task, Action, Result). Ask about teamwork, conflict resolution, leadership, and past experiences.";
    case "technical":
      return "Focus on technical questions covering coding concepts, problem-solving, algorithms, data structures, and system knowledge relevant to the role.";
    case "system-design":
      return "Focus on system design questions covering architecture trade-offs, scalability, design patterns, API design, and distributed systems.";
    default:
      return "Include a balanced mix of behavioral, technical, and situational questions.";
  }
}

function buildDifficultyInstruction(difficulty: string): string {
  switch (difficulty) {
    case "junior":
      return "Target a junior-level candidate: focus on fundamentals, basic concepts, and straightforward scenarios.";
    case "senior":
      return "Target a senior-level candidate: include questions about leadership, complex architectural decisions, mentoring, and advanced problem-solving.";
    default:
      return "Target a mid-level candidate: balance between conceptual understanding and practical application.";
  }
}

export async function createInterview(
  jobPosition: string,
  jobDesc: string,
  jobExperience: string,
  options?: {
    referenceContent?: string;
    interviewType?: string;
    difficulty?: string;
    resumeText?: string;
    questionCount?: string;
  }
) {
  const userEmail = await getAuthEmail();

  const interviewType = options?.interviewType || "general";
  const difficulty = options?.difficulty || "mid";
  const resumeText = options?.resumeText || "";
  const questionCount = options?.questionCount || "5";
  const referenceContent = options?.referenceContent;
  const count = parseInt(questionCount) || 5;

  const typeInstruction = buildTypeInstruction(interviewType);
  const difficultyInstruction = buildDifficultyInstruction(difficulty);

  let inputPrompt: string;

  if (referenceContent) {
    inputPrompt = `Job position: ${jobPosition}. The candidate has provided the following reference content (resume, job posting, study notes, etc.):\n\n${referenceContent}\n\n${typeInstruction}\n${difficultyInstruction}\n\nBased on this content, generate ${count} interview questions with detailed answers that test the candidate's knowledge of the material. Respond with ONLY a JSON array, no other text. Format: [{"question": "...", "answer": "..."}]`;
  } else {
    const resumeSection = resumeText
      ? `\n\nThe candidate has provided their resume:\n${resumeText}\n\nUse the resume to personalize questions — probe specific claims, target gaps between their experience and the job requirements, and reference their actual projects/skills.`
      : "";

    inputPrompt = `Job position: ${jobPosition}, Job Description: ${jobDesc}, Years of Experience: ${jobExperience}.${resumeSection}\n\n${typeInstruction}\n${difficultyInstruction}\n\nBased on this information, generate ${count} interview questions with detailed answers. Respond with ONLY a JSON array, no other text. Format: [{"question": "...", "answer": "..."}]`;
  }

  const responseText = await generateFromPrompt(inputPrompt);
  let jsonMockResp: string;
  try {
    const parsed = JSON.parse(responseText);
    const arr = Array.isArray(parsed)
      ? parsed
      : Object.values(parsed).find(Array.isArray);
    if (!arr) throw new Error("No questions array found");
    jsonMockResp = JSON.stringify(arr);
  } catch (e) {
    console.error("Failed to parse AI response:", responseText);
    throw new Error("AI returned invalid response. Please try again.");
  }

  const mockId = uuidv4();

  await db.insert(MockInterview).values({
    mockId,
    jsonMockResp,
    jobPosition,
    jobDesc: referenceContent ? "" : jobDesc,
    jobExperience: referenceContent ? "" : jobExperience,
    interviewType,
    difficulty,
    resumeText: resumeText || null,
    questionCount,
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
