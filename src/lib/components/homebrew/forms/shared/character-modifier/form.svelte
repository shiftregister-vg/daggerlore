<script lang="ts">
	import type { CardOption, CharacterModifier, TraitId } from '@domain/schemas/rules';
	import * as Select from '$lib/components/ui/select';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import CharacterConditionsForm from '../character-conditions/form.svelte';
	import { capitalize, cn } from '$lib/utils';
	import {
		homebrewErrorsAt,
		homebrewMessagesBelow,
		type HomebrewErrorPath,
		type HomebrewErrorSummary
	} from '$lib/components/homebrew/forms/helpers';

	type ExperienceModifier = Extract<
		CharacterModifier,
		{ target: 'experience_from_card_choice_selection' }
	>;
	type TraitTargetModifier = Extract<CharacterModifier, { target: 'trait' }>;
	type DerivedTraitModifier = Extract<CharacterModifier, { type: 'derived_from_trait' }>;
	type FlatModifier = Extract<CharacterModifier, { type: 'flat' }>;
	type MultiplierModifier = Exclude<CharacterModifier, FlatModifier | DerivedTraitModifier>;

	let {
		modifier = $bindable(),
		choiceOptions = $bindable([]),
		choiceSourceId,
		allowChoiceConditions = false,
		allowExperienceTargets = false,
		onRemove,
		errorSummary,
		path,
		idPrefix = 'character-modifier'
	}: {
		modifier: CharacterModifier;
		choiceOptions?: CardOption[];
		choiceSourceId?: string;
		allowChoiceConditions?: boolean;
		allowExperienceTargets?: boolean;
		onRemove?: () => void;
		errorSummary: HomebrewErrorSummary;
		path: HomebrewErrorPath;
		idPrefix?: string;
	} = $props();

	type ModifierBehaviour = CharacterModifier['behaviour'];
	type ModifierType = CharacterModifier['type'];
	type ValidTarget =
		| 'evasion'
		| 'max_hp'
		| 'max_stress'
		| 'max_experiences'
		| 'major_damage_threshold'
		| 'severe_damage_threshold'
		| 'primary_class_mastery_level'
		| 'secondary_class_mastery_level'
		| 'max_loadout'
		| 'max_hope'
		| 'proficiency'
		| 'max_armor'
		| 'max_burden'
		| 'spellcast_roll_bonus'
		| 'max_short_rest_actions'
		| 'max_long_rest_actions'
		| 'trait'
		| 'experience_from_card_choice_selection';

	const traitOptions: TraitId[] = [
		'agility',
		'strength',
		'finesse',
		'instinct',
		'presence',
		'knowledge'
	];

	const behaviourOptions: ModifierBehaviour[] = ['bonus', 'base', 'override'];
	const typeOptions: ModifierType[] = [
		'flat',
		'derived_from_trait',
		'derived_from_spellcast_trait',
		'derived_from_proficiency',
		'derived_from_level'
	];
	const targetOptions = $derived.by(() => {
		const options: ValidTarget[] = [
			'evasion',
			'max_hp',
			'max_stress',
			'max_experiences',
			'major_damage_threshold',
			'severe_damage_threshold',
			'primary_class_mastery_level',
			'secondary_class_mastery_level',
			'max_loadout',
			'max_hope',
			'proficiency',
			'max_armor',
			'max_burden',
			'spellcast_roll_bonus',
			'max_short_rest_actions',
			'max_long_rest_actions',
			'trait'
		];

		if (allowExperienceTargets) {
			options.push('experience_from_card_choice_selection');
		}

		return options;
	});

	const targetLabels: Record<ValidTarget, string> = {
		evasion: 'Evasion',
		max_hp: 'Max HP',
		max_stress: 'Max Stress',
		max_experiences: 'Max Experiences',
		major_damage_threshold: 'Major Damage Threshold',
		severe_damage_threshold: 'Severe Damage Threshold',
		primary_class_mastery_level: 'Primary Class Mastery Level',
		secondary_class_mastery_level: 'Secondary Class Mastery Level',
		max_loadout: 'Max Loadout',
		max_hope: 'Max Hope',
		proficiency: 'Proficiency',
		max_armor: 'Max Armor',
		max_burden: 'Max Burden',
		spellcast_roll_bonus: 'Spellcast Roll Bonus',
		max_short_rest_actions: 'Max Short Rest Actions',
		max_long_rest_actions: 'Max Long Rest Actions',
		trait: 'Trait',
		experience_from_card_choice_selection: 'Experience'
	};

	const behaviourLabels: Record<ModifierBehaviour, string> = {
		bonus: 'Bonus',
		base: 'Base',
		override: 'Override'
	};

	const typeLabels: Record<ModifierType, string> = {
		flat: 'Flat',
		derived_from_trait: 'Derived from Trait',
		derived_from_spellcast_trait: 'Derived from Spellcast Trait',
		derived_from_proficiency: 'Derived from Proficiency',
		derived_from_level: 'Derived from Level'
	};

	function messagesAt(...suffix: HomebrewErrorPath): string[] {
		return homebrewErrorsAt(errorSummary, [...path, ...suffix]);
	}

	const targetErrors = $derived.by(() => [
		...messagesAt('target'),
		...messagesAt('card_id'),
		...messagesAt('choice_id')
	]);
	const choiceRequiredError = $derived.by(
		() => homebrewMessagesBelow(errorSummary, [...path, 'character_conditions'])[0]
	);
	const experienceOptions = $derived(
		choiceOptions.filter((option) => option.type === 'experience')
	);
	const isExperienceTarget = $derived(modifier.target === 'experience_from_card_choice_selection');

	function generateExperienceChoiceId() {
		let index = 1;
		let candidate = `experience_${index}`;
		while (choiceOptions.some((option) => option.choice_id === candidate)) {
			index += 1;
			candidate = `experience_${index}`;
		}
		return candidate;
	}

	function ensureExperienceChoice(max: number) {
		if (!allowExperienceTargets || !choiceSourceId) {
			return isExperienceTarget ? (modifier as ExperienceModifier).choice_id : '';
		}

		if (!isExperienceTarget) {
			const choiceId = generateExperienceChoiceId();
			choiceOptions = [
				...choiceOptions,
				{
					type: 'experience',
					choice_id: choiceId,
					max,
					conditional_choice: null
				}
			];
			return choiceId;
		}

		const experienceModifier = modifier as ExperienceModifier;
		choiceOptions = choiceOptions.map((option) =>
			option.type === 'experience' && option.choice_id === experienceModifier.choice_id
				? { ...option, max }
				: option
		);
		return experienceModifier.choice_id;
	}

	function removeExperienceChoice(choiceId: string) {
		choiceOptions = choiceOptions.filter(
			(option) => !(option.type === 'experience' && option.choice_id === choiceId)
		);
	}

	function updateType(nextType: ModifierType) {
		const target = modifier.target;
		const conditions = modifier.character_conditions;
		const behaviour = modifier.behaviour;

		if (nextType === 'flat') {
			modifier = {
				behaviour,
				character_conditions: conditions,
				target,
				type: 'flat',
				value: 0
			} as CharacterModifier;
			return;
		}

		if (nextType === 'derived_from_trait') {
			modifier = {
				behaviour,
				character_conditions: conditions,
				target,
				type: 'derived_from_trait',
				trait: 'agility',
				multiplier: 1
			} as CharacterModifier;
			return;
		}

		modifier = {
			behaviour,
			character_conditions: conditions,
			target,
			type: nextType,
			multiplier: 1
		} as CharacterModifier;
	}

	function updateTarget(nextTarget: ValidTarget) {
		const behaviour = modifier.behaviour;
		const conditions = modifier.character_conditions;

		let typeFields: Record<string, unknown>;
		if (modifier.type === 'flat') {
			typeFields = { type: 'flat', value: modifier.value };
		} else if (modifier.type === 'derived_from_trait') {
			typeFields = {
				type: 'derived_from_trait',
				trait: modifier.trait,
				multiplier: modifier.multiplier
			};
		} else {
			typeFields = { type: modifier.type, multiplier: modifier.multiplier };
		}

		if (nextTarget === 'trait') {
			modifier = {
				...typeFields,
				behaviour,
				character_conditions: conditions,
				target: 'trait',
				trait: modifier.target === 'trait' ? (modifier as TraitTargetModifier).trait : 'agility'
			} as CharacterModifier;
			return;
		}

		if (nextTarget === 'experience_from_card_choice_selection') {
			if (!allowExperienceTargets || !choiceSourceId) return;
			const choiceId = ensureExperienceChoice(1);
			modifier = {
				...typeFields,
				behaviour,
				character_conditions: conditions,
				target: 'experience_from_card_choice_selection',
				card_id: choiceSourceId,
				choice_id: choiceId
			} as CharacterModifier;
			return;
		}

		modifier = {
			...typeFields,
			behaviour,
			character_conditions: conditions,
			target: nextTarget
		} as CharacterModifier;
	}

	function updateTraitTarget(trait: TraitId) {
		if (modifier.target === 'trait') {
			modifier = { ...(modifier as TraitTargetModifier), trait };
		}
	}

	function updateDerivedTrait(trait: TraitId) {
		if (modifier.type === 'derived_from_trait') {
			modifier = { ...(modifier as DerivedTraitModifier), trait };
		}
	}

	function updateFlatValue(value: number) {
		if (modifier.type === 'flat') {
			modifier = { ...(modifier as FlatModifier), value };
		}
	}

	function updateMultiplier(value: number) {
		if (modifier.type !== 'flat' && modifier.type !== 'derived_from_trait') {
			modifier = { ...(modifier as MultiplierModifier), multiplier: value };
		}
	}

	function updateDerivedTraitMultiplier(value: number) {
		if (modifier.type === 'derived_from_trait') {
			modifier = { ...(modifier as DerivedTraitModifier), multiplier: value };
		}
	}

	function updateExperienceMax(value: number) {
		if (!isExperienceTarget || !allowExperienceTargets || !choiceSourceId) return;
		const choiceId = ensureExperienceChoice(value);
		modifier = {
			...(modifier as ExperienceModifier),
			card_id: choiceSourceId,
			choice_id: choiceId
		};
	}

	function updateCharacterConditions(conditions: CharacterModifier['character_conditions']) {
		modifier = { ...modifier, character_conditions: conditions } as CharacterModifier;
	}
