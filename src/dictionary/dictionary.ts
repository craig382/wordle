// src/lib/dictionary.ts
import raw from '$lib/data/wikt.jsonl?raw';   // Vite/SvelteKit raw import

type Sense = { glosses: string[]; tags?: string[]; examples?: string[] };
type Entry = {
  word: string; pos: string;
  senses: Sense[];
  sounds?: { ipa?: string; audio?: string; tags?: string[] }[];
  etymology?: string;
};

const map = new Map<string, Entry[]>();
for (const line of raw.split('\n')) {
  if (!line.trim()) continue;
  const e: Entry = JSON.parse(line);
  const arr = map.get(e.word) ?? [];
  arr.push(e);                       // one entry per part of speech
  map.set(e.word, arr);
}

export function lookup(word: string): Entry[] {
  return map.get(word.toLowerCase()) ?? [];
}

export function tree(word: string) {
  const entries = lookup(word);
  return {
    word,
    pronunciations: [...new Set(entries.flatMap(e => e.sounds?.map(s => s.ipa).filter(Boolean)))],
    partsOfSpeech: entries.map(e => ({
      pos: e.pos,
      definitions: e.senses.map(s => s.glosses.join('; ')),
    })),
  };
}