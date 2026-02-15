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

function buildTypeInstruction(type: string, language: string): string {
  if (language === "ko") {
    switch (type) {
      case "behavioral":
        return "STAR 형식(상황, 과제, 행동, 결과)을 사용한 행동 및 상황 질문에 집중하세요. 팀워크, 갈등 해결, 리더십, 과거 경험에 대해 질문하세요.";
      case "technical":
        return "코딩 개념, 문제 해결, 알고리즘, 자료 구조, 해당 직무와 관련된 시스템 지식을 다루는 기술 질문에 집중하세요.";
      case "system-design":
        return "아키텍처 트레이드오프, 확장성, 디자인 패턴, API 설계, 분산 시스템을 다루는 시스템 설계 질문에 집중하세요.";
      default:
        return "행동, 기술, 상황 질문을 균형 있게 포함하세요.";
    }
  }
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

function buildDifficultyInstruction(difficulty: string, language: string): string {
  if (language === "ko") {
    switch (difficulty) {
      case "junior":
        return "주니어 수준의 지원자를 대상으로: 기본 개념, 기초 지식, 간단한 시나리오에 집중하세요.";
      case "senior":
        return "시니어 수준의 지원자를 대상으로: 리더십, 복잡한 아키텍처 결정, 멘토링, 고급 문제 해결에 대한 질문을 포함하세요.";
      default:
        return "미드 레벨 지원자를 대상으로: 개념적 이해와 실무 적용 사이의 균형을 맞추세요.";
    }
  }
  switch (difficulty) {
    case "junior":
      return "Target a junior-level candidate: focus on fundamentals, basic concepts, and straightforward scenarios.";
    case "senior":
      return "Target a senior-level candidate: include questions about leadership, complex architectural decisions, mentoring, and advanced problem-solving.";
    default:
      return "Target a mid-level candidate: balance between conceptual understanding and practical application.";
  }
}

const FOCUS_ANGLES = [
  "Focus on real-world problem-solving scenarios",
  "Emphasize edge cases and unusual situations",
  "Prioritize questions about collaboration and communication",
  "Focus on recent industry trends and emerging practices",
  "Emphasize debugging, troubleshooting, and failure analysis",
  "Focus on design trade-offs and decision-making",
  "Prioritize questions that reveal depth of understanding",
  "Focus on cross-functional skills and adaptability",
  "Emphasize creativity and unconventional approaches",
  "Focus on mentoring, knowledge sharing, and growth",
  "Explore scalability challenges and performance optimization",
  "Focus on handling ambiguity and incomplete requirements",
];

function pickRandomAngles(count: number): string[] {
  const shuffled = [...FOCUS_ANGLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function buildDiversityInstruction(language: string): string {
  const angles = pickRandomAngles(2);
  if (language === "ko") {
    return `\n\n독창적이고 창의적인 질문을 생성하세요 — 일반적이거나 흔히 묻는 면접 질문은 피하세요. 다음 관점을 중점적으로 다루세요:\n- ${angles[0]}\n- ${angles[1]}`;
  }
  return `\n\nGenerate unique, creative questions — avoid generic or commonly-asked interview questions. Focus on these angles:\n- ${angles[0]}\n- ${angles[1]}`;
}

function buildLanguageInstruction(language: string): string {
  if (language === "ko") {
    return "모든 질문과 답변을 한국어로 작성하세요. 자연스럽고 전문적인 한국어를 사용하세요.";
  }
  return "";
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
    language?: string;
  }
) {
  const userEmail = await getAuthEmail();

  const interviewType = options?.interviewType || "general";
  const difficulty = options?.difficulty || "mid";
  const resumeText = options?.resumeText || "";
  const questionCount = options?.questionCount || "5";
  const referenceContent = options?.referenceContent;
  const language = options?.language || "en";
  const count = parseInt(questionCount) || 5;

  const typeInstruction = buildTypeInstruction(interviewType, language);
  const difficultyInstruction = buildDifficultyInstruction(difficulty, language);
  const languageInstruction = buildLanguageInstruction(language);

  const diversityInstruction = buildDiversityInstruction(language);
  let inputPrompt: string;

  if (referenceContent) {
    inputPrompt = `${languageInstruction ? languageInstruction + "\n\n" : ""}Job position: ${jobPosition}. The candidate has provided the following reference content (resume, job posting, study notes, etc.):\n\n${referenceContent}\n\n${typeInstruction}\n${difficultyInstruction}${diversityInstruction}\n\nBased on this content, generate ${count} interview questions with detailed answers that test the candidate's knowledge of the material. Respond with ONLY a JSON array, no other text. Format: [{"question": "...", "answer": "..."}]`;
  } else {
    const resumeSection = resumeText
      ? `\n\nThe candidate has provided their resume:\n${resumeText}\n\nUse the resume to personalize questions — probe specific claims, target gaps between their experience and the job requirements, and reference their actual projects/skills.`
      : "";

    inputPrompt = `${languageInstruction ? languageInstruction + "\n\n" : ""}Job position: ${jobPosition}, Job Description: ${jobDesc}, Years of Experience: ${jobExperience}.${resumeSection}\n\n${typeInstruction}\n${difficultyInstruction}${diversityInstruction}\n\nBased on this information, generate ${count} interview questions with detailed answers. Respond with ONLY a JSON array, no other text. Format: [{"question": "...", "answer": "..."}]`;
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
    language,
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
