<!-- src/lib/DefinitionPanel.svelte -->
<script lang="ts">
  import { tree } from '$lib/dictionary';
  export let word: string;
  $: t = tree(word);
</script>

{#if t.partsOfSpeech.length}
  <h2>{t.word}</h2>
  {#if t.pronunciations.length}<span class="ipa">{t.pronunciations.join(' · ')}</span>{/if}
  <ul>
    {#each t.partsOfSpeech as pos}
      <li><em>{pos.pos}</em>
        <ol>{#each pos.definitions as d}<li>{d}</li>{/each}</ol>
      </li>
    {/each}
  </ul>
{:else}
  <p>No definition found.</p>
{/if}