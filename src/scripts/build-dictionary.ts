import { createReadStream } from 'node:fs';
import { createWriteStream } from 'node:fs';
import * as readline from 'node:readline';
import * as zlib from 'node:zlib';

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

export function lookup(word: string): StructuredEntry {
	return wordMap.get(word.toLowerCase());
}

// DELETE following line. Placeholder for now.
const answers = new Set(['saint', 'crane', 'slate', /* ...your word list... */]);

const dictionaryDir = `src/dictionary`;

// pruneDictionary(); // run once then comment out

/** pruneDictionary() creates a *.pruned.jsonl 
 * dictionary file from a postprocessed  *.full.jsonl file downloaded
 * https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl 
 * 
 * To run pruneDictionary():
 * 1) uncomment pruneDictionary() in the line 
 *    above this comment block
 * 2) run the following in a terminal:
 * ```npx tsx src/dictionary/dictionary.ts```
 * 
 * 3) re-comment pruneDictionary() in the line above.
 * */
async function pruneDictionary() {
	const rl = readline.createInterface({
		input: createReadStream(`${dictionaryDir}/kaikki.org.dictionary.full.jsonl`),
		crlfDelay: Infinity,
	});

	const out = createWriteStream(`${dictionaryDir}/kaikki.org.dictionary.pruned.jsonl`);
	let nWrote = 0;
	let nRead = 0;

	for await (const line of rl) {
		const e = JSON.parse(line);
		nRead++;

		if (e.lang_code !== 'en') continue;

		// if (!answers.has(w)) continue;

		// Keep only the fields your UI actually renders
		const p: PrunedEntry = {
			word: e.word,
			enprs: (e.sounds || []).filter((s: any) => s.enpr)
				.map((s: any) => (s.enpr)),
			pos: e.pos,
			defs: (e.senses || [])
				.reduce((acc: string[], s: any) => acc.concat(s.glosses), []),
		};

		if (p.enprs.length === 0) delete p.enprs;

		const pStr = JSON.stringify(p);
		out.write(pStr + '\n');
		nWrote++;

		console.log(`word "${e.word}/${e.pos}", input line ${nRead } length: ${line.length}, output line ${nWrote} length ${pStr.length} `);

		if (nRead >= 500) break; // DELETE this line. For testing only.

	}

	out.end();
	console.log(`Read ${nRead} entries, wrote ${nWrote} entries`);
}

	// Vite/SvelteKit raw import
import raw from 'src/dictionar/kaikki.org.dictionary.pruned.jsonl?raw';
// uncomment import line above and build line below,
// then run once, then comment them both out again.
buildAndSaveWordMap();

/** buildAndSaveWordMap() builds the wordMap 
 * from a *.pruned.jsonl dictionary file
 * then saves it to the
 * kaikki.org.dictionary.wordle.json file.
 * 
 * To run buildAndSaveWordMap():
 * 1) if the *.pruned.jsonl file does not exist,
 *    see the pruneDictionary() function and its
 *    instructions above.
 * 2) uncomment buildAndSaveWordMap() in the line 
 *    above this comment block
 * 3) run the following in a terminal:
 * ```npx tsx src/dictionary/dictionary.ts```
 * 
 * 4) re-comment buildAndSaveWordMap() in the line above.
 * */
async function buildAndSaveWordMap() {
	for (const line of raw.split('\n')) {
		if (!line.trim()) continue;
		const pe: PrunedEntry = JSON.parse(line);
		var se: StructuredEntry = wordMap.get(pe.word) ||
			{ enprs: pe.enprs, posMap: new Map<string, string[]>() };
		se.posMap.set(pe.pos, pe.defs);
		wordMap.set(pe.word, se);
	}
	console.log(`wordMap:`, wordMap);
}