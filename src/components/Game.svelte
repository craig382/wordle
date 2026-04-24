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
	} from "../utils";
	import { letterStates, settings, mode, showRowHints } from "../stores";
    import { GameMode } from "../enums";
	import {words} from "../words_5";


	export let stats: Stats;
	export let appG: GameState;
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

//	newGame();

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
				[ gid, errorIndex ] = groupIdFromColors(appG.nGuesses);
				appG.guessGroupIds[appG.nGuesses] = gid;
				if (gid === "#####") appG.solution = appG.board.guesses[appG.nGuesses];
				else if (appG.nGuesses < (ROWS - 1)) appG.board.state[appG.nGuesses + 1].fill("⬛");
			} else appG.board.state[appG.nGuesses] = appG.guess(appG.solution);
			try {
				appG.updateBot();
				if (appG.status === GameStatus.won) win();
				else if (appG.status === GameStatus.lost) lose();
				$showRowHints = $showRowHints;
				$letterStates.update(appG.lastState, appG.lastWord);
				$letterStates = $letterStates;
			} catch (e) { console.log(e); }
	}

	function submitWord() {
		if (appG.latestWord.length !== COLS) {
			toaster.pop("Not enough letters");
			board.shake(appG.nGuesses);
		} else if (words.contains(appG.latestWord)) {
			if (appG.nGuesses > 0) {
				// In Solver mode, user enters guessId here.
				const hm = appG.checkHardMode();
				if ($settings.hard[$mode]) {
					if (hm.type === "🟩") {
						toaster.pop(
							`${contractNum(hm.pos + 1)} letter must be ${hm.char.toUpperCase()}`
						);
						board.shake(appG.nGuesses);
						return;
					} else if (hm.type === "🟨") {
						toaster.pop(`Guess must contain ${hm.char.toUpperCase()}`);
						board.shake(appG.nGuesses);
						return;
					}
				} else if (hm.type !== "⬛") {
					appG.validHard = false;
				}
			}
			processValidGuess();
		} else {
			toaster.pop("Not in word list");
			board.shake(appG.nGuesses);
		}
	}

	function win() {
		board.bounce(appG.nGuesses - 1);
		appG.status = GameStatus.won;
		setTimeout(
			() => toaster.pop(PRAISE[appG.nGuesses - 1]),
			DELAY_INCREMENT * COLS + DELAY_INCREMENT
		);
		setTimeout(setShowStatsTrue, delay * 1.4);
		stats.addWin(appG.nGuesses);
		stats = stats; // tell svelte to react to change in stats
		localStorage.setItem(`stats-${$mode}`, stats.toString());
	}

	function lose() {
		appG.status = GameStatus.lost;
		setTimeout(setShowStatsTrue, delay);
		stats.addLoss();
		stats = stats; // tell svelte to react to change in stats
		localStorage.setItem(`stats-${$mode}`, stats.toString());
	}

	function concede() {
		showSettings = false;
		setTimeout(setShowStatsTrue, DELAY_INCREMENT);
		lose();
	}

	async function playAiGame(randomWord: boolean = false) {

		// newGame() clears the board and
		// creates a new random solution and a default random opener.
		newGame();

		// New Word (randomWord) mode may use a chain mode or auto repeat opener.
		// Entered Word (non-randomWord) mode always uses the default random opener.  
		if (randomWord) {
			aiSolution = appG.solution;
			switch (appSettings.openerMode) {
				case OpenerModes["Chain Mode"]:
					appG.opener = appSettings.prevSolution;
				break;
				case OpenerModes["Auto Repeat"]:
					appG.opener = appSettings.prevOpener;
				break;
			}
		} 

		let ais = aiSolution.toLowerCase();
		let aiBot: Array<BotNode>;
		if (words.answers.includes(ais)) appG.solution = ais;
		else aiSolution = appG.solution;

		// Processing the opener calculates the bot tree and ai row arrays.
		appG.board.guesses[0] = appG.opener;
		processValidGuess(); 

		switch ($settings.aiMode) {
			case aiModes["Max % Groups Hard"]: 
				aiBot = appG.aiMaxGroupsHard;
				appG.botLeftMode = BotMode["AI Max % Groups Hard"];
				appG.botRightMode = BotMode["AI Min Sum of Squares Hard"]; 
			break;
			case aiModes["Max % Groups Easy"]: 
				aiBot = appG.aiMaxGroupsEasy; 
				appG.botLeftMode = BotMode["AI Max % Groups Easy"];
				appG.botRightMode = BotMode["AI Min Sum of Squares Easy"]; 
			break;
			case aiModes["Min Sum of Squares Hard"]: 
				aiBot = appG.aiMinSumOfSquaresHard; 
				appG.botLeftMode = BotMode["AI Min Sum of Squares Hard"];
				appG.botRightMode = BotMode["AI Max % Groups Hard"]; 
			break;
			case aiModes["Min Sum of Squares Easy"]: 
				aiBot = appG.aiMinSumOfSquaresEasy; 
				appG.botLeftMode = BotMode["AI Min Sum of Squares Easy"];
				appG.botRightMode = BotMode["AI Max % Groups Easy"]; 
			break;
		}

		for (let ri = 1; ri < aiBot.length; ri++) {
			appG.board.guesses[ri] = aiBot[ri].guess;
			processValidGuess();
		}

		// console.log("playAiGame:", aiModes[$settings.aiMode], aiBot);
	}

	onMount(() => {
		newGame();
	});

	function newGame() {
		// console.log("Game newGame $mode", $mode);
		modeData.modes[$mode].seed = newSeed($mode);
		appG = new GameState($mode);
		$letterStates = new LetterStates();
		showStats = false;
		showRefresh = false;
		timer.reset($mode);

		if (appSettings.openerMode === OpenerModes["Random NYT WordleBot"] || 
			appG.gameMode === GameMode.ai || appSettings.prevSolution === "") {
			let openersArray = appG.openers.split(" ");
			appG.opener = randomSample(openersArray);
		} else if (appSettings.openerMode === OpenerModes["Auto Repeat"]) {
			appG.opener = appSettings.prevOpener;
		} else appG.opener = appSettings.prevSolution; // Chain mode opener.

		// Use auto opener rules...
		// 1) AI mode uses playAiGame() to set and process the opener.
		// 2) Solver mode never uses auto opener.
		// 3) All other modes use auto opener if openerMode is not manual.
		let autoOpener: boolean = false;
		if (appG.gameMode === GameMode.solver || appG.gameMode === GameMode.ai) 
			autoOpener = false;
		else autoOpener = (appSettings.openerMode !== OpenerModes.Manual);
		if (autoOpener) {
			appG.board.guesses[0] = appG.opener;
			processValidGuess(); 
		}

		console.log("newGame:", appG);
	}

	function setShowStatsTrue() {
		if (!appG.active) showStats = true;
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

<main class:guesses={appG.nGuesses !== 0} style="--rows: {ROWS}; --cols: {COLS}">
	<Header
		bind:showRefresh
		tutorial={$settings.tutorial === 2}
		on:closeTutPopUp|once={() => ($settings.tutorial = 1)}
		showStats={stats.played > 0}
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
		{#if appG && appG.errorString !== ""}
			<br /><br />{appG.errorString}
		{/if}	
	</p>
	<Board
		bind:this={board}
		bind:appB={appG}
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
		bind:value={appG.board.guesses[appG.nGuesses === ROWS ? 0 : appG.nGuesses]}
		on:submitWord={submitWord}
		on:esc={() => {
			showTutorial = false;
			showStats = false;
			showSettings = false;
		}}
		disabled={!appG.active || $settings.tutorial === 3 || showHistorical}
	/>
</main>

<Modal
	bind:visible={showTutorial}
	on:close|once={() => $settings.tutorial === 3 && --$settings.tutorial}
	fullscreen={$settings.tutorial === 0}
>
	<Tutorial visible={showTutorial} appTut={appG} />
</Modal>

<Modal bind:visible={showStats}>
	<h3>Statistics ({modeData.modes[$mode].name})</h3>
	<h3>{stats.played} Played, {stats.guesses.fail} Lost</h3>

	<Statistics data={stats} />
	<Distribution distribution={stats.guesses} appD={appG} />

	{#if appG.active}
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

	{#if showStats && appG.nGuesses > 0 }
		{@const LL = calculateBotInfoArray2(appG.botLeftMode)}
		{@const RR = calculateBotInfoArray2(appG.botRightMode)}
		{@const modes = namesOf(BotMode)}
		<br /><h3>Bot Results {#if !appG.active && $mode !== GameMode.solver}For Solution "{appG.solution}"{/if}</h3>
		{#if appG.status === GameStatus.lost && $mode !== GameMode.solver}
			<Definition word={appG.solution} alternates={0} />
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
								appG.botLeftMode = (appG.botLeftMode + 1) % modes.length;
							}}
							on:contextmenu|preventDefault|self={() => {
								appG.botLeftMode = (appG.botLeftMode - 1 + modes.length) % modes.length;
							}}
						>
							{modes[appG.botLeftMode]}<br />
						</h4>
					{/if}
				</section>
				<section>
					{#if ri < RR.length}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<h4
							on:click|self={() => {
								appG.botRightMode = (appG.botRightMode + 1) % modes.length;
							}}
							on:contextmenu|preventDefault|self={() => {
								appG.botRightMode = (appG.botRightMode - 1 + modes.length) % modes.length;
							}}
						>
							{modes[appG.botRightMode]}<br />
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
							{#if LL[ri][0].toLowerCase() !== appG.solution}
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
							{#if RR[ri][0].toLowerCase() !== appG.solution}
								<br /><br />{RR[ri][13]}<br />
							{/if}
						{/if}
					{/if}
				</section>
			</div>
		{/each}
	{/if}

	<br />
	<Separator visible={!appG.active}>
		<Timer
			slot="1"
			bind:this={timer}
			on:timeup={() => (showRefresh = true)}
			on:reload={newGame}
		/>
		<Share slot="2" appSh={appG} />
	</Separator>
	<ShareGame appShG={appG} />
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
		with 97+ NYT WordleBot score): {appG.openers}.
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
	<Settings appS={appG} on:historical={() => (showHistorical = true)} />
	{#if appG.active}
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
				{modeData.modes[$mode].name} word #{appG.solutionIndex}
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
