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

    const parsed = responseSchema.safeParse(JSON.parse(textOutput));
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
