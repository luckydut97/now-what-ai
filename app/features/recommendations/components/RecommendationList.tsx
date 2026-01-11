import clsx from "clsx";
import { Idea } from "../../../lib/recommend";

interface RecommendationListProps {
  ideas: Idea[];
  statusMessage: string;
  isLoading: boolean;
  emptyMessage?: string;
}

export function RecommendationList({
  ideas,
  statusMessage,
  isLoading,
  emptyMessage
}: RecommendationListProps) {
  const showEmpty = !isLoading && !ideas.length;

  return (
    <section className="w-full rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-lg">
      <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-400">
        오늘의 결정
      </p>
      <div className="my-4 rounded-2xl bg-slate-900 px-5 py-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          상태 업데이트
        </p>
        <p
          className={clsx(
            "mt-2 text-2xl font-black leading-snug transition duration-700 ease-out",
            isLoading ? "animate-pulse" : "text-emerald-200"
          )}
        >
          {statusMessage}
        </p>
      </div>

      {showEmpty ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          {emptyMessage ?? "조건에 맞는 추천이 없어요. 필터를 조정해 보세요."}
        </div>
      ) : (
        !!ideas.length && (
          <div className="space-y-4">
            {ideas.map((idea) => (
              <article key={idea.id} className="rounded-2xl border border-slate-100 p-4 text-left shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">{idea.title}</h3>
                <p className="mt-1 text-base text-slate-700">{idea.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium">
                    ⏱ {idea.time}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium">
                    💰 {idea.budget}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium">
                    ⚡️ {idea.energy.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium">
                    📍 {idea.place === "home" ? "집" : idea.place === "indoor" ? "실내" : "야외"}
                  </span>
                </div>
                {idea.tips && (
                  <p className="mt-3 text-sm text-slate-500">
                    <span className="font-semibold text-slate-800">TIP</span> {idea.tips}
                  </p>
                )}
              </article>
            ))}
          </div>
        )
      )}
    </section>
  );
}
