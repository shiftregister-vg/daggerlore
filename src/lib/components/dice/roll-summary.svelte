<script lang="ts">
	import { getDiceContext } from '$lib/state/dice.svelte';
	import { cn } from '$lib/utils';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import type { DiceType, Roll } from '@domain/schemas/dice';
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
	import type { Component } from 'svelte';

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

	let {
		roll,
		size = 'default',
		variant = 'default',
		disabled = false,
		allowDieReroll = false,
		beforeDieReroll,
		class: className = ''
	}: {
		roll: Roll;
		size?: 'default' | 'sm';
		disabled?: boolean;
		allowDieReroll?: boolean;
		beforeDieReroll?: () => void;
		class?: string;
		variant?: 'default' | 'gm';
	} = $props();

	const diceCtx = getDiceContext();

	const isRolling = $derived(roll.status === 'rolling');
	const rollText = $derived(diceCtx.getDescription(roll));
	const isReroll = $derived(roll.isReroll === true);
</script>

<div
	class={cn(
		'pointer-events-auto flex flex-col rounded-2xl border-2 border-primary-muted bg-card px-3 py-2 shadow-xl',
		rollText === 'Critical Success' && 'bg-gradient-to-r from-card to-emerald-950',
		rollText === 'with Fear' && 'bg-gradient-to-r from-card to-fear-muted',
		rollText === 'with Hope' && 'bg-gradient-to-r from-card to-hope-muted',
		size === 'sm' ? 'max-w-60 sm:max-w-71' : 'w-60 sm:w-71',
		disabled && 'pointer-events-none cursor-auto',
		className
	)}
>
	{#if size === 'default'}
		<!-- Individual dice results -->
		<div class="my-1 flex flex-1 flex-wrap items-center gap-2">
			{#each roll.dice as dice, dieIndex}
				{@const DiceComponent = DICE_COMPONENTS[dice.type]}
				{@const isPendingRerollDie =
					isRolling && (roll.rerollingDieIndices?.includes(dieIndex) ?? false)}
				{@const canRerollDie =
					allowDieReroll && !disabled && !isRolling && dice.result !== undefined}
				{#if canRerollDie}
					<button
						type="button"
						class={cn(
							'relative transition-transform hover:brightness-120',
							canRerollDie && 'cursor-pointer'
						)}
						onclick={() => {
							beforeDieReroll?.();
							void diceCtx.rerollDie(roll, dieIndex);
						}}
					>
						<DiceComponent class="size-9" />
						<div
							class="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-background px-1.5 pt-0.5 pb-[1px] text-xs font-bold"
						>
							{dice.type === 'disadvantage' ? '-' : ''}{dice.result}
						</div>
					</button>
				{:else}
					<div class="relative {isPendingRerollDie ? 'opacity-50' : ''}">
						<DiceComponent class="size-9" />
						{#if !isPendingRerollDie && dice.result !== undefined}
							<div
								class="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-background px-1.5 pt-0.5 pb-[1px] text-xs font-bold"
							>
								{dice.type === 'disadvantage' ? '-' : ''}{dice.result}
							</div>
						{/if}
					</div>
				{/if}
			{/each}
			{#if roll.modifier !== 0}
				<div class="flex size-9 items-center justify-center gap-1">
					{#if roll.modifier > 0}
						<span class="font-eveleth text-xl">+</span>
					{:else}
						<span class="font-eveleth text-xl">-</span>
					{/if}
					<span class="font-eveleth text-xl">{Math.abs(roll.modifier)}</span>
				</div>
			{/if}
			{#each roll.adjustments ?? [] as adjustment, adjustmentIndex (adjustmentIndex)}
				<div class="flex h-9 items-center gap-1" title={adjustment.label}>
					<span class="font-eveleth text-xl">{adjustment.amount < 0 ? '-' : '+'}</span>
					<span class="font-eveleth text-xl">{Math.abs(adjustment.amount)}</span>
				</div>
			{/each}
			{#if roll.swapped}
				<span class="text-xs text-muted-foreground">Hope and Fear swapped</span>
			{/if}
		</div>
	{/if}

	<!-- Total -->
	<div class="flex h-6 items-center justify-between gap-3">
		<div class="flex min-w-0 items-center gap-1.5">
			<span class="truncate text-sm font-bold text-nowrap"
				>{roll.name}:
				{#if isReroll}
					<span class="truncate text-xs font-bold text-muted-foreground">(rerolled)</span>
				{/if}
			</span>
		</div>
		{#if isRolling}
			<Loader2 class="size-5 animate-spin" />
		{:else if roll.dice[0].result === undefined}
			<span class="text-sm font-bold">Canceled</span>
		{:else}
			<div class="flex items-center gap-2">
				<span class="font-eveleth text-xl">
					{diceCtx.getTotal(roll)}
				</span>
				<span class="text-sm font-bold text-nowrap">{rollText}</span>
			</div>
		{/if}
	</div>
</div>
