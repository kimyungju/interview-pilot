"use client";

import { UserButton } from "@clerk/nextjs";
import { Brain } from "lucide-react";
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4 bg-secondary shadow-sm">
      <Link href="/dashboard" className="flex items-center gap-2">
        <Brain className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">AI Mock Interview</span>
      </Link>
      <UserButton />
    </header>
  );
}
