<script lang="ts">
	import type { CardOption, Feature, FeatureUsage, UsageReset } from '@domain/schemas/rules';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Dropdown from '$lib/components/utility/dropdown.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import * as Select from '$lib/components/ui/select';
	import { USAGE_RESET_CAPTIONS, generateUsageId } from '$lib/state/feature-usage';
	import CharacterModifierForm from '../character-modifier/form.svelte';
	import FeaturePoolsForm from './feature-pools-form.svelte';
	import FeatureRecordsForm from './feature-records-form.svelte';
	import WeaponModifierForm from '../weapon-modifier/form.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import { cn } from '$lib/utils';
	import { emptyCharacterModifier, emptyFeature, emptyWeaponModifier } from './defaults';
	import {
		firstHomebrewErrorAt,
		homebrewHasErrorsBelow,
		type HomebrewErrorSummary,
		type HomebrewErrorPath
	} from '$lib/components/homebrew/forms/helpers';

	let {
		features = $bindable(),
		choiceOptions = $bindable([]),
		choiceSourceId,
		errorSummary,
		path = ['features'],
		allowAddRemove = false,
		featureLabel = 'Feature',
		staticTitles = undefined,
		allowChoiceConditions = false,
		allowExperienceTargets = false,
		allowUsage = false
	}: {
		features: Feature[];
		choiceOptions?: CardOption[];
		choiceSourceId?: string;
		errorSummary: HomebrewErrorSummary;
		path?: HomebrewErrorPath;
		allowAddRemove?: boolean;
		featureLabel?: string;
		staticTitles?: string[];
		allowChoiceConditions?: boolean;
		allowExperienceTargets?: boolean;
		/** Shows the limited-uses tracker settings; only sheet cards and class features read them. */
		allowUsage?: boolean;
	} = $props();

	const USAGE_RESETS: UsageReset[] = ['rest', 'long_rest', 'scene', 'session', 'never'];

	function featurePath(featureIndex: number, ...suffix: HomebrewErrorPath): HomebrewErrorPath {
		return [...path, featureIndex, ...suffix];
	}

	function addCharacterModifier(featureIndex: number) {
		const modifier = emptyCharacterModifier();

		features = features.map((feature, index) =>
			index === featureIndex
				? { ...feature, character_modifiers: [...feature.character_modifiers, modifier] }
				: feature
		);
	}

	function removeCharacterModifier(featureIndex: number, modifierIndex: number) {
		features = features.map((feature, index) =>
			index === featureIndex
				? {
						...feature,
						character_modifiers: feature.character_modifiers.filter(
							(_, current) => current !== modifierIndex
						)
					}
				: feature
		);
	}

	function updateCharacterModifier(
		featureIndex: number,
		modifierIndex: number,
		modifier: Feature['character_modifiers'][number]
	) {
		features = features.map((feature, index) =>
			index === featureIndex
				? {
						...feature,
						character_modifiers: feature.character_modifiers.map((current, currentIndex) =>
							currentIndex === modifierIndex ? modifier : current
						)
					}
				: feature
		);
	}

	function addWeaponModifier(featureIndex: number) {
		const modifier = emptyWeaponModifier();

		features = features.map((feature, index) =>
			index === featureIndex
				? { ...feature, weapon_modifiers: [...feature.weapon_modifiers, modifier] }
				: feature
		);
	}

	function removeWeaponModifier(featureIndex: number, modifierIndex: number) {
		features = features.map((feature, index) =>
			index === featureIndex
				? {
						...feature,
						weapon_modifiers: feature.weapon_modifiers.filter(
							(_, current) => current !== modifierIndex
						)
					}
				: feature
		);
	}

	function updateWeaponModifier(
		featureIndex: number,
		modifierIndex: number,
		modifier: Feature['weapon_modifiers'][number]
	) {
		features = features.map((feature, index) =>
			index === featureIndex
				? {
						...feature,
						weapon_modifiers: feature.weapon_modifiers.map((current, currentIndex) =>
							currentIndex === modifierIndex ? modifier : current
						)
					}
				: feature
		);
	}

	function updateFeatureField(
		featureIndex: number,
		field: 'title' | 'description_html',
		value: string
	) {
		features = features.map((feature, index) =>
			index === featureIndex ? { ...feature, [field]: value } : feature
		);
	}

	function toggleUsage(featureIndex: number, enabled: boolean) {
		features = features.map((feature, index) => {
			if (index !== featureIndex) return feature;
			if (!enabled) {
				const { usage: _usage, ...rest } = feature;
				return rest;
			}
			const id = generateUsageId(
				feature.title,
				features.flatMap((other) => (other !== feature && other.usage ? [other.usage.id] : [])),
				`use_${featureIndex + 1}`
			);
			return { ...feature, usage: { id, max_uses: 1, reset: 'rest' } };
		});
	}

	function updatePools(featureIndex: number, pools: Feature['pools']) {
		features = features.map((feature, index) => {
			if (index !== featureIndex) return feature;
			if (pools) return { ...feature, pools };
			const { pools: _pools, ...rest } = feature;
			return rest;
		});
	}

	function updateRecords(featureIndex: number, records: Feature['records']) {
		features = features.map((feature, index) => {
			if (index !== featureIndex) return feature;
			if (records) return { ...feature, records };
			const { records: _records, ...rest } = feature;
			return rest;
		});
	}

	function updateUsage(featureIndex: number, patch: Partial<FeatureUsage>) {
		features = features.map((feature, index) =>
			index === featureIndex && feature.usage
				? { ...feature, usage: { ...feature.usage, ...patch } }
				: feature
		);
	}

	function addFeature() {
		features = [...features, emptyFeature()];
	}

	function removeFeature(featureIndex: number) {
		features = features.filter((_, index) => index !== featureIndex);
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between gap-2">
		<p class="text-xs font-medium text-muted-foreground">Features</p>
		{#if allowAddRemove}
			<Button type="button" size="sm" variant="outline" onclick={addFeature}>
				<Plus class="size-3.5" />
				Add {featureLabel}
			</Button>
		{/if}
	</div>
	<div class="flex flex-col gap-2">
		{#each features as feature, featureIndex (featureIndex)}
			{@const hasErrors = homebrewHasErrorsBelow(errorSummary, featurePath(featureIndex))}
			{@const titleError = firstHomebrewErrorAt(errorSummary, featurePath(featureIndex, 'title'))}
			{@const descriptionError = firstHomebrewErrorAt(
				errorSummary,
				featurePath(featureIndex, 'description_html')
			)}
			<Dropdown
				title={staticTitles?.[featureIndex] ??
					(allowAddRemove
						? feature.title || `Unnamed ${featureLabel}`
						: featureIndex === 0
							? 'Top Feature'
							: 'Bottom Feature')}
				class={hasErrors ? 'data-[open=false]:border data-[open=false]:border-destructive' : ''}
			>
				<div class="flex flex-col gap-3">
					<div class="flex flex-col gap-1">
						<label
							for={`feature-name-${featureIndex}`}
							class={cn(
								'text-xs font-medium text-muted-foreground',
								titleError && 'text-destructive'
							)}
						>
							Name
						</label>
						<Input
							id={`feature-name-${featureIndex}`}
							value={feature.title}
							placeholder="Feature name"
							class={titleError ? 'border-destructive' : ''}
							oninput={(event) =>
								updateFeatureField(featureIndex, 'title', event.currentTarget.value)}
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label
							for={`feature-description-${featureIndex}`}
							class={cn(
								'text-xs font-medium text-muted-foreground',
								descriptionError && 'text-destructive'
							)}
						>
							Description
						</label>
						<Textarea
							id={`feature-description-${featureIndex}`}
							rows={4}
							value={feature.description_html}
							placeholder="Feature description"
							class={descriptionError ? 'border-destructive' : ''}
							oninput={(event) =>
								updateFeatureField(featureIndex, 'description_html', event.currentTarget.value)}
						/>
					</div>

					{#if allowUsage}
						{@const usageErrors = homebrewHasErrorsBelow(
							errorSummary,
							featurePath(featureIndex, 'usage')
						)}
						<div
							class={cn(
								'flex flex-col gap-2 rounded-md border p-2',
								usageErrors && 'border-destructive'
							)}
						>
							<label
								class="flex items-center gap-2 text-xs font-medium text-muted-foreground"
								for={`feature-usage-${featureIndex}`}
							>
								<Checkbox
									id={`feature-usage-${featureIndex}`}
									checked={!!feature.usage}
									onCheckedChange={(checked) => toggleUsage(featureIndex, checked === true)}
								/>
								Limited uses
							</label>
							{#if feature.usage}
								<div class="grid gap-2 sm:grid-cols-3">
									<div class="flex flex-col gap-1">
										<label
											for={`feature-usage-label-${featureIndex}`}
											class="text-xs font-medium text-muted-foreground"
										>
											Label
										</label>
										<Input
											id={`feature-usage-label-${featureIndex}`}
											value={feature.usage.label ?? ''}
											placeholder="Optional, e.g. Relaxing Song"
											oninput={(event) =>
												updateUsage(featureIndex, {
													label: event.currentTarget.value.trim()
														? event.currentTarget.value
														: undefined
												})}
										/>
									</div>
									<div class="flex flex-col gap-1">
										<label
											for={`feature-usage-max-${featureIndex}`}
											class="text-xs font-medium text-muted-foreground"
										>
											Uses
										</label>
										<Input
											id={`feature-usage-max-${featureIndex}`}
											type="number"
											min={1}
											max={20}
											value={feature.usage.max_uses}
											oninput={(event) =>
												updateUsage(featureIndex, {
													max_uses: Math.max(
														1,
														Math.min(20, Math.trunc(Number(event.currentTarget.value) || 1))
													)
												})}
										/>
									</div>
									<div class="flex flex-col gap-1">
										<p class="text-xs font-medium text-muted-foreground">Refreshes</p>
										<Select.Root
											type="single"
											value={feature.usage.reset}
											onValueChange={(value) =>
												value && updateUsage(featureIndex, { reset: value as UsageReset })}
										>
											<Select.Trigger class="w-full">
												<p class="truncate">{USAGE_RESET_CAPTIONS[feature.usage.reset]}</p>
											</Select.Trigger>
											<Select.Content>
												{#each USAGE_RESETS as reset (reset)}
													<Select.Item value={reset}>{USAGE_RESET_CAPTIONS[reset]}</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
									</div>
								</div>
							{/if}
						</div>
					{/if}

					{#if allowUsage}
						<FeaturePoolsForm
							bind:pools={() => feature.pools, (value) => updatePools(featureIndex, value)}
							featureTitle={feature.title}
							idPrefix={`feature-${path.join('-')}-${featureIndex}`}
						/>
						<FeatureRecordsForm
							bind:records={() => feature.records, (value) => updateRecords(featureIndex, value)}
							featureTitle={feature.title}
							idPrefix={`feature-${path.join('-')}-${featureIndex}`}
						/>
					{/if}

					<div class="flex flex-col gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							class="w-min"
							onclick={() => addCharacterModifier(featureIndex)}
						>
							<Plus class="size-3.5" />
							Add Character Modifier
						</Button>
						{#if feature.character_modifiers.length > 0}
							<div class="flex flex-col gap-2">
								{#each feature.character_modifiers as modifier, modifierIndex (modifierIndex)}
									<CharacterModifierForm
										bind:modifier={
											() => modifier,
											(value) => updateCharacterModifier(featureIndex, modifierIndex, value)
										}
										bind:choiceOptions
										{choiceSourceId}
										{allowChoiceConditions}
										{allowExperienceTargets}
										{errorSummary}
										path={featurePath(featureIndex, 'character_modifiers', modifierIndex)}
										onRemove={() => removeCharacterModifier(featureIndex, modifierIndex)}
									/>
								{/each}
							</div>
						{/if}
					</div>

					<div class="flex flex-col gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							class="w-min"
							onclick={() => addWeaponModifier(featureIndex)}
						>
							<Plus class="size-3.5" />
							Add Weapon Modifier
						</Button>
						{#if feature.weapon_modifiers.length > 0}
							<div class="flex flex-col gap-2">
								{#each feature.weapon_modifiers as modifier, modifierIndex (modifierIndex)}
									<WeaponModifierForm
										bind:modifier={
											() => modifier,
											(value) => updateWeaponModifier(featureIndex, modifierIndex, value)
										}
										bind:choiceOptions
										{choiceSourceId}
										{allowChoiceConditions}
										{errorSummary}
										path={featurePath(featureIndex, 'weapon_modifiers', modifierIndex)}
										onRemove={() => removeWeaponModifier(featureIndex, modifierIndex)}
									/>
								{/each}
							</div>
						{/if}
					</div>

					{#if allowAddRemove}
						<div class="flex justify-end">
							<Button
								type="button"
								size="sm"
								variant="link"
								class="text-destructive"
								onclick={() => removeFeature(featureIndex)}
							>
								Delete {featureLabel}
							</Button>
						</div>
					{/if}
				</div>
			</Dropdown>
		{:else}
			<p class="text-xs italic text-muted-foreground">No features added</p>
		{/each}
	</div>
</div>
