<script lang="ts">
	import type { FeaturePool, PoolDie } from '@domain/schemas/rules';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { getDiceContext } from '$lib/state/dice.svelte';
	import {
		poolCaption,
		poolDiceSlots,
		poolRefillAmount,
		poolTokens,
		refillPoolTokens,
		setPoolDice,
		setPoolDie,
		setPoolTokens
	} from '$lib/state/feature-pools';
	import { cn } from '$lib/utils';
	import D4 from '$lib/components/dice/svg-components/d4.svelte';
	import D6 from '$lib/components/dice/svg-components/d6.svelte';
	import D8 from '$lib/components/dice/svg-components/d8.svelte';
	import D10 from '$lib/components/dice/svg-components/d10.svelte';
	import D12 from '$lib/components/dice/svg-components/d12.svelte';
	import D20 from '$lib/components/dice/svg-components/d20.svelte';

	let {
		pool,
		tracker_key,
		tone = 'card',
		disabled = false,
		class: className = ''
	}: {
		pool: FeaturePool;
		/** Only set where the feature belongs to the character on this sheet. */
		tracker_key?: string;
		/** 'card' renders on the white card face; 'sheet' follows the sheet theme. */
		tone?: 'card' | 'sheet';
		disabled?: boolean;
		class?: string;
	} = $props();

	const DICE = { d4: D4, d6: D6, d8: D8, d10: D10, d12: D12, d20: D20 } satisfies Record<
		PoolDie,
		unknown
	>;

	const characterCtx = getCharacterContext();
	const diceCtx = getDiceContext();
	const character = $derived(characterCtx?.character);
	const tracker = $derived(
		tracker_key
			? characterCtx?.derived_character_data?.pool_trackers.find(
					(entry) => entry.key === tracker_key
				)
			: undefined
	);
	const canEdit = $derived(!!characterCtx?.canEdit && !disabled);
	const label = $derived(pool.label ?? (pool.kind === 'dice' ? 'Dice' : 'Tokens'));
	// Skip the label when it only repeats the feature's own title (e.g. "Prayer Dice").
	const showLabel = $derived(!pool.label || pool.label !== tracker?.feature_title);
	const caption = $derived(tracker ? poolCaption(tracker) : '');

	const tokens = $derived(
		character && tracker ? poolTokens(character.feature_pool_tokens ?? {}, tracker) : 0
	);
	const refillAmount = $derived(tracker ? poolRefillAmount(tracker) : undefined);
	const atCapacity = $derived(tracker?.capacity !== undefined && tokens >= tracker.capacity);

	const slots = $derived(
		character && tracker ? poolDiceSlots(character.feature_pool_dice ?? {}, tracker) : []
	);
	const Die = $derived(DICE[pool.die ?? 'd6']);
	let rolling = $state(false);

	function setTokens(value: number) {
		if (!character || !tracker || !canEdit) return;
		character.feature_pool_tokens = setPoolTokens(
			character.feature_pool_tokens ?? {},
			tracker,
			value
		);
	}

	function refill() {
		if (!character || !tracker || !canEdit) return;
		character.feature_pool_tokens = refillPoolTokens(character.feature_pool_tokens ?? {}, tracker);
	}

	async function rollDice(count: number): Promise<number[]> {
		if (!tracker?.die) return [];
		rolling = true;
		try {
			const results = await diceCtx.roll({
				name: label,
				dice: Array.from({ length: count }, () => ({ type: tracker!.die! }))
			});
			return results.map((result) => result.value);
		} finally {
			rolling = false;
		}
	}

	async function rollSlot(index: number) {
		if (!character || !tracker || !canEdit || rolling) return;
		const [value] = await rollDice(1);
		if (!value || !character) return;
		character.feature_pool_dice = setPoolDie(
			character.feature_pool_dice ?? {},
			tracker,
			index,
			value
		);
	}

	async function rollAll() {
		if (!character || !tracker || !canEdit || rolling || slots.length === 0) return;
		const values = await rollDice(slots.length);
		if (values.length === 0 || !character) return;
		character.feature_pool_dice = setPoolDice(character.feature_pool_dice ?? {}, tracker, values);
	}

	function spendDie(index: number) {
		if (!character || !tracker || !canEdit) return;
		character.feature_pool_dice = setPoolDie(character.feature_pool_dice ?? {}, tracker, index, 0);
	}

	const buttonClass = $derived(
		cn(
			'flex h-6 items-center justify-center rounded-full border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
			tone === 'card'
				? 'border-amber-600/60 text-black hover:bg-amber-100'
				: 'border-hope/50 text-foreground hover:bg-hope/10'
		)
	);
