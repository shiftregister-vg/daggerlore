<script lang="ts">
	import type {
		CardOption,
		DamageType,
		Range,
		TraitId,
		WeaponModifier
	} from '@domain/schemas/rules';
	import * as Select from '$lib/components/ui/select';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DicePicker from '$lib/components/dice/dice-picker.svelte';
	import CharacterConditionsForm from '../character-conditions/form.svelte';
	import WeaponConditionsForm from '../weapon-conditions/form.svelte';
	import { capitalize, cn } from '$lib/utils';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import {
		homebrewErrorsAt,
		homebrewMessagesBelow,
		type HomebrewErrorPath,
		type HomebrewErrorSummary
	} from '$lib/components/homebrew/forms/helpers';

	type AttackOrDamageModifier = Extract<
		WeaponModifier,
		{ target_stat: 'attack_roll' | 'damage_bonus' }
	>;
	type FlatAttackOrDamageModifier = Extract<AttackOrDamageModifier, { type: 'flat' }>;
	type DerivedAttackOrDamageModifier = Extract<
		AttackOrDamageModifier,
		{ type: 'derived_from_trait' }
	>;
	type DamageDiceModifier = Extract<WeaponModifier, { target_stat: 'damage_dice' }>;
	type DamageTypeModifier = Extract<WeaponModifier, { target_stat: 'damage_type' }>;
	type RangeModifier = Extract<WeaponModifier, { target_stat: 'range' }>;
	type TraitModifier = Extract<WeaponModifier, { target_stat: 'trait' }>;

	let {
		modifier = $bindable(),
		choiceOptions = $bindable([]),
		choiceSourceId,
		allowChoiceConditions = false,
		onRemove,
		errorSummary,
		path,
		idPrefix = 'weapon-modifier'
	}: {
		modifier: WeaponModifier;
		choiceOptions?: CardOption[];
		choiceSourceId?: string;
		allowChoiceConditions?: boolean;
		onRemove?: () => void;
		errorSummary: HomebrewErrorSummary;
		path: HomebrewErrorPath;
		idPrefix?: string;
	} = $props();

	type ModifierBehaviour = WeaponModifier['behaviour'];
	type ModifierTargetWeapon = WeaponModifier['target_weapon'];
	type ModifierTargetStat = WeaponModifier['target_stat'];
	type NumericModifierType = 'flat' | 'derived_from_trait';

	const behaviourOptions: ModifierBehaviour[] = ['bonus', 'base', 'override'];
	const targetWeaponOptions: ModifierTargetWeapon[] = ['primary', 'secondary', 'unarmed', 'all'];
	const numericModifierTypeOptions: NumericModifierType[] = ['flat', 'derived_from_trait'];
	const targetStatOptions: ModifierTargetStat[] = [
		'attack_roll',
		'damage_bonus',
		'damage_dice',
		'damage_type',
		'range',
		'trait'
	];
	const rangeOptions: Range[] = ['Melee', 'Very Close', 'Close', 'Far', 'Very Far'];
	const damageTypeOptions: DamageType[] = ['phy', 'mag'];
	const traitOptions: TraitId[] = [
		'agility',
		'strength',
		'finesse',
		'instinct',
		'presence',
		'knowledge'
	];

	const targetWeaponLabels: Record<ModifierTargetWeapon, string> = {
		primary: 'Primary',
		secondary: 'Secondary',
		unarmed: 'Unarmed',
		all: 'All'
	};

	const targetStatLabels: Record<ModifierTargetStat, string> = {
		attack_roll: 'Attack Roll',
		damage_bonus: 'Damage Bonus',
		damage_dice: 'Damage Dice',
		damage_type: 'Damage Type',
		range: 'Range',
		trait: 'Trait'
	};

	const behaviourLabels: Record<ModifierBehaviour, string> = {
		bonus: 'Bonus',
		base: 'Base',
		override: 'Override'
	};
	const numericModifierTypeLabels: Record<NumericModifierType, string> = {
		flat: 'Flat',
		derived_from_trait: 'Derived from Trait'
	};

	function messagesAt(...suffix: HomebrewErrorPath): string[] {
		return homebrewErrorsAt(errorSummary, [...path, ...suffix]);
	}

	const targetErrors = $derived.by(() => [...messagesAt('target_stat'), ...messagesAt('dice')]);
	const choiceRequiredError = $derived.by(
		() => homebrewMessagesBelow(errorSummary, [...path, 'character_conditions'])[0]
	);

	function getNumericModifierType(modifier: AttackOrDamageModifier): NumericModifierType {
		return 'type' in modifier && modifier.type === 'derived_from_trait'
			? 'derived_from_trait'
			: 'flat';
	}

	function getDerivedTrait(modifier: AttackOrDamageModifier): TraitId {
		return 'type' in modifier && modifier.type === 'derived_from_trait'
			? modifier.trait
			: 'agility';
	}

	function getMultiplier(modifier: AttackOrDamageModifier): number {
		return 'type' in modifier && modifier.type === 'derived_from_trait' ? modifier.multiplier : 1;
	}

	function getFlatValue(modifier: AttackOrDamageModifier): number {
		return 'type' in modifier && modifier.type === 'derived_from_trait' ? 0 : modifier.value;
	}

	function isFlatNumericModifier(modifier: AttackOrDamageModifier): boolean {
		return getNumericModifierType(modifier) === 'flat';
	}

	function isDerivedNumericModifier(modifier: AttackOrDamageModifier): boolean {
		return getNumericModifierType(modifier) === 'derived_from_trait';
	}

	function updateTargetStat(nextTargetStat: ModifierTargetStat) {
		const base = {
			behaviour: modifier.behaviour,
			character_conditions: modifier.character_conditions,
			weapon_conditions: modifier.weapon_conditions,
			target_weapon: modifier.target_weapon
		};

		if (nextTargetStat === 'attack_roll' || nextTargetStat === 'damage_bonus') {
			modifier = {
				...base,
				target_stat: nextTargetStat,
				type: 'flat',
				value: 0
			} as WeaponModifier;
			return;
		}

		if (nextTargetStat === 'damage_dice') {
			modifier = { ...base, target_stat: 'damage_dice', dice: '' } as WeaponModifier;
			return;
		}

		if (nextTargetStat === 'damage_type') {
			modifier = { ...base, target_stat: 'damage_type', damage_type: 'phy' } as WeaponModifier;
			return;
		}

		if (nextTargetStat === 'range') {
			modifier = { ...base, target_stat: 'range', range: 'Melee' } as WeaponModifier;
			return;
		}

		modifier = { ...base, target_stat: 'trait', trait: 'agility' } as WeaponModifier;
	}

	function updateValue(value: number) {
		if (
			(modifier.target_stat === 'attack_roll' || modifier.target_stat === 'damage_bonus') &&
			isFlatNumericModifier(modifier as AttackOrDamageModifier)
		) {
			modifier = { ...(modifier as AttackOrDamageModifier), type: 'flat', value } as WeaponModifier;
		}
	}

	function updateNumericModifierType(type: NumericModifierType) {
		if (modifier.target_stat !== 'attack_roll' && modifier.target_stat !== 'damage_bonus') return;

		const base = {
			behaviour: modifier.behaviour,
			character_conditions: modifier.character_conditions,
			weapon_conditions: modifier.weapon_conditions,
			target_weapon: modifier.target_weapon,
			target_stat: modifier.target_stat
		};

		if (type === 'flat') {
			modifier = { ...base, type: 'flat', value: 0 } as WeaponModifier;
			return;
		}

		modifier = {
			...base,
			type: 'derived_from_trait',
			trait: 'agility',
			multiplier: 1
		} as WeaponModifier;
	}

	function resetDice() {
		if (modifier.target_stat === 'damage_dice') {
			modifier = { ...(modifier as DamageDiceModifier), dice: '' };
		}
	}

	function updateDice(dice: string) {
		if (modifier.target_stat === 'damage_dice') {
			modifier = { ...(modifier as DamageDiceModifier), dice };
		}
	}

	function updateDamageType(damageType: DamageType) {
		if (modifier.target_stat === 'damage_type') {
			modifier = { ...(modifier as DamageTypeModifier), damage_type: damageType };
		}
	}

	function updateRange(range: Range) {
		if (modifier.target_stat === 'range') {
			modifier = { ...(modifier as RangeModifier), range };
		}
	}

	function updateTrait(trait: TraitId) {
		if (modifier.target_stat === 'trait') {
			modifier = { ...(modifier as TraitModifier), trait };
		}
	}

	function updateDerivedTrait(trait: TraitId) {
		if (
			(modifier.target_stat === 'attack_roll' || modifier.target_stat === 'damage_bonus') &&
			isDerivedNumericModifier(modifier as AttackOrDamageModifier)
		) {
			modifier = { ...(modifier as DerivedAttackOrDamageModifier), trait };
		}
	}

	function updateMultiplier(multiplier: number) {
		if (
			(modifier.target_stat === 'attack_roll' || modifier.target_stat === 'damage_bonus') &&
			isDerivedNumericModifier(modifier as AttackOrDamageModifier)
		) {
			modifier = { ...(modifier as DerivedAttackOrDamageModifier), multiplier };
		}
	}

	function updateCharacterConditions(conditions: WeaponModifier['character_conditions']) {
		modifier = { ...modifier, character_conditions: conditions } as WeaponModifier;
	}

	function updateWeaponConditions(conditions: WeaponModifier['weapon_conditions']) {
		modifier = { ...modifier, weapon_conditions: conditions } as WeaponModifier;
	}
