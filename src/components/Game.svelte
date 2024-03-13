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
        calculateBotInfoArray,
        BotMode,
        namesOf,
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
	let infoL: Array<BotNodeTuple>;
	let infoR: Array<BotNodeTuple>;

	let board: Board;
	let timer: Timer;

	/**
	 * Processes a valid guess, including:
	 * updating the colors of the guess tiles,
	 * updating  the colors of the keyboard tiles,
	 * and updating the GameState (including bot calculations).
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
			try {
				app.updateBot();
				if (app.status === GameStatus.won) win();
				else if (app.status === GameStatus.lost) lose();
				$showRowHints = $showRowHints;
				$letterStates.update(app.lastState, app.lastWord);
				$letterStates = $letterStates;
			} catch (e) { console.log(e); }
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
			case aiModes["Max Groups Hard"]: aiBot = app.aiMaxGroupsHard; break;
			case aiModes["Max Groups Easy"]: aiBot = app.aiMaxGroupsEasy; break;
			case aiModes["Min Sum of Squares Hard"]: aiBot = app.aiMinSumOfSquaresHard; break;
			case aiModes["Min Sum of Squares Easy"]: aiBot = app.aiMinSumOfSquaresEasy; break;
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

	{#if showStats && app.nGuesses > 0 }
		{@const LL = (infoL = calculateBotInfoArray("left"))}
		{@const RR = (infoR = calculateBotInfoArray("right"))}
		{@const modes = namesOf(BotMode)}
		<br /><h3>Bot Results {#if !app.active}For Solution "{app.solution}"{/if}</h3>
		{#each Array(Math.max(LL.length, RR.length)) as _, ri}
			<h1>Guess # {(ri + 1)}</h1>
			<div class="row">
				<section>
					{#if ri < LL.length}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<h4
							on:click|self={() => {
							app.botLeftMode = (app.botLeftMode + 1) % modes.length;
							infoL = calculateBotInfoArray("left")
						}}
						>
							{modes[app.botLeftMode]}<br /><br />
						</h4>
						{LL[ri][0]}<br />
						{LL[ri][6]} Guess<br />
						{LL[ri][2]} groups<br />
						{LL[ri][3].toLocaleString()} SoS<br /><br />
						{#if LL[ri][7]}
							{LL[ri][8]}<br />
							Eliminated {LL[ri][9].toLocaleString()} words<br />
							{#if LL[ri][0].toLowerCase() !== app.solution}
								{LL[ri][11]}  words left
								<br /><br />{LL[ri][13]}<br />
							{/if}
						{/if}
					{/if}
				</section>
				<section>
					{#if ri < RR.length}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<h4
							on:click|self={() => {
							app.botRightMode = (app.botRightMode + 1) % modes.length;
							infoR = calculateBotInfoArray("right")
							}}
						>
							{modes[app.botRightMode]}<br /><br />

						</h4>
						{RR[ri][0]}<br />
						{RR[ri][6]} Guess<br />
						{RR[ri][2]} groups<br />
						{RR[ri][3].toLocaleString()} SoS<br /><br />
						{#if RR[ri][7]}
							{RR[ri][8]}<br />
							Eliminated {RR[ri][9].toLocaleString()} words<br />
							{#if RR[ri][0].toLowerCase() !== app.solution}
								{RR[ri][11]} words left
								<br /><br />{RR[ri][13]}<br />
							{/if}
						{/if}
					{/if}
				</section>
			</div>
		{/each}

		<div class="row">
			The Wordle dictionary contains {words.answers.length.toLocaleString()} possible 
			solutions and {words.otherGuesses.length.toLocaleString()} additional other
			words you may use as guesses.<br /><br />
			
			The NYT Wordle possible solutions dictionary excludes: 
			plural nouns that end in S or ES, 
			past tense verbs that end in ED, proper nouns,
			and words outside the vocabulary of the "general public".
			The vocabulary rule is subjective and might use 
			the "typical NYT reader" instead of the "general public".
		</div>
		<div class="row">
			Top NYT WordleBot openers (each 
			with 97+ NYT WordleBot score): {app.openers}.
		</div>
		<div class="row">
			All Bot and AI Algorithms...<br /><br />

			The algorithm uses the first human guess as its first guess.<br /><br />

			For the last guess (guess 6), all "words left" from the 
			previous guess are equally
			likely to win or lose, and the algorithm selects one
			of them as its guess.<br /><br />
			
			An "Hard" algorithm must select each guess from  
			the "words left" list of the previous guess.<br /><br />

			An "Easy" algorithm is  allowed to use any word in its
			Wordle solution dictionary as a guess.<br /><br />

			A "Bot" algorithm selects each guess based on "human" history
			(based on the previous human guesses).<br /><br />

			An "AI" algoritm selects each guess based on "AI" history
			(based on the previous AI guesses).<br /><br />

			A "perfect" guess is one that creates as many groups as there
			were remaining answers before the guess.<br /><br />
			
			If the algorithm finds a perfect guess, it immediately ends its 
			searching.<br /><br />

			The algorithm starts by searching through the "words left" list
			of the prior guess. If the algoritm finds
			a perfect Hard guess, its search is finished.<br /><br />

			If the Hard guess was not perfect, an Easy algoritm will 
			continue searching through a portion 
			of the Wordle solution dictionary for a 
			possible better Easy guess.
		</div>
		<div class="row">
			The Max Groups Algorithms.<br /><br />
			
			For guesses 2 to 5, the algorithm selects the first
			guess it finds that creates the maximum number of groups.
		</div>
		<div class="row">
			The Min Sum of Squares Algorithms.<br /><br />

			In the table above, "SoS" stands for "Sum of Squares".<br /><br />
			
			For guesses 2 to 5, the algorithm selects the first
			guess it finds that produces the minimum sum of squares.<br /><br />

			The sum of squares is calculated by accumulating (summing) 
			the square of each group size. For example, if the guess
			creates 3 groups, the first containing 1 word, the second 
			containing 2 words, and the third containing 3 words, then  
			SoS = 1^2 + 2^2 + 3^2 = 1 + 4 + 9 = 14<br /><br />

			This algorithm trades off two goals. The algorithm tries to
			create as many groups as possible but also prefers smaller groups
			to larger groups. Each word in a group of 1 is penalized 1 point.
			Each word in a group of 2 is penalized 2 points. Each word in a 
			group of 3 is penalized 3 points. And so forth. The larger the 
			group, the more each of its words is penalized.
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
		flex: 1;
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
	h4 {
		cursor: pointer;	
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
