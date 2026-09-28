<script lang="ts">
	import type { FeatureUsage } from '@domain/schemas/rules';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { setFeatureUses, spentUses, usageStateCaption } from '$lib/state/feature-usage';
	import { cn } from '$lib/utils';

	let {
		usage,
		tracker_key,
		tone = 'card',
		disabled = false,
		class: className = ''
	}: {
		usage: FeatureUsage;
		/** Only set where the feature belongs to the character on this sheet. */
		tracker_key?: string;
		/** 'card' renders on the white card face; 'sheet' follows the sheet theme. */
		tone?: 'card' | 'sheet';
		disabled?: boolean;
		class?: string;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx?.character);
	const tracker = $derived(
		tracker_key
			? characterCtx?.derived_character_data?.usage_trackers.find(
					(entry) => entry.key === tracker_key
				)
			: undefined
	);
	const canEdit = $derived(!!characterCtx?.canEdit && !disabled);
	const spent = $derived(
		character && tracker ? spentUses(character.feature_uses ?? {}, tracker) : 0
	);
	// Diamonds show remaining uses (like Hope): available ones first, spent ones hollow after them.
	const available = $derived(tracker ? tracker.max_uses - spent : 0);
	// Only an author-provided label is shown; a generic word like "Used" reads as the current state.
	const label = $derived(usage.label);
	const caption = $derived(usageStateCaption(usage, tracker ? available : undefined));
	const ariaName = $derived(label ?? 'Use');

	function setAvailable(next: number) {
		if (!character || !tracker || !canEdit) return;
		character.feature_uses = setFeatureUses(
			character.feature_uses ?? {},
			tracker,
			tracker.max_uses - next
		);
	}
</script>

<div
	class={cn(
		'flex flex-wrap items-center gap-2 text-xs',
		tone === 'card' ? 'justify-center text-black' : 'text-foreground',
		className
	)}
	aria-label={label ? `${label}, ${caption}` : caption}
>
	{#if label}
		<span class="font-bold">{label}</span>
	{/if}
	{#if tracker}
		<div class="flex items-center gap-2.5 px-1">
			{#each Array(tracker.max_uses) as _, index (index)}
				{@const isAvailable = index < available}
				<button
					type="button"
					disabled={!canEdit}
					class={cn(
						'aspect-square size-3 rotate-45 rounded-[2px] border-2 transition-all duration-300',
						tone === 'card'
							? isAvailable
								? 'border-amber-600 bg-gradient-to-br from-yellow-300 to-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.45)]'
								: 'border-amber-600/40 bg-transparent'
							: isAvailable
								? 'border-hope bg-hope shadow-[0_0_8px_rgba(253,212,113,0.4),0_0_16px_rgba(253,212,113,0.2)]'
								: 'border-hope/40 bg-transparent',
						canEdit ? 'hover:scale-110' : 'cursor-default'
					)}
					aria-label={`${ariaName} ${index + 1} of ${tracker.max_uses}, ${isAvailable ? 'available' : 'spent'}`}
					onclick={(event) => {
						event.stopPropagation();
						setAvailable(isAvailable ? index : index + 1);
					}}
				></button>
			{/each}
		</div>
	{/if}
	<span class={tone === 'card' ? 'text-black/60' : 'text-muted-foreground'}>{caption}</span>
</div>
