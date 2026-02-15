"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteInterview } from "@/app/actions/interview";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface InterviewCardProps {
  mockId: string;
  jobPosition: string;
  jobExperience: string;
  createdAt: string | null;
  interviewType?: string | null;
  difficulty?: string | null;
  onDeleted?: () => void;
}

const difficultyColors: Record<string, string> = {
  junior: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  mid: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  senior: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function InterviewCard({
  mockId,
  jobPosition,
  jobExperience,
  createdAt,
  interviewType,
  difficulty,
  onDeleted,
}: InterviewCardProps) {
  const [deleting, setDeleting] = useState(false);
  const { t, language } = useTranslation();

  async function handleDelete() {
    if (!confirm(t("card.deleteConfirm", { position: jobPosition }))) return;
    setDeleting(true);
    try {
      await deleteInterview(mockId);
      onDeleted?.();
    } catch {
      setDeleting(false);
    }
  }

  const type = interviewType || "general";
  const diff = difficulty || "mid";

  return (
    <div className="group relative p-5 rounded-xl border border-border bg-card hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300">
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <h2 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors duration-300 pr-8">
        {jobPosition}
      </h2>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
          {t(`types.${type}`)}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${difficultyColors[diff] || difficultyColors.mid}`}>
          {t(`difficulties.${diff}`)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-2.5 text-sm text-muted-foreground">
        <Briefcase className="h-3.5 w-3.5" />
        <span>{jobExperience} {t("card.yearsExp")}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground/70">
        <Calendar className="h-3 w-3" />
        <span>{createdAt ? new Date(createdAt).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US") : t("card.na")}</span>
      </div>
      <div className="flex gap-3 mt-5">
        <Link href={`/dashboard/interview/${mockId}/feedback`}>
          <Button size="sm" variant="outline" className="rounded-lg">
            {t("card.feedback")}
          </Button>
        </Link>
        <Link href={`/dashboard/interview/${mockId}`}>
          <Button size="sm" className="rounded-lg">{t("card.start")}</Button>
        </Link>
      </div>
    </div>
  );
}
