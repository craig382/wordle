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

	// export let solution: string;
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
			game.guessProcessed = false;
			if ($mode === GameMode.solver) {
				let errorIndex = 0;
				let gid = "";
				[ gid, errorIndex ] = groupIdFromRow(game.nGuesses);
				if (errorIndex > -1) {
					toaster.pop(`Give letter ${errorIndex + 1} a color then resubmit your guess.`);
					return;
				}
				game.guessGroupIds[game.nGuesses] = gid;
				if (gid = "#####") game.solution = game.board.guesses[game.nGuesses];
			} else game.board.state[game.nGuesses] = game.guess(game.solution);
			++game.nGuesses;
			game.update();
			if (game.lastWord === game.solution) win();
			else if (game.nGuesses === ROWS) lose();
			game.guessProcessed = true;
			game = game;
			$showRowHints = $showRowHints;
			$letterStates.update(game.lastState, game.lastWord);
			$letterStates = $letterStates;
	}

	function submitWord() {
		if (game.latestWord.length !== COLS) {
			toaster.pop("Not enough letters");
			board.shake(game.nGuesses);
		} else if (words.contains(game.latestWord)) {
			if (game.nGuesses > 0) {
				// In Solver mode, user enters guessId here.
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
		// setTimeout(setShowStatsTrue, delay * 1.4);
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
		console.log("Cheat. The solution is: " + game.solution + ".");
		$letterStates = new LetterStates();
		showStats = false;
		showRefresh = false;
		timer.reset($mode);
		if ($mode === GameMode.ai) {
			// console.log("Wordle reloaded in AI mode.");
			// console.log($settings);
			let openersArray = game.openers.split(" ");
			game.board.guesses[game.nGuesses] = randomSample(openersArray);
			do {
				processValidGuess();
				if (!game.active) break;
				if ($settings.hard[$mode]) {
					game.board.guesses[game.nGuesses] = game.guessesHard[game.nGuesses];
				} else {
					game.board.guesses[game.nGuesses] = game.guessesEasy[game.nGuesses];
				}
			} while (true);
		}
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
		// console.log("Wordle restarted");
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
			<br />Row Hint Format. "B &divide; G &rArr; A". "B" 
			possible solutions Before the guess &divide; (divided 
			into) "G" Groups by the guess &rArr; 
			(yields) "A" possible solutions left After the guess.
		{/if}
	</p>
<Board
		bind:this={board}
		bind:guesses={game.board.guesses}
		tutorial={$settings.tutorial === 1}
		on:closeTutPopUp|once={() => ($settings.tutorial = 0)}
		board={game.board}
		nGuesses={game.nGuesses}
		icon={modeData.modes[$mode].icon}
		on:swipe={onSwipe}
	/>
	<Keyboard
		on:keystroke={() => {
			if ($settings.tutorial) $settings.tutorial = 0;
			board.hideCtx();
		}}
		bind:value={game.board.guesses[game.nGuesses === ROWS ? 0 : game.nGuesses]}
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
		<Definition word={game.solution} alternates={2} />
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
		<br /><h3>Bot Results {#if !game.active}For Solution "{game.solution}"{/if}</h3>
		<div class="row">
			The Wordle dictionary has {words.answers.length} possible 
			solutions and {words.otherGuesses.length} additional other
			words you may use as guesses. All words counted and listed
			below are from the possible solutions dictionary.
		</div>
		<div class="row">
			Top New York Times WordleBot openers (each 
			with 97+ NYT WordleBot score): {game.openers}.
		</div>
		{#each Array(game.nGuesses + 1) as _, ri}
			{#if game.active || ri < game.nGuesses}
				{@const nLeftHard = countOfAinB(" ", game.guessGroupsHard[ri]) + 1}
				{@const nLeft = countOfAinB(" ", game.guessGroups[ri]) + 1}
				{@const nLeftEasy = countOfAinB(" ", game.guessGroupsEasy[ri]) + 1}
				<h1>Guess # {(ri + 1)}</h1>
				<div class="row">
						<section>
							Bot Hard Mode<br /><br />
							{game.guessesHard[ri].toUpperCase()}<br />
							{patternString(game.guessGroupIdsHard[ri])}<br />
							{game.scoresHard[ri]} points<br /><br />
							Eliminated {game.nAnswers[ri] - nLeftHard} words<br />
							in {game.groupsHard[ri].size} groups:
							{#if ri > 0}
								<br />{Array.from(game.groupsHard[ri].values()).sort((a, b) => a.length - b.length).join(", ")}
							{/if}
							<br /><br />{nLeftHard} words left:
							{#if ri > 0}
								<br />{game.guessGroupsHard[ri]}
							{/if}
						</section>
						<section>
							{#if ri < game.nGuesses}
								Human<br /><br />
								{game.guesses[ri].toUpperCase()}<br />
								{patternString(game.guessGroupIds[ri])}<br />
								{game.scores[ri]} points<br /><br />
								Eliminated {game.nAnswers[ri] - nLeft} words<br />
								in {game.groups[ri].size} groups:
								{#if ri > 0}
									<br />{Array.from(game.groups[ri].values()).sort((a, b) => a.length - b.length).join(", ")}
								{/if}
								<br /><br />{nLeft}  words left:
								{#if ri > 0}
									<br />{game.guessGroups[ri]}
								{/if}
							{/if}
						</section>
						<section>
							Bot Easy Mode<br /><br />
							{game.guessesEasy[ri].toUpperCase()}<br />
							{patternString(game.guessGroupIdsEasy[ri])}<br />
							{game.scoresEasy[ri]} points<br /><br />
							Eliminated {game.nAnswers[ri] - nLeftEasy} words<br />
							in {game.groupsEasy[ri].size} groups:
							{#if ri > 0}
								<br />{Array.from(game.groupsEasy[ri].values()).sort((a, b) => a.length - b.length).join(", ")}
							{/if}
							<br /><br />{nLeftEasy} words left:
							{#if ri > 0}
							<br />{game.guessGroupsEasy[ri]}
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
	p {
		text-align: center;
		max-width: 330px;
	}


</style>
