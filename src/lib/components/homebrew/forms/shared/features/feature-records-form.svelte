<script lang="ts">
	import type {
		FeatureRecord,
		PoolEvent,
		RecordField,
		RecordFieldType
	} from '@domain/schemas/rules';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import * as Select from '$lib/components/ui/select';
	import Plus from '@lucide/svelte/icons/plus';
	import { generateUsageId } from '$lib/state/feature-usage';

	let {
		records = $bindable(),
		featureTitle = '',
		idPrefix
	}: {
		records: FeatureRecord[] | undefined;
		featureTitle?: string;
		/** Unique prefix for element ids on the page. */
		idPrefix: string;
	} = $props();

	const FIELD_TYPES: { value: RecordFieldType; label: string }[] = [
		{ value: 'text', label: 'Short text' },
		{ value: 'long_text', label: 'Long text' },
		{ value: 'number', label: 'Number' },
		{ value: 'choice', label: 'Choice' },
		{ value: 'experience', label: 'Experience' },
		{ value: 'trait', label: 'Trait' },
		{ value: 'domain_card', label: 'Domain card' }
	];
	const EVENTS: { value: PoolEvent; label: string }[] = [
		{ value: 'short_rest', label: 'Short rest' },
		{ value: 'long_rest', label: 'Long rest' },
		{ value: 'scene', label: 'End of scene' },
		{ value: 'session_start', label: 'Session start' },
		{ value: 'session_end', label: 'Session end' }
	];

	const list = $derived(records ?? []);

	function commit(next: FeatureRecord[]) {
		records = next.length > 0 ? next : undefined;
	}

	function update(index: number, patch: Partial<FeatureRecord>) {
		commit(list.map((record, current) => (current === index ? { ...record, ...patch } : record)));
	}

	function updateField(recordIndex: number, fieldIndex: number, patch: Partial<RecordField>) {
		const fields = list[recordIndex].fields.map((field, current) =>
			current === fieldIndex ? { ...field, ...patch } : field
		);
		update(recordIndex, { fields });
	}

	// Ids are generated once and kept, because character state is keyed by them across versions.
	function addRecord() {
		const id = generateUsageId(
			featureTitle,
			list.map((record) => record.id),
			`record_${list.length + 1}`
		);
		commit([...list, { id, kind: 'single', fields: [newField([], 'Name')] }]);
	}

	function newField(existing: RecordField[], label = `Field ${existing.length + 1}`): RecordField {
		const id = generateUsageId(
			label,
			existing.map((field) => field.id),
			`field_${existing.length + 1}`
		);
		return { id, label, type: 'text' };
	}

	function addField(recordIndex: number) {
		const fields = list[recordIndex].fields;
		if (fields.length >= 8) return;
		update(recordIndex, { fields: [...fields, newField(fields)] });
	}

	function removeField(recordIndex: number, fieldIndex: number) {
		const fields = list[recordIndex].fields.filter((_, current) => current !== fieldIndex);
		if (fields.length === 0) return;
		update(recordIndex, { fields });
	}

	function setOptions(recordIndex: number, fieldIndex: number, text: string) {
		const labels = text
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
		const current = list[recordIndex].fields[fieldIndex].options ?? [];
		const options: NonNullable<RecordField['options']> = [];
		for (const label of labels) {
			// Keep the id of an option whose label is unchanged, so stored choices stay valid.
			const existing = current.find((option) => option.label === label);
			const id =
				existing?.id ??
				generateUsageId(
					label,
					[...current, ...options].map((option) => option.id),
					`option_${options.length + 1}`
				);
			options.push({ id, label });
		}
		updateField(recordIndex, fieldIndex, { options });
	}

	function toggleClear(index: number, event: PoolEvent, on: boolean) {
		const current = list[index].clear_on ?? [];
		const next = on
			? [...new Set([...current, event])]
			: current.filter((entry) => entry !== event);
		update(index, { clear_on: next.length > 0 ? next : undefined });
	}
</script>

