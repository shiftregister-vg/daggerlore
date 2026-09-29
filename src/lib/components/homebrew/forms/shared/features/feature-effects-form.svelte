<script lang="ts">
	import type { EffectEndEvent, FeatureEffect } from '@domain/schemas/rules';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import * as Select from '$lib/components/ui/select';
	import Plus from '@lucide/svelte/icons/plus';
	import { generateUsageId } from '$lib/state/feature-usage';
	import { cn } from '$lib/utils';
	import { EFFECT_EVENT_LABELS } from '$lib/state/feature-effects';
	import CharacterModifierForm from '../character-modifier/form.svelte';
	import WeaponModifierForm from '../weapon-modifier/form.svelte';
	import { emptyCharacterModifier, emptyWeaponModifier } from './defaults';
	import type {
		HomebrewErrorPath,
		HomebrewErrorSummary
	} from '$lib/components/homebrew/forms/helpers';

	let {
		effects = $bindable(),
		featureTitle = '',
		hasUsage = false,
		idPrefix,
		errorSummary = { fieldErrors: [], messages: [] },
		path = [],
		class: className = ''
	}: {
		effects: FeatureEffect[] | undefined;
		featureTitle?: string;
		/** Whether the feature has a usage tracker an effect can spend. */
		hasUsage?: boolean;
		/** Unique prefix for element ids on the page. */
		idPrefix: string;
		errorSummary?: HomebrewErrorSummary;
		/** Error path of this feature's `effects` array. */
		path?: HomebrewErrorPath;
		class?: string;
	} = $props();

	const INSTANCE_MODES: { value: NonNullable<FeatureEffect['instances']>; label: string }[] = [
		{ value: 'single', label: 'One at a time' },
		{ value: 'replace', label: 'New one replaces old' },
		{ value: 'per_target', label: 'One per target' }
	];
	const SCOPES: { value: NonNullable<FeatureEffect['scope']>; label: string }[] = [
		{ value: 'self', label: 'Changes the sheet' },
		{ value: 'against_target', label: 'Only against the target' }
	];
	const EVENTS = Object.entries(EFFECT_EVENT_LABELS) as [EffectEndEvent, string][];

	const list = $derived(effects ?? []);

	function commit(next: FeatureEffect[]) {
		effects = next.length > 0 ? next : undefined;
	}

	function update(index: number, patch: Partial<FeatureEffect>) {
		commit(
			list.map((effect, current) => {
				if (current !== index) return effect;
				const next = { ...effect, ...patch };
				// Drop cleared optional keys so the stored content stays minimal.
				for (const key of Object.keys(patch) as (keyof FeatureEffect)[]) {
					if (next[key] === undefined) delete next[key];
				}
				return next;
			})
		);
	}

	// Ids are generated once and kept, because character state is keyed by them across versions.
	function addEffect() {
		const id = generateUsageId(
			featureTitle,
			list.map((effect) => effect.id),
			`effect_${list.length + 1}`
		);
		commit([
			...list,
			{ id, character_modifiers: [], weapon_modifiers: [], ends_on: ['short_rest', 'long_rest'] }
		]);
	}

	function setCost(index: number, key: 'hope' | 'stress', raw: string) {
		const value = raw === '' ? undefined : Math.max(1, Math.min(12, Math.trunc(Number(raw) || 1)));
		const cost = { ...list[index].cost, [key]: value };
		if (cost[key] === undefined) delete cost[key];
		update(index, { cost: Object.keys(cost).length > 0 ? cost : undefined });
	}

	function setUsageCost(index: number, on: boolean) {
		const cost = { ...list[index].cost };
		if (on) cost.usage = true;
		else delete cost.usage;
		update(index, { cost: Object.keys(cost).length > 0 ? cost : undefined });
	}

	function toggleEvent(index: number, event: EffectEndEvent, on: boolean) {
		const current = list[index].ends_on;
		update(index, {
			ends_on: on ? [...new Set([...current, event])] : current.filter((entry) => entry !== event)
		});
	}

	function setEndsWhen(index: number, text: string) {
		const lines = text
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
		update(index, { ends_when: lines.length > 0 ? lines : undefined });
	}
