import { readFileSync, writeFileSync, createReadStream, 
	createWriteStream } from 'node:fs';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deDupe } from '../utils';

import {
	type PosMap,
	type WordEntry,
	type WordMap,
} from './wordMap';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FULL = join(__dirname, 'kaikki.org.dictionary.full.jsonl');
const PRUNED = join(__dirname, 'kaikki.org.dictionary.pruned.jsonl');
const MAP = join(__dirname, 'wordMap.json');

const wordMap: WordMap = {}; 

/** pruneDictionary() creates a *.pruned.jsonl 
 * dictionary file from a postprocessed  *.full.jsonl file downloaded from
 * https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl 
 * 
 * To run pruneDictionary():
 * 1) If needed, edit the build() function.
 * 2) run the following in a terminal:
 * ```npx tsx src/dictionary/buildWordMap.ts```
 */
async function pruneDictionary(): Promise<void> {
	const out = createWriteStream(PRUNED);
	const bigDictionary  = readline.createInterface({ 
		input: createReadStream(FULL), crlfDelay: Infinity });
	let nWrote = 0;
	let nRead = 0;

	for await (const line of bigDictionary) {
		if (!line.trim()) continue;
		const j = JSON.parse(line);
		nRead++;
		if (j.lang_code !== 'en') continue;
		var defsArray: string[] = (j.senses || [])
			.reduce((acc: string[], s: any) => acc.concat(s.glosses), [])
		defsArray = deDupe(defsArray);
		const pMap: PosMap = { [j.pos]: defsArray};
		const s: WordEntry = {
			enprs: (j.sounds || []).filter((s: any) => s.enpr)
				.map((s: any) => (s.enpr)),
			pMap: pMap,
		};
		if (s.enprs.length === 0) delete s.enprs;
		else s.enprs = deDupe(s.enprs);
		const wMap: WordMap = { [j.word]: s};
		const pStr = JSON.stringify(wMap);
		out.write(pStr + '\n');
		nWrote++;
		console.log(`word "${j.word} : ${j.pos}", input (output) line ${nRead } (${nWrote}) length: ${line.length} (${pStr.length}).`);
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
 * ```npx tsx src/dictionary/buildWordMap.ts```
 * */
async function buildAndSaveWordMap() {
	const out = createWriteStream(MAP);
	let nRead = 0;
	const prunedDictionary = readFileSync(join(__dirname, 'kaikki.org.dictionary.pruned.jsonl'), 'utf-8');

	// DELETE following line. Placeholder for now.
	const answers = new Set(['saint', 'crane', 'slate', /* ...your word list... */]);

	for (const line of prunedDictionary.split('\n')) {
		if (!line.trim()) continue;
		// if (!answers.has(w)) continue;
		const j: WordMap = JSON.parse(line);
		nRead++;
		for (const [w, we] of Object.entries(j)) {
			if (!wordMap[w]) {
				wordMap[w] = we;
				continue;
			}
			// merge and deDupe the enprs
			if (wordMap[w].enprs?.length !== we.enprs?.length)
				console.log(`line ${nRead} ${w} enprs: wordMap: ${wordMap[w].enprs}, json: ${we.enprs}.`);
			we.enprs = wordMap[w].enprs?.concat(we.enprs);
			wordMap[w].enprs = deDupe(we.enprs);
			for (var [p, ds] of Object.entries(we.pMap)) {
				if (!wordMap[w].pMap[p]) {
					wordMap[w].pMap[p] = ds;
					continue;
				}
				// merge and deDupe the defs
				// console.log(`json line ${nRead} ${w} ${p} defs.length: ${ds.length}.`);
				ds = wordMap[w].pMap[p]?.concat(ds);
				wordMap[w].pMap[p] = deDupe(ds);
				// console.log(`wordMap line ${nRead} ${w} ${p} defs.length: ${wordMap[w].pMap[p].length}.`);
			};

		}

		if (nRead >= 500) break; // DELETE this line. For testing only.
	}

	const wmStr = JSON.stringify(wordMap);
	out.write(wmStr);
	out.end();
	await new Promise<void>((res) => out.once('close', res));

	console.log(`buildAndSaveWordMap() created wordMap(length: ${Object.keys(wordMap).length}), read ${nRead} lines from ${PRUNED}.`);
	// console.log(`wordMap :`, wordMap);
}

/** To run:
 * 1) If needed, edit the build() function.
 * 2) run the following in a terminal:
 * ```npx tsx src/dictionary/buildWordMap.ts```
 * */
function build(): void {
	// pruneDictionary();
	// .then (() => 
	buildAndSaveWordMap()
	// )
	.then (() => console.log(`Executed buildWordMap.ts build().`))
	.catch (err => console.error(`buildWordMap.ts build() ERROR:`, err));
}

// ---- CLI (Command Line Interface) entry ----------
build();