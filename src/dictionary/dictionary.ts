// src/lib/dictionary.ts

// Vite/SvelteKit raw import
import raw from './kaikki.org.dictionary.pruned.jsonl?raw';

type PrunedEntry = {
	word: string;
	enprs?: string[];
	pos: string;
	defs: string[];
};

/** maps part of speech pos to the defs array */
type PosMap = Map<string, string[]>;

type StructuredEntry = {
	enprs?: string[];
	posMap: PosMap;
}

/** maps word to StructuredEntry */
type WordMap = Map<string, StructuredEntry>;

export const wordMap : WordMap = new Map<string, StructuredEntry>();

for (const line of raw.split('\n')) {
	if (!line.trim()) continue;
	const pe: PrunedEntry = JSON.parse(line);
	var se: StructuredEntry = wordMap.get(pe.word) ||
		{ enprs: pe.enprs, posMap: new Map<string, string[]>() };
	se.posMap.set(pe.pos, pe.defs);
	wordMap.set(pe.word, se);
}
console.log(`wordMap:`, wordMap);

export function lookup(word: string): StructuredEntry {
	return wordMap.get(word.toLowerCase());
}
