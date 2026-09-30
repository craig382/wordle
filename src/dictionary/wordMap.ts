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
export type WordMap = Record<string, StructuredEntry>;

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

/** lookup(word) returns the word's StructuredEntry 
 * includes the word's: "enprs" (English pronunciations),
 * and pos (parts of speech) and defs (definitions for each
 * part of speech).
 */
export function lookup(word: string): StructuredEntry | undefined {
	return wordMap.get(word.toLowerCase());
}