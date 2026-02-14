import { Button } from "@/components/ui/button";
import Link from "next/link";

interface InterviewCardProps {
  mockId: string;
  jobPosition: string;
  jobExperience: string;
  createdAt: string | null;
}

export default function InterviewCard({
  mockId,
  jobPosition,
  jobExperience,
  createdAt,
}: InterviewCardProps) {
  return (
    <div className="border rounded-lg shadow-sm p-4">
      <h2 className="font-bold text-primary text-lg">{jobPosition}</h2>
      <p className="text-sm text-gray-600">{jobExperience} Years of Experience</p>
      <p className="text-xs text-gray-400 mt-1">
        Created: {createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"}
      </p>
      <div className="flex gap-3 mt-4">
        <Link href={`/dashboard/interview/${mockId}/feedback`}>
          <Button size="sm" variant="outline">Feedback</Button>
        </Link>
        <Link href={`/dashboard/interview/${mockId}`}>
          <Button size="sm">Start</Button>
        </Link>
      </div>
    </div>
  );
}
