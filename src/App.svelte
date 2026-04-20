<script context="module" lang="ts">
	import {
		modeData,
		Stats,
		GameState,
		Settings,
		LetterStates,
	} from "./utils";
	import Game from "./components/Game.svelte";
	import { letterStates, settings, mode } from "./stores";
	import { GameMode } from "./enums";
	import { Toaster } from "./components/widgets";
	import { setContext } from "svelte";
	import {maxAnswersIndex} from "./words_5";


	document.title = "Wordle+ | An unlimited word guessing game";

</script>

<script lang="ts">
	export let version: string;
	console.log(`Wordle version ${version} restarted`);
	let app: GameState;
	setContext("version", version);
	localStorage.setItem("version", version);
	let stats: Stats;
	let toaster: Toaster;

	settings.set(new Settings(localStorage.getItem("settings")));
	settings.subscribe((s) => localStorage.setItem("settings", JSON.stringify(s)));

	const hash = window.location.hash.slice(1).split("/");
	console.log("1:", hash);
	const modeVal: GameMode = !isNaN(GameMode[hash[0]])
		? GameMode[hash[0]]
		: +localStorage.getItem("mode") || modeData.default;
	mode.set(modeVal);
	mode.subscribe((m) => {
		localStorage.setItem("mode", `${m}`);
		stats = new Stats(localStorage.getItem(`stats-${m}`) || m);
		console.log("2:", hash);
		if (!isNaN(+hash[1]) && +hash[1] <= maxAnswersIndex && +hash[1] >= 0) {
			// modeData.modes[modeVal].historical = true;
			app = new GameState(m, +hash[1]);
		} else {
			app = new GameState(m);
		}
		letterStates.set(new LetterStates(app.board));
	});

</script>

<Toaster bind:this={toaster} />
{#if toaster}
	<Game {stats} bind:app={app} {toaster} />
{/if}
