import { useCallback, useEffect, useRef, useState } from "react";
import { Filters, Idea } from "../../../lib/recommend";
import { SHUFFLE_PHRASES } from "../constants";

interface UseRecommendationsResult {
  recommendations: Idea[];
  statusMessage: string;
  isLoading: boolean;
  emptyMessage?: string;
  runShuffle: () => void;
  canShuffle: boolean;
  handleFiltersChange: () => void;
}

export function useRecommendations(filters: Filters): UseRecommendationsResult {
  const [recommendations, setRecommendations] = useState<Idea[]>([]);
  const [statusMessage, setStatusMessage] = useState("랜덤 추천을 실행해 보세요.");
  const [isLoading, setIsLoading] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState<string>();
  const tickerRef = useRef<NodeJS.Timeout>();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const abortRef = useRef<AbortController>();

  const handleFiltersChange = useCallback(() => {
    setRecommendations([]);
    setEmptyMessage(undefined);
    setStatusMessage("필터를 바꿨어요. 다시 랜덤 추천을 실행해 주세요.");
    setIsLoading(false);
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = undefined;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const runShuffle = useCallback(() => {
    if (isLoading) return;
    setIsLoading(true);
    setEmptyMessage(undefined);
    let ticks = 0;
    tickerRef.current = setInterval(() => {
      ticks += 1;
      const temp = SHUFFLE_PHRASES[Math.floor(Math.random() * SHUFFLE_PHRASES.length)];
      setStatusMessage(temp);
      if (ticks > 15 && tickerRef.current) {
        clearInterval(tickerRef.current);
      }
    }, 160);

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = undefined;
      abortRef.current = new AbortController();
      fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
        signal: abortRef.current.signal
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`status_${res.status}`);
          }
          const data = (await res.json()) as { ideas: Idea[]; statusMessage?: string };
          const nextRecommendations = data.ideas ?? [];
          setRecommendations(nextRecommendations);
          setStatusMessage(
            data.statusMessage ?? (nextRecommendations.length ? "추천 5개가 준비됐어요." : "추천할 데이터가 없어요.")
          );
          if (!nextRecommendations.length) {
            setEmptyMessage("필터를 조정해 새로운 추천을 받아보세요.");
          }
        })
        .catch((error) => {
          if (error.name === "AbortError") return;
          console.error("[useRecommendations] AI 요청 실패", error);
          setEmptyMessage("AI 추천 호출에 실패했어요. 잠시 후 다시 시도해 주세요.");
          setRecommendations([]);
          setStatusMessage("추천 서비스를 사용할 수 없어요.");
        })
        .finally(() => {
          if (tickerRef.current) clearInterval(tickerRef.current);
          abortRef.current = undefined;
          setIsLoading(false);
        });
    }, 2200);
  }, [filters, isLoading]);

  return {
    recommendations,
    statusMessage,
    isLoading,
    emptyMessage,
    runShuffle,
    canShuffle: true,
    handleFiltersChange
  };
}
