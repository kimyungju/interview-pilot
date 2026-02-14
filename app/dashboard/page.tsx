"use client";

import { useEffect, useState } from "react";
import AddNewInterview from "./_components/AddNewInterview";
import InterviewCard from "./_components/InterviewCard";
import { getInterviewList } from "@/app/actions/interview";

interface Interview {
  id: number;
  mockId: string;
  jobPosition: string;
  jobExperience: string;
  createdAt: string | null;
}

export default function DashboardPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);

  useEffect(() => {
    getInterviewList().then(setInterviews);
  }, []);

  return (
    <div className="py-12">
      <div className="mb-8">
        <h2 className="font-bold text-3xl font-display tracking-tight">
          Dashboard
        </h2>
        <p className="text-muted-foreground mt-1.5">
          Create and practice AI-powered mock interviews
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AddNewInterview />
        {interviews.map((interview) => (
          <InterviewCard
            key={interview.id}
            mockId={interview.mockId}
            jobPosition={interview.jobPosition}
            jobExperience={interview.jobExperience}
            createdAt={interview.createdAt}
          />
        ))}
      </div>
    </div>
  );
}
