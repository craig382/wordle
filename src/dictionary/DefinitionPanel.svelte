<!-- src/dictionary/DefinitionPanel.svelte -->
<script context="module" lang="ts">
	import { lookup } from './wordMap';
	import { randomSample } from '../utils';
</script>

<script lang="ts">
	export let word: string;
	$: we = lookup(word);
</script>

{#if we.pMap}
	<h2>{word.toLowerCase()}</h2>
	{#if we.enprs}
		<span class="ipa">{we.enprs}</span>
	{/if}
	<ul>
	{#each Object.entries(we.pMap) as [pos, defs]}
		<li><em>{pos}</em> {randomSample(defs)}</li>
		<li><em>{pos}</em>
		<ol>{#each defs as d}<li>{d}</li>{/each}</ol>
		</li>
	{/each}
	</ul>
{:else}
		<p>No definition found.</p>
{/if}