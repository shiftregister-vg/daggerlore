<script lang="ts">
	import type { FeatureRecord, RecordField } from '@domain/schemas/rules';
	import { TRAITS } from '@domain/constants/rules';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import {
		addLedgerEntry,
		canAddLedgerEntry,
		displayRecordValue,
		recordClearCaption,
		recordEntries,
		recordLabel,
		removeLedgerEntry,
		setSingleValue,
		updateLedgerEntry,
		type RecordEntry
	} from '$lib/state/feature-records';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Select from '$lib/components/ui/select';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { cn } from '$lib/utils';
	import { recordValueResolver } from './record-values';

	let {
		record,
		tracker_key,
		class: className = ''
	}: {
		record: FeatureRecord;
		tracker_key: string;
		class?: string;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx?.character);
	const tracker = $derived(
		characterCtx?.derived_character_data?.record_trackers.find((entry) => entry.key === tracker_key)
	);
	const canEdit = $derived(!!characterCtx?.canEdit);
	const entries = $derived(
		character && tracker ? recordEntries(character.feature_records ?? {}, tracker) : []
	);
	const domainCards = $derived(characterCtx?.derived_character_data?.domain_card_vault ?? []);
	const resolve = $derived(recordValueResolver(character?.experiences ?? [], domainCards));
	const caption = $derived(tracker ? recordClearCaption(tracker) : '');

	let draft = $state<Record<string, string>>({});
	const draftHasValue = $derived(Object.values(draft).some((value) => value.trim() !== ''));

	function referenceOptions(field: RecordField): { value: string; label: string }[] {
		if (field.type === 'choice') {
			return (field.options ?? []).map((option) => ({ value: option.id, label: option.label }));
		}
		if (field.type === 'experience') {
			return (character?.experiences ?? []).map((experience, index) => ({
				value: String(index),
				label: experience || `Experience ${index + 1}`
			}));
		}
		if (field.type === 'trait') {
			return Object.values(TRAITS).map((trait) => ({ value: trait.id, label: trait.name }));
		}
		if (field.type === 'domain_card') {
			return domainCards.map((card) => ({ value: card.id, label: card.title }));
		}
		return [];
	}

	function setSingle(fieldId: string, value: string) {
		if (!character || !tracker || !canEdit) return;
		character.feature_records = setSingleValue(
			character.feature_records ?? {},
			tracker,
			fieldId,
			value,
			crypto.randomUUID()
		);
	}

	function updateEntry(entry: RecordEntry, fieldId: string, value: string) {
		if (!character || !tracker || !canEdit) return;
		character.feature_records = updateLedgerEntry(
			character.feature_records ?? {},
			tracker,
			entry.id,
			{
				[fieldId]: value
			}
		);
	}

	function removeEntry(entry: RecordEntry) {
		if (!character || !tracker || !canEdit) return;
		character.feature_records = removeLedgerEntry(
			character.feature_records ?? {},
			tracker,
			entry.id
		);
	}

	function addEntry() {
		if (!character || !tracker || !canEdit || !draftHasValue) return;
		character.feature_records = addLedgerEntry(character.feature_records ?? {}, tracker, {
			id: crypto.randomUUID(),
			values: Object.fromEntries(Object.entries(draft).filter(([, value]) => value.trim() !== ''))
		});
		draft = {};
	}
</script>

{#snippet fieldInput(
	field: RecordField,
	value: string,
	onchange: (value: string) => void,
	idPrefix: string,
	live: boolean = false
)}
	{@const inputId = `${idPrefix}-${field.id}`}
	<div class={cn('flex flex-col gap-1', field.type === 'long_text' && 'sm:col-span-2')}>
		<label for={inputId} class="text-xs font-medium text-muted-foreground">{field.label}</label>
		{#if field.type === 'long_text'}
			<Textarea
				id={inputId}
				rows={2}
				{value}
				disabled={!canEdit}
				placeholder={field.placeholder}
				onchange={(event) => onchange(event.currentTarget.value)}
				oninput={(event) => live && onchange(event.currentTarget.value)}
			/>
		{:else if field.type === 'text' || field.type === 'number'}
			<Input
				id={inputId}
				type={field.type === 'number' ? 'number' : 'text'}
				{value}
				disabled={!canEdit}
				placeholder={field.placeholder}
				onchange={(event) => onchange(event.currentTarget.value)}
				oninput={(event) => live && onchange(event.currentTarget.value)}
			/>
		{:else}
			{@const options = referenceOptions(field)}
			<Select.Root
				type="single"
				{value}
				disabled={!canEdit}
				onValueChange={(next) => onchange(next === '__none' ? '' : next)}
			>
				<Select.Trigger id={inputId} class="w-full">
					<p class="truncate">
						{value ? displayRecordValue(field, value, resolve) : (field.placeholder ?? 'Choose…')}
					</p>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="__none">None</Select.Item>
					{#each options as option (option.value)}
						<Select.Item value={option.value}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}
	</div>
{/snippet}

{#if tracker}
	<section class={cn('flex flex-col gap-2 text-sm', className)} aria-label={recordLabel(tracker)}>
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<p class="font-semibold">{recordLabel(tracker)}</p>
			<p class="text-xs text-muted-foreground">
				{#if record.kind === 'ledger'}
					{entries.length}{tracker.max_entries !== undefined ? ` / ${tracker.max_entries}` : ''}
					{entries.length === 1 ? 'entry' : 'entries'}
				{/if}
				{#if caption}· {caption}{/if}
			</p>
		</div>

		{#if record.kind === 'single'}
			<div class="grid gap-2 sm:grid-cols-2">
				{#each record.fields as field (field.id)}
					{@render fieldInput(
						field,
						entries[0]?.values[field.id] ?? '',
						(value) => setSingle(field.id, value),
						`${tracker.key}-single`
					)}
				{/each}
			</div>
		{:else}
			{#each entries as entry (entry.id)}
				<div class="flex flex-col gap-2 rounded-md border border-border/70 p-2">
					<div class="grid gap-2 sm:grid-cols-2">
						{#each record.fields as field (field.id)}
							{@render fieldInput(
								field,
								entry.values[field.id] ?? '',
								(value) => updateEntry(entry, field.id, value),
								`${tracker.key}-${entry.id}`
							)}
						{/each}
					</div>
					{#if canEdit}
						<Button
							type="button"
							size="sm"
							variant="ghost"
							class="self-end text-destructive"
							onclick={() => removeEntry(entry)}
						>
							<Trash2 class="size-3.5" />
							Remove
						</Button>
					{/if}
				</div>
			{:else}
				<p class="text-xs text-muted-foreground italic">No entries yet.</p>
			{/each}

			{#if canEdit && canAddLedgerEntry(character?.feature_records ?? {}, tracker)}
				<div class="flex flex-col gap-2 rounded-md border border-dashed border-border p-2">
					<p class="text-xs font-medium text-muted-foreground">New entry</p>
					<div class="grid gap-2 sm:grid-cols-2">
						{#each record.fields as field (field.id)}
							{@render fieldInput(
								field,
								draft[field.id] ?? '',
								(value) => (draft = { ...draft, [field.id]: value }),
								`${tracker.key}-draft`,
								true
							)}
						{/each}
					</div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						class="self-end"
						disabled={!draftHasValue}
						onclick={addEntry}
					>
						<Plus class="size-3.5" />
						Add entry
					</Button>
				</div>
			{:else if canEdit}
				<p class="text-xs text-muted-foreground">This list is full.</p>
			{/if}
		{/if}
	</section>
{/if}
