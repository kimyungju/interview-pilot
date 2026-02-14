"use client";

import { useUser } from "@clerk/nextjs";
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
  const { user } = useUser();
  const [interviews, setInterviews] = useState<Interview[]>([]);

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      getInterviewList(user.primaryEmailAddress.emailAddress).then(setInterviews);
    }
  }, [user]);

  return (
    <div className="py-10">
      <h2 className="font-bold text-2xl">Dashboard</h2>
      <p className="text-gray-500">Create and start your AI Mock Interview</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-5">
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
