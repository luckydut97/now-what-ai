import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { Filters, Idea, filterIdeas } from "@/app/lib/recommend";
import ideasData from "@/public/data/ideas.json";

const PEOPLE_OPTIONS = ["혼자", "둘", "3-4", "5-9", "10+"] as const;
const GROUP_OPTIONS = ["남자", "여자", "남자단체", "여자단체", "가족"] as const;
const AGE_OPTIONS = ["10", "20", "30", "40", "50+"] as const;
const MOOD_OPTIONS = ["릴랙스", "라이트", "에너지", "창의", "액티브"] as const;
const LEGACY_MOOD_OPTIONS = ["조용", "적당", "신남", "집", "밖"] as const;

type IdeaPeopleOption = Idea["people"];

const filtersSchema = z.object({
  people: z.enum(PEOPLE_OPTIONS),
  group: z.enum(GROUP_OPTIONS),
  age: z.enum(AGE_OPTIONS),
  mood: z.enum(MOOD_OPTIONS)
}) satisfies z.ZodType<Filters>;

const ideaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  time: z.string().min(1),
  budget: z.string().min(1),
  people: z.enum(["혼자", "둘", "3-4", "5-9", "10+", "5+", "가족"]),
  group: z.enum(["남", "여", "섞임", "가족"]),
  age: z.enum(["10", "20", "30", "40", "50+"]),
  mood: z.enum(LEGACY_MOOD_OPTIONS),
  energy: z.enum(["low", "mid", "high"]),
  place: z.enum(["home", "indoor", "outdoor"]),
  repeatable: z.boolean(),
  season: z.array(z.string()).default(["all"]),
  alcohol: z.boolean(),
  tips: z.string().optional()
}) satisfies z.ZodType<Idea>;

const responseSchema = z.object({
  ideas: z.array(ideaSchema).min(1),
  statusMessage: z.string().optional()
});

const SYSTEM_PROMPT = `
너는 한국어로 답변하는 액티비티 추천 도우미야.
항상 5개의 액티비티를 추천하고 JSON 객체로만 응답해.
각 액티비티는 아래 필드가 모두 있어야 해:
- id: 영문 소문자와 하이픈 조합 권장
- title: 15자 내외의 간결한 제목
- description: 1~2문장으로 행동을 상세히 설명
- time: 예) "1-2시간", "30분"
- budget: 예산 범위와 통화 단위를 포함
- people: ["혼자","둘","3-4","5-9","10+","5+","가족"] 중 하나
- group: ["남","여","섞임","가족"] 중 하나
- age: ["10","20","30","40","50+"] 중 하나
- mood: ["조용","적당","신남","집","밖"] 중 하나
- energy: ["low","mid","high"] 중 하나
- place: ["home","indoor","outdoor"] 중 하나
- repeatable: true/false
- season: ["all"] 또는 계절 문자열 배열
- alcohol: true/false
- tips: 선택적 조언 1문장
budget, description, tips은 자연스러운 한국어 표현을 써.
`.trim();