<div class="flex flex-col gap-2 rounded-md border p-2">
	<div class="flex items-center justify-between gap-2">
		<p class="text-xs font-medium text-muted-foreground">Records</p>
		<Button type="button" size="sm" variant="outline" onclick={addRecord}>
			<Plus class="size-3.5" />
			Add Record
		</Button>
	</div>

	{#each list as record, index (record.id)}
		{@const prefix = `${idPrefix}-record-${index}`}
		<div class="flex flex-col gap-3 rounded-md border border-dashed p-2">
			<div class="flex flex-wrap items-end gap-2">
				<div class="flex flex-col gap-1">
					<label for={`${prefix}-kind`} class="text-xs font-medium text-muted-foreground">
						Kind <code class="text-[10px]">{record.id}</code>
					</label>
					<Select.Root
						type="single"
						value={record.kind}
						onValueChange={(value) => {
							if (value === 'single') {
								update(index, { kind: 'single', max_entries: undefined, clear_on: undefined });
							} else if (value === 'ledger') {
								update(index, { kind: 'ledger' });
							}
						}}
					>
						<Select.Trigger id={`${prefix}-kind`} class="w-40">
							<p class="truncate">
								{record.kind === 'ledger' ? 'List of entries' : 'Single record'}
							</p>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="single">Single record</Select.Item>
							<Select.Item value="ledger">List of entries</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex min-w-40 flex-1 flex-col gap-1">
					<label for={`${prefix}-label`} class="text-xs font-medium text-muted-foreground">
						Label
					</label>
					<Input
						id={`${prefix}-label`}
						value={record.label ?? ''}
						placeholder="Optional, e.g. Dossier"
						oninput={(event) =>
							update(index, {
								label: event.currentTarget.value.trim() ? event.currentTarget.value : undefined
							})}
					/>
				</div>
				{#if record.kind === 'ledger'}
					<div class="flex flex-col gap-1">
						<label for={`${prefix}-max`} class="text-xs font-medium text-muted-foreground">
							Max entries
						</label>
						<Input
							id={`${prefix}-max`}
							type="number"
							min={1}
							max={50}
							class="w-24"
							placeholder="No cap"
							value={record.max_entries ?? ''}
							onchange={(event) => {
								const raw = event.currentTarget.value;
								update(index, {
									max_entries:
										raw === '' ? undefined : Math.max(1, Math.min(50, Math.trunc(Number(raw) || 1)))
								});
							}}
						/>
					</div>
				{/if}
			</div>

			<div class="flex flex-col gap-2">
				{#each record.fields as field, fieldIndex (field.id)}
					{@const fieldPrefix = `${prefix}-field-${fieldIndex}`}
					<div class="flex flex-col gap-2 rounded border border-border/60 p-2">
						<div class="flex flex-wrap items-end gap-2">
							<div class="flex min-w-32 flex-1 flex-col gap-1">
								<label
									for={`${fieldPrefix}-label`}
									class="text-xs font-medium text-muted-foreground"
								>
									Field <code class="text-[10px]">{field.id}</code>
								</label>
								<Input
									id={`${fieldPrefix}-label`}
									value={field.label}
									oninput={(event) =>
										updateField(index, fieldIndex, { label: event.currentTarget.value })}
								/>
							</div>
							<div class="flex flex-col gap-1">
								<label
									for={`${fieldPrefix}-type`}
									class="text-xs font-medium text-muted-foreground"
								>
									Type
								</label>
								<Select.Root
									type="single"
									value={field.type}
									onValueChange={(value) => {
										if (!value) return;
										const type = value as RecordFieldType;
										updateField(index, fieldIndex, {
											type,
											options: type === 'choice' ? (field.options ?? []) : undefined
										});
									}}
								>
									<Select.Trigger id={`${fieldPrefix}-type`} class="w-36">
										<p class="truncate">
											{FIELD_TYPES.find((entry) => entry.value === field.type)?.label}
										</p>
									</Select.Trigger>
									<Select.Content>
										{#each FIELD_TYPES as type (type.value)}
											<Select.Item value={type.value}>{type.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
							<div class="flex min-w-32 flex-1 flex-col gap-1">
								<label
									for={`${fieldPrefix}-placeholder`}
									class="text-xs font-medium text-muted-foreground"
								>
									Placeholder
								</label>
								<Input
									id={`${fieldPrefix}-placeholder`}
									value={field.placeholder ?? ''}
									placeholder="Optional"
									oninput={(event) =>
										updateField(index, fieldIndex, {
											placeholder: event.currentTarget.value.trim()
												? event.currentTarget.value
												: undefined
										})}
								/>
							</div>
							<Button
								type="button"
								size="sm"
								variant="link"
								class="text-destructive"
								disabled={record.fields.length <= 1}
								onclick={() => removeField(index, fieldIndex)}
							>
								Remove
							</Button>
						</div>
						{#if field.type === 'choice'}
							<div class="flex flex-col gap-1">
								<label
									for={`${fieldPrefix}-options`}
									class="text-xs font-medium text-muted-foreground"
								>
									Options (one per line)
								</label>
								<textarea
									id={`${fieldPrefix}-options`}
									rows={3}
									class="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
									value={(field.options ?? []).map((option) => option.label).join('\n')}
									onchange={(event) => setOptions(index, fieldIndex, event.currentTarget.value)}
								></textarea>
							</div>
						{/if}
					</div>
				{/each}
				<Button
					type="button"
					size="sm"
					variant="outline"
					class="w-fit"
					disabled={record.fields.length >= 8}
					onclick={() => addField(index)}
				>
					<Plus class="size-3.5" />
					Add Field
				</Button>
			</div>

			{#if record.kind === 'ledger'}
				<fieldset class="flex flex-col gap-1">
					<legend class="text-xs font-medium text-muted-foreground">Clear all entries on</legend>
					<div class="flex flex-wrap gap-x-3 gap-y-1">
						{#each EVENTS as event (event.value)}
							{@const inputId = `${prefix}-clear-${event.value}`}
							<label class="flex items-center gap-1.5 text-xs" for={inputId}>
								<Checkbox
									id={inputId}
									checked={(record.clear_on ?? []).includes(event.value)}
									onCheckedChange={(checked) => toggleClear(index, event.value, checked === true)}
								/>
								{event.label}
							</label>
						{/each}
					</div>
				</fieldset>
			{/if}

			<div class="flex justify-end">
				<Button
					type="button"
					size="sm"
					variant="link"
					class="text-destructive"
					onclick={() => commit(list.filter((_, current) => current !== index))}
				>
					Remove Record
				</Button>
			</div>
		</div>
	{:else}
		<p class="text-xs text-muted-foreground italic">No records</p>
	{/each}
</div>
