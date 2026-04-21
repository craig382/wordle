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
		Stats,
        groupIdFromColors,
        calculateBotInfoArray2,
        BotMode,
        namesOf,
        appSettings,
        OpenerModes,
		pause,
	} from "../utils";
	import { letterStates, settings, mode, showRowHints } from "../stores";
    import { GameMode } from "../enums";
	import {words} from "../words_5";


	export let stats: Stats;
	export let appFromGameSvelte: GameState;
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

	export function getApp() {
		return appFromGameSvelte;
	}

	window.addEventListener('popstate', function() {
		window.history.pushState({}, '')
		if (showStats === true) { showStats = false; } 
		else if (showSettings === true) { showSettings = false; } 
		else if (showTutorial === true) { showTutorial = false; }
	});
	
	/**
	 * Processes a valid guess, including:
	 * updating the colors of the guess tiles,
	 * updating  the colors of the keyboard tiles,
	 * and updating the GameState (including bot calculations).
	 */
	 function processValidGuess() {
			if ($mode === GameMode.solver) {
				let errorIndex: number = 0;
				let gid = "";
				[ gid, errorIndex ] = groupIdFromColors(appFromGameSvelte.nGuesses);
				appFromGameSvelte.guessGroupIds[appFromGameSvelte.nGuesses] = gid;
				if (gid === "#####") appFromGameSvelte.solution = appFromGameSvelte.board.guesses[appFromGameSvelte.nGuesses];
				else if (appFromGameSvelte.nGuesses < (ROWS - 1)) appFromGameSvelte.board.state[appFromGameSvelte.nGuesses + 1].fill("⬛");
			} else appFromGameSvelte.board.state[appFromGameSvelte.nGuesses] = appFromGameSvelte.guess(appFromGameSvelte.solution);
			try {
				appFromGameSvelte.updateBot();
				if (appFromGameSvelte.status === GameStatus.won) win();
				else if (appFromGameSvelte.status === GameStatus.lost) lose();
				$showRowHints = $showRowHints;
				$letterStates.update(appFromGameSvelte.lastState, appFromGameSvelte.lastWord);
				$letterStates = $letterStates;
			} catch (e) { console.log(e); }
	}

	function submitWord() {
		if (appFromGameSvelte.latestWord.length !== COLS) {
			toaster.pop("Not enough letters");
			board.shake(appFromGameSvelte.nGuesses);
		} else if (words.contains(appFromGameSvelte.latestWord)) {
			if (appFromGameSvelte.nGuesses > 0) {
				// In Solver mode, user enters guessId here.
				const hm = appFromGameSvelte.checkHardMode();
				if ($settings.hard[$mode]) {
					if (hm.type === "🟩") {
						toaster.pop(
							`${contractNum(hm.pos + 1)} letter must be ${hm.char.toUpperCase()}`
						);
						board.shake(appFromGameSvelte.nGuesses);
						return;
					} else if (hm.type === "🟨") {
						toaster.pop(`Guess must contain ${hm.char.toUpperCase()}`);
						board.shake(appFromGameSvelte.nGuesses);
						return;
					}
				} else if (hm.type !== "⬛") {
					appFromGameSvelte.validHard = false;
				}
			}
			processValidGuess();
		} else {
			toaster.pop("Not in word list");
			board.shake(appFromGameSvelte.nGuesses);
		}
	}

	function win() {
		board.bounce(appFromGameSvelte.nGuesses - 1);
		appFromGameSvelte.status = GameStatus.won;
		setTimeout(
			() => toaster.pop(PRAISE[appFromGameSvelte.nGuesses - 1]),
			DELAY_INCREMENT * COLS + DELAY_INCREMENT
		);
		setTimeout(setShowStatsTrue, delay * 1.4);
		if (!modeData.modes[$mode].historical) {
			stats.addWin(appFromGameSvelte.nGuesses);
			stats = stats; // tell svelte to react to change in stats
			localStorage.setItem(`stats-${$mode}`, stats.toString());
		}
	}

	function lose() {
		appFromGameSvelte.status = GameStatus.lost;
		setTimeout(setShowStatsTrue, delay);
		if (!modeData.modes[$mode].historical) {
			stats.addLoss();
			stats = stats; // tell svelte to react to change in stats
			localStorage.setItem(`stats-${$mode}`, stats.toString());
		}
	}

	function concede() {
		showSettings = false;
		setTimeout(setShowStatsTrue, DELAY_INCREMENT);
		lose();
	}

	function playAiGame(randomWord: boolean = false) {

		// newGame() clears the board and
		// creates a new random solution and a default random opener.
		newGame();

		// New Word (randomWord) mode may use a chain mode or auto repeat opener.
		// Entered Word (non-randomWord) mode always uses the default random opener.  
		if (randomWord) {
			aiSolution = appFromGameSvelte.solution;
			switch (appSettings.openerMode) {
				case OpenerModes["Chain Mode"]:
					appFromGameSvelte.opener = appSettings.prevSolution;
				break;
				case OpenerModes["Auto Repeat"]:
					appFromGameSvelte.opener = appSettings.prevOpener;
				break;
			}
		} 

		let ais = aiSolution.toLowerCase();
		let aiBot: Array<BotNode>;
		if (words.answers.includes(ais)) appFromGameSvelte.solution = ais;
		else aiSolution = appFromGameSvelte.solution;

		// Processing the opener calculates the bot tree and ai row arrays.
		appFromGameSvelte.board.guesses[0] = appFromGameSvelte.opener;
		processValidGuess(); 

		switch ($settings.aiMode) {
			case aiModes["Max % Groups Hard"]: 
				aiBot = appFromGameSvelte.aiMaxGroupsHard;
				appFromGameSvelte.botLeftMode = BotMode["AI Max % Groups Hard"];
				appFromGameSvelte.botRightMode = BotMode["AI Min Sum of Squares Hard"]; 
			break;
			case aiModes["Max % Groups Easy"]: 
				aiBot = appFromGameSvelte.aiMaxGroupsEasy; 
				appFromGameSvelte.botLeftMode = BotMode["AI Max % Groups Easy"];
				appFromGameSvelte.botRightMode = BotMode["AI Min Sum of Squares Easy"]; 
			break;
			case aiModes["Min Sum of Squares Hard"]: 
				aiBot = appFromGameSvelte.aiMinSumOfSquaresHard; 
				appFromGameSvelte.botLeftMode = BotMode["AI Min Sum of Squares Hard"];
				appFromGameSvelte.botRightMode = BotMode["AI Max % Groups Hard"]; 
			break;
			case aiModes["Min Sum of Squares Easy"]: 
				aiBot = appFromGameSvelte.aiMinSumOfSquaresEasy; 
				appFromGameSvelte.botLeftMode = BotMode["AI Min Sum of Squares Easy"];
				appFromGameSvelte.botRightMode = BotMode["AI Max % Groups Easy"]; 
			break;
		}

		for (let ri = 1; ri < aiBot.length; ri++) {
			appFromGameSvelte.board.guesses[ri] = aiBot[ri].guess;
			processValidGuess();
		}

		// console.log("playAiGame:", aiModes[$settings.aiMode], aiBot);
	}

	onMount(() => {
		if (!appFromGameSvelte.active) setTimeout(setShowStatsTrue, delay);
		else newGame();
		
	});

	function newGame() {
		modeData.modes[$mode].historical = false;
		modeData.modes[$mode].seed = newSeed($mode);
		appFromGameSvelte = new GameState($mode);
		$letterStates = new LetterStates();
		showStats = false;
		showRefresh = false;
		timer.reset($mode);

		if (appSettings.openerMode === OpenerModes["Random NYT WordleBot"] || 
			appFromGameSvelte.gameMode === GameMode.ai || appSettings.prevSolution === "") {
			let openersArray = appFromGameSvelte.openers.split(" ");
			appFromGameSvelte.opener = randomSample(openersArray);
		} else if (appSettings.openerMode === OpenerModes["Auto Repeat"]) {
			appFromGameSvelte.opener = appSettings.prevOpener;
		} else appFromGameSvelte.opener = appSettings.prevSolution; // Chain mode opener.

		// Use auto opener rules...
		// 1) AI mode uses playAiGame() to set and process the opener.
		// 2) Solver mode never uses auto opener.
		// 3) All other modes use auto opener if openerMode is not manual.
		let autoOpener: boolean = false;
		if (appFromGameSvelte.gameMode === GameMode.solver || appFromGameSvelte.gameMode === GameMode.ai) 
			autoOpener = false;
		else autoOpener = (appSettings.openerMode !== OpenerModes.Manual);

		// await pause(500);

		if (autoOpener) {
			appFromGameSvelte.board.guesses[0] = appFromGameSvelte.opener;
			processValidGuess(); 
		}

		console.log("newGame:", appFromGameSvelte);
	}

	function setShowStatsTrue() {
		if (!appFromGameSvelte.active) showStats = true;
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

</script>

<svelte:body on:click={board.hideCtx} on:contextmenu={board.hideCtx} />

<main class:guesses={appFromGameSvelte.nGuesses !== 0} style="--rows: {ROWS}; --cols: {COLS}">
	<Header
		bind:showRefresh
		tutorial={$settings.tutorial === 2}
		on:closeTutPopUp|once={() => ($settings.tutorial = 1)}
		showStats={stats.played > 0 || (modeData.modes[$mode].historical && !appFromGameSvelte.active)}
		on:stats={() => (showStats = true)}
		on:tutorial={() => (showTutorial = true)}
		on:settings={() => (showSettings = true)}
		on:reload={newGame}
	/>
	<p>
		{#if $mode === GameMode.ai}{aiModes[$settings.aiMode]}{/if}
		{modeData.modes[$mode].name} Mode.
		{#if $mode === GameMode.ai}
			<br />
			<button on:click={() => playAiGame(true)}>New Word</button>
			<input bind:value={aiSolution} />
			<button on:click={() => playAiGame()} >Solve</button>
		{:else if $mode === GameMode.solver}
			Enter the guess letters, then before clicking "Enter", 
			click on each letter as needed to change its color.
		{/if}
		<br />
		{#if appFromGameSvelte.errorString !== ""}
			<br /><br />{appFromGameSvelte.errorString}
		{/if}	
	</p>
	<Board
		bind:this={board}
		bind:app={appFromGameSvelte}
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
		bind:value={appFromGameSvelte.board.guesses[appFromGameSvelte.nGuesses === ROWS ? 0 : appFromGameSvelte.nGuesses]}
		on:submitWord={submitWord}
		on:esc={() => {
			showTutorial = false;
			showStats = false;
			showSettings = false;
		}}
		disabled={!appFromGameSvelte.active || $settings.tutorial === 3 || showHistorical}
	/>
</main>

<Modal
	bind:visible={showTutorial}
	on:close|once={() => $settings.tutorial === 3 && --$settings.tutorial}
	fullscreen={$settings.tutorial === 0}
>
	<Tutorial visible={showTutorial} app={appFromGameSvelte} />
</Modal>

<Modal bind:visible={showStats}>
	<h3>Statistics ({modeData.modes[$mode].name})</h3>
	<h3>{stats.played} Played, {stats.guesses.fail} Lost</h3>

	{#if modeData.modes[$mode].historical}
		<h3 class="historical">Statistics not updated for historical games</h3>
	{/if}
	<Statistics data={stats} />
	<Distribution distribution={stats.guesses} app={appFromGameSvelte} />

	{#if appFromGameSvelte.active}
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

	{#if showStats && appFromGameSvelte.nGuesses > 0 }
		{@const LL = calculateBotInfoArray2(appFromGameSvelte.botLeftMode)}
		{@const RR = calculateBotInfoArray2(appFromGameSvelte.botRightMode)}
		{@const modes = namesOf(BotMode)}
		<br /><h3>Bot Results {#if !appFromGameSvelte.active && $mode !== GameMode.solver}For Solution "{appFromGameSvelte.solution}"{/if}</h3>
		{#if appFromGameSvelte.status === GameStatus.lost && $mode !== GameMode.solver}
			<Definition word={appFromGameSvelte.solution} alternates={0} />
		{/if}
		{#each Array(Math.max(LL.length, RR.length)) as _, ri}
			<h1>Guess # {(ri + 1)}</h1>
			{#if ri < LL.length}
				<Definition word={LL[ri][0].toLowerCase()} alternates={0} />
			{/if}
			<div class="row">
				<section>
					{#if ri < LL.length}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<h4
							on:click|self={() => {
								appFromGameSvelte.botLeftMode = (appFromGameSvelte.botLeftMode + 1) % modes.length;
							}}
							on:contextmenu|preventDefault|self={() => {
								appFromGameSvelte.botLeftMode = (appFromGameSvelte.botLeftMode - 1 + modes.length) % modes.length;
							}}
						>
							{modes[appFromGameSvelte.botLeftMode]}<br />
						</h4>
					{/if}
				</section>
				<section>
					{#if ri < RR.length}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<h4
							on:click|self={() => {
								appFromGameSvelte.botRightMode = (appFromGameSvelte.botRightMode + 1) % modes.length;
							}}
							on:contextmenu|preventDefault|self={() => {
								appFromGameSvelte.botRightMode = (appFromGameSvelte.botRightMode - 1 + modes.length) % modes.length;
							}}
						>
							{modes[appFromGameSvelte.botRightMode]}<br />
						</h4>
					{/if}
				</section>
				<div class="new-row"></div>
				<section>
					{#if ri < LL.length}
						{LL[ri][0]}<br />
						{LL[ri][6]} Guess<br />
						{LL[ri][14]}% groups ({LL[ri][2]}/{LL[ri][5]})<br />
						{LL[ri][15]} largest group<br />
						{LL[ri][3].toLocaleString()} SoS<br /><br />
						{#if LL[ri][7]}
							{LL[ri][8]}<br />
							{LL[ri][17]}% eliminated<br />
							({LL[ri][9]}/{LL[ri][5]} words)<br />
							{LL[ri][11]}  words left
							{#if LL[ri][0].toLowerCase() !== appFromGameSvelte.solution}
								<br /><br />{LL[ri][13]}<br />
							{/if}
						{/if}
					{/if}
				</section>
				<section>
					{#if ri === 0}
						Same first guess<br />
						for all algorithms.
					{:else if ri < RR.length && ri > 0}
						{RR[ri][0]}<br />
						{RR[ri][6]} Guess<br />
						{RR[ri][14]}% groups ({RR[ri][2]}/{RR[ri][5]})<br />
						{RR[ri][15]} largest group<br />
						{RR[ri][3].toLocaleString()} SoS<br /><br />
						{#if RR[ri][7]}
							{RR[ri][8]}<br />
							{RR[ri][17]}% eliminated<br />
							({RR[ri][9]}/{RR[ri][5]} words)<br />
							{RR[ri][11]} words left
							{#if RR[ri][0].toLowerCase() !== appFromGameSvelte.solution}
								<br /><br />{RR[ri][13]}<br />
							{/if}
						{/if}
					{/if}
				</section>
			</div>
		{/each}
	{/if}

	<br />
	<Separator visible={!appFromGameSvelte.active}>
		<Timer
			slot="1"
			bind:this={timer}
			on:timeup={() => (showRefresh = true)}
			on:reload={newGame}
		/>
		<Share slot="2" game={appFromGameSvelte} />
	</Separator>
	<ShareGame bind:appFromShareGameSvelte={appFromGameSvelte} />
	<br />

	<div class="row">
		The Wordle dictionary contains {words.answers.length.toLocaleString()} possible 
		solutions and {words.otherGuesses.length.toLocaleString()} additional other
		words you may use as guesses.<br /><br />
		
		The NYT Wordle possible solutions dictionary excludes: 
		proper nouns, plural nouns that end in S or ES, 
		and past tense verbs that end in ED.<br /><br />

		If row hints are ON, after you have typed the 5 letters of
		your guess but before you hit "ENTER", the Row Hint shows an
		"x" if your guess is not in the Wordle solution dictionary, 
		a single check "&check;" if your guess is in the Wordle
		solution dictionay, and a double check "&check;&check;"
		if your guess is one of the words left after the prior guess.
	</div>
	<div class="row">
		Top NYT WordleBot openers (each 
		with 97+ NYT WordleBot score): {appFromGameSvelte.openers}.
	</div>
	<div class="row">
		All Bot and AI Algorithms...<br /><br />

		The algorithm uses the first human guess as its first guess.<br /><br />

		For the last guess (guess 6), all "words left" from the 
		previous guess are equally
		likely to win or lose, and the algorithm selects one
		of them as its guess.<br /><br />
		
		A "Hard" algorithm must select each guess from  
		the "words left" list of the previous guess.<br /><br />

		An "Easy" algorithm is allowed to use any word in its
		Wordle solution dictionary as a guess.<br /><br />

		A "Bot" algorithm selects each guess based on "human" history
		(based on the previous human guesses).<br /><br />

		An "AI" algoritm selects each guess based on "AI" history
		(based on the previous AI guesses).<br /><br />

		A "perfect" (100%) guess is one that creates as many groups as 
		there were remaining answers before the guess.<br /><br />
		
		The algorithm starts by searching through the "words left" list
		of the prior guess. If the algoritm finds
		a perfect Hard guess, it skips the next step.<br /><br />

		Otherwise the algoritm will 
		continue searching through a portion 
		of the Wordle solution dictionary for a 
		possibly better Easy guess.
	</div>
	<div class="row">
		The Max % Groups Algorithms.<br /><br />
		
		For guesses 2 to 5, the algorithm selects a
		guess that maximizes number of groups,
		which also maximizes the % groups because<br />
		%groups = 100 * nGroups / nWordsLeftBeforeGuess.
	</div>
	<div class="row">
		The Min Sum of Squares Algorithms.<br /><br />

		In the table above, "SoS" stands for "Sum of Squares".<br /><br />
		
		For guesses 2 to 5, the algorithm selects a
		guess that minimizes sum of squares.<br /><br />

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
	<div class="row">
		The "words left" list is sorted first into subsets by 
		the number of groups each of the remaining words produces.
		The number of groups for the subset is shown at the 
		beginning of the subset.<br /><br />

		Each subset is sorted in ascending order by the "Sum of Squares"
		produced by each word.
	</div>

</Modal>

<Modal fullscreen={true} bind:visible={showSettings}>
	<Settings app={appFromGameSvelte} on:historical={() => (showHistorical = true)} />
	{#if appFromGameSvelte.active}
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
				{modeData.modes[$mode].name} word #{appFromGameSvelte.solutionIndex}
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
		overflow-y: auto;
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
		flex-wrap: wrap;
	}
	.new-row {
  		flex-basis: 100%;
  		height: 0;
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
