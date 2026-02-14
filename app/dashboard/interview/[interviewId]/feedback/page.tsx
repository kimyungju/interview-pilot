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
import { ChevronDown, Star, ArrowLeft, Trophy } from "lucide-react";

interface AnswerData {
  id: number;
  question: string;
  correctAns: string | null;
  userAns: string | null;
  feedback: string | null;
  rating: string | null;
}

function getRatingColor(rating: number): string {
  if (rating >= 4) return "text-emerald-600";
  if (rating >= 3) return "text-amber-600";
  return "text-red-500";
}

function getRatingBg(rating: number): string {
  if (rating >= 4) return "bg-emerald-50 border-emerald-200";
  if (rating >= 3) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
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
        answers.reduce((sum, a) => sum + (parseFloat(a.rating || "0") || 0), 0) /
        answers.length
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
          <span className="text-sm font-medium text-muted-foreground">Overall Rating</span>
        </div>
        <div className={`text-4xl font-bold font-display ${getRatingColor(ratingNum)}`}>
          {overallRating}
          <span className="text-lg text-muted-foreground font-normal">/5</span>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {answers.map((answer, index) => {
          const rating = parseFloat(answer.rating || "0");
          return (
            <Collapsible key={answer.id}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-xl bg-card border hover:bg-accent/50 text-left transition-colors duration-200 group">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary text-sm font-bold shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-medium text-sm line-clamp-1">{answer.question}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${getRatingColor(rating)}`}>
                    {answer.rating}/5
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform duration-200" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 pt-2 space-y-3">
                <div className={`p-4 rounded-lg border ${getRatingBg(rating)}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">Rating</p>
                  <p className={`text-lg font-bold ${getRatingColor(rating)}`}>{answer.rating}/5</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50/50 border border-red-100">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1.5">Your Answer</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{answer.userAns || "No answer recorded"}</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1.5">Ideal Answer</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{answer.correctAns || "N/A"}</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1.5">Feedback</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{answer.feedback || "No feedback"}</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      <div className="mt-10 flex justify-center">
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
