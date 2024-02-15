<script lang="ts">
	import Row from "./Row.svelte";
	import ContextMenu from "../widgets/ContextMenu.svelte";
	import { createEventDispatcher } from "svelte";
	import { scale } from "svelte/transition";

	export let guesses: string[];
	export let board: GameBoard;
	export let nGuesses: number;
	export let icon: string;
	export let tutorial: boolean;
	export function shake(row: number) {
		rows[row].shake();
	}
	export function bounce(row: number) {
		rows[row].bounce();
	}
	export function hideCtx(e?: MouseEvent) {
		if (!e || !e.defaultPrevented) showCtx = false;
	}
	const dispatch = createEventDispatcher();

	let rows: Row[] = [];
	let showCtx = false;
	let rowIndex = 0;
	let x = 0;
	let y = 0;
	let word = "";

	function context(cx: number, cy: number, ri: number, val: string) {
		// console.log("nGuesses:", guesses, "rowIndex:", ri);
		if (nGuesses > ri) {
			x = cx;
			y = cy;
			showCtx = true;
			word = val;
			rowIndex = ri;
		}
	}

	const swipeThreshold = 120;
	const swipeTolerance = 100;
	const maxSwipePeriod = 300;

	let startX: number;
	let startY: number;
	let startTime: number;

	function swipeStart(e: TouchEvent) {
		startX = e.changedTouches[0].pageX;
		startY = e.changedTouches[0].pageY;
		startTime = Date.now();
	}

	function swipeEnd(e: TouchEvent) {
		let deltaX = e.changedTouches[0].clientX - startX;
		let deltaY = e.changedTouches[0].clientY - startY;
		let elapsed = Date.now() - startTime;
		if (elapsed > maxSwipePeriod) return;
		if (Math.abs(deltaX) >= swipeThreshold && Math.abs(deltaY) < swipeTolerance) {
			dispatch("swipe", { direction: deltaX < 0 ? "left" : "right" });
		}
	}
</script>

{#if showCtx}
	<ContextMenu {x} {y} {word} ri={rowIndex} />
{/if}

<div class="board" on:touchstart={swipeStart} on:touchend={swipeEnd} on:touchmove|preventDefault>
	{#each guesses as _, ri}
		<Row
			ri={ri}
			nGuesses={nGuesses}
			bind:this={rows[ri]}
			bind:value={guesses[ri]}
			state={board.state[ri]}
			on:ctx={(e) => context(e.detail.x, e.detail.y, ri, guesses[ri])}
		/>
	{/each}
	{#if icon}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
			<path d={icon} stroke-width="14" />
		</svg>
	{/if}
	{#if tutorial}
		<div
			transition:scale
			class="tutorial"
			on:click={() => dispatch("closeTutPopUp")}
			on:keydown={() => dispatch("closeTutPopUp")}
		>
			double tap a row to see a word's definition, or how many words can be played there
			<span class="ok">OK</span>
		</div>
	{/if}
</div>

<style>
	.board {
		display: grid;
		grid-template-rows: repeat(var(--rows), 1fr);
		gap: 5.5px;
		max-height: 420px;
		flex-grow: 1;
		aspect-ratio: var(--cols) / var(--rows);
		padding: 10px;
		position: relative;
	}
	svg {
		position: absolute;
		z-index: -1;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(130%, 100vw);
		max-height: 100%;
	}
	path {
		stroke: var(--mode-symbol-color);
	}
	.tutorial {
		top: calc(100 / var(--rows) * 1%);
	}
</style>
