<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { COLS, countOfAinB, GameState, easyOrHard, botNodeInfo } from "../../utils";
	import Tile from "./Tile.svelte";
	import { showRowHints } from "../../stores";
	import { GameMode } from "../../enums";


	/** Row Index.*/
	export let ri: number;
	export let app: GameState;
	export function shake() {
		animation = "shake";
	}
	export function bounce() {
		tiles.forEach((e) => e.bounce());
	}
	const dispatch = createEventDispatcher();
	let animation = "";
	let complete = false;
	let showRowHint = false;
	let tiles: Tile[] = [];

	const MAX_DOUBLE_CLICK_INTERVAL = 400;
	let lastTouch = 0;
	/**
	 * Detect double clicks on mobile devices by detecting touches <= 500ms apart. This is needed
	 * because listening to touch events on Board prevents Row from receiving dblclick events.
	 */
	function onTouch(e: TouchEvent) {
		console.log("onTouch", this)
		if (Date.now() - lastTouch <= MAX_DOUBLE_CLICK_INTERVAL) {
			e.preventDefault();
			dispatch("ctx", { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY });
		} else {
			lastTouch = Date.now();
		}
	}

	$: {
		let ng = app.nGuesses;
		if (ng > ri) {
			showRowHint = $showRowHints;
			complete = true;
		} else {
			showRowHint = false;
			if( (ng === ri) && (app.mode === GameMode.solver) ) 
				complete = true;
			else complete = false;
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
	class:complete={complete}
>
	{#each Array(COLS) as _, ci}
		<Tile bind:this={tiles[ci]} bind:app={app} bind:state={app.board.state[ri][ci]} value={app.board.guesses[ri].charAt(ci)} 
			ri={ri} ci={ci} />
	{/each}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<section on:click|self={() => {$showRowHints = !$showRowHints;}}>
		{#if showRowHint }
			{@const h1 = botNodeInfo(app.human[ri], app.guessGroupIds[ri])}
			{h1[2]}{h1[6][0]}/
			{#if ri > 0 }
				{@const h0 = botNodeInfo(app.human[ri-1], app.guessGroupIds[ri-1])}
				{@const b1 = botNodeInfo(h0[12], "")}
				<br />{b1[2]}{b1[6][0]}
			{:else}
				<br />{h1[2]}{h1[6][0]}
			{/if}
			<br />{h1[11]}W
		{:else if ri === 0}
			Row<br />Hints<br />
			{#if $showRowHints}ON{:else}OFF{/if}
		{/if}
	</section>
</div>

<style lang="scss">
	section {
		text-align: center;
		align-self: center;
		line-height: 1.2em;
		cursor: pointer;	
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
