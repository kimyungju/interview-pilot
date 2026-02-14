"use client";

import { UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Brain, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <Link href="/" className="flex items-center gap-2.5">
        <Brain className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold font-display tracking-tight">
          AI Mock Interview
        </span>
      </Link>
      <div className="flex items-center gap-3">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        )}
        <UserButton />
      </div>
    </header>
  );
}
