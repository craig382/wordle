<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { COLS, game, countOfAinB } from "../../utils";

	import Tile from "./Tile.svelte";
	import { showRowHints } from "../../stores";

	export let nGuesses: number;
	/** Row Index.*/
	export let ri: number;
	export let value = "";
	export let state: LetterState[];
	export function shake() {
		animation = "shake";
	}
	export function bounce() {
		tiles.forEach((e) => e.bounce());
	}
	const dispatch = createEventDispatcher();
	let animation = "";
	let tiles: Tile[] = [];

	const MAX_DOUBLE_CLICK_INTERVAL = 400;
	let lastTouch = 0;
	/**
	 * Detect double clicks on mobile devices by detecting touches <= 500ms apart. This is needed
	 * because listening to touch events on Board prevents Row from receiving dblclick events.
	 */
	function onTouch(e: TouchEvent) {
		if (Date.now() - lastTouch <= MAX_DOUBLE_CLICK_INTERVAL) {
			e.preventDefault();
			dispatch("ctx", { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY });
		} else {
			lastTouch = Date.now();
		}
	}
	
</script>

<div
	class="board-row"
	on:contextmenu|preventDefault={(e) => dispatch("ctx", { x: e.clientX, y: e.clientY })}
	on:dblclick|preventDefault={(e) => dispatch("ctx", { x: e.clientX, y: e.clientY })}
	on:touchstart={onTouch}
	on:animationend={() => (animation = "")}
	data-animation={animation}
	class:complete={nGuesses > ri}
>
	{#each Array(COLS) as _, i}
		<Tile bind:this={tiles[i]} state={state[i]} value={value.charAt(i)} position={i} />
	{/each}
	<section>
		{#await game.guessProcessed === true}
			x
		{:then}
			{#if ri < nGuesses && $showRowHints}
				{@const nBefore = game.nAnswers[ri]}
				{@const nAfter = countOfAinB(" ", game.guessGroups[ri]) + 1}
				{@const nGroups = game.groups[ri].size + 1}	
				{nBefore}<br />&divide; {nGroups}<br />&rArr; {nAfter}
			{/if}
		{/await}
	</section>
</div>

<style lang="scss">
	section {
		// align-items: normal;
		text-align: center;
		// align-content: center;
		// overflow-wrap: break-word;
		// vertical-align: bottom;
	}
	.board-row {
		display: grid;
		// grid-template-columns: repeat(var(--cols), 1fr);
		grid-template-columns: repeat(calc(var(--cols) + 1), 1fr);
		gap: 5px;
		&[data-animation="shake"] {
			animation: shake 0.6s;
		}
	}
	@keyframes shake {
		10%,
		90% {
			transform: translateX(-1px);
		}

		20%,
		80% {
			transform: translateX(2px);
		}

		30%,
		50%,
		70% {
			transform: translateX(-4px);
		}

		40%,
		60% {
			transform: translateX(4px);
		}
	}
</style>
