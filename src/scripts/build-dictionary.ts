// scripts/build-dictionary.ts  — 
// run with: 
// npx tsx src/scripts/build-dictionary.ts
import { createReadStream } from 'node:fs';
import { createWriteStream } from 'node:fs';
import * as readline from 'node:readline';
import * as zlib from 'node:zlib';

const answers = new Set(['saint', 'crane', 'slate', /* ...your word list... */]);
const rawDictionaryDir = `src/dictionary`;

// pruneDictionary();

export async function pruneDictionary() {
	// const reader = new FileReader();
	const rl = readline.createInterface({
		input: createReadStream(`${rawDictionaryDir}/kaikki.org.dictionary.full.jsonl`),
		crlfDelay: Infinity,
	});

	const out = createWriteStream(`${rawDictionaryDir}/kaikki.org.dictionary.pruned.jsonl`);
	let nWrote = 0;
	let nRead = 0;

	for await (const line of rl) {
		const e = JSON.parse(line);
		nRead++;

		if (e.lang_code !== 'en') continue;
		const w = (e.word || '').toLowerCase();

		// if (!answers.has(w)) continue;

		// Keep only the fields your UI actually renders
		const p = {
			word: e.word,
			pos: e.pos,
			// sounds: (e.sounds || []).filter((s: any) => s.ipa || s.enpr)
			// 	.map((s: any) => ({ enpr: s.enpr, ipa: s.ipa })),
			senses: (e.senses || []).map((s: any) => ({
				qualifier: s.qualifier,
				glosses: s.glosses,
				examples: s.examples?.map((x: any) => x.text),
			})),
		};


		const pStr = JSON.stringify(p);
		out.write(pStr + '\n');
		nWrote++;

		console.log(`.`);
		console.log(`word "${e.word}", input line ${nRead } length: ${line.length}, output line ${nWrote} length ${pStr.length} `);
		console.log(`pruned dicitionary json:`, p);

		if (nRead >= 5) break;

	}

	out.end();
	console.log(`Read ${nRead} entries, wrote ${nWrote} entries`);
}
