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
		colorString,
		easyOrHard,
		randomSample,
		DELAY_INCREMENT,
		PRAISE,
		aiModes,
		modeData,
		GameStatus,
		ROWS,
		COLS,
		newSeed,
		BotNode,
		GameState,
		LetterStates,
		words,
		Stats,
        groupIdFromColors,
	} from "../utils";
	import { letterStates, settings, mode, showRowHints } from "../stores";
    import { GameMode } from "../enums";

	export let stats: Stats;
	export let app: GameState;
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
	let aiSolution = "";

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
			if ($mode === GameMode.solver) {
				let errorIndex: number = 0;
				let gid = "";
				[ gid, errorIndex ] = groupIdFromColors(app.nGuesses);
				app.guessGroupIds[app.nGuesses] = gid;
				if (gid === "#####") app.solution = app.board.guesses[app.nGuesses];
				else app.board.state[app.nGuesses + 1].fill("⬛");
			} else app.board.state[app.nGuesses] = app.guess(app.solution);
			++app.nGuesses;
			try {
				app.updateBot();
				if (app.status === GameStatus.won) win();
				else if (app.status === GameStatus.lost) lose();
				$showRowHints = $showRowHints;
				$letterStates.update(app.lastState, app.lastWord);
				$letterStates = $letterStates;
			} catch (e) {
				// console.log("processValidGuess: ", e);
				app.nGuesses = app.nGuesses - 1; // Roll back the unsucessful guess.
				app.status = GameStatus.lost; // Abort the game.
			}
	}

	function submitWord() {
		if (app.latestWord.length !== COLS) {
			toaster.pop("Not enough letters");
			board.shake(app.nGuesses);
		} else if (words.contains(app.latestWord)) {
			if (app.nGuesses > 0) {
				// In Solver mode, user enters guessId here.
				const hm = app.checkHardMode();
				if ($settings.hard[$mode]) {
					if (hm.type === "🟩") {
						toaster.pop(
							`${contractNum(hm.pos + 1)} letter must be ${hm.char.toUpperCase()}`
						);
						board.shake(app.nGuesses);
						return;
					} else if (hm.type === "🟨") {
						toaster.pop(`Guess must contain ${hm.char.toUpperCase()}`);
						board.shake(app.nGuesses);
						return;
					}
				} else if (hm.type !== "⬛") {
					app.validHard = false;
				}
			}
			processValidGuess();
		} else {
			toaster.pop("Not in word list");
			board.shake(app.nGuesses);
		}
	}

	function win() {
		board.bounce(app.nGuesses - 1);
		app.status = GameStatus.won;
		setTimeout(
			() => toaster.pop(PRAISE[app.nGuesses - 1]),
			DELAY_INCREMENT * COLS + DELAY_INCREMENT
		);
		setTimeout(setShowStatsTrue, delay * 1.4);
		if (!modeData.modes[$mode].historical) {
			stats.addWin(app.nGuesses, modeData.modes[$mode]);
			stats = stats; // tell svelte to react to change in stats
			localStorage.setItem(`stats-${$mode}`, stats.toString());
		}
	}

	function lose() {
		app.status = GameStatus.lost;
		setTimeout(setShowStatsTrue, delay);
		if (!modeData.modes[$mode].historical) {
			stats.addLoss(modeData.modes[$mode]);
			stats = stats; // tell svelte to react to change in stats
			localStorage.setItem(`stats-${$mode}`, stats.toString());
		}
	}

	function concede() {
		showSettings = false;
		setTimeout(setShowStatsTrue, DELAY_INCREMENT);
		lose();
	}

	function newRandomAiSoltion() {
		reload();
		aiSolution = app.solution;
	}

	function playAiGame() {
		reload();
		let ais = aiSolution.toLowerCase();
		let aiBot: Array<BotNode>;
		if (words.answers.includes(ais)) app.solution = ais;
		else aiSolution = app.solution;
		let openersArray = app.openers.split(" ");

		// Processing the first guess calculates the bot tree and ai row arrays.
		app.board.guesses[0] = randomSample(openersArray);
		processValidGuess(); 

		switch ($settings.aiMode) {
			case aiModes["Max Groups"]: aiBot = app.aiMaxGroups; break;
			case aiModes["Min Sum of Squares"]: aiBot = app.aiMinSumOfSquares; break;
		}

		for (let ri = 1; ri < aiBot.length; ri++) {
			app.board.guesses[ri] = aiBot[ri].guess;
			processValidGuess();
		}

		// console.log("playAiGame:", aiModes[$settings.aiMode], aiBot);
	}

	function reload() {
		modeData.modes[$mode].historical = false;
		modeData.modes[$mode].seed = newSeed($mode);
		app = new GameState($mode, localStorage.getItem(`state-${$mode}`));
		$letterStates = new LetterStates();
		showStats = false;
		showRefresh = false;
		timer.reset($mode);
	}

	function setShowStatsTrue() {
		if (!app.active) showStats = true;
	}

	function onSwipe(e: Swipe) {
		switch (e.detail.direction) {
			case "left":
				$mode = ($mode + 1) % modeData.modes.length;
				break;
			case "right":
				$mode = ($mode - 1 + modeData.modes.length) % modeData.modes.length;
				break;
		}
	}

	onMount(() => {
		if (!app.active) setTimeout(setShowStatsTrue, delay);
		console.log("Wordle restarted");
		
	});
