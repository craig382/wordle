<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { COLS, GameState, botNodeInfo, words, } from "../../utils";
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
	let rowHintCalculated = false;
	let showGuessHint = false;
	let guess = "";
	let inDictionary = false;
	let isHard = false;
	let guessHint = "";
	let tiles: Tile[] = [];
	let h1: BotNodeTuple;
	let b1: BotNodeTuple;

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
		// console.log(`Row.svelte nGuesses ${ng}, "${app.guesses[ri]}"[${ri}]`);
		if (ng === 0) rowHintCalculated = false;
		if (ng > ri) {
			showRowHint = $showRowHints;
			showGuessHint = false;
			complete = true;
			if (!rowHintCalculated) {
				console.log(`Row.svelte. Calculate ${app.guesses[ri]}[${ri}] row hint.`);
				h1 = botNodeInfo(app.human[ri], app.guessGroupIds[ri]);
				if (ri > 0) {
					b1 = botNodeInfo(h1[18], "");
				}
				rowHintCalculated = true;
			}
		} else {
			showRowHint = false;
			if (ng === ri) {
				if (app.mode === GameMode.solver) complete = true;
				if (app.board.guesses[ri][4] !== undefined) {
					showGuessHint = $showRowHints;
					if (showGuessHint) {
						guess = app.board.guesses[ri];
						if (ri > 0) {
							isHard = app.human[ri-1].gangs.get(app.guessGroupIds[ri-1])[0].includes(guess);
							if (isHard) guessHint = `\u{2713}\u{2713}`;
							else {
								inDictionary = words.answers.includes(guess)
								if (inDictionary) guessHint = `\u{2713}`;
								else guessHint = "x";
							}
						} else {
							inDictionary = words.answers.includes(guess)
							if (inDictionary) guessHint = `\u{2713}\u{2713}`;
							else guessHint = "x";
						}
					}

				}
				else showGuessHint = false;
			} else {
				complete = false;
				showGuessHint = false;
			}
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
			{h1[14]}%{h1[6][0]}
			{#if ri > 0 }
				<br />{b1[14]}%{b1[6][0]}
			{:else}
				<br />{h1[14]}%{h1[6][0]}
			{/if}
			<br />{h1[11]}W
		{:else if showGuessHint}
			{guessHint}
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
