"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInterview } from "@/app/actions/interview";
import { submitAnswer } from "@/app/actions/answer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader, Mic, Volume2 } from "lucide-react";
import Webcam from "react-webcam";

interface QuestionAnswer {
  question: string;
  answer: string;
}

export default function StartInterviewPage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionAnswer[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    if (params.interviewId) {
      getInterview(params.interviewId).then((data) => {
        if (data?.jsonMockResp) {
          const parsed = JSON.parse(data.jsonMockResp);
          setQuestions(parsed);
        }
      });
    }
  }, [params.interviewId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = "en-US";
        rec.onresult = (event: SpeechRecognitionEvent) => {
          const parts: string[] = [];
          for (let i = 0; i < event.results.length; i++) {
            parts.push(event.results[i][0].transcript);
          }
          setUserAnswer(parts.join(" "));
        };
        rec.onerror = () => {
          setIsRecording(false);
        };
        setSpeechSupported(true);
        setRecognition(rec);
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) return;
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setUserAnswer("");
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleTextToSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!questions[activeIndex]) return;
    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
    }

    setLoading(true);
    try {
      await submitAnswer(
        params.interviewId,
        questions[activeIndex].question,
        questions[activeIndex].answer,
        userAnswer
      );

      if (activeIndex < questions.length - 1) {
        setActiveIndex((prev) => prev + 1);
        setUserAnswer("");
      } else {
        router.push(`/dashboard/interview/${params.interviewId}/feedback`);
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
    } finally {
      setLoading(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="py-10">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Question {activeIndex + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-primary">
            {Math.round(((activeIndex + 1) / questions.length) * 100)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((activeIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Questions Panel */}
        <div className="flex flex-col gap-5">
          {/* Question Tabs */}
          <div className="flex flex-wrap gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeIndex === index
                    ? "bg-primary text-primary-foreground shadow-md"
                    : index < activeIndex
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
                onClick={() => setActiveIndex(index)}
              >
                Q{index + 1}
              </button>
            ))}
          </div>

          {/* Current Question */}
          <div className="p-6 rounded-xl border bg-card">
            <h3 className="text-lg font-medium leading-relaxed">
              {questions[activeIndex].question}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-muted-foreground hover:text-primary"
              onClick={() => handleTextToSpeech(questions[activeIndex].question)}
            >
              <Volume2 className="mr-1.5 h-4 w-4" /> Read Aloud
            </Button>
          </div>

          {/* User Answer Display */}
          <div className="p-6 rounded-xl border bg-card min-h-[120px]">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Your Answer
            </p>
            <p className={userAnswer ? "text-foreground leading-relaxed" : "text-muted-foreground/60 italic"}>
              {userAnswer || "Start recording to see your answer here..."}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3">
            {speechSupported ? (
              <div className="flex gap-3">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  onClick={toggleRecording}
                >
                  {isRecording ? (
                    <>
                      <span className="relative mr-2 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                      </span>
                      Stop Recording
                    </>
                  ) : (
                    <><Mic className="mr-2 h-4 w-4" /> Record Answer</>
                  )}
                </Button>

                <Button onClick={handleSubmitAnswer} disabled={loading || !userAnswer}>
                  {loading ? (
                    <><Loader className="animate-spin mr-2 h-4 w-4" /> Submitting...</>
                  ) : activeIndex === questions.length - 1 ? (
                    "Submit & Finish"
                  ) : (
                    "Submit & Next"
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Textarea
                  placeholder="Type your answer here..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  rows={4}
                />
                <Button onClick={handleSubmitAnswer} disabled={loading || !userAnswer}>
                  {loading ? (
                    <><Loader className="animate-spin mr-2 h-4 w-4" /> Submitting...</>
                  ) : activeIndex === questions.length - 1 ? (
                    "Submit & Finish"
                  ) : (
                    "Submit & Next"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Webcam Panel */}
        <div className="flex justify-center">
          <Webcam
            mirrored
            className="rounded-xl w-full h-72 object-cover border"
          />
        </div>
      </div>
    </div>
  );
}