</script>

<div class={cn('flex flex-col gap-2 rounded-md border p-2', className)}>
	<div class="flex items-center justify-between gap-2">
		<p class="text-xs font-medium text-muted-foreground">Active Effects</p>
		<Button type="button" size="sm" variant="outline" onclick={addEffect}>
			<Plus class="size-3.5" />
			Add Effect
		</Button>
	</div>

	{#each list as effect, index (effect.id)}
		{@const prefix = `${idPrefix}-effect-${index}`}
		<div class="flex flex-col gap-3 rounded-md border border-dashed p-2">
			<div class="flex flex-wrap items-end gap-2">
				<div class="flex min-w-40 flex-1 flex-col gap-1">
					<label for={`${prefix}-label`} class="text-xs font-medium text-muted-foreground">
						Label <code class="text-[10px]">{effect.id}</code>
					</label>
					<Input
						id={`${prefix}-label`}
						value={effect.label ?? ''}
						placeholder="Optional, e.g. Frenzy"
						oninput={(event) =>
							update(index, {
								label: event.currentTarget.value.trim() ? event.currentTarget.value : undefined
							})}
					/>
				</div>
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
						value={effect.cost?.hope ?? ''}
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
						value={effect.cost?.stress ?? ''}
						onchange={(event) => setCost(index, 'stress', event.currentTarget.value)}
					/>
				</div>
			</div>

			<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
				<label class="flex items-center gap-1.5" for={`${prefix}-usage`}>
					<Checkbox
						id={`${prefix}-usage`}
						checked={effect.cost?.usage === true}
						disabled={!hasUsage && effect.cost?.usage !== true}
						onCheckedChange={(checked) => setUsageCost(index, checked === true)}
					/>
					Spends a use{hasUsage ? '' : ' (add limited uses first)'}
				</label>
				<label class="flex items-center gap-1.5" for={`${prefix}-success`}>
					<Checkbox
						id={`${prefix}-success`}
						checked={effect.requires_success === true}
						onCheckedChange={(checked) =>
							update(index, { requires_success: checked === true ? true : undefined })}
					/>
					Starts only on a success
				</label>
			</div>

			<div class="flex flex-wrap items-end gap-2">
				<div class="flex min-w-40 flex-1 flex-col gap-1">
					<label for={`${prefix}-target`} class="text-xs font-medium text-muted-foreground">
						Target label
					</label>
					<Input
						id={`${prefix}-target`}
						value={effect.target?.label ?? ''}
						placeholder="Optional, e.g. Focus"
						oninput={(event) => {
							const label = event.currentTarget.value;
							update(index, {
								target: label.trim() ? { label } : undefined,
								...(label.trim() ? {} : { scope: undefined })
							});
						}}
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for={`${prefix}-instances`} class="text-xs font-medium text-muted-foreground">
						Activations
					</label>
					<Select.Root
						type="single"
						value={effect.instances ?? 'single'}
						onValueChange={(value) =>
							update(index, {
								instances:
									value && value !== 'single'
										? (value as NonNullable<FeatureEffect['instances']>)
										: undefined
							})}
					>
						<Select.Trigger id={`${prefix}-instances`} class="w-48">
							<p class="truncate">
								{INSTANCE_MODES.find((mode) => mode.value === (effect.instances ?? 'single'))
									?.label}
							</p>
						</Select.Trigger>
						<Select.Content>
							{#each INSTANCE_MODES as mode (mode.value)}
								<Select.Item value={mode.value}>{mode.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				{#if effect.target}
					<div class="flex flex-col gap-1">
						<label for={`${prefix}-scope`} class="text-xs font-medium text-muted-foreground">
							Modifiers apply
						</label>
						<Select.Root
							type="single"
							value={effect.scope ?? 'self'}
							onValueChange={(value) =>
								update(index, { scope: value === 'against_target' ? 'against_target' : undefined })}
						>
							<Select.Trigger id={`${prefix}-scope`} class="w-52">
								<p class="truncate">
									{SCOPES.find((scope) => scope.value === (effect.scope ?? 'self'))?.label}
								</p>
							</Select.Trigger>
							<Select.Content>
								{#each SCOPES as scope (scope.value)}
									<Select.Item value={scope.value}>{scope.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
			</div>

			<div class="flex flex-col gap-1">
				<label for={`${prefix}-notes`} class="text-xs font-medium text-muted-foreground">
					Notes while active
				</label>
				<Textarea
					id={`${prefix}-notes`}
					rows={2}
					value={effect.notes ?? ''}
					placeholder="Optional, e.g. You can't use Armor Slots."
					oninput={(event) =>
						update(index, {
							notes: event.currentTarget.value.trim() ? event.currentTarget.value : undefined
						})}
				/>
			</div>

			<fieldset class="flex flex-col gap-1">
				<legend class="text-xs font-medium text-muted-foreground">Ends on</legend>
				<div class="flex flex-wrap gap-x-3 gap-y-1">
					{#each EVENTS as [event, label] (event)}
						{@const inputId = `${prefix}-ends-${event}`}
						<label class="flex items-center gap-1.5 text-xs" for={inputId}>
							<Checkbox
								id={inputId}
								checked={effect.ends_on.includes(event)}
								onCheckedChange={(checked) => toggleEvent(index, event, checked === true)}
							/>
							{label}
						</label>
					{/each}
				</div>
			</fieldset>

			<div class="flex flex-col gap-1">
				<label for={`${prefix}-ends-when`} class="text-xs font-medium text-muted-foreground">
					Also ends when (one per line, confirmed by the player or GM)
				</label>
				<textarea
					id={`${prefix}-ends-when`}
					rows={2}
					class="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
					placeholder="e.g. You attack another creature"
					value={(effect.ends_when ?? []).join('\n')}
					onchange={(event) => setEndsWhen(index, event.currentTarget.value)}
				></textarea>
			</div>

			<div class="flex flex-col gap-2">
				<Button
					type="button"
					size="sm"
					variant="outline"
					class="w-fit"
					onclick={() =>
						update(index, {
							character_modifiers: [...effect.character_modifiers, emptyCharacterModifier()]
						})}
				>
					<Plus class="size-3.5" />
					Add Character Modifier
				</Button>
				{#each effect.character_modifiers as modifier, modifierIndex (modifierIndex)}
					<CharacterModifierForm
						bind:modifier={
							() => modifier,
							(value) =>
								update(index, {
									character_modifiers: effect.character_modifiers.map((entry, current) =>
										current === modifierIndex ? value : entry
									)
								})
						}
						{errorSummary}
						path={[...path, index, 'character_modifiers', modifierIndex]}
						onRemove={() =>
							update(index, {
								character_modifiers: effect.character_modifiers.filter(
									(_, current) => current !== modifierIndex
								)
							})}
					/>
				{/each}
			</div>

			<div class="flex flex-col gap-2">
				<Button
					type="button"
					size="sm"
					variant="outline"
					class="w-fit"
					onclick={() =>
						update(index, {
							weapon_modifiers: [...effect.weapon_modifiers, emptyWeaponModifier()]
						})}
				>
					<Plus class="size-3.5" />
					Add Weapon Modifier
				</Button>
				{#each effect.weapon_modifiers as modifier, modifierIndex (modifierIndex)}
					<WeaponModifierForm
						bind:modifier={
							() => modifier,
							(value) =>
								update(index, {
									weapon_modifiers: effect.weapon_modifiers.map((entry, current) =>
										current === modifierIndex ? value : entry
									)
								})
						}
						{errorSummary}
						path={[...path, index, 'weapon_modifiers', modifierIndex]}
						onRemove={() =>
							update(index, {
								weapon_modifiers: effect.weapon_modifiers.filter(
									(_, current) => current !== modifierIndex
								)
							})}
					/>
				{/each}
			</div>

			<div class="flex justify-end">
				<Button
					type="button"
					size="sm"
					variant="link"
					class="text-destructive"
					onclick={() => commit(list.filter((_, current) => current !== index))}
				>
					Remove Effect
				</Button>
			</div>
		</div>
	{:else}
		<p class="text-xs text-muted-foreground italic">No active effects</p>
	{/each}
</div>
