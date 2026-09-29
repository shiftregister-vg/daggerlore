<script lang="ts">
	import type {
		FeaturePool,
		PoolDie,
		PoolEvent,
		PoolQuantity,
		TraitId
	} from '@domain/schemas/rules';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import * as Select from '$lib/components/ui/select';
	import Plus from '@lucide/svelte/icons/plus';
	import { TRAITS } from '@domain/constants/rules';
	import { generateUsageId } from '$lib/state/feature-usage';

	let {
		pools = $bindable(),
		featureTitle = '',
		idPrefix
	}: {
		pools: FeaturePool[] | undefined;
		featureTitle?: string;
		/** Unique prefix for element ids on the page. */
		idPrefix: string;
	} = $props();

	const QUANTITY_SOURCES: { value: PoolQuantity['source']; label: string }[] = [
		{ value: 'fixed', label: 'Fixed number' },
		{ value: 'spellcast_trait', label: 'Spellcast trait' },
		{ value: 'trait', label: 'Trait' },
		{ value: 'proficiency', label: 'Proficiency' },
		{ value: 'level', label: 'Level' },
		{ value: 'tier', label: 'Tier' }
	];
	const EVENTS: { value: PoolEvent; label: string }[] = [
		{ value: 'short_rest', label: 'Short rest' },
		{ value: 'long_rest', label: 'Long rest' },
		{ value: 'scene', label: 'End of scene' },
		{ value: 'session_start', label: 'Session start' },
		{ value: 'session_end', label: 'Session end' }
	];
	const DICE: PoolDie[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

	const list = $derived(pools ?? []);

	function commit(next: FeaturePool[]) {
		pools = next.length > 0 ? next : undefined;
	}

	function update(index: number, patch: Partial<FeaturePool>) {
		commit(list.map((pool, current) => (current === index ? { ...pool, ...patch } : pool)));
	}

	function addPool() {
		// The id is generated once and kept, because character state is keyed by it across versions.
		const id = generateUsageId(
			featureTitle,
			list.map((pool) => pool.id),
			`pool_${list.length + 1}`
		);
		commit([
			...list,
			{ id, kind: 'tokens', refill: { source: 'fixed', value: 1 }, refill_on: ['long_rest'] }
		]);
	}

	function removePool(index: number) {
		commit(list.filter((_, current) => current !== index));
	}

	function toggleEvent(
		index: number,
		field: 'refill_on' | 'clear_on',
		event: PoolEvent,
		on: boolean
	) {
		const current = list[index][field] ?? [];
		const next = on
			? [...new Set([...current, event])]
			: current.filter((entry) => entry !== event);
		update(index, { [field]: next.length > 0 ? next : undefined });
	}

	function sourceLabel(source: PoolQuantity['source']) {
		return QUANTITY_SOURCES.find((entry) => entry.value === source)?.label ?? source;
	}
</script>

{#snippet quantityEditor(
	id: string,
	title: string,
	quantity: PoolQuantity | undefined,
	optional: boolean,
	onchange: (next: PoolQuantity | undefined) => void
)}
	<div class="flex flex-col gap-1">
		<p class="text-xs font-medium text-muted-foreground">{title}</p>
		<div class="flex flex-wrap gap-2">
			<Select.Root
				type="single"
				value={quantity?.source ?? 'none'}
				onValueChange={(value) => {
					if (value === 'none') return onchange(undefined);
					const source = value as PoolQuantity['source'];
					onchange({
						source,
						value: source === 'fixed' ? (quantity?.value ?? 1) : undefined,
						trait: source === 'trait' ? (quantity?.trait ?? 'agility') : undefined,
						minimum: quantity?.minimum
					});
				}}
			>
				<Select.Trigger {id} class="w-40">
					<p class="truncate">{quantity ? sourceLabel(quantity.source) : 'None'}</p>
				</Select.Trigger>
				<Select.Content>
					{#if optional}
						<Select.Item value="none">None</Select.Item>
					{/if}
					{#each QUANTITY_SOURCES as source (source.value)}
						<Select.Item value={source.value}>{source.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			{#if quantity?.source === 'fixed'}
				<Input
					type="number"
					min={0}
					max={99}
					class="w-20"
					aria-label={`${title} number`}
					value={quantity.value ?? 0}
					onchange={(event) =>
						onchange({
							...quantity,
							value: Math.max(0, Math.min(99, Math.trunc(Number(event.currentTarget.value) || 0)))
						})}
				/>
			{:else if quantity?.source === 'trait'}
				<Select.Root
					type="single"
					value={quantity.trait}
					onValueChange={(value) => value && onchange({ ...quantity, trait: value as TraitId })}
				>
					<Select.Trigger class="w-32" aria-label={`${title} trait`}>
						<p class="truncate">{quantity.trait ? TRAITS[quantity.trait].name : 'Trait'}</p>
					</Select.Trigger>
					<Select.Content>
						{#each Object.values(TRAITS) as trait (trait.id)}
							<Select.Item value={trait.id}>{trait.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{/if}
			{#if quantity && quantity.source !== 'fixed'}
				<Input
					type="number"
					min={0}
					max={99}
					class="w-24"
					placeholder="Min"
					aria-label={`${title} minimum`}
					value={quantity.minimum ?? ''}
					onchange={(event) => {
						const raw = event.currentTarget.value;
						onchange({
							...quantity,
							minimum:
								raw === '' ? undefined : Math.max(0, Math.min(99, Math.trunc(Number(raw) || 0)))
						});
					}}
				/>
			{/if}
		</div>
	</div>
{/snippet}

<div class="flex flex-col gap-2 rounded-md border p-2">
	<div class="flex items-center justify-between gap-2">
		<p class="text-xs font-medium text-muted-foreground">Resource pools</p>
		<Button type="button" size="sm" variant="outline" onclick={addPool}>
			<Plus class="size-3.5" />
			Add Pool
		</Button>
	</div>

	{#each list as pool, index (pool.id)}
		<div class="flex flex-col gap-3 rounded-md border border-dashed p-2">
			<div class="flex flex-wrap items-end gap-2">
				<div class="flex flex-col gap-1">
					<label
						for={`${idPrefix}-pool-${index}-kind`}
						class="text-xs font-medium text-muted-foreground"
					>
						Kind <code class="text-[10px]">{pool.id}</code>
					</label>
					<Select.Root
						type="single"
						value={pool.kind}
						onValueChange={(value) => {
							if (value === 'dice') {
								update(index, {
									kind: 'dice',
									die: pool.die ?? 'd6',
									capacity: undefined,
									refill: pool.refill ?? { source: 'fixed', value: 1 }
								});
							} else if (value === 'tokens') {
								update(index, { kind: 'tokens', die: undefined });
							}
						}}
					>
						<Select.Trigger id={`${idPrefix}-pool-${index}-kind`} class="w-32">
							<p class="truncate">{pool.kind === 'dice' ? 'Stored dice' : 'Tokens'}</p>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="tokens">Tokens</Select.Item>
							<Select.Item value="dice">Stored dice</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				{#if pool.kind === 'dice'}
					<div class="flex flex-col gap-1">
						<label
							for={`${idPrefix}-pool-${index}-die`}
							class="text-xs font-medium text-muted-foreground"
						>
							Die
						</label>
						<Select.Root
							type="single"
							value={pool.die ?? 'd6'}
							onValueChange={(value) => value && update(index, { die: value as PoolDie })}
						>
							<Select.Trigger id={`${idPrefix}-pool-${index}-die`} class="w-24">
								<p class="truncate">{pool.die ?? 'd6'}</p>
							</Select.Trigger>
							<Select.Content>
								{#each DICE as die (die)}
									<Select.Item value={die}>{die}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
				<div class="flex min-w-40 flex-1 flex-col gap-1">
					<label
						for={`${idPrefix}-pool-${index}-label`}
						class="text-xs font-medium text-muted-foreground"
					>
						Label
					</label>
					<Input
						id={`${idPrefix}-pool-${index}-label`}
						value={pool.label ?? ''}
						placeholder="Optional, e.g. Prayer Dice"
						oninput={(event) =>
							update(index, {
								label: event.currentTarget.value.trim() ? event.currentTarget.value : undefined
							})}
					/>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				{@render quantityEditor(
					`${idPrefix}-pool-${index}-refill`,
					pool.kind === 'dice' ? 'Number of dice' : 'Refill amount',
					pool.refill,
					pool.kind === 'tokens',
					(next) => update(index, { refill: next })
				)}
				{#if pool.kind === 'tokens'}
					{@render quantityEditor(
						`${idPrefix}-pool-${index}-capacity`,
						'Maximum (leave None if the card sets no cap)',
						pool.capacity,
						true,
						(next) => update(index, { capacity: next })
					)}
				{/if}
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				{#each [{ field: 'refill_on', title: pool.kind === 'dice' ? 'Roll on' : 'Refill on' }, { field: 'clear_on', title: 'Clear on' }] as const as group (group.field)}
					<fieldset class="flex flex-col gap-1">
						<legend class="text-xs font-medium text-muted-foreground">{group.title}</legend>
						<div class="flex flex-wrap gap-x-3 gap-y-1">
							{#each EVENTS as event (event.value)}
								{@const inputId = `${idPrefix}-pool-${index}-${group.field}-${event.value}`}
								<label class="flex items-center gap-1.5 text-xs" for={inputId}>
									<Checkbox
										id={inputId}
										checked={(pool[group.field] ?? []).includes(event.value)}
										onCheckedChange={(checked) =>
											toggleEvent(index, group.field, event.value, checked === true)}
									/>
									{event.label}
								</label>
							{/each}
						</div>
					</fieldset>
				{/each}
			</div>

			<div class="flex justify-end">
				<Button
					type="button"
					size="sm"
					variant="link"
					class="text-destructive"
					onclick={() => removePool(index)}
				>
					Remove Pool
				</Button>
			</div>
		</div>
	{:else}
		<p class="text-xs text-muted-foreground italic">No pools</p>
	{/each}
</div>
