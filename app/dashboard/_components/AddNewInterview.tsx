"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
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
import { Loader, Plus } from "lucide-react";
import { createInterview } from "@/app/actions/interview";

export default function AddNewInterview() {
  const [open, setOpen] = useState(false);
  const [jobPosition, setJobPosition] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobExperience, setJobExperience] = useState("");
  const [loading, setLoading] = useState(false);

  const { user } = useUser();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.primaryEmailAddress?.emailAddress) return;

    setLoading(true);
    try {
      const { mockId } = await createInterview(
        jobPosition,
        jobDesc,
        jobExperience,
        user.primaryEmailAddress.emailAddress
      );
      setOpen(false);
      router.push(`/dashboard/interview/${mockId}`);
    } catch (error) {
      console.error("Failed to create interview:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="p-10 border rounded-lg bg-secondary hover:scale-105 hover:shadow-md cursor-pointer transition-all">
          <h2 className="text-lg text-center">
            <Plus className="inline mr-1" /> Add New
          </h2>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Tell us more about your interview</DialogTitle>
          <DialogDescription>
            Add details about the job position, description, and experience.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Job Position</label>
            <Input
              placeholder="e.g. Full Stack Developer"
              required
              value={jobPosition}
              onChange={(e) => setJobPosition(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Job Description / Tech Stack</label>
            <Textarea
              placeholder="e.g. React, Node.js, PostgreSQL..."
              required
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Years of Experience</label>
            <Input
              type="number"
              placeholder="e.g. 3"
              required
              max={50}
              value={jobExperience}
              onChange={(e) => setJobExperience(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
