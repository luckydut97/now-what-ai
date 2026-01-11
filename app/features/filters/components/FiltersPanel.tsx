import clsx from "clsx";
import {
  Filters,
  GroupOption,
  MoodOption,
  PeopleOption,
  AgeOption
} from "../../../lib/recommend";

type FilterKey = keyof Filters;

interface FilterItem<T extends string> {
  label: string;
  value: T;
  emoji?: string;
}

interface FilterConfig<T extends string> {
  key: FilterKey;
  title: string;
  options: FilterItem<T>[];
}

interface FiltersProps {
  filters: Filters;
  onChange: <T extends FilterKey>(key: T, value: Filters[T]) => void;
}

const filterConfigs: FilterConfig<string>[] = [
  {
    key: "people",
    title: "인원",
    options: [
      { label: "혼자", value: "혼자" as PeopleOption, emoji: "👤" },
      { label: "둘", value: "둘" as PeopleOption, emoji: "👥" },
      { label: "3-4", value: "3-4" as PeopleOption, emoji: "👨‍👩‍👧" },
      { label: "5-9", value: "5-9" as PeopleOption, emoji: "👨‍👩‍👧‍👦" },
      { label: "10+", value: "10+" as PeopleOption, emoji: "🎉" }
    ]
  },
  {
    key: "group",
    title: "구성",
    options: [
      { label: "남자", value: "남자" as GroupOption, emoji: "🧍‍♂️" },
      { label: "여자", value: "여자" as GroupOption, emoji: "🧍‍♀️" },
      { label: "남자단체", value: "남자단체" as GroupOption, emoji: "👬" },
      { label: "여자단체", value: "여자단체" as GroupOption, emoji: "👭" },
      { label: "가족", value: "가족" as GroupOption, emoji: "🏡" }
    ]
  },
  {
    key: "age",
    title: "연령대",
    options: [
      { label: "10", value: "10" as AgeOption },
      { label: "20", value: "20" as AgeOption },
      { label: "30", value: "30" as AgeOption },
      { label: "40", value: "40" as AgeOption },
      { label: "50+", value: "50+" as AgeOption }
    ]
  },
  {
    key: "mood",
    title: "분위기",
    options: [
      { label: "릴랙스", value: "릴랙스" as MoodOption, emoji: "🧘" },
      { label: "라이트", value: "라이트" as MoodOption, emoji: "🙂" },
      { label: "에너지", value: "에너지" as MoodOption, emoji: "🔥" },
      { label: "창의", value: "창의" as MoodOption, emoji: "🎨" },
      { label: "액티브", value: "액티브" as MoodOption, emoji: "🚀" }
    ]
  }
];

export function FiltersPanel({ filters, onChange }: FiltersProps) {
  return (
    <section className="w-full rounded-3xl bg-white p-4 text-left shadow-lg shadow-slate-900/5 ring-1 ring-black/5">
      <div className="grid gap-4">
        {filterConfigs.map(({ key, title, options }) => (
          <div key={key}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {title}
            </p>
            <div
              className={clsx(
                "grid gap-1.5 text-sm",
                options.length >= 5 ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4 md:grid-cols-5"
              )}
            >
              {options.map(({ label, value, emoji }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filters[key] === value}
                  onClick={() => onChange(key, value as Filters[typeof key])}
                  className={clsx(
                    "rounded-2xl border px-3 py-2 text-center font-semibold transition",
                    filters[key] === value
                      ? "border-transparent bg-slate-900 text-white shadow-md"
                      : "border-slate-200 bg-white/60 text-slate-700 hover:border-slate-400"
                  )}
                >
                  <span className="flex items-center justify-center gap-2 text-sm">
                    {emoji && <span aria-hidden="true">{emoji}</span>}
                    <span>{label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
