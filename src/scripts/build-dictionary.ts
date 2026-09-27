// scripts/build-dictionary.ts  — 
// run with: npx tsx src/scripts/build-dictionary.ts
import { createReadStream } from 'node:fs';
import { createWriteStream } from 'node:fs';
import * as readline from 'node:readline';
import * as zlib from 'node:zlib';

const ANSWERS = new Set(['saint', 'crane', 'slate', /* ...your word list... */]);

const rl = readline.createInterface({
  input: createReadStream('enwiktionary-2026-09-02-all.jsonl').pipe(zlib.createGunzip()),
  crlfDelay: Infinity,
});

const out = createWriteStream('src/lib/data/wikt.jsonl');
let count = 0;

for await (const line of rl) {
  const e = JSON.parse(line);
  if (e.lang_code !== 'en') continue;
  const w = (e.word || '').toLowerCase();
  if (!ANSWERS.has(w)) continue;

  // Keep only the fields your UI actually renders
  out.write(JSON.stringify({
    word: e.word,
    pos: e.pos,
    senses: (e.senses || []).map((s: any) => ({
      glosses: s.glosses,
      tags: s.tags,
      examples: s.examples?.map((x: any) => x.text),
    })),
    sounds: (e.sounds || []).filter((s: any) => s.ipa || s.audio)
             .map((s: any) => ({ ipa: s.ipa, audio: s.audio, tags: s.tags })),
    etymology: e.etymology_text,
    forms: e.forms?.map((f: any) => ({ form: f.form, tags: f.tags })),
  }) + '\n');
  count++;
}
out.end();
console.log(`Wrote ${count} entries`);