"use client";

import { useCallback, useState } from "react";
import { FiltersPanel } from "./features/filters/components/FiltersPanel";
import { RecommendationList, useRecommendations } from "./features/recommendations";
import { DEFAULT_FILTERS, Filters } from "./lib/recommend";

export default function Home() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const {
    recommendations,
    statusMessage,
    isLoading,
    emptyMessage,
    runShuffle,
    canShuffle,
    handleFiltersChange
  } = useRecommendations(filters);

  const handleFilterChange = useCallback(
    <T extends keyof Filters>(key: T, value: Filters[T]) => {
      setFilters((prev) => {
        if (prev[key] === value) return prev;
        handleFiltersChange();
        return { ...prev, [key]: value };
      });
    },
    [handleFiltersChange]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50 px-4 py-6 text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 text-center pb-10">
        <header className="w-full rounded-3xl border border-white/60 bg-white/85 p-5 shadow-lg shadow-rose-200/40 backdrop-blur">
          <h1 className="text-3xl font-black text-slate-950">지금 뭐할까?</h1>
          <p className="mt-1 text-sm text-slate-500">인원 · 분위기만 고르고 랜덤 버튼 터치</p>
          <button
            type="button"
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 py-3 text-base font-bold text-white shadow-lg shadow-rose-400/40 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={runShuffle}
            disabled={isLoading || !canShuffle}
          >
            {isLoading ? "추천 계산 중…" : "랜덤 추천 실행"}
          </button>
        </header>

        <FiltersPanel filters={filters} onChange={handleFilterChange} />

        <RecommendationList
          ideas={recommendations}
          statusMessage={statusMessage}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
        />
      </main>
    </div>
  );
}
