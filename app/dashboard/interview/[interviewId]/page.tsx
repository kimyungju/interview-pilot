"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInterview } from "@/app/actions/interview";
import { Button } from "@/components/ui/button";
import { Lightbulb, WebcamIcon, ArrowRight, CheckCircle, Volume2, Play } from "lucide-react";
import Webcam from "react-webcam";
import {
  type VoiceGender,
  getStoredVoiceGender,
  setStoredVoiceGender,
  selectVoice,
  loadVoices,
} from "@/lib/voiceUtils";

interface InterviewData {
  jobPosition: string;
  jobDesc: string;
  jobExperience: string;
  interviewType?: string | null;
  difficulty?: string | null;
  questionCount?: string | null;
}

const typeLabels: Record<string, string> = {
  general: "General",
  behavioral: "Behavioral",
  technical: "Technical",
  "system-design": "System Design",
};

export default function InterviewPage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>("female");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  useEffect(() => {
    if (params.interviewId) {
      getInterview(params.interviewId).then(setInterview);
    }
  }, [params.interviewId]);

  useEffect(() => {
    setVoiceGender(getStoredVoiceGender());
    loadVoices().then(setVoices);
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleGenderChange = (gender: VoiceGender) => {
    setVoiceGender(gender);
    setStoredVoiceGender(gender);
  };

  const handlePreview = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      "Hello! I'll be your interviewer today. Let's get started."
    );
    utterance.lang = "en-US";
    const voice = selectVoice(voices, voiceGender);
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setPreviewPlaying(true);
    utterance.onend = () => setPreviewPlaying(false);
    utterance.onerror = () => setPreviewPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  if (!interview) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const questionCount = interview.questionCount || "5";
  const interviewType = interview.interviewType || "general";
  const difficulty = interview.difficulty || "mid";

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
              {interview.jobDesc && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</span>
                  <p className="text-sm text-muted-foreground mt-0.5">{interview.jobDesc}</p>
                </div>
              )}
              {interview.jobExperience && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Experience</span>
                  <p className="text-sm font-medium mt-0.5">{interview.jobExperience} years</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                  {typeLabels[interviewType] || "General"}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                  {difficulty}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                  {questionCount} questions
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-amber-200/60 bg-amber-50/50 dark:border-amber-700/40 dark:bg-amber-950/20">
            <h3 className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
              <Lightbulb className="h-5 w-5" /> Before you begin
            </h3>
            <ul className="mt-3 space-y-2">
              {[
                "Enable your webcam and microphone",
                `You'll be asked ${questionCount} tailored questions`,
                "Speak naturally — AI captures your responses",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-amber-800/80 dark:text-amber-300/80">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-5 rounded-xl border bg-card">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Volume2 className="h-4 w-4" /> Interviewer Voice
            </h3>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex rounded-lg border-2 border-border overflow-hidden">
                {(["female", "male"] as const).map((g) => (
                  <button
                    key={g}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
                      voiceGender === g
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-accent"
                    }`}
                    onClick={() => handleGenderChange(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={voices.length === 0 || previewPlaying}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" />
                {previewPlaying ? "Playing..." : "Preview"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2.5">
              Natural-sounding voice reads questions aloud
            </p>
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
