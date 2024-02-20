<script context="module" lang="ts">
	const tips = [
		"You can change the gamemode by clicking WORDLE+ or swiping the board left or right.",
		'In AI Mode, the Bot makes the "Human\'s" choices.',
		'In AI mode, click the "Refresh" icon in the upper left corner to watch the Bot play a randomly generated Wordle game.',
		'In Solver mode, the Bot helps you solve an external Wordle (a Wordle you are playing somewhere else).',
		'In Solver mode, enter the guess letters, then before clicking on "Enter", click on each letter as needed to change the letter\'s color.',
		"Double tap or right click a guess on the board to see its definition and to see the Bot's hints and recommendations.",
		'Click the "+/-" ("Show/Hide") icon in the upper left side to show or hide the row hints.',
		'Each Row Hint shows g groups created by the row guess and w words remaining after the row guess.',
		"Hard mode is game mode specific. Turning it on in one game mode won't change it on the others.",
		"Hard mode can be enabled during a game if you haven't violated the hard mode rules yet.",
		"Because words are chosen from the list randomly it is possible to get the same word again.",
		"When you see the refresh button in the top left corner it means a new word is ready.",
		"Everyone has the same wordle at the same time. Your word #73 is the same as everyone elses #73.",
		"There are more valid guesses than possible solutions, ie. not all 5 letter words can be selected as an answer by the game.",
		"Historical games don't count towards your stats. Historical games are when you follow a link to a specific game number.",
		"Only the data for latest historical game is saved for each game mode.",
		'To run the hidden, dangerous "Reset Your Stats" function... After clicking on the "Settings" icon (the gear icon in the upper right corner), hover your mouse over the words "Infinite word #xyz" in the bottom right corner and the following message will pop up: "double click to reset your stats". After you double click, you will briefly see the "localStorage cleared" message and all your stats will be erased.',
	];
</script>

<script lang="ts">
	export let change: boolean;
	let index = Math.floor(tips.length * Math.random());
	$: if (change) index = Math.floor(tips.length * Math.random());

	function nextTip() {
		index = (index + 1) % tips.length;
	}
	function previousTip() {
		index = (index - 1 + tips.length) % tips.length;
	}
</script>

<div class="outer">
	<div class="number">Tip {index + 1}/{tips.length}</div>
	<div class="tip">{tips[index]}</div>
	<svg
		class="left"
		on:click={previousTip}
		on:keydown={previousTip}
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 100 100"
	>
		<path d="M75,0L25,50L75,100z" />
	</svg>
	<svg
		on:click={nextTip}
		on:keypress={nextTip}
		class="right"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 100 100"
	>
		<path d="M25,0L75,50L25,100z" />
	</svg>
</div>

<style lang="scss">
	.outer {
		margin: 15px auto;
		padding: 10px 20px;
		max-width: calc(0.6 * var(--game-width));
		border: solid 1px var(--border-secondary);
		background: var(--bg-secondary);
		border-radius: 4px;
		position: relative;
	}
	.number {
		text-align: center;
		font-weight: bold;
		font-size: 1.2em;
		margin-bottom: 10px;
	}
	.left,
	.right {
		cursor: pointer;
		position: absolute;
		border-radius: 4px;
		background: var(--fg-primary);
		fill: var(--bg-primary);
		height: 45px;
		padding: 10px 0;
		top: 50%;
	}
	.left {
		left: 0;
		transform: translate(-50%, -50%);
	}
	.right {
		right: 0;
		transform: translate(50%, -50%);
	}
	.tip {
		text-align: center;
		min-height: 70px;
	}
</style>
