<script lang="ts">
	import { createEventDispatcher, getContext } from "svelte";
	import { scale } from "svelte/transition";
	import { mode, showRowHints } from "../stores";
	import { modeData, timeRemaining } from "../utils";
	import type { Toaster } from "./widgets";

	export let showStats: boolean;
	export let tutorial: boolean;
	export let showRefresh: boolean;

	export const toaster = getContext<Toaster>("toaster");

	const dispatch = createEventDispatcher();
	mode.subscribe((m) => {
		if (timeRemaining(modeData.modes[m]) > 0) {
			showRefresh = false;
		}
	});

	export function toggleShowRowHints() { 
		$showRowHints = !$showRowHints;
		return showRowHints;
	}

	export function updateRowHints() {
		return $showRowHints = $showRowHints;
	}

</script>

<header>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<p on:click|self={() => {dispatch("reload");}} >
		{#if showRefresh}&#10227;{:else}&#10710;{/if}
	</p>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<p
		on:click|self={() => {
			$mode = ($mode + 1) % modeData.modes.length;
		}}
		on:contextmenu|preventDefault|self={() => {
			$mode = ($mode - 1 + modeData.modes.length) % modeData.modes.length;
		}}
	>
		&nbsp;Wordle+
	</p>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<p on:click|self={() => {dispatch("tutorial");}} >
		&nbsp;&#9072;
	</p>
	{#if showStats}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<p on:click|self={() => {dispatch("stats");}} >
			&nbsp;&#128202;
		</p>
	{/if}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<p on:click|self={() => {dispatch("settings");}} >
		&nbsp;&#9881;
	</p>
	{#if tutorial}
		<div
			transition:scale
			class="tutorial"
			on:click={() => dispatch("closeTutPopUp")}
			on:keydown={() => dispatch("closeTutPopUp")}
		>
			Swipe board or tap WORDLE+ to change game mode
			<span class="ok">OK</span>
		</div>
	{/if}
</header>

<style lang="scss">
	header {
		--height: 51px;
		position: sticky; 
		top: 0; 
		left: 0; 
		right: 0; 
		z-index: 1;
		padding: 5px;

		font-weight: 500;
		letter-spacing: 0.1rem;
		display: flex;
		justify-content: left;
		align-items: center;
		border-bottom: 1px solid var(--border-primary);
		width: 100%;
		height: var(--height);
		font-size: var(--fs-large);
		background: var(--bg-primary);
		margin-bottom: 10px;
	}
	p {
		cursor: pointer;
	}
</style>
