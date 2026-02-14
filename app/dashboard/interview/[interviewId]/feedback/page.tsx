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
import { ChevronDown, Star } from "lucide-react";

interface AnswerData {
  id: number;
  question: string;
  correctAns: string | null;
  userAns: string | null;
  feedback: string | null;
  rating: string | null;
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

  if (answers.length === 0) return <p className="p-10">Loading feedback...</p>;

  return (
    <div className="py-10">
      <h2 className="text-3xl font-bold text-green-600">Congratulations!</h2>
      <p className="text-lg text-gray-600 mt-2">Here is your interview feedback</p>

      <div className="my-5 p-5 rounded-lg border bg-secondary">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Star className="text-yellow-500" />
          Overall Rating: <span className="text-primary">{overallRating}/5</span>
        </h3>
      </div>

      <div className="space-y-4">
        {answers.map((answer, index) => (
          <Collapsible key={answer.id}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg bg-secondary hover:bg-secondary/80 text-left">
              <span className="font-medium">
                Question #{index + 1}: {answer.question}
              </span>
              <ChevronDown className="h-5 w-5" />
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border rounded-b-lg space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-500">Rating</p>
                <p className="text-primary font-bold">{answer.rating}/5</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-500">Your Answer</p>
                <p className="text-sm bg-red-50 p-3 rounded">{answer.userAns || "No answer recorded"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-500">Correct Answer</p>
                <p className="text-sm bg-green-50 p-3 rounded">{answer.correctAns || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-500">Feedback</p>
                <p className="text-sm bg-blue-50 p-3 rounded">{answer.feedback || "No feedback"}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <Button className="mt-8" onClick={() => router.push("/dashboard")}>
        Go to Dashboard
      </Button>
    </div>
  );
}
