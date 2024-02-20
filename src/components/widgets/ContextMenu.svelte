<script lang="ts">
	import Definition from "./Definition.svelte";
	import {app, countOfAinB} from "../../utils";
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
		Before guessing {word.toUpperCase()} there were
		{app.nAnswers[ri]} possible answers.<br /><br />

		{#if word != app.solution}
			Guess {word.toLocaleUpperCase()} created 
			{app.nGroups[ri]} groups and left 
			{app.nAnswers[ri+1]} possible answers.
			<br /><br />

			Instead of {word.toLocaleUpperCase()}, 
			the bot in hard (easy) mode chose 
			{app.guessesHard[ri].toUpperCase()} 
			({app.guessesEasy[ri].toUpperCase()}),
			which created {app.nGroupsHard[ri]} ({app.nGroupsEasy[ri]})
			groups{#if app.mode === GameMode.solver}.
			{:else} &nbsp;and left {countOfAinB(" ", app.guessGroupsHard[ri]) + 1} 
			({countOfAinB(" ", app.guessGroupsEasy[ri]) + 1}) possible
			answers.{/if}

			<br /><br />
			For the guess after {word.toUpperCase()}, the bot in 
			hard (easy) mode chose {app.guessesHard[ri+1].toUpperCase()} 
			({app.guessesEasy[ri+1].toUpperCase()}),
			which created {app.nGroupsHard[ri+1]} ({app.nGroupsEasy[ri+1]})
			groups{#if app.mode === GameMode.solver}.{:else} &nbsp;and left {countOfAinB(" ", app.guessGroupsHard[ri+1]) + 1} 
			({countOfAinB(" ", app.guessGroupsEasy[ri+1]) + 1}) possible
			answers.{/if}
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
