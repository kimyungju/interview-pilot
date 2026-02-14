"use client";

import { UserButton } from "@clerk/nextjs";
import { Brain } from "lucide-react";
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <Brain className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold font-display tracking-tight">
          AI Mock Interview
        </span>
      </Link>
      <UserButton />
    </header>
  );
}
