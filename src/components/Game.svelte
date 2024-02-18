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
		patternString,
		randomSample,
		DELAY_INCREMENT,
		PRAISE,
		modeData,
		ROWS,
		COLS,
		newSeed,
		GameState,
		LetterStates,
		words,
		Stats,
        groupIdFromRow,
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
			app.guessProcessed = false;
			if ($mode === GameMode.solver) {
				let errorIndex = 0;
				let gid = "";
				[ gid, errorIndex ] = groupIdFromRow(app.nGuesses);
				if (errorIndex > -1) {
					toaster.pop(`Give letter ${errorIndex + 1} a color then resubmit your guess.`);
					return;
				}
				app.guessGroupIds[app.nGuesses] = gid;
				if (gid === "#####") app.solution = app.board.guesses[app.nGuesses];
			} else app.board.state[app.nGuesses] = app.guess(app.solution);
			++app.nGuesses;
			app.update();
			if (app.lastWord === app.solution) win();
			else if (app.nGuesses === ROWS) lose();
			app.guessProcessed = true;
			// app = app;
			$showRowHints = $showRowHints;
			$letterStates.update(app.lastState, app.lastWord);
			$letterStates = $letterStates;
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
		app.active = false;
		setTimeout(
			() => toaster.pop(PRAISE[app.nGuesses - 1]),
			DELAY_INCREMENT * COLS + DELAY_INCREMENT
		);
		// setTimeout(setShowStatsTrue, delay * 1.4);
		if (!modeData.modes[$mode].historical) {
			stats.addWin(app.nGuesses, modeData.modes[$mode]);
			stats = stats;
			localStorage.setItem(`stats-${$mode}`, stats.toString());
		}
	}

	function lose() {
		app.active = false;
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
		app = new GameState($mode, localStorage.getItem(`state-${$mode}`));
		console.log("Cheat. The solution is: " + app.solution + ".");
		$letterStates = new LetterStates();
		showStats = false;
		showRefresh = false;
		timer.reset($mode);
		if ($mode === GameMode.ai) {
			let openersArray = app.openers.split(" ");
			app.board.guesses[app.nGuesses] = randomSample(openersArray);
			do {
				processValidGuess();
				if (!app.active) break;
				if ($settings.hard[$mode]) {
					app.board.guesses[app.nGuesses] = app.guessesHard[app.nGuesses];
				} else {
					app.board.guesses[app.nGuesses] = app.guessesEasy[app.nGuesses];
				}
			} while (true);
		}
	}

	function setShowStatsTrue() {
		if (!app.active) showStats = true;
	}

	function onSwipe(e: Swipe) {
		switch (e.detail.direction) {
			case "left":
				$mode = ($mode + 1) % modeData.modes.length;
				// toaster.pop(modeData.modes[$mode].name);
				break;
			case "right":
				$mode = ($mode - 1 + modeData.modes.length) % modeData.modes.length;
				// toaster.pop(modeData.modes[$mode].name);
				break;
		}
	}

	onMount(() => {
		if (!app.active) setTimeout(setShowStatsTrue, delay);
		// console.log("Wordle restarted");
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
		{modeData.modes[$mode].name} Mode.
		{#if $mode === GameMode.ai}
			In AI mode, the Bot plays one 
			randomly selected Wordle game each time you 
			click the "Refresh" icon in the upper left corner.
		{:else if $mode === GameMode.solver}
			In Solver mode, you and the Bot 
			work together to solve the Wordle. Each time 
			you enter a guess you must also enter the 
			color of each letter.
		{/if}
		<br />
		{#if $showRowHints}
			<br />Row Hint. &lt;&nbsp;words before&nbsp;&gt; &divide; 
			(&nbsp;divided by&nbsp;) &lt;&nbsp;n groups&nbsp;&gt; 
			&rArr; (&nbsp;yields&nbsp;) &lt;&nbsp;words after&nbsp;&gt;.
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
		{#each Array(app.nGuesses + 1) as _, ri}
			{#if app.active || ri < app.nGuesses}
				{@const nLeftHard = countOfAinB(" ", app.guessGroupsHard[ri]) + 1}
				{@const nLeft = countOfAinB(" ", app.guessGroups[ri]) + 1}
				{@const nLeftEasy = countOfAinB(" ", app.guessGroupsEasy[ri]) + 1}
				<h1>Guess # {(ri + 1)}</h1>
				<div class="row">
						<section>
							Bot Hard Mode<br /><br />
							{app.guessesHard[ri].toUpperCase()}<br />
							{patternString(app.guessGroupIdsHard[ri])}<br />
							{app.scoresHard[ri]} points<br /><br />
							Eliminated {app.nAnswers[ri] - nLeftHard} words<br />
							in {app.groupsHard[ri].size} groups:
							{#if ri > 0}
								<br />{Array.from(app.groupsHard[ri].values()).sort((a, b) => a.length - b.length).join(", ")}
							{/if}
							<br /><br />{nLeftHard} words left:
							{#if ri > 0}
								<br />{app.guessGroupsHard[ri]}
							{/if}
						</section>
						<section>
							{#if ri < app.nGuesses}
								Human<br /><br />
								{app.guesses[ri].toUpperCase()}<br />
								{patternString(app.guessGroupIds[ri])}<br />
								{app.scores[ri]} points<br /><br />
								Eliminated {app.nAnswers[ri] - nLeft} words<br />
								in {app.groups[ri].size} groups:
								{#if ri > 0}
									<br />{Array.from(app.groups[ri].values()).sort((a, b) => a.length - b.length).join(", ")}
								{/if}
								<br /><br />{nLeft}  words left:
								{#if ri > 0}
									<br />{app.guessGroups[ri]}
								{/if}
							{/if}
						</section>
						<section>
							Bot Easy Mode<br /><br />
							{app.guessesEasy[ri].toUpperCase()}<br />
							{patternString(app.guessGroupIdsEasy[ri])}<br />
							{app.scoresEasy[ri]} points<br /><br />
							Eliminated {app.nAnswers[ri] - nLeftEasy} words<br />
							in {app.groupsEasy[ri].size} groups:
							{#if ri > 0}
								<br />{Array.from(app.groupsEasy[ri].values()).sort((a, b) => a.length - b.length).join(", ")}
							{/if}
							<br /><br />{nLeftEasy} words left:
							{#if ri > 0}
							<br />{app.guessGroupsEasy[ri]}
							{/if}
						</section>
				</div>
			{/if}
		{/each}
		<div class="row">
			Like golf, a lower score is better.<br />
			Zero is the perfect score.<br />
			For some moves, a score of zero is not possible.<br /><br />
			Score (penalty point) formula...<br /><br />
			For guess 6, start with Score = 0.<br />
			For guesses 1 to 5, start with the Score in the formula below.<br /><br />
			Score = nWordsLeftBeforeThisGuess - nGroupsEliminatedByThisGuess - 1.<br /><br />
			Score = Score + 0.5 if guess was "easy" (guess was not one of 
			the words left before this guess).
		</div>
	{/if}
</Modal>

<Modal fullscreen={true} bind:visible={showSettings}>
	<Settings game={app} on:historical={() => (showHistorical = true)} />
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


</style>
