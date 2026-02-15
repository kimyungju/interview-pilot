"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Brain } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Home() {
  const { t } = useTranslation();

  const features = [
    { title: t("landing.feature1Title"), desc: t("landing.feature1Desc") },
    { title: t("landing.feature2Title"), desc: t("landing.feature2Desc") },
    { title: t("landing.feature3Title"), desc: t("landing.feature3Desc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-6">
        <div className="flex items-center gap-2.5">
          <Brain className="h-6 w-6 text-primary" />
          <span className="font-display text-lg">{t("landing.title")}</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/dashboard">
            <Button variant="outline" size="sm">{t("landing.signIn")}</Button>
          </Link>
        </div>
      </nav>

      <main className="px-6 md:px-12 lg:px-20 pt-20 md:pt-32 pb-24">
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-[0.2em] uppercase text-muted-foreground mb-6">
            {t("landing.subtitle")}
          </p>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.1] tracking-tight">
            {t("landing.heroTitle")}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
            {t("landing.heroDesc")}
          </p>
          <Link href="/dashboard" className="inline-block mt-10">
            <Button size="lg" className="text-base px-7 py-5 rounded-lg">
              {t("landing.cta")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mt-28 pt-12 border-t border-border max-w-4xl">
          {features.map((f, i) => (
            <div key={i}>
              <span className="text-sm font-medium text-primary tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-xl mt-2 mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
