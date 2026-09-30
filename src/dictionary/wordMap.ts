export type PrunedEntry = {
	word: string;
	enprs?: string[];
	pos: string;
	defs: string[];
};

/** maps part of speech pos to the defs array */
export type PosMap = Map<string, string[]>;

export type StructuredEntry = {
	enprs?: string[];
	posMap: PosMap;
}

/** maps word to StructuredEntry */
export type WordMap = Map<string, StructuredEntry>;

// The shape of wordMap.json as it exists on disk (plain JSON, no Maps)
type PlainStructuredEntry = {
	enprs?: string[];
	posMap: Record<string, string[]>;
};

// Vite handles JSON imports natively — no node:fs needed
import raw from './wordMap.json';

const plain = raw as Record<string, PlainStructuredEntry>;

export const wordMap: WordMap = new Map(
	Object.entries(plain).map(([word, se]) => [
		word,
		{
			enprs: se.enprs,
			posMap: new Map(Object.entries(se.posMap)),
		},
	])
);

export function lookup(word: string): StructuredEntry | undefined {
	return wordMap.get(word.toLowerCase());
}