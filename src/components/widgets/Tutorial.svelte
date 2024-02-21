<script lang="ts">
	import { COLS, ROWS, GameState } from "../../utils";
	import { Tile } from "../board";

	export let app: GameState;
	export let visible: boolean;
</script>

<h3>how to play</h3>
<div>Guess the <strong>WORDLE</strong> in {ROWS} tries.</div>
<div>Each guess must be a valid {COLS} letter word. Hit the enter button to submit.</div>
<div>
	After each guess, the color of the tiles will change to show how close your guess was to the
	word.
</div>
<div class:complete={visible} class="examples">
	<div><strong>Examples</strong></div>
	<div class="row">
		<Tile value="w" state="🟩" app={app} />
		<Tile value="e" state="🔳" app={app} />
		<Tile value="a" state="🔳" app={app} />
		<Tile value="r" state="🔳" app={app} />
		<Tile value="y" state="🔳" app={app} />
	</div>
	<div>The letter <strong>W</strong> is in the word and in the correct spot.</div>
	<div class="row">
		<Tile value="p" state="🔳" app={app} />
		<Tile value="i" state="🟨" app={app} />
		<Tile value="l" state="🔳" app={app} />
		<Tile value="l" state="🔳" app={app} />
		<Tile value="s" state="🔳" app={app} />
	</div>
	<div>The letter <strong>I</strong> is in the word but in the wrong spot.</div>
	<div class="row">
		<Tile value="v" state="🔳" app={app} />
		<Tile value="a" state="🔳" app={app} />
		<Tile value="g" state="🔳" app={app} />
		<Tile value="u" state="⬛" app={app} />
		<Tile value="e" state="🔳" app={app} />
	</div>
	<div>The letter <strong>U</strong> is not in the word in any spot.</div>
</div>
<div>
	This is a recreation of the original <a
		href="https://www.nytimes.com/games/wordle/"
		target="_blank"
		rel="noreferrer">Wordle</a
	>
	by Josh Wardle with additional modes and features, allowing you to play infinite wordles. Switch
	to infinite mode to play an unlimited number of times.
	<br /><br />
	Open the settings menu to see some of the additional features.
	<br /><br />
	Originally written with Svelte, in Typescript by
	<a href="https://github.com/MikhaD" target="_blank" rel="noreferrer">MikhaD</a>.
	<br /><a href="https://github.com/MikhaD/wordle" 
	target="_blank" rel="noreferrer">Original Source Code</a>.
	<br /><br />
	Forked by craig382 to add new features (e.g. row hints and a Bot) 
	and new modes (AI Mode and Solver Mode).
	<br /><a href="https://github.com/craig382/wordle" 
	target="_blank" rel="noreferrer">craig382 Source Code</a>.
</div>

<style lang="scss">
	div {
		margin: 14px 0;
	}
	.examples {
		border-top: 1px solid var(--border-primary);
		border-bottom: 1px solid var(--border-primary);
		:global(.row > *) {
			height: 100%;
			aspect-ratio: 1;
		}
		&:not(.complete) :global(.row .back) {
			transition-delay: 0.3s;
		}
	}
	.row {
		height: 40px;
		display: flex;
		gap: 4px;
	}
</style>
