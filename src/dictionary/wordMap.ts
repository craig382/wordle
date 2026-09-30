export type PrunedEntry = {
	word: string;
	enprs?: string[];
	pos: string;
	defs: string[];
};

/** maps part of speech pos to the defs array */
export type PosMap = Record<string, string[]>;

export type StructuredEntry = {
	enprs?: string[];
	posMap: PosMap;
}

/** maps word to StructuredEntry */
export type WordMap = Map<string, StructuredEntry>;

// Vite handles JSON imports natively — no node:fs needed
import wordMap from './wordMap.json';

// const plain = raw as Record<string, StructuredEntry>;

// export const wordMap: WordMap = new Map(
// 	Object.entries(plain).map(([word, se]) => [
// 		word,
// 		{
// 			enprs: se.enprs,
// 			posMap: new Map(Object.entries(se.posMap)),
// 		},
// 	])
// );

export function lookup(word: string): StructuredEntry | undefined {
	return wordMap.get(word.toLowerCase());
}