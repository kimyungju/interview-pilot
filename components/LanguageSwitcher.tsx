"use client";

import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "ko" : "en")}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label="Toggle language"
    >
      <Globe className="h-4 w-4" />
      <span>{language === "en" ? "EN" : "KR"}</span>
    </button>
  );
}
