import { Idea } from "../../lib/recommend";

export const pickRandomIdeas = (source: Idea[], count: number) => {
  if (!source.length) return [];
  const pool = [...source];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
};