</script>

<div class="flex flex-col gap-3 rounded-lg border bg-muted p-3">
	<div class="flex flex-col gap-1">
		<p class="text-xs font-medium text-muted-foreground">Target weapon</p>
		<Select.Root
			type="single"
			value={modifier.target_weapon}
			onValueChange={(value) =>
				value && (modifier = { ...modifier, target_weapon: value as ModifierTargetWeapon })}
		>
			<Select.Trigger class="w-full">
				<p class="truncate">{targetWeaponLabels[modifier.target_weapon]}</p>
			</Select.Trigger>
			<Select.Content>
				{#each targetWeaponOptions as targetWeapon}
					<Select.Item value={targetWeapon}>{targetWeaponLabels[targetWeapon]}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<div class="flex flex-col gap-1">
		<p
			class={cn(
				'text-xs font-medium text-muted-foreground',
				targetErrors.length > 0 && 'text-destructive'
			)}
		>
			Weapon stat to modify
		</p>
		<Select.Root
			type="single"
			value={modifier.target_stat}
			onValueChange={(value) => value && updateTargetStat(value as ModifierTargetStat)}
		>
			<Select.Trigger class={cn('w-full', targetErrors.length > 0 && 'border-destructive')}>
				<p class="truncate">{targetStatLabels[modifier.target_stat]}</p>
			</Select.Trigger>
			<Select.Content>
				{#each targetStatOptions as targetStat}
					<Select.Item value={targetStat}>{targetStatLabels[targetStat]}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		{#each targetErrors as error}
			<p class="text-xs text-destructive">{error}</p>
		{/each}
	</div>

	{#if modifier.target_stat === 'attack_roll' || modifier.target_stat === 'damage_bonus'}
		<div class="flex flex-col gap-3">
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
						value={getNumericModifierType(modifier as AttackOrDamageModifier)}
						onValueChange={(value) =>
							value && updateNumericModifierType(value as NumericModifierType)}
					>
						<Select.Trigger class="w-full">
							<p class="truncate">
								{numericModifierTypeLabels[
									getNumericModifierType(modifier as AttackOrDamageModifier)
								]}
							</p>
						</Select.Trigger>
						<Select.Content>
							{#each numericModifierTypeOptions as option}
								<Select.Item value={option}>{numericModifierTypeLabels[option]}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			{#if getNumericModifierType(modifier as AttackOrDamageModifier) === 'flat'}
				<div class="flex flex-col gap-1">
					<label class="text-xs font-medium text-muted-foreground" for={`${idPrefix}-value`}
						>Value</label
					>
					<Input
						id={`${idPrefix}-value`}
						type="number"
						value={String(getFlatValue(modifier as AttackOrDamageModifier))}
						oninput={(event) => updateValue(Number(event.currentTarget.value))}
					/>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-2">
					<div class="flex flex-col gap-1">
						<p class="text-xs font-medium text-muted-foreground">Trait</p>
						<Select.Root
							type="single"
							value={getDerivedTrait(modifier as AttackOrDamageModifier)}
							onValueChange={(value) => value && updateDerivedTrait(value as TraitId)}
						>
							<Select.Trigger class="w-full">
								<p class="truncate">
									{capitalize(getDerivedTrait(modifier as AttackOrDamageModifier))}
								</p>
							</Select.Trigger>
							<Select.Content>
								{#each traitOptions as trait}
									<Select.Item value={trait}>{capitalize(trait)}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-muted-foreground" for={`${idPrefix}-multiplier`}>
							Multiplier
						</label>
						<Input
							id={`${idPrefix}-multiplier`}
							type="number"
							value={String(getMultiplier(modifier as AttackOrDamageModifier))}
							oninput={(event) => updateMultiplier(Number(event.currentTarget.value))}
						/>
					</div>
				</div>
			{/if}
		</div>
	{:else}
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
		{#if modifier.target_stat === 'damage_dice'}
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between gap-2">
					<div class="flex items-center gap-2 truncate">
						<p class="text-xs font-medium text-muted-foreground">Dice</p>
						{#if (modifier as DamageDiceModifier).dice}
							<span class="truncate text-xs text-muted-foreground"
								>({(modifier as DamageDiceModifier).dice})</span
							>
						{/if}
					</div>
					<button
						type="button"
						class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:hidden"
						disabled={!(modifier as DamageDiceModifier).dice}
						onclick={resetDice}
					>
						Reset
						<RotateCcw class="size-3.5" />
					</button>
				</div>
				<DicePicker value={(modifier as DamageDiceModifier).dice} onChange={updateDice} />
			</div>
		{:else if modifier.target_stat === 'damage_type'}
			<div class="flex flex-col gap-1">
				<p class="text-xs font-medium text-muted-foreground">Damage Type</p>
				<Select.Root
					type="single"
					value={(modifier as DamageTypeModifier).damage_type}
					onValueChange={(value) => value && updateDamageType(value as DamageType)}
				>
					<Select.Trigger class="w-full">
						<p class="truncate">
							{(modifier as DamageTypeModifier).damage_type === 'phy' ? 'Physical' : 'Magical'}
						</p>
					</Select.Trigger>
					<Select.Content>
						{#each damageTypeOptions as damageType}
							<Select.Item value={damageType}
								>{damageType === 'phy' ? 'Physical' : 'Magical'}</Select.Item
							>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		{:else if modifier.target_stat === 'range'}
			<div class="flex flex-col gap-1">
				<p class="text-xs font-medium text-muted-foreground">Range</p>
				<Select.Root
					type="single"
					value={(modifier as RangeModifier).range}
					onValueChange={(value) => value && updateRange(value as Range)}
				>
					<Select.Trigger class="w-full">
						<p class="truncate">{(modifier as RangeModifier).range}</p>
					</Select.Trigger>
					<Select.Content>
						{#each rangeOptions as range}
							<Select.Item value={range}>{range}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		{:else}
			<div class="flex flex-col gap-1">
				<p class="text-xs font-medium text-muted-foreground">Trait</p>
				<Select.Root
					type="single"
					value={(modifier as TraitModifier).trait}
					onValueChange={(value) => value && updateTrait(value as TraitId)}
				>
					<Select.Trigger class="w-full">
						<p class="truncate">{capitalize((modifier as TraitModifier).trait)}</p>
					</Select.Trigger>
					<Select.Content>
						{#each traitOptions as trait}
							<Select.Item value={trait}>{capitalize(trait)}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		{/if}
	{/if}

	<div class="flex flex-col gap-1">
		<p
			class={cn(
				'text-xs font-medium text-muted-foreground',
				choiceRequiredError && 'text-destructive'
			)}
		>
			Character Conditions
		</p>
		<CharacterConditionsForm
			bind:conditions={() => modifier.character_conditions, updateCharacterConditions}
			bind:choiceOptions
			{choiceSourceId}
			{allowChoiceConditions}
			{choiceRequiredError}
		/>
	</div>

	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-muted-foreground">Weapon Conditions</p>
		<WeaponConditionsForm
			bind:conditions={() => modifier.weapon_conditions, updateWeaponConditions}
		/>
	</div>

	{#if onRemove}
		<Button
			type="button"
			size="sm"
			variant="link"
			class="mx-auto w-min text-destructive"
			onclick={onRemove}
		>
			Delete Weapon Modifier
		</Button>
	{/if}
</div>
