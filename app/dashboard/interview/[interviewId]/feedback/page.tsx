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
import { useTranslation } from "@/lib/i18n/LanguageContext";

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
  praise?: string;
  correction?: string;
  actionableTip?: string;
  suggestedAnswer: string;
}

interface AnswerData {
  id: number;
  question: string;
  correctAns: string | null;
  userAns: string | null;
  feedback: string | null;
  rating: string | null;
  parentAnswerId: number | null;
  videoUrl: string | null;
}

interface GroupedAnswer extends AnswerData {
  followUp?: AnswerData | null;
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

function VideoPlayer({ url, label }: { url: string; label: string }) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
        {label}
      </p>
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="w-full rounded-lg max-h-64 bg-black"
      />
    </div>
  );
}

const competencyKeys = ["technicalKnowledge", "communicationClarity", "problemSolving", "relevance"] as const;

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
  const [answers, setAnswers] = useState<GroupedAnswer[]>([]);
  const { t, language } = useTranslation();
  const [pdfLoading, setPdfLoading] = useState(false);

  const competencyLabels: Record<string, string> = {
    technicalKnowledge: t("feedback.technicalKnowledge"),
    communicationClarity: t("feedback.communication"),
    problemSolving: t("feedback.problemSolving"),
    relevance: t("feedback.relevance"),
  };

  useEffect(() => {
    if (params.interviewId) {
      getAnswers(params.interviewId).then((data) => {
        const mainAnswers = data.filter((a) => !a.parentAnswerId);
        const grouped: GroupedAnswer[] = mainAnswers.map((main) => ({
          ...main,
          followUp: data.find((f) => f.parentAnswerId === main.id) || null,
        }));
        setAnswers(grouped);
      });
    }
  }, [params.interviewId]);

  const allRatings = answers.flatMap((a) => {
    const ratings = [parseFloat(a.rating || "0") || 0];
    if (a.followUp) ratings.push(parseFloat(a.followUp.rating || "0") || 0);
    return ratings;
  });
  const overallRating = allRatings.length
    ? (allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length).toFixed(1)
    : "0";

  if (answers.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const ratingNum = parseFloat(overallRating);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await generatePdf(answers, overallRating, language);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="py-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold font-display tracking-tight">
          {t("feedback.title")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("feedback.subtitle")}
        </p>
      </div>

      {/* Overall Rating */}
      <div className="flex items-center justify-center gap-4 p-6 rounded-2xl border bg-card mb-8">
        <div className="flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
          <span className="text-sm font-medium text-muted-foreground">
            {t("feedback.overallRating")}
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
                {/* Video Recording */}
                {answer.videoUrl && (
                  <VideoPlayer url={answer.videoUrl} label={t("feedback.videoRecording")} />
                )}

                {/* Competency Bars (enhanced feedback) */}
                {enhanced?.competencies && (
                  <div className="p-4 rounded-lg border bg-card space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted-foreground">
                      {t("feedback.competencyScores")}
                    </p>
                    {competencyKeys.map((key) => (
                      <CompetencyBar
                        key={key}
                        label={competencyLabels[key] || key}
                        score={enhanced.competencies[key]}
                      />
                    ))}
                  </div>
                )}

                {/* Rating */}
                <div
                  className={`p-4 rounded-lg border ${getRatingBg(rating)}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
                    {t("feedback.rating")}
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
                      {t("feedback.strengths")}
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {enhanced.strengths}
                    </p>
                  </div>
                )}

                {/* Sandwich Feedback (new format) */}
                {enhanced?.praise && (
                  <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50">
                    <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1.5">
                      {t("feedback.praise")}
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {enhanced.praise}
                    </p>
                  </div>
                )}
                {enhanced?.correction && (
                  <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50">
                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1.5">
                      {t("feedback.correction")}
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {enhanced.correction}
                    </p>
                  </div>
                )}
                {enhanced?.actionableTip && (
                  <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1.5">
                      {t("feedback.actionableTip")}
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {enhanced.actionableTip}
                    </p>
                  </div>
                )}
                {/* Fallback for old answers that only have improvements */}
                {!enhanced?.praise && enhanced?.improvements && (
                  <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50">
                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1.5">
                      {t("feedback.improvements")}
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {enhanced.improvements}
                    </p>
                  </div>
                )}

                {/* Your Answer */}
                <div className="p-4 rounded-lg bg-red-50/50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/50">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1.5">
                    {t("feedback.yourAnswer")}
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {answer.userAns || t("feedback.noAnswer")}
                  </p>
                </div>

                {/* Suggested Answer (enhanced) or Ideal Answer (legacy) */}
                <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50">
                  <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1.5">
                    {enhanced?.suggestedAnswer ? t("feedback.suggestedAnswer") : t("feedback.idealAnswer")}
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {enhanced?.suggestedAnswer || answer.correctAns || t("feedback.na")}
                  </p>
                </div>

                {/* Legacy feedback (for old answers without enhanced format) */}
                {!enhanced && answer.feedback && (
                  <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1.5">
                      {t("feedback.legacyFeedback")}
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {answer.feedback}
                    </p>
                  </div>
                )}

                {/* Follow-up Q&A */}
                {answer.followUp && (
                  <div className="mt-2 p-4 rounded-lg border-l-4 border-amber-400 bg-amber-50/30 dark:bg-amber-950/20">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-500 text-white text-xs font-semibold mb-2">
                      {t("feedback.followUp")} — {answer.followUp.rating}/5
                    </span>
                    <p className="text-sm font-medium mb-2">{answer.followUp.question}</p>
                    {answer.followUp.videoUrl && (
                      <div className="mb-2">
                        <VideoPlayer url={answer.followUp.videoUrl} label={t("feedback.videoRecording")} />
                      </div>
                    )}
                    <div className="p-3 rounded bg-background/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{t("feedback.yourAnswer")}</p>
                      <p className="text-sm">{answer.followUp.userAns || t("feedback.noAnswer")}</p>
                    </div>
                    {(() => {
                      const efb = parseEnhancedFeedback(answer.followUp.feedback);
                      if (!efb) return null;
                      return (
                        <>
                          {efb.praise && (
                            <div className="p-3 rounded bg-background/50 mt-2">
                              <p className="text-xs font-semibold text-emerald-500 uppercase mb-1">{t("feedback.praise")}</p>
                              <p className="text-sm">{efb.praise}</p>
                            </div>
                          )}
                          {efb.correction && (
                            <div className="p-3 rounded bg-background/50 mt-2">
                              <p className="text-xs font-semibold text-amber-500 uppercase mb-1">{t("feedback.correction")}</p>
                              <p className="text-sm">{efb.correction}</p>
                            </div>
                          )}
                          {efb.actionableTip && (
                            <div className="p-3 rounded bg-background/50 mt-2">
                              <p className="text-xs font-semibold text-blue-500 uppercase mb-1">{t("feedback.actionableTip")}</p>
                              <p className="text-sm">{efb.actionableTip}</p>
                            </div>
                          )}
                          {!efb.praise && efb.improvements && (
                            <div className="p-3 rounded bg-background/50 mt-2">
                              <p className="text-xs font-semibold text-amber-500 uppercase mb-1">{t("feedback.improvements")}</p>
                              <p className="text-sm">{efb.improvements}</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
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
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("feedback.backToDashboard")}
        </Button>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
        >
          <Download className="mr-2 h-4 w-4" /> {pdfLoading ? t("feedback.generating") : t("feedback.downloadPdf")}
        </Button>
      </div>
    </div>
  );
}