function buildFallbackResponse(filters: Filters) {
  const curatedIdeas = ideasData as Idea[];
  const filtered = filterIdeas(curatedIdeas, filters);
  if (!filtered.length) {
    return {
      ideas: curatedIdeas.slice(0, 5),
      statusMessage: "AI 연결에 문제가 있어 기본 추천을 보여드려요."
    };
  }
  const shuffled = [...filtered];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return {
    ideas: shuffled.slice(0, 5),
    statusMessage: "AI 연결에 문제가 있어 기존 추천을 보여드려요."
  };
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  let filters: Filters;
  try {
    const payload = await request.json();
    filters = filtersSchema.parse(payload.filters ?? payload);
  } catch (error) {
    console.error("[recommend_api] invalid request", error);
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    const completion = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `
선호 조건:
- 인원: ${filters.people}
- 구성: ${filters.group}
- 연령대: ${filters.age}
- 분위기: ${filters.mood}

위 조건에 맞는 5개의 한국어 액티비티 아이디어를 JSON 객체로 반환해.
응답 형태는 {"ideas":[...], "statusMessage":"..."} 이고, statusMessage는 사용자에게 보여줄 한 줄 요약이야.
`.trim()
        }
      ],
      temperature: 0.7
    });

    const responseText = completion.output
      ?.map((item) => {
        if ("content" in item && Array.isArray(item.content)) {
          return item.content
            .map((chunk) => ("text" in chunk ? chunk.text ?? "" : ""))
            .join("");
        }
        if ("output_text" in item && Array.isArray(item.output_text)) {
          return item.output_text.join("");
        }
        return "";
      })
      .join("") ?? "";

    const textOutput =
      responseText ||
      (Array.isArray(completion.output_text) ? completion.output_text.join("") : "") ||
      "";

    if (!textOutput) {
      throw new Error("LLM 응답이 비어 있습니다.");
    }

    const sanitizedOutput = textOutput.replace(/```json|```/gi, "").trim();
    const normalizedPayload = normalizeLLMResponse(sanitizedOutput, filters);
    const parsed = responseSchema.safeParse(normalizedPayload);
    if (!parsed.success) {
      console.error("[recommend_api] invalid response", parsed.error);
      return NextResponse.json(buildFallbackResponse(filters));
    }

    return NextResponse.json(parsed.data satisfies { ideas: Idea[]; statusMessage?: string });
  } catch (error) {
    console.error("[recommend_api] failed", error);
    const fallback = buildFallbackResponse(filters);
    return NextResponse.json(fallback, { status: 200 });
  }
}

function normalizeLLMResponse(payload: string, filters: Filters) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { ideas: [] as Idea[], statusMessage: undefined };
  }

  const ctx = {
    fallbackPeople: (filters.people ?? "둘") as IdeaPeopleOption,
    fallbackGroup: deriveGroupFromFilter(filters.group),
    fallbackAge: (filters.age ?? "20") as Idea["age"],
    fallbackMood: deriveMoodFromFilter(filters.mood)
  };

  const ideas = Array.isArray((parsed as { ideas?: unknown })?.ideas)
    ? ((parsed as { ideas?: unknown })?.ideas as unknown[]).slice(0, 10).map((idea, index) =>
        normalizeIdeaRecord(idea, index, ctx)
      )
    : [];

  return {
    ideas,
    statusMessage:
      typeof (parsed as { statusMessage?: unknown })?.statusMessage === "string"
        ? ((parsed as { statusMessage?: string }).statusMessage ?? undefined)
        : undefined
  };
}

interface NormalizationContext {
  fallbackPeople: IdeaPeopleOption;
  fallbackGroup: Idea["group"];
  fallbackAge: Idea["age"];
  fallbackMood: Idea["mood"];
}

function normalizeIdeaRecord(raw: unknown, index: number, ctx: NormalizationContext): Idea {
  const record = (typeof raw === "object" && raw) || {};
  const baseId = `idea-${index + 1}`;
  return {
    id: ensureString((record as { id?: unknown }).id, baseId),
    title: ensureString((record as { title?: unknown }).title, `추천 ${index + 1}`),
    description: ensureString(
      (record as { description?: unknown }).description,
      "추천 설명을 불러오지 못했어요."
    ),
    time: ensureString((record as { time?: unknown }).time, "1-2시간"),
    budget: ensureString((record as { budget?: unknown }).budget, "예산 정보 없음"),
    people: normalizePeople((record as { people?: unknown }).people, ctx.fallbackPeople),
    group: normalizeGroup((record as { group?: unknown }).group, ctx.fallbackGroup),
    age: normalizeAge((record as { age?: unknown }).age, ctx.fallbackAge),
    mood: normalizeMood((record as { mood?: unknown }).mood, ctx.fallbackMood),
    energy: normalizeEnergy((record as { energy?: unknown }).energy),
    place: normalizePlace((record as { place?: unknown }).place),
    repeatable: ensureBoolean((record as { repeatable?: unknown }).repeatable, true),
    season: ensureStringArray((record as { season?: unknown }).season, ["all"]),
    alcohol: ensureBoolean((record as { alcohol?: unknown }).alcohol, false),
    tips: typeof (record as { tips?: unknown }).tips === "string" ? (record as { tips?: string }).tips : undefined
  };
}

function ensureString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length ? value.trim() : fallback;
}

function ensureBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function ensureStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "")))
      .filter((item) => item.length);
    if (cleaned.length) return cleaned;
  }
  return fallback;
}

function normalizePeople(value: unknown, fallback: IdeaPeopleOption): IdeaPeopleOption {
  const raw = normalizeToken(value);
  if (!raw) return fallback;
  if (matches(raw, ["혼자", "solo", "1명", "1인", "single"])) return "혼자";
  if (matches(raw, ["둘", "2명", "couple", "커플", "2인"])) return "둘";
  if (matches(raw, ["3-4", "3명", "4명", "34", "소규모", "trio", "quad"])) return "3-4";
  if (matches(raw, ["5-9", "5명", "6명", "7명", "8명", "9명", "여러명", "다수", "smallgroup"])) return "5-9";
  if (matches(raw, ["10", "10+", "단체", "대규모", "largegroup"])) return "10+";
  if (matches(raw, ["5+", "5이상"])) return "5+";
  if (matches(raw, ["가족", "family", "패밀리"])) return "가족";
  return fallback;
}

function normalizeGroup(value: unknown, fallback: Idea["group"]): Idea["group"] {
  const raw = normalizeToken(value);
  if (!raw) return fallback;
  if (matches(raw, ["가족", "family"])) return "가족";
  if (matches(raw, ["여", "여자", "female", "ladies"])) return "여";
  if (matches(raw, ["남", "남자", "male", "guy"])) return "남";
  if (matches(raw, ["섞", "혼성", "mixed", "모두"])) return "섞임";
  return fallback;
}

function normalizeAge(value: unknown, fallback: Idea["age"]): Idea["age"] {
  const raw = normalizeToken(value);
  if (!raw) return fallback;
  if (/\b1\d\b/.test(raw) || matches(raw, ["10대", "teen"])) return "10";
  if (/\b2\d\b/.test(raw) || matches(raw, ["20대"])) return "20";
  if (/\b3\d\b/.test(raw) || matches(raw, ["30대"])) return "30";
  if (/\b4\d\b/.test(raw) || matches(raw, ["40대"])) return "40";
  if (/\b5\d\b/.test(raw) || matches(raw, ["50대", "중장년", "50+"])) return "50+";
  return fallback;
}

function normalizeMood(value: unknown, fallback: Idea["mood"]): Idea["mood"] {
  const raw = normalizeToken(value);
  if (!raw) return fallback;
  if (matches(raw, ["조용", "릴랙스", "힐링", "차분"])) return "조용";
  if (matches(raw, ["적당", "라이트", "가벼운", "casual"])) return "적당";
  if (matches(raw, ["신남", "에너지", "활동적", "exciting"])) return "신남";
  if (matches(raw, ["집", "창의", "creative", "실내놀이"])) return "집";
  if (matches(raw, ["밖", "액티브", "outdoor", "야외"])) return "밖";
  return fallback;
}

function normalizeEnergy(value: unknown): Idea["energy"] {
  const raw = normalizeToken(value);
  if (!raw) return "mid";
  if (matches(raw, ["low", "낮", "차분", "relax"])) return "low";
  if (matches(raw, ["high", "강", "활발", "dynamic"])) return "high";
  return "mid";
}

function normalizePlace(value: unknown): Idea["place"] {
  const raw = normalizeToken(value);
  if (!raw) return "indoor";
  if (matches(raw, ["home", "집", "숙소"])) return "home";
  if (matches(raw, ["outdoor", "야외", "밖", "공원"])) return "outdoor";
  return "indoor";
}

function normalizeToken(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function matches(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

function deriveGroupFromFilter(value: Filters["group"]): Idea["group"] {
  if (value === "가족") return "가족";
  if (value === "여자" || value === "여자단체") return "여";
  if (value === "남자" || value === "남자단체") return "남";
  return "섞임";
}

function deriveMoodFromFilter(value: Filters["mood"]): Idea["mood"] {
  switch (value) {
    case "릴랙스":
      return "조용";
    case "라이트":
      return "적당";
    case "에너지":
      return "신남";
    case "창의":
      return "집";
    case "액티브":
      return "밖";
    default:
      return "적당";
  }
}
