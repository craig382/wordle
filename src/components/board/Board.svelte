<script lang="ts">
	import Row from "./Row.svelte";
	import ContextMenu from "../widgets/ContextMenu.svelte";
	import { createEventDispatcher } from "svelte";
	import { scale } from "svelte/transition";
	import type { GameState } from "../../utils";
	import { ROWS } from "../../utils";

	export let app: GameState;
	export let rows: Row[] = [];
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

	let showCtx = false;
	let rowIndex = 0;
	let x = 0;
	let y = 0;
	let word = "";

	window.addEventListener('popstate', function() {
		window.history.pushState({}, '')
		if (showCtx === true) { showCtx = false; } 
	});

	function context(cx: number, cy: number, ri: number, val: string) {
		// console.log("nGuesses:", guesses, "rowIndex:", ri);
		if (app.nGuesses > ri) {
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
	{#each app.guesses as guess, ri}
		{#if ri < ROWS}
			<Row
				ri={ri}
				bind:this={rows[ri]}
				bind:app={app}
				on:ctx={(e) => context(e.detail.x, e.detail.y, ri, guess)}
			/>
		{/if}
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