</script>

<svelte:body on:click={board.hideCtx} on:contextmenu={board.hideCtx} />

<main class:guesses={app.nGuesses !== 0} style="--rows: {ROWS}; --cols: {COLS}">
	<Header
		bind:showRefresh
		tutorial={$settings.tutorial === 2}
		on:closeTutPopUp|once={() => ($settings.tutorial = 1)}
		showStats={stats.played > 0 || (modeData.modes[$mode].historical && !app.active)}
		on:stats={() => (showStats = true)}
		on:tutorial={() => (showTutorial = true)}
		on:settings={() => (showSettings = true)}
		on:reload={reload}
	/>
	<p>
		{#if $mode === GameMode.ai}{aiModes[$settings.aiMode]}{/if}
		{modeData.modes[$mode].name} Mode.
		{#if $mode === GameMode.ai}
			<!-- Click the "Refresh" icon in the upper left 
			corner to watch the Bot play a randomly 
			generated Wordle game. -->
			<br />
			<button on:click={newRandomAiSoltion}>New Word</button>
			<input bind:value={aiSolution} />
			<button on:click={playAiGame} >Solve</button>
		{:else if $mode === GameMode.solver}
			Enter the guess letters, then before clicking "Enter", 
			click on each letter as needed to change its color.
		{/if}
		<br />
		{#if app.errorString !== ""}
			<br /><br />{app.errorString}
		{/if}	
	</p>
	<Board
		bind:this={board}
		bind:app={app}
		tutorial={$settings.tutorial === 1}
		on:closeTutPopUp|once={() => ($settings.tutorial = 0)}
		icon={modeData.modes[$mode].icon}
		on:swipe={onSwipe}
	/>
	<Keyboard
		on:keystroke={() => {
			if ($settings.tutorial) $settings.tutorial = 0;
			board.hideCtx();
		}}
		bind:value={app.board.guesses[app.nGuesses === ROWS ? 0 : app.nGuesses]}
		on:submitWord={submitWord}
		on:esc={() => {
			showTutorial = false;
			showStats = false;
			showSettings = false;
		}}
		disabled={!app.active || $settings.tutorial === 3 || showHistorical}
	/>
</main>

<Modal
	bind:visible={showTutorial}
	on:close|once={() => $settings.tutorial === 3 && --$settings.tutorial}
	fullscreen={$settings.tutorial === 0}
>
	<Tutorial visible={showTutorial} app={app} />
</Modal>

<Modal bind:visible={showStats}>
	{#if modeData.modes[$mode].historical}
		<h2 class="historical">Statistics not available for historical games</h2>
	{:else}
		<h3>Statistics ({modeData.modes[$mode].name})</h3>
		<Statistics data={stats} />
		<Distribution distribution={stats.guesses} {app} />
	{/if}
	<Separator visible={!app.active}>
		<Timer
			slot="1"
			bind:this={timer}
			on:timeup={() => (showRefresh = true)}
			on:reload={reload}
		/>
		<Share slot="2" game={app} />
	</Separator>
	<ShareGame solutionNumber={app.solutionNumber} />
	{#if !app.active}
		<Definition word={app.solution} alternates={2} />
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
	{#if (app.nGuesses > 0)}
		<br /><h3>Bot Results {#if !app.active}For Solution "{app.solution}"{/if}</h3>
		{#each Array(app.nGuesses + 1) as _, ri}
			{#if app.active || ri < app.nGuesses}
				{@const nLeft = countOfAinB(" ", app.guessGroups[ri]) + 1}
				{@const nLeftBot = countOfAinB(" ", app.guessGroupsBot[ri]) + 1}
				<h1>Guess # {(ri + 1)}</h1>
				<div class="row">
						<section>
							{#if ri < app.nGuesses}
								Human<br /><br />
								{app.guesses[ri].toUpperCase()}<br />
								{easyOrHard(app.guesses[ri], ri)} Guess<br />
								{app.nGroups[ri]} groups<br /><br />
								{colorString(app.guessGroupIds[ri])}<br />
								Eliminated {app.nAnswers[ri] - nLeft} words<br />
								{nLeft}  words left
							{/if}
						</section>
						<section>
							Bot<br /><br />
							{app.guessesBot[ri].toUpperCase()}<br />
							{easyOrHard(app.guessesBot[ri], ri)} Guess<br />
							{app.nGroupsBot[ri]} groups<br /><br />
							{#if app.mode !== GameMode.solver}
								{colorString(app.guessGroupIdsBot[ri])}<br />
								Eliminated {app.nAnswers[ri] - nLeftBot} words<br />
								{nLeftBot} words left
							{/if}
						</section>
				</div>
				{#if ri < app.nGuesses && app.guesses[ri] !== app.solution}
					<div class="row">
						Guess {app.guesses[ri].toUpperCase()} left 
						{nLeft} words: {app.guessGroups[ri]}<br />
					</div>
				{/if}
			{/if}
		{/each}
		<div class="row">
			The Wordle dictionary has {words.answers.length} possible 
			solutions and {words.otherGuesses.length} additional other
			words you may use as guesses. All words counted and listed
			below are from the possible solutions dictionary.
		</div>
		<div class="row">
			Top New York Times WordleBot openers (each 
			with 97+ NYT WordleBot score): {app.openers}.
		</div>
		<div class="row">
			The Bot Algorithm.<br /><br />
			
			For guess 6, all remaining answers are equally likely
			to win or lose, and the Bot selects the first remaining
			answer as its recommended guess.<br /><br />
			
			For guesses 1 to 5, the Bot recommends the first
			guess it finds that creates the maximum number of groups.<br /><br />
			
			A "perfect" guess is one that creates as many groups as there
			were remaining answers before the guess.<br /><br />
			
			If the Bot finds a perfect guess, it immediately ends its 
			searching.<br /><br />

			The Bot starts by searching through the prior guess's remaining
			answers for a Hard Mode recommended guess. If the Bot finds
			a perfect Hard Mode recommended guess, its search is finished. 
			Otherwise, the Bot will continue searching through the first 
			{app.botWords} words of the Wordle solution dictionary for a 
			possible Easy Mode recommended guess.
		</div>
	{/if}
</Modal>

<Modal fullscreen={true} bind:visible={showSettings}>
	<Settings app={app} on:historical={() => (showHistorical = true)} />
	{#if app.active}
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
				{modeData.modes[$mode].name} word #{app.solutionNumber}
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
		border-radius: 4px;
		padding: 8px;
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
	p {
		text-align: center;
		max-width: 330px;
	}
	h1 {
		text-align: center;
	}
	button {
		text-align: center;
		font-weight: bold;
		font-size: 1.2em;
		cursor: pointer;
		padding-top: 2px;
		padding-bottom: 2px;
		padding-right: 4px;
		padding-left: 4px;
		border-radius: 4px;
		border: solid 3px var(--border-secondary);
		background: var(--bg-secondary);
		color: var(--fg-primary);
	}
	input {
		text-align: center;
		font-weight: bold;
		font-size: 1.2em;
		padding-top: 2px;
		padding-bottom: 2px;
		padding-right: 4px;
		padding-left: 4px;
		border-radius: 4px;
		border: solid 3px var(--border-secondary);
		background: var(--bg-secondary);
		color: var(--fg-primary);
		width: 5em;
		margin: 4px;
		text-transform: uppercase;

	}


</style>
