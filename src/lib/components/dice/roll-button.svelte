<script lang="ts">
	import { cn, applyProficiencyToDice, parseDiceString } from '$lib/utils';
	import type { RollContext, RollInput } from '@domain/schemas/dice';
	import type { DamageType, TraitId } from '@domain/schemas/rules';
	import { getDiceContext } from '$lib/state/dice.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { startRoll } from './roll-gate';
	import { TRAITS } from '@domain/constants/rules';
	import type { Snippet } from 'svelte';

	type RollButtonProps = {
		class?: string;
		disabled?: boolean;
		name?: string;
		modifier?: number;
		beforeRoll?: () => void;
		/** What the roll is for; lets features offer choices on it. */
		context?: RollContext;
		children?: Snippet;
	} & (
		| {
				type: 'duality' | 'gm';
				diceString?: string;
				traitId?: TraitId;
		  }
		| {
				type: 'base';
				diceString: string;
				proficiency?: number;
				damageType?: DamageType;
		  }
	);
	let {
		name = 'Roll',
		disabled = false,
		beforeRoll,
		context,
		children,
		class: className = '',
		...restProps
	}: RollButtonProps = $props();

	const diceCtx = getDiceContext();
	const characterCtx = getCharacterContext();
	const LONG_PRESS_DELAY_MS = 500;
	const SUPPRESS_CLICK_AFTER_LONG_PRESS_MS = 200;

	let longPressTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastLongPressAt = 0;

	const Modifier = $derived(restProps.modifier ?? 0);

	const diceString = $derived(
		restProps.type === 'base' && restProps.proficiency !== undefined
			? applyProficiencyToDice(restProps.diceString, restProps.proficiency)
			: (restProps.diceString ?? '')
	);

	const traitName = $derived.by(() => {
		if (restProps.type === 'duality' && restProps.traitId) {
			return TRAITS[restProps.traitId].short_name;
		}
		return null;
	});

	function getRollInput(): RollInput | null {
		const parsed = parseDiceString(diceString);

		if (restProps.type === 'duality') {
			return {
				name: name,
				dice: [...parsed.dice, { type: 'hope' }, { type: 'fear' }],
				modifier: Modifier,
				context
			};
		}
		if (restProps.type === 'gm') {
			return {
				name: name,
				dice: [...parsed.dice, { type: 'd20' }],
				modifier: Modifier
			};
		}
		if (restProps.type === 'base') {
			return {
				name: name,
				dice: [...parsed.dice],
				modifier: Modifier,
				context
			};
		}
		return null;
	}

	function clearLongPressTimeout() {
		if (longPressTimeout === null) return;
		clearTimeout(longPressTimeout);
		longPressTimeout = null;
	}

	function openPicker() {
		if (disabled || !diceCtx) return;
		const input = getRollInput();
		if (!input) return;
		diceCtx.openPicker(input);
	}

	function onclick() {
		if (Date.now() - lastLongPressAt < SUPPRESS_CLICK_AFTER_LONG_PRESS_MS) {
			return;
		}
		if (disabled || !diceCtx) return;
		const input = getRollInput();
		if (!input) return;
		beforeRoll?.();
		startRoll(diceCtx, characterCtx, input);
	}

	function oncontextmenu(event: MouseEvent) {
		event.preventDefault();
		if (Date.now() - lastLongPressAt < 1000) return;
		openPicker();
	}

	function onpointerdown(event: PointerEvent) {
		if (event.pointerType === 'mouse' || disabled) return;
		clearLongPressTimeout();
		longPressTimeout = setTimeout(() => {
			longPressTimeout = null;
			lastLongPressAt = Date.now();
			openPicker();
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

<button
	{disabled}
	{onclick}
	{oncontextmenu}
	{onpointerdown}
	{onpointerup}
	{onpointercancel}
	{onpointerleave}
	class={cn(
		'-m-0.5 flex w-min items-center gap-1 rounded-full border bg-foreground/5 px-2.5 py-1.5 text-xs text-nowrap select-none',
		'ring-primary hover:border-primary hover:bg-primary/20 hover:ring',
		disabled && 'pointer-events-none',
		className
	)}
>
	{#if restProps.type === 'duality'}
		{diceString ? `+${diceString}` : ''}
		{Modifier >= 0 ? `+${Modifier}` : Modifier}
		{traitName}
	{/if}

	{#if restProps.type === 'gm'}
		{diceString ? `+${diceString}` : ''}
		{Modifier >= 0 ? `+${Modifier}` : Modifier}
	{/if}

	{#if restProps.type === 'base'}
		{diceString + (Modifier !== 0 ? (Modifier > 0 ? `+${Modifier}` : Modifier) : '')}
		{restProps.damageType}
	{/if}

	{@render children?.()}
</button>
