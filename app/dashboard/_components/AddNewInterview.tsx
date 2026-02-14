"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader,
  Plus,
  Sparkles,
  FileText,
  ArrowLeft,
  Users,
  Code,
  Boxes,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createInterview } from "@/app/actions/interview";

type Step = "choose" | "form";
type Mode = "auto" | "content";
type InterviewType = "general" | "behavioral" | "technical" | "system-design";
type Difficulty = "junior" | "mid" | "senior";
type QuestionCount = "3" | "5" | "10";

const interviewTypes: { value: InterviewType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "general", label: "General", icon: <Zap className="h-4 w-4" />, desc: "Mixed questions" },
  { value: "behavioral", label: "Behavioral", icon: <Users className="h-4 w-4" />, desc: "STAR format" },
  { value: "technical", label: "Technical", icon: <Code className="h-4 w-4" />, desc: "Coding & concepts" },
  { value: "system-design", label: "System Design", icon: <Boxes className="h-4 w-4" />, desc: "Architecture" },
];

const difficulties: { value: Difficulty; label: string }[] = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
];

const questionCounts: QuestionCount[] = ["3", "5", "10"];

export default function AddNewInterview() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [mode, setMode] = useState<Mode>("auto");
  const [jobPosition, setJobPosition] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobExperience, setJobExperience] = useState("");
  const [referenceContent, setReferenceContent] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("general");
  const [difficulty, setDifficulty] = useState<Difficulty>("mid");
  const [questionCount, setQuestionCount] = useState<QuestionCount>("5");
  const [resumeText, setResumeText] = useState("");
  const [showResume, setShowResume] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const resetState = () => {
    setStep("choose");
    setMode("auto");
    setJobPosition("");
    setJobDesc("");
    setJobExperience("");
    setReferenceContent("");
    setInterviewType("general");
    setDifficulty("mid");
    setQuestionCount("5");
    setResumeText("");
    setShowResume(false);
    setLoading(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetState();
  };

  const handleModeSelect = (selectedMode: Mode) => {
    setMode(selectedMode);
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const { mockId } = await createInterview(
        jobPosition,
        mode === "auto" ? jobDesc : "",
        mode === "auto" ? jobExperience : "",
        {
          referenceContent: mode === "content" ? referenceContent : undefined,
          interviewType,
          difficulty,
          resumeText: resumeText || undefined,
          questionCount,
        }
      );
      handleOpenChange(false);
      router.push(`/dashboard/interview/${mockId}`);
    } catch (error) {
      console.error("Failed to create interview:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className="group flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-accent/30 hover:bg-accent/60 cursor-pointer transition-all duration-300">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
            New Interview
          </span>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        {step === "choose" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">
                Create a new interview
              </DialogTitle>
              <DialogDescription>
                Choose how you&apos;d like to generate your interview questions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                onClick={() => handleModeSelect("auto")}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/40 bg-accent/30 hover:bg-accent/60 cursor-pointer transition-all duration-300 text-center"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Auto Generate</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate questions from job details
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleModeSelect("content")}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/40 bg-accent/30 hover:bg-accent/60 cursor-pointer transition-all duration-300 text-center"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">From Your Content</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste your own reference material
                  </p>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">
                {mode === "auto"
                  ? "Tell us about your interview"
                  : "Paste your reference content"}
              </DialogTitle>
              <DialogDescription>
                {mode === "auto"
                  ? "Add details about the job position, description, and experience."
                  : "Provide the job position and paste any reference material (resume, job posting, notes, etc.)."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              <div>
                <label
                  htmlFor="jobPosition"
                  className="block text-sm font-medium mb-1.5"
                >
                  Job Position
                </label>
                <Input
                  id="jobPosition"
                  placeholder="e.g. Full Stack Developer"
                  required
                  value={jobPosition}
                  onChange={(e) => setJobPosition(e.target.value)}
                />
              </div>
              {mode === "auto" ? (
                <>
                  <div>
                    <label
                      htmlFor="jobDesc"
                      className="block text-sm font-medium mb-1.5"
                    >
                      Job Description / Tech Stack
                    </label>
                    <Textarea
                      id="jobDesc"
                      placeholder="e.g. React, Node.js, PostgreSQL..."
                      required
                      value={jobDesc}
                      onChange={(e) => setJobDesc(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="jobExperience"
                      className="block text-sm font-medium mb-1.5"
                    >
                      Years of Experience
                    </label>
                    <Input
                      id="jobExperience"
                      type="number"
                      placeholder="e.g. 3"
                      required
                      max={50}
                      value={jobExperience}
                      onChange={(e) => setJobExperience(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label
                    htmlFor="referenceContent"
                    className="block text-sm font-medium mb-1.5"
                  >
                    Reference Material
                  </label>
                  <Textarea
                    id="referenceContent"
                    placeholder="Paste your resume, job posting, study notes, or any content you want questions generated from..."
                    required
                    rows={8}
                    value={referenceContent}
                    onChange={(e) => setReferenceContent(e.target.value)}
                  />
                </div>
              )}

              {/* Interview Type */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Interview Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {interviewTypes.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setInterviewType(t.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                        interviewType === t.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/30 text-muted-foreground"
                      }`}
                    >
                      {t.icon}
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty + Question Count row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Difficulty
                  </label>
                  <div className="flex rounded-lg border-2 border-border overflow-hidden">
                    {difficulties.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDifficulty(d.value)}
                        className={`flex-1 py-2 text-xs font-medium transition-all duration-200 ${
                          difficulty === d.value
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent text-muted-foreground"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Questions
                  </label>
                  <div className="flex rounded-lg border-2 border-border overflow-hidden">
                    {questionCounts.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setQuestionCount(c)}
                        className={`flex-1 py-2 text-xs font-medium transition-all duration-200 ${
                          questionCount === c
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent text-muted-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Collapsible Resume Section (auto mode only) */}
              {mode === "auto" && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowResume(!showResume)}
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <span>Paste your resume (optional)</span>
                    {showResume ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {showResume && (
                    <div className="px-4 pb-4">
                      <Textarea
                        placeholder="Paste your resume text here for personalized questions..."
                        rows={6}
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        AI will probe your specific experience and skills
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("choose")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader className="animate-spin mr-2" /> Generating...
                      </>
                    ) : (
                      "Start Interview"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
