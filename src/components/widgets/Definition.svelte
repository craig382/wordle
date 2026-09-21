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

		return res.text().then(jsonText => {
			const json = JSON.parse(jsonText);
			// console.log("fetchWiktionary raw JSON text and JSON data object:", jsonText, json);
    		return toDictionaryEntry(json, word);
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

		const meanings: Meaning[] = senses.map(sense => ({
			partOfSpeech: sense.partOfSpeech ?? "",
			definitions: (sense.definitions ?? []).map((d: any): Definition => ({
				definition: htmlToText(d.definition ?? ""),
				synonyms: [], // not provided by this endpoint
				antonyms: [], // not provided by this endpoint
				example: d.example ? htmlToText(d.example) : undefined, // optional, may be undefined
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

		console.log(`DictionaryEntry created for "${word}".`);

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
