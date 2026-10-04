import { readFileSync, createReadStream, createWriteStream } from 'node:fs';
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
	let nSkipped = 0;
	let nCaught = 0;
	let nDrained = 0;
	let j: any;

	for await (const line of bigDictionary) {
		nRead++;
		try {
			if (!line.trim()) {
				nSkipped++;
				console.log(`pruneDictionary() skipped line ${nRead} (${nSkipped} lines skipped in total).`);
				continue;
			} 
			j = JSON.parse(line);
		} catch (err) {
			nCaught++;
			console.log(`ERROR. pruneDictionary(). Caught error ${nCaught} when reading line ${nRead}:`, err);
			continue;
		}
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
		if (!out.write(pStr + '\n')) {
			nDrained++;
			console.log(`pruneDictionary() is waiting for the out stream to drain.`);
			await new Promise<void>((res) => out.once('drain', res));
			console.log(`pruneDictionary(). The out stream finished draining.`);
		};
		nWrote++;
		// console.log(`word "${j.word} : ${j.pos}", input (output) line ${nRead } (${nWrote}) length: ${line.length} (${pStr.length}).`);

		// if (nRead >= 500) break; // DELETE this line. For testing only.
	}

	out.end();
	await new Promise<void>((res) => out.once('close', res));
	console.log(`pruneDictionary() read ${nRead} lines, wrote ${nWrote} entries.`);
	console.log(`pruneDictionary() skipped ${nSkipped} lines, caught ${nCaught} errors.`);
	console.log(`pruneDictionary() paused ${nDrained} times to let the out stream drain.`);
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
	let nDrained = 0;

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
				// add a new word to wordMap
				wordMap[w] = we;
				continue;
			}
			if (we.enprs) {
				// new enprs available
				if (!wordMap[w].enprs) {
					wordMap[w].enprs = we.enprs;
					// console.log(`${w}: added new enprs: enprs.length: ( before, after ): ( 0, ${we.enprs.length} ).`);
				} else {
					// merge and deDupe the enprs
					wordMap[w].enprs = deDupe(wordMap[w].enprs?.concat(we.enprs));
					// console.log(`${w}: merged and deDuped new enprs: ( number added, new total enprs.length ): ( ${we.enprs.length}, ${wordMap[w].enprs.length} ).`);
				}
			}

			for (var [p, ds] of Object.entries(we.pMap)) {
				if (!wordMap[w].pMap[p]) {
					// add a new part of speech to wordMap
					wordMap[w].pMap[p] = ds;
					continue;
				}

				if (ds) {
					// new defs available
					if (!wordMap[w].pMap[p]) {
						wordMap[w].pMap[p] = ds;
						console.log(`${w} ${p}: added new defs: defs.length: (before, after): ( 0, ${ds.length} ).`);
					} else {
						// merge and deDupe the defs
						wordMap[w].pMap[p] = deDupe(wordMap[w].pMap[p].concat(ds));
						console.log(`${w} ${p}: merged and deDuped new defs: (number added, new total defs.length ): ( ${ds.length}, ${wordMap[w].pMap[p].length} ).`);
					}
				}

				// console.log(`wordMap line ${nRead} ${w} ${p} defs.length: ${wordMap[w].pMap[p].length}.`);
			};

		}

		if (nRead >= 500) break; // DELETE this line. For testing only.
	}

	// Write an easy to view wordMap.json 
	// file with one record per line.
	let first = true;
	for (const [word, entry] of Object.entries(wordMap)) {
		if (first) {
			out.write(`{"${word}":${JSON.stringify(entry)}`);
			first = false;
		} else if ( !out.write(`,\n"${word}":${JSON.stringify(entry)}`) ) {
			nDrained++;
			console.log(`buildAndSaveWordMap() is waiting for the out stream to drain.`);
			await new Promise<void>((res) => out.once('drain', res));
			console.log(`buildAndSaveWordMap(). The out stream finished draining.`);
		}
	};
	out.write(`}\n`);
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
async function build(): Promise<void> {
	try {
		// await pruneDictionary();
		await buildAndSaveWordMap();
		console.log(`Executed buildWordMap.ts build().`);
	} catch (err) {
		console.error(`ERROR. buildWordMap.ts build() failed:`, err);
	}
}

// ---- CLI (Command Line Interface) entry ----------
await build();