</script>

<div class="flex flex-col gap-3 rounded-lg border bg-muted p-3">
	<div class="flex flex-col gap-1">
		<p
			class={cn(
				'text-xs font-medium text-muted-foreground',
				targetErrors.length > 0 && 'text-destructive'
			)}
		>
			Character attribute to modify
		</p>
		<Select.Root
			type="single"
			value={modifier.target}
			onValueChange={(value) => value && updateTarget(value as ValidTarget)}
		>
			<Select.Trigger class={cn('w-full', targetErrors.length > 0 && 'border-destructive')}>
				<p class="truncate">{targetLabels[modifier.target as ValidTarget] ?? 'Select target'}</p>
			</Select.Trigger>
			<Select.Content>
				{#each targetOptions as target}
					<Select.Item value={target}>{targetLabels[target]}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		{#each targetErrors as error}
			<p class="text-xs text-destructive">{error}</p>
		{/each}
	</div>

	{#if modifier.target === 'trait'}
		<div class="flex flex-col gap-1">
			<p class="text-xs font-medium text-muted-foreground">Choose a trait</p>
			<Select.Root
				type="single"
				value={(modifier as TraitTargetModifier).trait}
				onValueChange={(value) => value && updateTraitTarget(value as TraitId)}
			>
				<Select.Trigger class="w-full">
					<p class="truncate">{capitalize((modifier as TraitTargetModifier).trait)}</p>
				</Select.Trigger>
				<Select.Content>
					{#each traitOptions as trait}
						<Select.Item value={trait}>{capitalize(trait)}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	{/if}

	{#if allowExperienceTargets && isExperienceTarget}
		{@const experienceModifier = modifier as ExperienceModifier}
		{@const experienceChoice = experienceOptions.find(
			(option) => option.choice_id === experienceModifier.choice_id
		)}
		<div class="flex flex-col gap-1">
			<label class="text-xs font-medium text-muted-foreground" for={`${idPrefix}-experience-max`}
				>Max number of experiences</label
			>
			<Input
				id={`${idPrefix}-experience-max`}
				type="number"
				min="1"
				value={String(experienceChoice?.max ?? 1)}
				oninput={(event) =>
					updateExperienceMax(Math.max(1, Number(event.currentTarget.value) || 1))}
			/>
		</div>
	{/if}

	<div class="grid grid-cols-2 gap-2">
		<div class="flex flex-col gap-1">
			<p class="text-xs font-medium text-muted-foreground">Behaviour</p>
			<Select.Root
				type="single"
				value={modifier.behaviour}
				onValueChange={(value) =>
					value && (modifier = { ...modifier, behaviour: value as ModifierBehaviour })}
			>
				<Select.Trigger class="w-full">
					<p class="truncate">{behaviourLabels[modifier.behaviour]}</p>
				</Select.Trigger>
				<Select.Content>
					{#each behaviourOptions as behaviour}
						<Select.Item value={behaviour}>{behaviourLabels[behaviour]}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="flex flex-col gap-1">
			<p class="text-xs font-medium text-muted-foreground">Type</p>
			<Select.Root
				type="single"
				value={modifier.type}
				onValueChange={(value) => value && updateType(value as ModifierType)}
			>
				<Select.Trigger class="w-full">
					<p class="truncate">{typeLabels[modifier.type]}</p>
				</Select.Trigger>
				<Select.Content>
					{#each typeOptions as type}
						<Select.Item value={type}>{typeLabels[type]}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	{#if modifier.type === 'derived_from_trait'}
		<div class="grid grid-cols-2 gap-2">
			<div class="flex flex-col gap-1">
				<p class="text-xs font-medium text-muted-foreground">Trait</p>
				<Select.Root
					type="single"
					value={(modifier as DerivedTraitModifier).trait}
					onValueChange={(value) => value && updateDerivedTrait(value as TraitId)}
				>
					<Select.Trigger class="w-full">
						<p class="truncate">{capitalize((modifier as DerivedTraitModifier).trait)}</p>
					</Select.Trigger>
					<Select.Content>
						{#each traitOptions as trait}
							<Select.Item value={trait}>{capitalize(trait)}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex flex-col gap-1">
				<label
					class="text-xs font-medium text-muted-foreground"
					for={`${idPrefix}-derived-trait-multiplier`}>Multiplier</label
				>
				<Input
					id={`${idPrefix}-derived-trait-multiplier`}
					type="number"
					value={String((modifier as DerivedTraitModifier).multiplier)}
					oninput={(event) =>
						updateDerivedTraitMultiplier(parseInt(event.currentTarget.value, 10) || 0)}
				/>
			</div>
		</div>
	{:else if modifier.type === 'flat'}
		<div class="flex flex-col gap-1">
			<label class="text-xs font-medium text-muted-foreground" for={`${idPrefix}-value`}
				>Value</label
			>
			<Input
				id={`${idPrefix}-value`}
				type="number"
				value={String((modifier as FlatModifier).value)}
				oninput={(event) => updateFlatValue(Number(event.currentTarget.value))}
			/>
		</div>
	{:else}
		<div class="flex flex-col gap-1">
			<label class="text-xs font-medium text-muted-foreground" for={`${idPrefix}-multiplier`}
				>Multiplier</label
			>
			<Input
				id={`${idPrefix}-multiplier`}
				type="number"
				value={String((modifier as MultiplierModifier).multiplier)}
				oninput={(event) => updateMultiplier(parseInt(event.currentTarget.value, 10) || 0)}
			/>
		</div>
	{/if}

	<div class="flex flex-col gap-1">
		<p class={cn('text-xs font-medium text-muted-foreground')}>Conditions</p>
		<CharacterConditionsForm
			bind:conditions={() => modifier.character_conditions, updateCharacterConditions}
			bind:choiceOptions
			{choiceSourceId}
			{allowChoiceConditions}
			{choiceRequiredError}
		/>
	</div>

	{#if onRemove}
		<Button
			type="button"
			size="sm"
			variant="link"
			class="mx-auto w-min text-destructive"
			onclick={() => {
				if (isExperienceTarget) {
					removeExperienceChoice((modifier as ExperienceModifier).choice_id);
				}
				onRemove();
			}}
		>
			Delete Character Modifier
		</Button>
	{/if}
</div>
