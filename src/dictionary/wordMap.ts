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

var wordMap: WordMap = {};

// import wordMap from './wordMap.json';

/** lookup(word) returns the word's StructuredEntry 
 * includes the word's: "enprs" (English pronunciations),
 * and pos (parts of speech) and defs (definitions for each
 * part of speech).
 */
export function lookup(word: string): StructuredEntry | undefined {
	return wordMap[word.toLowerCase()];
}