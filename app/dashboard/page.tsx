"use client";

import { useEffect, useState, useMemo } from "react";
import AddNewInterview from "./_components/AddNewInterview";
import InterviewCard from "./_components/InterviewCard";
import InterviewFilters from "./_components/InterviewFilters";
import { getInterviewList } from "@/app/actions/interview";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Search } from "lucide-react";

interface Interview {
  id: number;
  mockId: string;
  jobPosition: string;
  jobExperience: string;
  createdAt: string | null;
  interviewType: string | null;
  difficulty: string | null;
}

export default function DashboardPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  function loadInterviews() {
    getInterviewList()
      .then(setInterviews)
      .catch((err) => console.error("Failed to load interviews:", err));
  }

  useEffect(() => {
    loadInterviews();
  }, []);

  const filteredInterviews = useMemo(() => {
    let result = [...interviews];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.jobPosition.toLowerCase().includes(q));
    }
    if (selectedType !== "all") {
      result = result.filter((i) => i.interviewType === selectedType);
    }
    if (selectedDifficulty !== "all") {
      result = result.filter((i) => i.difficulty === selectedDifficulty);
    }
    result.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return result;
  }, [interviews, searchQuery, selectedType, selectedDifficulty, sortOrder]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedType !== "all" ||
    selectedDifficulty !== "all" ||
    sortOrder !== "newest";

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedType("all");
    setSelectedDifficulty("all");
    setSortOrder("newest");
  };

  return (
    <div className="py-12">
      <div className="mb-8">
        <h2 data-testid="dashboard-title" className="font-bold text-3xl font-display tracking-tight">
          {t("dashboard.title")}
        </h2>
        <p className="text-muted-foreground mt-1.5">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {interviews.length > 0 && (
        <div className="mb-6">
          <InterviewFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            selectedDifficulty={selectedDifficulty}
            onDifficultyChange={setSelectedDifficulty}
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      )}

      <div data-testid="interview-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AddNewInterview />
        {filteredInterviews.map((interview) => (
          <InterviewCard
            key={interview.id}
            mockId={interview.mockId}
            jobPosition={interview.jobPosition}
            jobExperience={interview.jobExperience}
            createdAt={interview.createdAt}
            interviewType={interview.interviewType}
            difficulty={interview.difficulty}
            onDeleted={loadInterviews}
          />
        ))}
      </div>

      {filteredInterviews.length === 0 && interviews.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">{t("dashboard.noResults")}</h3>
          <p className="text-muted-foreground text-sm">{t("dashboard.noResultsHint")}</p>
        </div>
      )}
    </div>
  );
}
