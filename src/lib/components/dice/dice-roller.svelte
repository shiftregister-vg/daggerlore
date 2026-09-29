<script lang="ts">
	import type { DiceType, Roll, RollInput } from '@domain/schemas/dice';
	import { cn } from '$lib/utils';
	import { scale } from 'svelte/transition';
	import X from '@lucide/svelte/icons/x';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import History from '@lucide/svelte/icons/history';
	import D4 from './svg-components/d4.svelte';
	import D6 from './svg-components/d6.svelte';
	import D8 from './svg-components/d8.svelte';
	import D10 from './svg-components/d10.svelte';
	import D12 from './svg-components/d12.svelte';
	import D20 from './svg-components/d20.svelte';
	import Hope from './svg-components/hope.svelte';
	import Fear from './svg-components/fear.svelte';
	import Advantage from './svg-components/advantage.svelte';
	import Disadvantage from './svg-components/disadvantage.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { getDiceContext } from '$lib/state/dice.svelte';
	import DiceLog from './dice-log-sheet.svelte';
	import type { Component } from 'svelte';

	let {
		class: className = '',
		variant = 'default'
	}: { variant?: 'default' | 'gm'; class?: string } = $props();

	const diceCtx = getDiceContext();

	const STANDARD_DICE_PICKER_CONFIG = [
		{ type: 'd4' as DiceType, buttonClass: '' },
		{ type: 'd6' as DiceType, buttonClass: '' },
		{ type: 'd8' as DiceType, buttonClass: '' },
		{ type: 'd10' as DiceType, buttonClass: '' },
		{ type: 'd12' as DiceType, buttonClass: '' },
		{ type: 'd20' as DiceType, buttonClass: 'mt-0.5 mb-1' }
	] as const;

	const DICE_COMPONENTS: Record<DiceType, Component> = {
		d4: D4,
		d6: D6,
		d8: D8,
		d10: D10,
		d12: D12,
		d20: D20,
		hope: Hope,
		hope_d20: D20,
		fear: Fear,
		advantage: Advantage,
		disadvantage: Disadvantage
	};

	// --- UI State ---
	let showPicker = $state(false);
	let showCurrentRoll = $state(false);
	let showHistory = $state(false);

	// Roll data (UI-specific - the roll being built in the picker)
	let currentRoll = $state<Roll>({
		id: crypto.randomUUID(),
		name: 'Custom',
		dice: [],
		modifier: 0,
		status: 'complete',
		timestamp: Date.now()
	});

	diceCtx.onRollStart(() => {
		showPicker = false;
		showCurrentRoll = false;
		resetCurrentRoll();
	});

	diceCtx.onPickerOpen((input) => {
		currentRoll = {
			id: crypto.randomUUID(),
			name: input.name ?? 'Custom',
			dice: input.dice.map((die) => ({ type: die.type })),
			modifier: input.modifier ?? 0,
			status: 'complete',
			timestamp: Date.now(),
			context: input.context
		};
		showPicker = true;
		showCurrentRoll = currentRoll.dice.length > 0;
	});

	// --- Reset / clear ---
	function resetCurrentRoll() {
		currentRoll = {
			id: crypto.randomUUID(),
			name: 'Custom',
			dice: [],
			modifier: 0,
			status: 'complete',
			timestamp: Date.now()
		};
	}

	// --- Roll execution ---
	async function handleRoll() {
		if (currentRoll.dice.length === 0) return;

		diceCtx.cancelActiveRoll();
		showCurrentRoll = false;
		showPicker = false;

		const diceToRoll = currentRoll.dice.map((d) => ({ type: d.type }));
		const rollName = currentRoll.name;
		const rollModifier = currentRoll.modifier;
		const rollContext = currentRoll.context;

		resetCurrentRoll();

		diceCtx.roll({
			name: rollName,
			dice: diceToRoll,
			modifier: rollModifier,
			context: rollContext
		});

		// The effect will handle opening showLastRoll when the new roll appears
	}

	// --- Exported roll function ---
	export function roll(input: RollInput) {
		// Use the state's roll function
		diceCtx.roll(input);

		// Show currentRoll section, keep picker hidden
		showCurrentRoll = true;
		showPicker = false;
	}

	$effect(() => {
		// Show the form when dice are added, hide when all dice are removed
		if (currentRoll.dice.length > 0) {
			showCurrentRoll = true;
		} else {
			showCurrentRoll = false;
		}
	});

	// $effect(() => {
	// 	const handler = () => diceCtx.cancelActiveRoll();
	// 	window.addEventListener('pointerdown', handler);
	// 	return () => window.removeEventListener('pointerdown', handler);
	// });
</script>

<DiceLog bind:open={showHistory} />

<div
	class={cn(
		'pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] left-[calc(env(safe-area-inset-left)+16px)] z-45 flex items-end gap-2',
		className
	)}
