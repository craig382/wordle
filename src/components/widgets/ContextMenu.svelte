<script lang="ts">
	import Definition from "./Definition.svelte";
	import {easyOrHard, app, countOfAinB} from "../../utils";
	import { GameMode } from "../../enums";

	export let x = 0;
	export let y = 0;
	export let word = "";
	export let ri: number;
	const width = +getComputedStyle(document.body).getPropertyValue("--game-width") / 2;

	$: x = window.innerWidth - x < width ? window.innerWidth - width : x;
</script>

<div class="ctx-menu" style="top: {y}px; left: {x}px;">
	<div>
		{app.nAnswers[ri]} words left
		before guessing {word.toUpperCase()}.<br /><br />

		{#if word != app.solution}
			{easyOrHard(word, ri)} guess {word.toUpperCase()} created 
			{app.nGroups[ri]} groups and left 
			{app.nAnswers[ri+1]} words.
			<br /><br />

			Instead of {word.toUpperCase()}, 
			the bot chose {easyOrHard(app.guessesBot[ri], ri)} 
			guess {app.guessesBot[ri].toUpperCase()} 
			which created {app.nGroupsBot[ri]}
			groups{#if app.mode === GameMode.solver}.
			{:else} &nbsp;and left {countOfAinB(" ", app.guessGroupsBot[ri]) + 1} 
			words.{/if}

			<br /><br />
			For the guess after {word.toUpperCase()}, the bot 
			chose {easyOrHard(app.guessesBot[ri+1], ri+1)} guess 
			{app.guessesBot[ri+1].toUpperCase()} 
			which created {app.nGroupsBot[ri+1]}
			groups{#if app.mode === GameMode.solver}.{:else} &nbsp;and left 
			{countOfAinB(" ", app.guessGroupsBot[ri+1]) + 1} 
			words.{/if}
			<br /><br />

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
