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
import { Loader, Plus } from "lucide-react";
import { createInterview } from "@/app/actions/interview";

export default function AddNewInterview() {
  const [open, setOpen] = useState(false);
  const [jobPosition, setJobPosition] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobExperience, setJobExperience] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const { mockId } = await createInterview(
        jobPosition,
        jobDesc,
        jobExperience
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
        <div className="group flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-accent/30 hover:bg-accent/60 cursor-pointer transition-all duration-300">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
            New Interview
          </span>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">
            Tell us about your interview
          </DialogTitle>
          <DialogDescription>
            Add details about the job position, description, and experience.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div>
            <label htmlFor="jobPosition" className="block text-sm font-medium mb-1.5">Job Position</label>
            <Input
              id="jobPosition"
              placeholder="e.g. Full Stack Developer"
              required
              value={jobPosition}
              onChange={(e) => setJobPosition(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="jobDesc" className="block text-sm font-medium mb-1.5">Job Description / Tech Stack</label>
            <Textarea
              id="jobDesc"
              placeholder="e.g. React, Node.js, PostgreSQL..."
              required
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="jobExperience" className="block text-sm font-medium mb-1.5">Years of Experience</label>
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
          <div className="flex gap-3 justify-end pt-2">
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
