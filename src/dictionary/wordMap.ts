import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
// import wordMap from './wordMap.json';
const __dirname = dirname(fileURLToPath(import.meta.url));
const MAP = join(__dirname, 'wordMap.json');
let wordMap: WordMap = {};
wordMap = JSON.parse(fs.readFileSync(MAP, 'utf-8')) as WordMap;

console.log(wordMap);

/** lookup(word) returns the word's StructuredEntry 
 * includes the word's: "enprs" (English pronunciations),
 * and pos (parts of speech) and defs (definitions for each
 * part of speech).
 */
export function lookup(word: string): WordEntry | undefined {
	return wordMap[word.toLowerCase()];
}