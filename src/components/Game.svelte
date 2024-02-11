<script lang="ts">
	import { fade } from "svelte/transition";
	import Header from "./Header.svelte";
	import { Board } from "./board";
	import Keyboard from "./keyboard";
	import Modal from "./Modal.svelte";
	import { getContext, onMount, setContext } from "svelte";
	import Settings from "./settings";
	import {
		Share,
		Separator,
		Definition,
		Tutorial,
		Statistics,
		Distribution,
		Timer,
		Toaster,
		ShareGame,
		Tips,
		Historical,
	} from "./widgets";
	import {
		contractNum,
		countOfAinB,
		pattern,
		DELAY_INCREMENT,
		PRAISE,
		modeData,
		ROWS,
		COLS,
		newSeed,
		GameState,
		seededRandomInt,
		LetterStates,
		words,
		Stats,
	} from "../utils";
	import { letterStates, settings, mode } from "../stores";

	export let solution: string;
	export let stats: Stats;
	export let game: GameState;
	export let toaster: Toaster;

	setContext("toaster", toaster);
	const version = getContext<string>("version");

	// implement transition delay on keys
	const delay = DELAY_INCREMENT * ROWS + 800;

	let showTutorial = $settings.tutorial === 3;
	let showSettings = false;
	let showStats = false;
	let showHistorical = false;
	let showRefresh = false;

	let board: Board;
	let timer: Timer;

	/**
	 * Processes a valid guess, including:
	 * updating the colors of the guess tiles,
	 * updating  the colors of the keyboard tiles,
	 * and updating the GameState
	 * (including bot calculations).
	 */
	 export function processValidGuess() {
			game.board.state[game.nGuesses] = game.guess(solution);
			++game.nGuesses;
			$letterStates.update(game.lastState, game.lastWord);
			$letterStates = $letterStates;
			game.update();
			if (game.lastWord === solution) win();
			else if (game.nGuesses === ROWS) lose();
	}

	function submitWord() {
		if (game.latestWord.length !== COLS) {
			toaster.pop("Not enough letters");
			board.shake(game.nGuesses);
		} else if (words.contains(game.latestWord)) {
			if (game.nGuesses > 0) {
				const hm = game.checkHardMode();
				if ($settings.hard[$mode]) {
					if (hm.type === "🟩") {
						toaster.pop(
							`${contractNum(hm.pos + 1)} letter must be ${hm.char.toUpperCase()}`
						);
						board.shake(game.nGuesses);
						return;
					} else if (hm.type === "🟨") {
						toaster.pop(`Guess must contain ${hm.char.toUpperCase()}`);
						board.shake(game.nGuesses);
						return;
					}
				} else if (hm.type !== "⬛") {
					game.validHard = false;
				}
			}
			processValidGuess();
		} else {
			toaster.pop("Not in word list");
			board.shake(game.nGuesses);
		}
	}

	function win() {
		board.bounce(game.nGuesses - 1);
		game.active = false;
		setTimeout(
			() => toaster.pop(PRAISE[game.nGuesses - 1]),
			DELAY_INCREMENT * COLS + DELAY_INCREMENT
		);
		setTimeout(setShowStatsTrue, delay * 1.4);
		if (!modeData.modes[$mode].historical) {
			stats.addWin(game.nGuesses, modeData.modes[$mode]);
			stats = stats;
			localStorage.setItem(`stats-${$mode}`, stats.toString());
		}
	}

	function lose() {
		game.active = false;
		setTimeout(setShowStatsTrue, delay);
		if (!modeData.modes[$mode].historical) {
			stats.addLoss(modeData.modes[$mode]);
			stats = stats;
			localStorage.setItem(`stats-${$mode}`, stats.toString());
		}
	}

	function concede() {
		showSettings = false;
		setTimeout(setShowStatsTrue, DELAY_INCREMENT);
		lose();
	}

	function reload() {
		modeData.modes[$mode].historical = false;
		modeData.modes[$mode].seed = newSeed($mode);
		game = new GameState($mode, localStorage.getItem(`state-${$mode}`));
		let solutionIndex = seededRandomInt(0, words.answers.length, modeData.modes[$mode].seed);
		solution = words.answers[solutionIndex];
		// console.log("Cheat. The solution is: " + solution + " soltionIndex: " + solutionIndex);
		$letterStates = new LetterStates();
		showStats = false;
		showRefresh = false;
		timer.reset($mode);
	}

	function setShowStatsTrue() {
		if (!game.active) showStats = true;
	}

	function onSwipe(e: Swipe) {
		switch (e.detail.direction) {
			case "left":
				$mode = ($mode + 1) % modeData.modes.length;
				toaster.pop(modeData.modes[$mode].name);
				break;
			case "right":
				$mode = ($mode - 1 + modeData.modes.length) % modeData.modes.length;
				toaster.pop(modeData.modes[$mode].name);
				break;
		}
	}

	onMount(() => {
		if (!game.active) setTimeout(setShowStatsTrue, delay);
		// console.log("onMount");
	});
	// $: toaster.pop(word);
</script>

<svelte:body on:click={board.hideCtx} on:contextmenu={board.hideCtx} />

