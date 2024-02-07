<script lang="ts">
	import Definition from "./Definition.svelte";
	import {ROWS, game, countOfAinB} from "../../utils";

	export let x = 0;
	export let y = 0;
	export let word = "";
	export let ri: number;
	const width = +getComputedStyle(document.body).getPropertyValue("--game-width") / 2;

	$: x = window.innerWidth - x < width ? window.innerWidth - width : x;
</script>

<div class="ctx-menu" style="top: {y}px; left: {x}px;">
	<div>
		Before guessing "{word}" there were
		<br />
		{game.nAnswers[ri]} possible answers.
		<!-- <br /> -->
		Guess "{word}" eliminated {game.groups[ri].size} groups,
		left {countOfAinB(",", game.guessGroups[ri]) + 1} 
		possible answers, and scored {game.scores[ri]} 
		penalty points.
		<br /><br />
		A "soft" guess earns 0.5 penalty points.
		<!-- <br /> -->
		For each guess but guess {ROWS}, each word 
		in a group (except the group's first word) 
		earns 1 penalty point.
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
