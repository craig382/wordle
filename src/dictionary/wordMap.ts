/** maps part of speech pos to the defs array */
export type PosMap = Record<string, string[]>;

export type WordEntry = {
	enprs?: string[];
	pMap: PosMap;
}

/** maps word to WordEntry */
export type WordMap = Record<string, WordEntry>;

// var wordMap: WordMap = {};
// If "./wordMap.json" does not exist, comment out 
// the line below and uncomment the line above.
// For normal running, comment out the line 
// above and uncomment the line below.
import wordMap from './wordMap.json';

/** lookup(word) returns the word's StructuredEntry 
 * includes the word's: "enprs" (English pronunciations),
 * and pos (parts of speech) and defs (definitions for each
 * part of speech).
 */
export function lookup(word: string): WordEntry | undefined {
	return wordMap[word.toLowerCase()];
}