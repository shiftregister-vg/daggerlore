<script lang="ts">
	import type { FeatureRecord } from '@domain/schemas/rules';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import {
		displayRecordValue,
		recordEntries,
		recordLabel,
		recordSummary
	} from '$lib/state/feature-records';
	import { cn } from '$lib/utils';
	import { recordValueResolver } from './record-values';

	let {
		record,
		tracker_key,
		tone = 'card',
		onedit,
		class: className = ''
	}: {
		record: FeatureRecord;
		/** Only set where the feature belongs to the character on this sheet. */
		tracker_key?: string;
		/** 'card' renders on the white card face; 'sheet' follows the sheet theme. */
		tone?: 'card' | 'sheet';
		/** Shows an Edit button that opens the full editor. */
		onedit?: () => void;
		class?: string;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx?.character);
	const tracker = $derived(
		tracker_key
			? characterCtx?.derived_character_data?.record_trackers.find(
					(entry) => entry.key === tracker_key
				)
			: undefined
	);
	const entries = $derived(
		character && tracker ? recordEntries(character.feature_records ?? {}, tracker) : []
	);
	const resolve = $derived(
		recordValueResolver(
			character?.experiences ?? [],
			characterCtx?.derived_character_data?.domain_card_vault ?? []
		)
	);
	const muted = $derived(tone === 'card' ? 'text-black/60' : 'text-muted-foreground');
</script>

<div
	class={cn(
		'flex flex-col gap-0.5 text-xs',
		tone === 'card' ? 'items-center text-center text-black' : 'text-foreground',
		className
	)}
>
	{#if tracker && record.kind === 'single' && entries.length > 0}
		{#each record.fields as field (field.id)}
			{@const value = displayRecordValue(field, entries[0].values[field.id] ?? '', resolve)}
			{#if value}
				<p class="line-clamp-2">
					<span class="font-bold">{field.label}:</span>
					{value}
				</p>
			{/if}
		{/each}
	{:else if tracker && record.kind === 'ledger'}
		<p>{recordSummary(tracker, entries, resolve)}</p>
	{:else}
		<p class={muted}>
			<span class="font-bold">{tracker ? recordLabel(tracker) : (record.label ?? 'Record')}</span>
			{#if tracker}— not recorded yet{/if}
		</p>
	{/if}
	{#if onedit && tracker}
		<button
			type="button"
			class={cn('w-fit text-xs underline underline-offset-2', muted, 'hover:text-current')}
			onclick={(event) => {
				event.stopPropagation();
				onedit();
			}}
		>
			Edit
		</button>
	{/if}
</div>
