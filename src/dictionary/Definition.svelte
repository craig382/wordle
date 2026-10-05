<script context="module" lang="ts">
	import { lookup } from './wordMap';
	import { randomSample } from "../utils";
</script>

<script lang="ts">

	export let word: string;
	/** The maximum number of definitions to show (per pos). */
	export let maxDefs = 9;

	const we = lookup(word);
	let newDefs: Record<string, string> = {};
	let newDefIndexes: Record<string, number> = {};

	// getRandomDefs();

	// initialize all the new def indexes to 0
	// and all the new defs to defintion 0.
	if (we) for (const [pos, defs] of Object.entries(we.pMap) ) {
		newDefIndexes[pos] = 0;
		newDefs[pos] = defs[0];
	}

	let defs = newDefs;

	function getRandomDefs() {
		newDefs = {};
		if (we) {
			for (const [pos, defs] of Object.entries(we.pMap)) {
				newDefs[pos] = randomSample(defs);
			}
			// console.log(`Definition< ${word} > ran getRandomDefs().`);
		}
	}

	function incDefs() {
		newDefs = {};
		if (we) {
			for (const [pos, defs] of Object.entries(we.pMap)) {
				newDefIndexes[pos] = (newDefIndexes[pos] + 1) % defs.length;
				newDefs[pos] = defs[newDefIndexes[pos]];
			}
			// console.log(`Definition< ${word} > ran incDefs().`);
		}
	}

	function decDefs() {
		newDefs = {};
		if (we) {
			for (const [pos, defs] of Object.entries(we.pMap)) {
				newDefIndexes[pos] = (newDefIndexes[pos] - 1 + defs.length) % defs.length;
				newDefs[pos] = defs[newDefIndexes[pos]];
			}
			// console.log(`Definition< ${word} > ran decDefs().`);
		}
	}

	$: {
		defs = newDefs;
		// console.log(`Definition< ${word} > ran reactive block.`);
	}

</script>

<div class="def">

	{#if we}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<h2
			on:click|self = {incDefs}
			on:contextmenu|preventDefault = {decDefs}
		>
			{word}
			{#if we.enprs}
				<pr>  [ {we.enprs.join(', ') } ]</pr>
			{/if}
		</h2>

		<ol>
			{#each Object.entries(defs) as [pos, def]}
				<li><em>{pos} {newDefIndexes[pos] + 1} of {we.pMap[pos].length}.</em> {def}</li>
			{/each}
		</ol>

		{:else}
		<div>Cannot find "{word}" in the wordMap.json dictionary file.</div>

		{/if}
</div>

<style>
	h2 {
		display: block;
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
	pr {
			font-weight: normal;
			/* optional: slightly smaller than the heading */
			/* font-size: 0.8em; */
			/* optional: matches your marker color */
			color: var(--fg-secondary);
	}
</style>
