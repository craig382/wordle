// src/lib/dictionary.ts

// Vite/SvelteKit raw import
import raw from './kaikki.org.dictionary.pruned.jsonl?raw';

type Sense = { 
	qualifier?: string;
	glosses: string[];
	examples?: string[]
};

type Sound = {
		enpr?: string;
		ipa?: string;
		tags?: string[]
};

type PrunedEntry = {
	word: string; 
	pos: string;
	sounds?: Sound[];
	senses: Sense[];
};

/** maps part of speech pos to a senses array */
type PosMap = Map<string, Sense[]>;

type StructuredEntry = {
	sounds?: Sound[];
	posMap: PosMap;
}

/** maps word to PosMap */
type WordMap = Map<string, StructuredEntry>;

export const wordMap : WordMap = new Map<string, StructuredEntry>();

for (const line of raw.split('\n')) {
	if (!line.trim()) continue;
	const pe: PrunedEntry = JSON.parse(line);
	var se: StructuredEntry = wordMap.get(pe.word) ||
		{ sounds: pe.sounds, posMap: new Map<string, Sense[]>() };
	// if (!se) {
	// 	se.sounds = pe.sounds;
	// 	// se.posMap = new Map<string, Sense[]>([ [pe.pos, pe.senses] ]);
	// }
	se.posMap.set(pe.pos, pe.senses);
	wordMap.set(pe.word, se);
}
console.log(`dictionary map:`, wordMap);

export function lookup(word: string): StructuredEntry {
	return wordMap.get(word.toLowerCase());
}
