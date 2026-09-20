<script context="module" lang="ts">
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
		const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;

		const res = await fetch(url, { headers: { Accept: "application/json" } });

		if (!res.ok) {
			const e = new Error(`Failed to fetch definition of "${word}". (${res.status})`);
			console.log(e);
			throw e;
		}

		const json = await res.json();
		return toDictionaryEntry(json, word);
	}

	function htmlToText(html: string): string {
		if (!html) return "";
		// Decode entities and strip tags using the DOM parser.
		const doc = new DOMParser().parseFromString(html, "text/html");
		// Replace link/element content with just its text nodes.
		return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
	}

	function toDictionaryEntry(json: any, word: string): DictionaryEntry {
		// Response is keyed by language code, each value an array of senses:
		// { en: [ { partOfSpeech, language, definitions:[{ definition, example }] }, ... ] }
		const senses: any[] = Array.isArray(json?.en) ? json.en : [];

		const meanings: Meaning[] = senses.map(sense => ({
			partOfSpeech: sense.partOfSpeech ?? "",
			definitions: (sense.definitions ?? []).map((d: any): Definition => ({
				definition: htmlToText(d.definition ?? ""),
				synonyms: [],          // not provided by this endpoint
				antonyms: [],          // not provided by this endpoint
				example: d.example ? htmlToText(d.example) : undefined,    // optional, may be undefined
			}))
			// Filter out empty or whitespace-only definitions
			.filter(def => def.definition.length > 0),
		}));

		const entry: DictionaryEntry = {
			word: json?.word ?? word,
			phonetic: "",
			phonetics: [],
			origin: "",
			meanings,
		};

		console.log(`DictionaryEntry created for "${word}":`, entry);

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
		<em>{data.meanings[0].partOfSpeech}</em>
		<ol>
			{#if word !== data.word}
				<li>variant of {data.word}.</li>
			{/if}
			{#each data.meanings[0].definitions.slice(0, 1 + alternates - (word !== data.word ? 1 : 0)) as def}
				<li>{def.definition}</li>
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
