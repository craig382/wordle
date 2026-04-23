<script lang="ts">
	import Definition from "./Definition.svelte";
	import {GameState, botNodeInfo, ROWS} from "../../utils";

	export let appCM: GameState;
	export let x = 0;
	export let y = 0;
	export let word = "";
	export let ri: number;
	const width = +getComputedStyle(document.body).getPropertyValue("--game-width") / 2;

	$: x = window.innerWidth - x < width ? window.innerWidth - width : x;
</script>

<div class="ctx-menu" style="top: {y}px; left: {x}px;">
	<div>
		{#if word !== ""}
			{@const h1 = botNodeInfo(appCM.human[ri], appCM.guessGroupIds[ri])}
			{h1[5]} words left before guessing {h1[0]}.
			<br /><br />

			{h1[6]} guess {h1[0]} created 
			{h1[14]}% groups ({h1[2]}/{h1[5]}) and left {h1[11]} words.
			{#if ri === 0}
				The bot always uses the first human guess as its first guess.
				<br /><br />
			{:else if ri > 0}
				{@const h0 = botNodeInfo(appCM.human[ri-1], appCM.guessGroupIds[ri-1])}
				{@const b1 = botNodeInfo(h0[12], "")}
				{#if b1[0] === h1[0] }
					The bot also chose {b1[0]} for this guess.
					<br /><br />
				{:else}
					Instead of {h1[0]}, the bot chose {b1[6]} 
					guess {b1[0]} which created {b1[14]}%
					groups ({b1[2]}/{b1[5]}){#if !appCM.solution}.
					{:else} &nbsp;and left {b1[11]} words.{/if}
					<br /><br />
				{/if}
			{/if}

			{#if word !== appCM.solution && ri < (ROWS - 1) }
				{@const b2 = botNodeInfo(h1[12], "")}
				For the guess after {h1[0]}, the bot 
				chose {b2[6]} guess {b2[0]} 
				which created {b2[14]}% groups
				({b2[2]}/{b2[5]}){#if !appCM.solution}.{:else} &nbsp;and left 
				{b2[11]} words.{/if}
				<br /><br />
			{/if}
		{/if}
	</div>
	{#if word !== ""}
		<Definition {word} alternates={1} />
	{/if}
</div>

<style lang="scss">
	.ctx-menu {
		position: fixed;
		z-index: 2;
		font-size: var(--fs-small);
		background-color: var(--bg-secondary);
		border: solid 1px var(--border-primary);
		border-radius: 4px;
		padding: 10px;
		width: calc(var(--game-width) / 2);

		& > :global(*) {
			border-bottom: 1px solid var(--border-primary);
			padding-bottom: 5px;
		}
		& > :global(*:last-child) {
			border-bottom: none;
			padding-bottom: unset;
			padding-top: 5px;
		}
	}
</style>
