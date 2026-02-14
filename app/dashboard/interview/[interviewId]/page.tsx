"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInterview } from "@/app/actions/interview";
import { Button } from "@/components/ui/button";
import { Lightbulb, WebcamIcon } from "lucide-react";
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

  if (!interview) return <p className="p-10">Loading...</p>;

  return (
    <div className="py-10">
      <h2 className="font-bold text-2xl">Let&apos;s Get Started</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-7">
        <div className="flex flex-col gap-5">
          <div className="p-5 rounded-lg border">
            <h3 className="text-lg">
              <strong>Job Position: </strong>{interview.jobPosition}
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Description: </strong>{interview.jobDesc}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Experience: </strong>{interview.jobExperience} years
            </p>
          </div>

          <div className="p-5 rounded-lg border border-yellow-300 bg-yellow-50">
            <h3 className="flex items-center gap-2 text-yellow-600">
              <Lightbulb /> <strong>Information</strong>
            </h3>
            <p className="text-sm text-yellow-600 mt-2">
              Enable your webcam and microphone to start the AI-generated mock interview.
              You&apos;ll be asked 5 questions and receive feedback on each answer.
              Note: We never record your video. You can disable the webcam at any time.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          {webcamEnabled ? (
            <Webcam
              onUserMediaError={() => setWebcamEnabled(false)}
              mirrored
              className="rounded-lg w-full h-72 object-cover"
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center w-full h-72 rounded-lg border bg-secondary cursor-pointer"
              onClick={() => setWebcamEnabled(true)}
            >
              <WebcamIcon className="h-16 w-16 text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Click to enable webcam</p>
            </div>
          )}

          <Button
            className="w-full mt-5"
            onClick={() => router.push(`/dashboard/interview/${params.interviewId}/start`)}
          >
            Start Interview
          </Button>
        </div>
      </div>
    </div>
  );
}
