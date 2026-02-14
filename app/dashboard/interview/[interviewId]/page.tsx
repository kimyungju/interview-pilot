"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInterview } from "@/app/actions/interview";
import { Button } from "@/components/ui/button";
import { Lightbulb, WebcamIcon, ArrowRight, CheckCircle } from "lucide-react";
import Webcam from "react-webcam";

interface InterviewData {
  jobPosition: string;
  jobDesc: string;
  jobExperience: string;
}

export default function InterviewPage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);

  useEffect(() => {
    if (params.interviewId) {
      getInterview(params.interviewId).then(setInterview);
    }
  }, [params.interviewId]);

  if (!interview) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="mb-8">
        <h2 className="font-bold text-3xl font-display tracking-tight">
          Let&apos;s Get Started
        </h2>
        <p className="text-muted-foreground mt-1.5">
          Review the details below and start your mock interview when ready
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-5">
          <div className="p-6 rounded-xl border bg-card">
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Position</span>
                <p className="text-lg font-semibold mt-0.5">{interview.jobPosition}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</span>
                <p className="text-sm text-muted-foreground mt-0.5">{interview.jobDesc}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Experience</span>
                <p className="text-sm font-medium mt-0.5">{interview.jobExperience} years</p>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-amber-200/60 bg-amber-50/50">
            <h3 className="flex items-center gap-2 text-amber-700 font-medium">
              <Lightbulb className="h-5 w-5" /> Before you begin
            </h3>
            <ul className="mt-3 space-y-2">
              {[
                "Enable your webcam and microphone",
                "You'll be asked 5 tailored questions",
                "Speak naturally — AI captures your responses",
                "We never record your video",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-amber-800/80">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center gap-5">
          {webcamEnabled ? (
            <Webcam
              onUserMediaError={() => setWebcamEnabled(false)}
              mirrored
              className="rounded-xl w-full h-72 object-cover border"
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center w-full h-72 rounded-xl border-2 border-dashed border-border bg-accent/30 cursor-pointer hover:border-primary/30 hover:bg-accent/50 transition-all duration-300"
              onClick={() => setWebcamEnabled(true)}
            >
              <WebcamIcon className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mt-3">Click to enable webcam</p>
            </div>
          )}

          <Button
            size="lg"
            className="w-full rounded-xl py-6 text-base"
            onClick={() => router.push(`/dashboard/interview/${params.interviewId}/start`)}
          >
            Start Interview <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
