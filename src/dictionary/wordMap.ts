import type { WordEntry, WordMap } from '../types';

import wordMapJson from './wordMap.json';

export const wordMap = wordMapJson as WordMap;

console.log(wordMap);

/** lookup(word) returns the word's WordEntry that 
 * has the word's: enprs (English pronunciations),
 * and posM (parts of speech map) with defs 
 * (definitions for each part of speech). */
export function lookup(word: string): WordEntry | undefined {
	return wordMap[word.toLowerCase()];
}