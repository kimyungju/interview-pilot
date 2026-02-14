"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInterview } from "@/app/actions/interview";
import { submitAnswer } from "@/app/actions/answer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader, Mic, Volume2 } from "lucide-react";
import Webcam from "react-webcam";
import { getStoredVoiceGender, selectVoice, loadVoices } from "@/lib/voiceUtils";

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
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(
    null
  );
  const [speechSupported, setSpeechSupported] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);
  const countdownTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    if (params.interviewId) {
      getInterview(params.interviewId).then((data) => {
        if (data?.jsonMockResp) {
          const parsed = JSON.parse(data.jsonMockResp);
          const arr = Array.isArray(parsed)
            ? parsed
            : Object.values(parsed).find(Array.isArray) || [];
          setQuestions(arr);
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
          isRecordingRef.current = false;
        };
        setSpeechSupported(true);
        setRecognition(rec);
        recognitionRef.current = rec;
      }
    }
  }, []);

  useEffect(() => {
    loadVoices().then(setVoices);
  }, []);

  // Auto-read question, then start countdown after speech ends
  useEffect(() => {
    if (questions.length === 0 || !speechSupported) return;

    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
    setCountdown(null);
    window.speechSynthesis?.cancel();

    const utterance = handleTextToSpeech(questions[activeIndex].question);

    const startCountdown = () => {
      setCountdown(3);
      const t1 = setTimeout(() => setCountdown(2), 1000);
      const t2 = setTimeout(() => setCountdown(1), 2000);
      const t3 = setTimeout(() => {
        setCountdown(null);
        if (!isRecordingRef.current && recognitionRef.current) {
          setUserAnswer("");
          recognitionRef.current.start();
          setIsRecording(true);
          isRecordingRef.current = true;
        }
      }, 3000);
      countdownTimersRef.current = [t1, t2, t3];
    };

    if (utterance) {
      utterance.onend = startCountdown;
    } else {
      startCountdown();
    }

    return () => {
      countdownTimersRef.current.forEach(clearTimeout);
      countdownTimersRef.current = [];
      window.speechSynthesis?.cancel();
    };
  }, [activeIndex, questions.length, speechSupported]);

  const toggleRecording = () => {
    if (!recognition) return;

    window.speechSynthesis?.cancel();
    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
    setCountdown(null);

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
    } else {
      setUserAnswer("");
      recognition.start();
      setIsRecording(true);
      isRecordingRef.current = true;
    }
  };

  const handleTextToSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      const preferredGender = getStoredVoiceGender();
      const availableVoices =
        voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      const selectedVoice = selectVoice(availableVoices, preferredGender);
      if (selectedVoice) utterance.voice = selectedVoice;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return utterance;
    }
    return null;
  };

  const handleSubmitAnswer = async () => {
    if (!questions[activeIndex]) return;

    window.speechSynthesis?.cancel();
    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
    setCountdown(null);

    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
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
            style={{
              width: `${((activeIndex + 1) / questions.length) * 100}%`,
            }}
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
              onClick={() =>
                handleTextToSpeech(questions[activeIndex].question)
              }
            >
              <Volume2 className="mr-1.5 h-4 w-4" /> Read Aloud
            </Button>
          </div>

          {/* User Answer Display */}
          <div className="p-6 rounded-xl border bg-card min-h-[120px]">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Your Answer
            </p>
            <p
              className={
                userAnswer
                  ? "text-foreground leading-relaxed"
                  : "text-muted-foreground/60 italic"
              }
            >
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
                  disabled={countdown !== null}
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
                    <>
                      <Mic className="mr-2 h-4 w-4" /> Record Answer
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSubmitAnswer}
                  disabled={loading || !userAnswer}
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin mr-2 h-4 w-4" />{" "}
                      Submitting...
                    </>
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
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={loading || !userAnswer}
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin mr-2 h-4 w-4" />{" "}
                      Submitting...
                    </>
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
        <div className="flex justify-center relative h-72 overflow-hidden rounded-xl">
          <Webcam
            ref={webcamRef}
            mirrored
            className="w-full h-full object-cover border"
          />
          {countdown !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl">
              <p className="text-6xl font-bold text-white">{countdown}</p>
              <p className="text-white/80 text-sm mt-2">
                Starting in...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
