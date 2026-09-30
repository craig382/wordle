import { readFileSync, writeFileSync, createReadStream, 
	createWriteStream } from 'node:fs';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deDupe } from '../utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FULL   = join(__dirname, 'kaikki.org.dictionary.full.jsonl');
const PRUNED = join(__dirname, 'kaikki.org.dictionary.pruned.jsonl');
const MAP    = join(__dirname, 'wordMap.json');

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

export var wordMap : WordMap = new Map<string, StructuredEntry>();

try {
	// import wordMap from './wordMap.json';
	// Vite/SvelteKit raw import
	const plainRaw = readFileSync(MAP, 'utf-8');
	// const plainRawObj: PlainMap = JSON.parse(plainRaw);
	const plainRawObj = JSON.parse(plainRaw);
	// wordMap = plainToMap(plainRawObj);
	console.log(`Imported wordMap from ${MAP}:`, wordMap);
} catch(e) {
	console.log(`ERROR. Imported of wordMap from ${MAP} failed.`);
	console.error(e);
}

export function lookup(word: string): StructuredEntry {
	return wordMap.get(word.toLowerCase());
}

// DELETE following line. Placeholder for now.
const answers = new Set(['saint', 'crane', 'slate', /* ...your word list... */]);

/** pruneDictionary() creates a *.pruned.jsonl 
 * dictionary file from a postprocessed  *.full.jsonl file downloaded from
 * https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl 
 * 
 * To run pruneDictionary():
 * 1) If needed, edit the build() function.
 * 2) run the following in a terminal:
 * ```npx tsx src/dictionary/dictionary.ts --build```
 * */
async function pruneDictionary(): Promise<void> {
	const bigDictionary  = readline.createInterface({ 
		input: createReadStream(FULL), crlfDelay: Infinity });
	const out = createWriteStream(PRUNED);
	let nWrote = 0;
	let nRead = 0;

	for await (const line of bigDictionary) {
		// console.log(`pruneDictionary line: "\n${line}\n"`);
		if (!line.trim()) continue;
		const e = JSON.parse(line);
		nRead++;
		if (e.lang_code !== 'en') continue;
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
		else p.enprs = deDupe(p.enprs);
		p.defs = deDupe(p.defs);
		const pStr = JSON.stringify(p);
		out.write(pStr + '\n');
		nWrote++;
		// console.log(`word "${e.word} : ${e.pos}", input line ${nRead } length: ${line.length}, output line ${nWrote} length ${pStr.length} `);
		if (nRead >= 500) break; // DELETE this line. For testing only.
	}

	out.end();
	await new Promise<void>((res) => out.once('close', res));
	console.log(`Read ${nRead} entries, wrote ${nWrote} entries`);
}

/** buildAndSaveWordMap() builds the wordMap 
 * from a "*.pruned.jsonl" dictionary file
 * then saves it to the "wordMap.json" file.
 * 
 * To run buildAndSaveWordMap():
 * 1) If needed, edit the build() function.
 * 2) run the following in a terminal:
 * ```npx tsx src/dictionary/dictionary.ts --build```
 * */
async function buildAndSaveWordMap() {
	const prunedDictionary = readFileSync(join(__dirname, 'kaikki.org.dictionary.pruned.jsonl'), 'utf-8');

	for (const line of prunedDictionary.split('\n')) {
		if (!line.trim()) continue;
		// if (!answers.has(w)) continue;
		const pe: PrunedEntry = JSON.parse(line);
		var se: StructuredEntry = wordMap.get(pe.word) ||
			{ enprs: pe.enprs, posMap: new Map<string, string[]>() };
		se.posMap.set(pe.pos, pe.defs);
		wordMap.set(pe.word, se);
	}
	console.log(`buildAndSaveWordMap() created wordMap(size: ${wordMap.size}).`);
	// console.log(`wordMap :`, wordMap);
}

/** To run:
 * 1) If needed, edit the build() function.
 * 2) run the following in a terminal:
 * ```npx tsx src/dictionary/dictionary.ts --build```
 * */
async function build(): Promise<void> {
	pruneDictionary()
	.then (() => buildAndSaveWordMap())
	.then (() => console.log(`Executed pruneDictionary.ts build().`))
	.catch (err => console.error(`pruneDictionary.ts build() ERROR:`, err));
}

// ---------- CLI entry ----------
if (import.meta.main) {
	const args = process.argv.slice(2);
	if (args.includes('--build')) {
		await build();
	} else {
		console.log(`Loaded wordMap(size: ${wordMap.size}) from ${MAP}.`);
	}
}