>
	<!-- dice picker -->
	<div
		class={cn(
			'pointer-events-auto flex max-h-[calc(100vh-env(safe-area-inset-bottom)-env(safe-area-inset-top)-32px)] min-h-0 grow flex-col gap-2  rounded-2xl border-2 border-primary-muted bg-card p-1 shadow-xl',
			showPicker && 'pt-4'
		)}
	>
		{#if showPicker}
			<div class="flex min-h-0 flex-col items-center gap-2 overflow-x-hidden overflow-y-auto">
				{#each STANDARD_DICE_PICKER_CONFIG as config}
					{@const DiceComponent = DICE_COMPONENTS[config.type]}
					<button
						title={config.type}
						class="relative {config.buttonClass}"
						onclick={() => {
							currentRoll.dice.push({ type: config.type });
						}}
					>
						<DiceComponent showLabel />
					</button>
				{/each}
				<button
					title="Duality"
					class="relative h-12 min-h-12 w-12 min-w-12"
					onclick={() => {
						if (!currentRoll.dice.some((die) => die.type === 'hope')) {
							currentRoll.dice.push({ type: 'hope' });
						}
						if (!currentRoll.dice.some((die) => die.type === 'fear')) {
							currentRoll.dice.push({ type: 'fear' });
						}
					}}
				>
					<Fear class="absolute top-0 left-0 size-3/4" />
					<Hope class="absolute right-0 bottom-1/16 size-3/4" />
				</button>
			</div>
		{/if}

		<button
			class="flex size-12 shrink-0 items-center justify-center"
			onclick={() => {
				showPicker = !showPicker;
				if (!showPicker) {
					showCurrentRoll = false;
					resetCurrentRoll();
				}
			}}
		>
			{#if showPicker}
				<X class="size-6" />
			{:else if variant === 'gm'}
				<D20 />
			{:else}
				<Hope />
			{/if}
		</button>
	</div>

	<!-- current roll / last roll section (visible independently of picker) -->
	{#if showCurrentRoll}
		<div
			class={cn(
				'pointer-events-auto flex w-71 flex-col gap-2 rounded-2xl border-2 border-primary-muted bg-card p-3 shadow-xl'
			)}
		>
			<!-- chosen dice -->
			<div class="flex flex-wrap items-center gap-2">
				{#each currentRoll.dice as dice, index}
					{@const DiceComponent = DICE_COMPONENTS[dice.type]}
					<button
						transition:scale={{ duration: 100 }}
						onclick={() => {
							currentRoll.dice.splice(index, 1);
						}}
					>
						<DiceComponent class="size-9" />
					</button>
				{/each}
				{#if currentRoll.modifier !== 0}
					<div class="flex size-9 items-center justify-center gap-1">
						{#if currentRoll.modifier > 0}
							<span class="font-eveleth text-xl">+</span>
						{:else}
							<span class="font-eveleth text-xl">-</span>
						{/if}
						<span class="font-eveleth text-xl">{Math.abs(currentRoll.modifier)}</span>
					</div>
				{/if}
			</div>

			<!-- advantage / disadvantage and modifier -->
			<div class="mt-1 flex items-center gap-2">
				<button
					class="h-7 w-14 rounded bg-emerald-800 text-center text-sm font-bold hover:bg-emerald-800/70"
					onclick={() => {
						currentRoll.dice.push({ type: 'advantage' });
					}}
				>
					+ Adv
				</button>
				<button
					class="h-7 w-14 rounded bg-rose-800 text-center text-sm font-bold hover:bg-rose-800/70"
					onclick={() => {
						currentRoll.dice.push({ type: 'disadvantage' });
					}}
				>
					- Dis
				</button>

				<div class="mx-auto flex items-center gap-2">
					<Button
						size="sm"
						variant="secondary"
						class="size-6 p-0"
						onclick={() => {
							currentRoll.modifier = currentRoll.modifier - 1;
						}}
					>
						<Minus class="size-4" />
					</Button>
					<p class="text-sm font-bold">Modifier</p>
					<Button
						size="sm"
						variant="secondary"
						class="size-6 p-0"
						onclick={() => {
							currentRoll.modifier = currentRoll.modifier + 1;
						}}
					>
						<Plus class="size-4" />
					</Button>
				</div>
			</div>

			<!-- Roll button -->
			<Button
				size="sm"
				class="mt-1 h-7 font-bold"
				onclick={handleRoll}
				disabled={currentRoll.dice.length === 0}
			>
				Roll
			</Button>
		</div>
	{/if}
</div>

<style>
	/* svelte-ignore a11y-no-onchange */
	:global(#dice-box canvas) {
		width: 100% !important;
		height: 100% !important;
		display: block;
	}
</style>