</script>

<div
	class={cn(
		'flex flex-col gap-1 text-xs',
		tone === 'card' ? 'items-center text-black' : 'text-foreground',
		className
	)}
	aria-label={caption ? `${label}, ${caption}` : label}
>
	<div class={cn('flex flex-wrap items-center gap-2', tone === 'card' && 'justify-center')}>
		{#if showLabel}
			<span class="font-bold">{label}</span>
		{/if}

		{#if tracker && pool.kind === 'tokens'}
			<button
				type="button"
				class={cn(buttonClass, 'w-6 px-0')}
				disabled={!canEdit || tokens === 0}
				aria-label={`Remove one from ${label}`}
				onclick={(event) => {
					event.stopPropagation();
					setTokens(tokens - 1);
				}}>−</button
			>
			<span
				class={cn(
					'flex size-7 items-center justify-center rounded-full border-2 text-sm font-bold',
					tone === 'card'
						? 'border-amber-600 bg-gradient-to-b from-yellow-300 to-amber-500 text-amber-950 shadow-[0_0_6px_rgba(245,158,11,0.45)]'
						: 'border-hope bg-hope text-background shadow-[0_0_8px_rgba(253,212,113,0.4)]'
				)}
				aria-live="polite">{tokens}</span
			>
			<button
				type="button"
				class={cn(buttonClass, 'w-6 px-0')}
				disabled={!canEdit || atCapacity}
				aria-label={`Add one to ${label}`}
				onclick={(event) => {
					event.stopPropagation();
					setTokens(tokens + 1);
				}}>+</button
			>
			{#if refillAmount !== undefined}
				<button
					type="button"
					class={buttonClass}
					disabled={!canEdit || tokens === refillAmount}
					onclick={(event) => {
						event.stopPropagation();
						refill();
					}}>Refill to {refillAmount}</button
				>
			{/if}
		{:else if tracker && pool.kind === 'dice'}
			{#each slots as value, index (index)}
				<button
					type="button"
					class={cn(
						'relative flex items-center justify-center transition-opacity',
						!canEdit && 'cursor-default',
						value === 0 && 'opacity-40'
					)}
					disabled={!canEdit || rolling}
					aria-label={value > 0
						? `Spend ${label} ${index + 1} (${value})`
						: `Roll ${label} ${index + 1}`}
					onclick={(event) => {
						event.stopPropagation();
						if (value > 0) spendDie(index);
						else void rollSlot(index);
					}}
				>
					<Die class="size-7" />
					{#if value > 0}
						<span
							class={cn(
								'pointer-events-none absolute inset-0 flex items-center justify-center pt-0.5 text-[11px] font-bold',
								tone === 'card' ? 'text-white' : 'text-background'
							)}>{value}</span
						>
					{/if}
				</button>
			{:else}
				<span class={tone === 'card' ? 'text-black/60' : 'text-muted-foreground'}>none</span>
			{/each}
			{#if slots.length > 0}
				<button
					type="button"
					class={buttonClass}
					disabled={!canEdit || rolling}
					onclick={(event) => {
						event.stopPropagation();
						void rollAll();
					}}>Roll all</button
				>
			{/if}
		{/if}
	</div>
	{#if caption}
		<span class={tone === 'card' ? 'text-black/60' : 'text-muted-foreground'}>{caption}</span>
	{/if}
</div>