<main class:guesses={game.nGuesses !== 0} style="--rows: {ROWS}; --cols: {COLS}">
	<Header
		bind:showRefresh
		tutorial={$settings.tutorial === 2}
		on:closeTutPopUp|once={() => ($settings.tutorial = 1)}
		showStats={stats.played > 0 || (modeData.modes[$mode].historical && !game.active)}
		on:stats={() => (showStats = true)}
		on:tutorial={() => (showTutorial = true)}
		on:settings={() => (showSettings = true)}
		on:reload={reload}
	/>
	<Board
		bind:this={board}
		bind:value={game.board.words}
		tutorial={$settings.tutorial === 1}
		on:closeTutPopUp|once={() => ($settings.tutorial = 0)}
		board={game.board}
		guesses={game.nGuesses}
		icon={modeData.modes[$mode].icon}
		on:swipe={onSwipe}
	/>
	<Keyboard
		on:keystroke={() => {
			if ($settings.tutorial) $settings.tutorial = 0;
			board.hideCtx();
		}}
		bind:value={game.board.words[game.nGuesses === ROWS ? 0 : game.nGuesses]}
		on:submitWord={submitWord}
		on:esc={() => {
			showTutorial = false;
			showStats = false;
			showSettings = false;
		}}
		disabled={!game.active || $settings.tutorial === 3 || showHistorical}
	/>
</main>

<Modal
	bind:visible={showTutorial}
	on:close|once={() => $settings.tutorial === 3 && --$settings.tutorial}
	fullscreen={$settings.tutorial === 0}
>
	<Tutorial visible={showTutorial} />
</Modal>

<Modal bind:visible={showStats}>
	{#if modeData.modes[$mode].historical}
		<h2 class="historical">Statistics not available for historical games</h2>
	{:else}
		<h3>Statistics ({modeData.modes[$mode].name})</h3>
		<Statistics data={stats} />
		<Distribution distribution={stats.guesses} {game} />
	{/if}
	<Separator visible={!game.active}>
		<Timer
			slot="1"
			bind:this={timer}
			on:timeup={() => (showRefresh = true)}
			on:reload={reload}
		/>
		<Share slot="2" game={game} />
	</Separator>
	<ShareGame solutionNumber={game.solutionNumber} />
	{#if !game.active}
		<Definition word={solution} alternates={2} />
	{:else}
		<!-- Fade with delay is to prevent a bright red button from appearing as soon as refresh is pressed -->
		<div
			in:fade={{ delay: 300 }}
			class="button concede"
			on:click={concede}
			on:keydown={concede}
		>
			give up
		</div>
	{/if}
	{#if (game.nGuesses > 0)}
		<h3>Bot Results{#if !game.active} For Solution "{game.solution}"{/if}</h3>
		<div class="row">
			Top New York Times WordleBot openers (each 
			with 97+ NYT WordleBot score): {game.openers}.
		</div>
		<div class="row">
			<section>
				BOT<br />
				HARD<br />
				MODE<br />
			</section>
			<section>
				<br />HUMAN<br />
			</section>
			<section>
				BOT<br />
				EASY<br />
				MODE<br />
			</section>
		</div>
		{#each Array(game.nGuesses + 1) as _, ri}
			{#if game.active || ri < game.nGuesses}
				<div class="row">
					<section>
						{game.guessesHard[ri]}<br />
						{pattern(game.guessGroupIdsHard[ri])}<br />
						{game.scoresHard[ri]} points<br />
						{countOfAinB(" ", game.guessGroupsHard[ri]) + 1} words left<br />
						in group {game.guessGroupIdsHard[ri]}:<br />
						{game.guessGroupsHard[ri]}<br />
					</section>
					<section>
						{#if (ri < game.nGuesses)}
							{game.guesses[ri]}<br />
							{pattern(game.guessGroupIds[ri])}<br />
							{game.scores[ri]} points<br />
							{game.nAnswers[ri+1]} words left<br />
							in group {game.guessGroupIds[ri]}:<br />
							{game.guessGroups[ri]}<br />
						{/if}
					</section>
					<section>
						{game.guessesEasy[ri]}<br />
						{pattern(game.guessGroupIdsEasy[ri])}<br />
						{game.scoresEasy[ri]} points<br />
						{countOfAinB(" ", game.guessGroupsEasy[ri]) + 1} words left<br />
						in group {game.guessGroupIdsEasy[ri]}:<br />
						{game.guessGroupsEasy[ri]}<br />
					</section>
				</div>
			{/if}
		{/each}
		<div class="row">
			An "easy" guess earns 0.5 penalty points.
			For each guess but guess {ROWS}, each word 
			in a group (except the group's first word) 
			earns 1 penalty point.
		</div>
	{/if}
</Modal>

<Modal fullscreen={true} bind:visible={showSettings}>
	<Settings game={game} on:historical={() => (showHistorical = true)} />
	{#if game.active}
		<div class="button concede" on:click={concede} on:keydown={concede}>give up</div>
	{/if}
	<Tips change={showSettings} />

	<svelte:fragment slot="footer">
		<a href="https://www.nytimes.com/games/wordle/" target="_blank" rel="noreferrer"
			>Original Wordle</a
		>
		<div>
			<div>v{version}</div>
			<div
				title="double click to reset your stats"
				class="word"
				on:dblclick={() => {
					localStorage.clear();
					toaster.pop("localStorage cleared");
				}}
			>
				{modeData.modes[$mode].name} word #{game.solutionNumber}
			</div>
		</div>
	</svelte:fragment>
</Modal>

<Modal bind:visible={showHistorical}>
	<Historical bind:showSettings />
</Modal>

<style lang="scss">
	main {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		height: 100%;
		max-width: var(--game-width);
		margin: auto;
		position: relative;
	}
	.historical {
		text-align: center;
		margin-top: 10px;
		padding: 0 20px;
		text-transform: uppercase;
	}
	.concede {
		background-color: var(--red);
	}
	.row {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		justify-content: center;
		gap: 4px;
		border: 1px solid;
	}
	section {
		display: flex;
		flex-direction: column;
		align-items: center;
		inline-size: 150px;
		text-align: center;
		overflow-wrap: break-word;
		vertical-align: top;
	}


</style>
