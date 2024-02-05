<script context="module" lang="ts">
	import {
		modeData,
		seededRandomInt,
		Stats,
		GameState,
		Settings,
		LetterStates,
		getWordNumber,
		words,
        GameBot,
	} from "./utils";
	import Game from "./components/Game.svelte";
	import { letterStates, settings, mode } from "./stores";
	import { GameMode } from "./enums";
	import { Toaster } from "./components/widgets";
	import { setContext } from "svelte";

	document.title = "Wordle+ | An infinite word guessing game";
</script>

<script lang="ts">
	export let version: string;
	setContext("version", version);
	localStorage.setItem("version", version);
	let stats: Stats;
	let solution: string;
	let game: GameState;
	let bot: GameBot;
	let toaster: Toaster;

	settings.set(new Settings(localStorage.getItem("settings")));
	settings.subscribe((s) => localStorage.setItem("settings", JSON.stringify(s)));

	const hash = window.location.hash.slice(1).split("/");
	const modeVal: GameMode = !isNaN(GameMode[hash[0]])
		? GameMode[hash[0]]
		: +localStorage.getItem("mode") || modeData.default;
	mode.set(modeVal);
	// If this is a link to a specific word make sure that that is the word
	if (!isNaN(+hash[1]) && +hash[1] < getWordNumber(modeVal)) {
		modeData.modes[modeVal].seed =
			(+hash[1] - 1) * modeData.modes[modeVal].unit + modeData.modes[modeVal].start;
		modeData.modes[modeVal].historical = true;
	}
	mode.subscribe((m) => {
		localStorage.setItem("mode", `${m}`);
		window.location.hash = GameMode[m];
		stats = new Stats(localStorage.getItem(`stats-${m}`) || m);
		solution = words.answers[seededRandomInt(0, words.answers.length, modeData.modes[m].seed)];
		if (modeData.modes[m].historical) {
			game = new GameState(m, localStorage.getItem(`state-${m}-h`));
		} else {
			game = new GameState(m, localStorage.getItem(`state-${m}`));
		}
		// Set the letter states when data for a new game mode is loaded so the keyboard is correct
		letterStates.set(new LetterStates(game.board));
	});

	$: saveState(game);
	function saveState(game: GameState) {
		if (modeData.modes[$mode].historical) {
			localStorage.setItem(`state-${$mode}-h`, game.toString());
		} else {
			localStorage.setItem(`state-${$mode}`, game.toString());
		}
	}
</script>

<Toaster bind:this={toaster} />
{#if toaster}
	<Game {stats} bind:solution={solution} {toaster} bind:game={game} bind:bot={bot}/>
{/if}
