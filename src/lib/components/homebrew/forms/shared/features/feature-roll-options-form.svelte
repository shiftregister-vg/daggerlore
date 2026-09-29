<script lang="ts">
	import type { RollKind } from '@domain/schemas/dice';
	import type {
		Feature,
		FeatureRollOption,
		PoolDie,
		RollOptionEffect,
		RollOptionTiming
	} from '@domain/schemas/rules';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import * as Select from '$lib/components/ui/select';
	import Plus from '@lucide/svelte/icons/plus';
	import { generateUsageId } from '$lib/state/feature-usage';
	import { cn } from '$lib/utils';

	let {
		options = $bindable(),
		feature,
		idPrefix,
		class: className = ''
	}: {
		options: FeatureRollOption[] | undefined;
		/** The feature these options belong to: its pools, usage and effects can be spent or required. */
		feature: Pick<Feature, 'title' | 'pools' | 'usage' | 'effects'>;
		/** Unique prefix for element ids on the page. */
		idPrefix: string;
		class?: string;
	} = $props();

	const KINDS: { value: RollKind; label: string }[] = [
		{ value: 'trait', label: 'Trait' },
		{ value: 'attack', label: 'Attack' },
		{ value: 'damage', label: 'Damage' },
		{ value: 'spellcast', label: 'Spellcast' },
		{ value: 'experience', label: 'Experience' },
		{ value: 'other', label: 'Other' }
	];
	const TIMINGS: { value: RollOptionTiming; label: string }[] = [
		{ value: 'before', label: 'Before the roll' },
		{ value: 'after', label: 'After the roll' },
		{ value: 'defense', label: 'When taking damage' }
	];
	const EFFECT_TYPES: {
		value: RollOptionEffect['type'];
		label: string;
		timing: RollOptionTiming;
	}[] = [
		{ value: 'hope_die', label: 'Use a d20 Hope Die', timing: 'before' },
		{ value: 'advantage', label: 'Gain advantage', timing: 'before' },
		{ value: 'flat_bonus', label: 'Add a number', timing: 'before' },
		{ value: 'bonus_die', label: 'Add a die', timing: 'before' },
		{ value: 'extra_damage', label: 'Roll damage dice per token', timing: 'after' },
		{ value: 'reroll', label: 'Reroll Duality Dice', timing: 'after' },
		{ value: 'swap_results', label: 'Swap Hope and Fear results', timing: 'after' },
		{ value: 'reduce_damage', label: 'Reduce incoming damage', timing: 'defense' }
	];
	const DICE: PoolDie[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

	const list = $derived(options ?? []);
	const pools = $derived(feature.pools ?? []);
	const effects = $derived(feature.effects ?? []);

	function commit(next: FeatureRollOption[]) {
		options = next.length > 0 ? next : undefined;
	}

	function update(index: number, patch: Partial<FeatureRollOption>) {
		commit(
			list.map((option, current) => {
				if (current !== index) return option;
				const next = { ...option, ...patch };
				for (const key of Object.keys(patch) as (keyof FeatureRollOption)[]) {
					if (next[key] === undefined) delete next[key];
				}
				return next;
			})
		);
	}

	// Ids are generated once and kept, because character state is keyed by them across versions.
	function addOption() {
		const id = generateUsageId(
			feature.title,
			list.map((option) => option.id),
			`roll_option_${list.length + 1}`
		);
		commit([
			...list,
			{ id, applies_to: ['trait'], timing: 'before', effect: { type: 'flat_bonus', value: 1 } }
		]);
	}

	function defaultEffect(type: RollOptionEffect['type']): RollOptionEffect {
		switch (type) {
			case 'hope_die':
				return { type, die: 'd20' };
			case 'flat_bonus':
				return { type, value: 1 };
			case 'bonus_die':
				return { type, die: 'd6' };
			case 'extra_damage':
				return { type, die: 'd6' };
			case 'reroll':
				return { type, dice: 'duality' };
			case 'reduce_damage':
				return { type, amount: 'd6' };
			default:
				return { type } as RollOptionEffect;
		}
	}

	function setEffectType(index: number, type: RollOptionEffect['type']) {
		const timing = EFFECT_TYPES.find((entry) => entry.value === type)?.timing ?? 'before';
		const current = list[index];
		// Effects that work at more than one time keep the current time when it still fits.
		const keepTiming =
			(type === 'flat_bonus' || type === 'bonus_die') && current.timing !== 'defense';
		update(index, {
			effect: defaultEffect(type),
			timing: keepTiming ? current.timing : timing,
			applies_to: timing === 'defense' ? undefined : (current.applies_to ?? ['trait'])
		});
	}

	function toggleKind(index: number, kind: RollKind, on: boolean) {
		const current = list[index].applies_to ?? [];
		const next = on ? [...new Set([...current, kind])] : current.filter((entry) => entry !== kind);
		update(index, { applies_to: next.length > 0 ? next : undefined });
	}

	function setCost(index: number, key: 'hope' | 'stress', raw: string) {
		const value = raw === '' ? undefined : Math.max(1, Math.min(12, Math.trunc(Number(raw) || 1)));
		const cost = { ...list[index].cost, [key]: value };
		if (cost[key] === undefined) delete cost[key];
		update(index, { cost: Object.keys(cost).length > 0 ? cost : undefined });
	}

	function setUsage(index: number, on: boolean) {
		const cost = { ...list[index].cost };
		if (on) cost.usage = true;
		else delete cost.usage;
		update(index, { cost: Object.keys(cost).length > 0 ? cost : undefined });
	}

	function setPool(index: number, id: string | undefined, amount?: string) {
		const cost = { ...list[index].cost };
		if (!id) delete cost.pool;
		else {
			const parsed = amount ? Math.max(1, Math.trunc(Number(amount) || 1)) : undefined;
			cost.pool = parsed ? { id, amount: parsed } : { id };
		}
		update(index, { cost: Object.keys(cost).length > 0 ? cost : undefined });
	}
</script>

<div class={cn('flex flex-col gap-2 rounded-md border p-2', className)}>
	<div class="flex items-center justify-between gap-2">
		<p class="text-xs font-medium text-muted-foreground">Roll Options</p>
		<Button type="button" size="sm" variant="outline" onclick={addOption}>
			<Plus class="size-3.5" />
			Add Roll Option
		</Button>
	</div>

	{#each list as option, index (option.id)}
		{@const prefix = `${idPrefix}-roll-option-${index}`}
		{@const effect = option.effect}
		<div class="flex flex-col gap-3 rounded-md border border-dashed p-2">
			<div class="flex flex-wrap items-end gap-2">
				<div class="flex min-w-40 flex-1 flex-col gap-1">
					<label for={`${prefix}-label`} class="text-xs font-medium text-muted-foreground">
						Label <code class="text-[10px]">{option.id}</code>
					</label>
					<Input
						id={`${prefix}-label`}
						value={option.label ?? ''}
						placeholder="Optional, e.g. Add a Prayer Die"
						oninput={(event) =>
							update(index, {
								label: event.currentTarget.value.trim() ? event.currentTarget.value : undefined
							})}
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for={`${prefix}-effect`} class="text-xs font-medium text-muted-foreground">
						What it does
					</label>
					<Select.Root
						type="single"
						value={effect.type}
						onValueChange={(value) =>
							value && setEffectType(index, value as RollOptionEffect['type'])}
					>
						<Select.Trigger id={`${prefix}-effect`} class="w-56">
							<p class="truncate">
								{EFFECT_TYPES.find((entry) => entry.value === effect.type)?.label}
							</p>
						</Select.Trigger>
						<Select.Content>
							{#each EFFECT_TYPES as type (type.value)}
								<Select.Item value={type.value}>{type.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				{#if effect.type === 'flat_bonus' || effect.type === 'bonus_die'}
					<div class="flex flex-col gap-1">
						<label for={`${prefix}-when`} class="text-xs font-medium text-muted-foreground">
							When
						</label>
						<Select.Root
							type="single"
							value={option.timing}
							onValueChange={(value) =>
								value && update(index, { timing: value as RollOptionTiming })}
						>
							<Select.Trigger id={`${prefix}-when`} class="w-40">
								<p class="truncate">
									{TIMINGS.find((entry) => entry.value === option.timing)?.label}
								</p>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="before">Before the roll</Select.Item>
								<Select.Item value="after">After the roll</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
			</div>

			<div class="flex flex-wrap items-end gap-2">
				{#if effect.type === 'flat_bonus'}
					<div class="flex flex-col gap-1">
						<label for={`${prefix}-value`} class="text-xs font-medium text-muted-foreground">
							Amount
						</label>
						<Input
							id={`${prefix}-value`}
							type="number"
							class="w-24"
							value={effect.value}
							onchange={(event) =>
								update(index, {
									effect: {
										type: 'flat_bonus',
										value: Math.trunc(Number(event.currentTarget.value) || 0)
									}
								})}
						/>
					</div>
				{/if}
				{#if effect.type === 'bonus_die' || effect.type === 'extra_damage' || (effect.type === 'reduce_damage' && typeof effect.amount === 'string')}
					{@const current =
						effect.type === 'reduce_damage' ? (effect.amount as string) : (effect.die as string)}
					<div class="flex flex-col gap-1">
						<label for={`${prefix}-die`} class="text-xs font-medium text-muted-foreground">
							Die
						</label>
						<Select.Root
							type="single"
							value={current}
							onValueChange={(value) => {
								if (!value) return;
								if (effect.type === 'bonus_die') {
									update(index, { effect: { type: 'bonus_die', die: value as PoolDie | 'pool' } });
								} else if (effect.type === 'extra_damage') {
									update(index, { effect: { type: 'extra_damage', die: value as PoolDie } });
								} else {
									update(index, {
										effect: { type: 'reduce_damage', amount: value as PoolDie | 'pool' }
									});
								}
							}}
						>
							<Select.Trigger id={`${prefix}-die`} class="w-44">
								<p class="truncate">{current === 'pool' ? 'A spent pool die' : current}</p>
							</Select.Trigger>
							<Select.Content>
								{#if effect.type !== 'extra_damage'}
									<Select.Item value="pool">A spent pool die</Select.Item>
								{/if}
								{#each DICE as die (die)}
									<Select.Item value={die}>{die}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
				{#if effect.type === 'reduce_damage' && typeof effect.amount === 'number'}
					<div class="flex flex-col gap-1">
						<label for={`${prefix}-reduce`} class="text-xs font-medium text-muted-foreground">
							Reduces by
						</label>
						<Input
							id={`${prefix}-reduce`}
							type="number"
							min={1}
							class="w-24"
							value={effect.amount}
							onchange={(event) =>
								update(index, {
									effect: {
										type: 'reduce_damage',
										amount: Math.max(1, Math.trunc(Number(event.currentTarget.value) || 1))
									}
								})}
						/>
					</div>
				{/if}
				{#if effect.type === 'reroll'}
					<div class="flex flex-col gap-1">
						<label for={`${prefix}-reroll`} class="text-xs font-medium text-muted-foreground">
							Dice
						</label>
						<Select.Root
							type="single"
							value={effect.dice}
							onValueChange={(value) =>
								value &&
								update(index, {
									effect: { type: 'reroll', dice: value as 'duality' | 'hope' | 'fear' }
								})}
						>
							<Select.Trigger id={`${prefix}-reroll`} class="w-44">
								<p class="truncate">
									{effect.dice === 'duality' ? 'Both Duality Dice' : `${effect.dice} die`}
								</p>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="duality">Both Duality Dice</Select.Item>
								<Select.Item value="hope">Hope die</Select.Item>
								<Select.Item value="fear">Fear die</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
			</div>

			{#if option.timing !== 'defense'}
				<fieldset class="flex flex-col gap-1">
					<legend class="text-xs font-medium text-muted-foreground">Applies to</legend>
					<div class="flex flex-wrap gap-x-3 gap-y-1">
						{#each KINDS as kind (kind.value)}
							{@const inputId = `${prefix}-kind-${kind.value}`}
							<label class="flex items-center gap-1.5 text-xs" for={inputId}>
								<Checkbox
									id={inputId}
									checked={(option.applies_to ?? []).includes(kind.value)}
									onCheckedChange={(checked) => toggleKind(index, kind.value, checked === true)}
								/>
								{kind.label}
							</label>
						{/each}
					</div>
				</fieldset>
			{/if}

			<div class="flex flex-wrap items-end gap-2">
				<div class="flex flex-col gap-1">
					<label for={`${prefix}-hope`} class="text-xs font-medium text-muted-foreground">
						Hope cost
					</label>
					<Input
						id={`${prefix}-hope`}
						type="number"
						min={1}
						max={12}
						class="w-24"
						placeholder="None"
						value={option.cost?.hope ?? ''}
						onchange={(event) => setCost(index, 'hope', event.currentTarget.value)}
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for={`${prefix}-stress`} class="text-xs font-medium text-muted-foreground">
						Stress cost
					</label>
					<Input
						id={`${prefix}-stress`}
						type="number"
						min={1}
						max={12}
						class="w-24"
						placeholder="None"
						value={option.cost?.stress ?? ''}
						onchange={(event) => setCost(index, 'stress', event.currentTarget.value)}
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for={`${prefix}-pool`} class="text-xs font-medium text-muted-foreground">
						Spends from pool
					</label>
					<Select.Root
						type="single"
						value={option.cost?.pool?.id ?? '__none'}
						disabled={pools.length === 0}
						onValueChange={(value) => setPool(index, value === '__none' ? undefined : value)}
					>
						<Select.Trigger id={`${prefix}-pool`} class="w-44">
							<p class="truncate">
								{option.cost?.pool
									? (pools.find((pool) => pool.id === option.cost?.pool?.id)?.label ??
										option.cost.pool.id)
									: pools.length === 0
										? 'Add a pool first'
										: 'None'}
							</p>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="__none">None</Select.Item>
							{#each pools as pool (pool.id)}
								<Select.Item value={pool.id}>{pool.label ?? pool.id}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
				<label class="flex items-center gap-1.5" for={`${prefix}-usage`}>
					<Checkbox
						id={`${prefix}-usage`}
						checked={option.cost?.usage === true}
						disabled={!feature.usage && option.cost?.usage !== true}
						onCheckedChange={(checked) => setUsage(index, checked === true)}
					/>
					Spends a use{feature.usage ? '' : ' (add limited uses first)'}
				</label>
				{#if option.timing === 'after'}
					<div class="flex items-center gap-1.5">
						<label for={`${prefix}-outcome`} class="text-muted-foreground">Only after</label>
						<Select.Root
							type="single"
							value={option.requires_outcome ?? '__any'}
							onValueChange={(value) =>
								update(index, {
									requires_outcome: value === 'success' || value === 'failure' ? value : undefined
								})}
						>
							<Select.Trigger id={`${prefix}-outcome`} class="w-40">
								<p class="truncate">
									{option.requires_outcome === 'success'
										? 'A success'
										: option.requires_outcome === 'failure'
											? 'A failure'
											: 'Any result'}
								</p>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="__any">Any result</Select.Item>
								<Select.Item value="success">A success</Select.Item>
								<Select.Item value="failure">A failure</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
			</div>

			{#if effects.length > 0}
				<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
					<div class="flex items-center gap-1.5">
						<label for={`${prefix}-requires`} class="text-muted-foreground"
							>Needs active effect</label
						>
						<Select.Root
							type="single"
							value={option.requires_active_effect ?? '__none'}
							onValueChange={(value) =>
								update(index, {
									requires_active_effect: value === '__none' ? undefined : value,
									ends_effect: value === '__none' ? undefined : option.ends_effect
								})}
						>
							<Select.Trigger id={`${prefix}-requires`} class="w-44">
								<p class="truncate">
									{option.requires_active_effect
										? (effects.find((entry) => entry.id === option.requires_active_effect)?.label ??
											option.requires_active_effect)
										: 'None'}
								</p>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="__none">None</Select.Item>
								{#each effects as entry (entry.id)}
									<Select.Item value={entry.id}>{entry.label ?? entry.id}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					{#if option.requires_active_effect}
						<label class="flex items-center gap-1.5" for={`${prefix}-ends`}>
							<Checkbox
								id={`${prefix}-ends`}
								checked={option.ends_effect === true}
								onCheckedChange={(checked) =>
									update(index, { ends_effect: checked === true ? true : undefined })}
							/>
							Ends that effect when used
						</label>
					{/if}
				</div>
			{/if}

			<div class="flex justify-end">
				<Button
					type="button"
					size="sm"
					variant="link"
					class="text-destructive"
					onclick={() => commit(list.filter((_, current) => current !== index))}
				>
					Remove Roll Option
				</Button>
			</div>
		</div>
	{:else}
		<p class="text-xs text-muted-foreground italic">No roll options</p>
	{/each}
</div>
