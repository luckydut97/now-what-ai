export type MoodOption = "릴랙스" | "라이트" | "에너지" | "창의" | "액티브";
export type PeopleOption = "혼자" | "둘" | "3-4" | "5-9" | "10+";
type StoredPeopleOption = PeopleOption | "5+" | "가족";
export type GroupOption = "남자" | "여자" | "남자단체" | "여자단체" | "가족";
type StoredGroupOption = "남" | "여" | "섞임" | "가족";
export type AgeOption = "10" | "20" | "30" | "40" | "50+";

type LegacyMoodOption = "조용" | "적당" | "신남" | "집" | "밖";

export interface Filters {
  people: PeopleOption;
  group: GroupOption;
  age: AgeOption;
  mood: MoodOption;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  time: string;
  budget: string;
  people: StoredPeopleOption;
  group: StoredGroupOption;
  age: AgeOption | "40" | "30" | "20" | "10";
  mood: LegacyMoodOption;
  energy: "low" | "mid" | "high";
  place: "home" | "outdoor" | "indoor";
  repeatable: boolean;
  season: string[];
  alcohol: boolean;
  tips?: string;
}

export const DEFAULT_FILTERS: Filters = {
  people: "둘",
  group: "남자단체",
  age: "20",
  mood: "라이트"
};

export function filterIdeas(ideas: Idea[], filters: Filters): Idea[] {
  return ideas.filter((idea) => {
    const matchesPeople = matchPeople(idea, filters.people);
    const matchesGroup = matchGroup(idea, filters.group);
    const matchesAge =
      idea.age === filters.age ||
      (filters.age === "40" && idea.age === "50+") ||
      (filters.age === "50+" && (idea.age === "40" || idea.age === "50+"));

    const matchesMood = matchMood(idea, filters.mood);

    return matchesPeople && matchesGroup && matchesAge && matchesMood;
  });
}

export function getRandomIdea(ideas: Idea[]): Idea | null {
  if (!ideas.length) return null;
  const index = Math.floor(Math.random() * ideas.length);
  return ideas[index] ?? null;
}

function matchPeople(idea: Idea, filter: PeopleOption): boolean {
  switch (filter) {
    case "혼자":
      return idea.people === "혼자";
    case "둘":
      return idea.people === "둘";
    case "3-4":
      return idea.people === "3-4";
    case "5-9":
      return idea.people === "5-9" || idea.people === "5+";
    case "10+":
      return idea.people === "10+" || idea.people === "5+" || idea.people === "가족";
    default:
      return false;
  }
}

function matchGroup(idea: Idea, filter: GroupOption): boolean {
  // Legacy 데이터 구조를 최대한 활용하기 위해 새 필터 값을 기존 group/people 조합에 매핑한다.
  if (filter === "가족") {
    return idea.group === "가족";
  }

  const isSolo = idea.people === "혼자";
  if (filter === "남자") {
    return isSolo && (idea.group === "남" || idea.group === "섞임");
  }
  if (filter === "여자") {
    return isSolo && (idea.group === "여" || idea.group === "섞임");
  }
  if (filter === "남자단체") {
    return !isSolo && (idea.group === "남" || idea.group === "섞임");
  }
  if (filter === "여자단체") {
    return !isSolo && (idea.group === "여" || idea.group === "섞임");
  }
  return false;
}

function matchMood(idea: Idea, filter: MoodOption): boolean {
  switch (filter) {
    case "릴랙스":
      return idea.mood === "조용" || idea.place === "home";
    case "라이트":
      return idea.mood === "적당" || idea.mood === "집";
    case "에너지":
      return idea.mood === "신남" || idea.energy === "high";
    case "창의":
      return idea.place === "indoor" || idea.repeatable === false;
    case "액티브":
      return idea.place === "outdoor" || idea.mood === "밖";
    default:
      return true;
  }
}
