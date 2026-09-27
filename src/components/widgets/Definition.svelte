<script context="module" lang="ts">
    import { randomSample } from "../../utils";

	const cache = new Map<string, Promise<DictionaryEntry>>();

	export async function getWordData(word: string): Promise<DictionaryEntry> {
		if (!word) {
			const e = new Error(`getWordData( word: "${word}" ) passed an empty string.`);
			console.log(e);
			throw e;
		}

		const key = word.toLowerCase().trim();

		if (!cache.has(key)) {
			// Store the promise immediately so concurrent lookups dedupe.
			const p = fetchWiktionary(key).catch(err => {
				cache.delete(key); // don't poison the cache on transient/404 failure
				throw err;
			});
			cache.set(key, p);
		}

		return cache.get(key)!;
	}

	async function fetchWiktionary(word: string): Promise<DictionaryEntry> {
		// Wiktionary REST v1 definition endpoint. Supports CORS.
		// Do NOT use mode:"no-cors",
		// which returns an opaque response you can't read with .json().
		// Sandbox Documentation:
		// https://en.wiktionary.org/w/index.php?api=wmf-rest%2Fv1&title=Special%3ARestSandbox#/Page%20content/get_page_definition__term_
		const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;

		const res = await fetch(url, { headers: { Accept: "application/json" } });

		if (!res.ok) {
			const e = new Error(`Failed to fetch definition of "${word}". (${res.status})`);
			console.log(e);
			throw e;
		}

		return res.text().then(jsonText => {
			const json = JSON.parse(jsonText);
			console.log("fetchWiktionary raw JSON data object:", json);
			// console.log("fetchWiktionary raw JSON text:", jsonText);
			return toDictionaryEntry(json, word);
		});
	}

	export async function fetchTest1() {
		const word = "sound";

		const url = `https://api.wikimedia.org/core/v1/wiktionary/en/page/${encodeURIComponent(word)}`;

		const res = await fetch(url, {
		headers: {
			Accept: "application/json",
			"User-Agent": "MyDictApp/1.0 (contact@example.com)"
		}
		});

		const data = await res.json();
		const json = data.source; // raw wikitext string
		console.log("fetchTest raw JSON data object:", json);
	}

	export function fetchTest2(word: string){
		const url = `https://api.wikimedia.org/core/v1/wiktionary/en/page/`;
		// var params = "action=query&ailimit=3&format=json";
		const params = "?action=parse&origin=*";
		fetch(`${url}${encodeURIComponent(word)}${params}`)
		// fetch( url + "?" + params )
		.then(function(r1){
			console.log("r1:", r1)
			return r1.json();
		})
		.then(function(r2) {
			console.log("r2:", r2)
			// return r2.text();
		})
		// .then(function(r3){
		// 	console.log("r3:", r3)
		// 	return r3.blob();
		// })
		.catch(function(e) {
			console.error("fetchTest3 ERROR.", e);
		});
	}

	export function fetchTest3(word: string){
		const url = `https://en.wiktionary.org/w/rest.php/v1/page/`;
		const params = "?origin=*";
		fetch(`${url}${encodeURIComponent(word)}${params}`)
		.then(function(r1){
			console.log("r1:", r1)
			return r1.json();
		})
		.then(function(r2) {
			console.log("r2:", r2);
			console.log("r2.source:wikitext", r2.source);
			// return r2.text();
		})
		// .then(function(r3){
		// 	console.log("r3:", r3)
		// 	return r3.blob();
		// })
		.catch(function(e) {
			console.error("fetchTest3 ERROR.", e);
		});
	}

	export function fetchTest4(word: string){
		// https://www.mediawiki.org/wiki/API:Parsing_wikitext
		const url = `https://en.wiktionary.org/w/api.php`;
		const p1 = `?origin=*&action=parse`;
		const p2 = `&page=${encodeURIComponent(word)}`;
		const p3 = `&prop=wikitext|parsetree|text|properties&parser=parsoid`;
		const p4 = `&format=json&formatversion=2`;
		fetch(`${url}${p1}${p2}${p3}${p4}`)
		.then(function(r1){
			console.log("r1:", r1);
			return r1.json();
		})
		.then(function(r2) {
			console.log("r2:", r2);
			// console.log("r2.parse.parsetree:", r2.parse.parsetree);
			// console.log("r2.parse.text:", r2.parse.text);
			// console.log("r2.source:wikitext", r2.source);
			// return r2.text();
		})
		// .then(function(r3){
		// 	console.log("r3:", r3)
		// 	return r3.blob();
		// })
		.catch(function(e) {
			console.error("fetchTest4 ERROR.", e);
		});
	}

	/** Convert htmlToText using regular expressions. */
	function htmlToText(html: string): string {
		if (!html) return "";
		// Remove HTML tags using regular expressions.
		const text1 = html.replace(/<[^>]*>/g, "");
		// Replace multiple spaces with a single space.
		const text2 = text1.replace(/\s+/g, " ");
		const text3 = text2.trim();
		// console.log(`htmlToText text3:"${text3}".`);
		return text3;
	}

	function toDictionaryEntry(json: any, word: string): DictionaryEntry {
		// Response is keyed by language code, each value an array of senses:
		// { en: [ { partOfSpeech, language, definitions:[{ definition, example }] }, ... ] }
		const senses: any[] = Array.isArray(json?.en) ? json.en : [];

		console.log(`toDictionaryEntry.senses: `, senses);

		const meanings: Meaning[] = senses.map(sense => ({
			partOfSpeech: sense.partOfSpeech ?? "",
			definitions: (sense.definitions ?? []).map((d: any): Definition => ({
				definition: htmlToText(d.definition ?? ""),
				synonyms: [], // not provided by this endpoint
				antonyms: [], // not provided by this endpoint
				examples: (d.examples ?? []).map((ex: any): string => htmlToText(ex))
				   .filter(ex => ex.length > 1), // filter out short examples
			}))
			// Filter out empty or whitespace-only definitions
			.filter(d => d.definition.length > 0),
		}));

		const entry: DictionaryEntry = {
			word: json?.word ?? word,
			phonetic: "",
			phonetics: [],
			origin: "",
			meanings,
		};

		console.log(`DictionaryEntry created for "${word}".`, entry);

		return entry;
	}

</script>

<script lang="ts">
	export let word: string;
	/** The maximum number of alternate definitions to provide*/
	export let alternates = 9;
</script>

<div class="def">
	{#await getWordData(word)}
		<h4>Fetching definition of "{word}"...</h4>
	{:then data}
		<h2>{word}</h2>
		<ol>
			{#each data.meanings.slice(0, alternates + 1) as m}
				<li><em>{m.partOfSpeech}</em> {m.definitions[0].definition}</li>
			{/each}
		</ol>
	{:catch}
		<div>Failed to fetch definition of "{word}".</div>
	{/await}
</div>

<style>
	h2 {
		display: inline-block;
		margin-right: 1rem;
		margin-bottom: 0.8rem;
	}
	ol {
		padding-left: 1.5rem;
	}
	li {
		margin-bottom: 0.5rem;
	}
	li::first-letter {
		text-transform: uppercase;
	}
	li::marker {
		color: var(--fg-secondary);
	}
</style>
