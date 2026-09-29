<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Traits, TraitId } from '@domain/schemas/rules';
	import { TRAITS } from '@domain/constants/rules';
	import { getDiceContext } from '$lib/state/dice.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { startRoll } from '$lib/components/dice/roll-gate';
	import type { RollInput } from '@domain/schemas/dice';

	let {
		class: className = '',
		traits,
		highlights,
		spellcastTraits
	}: {
		class?: string;
		traits: Traits;
		highlights?: Record<TraitId, boolean>;
		spellcastTraits?: Partial<Record<TraitId, boolean>>;
	} = $props();

	const diceCtx = getDiceContext();
	const characterCtx = getCharacterContext();
	const LONG_PRESS_DELAY_MS = 500;
	const SUPPRESS_CLICK_AFTER_LONG_PRESS_MS = 200;

	let longPressTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastLongPressAt = 0;

	function getTraitRollInput(trait: keyof Traits): RollInput {
		return {
			name: TRAITS[trait].name,
			dice: [{ type: 'hope' as const }, { type: 'fear' as const }],
			modifier: traits[trait] ?? 0,
			context: { kind: spellcastTraits?.[trait] ? 'spellcast' : 'trait', trait }
		};
	}

	function openTraitPicker(event: MouseEvent, trait: keyof Traits) {
		event.preventDefault();
		if (Date.now() - lastLongPressAt < 1000) return;
		diceCtx.openPicker(getTraitRollInput(trait));
	}

	function clearLongPressTimeout() {
		if (longPressTimeout === null) return;
		clearTimeout(longPressTimeout);
		longPressTimeout = null;
	}

	function rollTrait(trait: keyof Traits) {
		if (Date.now() - lastLongPressAt < SUPPRESS_CLICK_AFTER_LONG_PRESS_MS) {
			return;
		}
		startRoll(diceCtx, characterCtx, getTraitRollInput(trait));
	}

	function onpointerdown(event: PointerEvent, trait: keyof Traits) {
		if (event.pointerType === 'mouse') return;
		clearLongPressTimeout();
		longPressTimeout = setTimeout(() => {
			longPressTimeout = null;
			lastLongPressAt = Date.now();
			diceCtx.openPicker(getTraitRollInput(trait));
		}, LONG_PRESS_DELAY_MS);
	}

	function onpointerup() {
		clearLongPressTimeout();
	}

	function onpointercancel() {
		clearLongPressTimeout();
	}

	function onpointerleave() {
		clearLongPressTimeout();
	}
</script>

