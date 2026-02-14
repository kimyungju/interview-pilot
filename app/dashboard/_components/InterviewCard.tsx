"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteInterview } from "@/app/actions/interview";

interface InterviewCardProps {
  mockId: string;
  jobPosition: string;
  jobExperience: string;
  createdAt: string | null;
  onDeleted?: () => void;
}

export default function InterviewCard({
  mockId,
  jobPosition,
  jobExperience,
  createdAt,
  onDeleted,
}: InterviewCardProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${jobPosition}" interview?`)) return;
    setDeleting(true);
    try {
      await deleteInterview(mockId);
      onDeleted?.();
    } catch {
      setDeleting(false);
    }
  }

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
      <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
        <Briefcase className="h-3.5 w-3.5" />
        <span>{jobExperience} years experience</span>
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground/70">
        <Calendar className="h-3 w-3" />
        <span>{createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"}</span>
      </div>
      <div className="flex gap-3 mt-5">
        <Link href={`/dashboard/interview/${mockId}/feedback`}>
          <Button size="sm" variant="outline" className="rounded-lg">
            Feedback
          </Button>
        </Link>
        <Link href={`/dashboard/interview/${mockId}`}>
          <Button size="sm" className="rounded-lg">Start</Button>
        </Link>
      </div>
    </div>
  );
}
