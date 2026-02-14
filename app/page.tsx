import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-secondary">
      <div className="text-center max-w-2xl px-4">
        <div className="flex justify-center mb-6">
          <Brain className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          AI Mock Interview
        </h1>
        <p className="text-xl text-muted-foreground mt-4">
          Practice job interviews with AI-generated questions tailored to your
          role. Get real-time feedback and improve your answers.
        </p>
        <div className="mt-8">
          <Link href="/dashboard">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
