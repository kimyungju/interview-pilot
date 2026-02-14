"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { getInterview } from "@/app/actions/interview";
import { submitAnswer } from "@/app/actions/answer";
import { Button } from "@/components/ui/button";
import { Loader, Mic, MicOff, Volume2 } from "lucide-react";
import Webcam from "react-webcam";

interface QuestionAnswer {
  question: string;
  answer: string;
}

export default function StartInterviewPage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();
  const { user } = useUser();

  const [questions, setQuestions] = useState<QuestionAnswer[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

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
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!user?.primaryEmailAddress?.emailAddress || !questions[activeIndex]) return;
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
        userAnswer,
        user.primaryEmailAddress.emailAddress
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

  if (questions.length === 0) return <p className="p-10">Loading questions...</p>;

  return (
    <div className="py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Questions Panel */}
        <div className="flex flex-col gap-5">
          {/* Question Tabs */}
          <div className="flex flex-wrap gap-2">
            {questions.map((_, index) => (
              <Button
                key={index}
                size="sm"
                variant={activeIndex === index ? "default" : "outline"}
                onClick={() => setActiveIndex(index)}
              >
                Question #{index + 1}
              </Button>
            ))}
          </div>

          {/* Current Question */}
          <div className="p-5 rounded-lg border">
            <h3 className="text-lg font-medium">
              {questions[activeIndex].question}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => handleTextToSpeech(questions[activeIndex].question)}
            >
              <Volume2 className="mr-1 h-4 w-4" /> Read Aloud
            </Button>
          </div>

          {/* User Answer Display */}
          <div className="p-5 rounded-lg border min-h-[100px]">
            <p className="text-sm text-gray-500 mb-2">Your Answer:</p>
            <p>{userAnswer || "Start recording to see your answer here..."}</p>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              variant={isRecording ? "destructive" : "default"}
              onClick={toggleRecording}
            >
              {isRecording ? (
                <><MicOff className="mr-2 h-4 w-4" /> Stop Recording</>
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
        </div>

        {/* Webcam Panel */}
        <div className="flex justify-center">
          <Webcam
            mirrored
            className="rounded-lg w-full h-72 object-cover"
          />
        </div>
      </div>
    </div>
  );
}