{#snippet trait(trait: keyof Traits)}
	{@const traitValue = traits[trait] ?? 0}
	{@const isHighlighted = highlights && highlights[trait]}
	{@const isSpellcast = spellcastTraits && spellcastTraits[trait]}
	<div class="mx-auto w-min">
		<button
			class={cn(
				'group relative select-none rounded-md',
				isSpellcast &&
					'trait-spellcast drop-shadow-[0_0_12px_hsl(var(--accent)/0.45)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background'
			)}
			onclick={() => rollTrait(trait)}
			oncontextmenu={(event) => openTraitPicker(event, trait)}
			onpointerdown={(event) => onpointerdown(event, trait)}
			{onpointerup}
			{onpointercancel}
			{onpointerleave}
		>
			<svg
				class={cn(
					'size-22 text-primary',
					isHighlighted && 'text-accent',
					isSpellcast && 'text-accent'
				)}
				xmlns="http://www.w3.org/2000/svg"
				viewBox="-9.199 3.544 58.968 48.466"
			>
				<path
					d="M 1.486 35.836 L -1.716 32.453 L -1.716 25.907 L 1.385 29.381"
					fill="currentColor"
					class="group-hover:brightness-150"
					style="stroke-width: 0.1;"
				/>
				<path
					d="M 41.922 32.248 L 38.74 35.598 L 38.726 29.523 L 41.922 26.001"
					fill="currentColor"
					class="group-hover:brightness-150"
					style="stroke-width: 0.1;"
				/>
				<path
					d="M 1.208 44.919 L 1.208 29.415 L -1.655 26.196 L -1.655 5.601 L 41.865 5.601 L 41.865 26.336 L 38.999 29.608 L 38.999 44.558 L 20.08 51.48"
					class="fill-background"
					style="stroke-width: 0.1;"
				/>
				<path
					d="M 42.365 5.1 L -2.156 5.1 L -2.156 26.385 L -1.903 26.67 L 0.709 29.604 L 0.709 44.563 L 0.709 45.274 L 1.381 45.507 L 19.747 51.893 L 20.084 52.01 L 20.419 51.888 L 38.844 45.147 L 39.5 44.907 L 39.5 44.208 L 39.5 29.795 L 42.117 26.806 L 42.365 26.523 L 42.365 26.147 L 42.365 6.1 L 42.365 5.1 Z M 41.365 6.1 L 41.365 26.147 L 38.5 29.42 L 38.5 44.208 L 20.076 50.948 L 1.709 44.563 L 1.709 29.224 L -1.156 26.006 L -1.156 6.1"
					fill="currentColor"
					class="group-hover:brightness-150"
					style="stroke-width: 0.1;"
				/>
				<path
					stroke-width="5"
					stroke-linecap="butt"
					stroke-miterlimit="10"
					stroke-linejoin="miter"
					fill="none"
					stroke="currentColor"
					d="M 1.749 9.005 L 1.749 24.899 L 4.614 28.118 L 4.614 42.498 L 17.474 46.969 L 20.158 45.987 L 22.735 46.883 L 35.596 42.178 L 35.596 28.328 L 38.46 25.055 L 38.46 9.005 L 1.749 9.005 Z"
					style="stroke-width: 0.5;"
				/>
				<path
					d="M 48.159 12.519 L -7.588 12.519 C -8.218 11.89 -8.57 11.538 -9.199 10.909 L -9.199 5.154 C -8.57 4.525 -8.218 4.173 -7.588 3.544 L 48.159 3.544 C 48.789 4.173 49.141 4.525 49.769 5.154 L 49.769 10.909 C 49.141 11.538 48.789 11.89 48.159 12.519"
					fill="currentColor"
					style="stroke-width: 0.1;"
				/>

				<!-- <path
					d="M 18.804 38.397 L 8.53 42.785 L -1.716 32.453 L -1.716 19.815 L 18.804 19.815"
					fill="currentColor"
					style="stroke-width: 0.1;"
				/>
				<path
					d="M 41.922 32.248 L 31.648 42.785 L 21.402 38.602 L 21.402 19.814 L 41.922 19.814"
					fill="currentColor"
					style="stroke-width: 0.1;"
				/>
				<path
					d="M 1.208 44.919 L 1.208 29.415 L -1.655 26.196 L -1.655 5.601 L 41.865 5.601 L 41.865 26.336 L 38.999 29.608 L 38.999 44.558 L 20.08 51.48"
					fill="var(--background)"
					style="stroke-width: 0.1;"
				/>
				<path
					d="M 42.365 5.1 L -2.156 5.1 L -2.156 26.385 L -1.903 26.67 L 0.709 29.604 L 0.709 44.563 L 0.709 45.274 L 1.381 45.507 L 19.747 51.893 L 20.084 52.01 L 20.419 51.888 L 38.844 45.147 L 39.5 44.907 L 39.5 44.208 L 39.5 29.795 L 42.117 26.806 L 42.365 26.523 L 42.365 26.147 L 42.365 6.1 L 42.365 5.1 Z M 41.365 6.1 L 41.365 26.147 L 38.5 29.42 L 38.5 44.208 L 20.076 50.948 L 1.709 44.563 L 1.709 29.224 L -1.156 26.006 L -1.156 6.1"
					fill="currentColor"
					style="stroke-width: 0.1;"
				/>
				<path
					stroke-width="5"
					stroke-linecap="butt"
					stroke-miterlimit="10"
					stroke-linejoin="miter"
					fill="none"
					stroke="currentColor"
					d="M 1.749 9.005 L 1.749 24.899 L 4.614 28.118 L 4.614 42.498 L 17.474 46.969 L 20.158 45.987 L 22.735 46.883 L 35.596 42.178 L 35.596 28.328 L 38.46 25.055 L 38.46 9.005 L 1.749 9.005 Z"
					style="stroke-width: 0.5;"
				/>
				<path
					d="M 48.159 12.519 L -7.588 12.519 C -8.218 11.89 -8.57 11.538 -9.199 10.909 L -9.199 5.154 C -8.57 4.525 -8.218 4.173 -7.588 3.544 L 48.159 3.544 C 48.789 4.173 49.141 4.525 49.769 5.154 L 49.769 10.909 C 49.141 11.538 48.789 11.89 48.159 12.519"
					fill="currentColor"
					style="stroke-width: 0.1;"
				/> -->
			</svg>

			<p
				class={cn(
					'absolute top-[9px] left-1/2 -translate-x-1/2 text-[11px] leading-none font-medium text-primary-foreground uppercase',
					isHighlighted && 'font-bold text-accent-muted',
					isSpellcast && 'font-bold text-background'
				)}
			>
				{TRAITS[trait].name}
			</p>

			<p
				class={cn(
					'absolute top-7.5 left-1/2 -translate-x-1/2 text-2xl font-bold group-hover:brightness-150',
					isHighlighted && 'text-accent group-hover:brightness-150',
					isSpellcast && 'text-accent-foreground drop-shadow-[0_1px_2px_hsl(var(--background))]'
				)}
			>
				{traitValue !== null && traitValue > 0 ? '+' + traitValue : traitValue}
			</p>

			{#if isSpellcast}
				<p
					class="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full border border-accent/70 bg-background px-2 py-0.5 text-[8px] leading-none font-bold tracking-wide text-accent uppercase shadow-md shadow-background/40"
				>
					Spellcast
				</p>
			{/if}
		</button>

		<div class="-mt-1.5 text-center text-[10px] text-muted-foreground italic select-none">
			{#each TRAITS[trait].examples as example}
				<p>{example}</p>
			{/each}
		</div>
	</div>
{/snippet}

<div class={cn('flex flex-wrap justify-evenly gap-x-1.5 gap-y-2 sm:flex-nowrap', className)}>
	<div class="flex grow justify-around gap-2">
		{@render trait('agility')}
		{@render trait('strength')}
		{@render trait('finesse')}
	</div>
	<div class="flex grow justify-evenly gap-2">
		{@render trait('instinct')}
		{@render trait('presence')}
		{@render trait('knowledge')}
	</div>
</div>

<style>
	.trait-spellcast::before {
		content: '';
		position: absolute;
		inset: 9px 6px auto;
		height: 10px;
		border-radius: 999px;
		background: hsl(var(--accent));
		opacity: 0.9;
		pointer-events: none;
	}
</style>
