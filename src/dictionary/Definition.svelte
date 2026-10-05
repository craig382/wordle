<script context="module" lang="ts">
	import { lookup } from './wordMap';
	import { randomSample } from "../utils";
</script>

<script lang="ts">
	export let word: string;
	/** The maximum number of definitions to show (per pos). */
	export let maxDefs = 9;
	$: we = lookup(word);
</script>

<div class="def">
	{#if we}

		<h2>
			{word}
			{#if we.enprs}
				<pr>  [ {we.enprs.join(', ') } ]</pr>
			{/if}
		</h2>

		<ol>
			{#each Object.entries(we.pMap) as [pos, defs]}
				<li><em>{defs.length} {pos}(s)</em> {randomSample(defs)}</li>
			{/each}
		</ol>

		<h2>
			{word}
			{#if we.enprs}
				<pr>  [ {we.enprs.join(', ') } ]</pr>
			{/if}
		</h2>

		<ol>
			{#each Object.entries(we.pMap) as [pos, defs]}
				<li><em>{pos}</em>
				<ol>{#each defs as d}<li>{d}</li>{/each}</ol>
				</li>
			{/each}
		</ol>

		{:else}
		<div>Cannot find "{word}" in the wordMap.json dictionary file.</div>

		{/if}
</div>

<style>
	h2 {
		/* display: inline-block; */
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
			font-size: 0.8em;
			/* optional: matches your marker color */
			color: var(--fg-secondary);
	}
</style>
