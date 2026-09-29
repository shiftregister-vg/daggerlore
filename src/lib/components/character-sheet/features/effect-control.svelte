<script lang="ts">
	import type { FeatureEffect } from '@domain/schemas/rules';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import {
		activationBlocker,
		effectCostCaption,
		effectInstances,
		effectLabel
	} from '$lib/state/feature-effects';
	import { cn } from '$lib/utils';
	import X from '@lucide/svelte/icons/x';
	import EffectActivateDialog from './effect-activate-dialog.svelte';
	import { activateWithUndo, endWithUndo } from './effect-actions';

	let {
		effect,
		tracker_key,
		tone = 'card',
		show_active = true,
		class: className = ''
	}: {
		effect: FeatureEffect;
		/** Only set where the feature belongs to the character on this sheet. */
		tracker_key?: string;
		/** 'card' renders on the white card face; 'sheet' follows the sheet theme. */
		tone?: 'card' | 'sheet';
		/** Hides the active pills where a fuller view already lists them. */
		show_active?: boolean;
		class?: string;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx?.character);
	const maxStress = $derived(characterCtx?.derived_character_data?.max_stress ?? 0);
	const tracker = $derived(
		tracker_key
			? characterCtx?.derived_character_data?.effect_trackers.find(
					(entry) => entry.key === tracker_key
				)
			: undefined
	);
	const canEdit = $derived(!!characterCtx?.canEdit);
	const instances = $derived(
		character && tracker ? effectInstances(character.active_effects ?? {}, tracker) : []
	);
	const label = $derived(tracker ? effectLabel(tracker) : (effect.label ?? 'Effect'));
	const cost = $derived(effectCostCaption(effect));
	const mode = $derived(effect.instances ?? 'single');
	// Blocked for reasons other than the target, which the dialog asks for.
	const blocker = $derived(
		character && tracker
			? activationBlocker(
					{
						hope: character.marked_hope,
						stress: character.marked_stress,
						max_stress: maxStress,
						feature_uses: character.feature_uses ?? {},
						active_effects: character.active_effects ?? {}
					},
					tracker
				)
			: undefined
	);
	const showActivate = $derived(instances.length === 0 || mode !== 'single');
	const needsDialog = $derived(!!(effect.target || effect.requires_success || cost));
	let dialogOpen = $state(false);

	const muted = $derived(tone === 'card' ? 'text-black/60' : 'text-muted-foreground');

	function activate(event: MouseEvent) {
		event.stopPropagation();
		if (!character || !tracker || !canEdit || blocker) return;
		if (needsDialog) dialogOpen = true;
		else activateWithUndo(() => characterCtx?.character, maxStress, tracker);
	}
</script>

<div
	class={cn(
		'flex flex-wrap items-center gap-1.5 text-xs',
		tone === 'card' ? 'justify-center text-black' : 'text-foreground',
		className
	)}
>
	{#each show_active ? instances : [] as instance (instance.id)}
		<span
			class={cn(
				'inline-flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-2 font-semibold',
				tone === 'card'
					? 'border-amber-600 bg-gradient-to-br from-yellow-200 to-amber-300 text-amber-950'
					: 'border-hope/70 bg-hope/15 text-foreground',
				tracker && !tracker.eligible && 'opacity-50'
			)}
			title={tracker && !tracker.eligible ? tracker.ineligible_reason : undefined}
		>
			{label}{instance.target ? `: ${instance.target}` : ''}
			{#if canEdit && tracker}
				<button
					type="button"
					class="rounded-full p-0.5 hover:bg-black/10"
					aria-label={`End ${label}${instance.target ? ` against ${instance.target}` : ''}`}
					onclick={(event) => {
						event.stopPropagation();
						if (tracker) endWithUndo(() => characterCtx?.character, tracker, instance.id);
					}}
				>
					<X class="size-3" />
				</button>
			{/if}
		</span>
	{/each}

	{#if tracker && showActivate}
		<button
			type="button"
			disabled={!canEdit || !!blocker}
			title={blocker}
			class={cn(
				'rounded-full border px-2 py-0.5 font-semibold transition-colors',
				tone === 'card'
					? 'border-amber-600/70 text-amber-900 enabled:hover:bg-amber-100'
					: 'border-hope/60 enabled:hover:bg-hope/15',
				'disabled:cursor-not-allowed disabled:opacity-50'
			)}
			onclick={activate}
		>
			{instances.length > 0 && mode === 'replace'
				? 'Change'
				: instances.length > 0
					? 'Add'
					: 'Activate'}{instances.length === 0 || mode === 'replace' ? '' : ` ${label}`}{cost
				? ` · ${cost}`
				: ''}
		</button>
		{#if blocker && canEdit && instances.length === 0}
			<span class={muted}>{blocker}</span>
		{/if}
	{:else if !tracker}
		<span class={muted}>
			<span class="font-bold">{label}</span>{cost ? ` · ${cost}` : ''}
		</span>
	{/if}
</div>

{#if tracker}
	<EffectActivateDialog bind:open={dialogOpen} {tracker} />
{/if}
