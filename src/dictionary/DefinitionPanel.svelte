<!-- src/dictionary/DefinitionPanel.svelte -->
<script lang="ts">
	import { lookup } from './dictionary';
	export let word: string;
	$: se = lookup(word);
</script>

{#if se.posMap}
	<h2>{word.toLowerCase()}</h2>
	{#if se.sounds}
		<span class="ipa">{se.pronunciations.join(' · ')}</span>
	{/if}
	<ul>
	{#each se.posMap as pos}
		<li><em>{pos.key}</em>
		<ol>{#each pos.definitions as d}<li>{d}</li>{/each}</ol>
		</li>
	{/each}
		</ul>
	{:else}
		<p>No definition found.</p>
{/if}