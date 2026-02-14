"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAnswers } from "@/app/actions/answer";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Star, ArrowLeft, Trophy, Download } from "lucide-react";
import { generatePdf } from "@/lib/generatePdf";

interface Competencies {
  technicalKnowledge: number;
  communicationClarity: number;
  problemSolving: number;
  relevance: number;
}

interface EnhancedFeedback {
  rating: number;
  competencies: Competencies;
  strengths: string;
  improvements: string;
  suggestedAnswer: string;
}

interface AnswerData {
  id: number;
  question: string;
  correctAns: string | null;
  userAns: string | null;
  feedback: string | null;
  rating: string | null;
}

function parseEnhancedFeedback(feedback: string | null): EnhancedFeedback | null {
  if (!feedback) return null;
  try {
    const parsed = JSON.parse(feedback);
    if (parsed.competencies) return parsed as EnhancedFeedback;
  } catch {
    // Legacy plain-text feedback
  }
  return null;
}

function getRatingColor(rating: number): string {
  if (rating >= 4) return "text-emerald-600 dark:text-emerald-400";
  if (rating >= 3) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function getRatingBg(rating: number): string {
  if (rating >= 4) return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800";
  if (rating >= 3) return "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800";
  return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
}

function getBarColor(score: number): string {
  if (score >= 4) return "bg-emerald-500";
  if (score >= 3) return "bg-amber-500";
  return "bg-red-500";
}

const competencyLabels: Record<string, string> = {
  technicalKnowledge: "Technical Knowledge",
  communicationClarity: "Communication",
  problemSolving: "Problem Solving",
  relevance: "Relevance",
};

function CompetencyBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(score)}`}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <span className="text-xs font-medium w-6 text-right">{score}/5</span>
    </div>
  );
}

export default function FeedbackPage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();
  const [answers, setAnswers] = useState<AnswerData[]>([]);

  useEffect(() => {
    if (params.interviewId) {
      getAnswers(params.interviewId).then(setAnswers);
    }
  }, [params.interviewId]);

  const overallRating = answers.length
    ? (
        answers.reduce(
          (sum, a) => sum + (parseFloat(a.rating || "0") || 0),
          0
        ) / answers.length
      ).toFixed(1)
    : "0";

  if (answers.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const ratingNum = parseFloat(overallRating);

  const handleDownloadPdf = () => {
    generatePdf(answers, overallRating);
  };

  return (
    <div className="py-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold font-display tracking-tight">
          Interview Complete
        </h2>
        <p className="text-muted-foreground mt-2">
          Here&apos;s how you did — review each answer below
        </p>
      </div>

      {/* Overall Rating */}
      <div className="flex items-center justify-center gap-4 p-6 rounded-2xl border bg-card mb-8">
        <div className="flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
          <span className="text-sm font-medium text-muted-foreground">
            Overall Rating
          </span>
        </div>
        <div
          className={`text-4xl font-bold font-display ${getRatingColor(ratingNum)}`}
        >
          {overallRating}
          <span className="text-lg text-muted-foreground font-normal">/5</span>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {answers.map((answer, index) => {
          const rating = parseFloat(answer.rating || "0");
          const enhanced = parseEnhancedFeedback(answer.feedback);

          return (
            <Collapsible key={answer.id}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-xl bg-card border hover:bg-accent/50 text-left transition-colors duration-200 group">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary text-sm font-bold shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-medium text-sm line-clamp-1">
                    {answer.question}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-bold ${getRatingColor(rating)}`}
                  >
                    {answer.rating}/5
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform duration-200" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 pt-2 space-y-3">
                {/* Competency Bars (enhanced feedback) */}
                {enhanced?.competencies && (
                  <div className="p-4 rounded-lg border bg-card space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
                      Competency Scores
                    </p>
                    {Object.entries(enhanced.competencies).map(([key, score]) => (
                      <CompetencyBar
                        key={key}
                        label={competencyLabels[key] || key}
                        score={score}
                      />
                    ))}
                  </div>
                )}

                {/* Rating */}
                <div
                  className={`p-4 rounded-lg border ${getRatingBg(rating)}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
                    Rating
                  </p>
                  <p
                    className={`text-lg font-bold ${getRatingColor(rating)}`}
                  >
                    {answer.rating}/5
                  </p>
                </div>

                {/* Strengths (enhanced) */}
                {enhanced?.strengths && (
                  <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50">
                    <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1.5">
                      Strengths
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {enhanced.strengths}
                    </p>
                  </div>
                )}

                {/* Improvements (enhanced) */}
                {enhanced?.improvements && (
                  <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50">
                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1.5">
                      Areas to Improve
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {enhanced.improvements}
                    </p>
                  </div>
                )}

                {/* Your Answer */}
                <div className="p-4 rounded-lg bg-red-50/50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/50">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1.5">
                    Your Answer
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {answer.userAns || "No answer recorded"}
                  </p>
                </div>

                {/* Suggested Answer (enhanced) or Ideal Answer (legacy) */}
                <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50">
                  <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1.5">
                    {enhanced?.suggestedAnswer ? "Suggested Answer" : "Ideal Answer"}
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {enhanced?.suggestedAnswer || answer.correctAns || "N/A"}
                  </p>
                </div>

                {/* Legacy feedback (for old answers without enhanced format) */}
                {!enhanced && answer.feedback && (
                  <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1.5">
                      Feedback
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {answer.feedback}
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      <div className="mt-10 flex justify-center gap-3">
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={handleDownloadPdf}
        >
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
      </div>
    </div>
  );
}
