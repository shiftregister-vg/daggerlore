import type {
	Character,
	CharacterClassBanner,
	CharacterClassBannerDomain,
	Companion
} from '@domain/schemas/characters';
import {
	type DomainCard,
	type AncestryCard,
	type CommunityCard,
	type Transformation,
	type CharacterClass,
	type Subclass,
	type PrimaryWeapon,
	type SecondaryWeapon,
	type Armor,
	type Loot,
	type Consumable,
	type UnarmedAttack,
	type Beastform,
	type CompendiumContent,
	type Domain,
	type SubclassLevelUpOption
} from '@domain/schemas/compendium';
import type {
	Traits,
	TraitId,
	AllTierLevelUpOptionId,
	LevelUpChoice,
	LevelUpOption,
	DamageThresholds,
	DamageType,
	CharacterCondition,
	CharacterModifier,
	WeaponCondition,
	WeaponModifier,
	Feature,
	CardOption
} from '@domain/schemas/rules';
import {
	ALL_LEVEL_UP_OPTIONS,
	BASE_COMPANION,
	BASE_STATS,
	COMPANION_BASE_EXPERIENCE_MODIFIER
} from '@domain/constants/rules';
import { increaseDie, increase_range } from '$lib/utils';

type InventoryPrimaryWeapon = PrimaryWeapon & { inventory_id: string };
type InventorySecondaryWeapon = SecondaryWeapon & { inventory_id: string };
type InventoryArmor = Armor & { inventory_id: string };
type InventoryLoot = Loot & { inventory_id: string };
type InventoryConsumable = Consumable & { inventory_id: string; quantity: number };
type VaultDomainCard = DomainCard & { id: string };
type SubclassCardType = 'foundation' | 'specialization' | 'mastery';
type SubclassSide = 'primary' | 'secondary';
type ActiveSubclassLevelUpOption = SubclassLevelUpOption & {
	subclass_side: SubclassSide;
	subclass_id: string;
	granted_level: number;
	selected_domain_cards: DomainCard[];
};

export type DerivedCharacterData = {
	// level up choices
	tier_2_marked_traits: Traits;
	tier_3_marked_traits: Traits;
	tier_4_marked_traits: Traits;
	level_up_options_used: Record<AllTierLevelUpOptionId, number>;
	level_up_domain_cards: {
		1: { A?: DomainCard; B?: DomainCard };
		2: { A?: DomainCard };
		3: { A?: DomainCard };
		4: { A?: DomainCard };
		5: { A?: DomainCard };
		6: { A?: DomainCard };
		7: { A?: DomainCard };
		8: { A?: DomainCard };
		9: { A?: DomainCard };
		10: { A?: DomainCard };
	};
	level_up_chosen_options: {
		1: { A?: LevelUpOption; B?: LevelUpOption };
		2: { A?: LevelUpOption; B?: LevelUpOption };
		3: { A?: LevelUpOption; B?: LevelUpOption };
		4: { A?: LevelUpOption; B?: LevelUpOption };
		5: { A?: LevelUpOption; B?: LevelUpOption };
		6: { A?: LevelUpOption; B?: LevelUpOption };
		7: { A?: LevelUpOption; B?: LevelUpOption };
		8: { A?: LevelUpOption; B?: LevelUpOption };
		9: { A?: LevelUpOption; B?: LevelUpOption };
		10: { A?: LevelUpOption; B?: LevelUpOption };
	};
	subclass_level_up_options: Record<number, ActiveSubclassLevelUpOption[]>;
	subclass_level_up_domain_cards: Record<string, DomainCard[]>;

	// queried compendium items
	ancestry_card?: AncestryCard;
	community_card?: CommunityCard;
	transformation_card?: Transformation;
	primary_class?: CharacterClass;
	primary_subclass?: Subclass;
	secondary_class?: CharacterClass;
	secondary_subclass?: Subclass;
	additional_domain_cards: Record<string, DomainCard>;
	additional_ancestry_cards: Record<string, AncestryCard>;
	additional_community_cards: Record<string, CommunityCard>;
	additional_transformation_cards: Record<string, Transformation>;

	// inventory (resolved against compendium, customizations applied)
	inventory_primary_weapons: (PrimaryWeapon & { inventory_id: string })[];
	inventory_secondary_weapons: (SecondaryWeapon & { inventory_id: string })[];
	inventory_armor: (Armor & { inventory_id: string })[];
	inventory_loot: (Loot & { inventory_id: string })[];
	inventory_consumables: (Consumable & { inventory_id: string; quantity: number })[];

	// derived active items (with modifiers applied)
	derived_armor?: Armor & { inventory_id: string };
	derived_unarmored?: Armor;
	derived_primary_weapon?: PrimaryWeapon & { inventory_id: string };
	derived_secondary_weapon?: SecondaryWeapon & { inventory_id: string };
	derived_unarmed_attack: UnarmedAttack;
	derived_beastform?: Beastform;
	derived_companion?: Companion;

	// derived stats
	domain_card_vault: (DomainCard & { id: string })[];
	domain_card_loadout: (DomainCard & { id: string })[];
	traits: Traits;
	proficiency: number;
	experience_modifiers: number[];
	max_experiences: number;
	max_loadout: number;
	max_hope: number;
	max_armor: number;
	max_hp: number;
	max_stress: number;
	max_burden: number;
	max_short_rest_actions: number;
	max_long_rest_actions: number;
	max_consumables: number;
	consumable_count: number;
	evasion: number;
	damage_thresholds: DamageThresholds;
	primary_class_mastery_level: number;
	secondary_class_mastery_level: number;
	spellcast_roll_bonus: number;

	// feature flags
	hasBeastformClassFeature: boolean;
	hasEvolutionHopeFeature: boolean;
	hasCompanionSubclassFeature: boolean;
	hasCompanionExpertTrainingSubclassFeature: boolean;
	hasCompanionAdvancedTrainingSubclassFeature: boolean;
	hasRallyClassFeature: boolean;
	hasRallyEpicPoetrySubclassFeature: boolean;
	hasUnstoppableClassFeature: boolean;
	hasPrayerDiceClassFeature: boolean;
	hasStrangePatternsClassFeature: boolean;
	hasSneakAttackClassFeature: boolean;
	hasCompatTrainingClassFeature: boolean;
};

export type DerivedCharacterState = {
	character: Character;
	derived: DerivedCharacterData;
	didCorrectCharacter: boolean;
};

type ScalarTarget = Exclude<
	CharacterModifier['target'],
	'trait' | 'experience_from_card_choice_selection'
>;

type ModifierBuckets = {
	base_character_modifiers: CharacterModifier[];
	bonus_character_modifiers: CharacterModifier[];
	override_character_modifiers: CharacterModifier[];
	base_weapon_modifiers: WeaponModifier[];
	bonus_weapon_modifiers: WeaponModifier[];
	override_weapon_modifiers: WeaponModifier[];
};

type DirectRefs = {
	ancestry_card?: AncestryCard;
	community_card?: CommunityCard;
	transformation_card?: Transformation;
	primary_class?: CharacterClass;
	primary_subclass?: Subclass;
	secondary_class?: CharacterClass;
	secondary_subclass?: Subclass;
	additional_domain_cards: Record<string, DomainCard>;
	additional_ancestry_cards: Record<string, AncestryCard>;
	additional_community_cards: Record<string, CommunityCard>;
	additional_transformation_cards: Record<string, Transformation>;
	inventory_primary_weapons: InventoryPrimaryWeapon[];
	inventory_secondary_weapons: InventorySecondaryWeapon[];
	inventory_armor: InventoryArmor[];
	inventory_loot: InventoryLoot[];
	inventory_consumables: InventoryConsumable[];
	derived_unarmored: Armor;
};

type LevelUpMetadata = Pick<
	DerivedCharacterData,
	| 'level_up_chosen_options'
	| 'level_up_domain_cards'
	| 'level_up_options_used'
	| 'subclass_level_up_options'
	| 'subclass_level_up_domain_cards'
	| 'tier_2_marked_traits'
	| 'tier_3_marked_traits'
	| 'tier_4_marked_traits'
>;

type ActiveBaseEquipment = {
	active_base_armor?: InventoryArmor;
	active_base_primary_weapon?: InventoryPrimaryWeapon;
	active_base_secondary_weapon?: InventorySecondaryWeapon;
};

type IntrinsicMastery = {
	intrinsic_primary_mastery_level: number;
	intrinsic_secondary_mastery_level: number;
};

type FeatureFlags = Pick<
	DerivedCharacterData,
	| 'hasBeastformClassFeature'
	| 'hasEvolutionHopeFeature'
	| 'hasCompanionSubclassFeature'
	| 'hasCompanionExpertTrainingSubclassFeature'
	| 'hasCompanionAdvancedTrainingSubclassFeature'
	| 'hasRallyClassFeature'
	| 'hasRallyEpicPoetrySubclassFeature'
	| 'hasUnstoppableClassFeature'
	| 'hasPrayerDiceClassFeature'
	| 'hasStrangePatternsClassFeature'
	| 'hasSneakAttackClassFeature'
	| 'hasCompatTrainingClassFeature'
>;

type EvaluationContext = {
	character: Character;
	refs: DirectRefs;
	level_up: LevelUpMetadata;
	domain_card_vault: VaultDomainCard[];
	domain_card_loadout: VaultDomainCard[];
	derived_beastform?: Beastform;
	traits: Traits;
	proficiency: number;
	primary_class_mastery_level: number;
	secondary_class_mastery_level: number;
	active_base_equipment: ActiveBaseEquipment;
};

type LoopState = {
	primary_mastery: number;
	secondary_mastery: number;
	max_loadout: number;
	traits: Traits;
	proficiency: number;
	loadout: VaultDomainCard[];
	modifiers: ModifierBuckets;
};

const ALL_TRAIT_IDS: TraitId[] = [
	'agility',
	'strength',
	'finesse',
	'instinct',
	'presence',
	'knowledge'
];

const EMPTY_TRAITS: Traits = { ...BASE_STATS.traits };

function clampMastery(level: number): number {
	return Math.max(0, Math.min(3, Math.trunc(level)));
}

function emptyMarkedTraits(): Traits {
	return { ...EMPTY_TRAITS };
}

function blankLevelUpChoice(): LevelUpChoice {
	return {};
}

function currentTier(level: number): 1 | 2 | 3 | 4 {
	if (level <= 1) return 1;
	if (level <= 4) return 2;
	if (level <= 7) return 3;
	return 4;
}

function levelAllowsOption(level: number, optionId: AllTierLevelUpOptionId): boolean {
	const tier = currentTier(level);
	if (tier === 2) return optionId.startsWith('tier_2_');
	if (tier === 3) return optionId.startsWith('tier_3_');
	if (tier === 4) return optionId.startsWith('tier_4_');
	return optionId === 'tier_1_domain_cards';
}

function sameDomainCardId(
	left: { card_id: string } | undefined,
	right: { card_id: string } | undefined
): boolean {
	return left?.card_id === right?.card_id;
}

function uniqueStrings(values: string[]): string[] {
	return [...new Set(values)];
}

function stageForMastery(mastery: number): SubclassCardType[] {
	if (mastery >= 3) return ['foundation', 'specialization', 'mastery'];
	if (mastery >= 2) return ['foundation', 'specialization'];
	if (mastery >= 1) return ['foundation'];
	return [];
}

function grantedLevelForSubclassStage(stage: SubclassCardType): number {
	if (stage === 'foundation') return 1;
	if (stage === 'specialization') return 5;
	return 8;
}

function buildEmptySubclassLevelUpOptions(): Record<number, ActiveSubclassLevelUpOption[]> {
	return {
		1: [],
		2: [],
		3: [],
		4: [],
		5: [],
		6: [],
		7: [],
		8: [],
		9: [],
		10: []
	};
}

function subclassOptionsForMastery(subclass: Subclass | undefined, mastery: number) {
	if (!subclass) return [];
	return [
		...(subclass.foundation_card.options ?? []),
		...(mastery >= 2 ? (subclass.specialization_card.options ?? []) : []),
		...(mastery >= 3 ? (subclass.mastery_card.options ?? []) : [])
	];
}

function sanitizeCardChoiceRecord(
	current: Record<string, string[]> | undefined,
	options: CardOption[] | undefined,
	experienceCount: number
): Record<string, string[]> | undefined {
	if (!options || options.length === 0) return undefined;

	const nextChoices: Record<string, string[]> = {};
	for (const option of options) {
		const source = current?.[option.choice_id] ?? [];
		let normalized = source;

		if (option.conditional_choice) {
			const dependency = nextChoices[option.conditional_choice.choice_id] ?? [];
			if (!dependency.includes(option.conditional_choice.selection_id)) {
				nextChoices[option.choice_id] = [];
				continue;
			}
		}

		if (option.type === 'arbitrary') {
			const validIds = new Set(option.options.map((item) => item.selection_id));
			normalized = uniqueStrings(source)
				.filter((value) => validIds.has(value))
				.slice(0, option.max);
		} else {
			normalized = uniqueStrings(source)
				.filter((value) => {
					const parsed = Number.parseInt(value, 10);
					return Number.isInteger(parsed) && parsed >= 0 && parsed < experienceCount;
				})
				.slice(0, option.max);
		}

		nextChoices[option.choice_id] = normalized;
	}

	return nextChoices;
}

function traitValue(traits: Traits, trait: TraitId): number {
	return traits[trait] ?? 0;
}

function getLevelChoiceOption(optionId?: AllTierLevelUpOptionId): LevelUpOption | undefined {
	return optionId ? ALL_LEVEL_UP_OPTIONS[optionId] : undefined;
}

function getSubclassCard(subclass: Subclass | undefined, type: SubclassCardType): Feature[] {
	if (!subclass) return [];
	if (type === 'foundation') return subclass.foundation_card.features;
	if (type === 'specialization') return subclass.specialization_card.features;
	return subclass.mastery_card.features;
}

function getSubclassCardLevelUpOptions(
	subclass: Subclass | undefined,
	type: SubclassCardType
): SubclassLevelUpOption[] {
	if (!subclass) return [];
	if (type === 'foundation') return subclass.foundation_card.level_up_options ?? [];
	if (type === 'specialization') return subclass.specialization_card.level_up_options ?? [];
	return subclass.mastery_card.level_up_options ?? [];
}

function baseFlagFromClasses(
	primaryClass: CharacterClass | undefined,
	secondaryClass: CharacterClass | undefined,
	title: string
): boolean {
	return (
		primaryClass?.class_features.some((feature) => feature.title === title) === true ||
		secondaryClass?.class_features.some((feature) => feature.title === title) === true
	);
}

function featureExists(features: Feature[], title: string): boolean {
	return features.some((feature) => feature.title === title);
}

function unlockedSecondaryDomainByLevel(character: Character, maxLevel: number): boolean {
	for (let level = 2; level <= Math.min(character.level, maxLevel); level++) {
		for (const slot of ['A', 'B'] as const) {
			const optionId = character.level_up_choices[level]?.[slot]?.option_id;
			if (optionId === 'tier_3_multiclass' || optionId === 'tier_4_multiclass') return true;
		}
	}
	return false;
}

function allowedDomainIdsForLevel(
	character: Character,
	refs: Pick<DirectRefs, 'primary_class'>,
	maxLevel: number
): Set<string> {
	const allowed = new Set<string>(
		[refs.primary_class?.primary_domain_id, refs.primary_class?.secondary_domain_id].filter(
			(value): value is string => !!value
		)
	);

	if (character.secondary_class_domain_id && unlockedSecondaryDomainByLevel(character, maxLevel)) {
		allowed.add(character.secondary_class_domain_id);
	}

	return allowed;
}

function customizePrimaryWeapon(
	item: Character['inventory']['primary_weapons'][number],
	compendium: CompendiumContent
): InventoryPrimaryWeapon | undefined {
	const base = compendium.primary_weapons[item.base_primary_weapon_id];
	if (!base) return undefined;
	return {
		...base,
		inventory_id: item.inventory_id,
		title: item.custom_title ?? base.title,
		level_requirement: item.custom_level_requirement ?? base.level_requirement,
		range: item.custom_range ?? base.range,
		available_damage_types: item.custom_available_damage_types ?? [...base.available_damage_types],
		burden: item.custom_burden ?? base.burden,
		damage_bonus: base.damage_bonus + (item.custom_damage_bonus ?? 0),
		damage_dice: item.custom_damage_dice ?? base.damage_dice,
		attack_roll_bonus: base.attack_roll_bonus + (item.custom_attack_roll_bonus ?? 0)
	};
}

function customizeSecondaryWeapon(
	item: Character['inventory']['secondary_weapons'][number],
	compendium: CompendiumContent
): InventorySecondaryWeapon | undefined {
	const base = compendium.secondary_weapons[item.base_secondary_weapon_id];
	if (!base) return undefined;
	return {
		...base,
		inventory_id: item.inventory_id,
		title: item.custom_title ?? base.title,
		level_requirement: item.custom_level_requirement ?? base.level_requirement,
		range: item.custom_range ?? base.range,
		available_damage_types: item.custom_available_damage_types ?? [...base.available_damage_types],
		burden: item.custom_burden ?? base.burden,
		damage_bonus: base.damage_bonus + (item.custom_damage_bonus ?? 0),
		damage_dice: item.custom_damage_dice ?? base.damage_dice,
		attack_roll_bonus: base.attack_roll_bonus + (item.custom_attack_roll_bonus ?? 0)
	};
}

function customizeArmor(
	item: Character['inventory']['armor'][number],
	compendium: CompendiumContent
): InventoryArmor | undefined {
	const base = compendium.armor[item.base_armor_id];
	if (!base) return undefined;
	return {
		...base,
		inventory_id: item.inventory_id,
		title: item.custom_title ?? base.title,
		level_requirement: item.custom_level_requirement ?? base.level_requirement,
		max_armor: item.custom_max_armor ?? base.max_armor,
		damage_thresholds: {
			major: item.custom_damage_thresholds?.major ?? base.damage_thresholds.major,
			severe: item.custom_damage_thresholds?.severe ?? base.damage_thresholds.severe
		}
	};
}

function customizeLoot(
	item: Character['inventory']['loot'][number],
	compendium: CompendiumContent
): InventoryLoot | undefined {
	const base = compendium.loot[item.base_loot_id];
	if (!base) return undefined;
	return {
		...base,
		inventory_id: item.inventory_id,
		title: item.custom_title ?? base.title,
		description_html: item.custom_description ?? base.description_html
	};
}

function customizeConsumable(
	item: Character['inventory']['consumables'][number],
	compendium: CompendiumContent
): InventoryConsumable | undefined {
	const base = compendium.consumables[item.base_consumable_id];
	if (!base) return undefined;
	return {
		...base,
		inventory_id: item.inventory_id,
		quantity: item.quantity ?? 1,
		title: item.custom_title ?? base.title,
		description_html: item.custom_description ?? base.description_html
	};
}

function resolveMixedAncestry(
	character: Character,
	baseCard: AncestryCard,
	compendium: CompendiumContent
): AncestryCard {
	const choice = character.mixed_ancestry_choices[character.ancestry_card_id ?? ''];
	if (!baseCard.is_mixed_ancestry || !choice) return baseCard;

	const top = choice.top_ancestry_id
		? compendium.ancestry_cards[choice.top_ancestry_id]
		: undefined;
	const bottom = choice.bottom_ancestry_id
		? compendium.ancestry_cards[choice.bottom_ancestry_id]
		: undefined;

	return {
		...baseCard,
		features: [top?.features[0], bottom?.features[1]].filter(
			(feature): feature is Feature => !!feature
		),
		options: [...(top?.options ?? []), ...(bottom?.options ?? [])]
	};
}

function resolveDirectReferences(character: Character, compendium: CompendiumContent): DirectRefs {
	const baseAncestry = character.ancestry_card_id
		? compendium.ancestry_cards[character.ancestry_card_id]
		: undefined;
	const ancestry_card = baseAncestry
		? resolveMixedAncestry(character, baseAncestry, compendium)
		: undefined;

	return {
		ancestry_card,
		community_card: character.community_card_id
			? compendium.community_cards[character.community_card_id]
			: undefined,
		transformation_card: character.transformation_card_id
			? compendium.transformations[character.transformation_card_id]
			: undefined,
		primary_class: character.primary_class_id
			? compendium.classes[character.primary_class_id]
			: undefined,
		primary_subclass: character.primary_subclass_id
			? compendium.subclasses[character.primary_subclass_id]
			: undefined,
		secondary_class: character.secondary_class_id
			? compendium.classes[character.secondary_class_id]
			: undefined,
		secondary_subclass: character.secondary_subclass_id
			? compendium.subclasses[character.secondary_subclass_id]
			: undefined,
		additional_domain_cards: Object.fromEntries(
			character.additional_domain_card_ids
				.map(({ card_id }) => [card_id, compendium.domain_cards[card_id]] as const)
				.filter((entry): entry is [string, DomainCard] => !!entry[1])
		),
		additional_ancestry_cards: Object.fromEntries(
			character.additional_ancestry_card_ids
				.map((id) => [id, compendium.ancestry_cards[id]] as const)
				.filter((entry): entry is [string, AncestryCard] => !!entry[1])
		),
		additional_community_cards: Object.fromEntries(
			character.additional_community_card_ids
				.map((id) => [id, compendium.community_cards[id]] as const)
				.filter((entry): entry is [string, CommunityCard] => !!entry[1])
		),
		additional_transformation_cards: Object.fromEntries(
			character.additional_transformation_card_ids
				.map((id) => [id, compendium.transformations[id]] as const)
				.filter((entry): entry is [string, Transformation] => !!entry[1])
		),
		inventory_primary_weapons: character.inventory.primary_weapons
			.map((item) => customizePrimaryWeapon(item, compendium))
			.filter((item): item is InventoryPrimaryWeapon => !!item),
		inventory_secondary_weapons: character.inventory.secondary_weapons
			.map((item) => customizeSecondaryWeapon(item, compendium))
			.filter((item): item is InventorySecondaryWeapon => !!item),
		inventory_armor: character.inventory.armor
			.map((item) => customizeArmor(item, compendium))
			.filter((item): item is InventoryArmor => !!item),
		inventory_loot: character.inventory.loot
			.map((item) => customizeLoot(item, compendium))
			.filter((item): item is InventoryLoot => !!item),
		inventory_consumables: character.inventory.consumables
			.map((item) => customizeConsumable(item, compendium))
			.filter((item): item is InventoryConsumable => !!item),
		derived_unarmored: { ...BASE_STATS.unarmored }
	};
}

function deriveLevelUpMetadata(
	character: Character,
	compendium: CompendiumContent,
	refs: DirectRefs,
	intrinsic: IntrinsicMastery
): LevelUpMetadata {
	const resolveDomainCard = (level: number, slot: 'A' | 'B') => {
		const selected = character.level_up_domain_card_ids[level]?.[slot];
		return selected ? compendium.domain_cards[selected.card_id] : undefined;
	};

	const level_up_domain_cards: LevelUpMetadata['level_up_domain_cards'] = {
		1: { A: resolveDomainCard(1, 'A'), B: resolveDomainCard(1, 'B') },
		2: { A: resolveDomainCard(2, 'A') },
		3: { A: resolveDomainCard(3, 'A') },
		4: { A: resolveDomainCard(4, 'A') },
		5: { A: resolveDomainCard(5, 'A') },
		6: { A: resolveDomainCard(6, 'A') },
		7: { A: resolveDomainCard(7, 'A') },
		8: { A: resolveDomainCard(8, 'A') },
		9: { A: resolveDomainCard(9, 'A') },
		10: { A: resolveDomainCard(10, 'A') }
	};

	const level_up_chosen_options: LevelUpMetadata['level_up_chosen_options'] = {
		1: {},
		2: {
			A: getLevelChoiceOption(character.level_up_choices[2]?.A?.option_id),
			B: getLevelChoiceOption(character.level_up_choices[2]?.B?.option_id)
		},
		3: {
			A: getLevelChoiceOption(character.level_up_choices[3]?.A?.option_id),
			B: getLevelChoiceOption(character.level_up_choices[3]?.B?.option_id)
		},
		4: {
			A: getLevelChoiceOption(character.level_up_choices[4]?.A?.option_id),
			B: getLevelChoiceOption(character.level_up_choices[4]?.B?.option_id)
		},
		5: {
			A: getLevelChoiceOption(character.level_up_choices[5]?.A?.option_id),
			B: getLevelChoiceOption(character.level_up_choices[5]?.B?.option_id)
		},
		6: {
			A: getLevelChoiceOption(character.level_up_choices[6]?.A?.option_id),
			B: getLevelChoiceOption(character.level_up_choices[6]?.B?.option_id)
		},
		7: {
			A: getLevelChoiceOption(character.level_up_choices[7]?.A?.option_id),
			B: getLevelChoiceOption(character.level_up_choices[7]?.B?.option_id)
		},
		8: {
			A: getLevelChoiceOption(character.level_up_choices[8]?.A?.option_id),
			B: getLevelChoiceOption(character.level_up_choices[8]?.B?.option_id)
		},
		9: {
			A: getLevelChoiceOption(character.level_up_choices[9]?.A?.option_id),
			B: getLevelChoiceOption(character.level_up_choices[9]?.B?.option_id)
		},
		10: {
			A: getLevelChoiceOption(character.level_up_choices[10]?.A?.option_id),
			B: getLevelChoiceOption(character.level_up_choices[10]?.B?.option_id)
		}
	};

	const subclass_level_up_options = buildEmptySubclassLevelUpOptions();
	const subclass_level_up_domain_cards: Record<string, DomainCard[]> = {};

	const collectSubclassOptions = (
		subclass: Subclass | undefined,
		subclass_id: string | undefined,
		subclass_side: SubclassSide,
		mastery: number
	) => {
		if (!subclass || !subclass_id) return;

		for (const stage of stageForMastery(mastery)) {
			const sourceOptions = getSubclassCardLevelUpOptions(subclass, stage);
			const granted_level = grantedLevelForSubclassStage(stage);

			for (const option of sourceOptions) {
				const selected_domain_cards = (
					character.subclass_level_up_choices?.[option.option_id] ?? []
				)
					.map((id) => compendium.domain_cards[id])
					.filter((card): card is DomainCard => !!card);
				const resolvedOption: ActiveSubclassLevelUpOption = {
					...option,
					subclass_side,
					subclass_id,
					granted_level,
					selected_domain_cards
				};

				subclass_level_up_options[granted_level].push(resolvedOption);
				subclass_level_up_domain_cards[option.option_id] = selected_domain_cards;
			}
		}
	};

	collectSubclassOptions(
		refs.primary_subclass,
		character.primary_subclass_id,
		'primary',
		intrinsic.intrinsic_primary_mastery_level
	);
	collectSubclassOptions(
		refs.secondary_subclass,
		character.secondary_subclass_id,
		'secondary',
		intrinsic.intrinsic_secondary_mastery_level
	);

	const level_up_options_used = Object.keys(ALL_LEVEL_UP_OPTIONS).reduce(
		(acc, optionId) => {
			acc[optionId as AllTierLevelUpOptionId] = 0;
			return acc;
		},
		{} as Record<AllTierLevelUpOptionId, number>
	);

	for (let level = 2; level <= character.level; level++) {
		for (const slot of ['A', 'B'] as const) {
			const optionId = character.level_up_choices[level]?.[slot]?.option_id;
			if (optionId) level_up_options_used[optionId] += 1;
		}
	}

	const tier_2_marked_traits = emptyMarkedTraits();
	const tier_3_marked_traits = emptyMarkedTraits();
	const tier_4_marked_traits = emptyMarkedTraits();

	for (let level = 2; level <= character.level; level++) {
		for (const slot of ['A', 'B'] as const) {
			const choice = character.level_up_choices[level]?.[slot];
			if (!choice?.option_id) continue;
			const target =
				level <= 4
					? tier_2_marked_traits
					: level <= 7
						? tier_3_marked_traits
						: tier_4_marked_traits;
			const trackedOptionIds =
				level <= 4
					? ['tier_2_traits']
					: level <= 7
						? ['tier_2_traits', 'tier_3_traits']
						: ['tier_2_traits', 'tier_3_traits', 'tier_4_traits'];
			if (!trackedOptionIds.includes(choice.option_id)) continue;
			for (const trait of [choice.marked_traits?.A, choice.marked_traits?.B]) {
				if (trait) target[trait] = 1;
			}
		}
	}

	return {
		level_up_chosen_options,
		level_up_domain_cards,
		subclass_level_up_options,
		subclass_level_up_domain_cards,
		level_up_options_used,
		tier_2_marked_traits,
		tier_3_marked_traits,
		tier_4_marked_traits
	};
}

function resolveActiveBaseEquipment(character: Character, refs: DirectRefs): ActiveBaseEquipment {
	return {
		active_base_armor: refs.inventory_armor.find(
			(item) =>
				item.inventory_id === character.active_armor_inventory_id &&
				item.level_requirement <= character.level
		),
		active_base_primary_weapon: refs.inventory_primary_weapons.find(
			(item) =>
				item.inventory_id === character.active_primary_weapon_inventory_id &&
				item.level_requirement <= character.level
		),
		active_base_secondary_weapon: refs.inventory_secondary_weapons.find(
			(item) =>
				item.inventory_id === character.active_secondary_weapon_inventory_id &&
				item.level_requirement <= character.level
		)
	};
}

function selectedValueOrDefault<T extends string>(
	selectedValues: string[] | undefined,
	allowedValues: readonly T[]
): T | undefined {
	const selectedValue = selectedValues?.[0];
	if (selectedValue && allowedValues.includes(selectedValue as T)) {
		return selectedValue as T;
	}
	return allowedValues[0];
}

function selectedInventoryWeaponDamageType(
	character: Character,
	weapon:
		| Pick<InventoryPrimaryWeapon, 'inventory_id' | 'available_damage_types'>
		| Pick<InventorySecondaryWeapon, 'inventory_id' | 'available_damage_types'>
		| undefined,
	weaponType: 'primary' | 'secondary'
): 'phy' | 'mag' | undefined {
	if (!weapon) return undefined;

	const inventoryItem =
		weaponType === 'primary'
			? character.inventory.primary_weapons.find(
					(item) => item.inventory_id === weapon.inventory_id
				)
			: character.inventory.secondary_weapons.find(
					(item) => item.inventory_id === weapon.inventory_id
				);

	return selectedValueOrDefault(
		inventoryItem?.choices['damage_type'],
		weapon.available_damage_types
	);
}

function selectedUnarmedDamageType(
	character: Character,
	unarmedAttack: Pick<UnarmedAttack, 'available_damage_types'>
): 'phy' | 'mag' | undefined {
	return selectedValueOrDefault(
		character.unarmed_attack_choices['damage_type'],
		unarmedAttack.available_damage_types
	);
}

function equippedWeaponBurden(
	weapon: Pick<InventoryPrimaryWeapon | InventorySecondaryWeapon, 'burden'> | undefined,
	ignoreBurden: boolean
): number {
	if (!weapon || ignoreBurden) return 0;
	return weapon.burden;
}

function totalEquippedWeaponBurden(
	activeBaseEquipment: Pick<
		ActiveBaseEquipment,
		'active_base_primary_weapon' | 'active_base_secondary_weapon'
	>,
	ignoreBurden: boolean
): number {
	return (
		equippedWeaponBurden(activeBaseEquipment.active_base_primary_weapon, ignoreBurden) +
		equippedWeaponBurden(activeBaseEquipment.active_base_secondary_weapon, ignoreBurden)
	);
}

function deriveIntrinsicMastery(character: Character): IntrinsicMastery {
	let intrinsic_primary_mastery_level = character.primary_class_id ? 1 : 0;
	let intrinsic_secondary_mastery_level = character.secondary_class_id ? 1 : 0;

	for (let level = 2; level <= character.level; level++) {
		for (const slot of ['A', 'B'] as const) {
			const choice = character.level_up_choices[level]?.[slot];
			if (
				choice?.option_id !== 'tier_3_subclass_upgrade' &&
				choice?.option_id !== 'tier_4_subclass_upgrade'
			) {
				continue;
			}
			if (choice.selected_subclass_upgrade === 'primary') intrinsic_primary_mastery_level += 1;
			if (choice.selected_subclass_upgrade === 'secondary') intrinsic_secondary_mastery_level += 1;
		}
	}

	return {
		intrinsic_primary_mastery_level: clampMastery(intrinsic_primary_mastery_level),
		intrinsic_secondary_mastery_level: clampMastery(intrinsic_secondary_mastery_level)
	};
}

function deriveBaseFeatureFlags(refs: DirectRefs): FeatureFlags {
	const hasBeastformClassFeature = baseFlagFromClasses(
		refs.primary_class,
		refs.secondary_class,
		'Beastform'
	);
	const hasEvolutionHopeFeature =
		hasBeastformClassFeature &&
		(refs.primary_class?.hope_feature.title === 'Evolution' ||
			refs.secondary_class?.hope_feature.title === 'Evolution');
	const hasCompanionSubclassFeature =
		(refs.primary_subclass?.title === 'Beastbound' &&
			featureExists(refs.primary_subclass.foundation_card.features, 'Companion')) ||
		(refs.secondary_subclass?.title === 'Beastbound' &&
			featureExists(refs.secondary_subclass.foundation_card.features, 'Companion'));

	return {
		hasBeastformClassFeature,
		hasEvolutionHopeFeature,
		hasCompanionSubclassFeature,
		hasCompanionExpertTrainingSubclassFeature: false,
		hasCompanionAdvancedTrainingSubclassFeature: false,
		hasRallyClassFeature: baseFlagFromClasses(refs.primary_class, refs.secondary_class, 'Rally'),
		hasRallyEpicPoetrySubclassFeature: false,
		hasUnstoppableClassFeature: baseFlagFromClasses(
			refs.primary_class,
			refs.secondary_class,
			'Unstoppable'
		),
		hasPrayerDiceClassFeature: baseFlagFromClasses(
			refs.primary_class,
			refs.secondary_class,
			'Prayer Dice'
		),
		hasStrangePatternsClassFeature: baseFlagFromClasses(
			refs.primary_class,
			refs.secondary_class,
			'Strange Patterns'
		),
		hasSneakAttackClassFeature: baseFlagFromClasses(
			refs.primary_class,
			refs.secondary_class,
			'Sneak Attack'
		),
		hasCompatTrainingClassFeature: baseFlagFromClasses(
			refs.primary_class,
			refs.secondary_class,
			'Combat Training'
		)
	};
}

function deriveCompanion(character: Character): Companion | undefined {
	if (!character.companion) return undefined;

	const base = character.companion;
	const targetSize = character.experiences.length;
	const maxChoicesLength = Math.max(0, character.level - 1);
	const level_up_choices = base.level_up_choices.slice(0, maxChoicesLength);
	const experiences = [
		...base.experiences.slice(0, targetSize),
		...Array(Math.max(0, targetSize - base.experiences.length)).fill('')
	];
	const experience_modifiers = Array(targetSize).fill(COMPANION_BASE_EXPERIENCE_MODIFIER);

	for (const experienceIndexStr of base.choices['intelligent'] ?? []) {
		const experienceIndex = Number.parseInt(experienceIndexStr, 10);
		if (Number.isInteger(experienceIndex) && experienceIndex >= 0 && experienceIndex < targetSize) {
			experience_modifiers[experienceIndex] += 1;
		}
	}

	let attack = base.attack ? { ...base.attack } : undefined;
	if (attack) {
		for (const choice of base.choices['vicious'] ?? []) {
			if (choice === 'damage_dice') attack.damage_dice = increaseDie(attack.damage_dice);
			if (choice === 'range') attack.range = increase_range(attack.range);
		}
	}

	const resilientCount = level_up_choices.filter((id) => id === 'resilient').length;
	const lightInTheDarkCount = level_up_choices.filter((id) => id === 'light-in-the-dark').length;
	const awareCount = level_up_choices.filter((id) => id === 'aware').length;
	const max_stress = base.max_stress + resilientCount;
	const max_hope = base.max_hope + lightInTheDarkCount;

	return {
		...base,
		attack,
		level_up_choices,
		experiences,
		experience_modifiers,
		max_stress,
		max_hope,
		evasion: base.evasion + awareCount * 2,
		marked_stress: Math.max(0, Math.min(base.marked_stress, max_stress)),
		marked_hope: Math.max(0, Math.min(base.marked_hope, max_hope))
	};
}

function customizeChosenBeastform(character: Character, base: Beastform): Beastform {
	return {
		...base,
		title: character.chosen_beastform?.custom_title ?? base.title,
		level_requirement:
			character.chosen_beastform?.custom_level_requirement ?? base.level_requirement
	};
}

function deriveBeastform(
	character: Character,
	compendium: CompendiumContent,
	baseFlags: FeatureFlags
): Beastform | undefined {
	if (!baseFlags.hasBeastformClassFeature || !character.chosen_beastform) return undefined;

	const chosen = character.chosen_beastform;
	const base = compendium.beastforms[chosen.beastform_id];
	if (!base) return undefined;
	const customized = customizeChosenBeastform(character, base);
	const choices = chosen.choices ?? {};

	if (!customized.special_case) {
		return character.level >= customized.level_requirement ? customized : undefined;
	}

	if (character.level < customized.level_requirement) {
		return undefined;
	}

	if (customized.special_case === 'legendary_beast') {
		const template = compendium.beastforms[chosen.beastform_id];
		const baseFormId = choices.legendary_beast_base_form?.[0] as string | undefined;
		const baseForm = baseFormId ? compendium.beastforms[baseFormId] : undefined;
		if (!template || !baseForm) return undefined;
		return {
			...baseForm,
			title: template.title,
			category: template.category,
			level_requirement: template.level_requirement,
			attack: { ...baseForm.attack, damage_bonus: baseForm.attack.damage_bonus + 6 },
			character_trait: { ...baseForm.character_trait, bonus: baseForm.character_trait.bonus + 1 },
			evasion_bonus: baseForm.evasion_bonus + 2
		};
	}

	if (customized.special_case === 'mythic_beast') {
		const template = compendium.beastforms[chosen.beastform_id];
		const baseFormId = choices.mythic_beast_base_form?.[0] as string | undefined;
		const baseForm = baseFormId ? compendium.beastforms[baseFormId] : undefined;
		if (!template || !baseForm) return undefined;
		return {
			...baseForm,
			title: template.title,
			category: template.category,
			level_requirement: template.level_requirement,
			attack: {
				...baseForm.attack,
				damage_dice: increaseDie(baseForm.attack.damage_dice),
				damage_bonus: baseForm.attack.damage_bonus + 9
			},
			character_trait: { ...baseForm.character_trait, bonus: baseForm.character_trait.bonus + 2 },
			evasion_bonus: baseForm.evasion_bonus + 3
		};
	}

	if (
		customized.special_case === 'legendary_hybrid' ||
		customized.special_case === 'mythic_hybrid'
	) {
		const template = compendium.beastforms[chosen.beastform_id];
		if (!template) return undefined;

		const minimumLevel = customized.special_case === 'legendary_hybrid' ? 5 : 8;
		const requiredForms = customized.special_case === 'legendary_hybrid' ? 2 : 3;
		const requiredAdvantages = customized.special_case === 'legendary_hybrid' ? 4 : 5;
		const requiredFeatures = customized.special_case === 'legendary_hybrid' ? 2 : 3;
		if (character.level < minimumLevel) return undefined;

		const baseFormIds = choices[
			customized.special_case === 'legendary_hybrid'
				? 'legendary_hybrid_base_forms'
				: 'mythic_hybrid_base_forms'
		] as string[] | undefined;
		if (!baseFormIds || baseFormIds.length !== requiredForms) return template;

		const baseForms = baseFormIds
			.map((id) => compendium.beastforms[id])
			.filter((form): form is Beastform => !!form);
		if (baseForms.length !== requiredForms) return template;

		const selectedAdvantages: string[] = [];
		const selectedFeatures: Feature[] = [];
		for (let index = 0; index < requiredForms; index++) {
			const advantageKey = `${customized.special_case}_base_forms_${index}_advantages`;
			const featureKey = `${customized.special_case}_base_forms_${index}_features`;
			for (const selectedIndex of choices[advantageKey] ?? []) {
				const parsedIndex = Number.parseInt(selectedIndex, 10);
				if (Number.isInteger(parsedIndex) && parsedIndex >= 0) {
					const advantage = baseForms[index].advantages[parsedIndex];
					if (advantage) selectedAdvantages.push(advantage);
				}
			}
			for (const selectedIndex of choices[featureKey] ?? []) {
				const parsedIndex = Number.parseInt(selectedIndex, 10);
				if (Number.isInteger(parsedIndex) && parsedIndex >= 0) {
					const feature = baseForms[index].features[parsedIndex];
					if (feature) selectedFeatures.push(feature);
				}
			}
		}

		if (
			selectedAdvantages.length !== requiredAdvantages ||
			selectedFeatures.length !== requiredFeatures
		) {
			return template;
		}

		return {
			...template,
			advantages: [...new Set(selectedAdvantages)],
			features: selectedFeatures
		};
	}

	return customized;
}

function deriveDomainCardVault(
	character: Character,
	compendium: CompendiumContent,
	refs: DirectRefs,
	level_up: LevelUpMetadata
): VaultDomainCard[] {
	const vault = new Map<string, VaultDomainCard>();
	const push = (cardId: string | undefined, card: DomainCard | undefined, maxLevel: number) => {
		if (!cardId || !card) return;
		if (card.level_requirement > character.level || card.level_requirement > maxLevel) return;
		const allowedDomains = allowedDomainIdsForLevel(character, refs, maxLevel);
		if (card.domain_id && !allowedDomains.has(card.domain_id)) return;
		if (!vault.has(cardId)) vault.set(cardId, { ...card, id: cardId });
	};

	push(character.level_up_domain_card_ids[1]?.A?.card_id, level_up.level_up_domain_cards[1].A, 1);
	push(character.level_up_domain_card_ids[1]?.B?.card_id, level_up.level_up_domain_cards[1].B, 1);

	for (let level = 2; level <= character.level; level++) {
		push(
			character.level_up_domain_card_ids[level]?.A?.card_id,
			level_up.level_up_domain_cards[level as keyof typeof level_up.level_up_domain_cards].A,
			level
		);
		for (const slot of ['A', 'B'] as const) {
			const selected = character.level_up_choices[level]?.[slot]?.selected_domain_card_id;
			if (!selected) continue;
			push(selected.card_id, compendium.domain_cards[selected.card_id], level);
		}
	}

	for (const [id, card] of Object.entries(refs.additional_domain_cards) as [string, DomainCard][]) {
		if (!vault.has(id)) vault.set(id, { ...card, id });
	}

	for (const options of Object.values(level_up.subclass_level_up_options)) {
		for (const option of options) {
			for (const cardId of character.subclass_level_up_choices?.[option.option_id] ?? []) {
				push(cardId, compendium.domain_cards[cardId], option.granted_level);
			}
		}
	}

	return [...vault.values()];
}

function deriveDomainCardLoadout(
	character: Character,
	vault: VaultDomainCard[],
	maxLoadout: number
): VaultDomainCard[] {
	const seen = new Set<string>();
	const explicit = character.loadout_domain_card_ids
		.filter(({ card_id, domain_id }) => {
			const key = `${domain_id ?? ''}:${card_id}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return vault.some(
				(card) => card.id === card_id && card.domain_id === domain_id && !card.forced_in_vault
			);
		})
		.map(({ card_id }) => vault.find((card) => card.id === card_id))
		.filter((card): card is VaultDomainCard => !!card);

	const merged = [...vault.filter((card) => card.forced_in_loadout), ...explicit];
	const uniqueById = new Map<string, VaultDomainCard>();
	for (const card of merged) {
		if (!uniqueById.has(card.id)) uniqueById.set(card.id, card);
	}
	return [...uniqueById.values()].slice(0, Math.max(0, maxLoadout));
}

function sameCardIds(left: VaultDomainCard[], right: VaultDomainCard[]): boolean {
	if (left.length !== right.length) return false;
	for (let index = 0; index < left.length; index++) {
		if (left[index].id !== right[index].id) return false;
	}
	return true;
}

function sameTraits(left: Traits, right: Traits): boolean {
	for (const trait of ALL_TRAIT_IDS) {
		if ((left[trait] ?? 0) !== (right[trait] ?? 0)) return false;
	}
	return true;
}

function evaluateCharacterCondition(
	condition: CharacterCondition,
	context: EvaluationContext
): boolean {
	if (condition.type === 'level') {
		return (
			context.character.level >= condition.min_level &&
			context.character.level <= condition.max_level
		);
	}
	if (condition.type === 'armor_equipped') {
		return condition.value === Boolean(context.active_base_equipment.active_base_armor);
	}
	if (condition.type === 'card_choice') {
		return (
			context.character.card_choices[condition.card_id]?.[condition.choice_id]?.includes(
				condition.selection_id
			) === true
		);
	}
	if (condition.type === 'loot_choice') {
		const loot = context.character.inventory.loot.find(
			(item) => item.base_loot_id === condition.loot_id
		);
		return loot?.choices[condition.choice_id]?.includes(condition.selection_id) === true;
	}
	if (condition.type === 'min_loadout_cards_from_domain') {
		return (
			context.domain_card_loadout.filter((card) => card.domain_id === condition.domain_id).length >=
			condition.min_cards
		);
	}
	if (condition.type === 'primary_weapon_equipped') {
		const equipped = context.active_base_equipment.active_base_primary_weapon;
		if (!equipped) return false;
		if (!condition.weapon_id) return true;
		const inventoryItem = context.character.inventory.primary_weapons.find(
			(item) => item.inventory_id === equipped.inventory_id
		);
		return String(inventoryItem?.base_primary_weapon_id) === String(condition.weapon_id);
	}
	if (condition.type === 'secondary_weapon_equipped') {
		const equipped = context.active_base_equipment.active_base_secondary_weapon;
		if (!equipped) return false;
		if (!condition.weapon_id) return true;
		const inventoryItem = context.character.inventory.secondary_weapons.find(
			(item) => item.inventory_id === equipped.inventory_id
		);
		return String(inventoryItem?.base_secondary_weapon_id) === String(condition.weapon_id);
	}
	return true;
}

function evaluateWeaponCondition(
	condition: WeaponCondition,
	weapon: PrimaryWeapon | SecondaryWeapon | UnarmedAttack,
	effectiveDamageType: DamageType | undefined
): boolean {
	if (condition.type === 'range') return condition.ranges.includes(weapon.range);
	if (condition.type === 'damage_type') return effectiveDamageType === condition.damage_type;
	return false;
}

function collectFeatureModifiers(features: Feature[], buckets: ModifierBuckets): void {
	for (const feature of features) {
		for (const modifier of feature.character_modifiers) {
			if (modifier.behaviour === 'base') buckets.base_character_modifiers.push(modifier);
			if (modifier.behaviour === 'bonus') buckets.bonus_character_modifiers.push(modifier);
			if (modifier.behaviour === 'override') buckets.override_character_modifiers.push(modifier);
		}
		for (const modifier of feature.weapon_modifiers) {
			if (modifier.behaviour === 'base') buckets.base_weapon_modifiers.push(modifier);
			if (modifier.behaviour === 'bonus') buckets.bonus_weapon_modifiers.push(modifier);
			if (modifier.behaviour === 'override') buckets.override_weapon_modifiers.push(modifier);
		}
	}
}

function collectLooseModifiers(
	modifiers: Pick<Loot, 'character_modifiers' | 'weapon_modifiers'>,
	buckets: ModifierBuckets
): void {
	for (const modifier of modifiers.character_modifiers) {
		if (modifier.behaviour === 'base') buckets.base_character_modifiers.push(modifier);
		if (modifier.behaviour === 'bonus') buckets.bonus_character_modifiers.push(modifier);
		if (modifier.behaviour === 'override') buckets.override_character_modifiers.push(modifier);
	}
	for (const modifier of modifiers.weapon_modifiers) {
		if (modifier.behaviour === 'base') buckets.base_weapon_modifiers.push(modifier);
		if (modifier.behaviour === 'bonus') buckets.bonus_weapon_modifiers.push(modifier);
		if (modifier.behaviour === 'override') buckets.override_weapon_modifiers.push(modifier);
	}
}

function collectActiveModifiers(context: EvaluationContext): ModifierBuckets {
	const buckets: ModifierBuckets = {
		base_character_modifiers: [],
		bonus_character_modifiers: [],
		override_character_modifiers: [],
		base_weapon_modifiers: [],
		bonus_weapon_modifiers: [],
		override_weapon_modifiers: []
	};

	if (context.refs.ancestry_card)
		collectFeatureModifiers(context.refs.ancestry_card.features, buckets);
	if (context.refs.community_card)
		collectFeatureModifiers(context.refs.community_card.features, buckets);
	if (context.refs.primary_class) {
		collectFeatureModifiers([context.refs.primary_class.hope_feature], buckets);
		collectFeatureModifiers(context.refs.primary_class.class_features, buckets);
	}
	if (context.refs.primary_subclass) {
		collectFeatureModifiers(getSubclassCard(context.refs.primary_subclass, 'foundation'), buckets);
		if (context.primary_class_mastery_level >= 2) {
			collectFeatureModifiers(
				getSubclassCard(context.refs.primary_subclass, 'specialization'),
				buckets
			);
		}
		if (context.primary_class_mastery_level >= 3) {
			collectFeatureModifiers(getSubclassCard(context.refs.primary_subclass, 'mastery'), buckets);
		}
	}
	if (context.refs.secondary_class) {
		collectFeatureModifiers(context.refs.secondary_class.class_features, buckets);
	}
	if (context.refs.secondary_subclass) {
		collectFeatureModifiers(
			getSubclassCard(context.refs.secondary_subclass, 'foundation'),
			buckets
		);
		if (context.secondary_class_mastery_level >= 2) {
			collectFeatureModifiers(
				getSubclassCard(context.refs.secondary_subclass, 'specialization'),
				buckets
			);
		}
		if (context.secondary_class_mastery_level >= 3) {
			collectFeatureModifiers(getSubclassCard(context.refs.secondary_subclass, 'mastery'), buckets);
		}
	}

	for (let level = 2; level <= context.character.level; level++) {
		const options =
			context.level_up.level_up_chosen_options[
				level as keyof typeof context.level_up.level_up_chosen_options
			];
		if (options.A) {
			collectFeatureModifiers(
				[
					{
						title: '',
						description_html: '',
						character_modifiers: options.A.character_modifiers,
						weapon_modifiers: []
					}
				],
				buckets
			);
		}
		if (options.B) {
			collectFeatureModifiers(
				[
					{
						title: '',
						description_html: '',
						character_modifiers: options.B.character_modifiers,
						weapon_modifiers: []
					}
				],
				buckets
			);
		}
	}

	for (const card of context.domain_card_loadout) collectFeatureModifiers(card.features, buckets);
	for (const card of context.domain_card_vault.filter((card) => card.applies_in_vault)) {
		collectFeatureModifiers(card.features, buckets);
	}
	if (context.active_base_equipment.active_base_armor) {
		collectFeatureModifiers(context.active_base_equipment.active_base_armor.features, buckets);
	}
	if (context.active_base_equipment.active_base_primary_weapon) {
		collectFeatureModifiers(
			context.active_base_equipment.active_base_primary_weapon.features,
			buckets
		);
	}
	if (context.active_base_equipment.active_base_secondary_weapon) {
		collectFeatureModifiers(
			context.active_base_equipment.active_base_secondary_weapon.features,
			buckets
		);
	}
	collectFeatureModifiers(BASE_STATS.unarmed_attack.features, buckets);

	for (const loot of context.refs.inventory_loot) {
		collectLooseModifiers(loot, buckets);
	}

	for (const card of Object.values(context.refs.additional_ancestry_cards)) {
		collectFeatureModifiers(card.features, buckets);
	}
	for (const card of Object.values(context.refs.additional_community_cards)) {
		collectFeatureModifiers(card.features, buckets);
	}
	return buckets;
}

function applyScalarModifiers(
	target: ScalarTarget,
	baseValue: number,
	modifiers: CharacterModifier[],
	context: EvaluationContext
): number {
	let value = baseValue;
	for (const modifier of modifiers) {
		if (modifier.target !== target) continue;
		if (
			!modifier.character_conditions.every((condition) =>
				evaluateCharacterCondition(condition, context)
			)
		) {
			continue;
		}

		let nextValue = value;
		if (modifier.type === 'flat') nextValue = modifier.value;
		if (modifier.type === 'derived_from_trait') {
			nextValue = Math.ceil(traitValue(context.traits, modifier.trait) * modifier.multiplier);
		}
		if (modifier.type === 'derived_from_proficiency') {
			nextValue = Math.ceil(context.proficiency * modifier.multiplier);
		}
		if (modifier.type === 'derived_from_level') {
			nextValue = Math.ceil(context.character.level * modifier.multiplier);
		}

		if (modifier.behaviour === 'bonus') value += nextValue;
		else value = nextValue;
	}
	return value;
}

function hasActiveScalarModifier(
	target: ScalarTarget,
	modifiers: CharacterModifier[],
	context: EvaluationContext
): boolean {
	return modifiers.some(
		(modifier) =>
			modifier.target === target &&
			modifier.character_conditions.every((condition) =>
				evaluateCharacterCondition(condition, context)
			)
	);
}

function deriveProficiency(context: EvaluationContext, modifiers: ModifierBuckets): number {
	let proficiency = applyScalarModifiers(
		'proficiency',
		BASE_STATS.proficiency,
		modifiers.base_character_modifiers,
		context
	);
	if (context.character.level >= 2) proficiency += 1;
	if (context.character.level >= 5) proficiency += 1;
	if (context.character.level >= 8) proficiency += 1;
	proficiency = applyScalarModifiers(
		'proficiency',
		proficiency,
		modifiers.bonus_character_modifiers,
		context
	);
	proficiency = applyScalarModifiers(
		'proficiency',
		proficiency,
		modifiers.override_character_modifiers,
		context
	);
	return proficiency;
}

function deriveTraits(
	context: EvaluationContext,
	modifiers: ModifierBuckets,
	baseFlags: FeatureFlags
): Traits {
	const traits: Traits = { ...EMPTY_TRAITS };
	for (const trait of ALL_TRAIT_IDS) traits[trait] = context.character.selected_traits[trait] ?? 0;

	for (const modifier of modifiers.base_character_modifiers) {
		if (modifier.target !== 'trait') continue;
		if (
			!modifier.character_conditions.every((condition) =>
				evaluateCharacterCondition(condition, context)
			)
		) {
			continue;
		}
		if (modifier.type === 'flat') traits[modifier.trait] = modifier.value;
		if (modifier.type === 'derived_from_proficiency') {
			traits[modifier.trait] = Math.ceil(context.proficiency * modifier.multiplier);
		}
		if (modifier.type === 'derived_from_level') {
			traits[modifier.trait] = Math.ceil(context.character.level * modifier.multiplier);
		}
	}

	for (const trait of ALL_TRAIT_IDS) {
		traits[trait] =
			(traits[trait] ?? 0) +
			(context.level_up.tier_2_marked_traits[trait] ?? 0) +
			(context.level_up.tier_3_marked_traits[trait] ?? 0) +
			(context.level_up.tier_4_marked_traits[trait] ?? 0);
	}

	if (context.character.chosen_beastform?.apply_beastform_bonuses && context.derived_beastform) {
		const beastformTrait = context.derived_beastform.character_trait.trait;
		traits[beastformTrait] =
			(traits[beastformTrait] ?? 0) + context.derived_beastform.character_trait.bonus;
		const evolutionTrait = context.character.feature_choices['evolution_trait']?.[0] as
			| TraitId
			| undefined;
		if (baseFlags.hasEvolutionHopeFeature && evolutionTrait) {
			traits[evolutionTrait] = (traits[evolutionTrait] ?? 0) + 1;
		}
	}

	for (const modifier of modifiers.bonus_character_modifiers) {
		if (modifier.target !== 'trait') continue;
		if (
			!modifier.character_conditions.every((condition) =>
				evaluateCharacterCondition(condition, context)
			)
		) {
			continue;
		}
		if (modifier.type === 'flat')
			traits[modifier.trait] = (traits[modifier.trait] ?? 0) + modifier.value;
		if (modifier.type === 'derived_from_proficiency') {
			traits[modifier.trait] =
				(traits[modifier.trait] ?? 0) + Math.ceil(context.proficiency * modifier.multiplier);
		}
		if (modifier.type === 'derived_from_level') {
			traits[modifier.trait] =
				(traits[modifier.trait] ?? 0) + Math.ceil(context.character.level * modifier.multiplier);
		}
	}

	for (const modifier of modifiers.override_character_modifiers) {
		if (modifier.target !== 'trait') continue;
		if (
			!modifier.character_conditions.every((condition) =>
				evaluateCharacterCondition(condition, context)
			)
		) {
			continue;
		}
		if (modifier.type === 'flat') traits[modifier.trait] = modifier.value;
		if (modifier.type === 'derived_from_proficiency') {
			traits[modifier.trait] = Math.ceil(context.proficiency * modifier.multiplier);
		}
		if (modifier.type === 'derived_from_level') {
			traits[modifier.trait] = Math.ceil(context.character.level * modifier.multiplier);
		}
	}

	return traits;
}

function deriveMastery(
	context: EvaluationContext,
	modifiers: ModifierBuckets,
	target: 'primary_class_mastery_level' | 'secondary_class_mastery_level',
	intrinsic: number
): number {
	let mastery = applyScalarModifiers(
		target,
		intrinsic,
		modifiers.base_character_modifiers,
		context
	);
	mastery = applyScalarModifiers(target, mastery, modifiers.bonus_character_modifiers, context);
	mastery = applyScalarModifiers(target, mastery, modifiers.override_character_modifiers, context);
	return clampMastery(mastery);
}

function deriveMaxLoadout(context: EvaluationContext, modifiers: ModifierBuckets): number {
	let maxLoadout = applyScalarModifiers(
		'max_loadout',
		BASE_STATS.max_loadout,
		modifiers.base_character_modifiers,
		context
	);
	maxLoadout += context.character.bonus_max_loadout;
	maxLoadout = applyScalarModifiers(
		'max_loadout',
		maxLoadout,
		modifiers.bonus_character_modifiers,
		context
	);
	maxLoadout = applyScalarModifiers(
		'max_loadout',
		maxLoadout,
		modifiers.override_character_modifiers,
		context
	);
	return maxLoadout;
}

function resolveLoopState(
	character: Character,
	refs: DirectRefs,
	level_up: LevelUpMetadata,
	domain_card_vault: VaultDomainCard[],
	derived_beastform: Beastform | undefined,
	active_base_equipment: ActiveBaseEquipment,
	intrinsic: IntrinsicMastery,
	baseFlags: FeatureFlags
): LoopState {
	let loop: LoopState = {
		primary_mastery: intrinsic.intrinsic_primary_mastery_level,
		secondary_mastery: intrinsic.intrinsic_secondary_mastery_level,
		max_loadout: BASE_STATS.max_loadout + character.bonus_max_loadout,
		traits: { ...EMPTY_TRAITS, ...character.selected_traits },
		proficiency:
			BASE_STATS.proficiency +
			(character.level >= 2 ? 1 : 0) +
			(character.level >= 5 ? 1 : 0) +
			(character.level >= 8 ? 1 : 0),
		loadout: [],
		modifiers: {
			base_character_modifiers: [],
			bonus_character_modifiers: [],
			override_character_modifiers: [],
			base_weapon_modifiers: [],
			bonus_weapon_modifiers: [],
			override_weapon_modifiers: []
		}
	};

	for (let iteration = 0; iteration < 3; iteration++) {
		const loadout = deriveDomainCardLoadout(character, domain_card_vault, loop.max_loadout);
		const context: EvaluationContext = {
			character,
			refs,
			level_up,
			domain_card_vault,
			domain_card_loadout: loadout,
			derived_beastform,
			traits: loop.traits,
			proficiency: loop.proficiency,
			primary_class_mastery_level: loop.primary_mastery,
			secondary_class_mastery_level: loop.secondary_mastery,
			active_base_equipment
		};

		const modifiers = collectActiveModifiers(context);
		const nextProficiency = deriveProficiency(context, modifiers);
		const nextTraits = deriveTraits(
			{ ...context, proficiency: nextProficiency },
			modifiers,
			baseFlags
		);
		const nextContext = { ...context, proficiency: nextProficiency, traits: nextTraits };
		const nextPrimaryMastery = deriveMastery(
			nextContext,
			modifiers,
			'primary_class_mastery_level',
			intrinsic.intrinsic_primary_mastery_level
		);
		const nextSecondaryMastery = deriveMastery(
			nextContext,
			modifiers,
			'secondary_class_mastery_level',
			intrinsic.intrinsic_secondary_mastery_level
		);
		const nextMaxLoadout = deriveMaxLoadout(nextContext, modifiers);

		const stable =
			sameCardIds(loop.loadout, loadout) &&
			loop.primary_mastery === nextPrimaryMastery &&
			loop.secondary_mastery === nextSecondaryMastery &&
			loop.max_loadout === nextMaxLoadout &&
			loop.proficiency === nextProficiency &&
			sameTraits(loop.traits, nextTraits);

		loop = {
			primary_mastery: nextPrimaryMastery,
			secondary_mastery: nextSecondaryMastery,
			max_loadout: nextMaxLoadout,
			traits: nextTraits,
			proficiency: nextProficiency,
			loadout,
			modifiers
		};

		if (stable) break;
	}

	return loop;
}

function deriveFinalFlags(
	refs: DirectRefs,
	loop: LoopState,
	baseFlags: FeatureFlags
): FeatureFlags {
	return {
		...baseFlags,
		hasCompanionExpertTrainingSubclassFeature: Boolean(
			baseFlags.hasCompanionSubclassFeature &&
			((refs.primary_subclass &&
				loop.primary_mastery >= 2 &&
				featureExists(refs.primary_subclass.specialization_card.features, 'Expert Training')) ||
				(refs.secondary_subclass &&
					loop.secondary_mastery >= 2 &&
					featureExists(refs.secondary_subclass.specialization_card.features, 'Expert Training')))
		),
		hasCompanionAdvancedTrainingSubclassFeature: Boolean(
			baseFlags.hasCompanionSubclassFeature &&
			((refs.primary_subclass &&
				loop.primary_mastery >= 3 &&
				featureExists(refs.primary_subclass.mastery_card.features, 'Advanced Training')) ||
				(refs.secondary_subclass &&
					loop.secondary_mastery >= 3 &&
					featureExists(refs.secondary_subclass.mastery_card.features, 'Advanced Training')))
		),
		hasRallyEpicPoetrySubclassFeature: Boolean(
			baseFlags.hasRallyClassFeature &&
			((refs.primary_subclass &&
				loop.primary_mastery >= 3 &&
				featureExists(refs.primary_subclass.mastery_card.features, 'Epic Poetry')) ||
				(refs.secondary_subclass &&
					loop.secondary_mastery >= 3 &&
					featureExists(refs.secondary_subclass.mastery_card.features, 'Epic Poetry')))
		)
	};
}

type NumericWeaponModifier = Extract<
	WeaponModifier,
	{ target_stat: 'attack_roll' | 'damage_bonus' }
>;

function isDerivedTraitWeaponModifier(
	modifier: NumericWeaponModifier
): modifier is Extract<NumericWeaponModifier, { type: 'derived_from_trait' }> {
	return 'type' in modifier && modifier.type === 'derived_from_trait';
}

function weaponConditions(modifier: WeaponModifier): WeaponCondition[] {
	return modifier.weapon_conditions ?? [];
}

function resolveNumericWeaponModifierValue(
	modifier: NumericWeaponModifier,
	context: EvaluationContext
): number {
	if (!isDerivedTraitWeaponModifier(modifier)) return modifier.value;
	return Math.ceil(traitValue(context.traits, modifier.trait) * modifier.multiplier);
}

function applyWeaponModifierToWeapon<T extends PrimaryWeapon | SecondaryWeapon | UnarmedAttack>(
	weapon: T | undefined,
	modifier: WeaponModifier,
	mode: 'base' | 'bonus' | 'override',
	context: EvaluationContext,
	effectiveDamageType: DamageType | undefined
): T | undefined {
	if (!weapon) return weapon;
	if (
		!weaponConditions(modifier).every((condition) =>
			evaluateWeaponCondition(condition, weapon, effectiveDamageType)
		)
	) {
		return weapon;
	}
	if (modifier.target_stat === 'attack_roll') {
		const value = resolveNumericWeaponModifierValue(modifier, context);
		weapon.attack_roll_bonus = mode === 'bonus' ? weapon.attack_roll_bonus + value : value;
	}
	if (modifier.target_stat === 'damage_bonus') {
		const value = resolveNumericWeaponModifierValue(modifier, context);
		weapon.damage_bonus = mode === 'bonus' ? weapon.damage_bonus + value : value;
	}
	if (modifier.target_stat === 'damage_dice') {
		weapon.damage_dice =
			mode === 'bonus' ? `${weapon.damage_dice}+${modifier.dice}` : modifier.dice;
	}
	if (modifier.target_stat === 'damage_type') {
		weapon.available_damage_types =
			mode === 'bonus'
				? weapon.available_damage_types.includes(modifier.damage_type)
					? weapon.available_damage_types
					: [...weapon.available_damage_types, modifier.damage_type]
				: [modifier.damage_type];
	}
	if (modifier.target_stat === 'range') weapon.range = modifier.range;
	if (modifier.target_stat === 'trait') {
		weapon.available_traits =
			mode === 'bonus'
				? weapon.available_traits.includes(modifier.trait)
					? weapon.available_traits
					: [...weapon.available_traits, modifier.trait]
				: [modifier.trait];
	}
	return weapon;
}

function applyWeaponModifiers(
	activeBaseEquipment: ActiveBaseEquipment,
	modifiers: ModifierBuckets,
	context: EvaluationContext
): {
	derived_armor?: InventoryArmor;
	derived_primary_weapon?: InventoryPrimaryWeapon;
	derived_secondary_weapon?: InventorySecondaryWeapon;
	derived_unarmed_attack: UnarmedAttack;
} {
	const derived_armor = activeBaseEquipment.active_base_armor
		? { ...activeBaseEquipment.active_base_armor }
		: undefined;
	let derived_primary_weapon = activeBaseEquipment.active_base_primary_weapon
		? { ...activeBaseEquipment.active_base_primary_weapon }
		: undefined;
	let derived_secondary_weapon = activeBaseEquipment.active_base_secondary_weapon
		? { ...activeBaseEquipment.active_base_secondary_weapon }
		: undefined;
	let derived_unarmed_attack = { ...BASE_STATS.unarmed_attack };

	for (const [mode, list] of [
		['base', modifiers.base_weapon_modifiers],
		['bonus', modifiers.bonus_weapon_modifiers],
		['override', modifiers.override_weapon_modifiers]
	] as const) {
		for (const modifier of list) {
			if (
				!modifier.character_conditions.every((condition) =>
					evaluateCharacterCondition(condition, context)
				)
			) {
				continue;
			}
			if (modifier.target_weapon === 'all' || modifier.target_weapon === 'primary') {
				derived_primary_weapon = applyWeaponModifierToWeapon(
					derived_primary_weapon,
					modifier,
					mode,
					context,
					selectedInventoryWeaponDamageType(context.character, derived_primary_weapon, 'primary')
				);
			}
			if (modifier.target_weapon === 'all' || modifier.target_weapon === 'secondary') {
				derived_secondary_weapon = applyWeaponModifierToWeapon(
					derived_secondary_weapon,
					modifier,
					mode,
					context,
					selectedInventoryWeaponDamageType(
						context.character,
						derived_secondary_weapon,
						'secondary'
					)
				);
			}
			if (modifier.target_weapon === 'all' || modifier.target_weapon === 'unarmed') {
				derived_unarmed_attack =
					applyWeaponModifierToWeapon(
						derived_unarmed_attack,
						modifier,
						mode,
						context,
						selectedUnarmedDamageType(context.character, derived_unarmed_attack)
					) ?? derived_unarmed_attack;
			}
		}
	}

	return {
		derived_armor,
		derived_primary_weapon,
		derived_secondary_weapon,
		derived_unarmed_attack
	};
}

function applyCombatTrainingEffects(
	character: Character,
	finalEquipment: {
		derived_armor?: InventoryArmor;
		derived_primary_weapon?: InventoryPrimaryWeapon;
		derived_secondary_weapon?: InventorySecondaryWeapon;
		derived_unarmed_attack: UnarmedAttack;
	},
	derivedBeastform: Beastform | undefined,
	flags: Pick<FeatureFlags, 'hasCompatTrainingClassFeature'>
): {
	finalEquipment: {
		derived_armor?: InventoryArmor;
		derived_primary_weapon?: InventoryPrimaryWeapon;
		derived_secondary_weapon?: InventorySecondaryWeapon;
		derived_unarmed_attack: UnarmedAttack;
	};
	derived_beastform?: Beastform;
} {
	if (!flags.hasCompatTrainingClassFeature) {
		return { finalEquipment, derived_beastform: derivedBeastform };
	}

	const nextPrimaryWeapon = finalEquipment.derived_primary_weapon
		? { ...finalEquipment.derived_primary_weapon, burden: 0 as const }
		: undefined;
	if (
		nextPrimaryWeapon &&
		selectedInventoryWeaponDamageType(character, nextPrimaryWeapon, 'primary') === 'phy'
	) {
		nextPrimaryWeapon.damage_bonus += character.level;
	}

	const nextSecondaryWeapon = finalEquipment.derived_secondary_weapon
		? { ...finalEquipment.derived_secondary_weapon, burden: 0 as const }
		: undefined;
	if (
		nextSecondaryWeapon &&
		selectedInventoryWeaponDamageType(character, nextSecondaryWeapon, 'secondary') === 'phy'
	) {
		nextSecondaryWeapon.damage_bonus += character.level;
	}

	const nextUnarmedAttack = { ...finalEquipment.derived_unarmed_attack };
	if (selectedUnarmedDamageType(character, nextUnarmedAttack) === 'phy') {
		nextUnarmedAttack.damage_bonus += character.level;
	}

	const nextBeastform =
		derivedBeastform && derivedBeastform.attack.damage_type === 'phy'
			? {
					...derivedBeastform,
					attack: {
						...derivedBeastform.attack,
						damage_bonus: derivedBeastform.attack.damage_bonus + character.level
					}
				}
			: derivedBeastform;

	return {
		finalEquipment: {
			derived_armor: finalEquipment.derived_armor,
			derived_primary_weapon: nextPrimaryWeapon,
			derived_secondary_weapon: nextSecondaryWeapon,
			derived_unarmed_attack: nextUnarmedAttack
		},
		derived_beastform: nextBeastform
	};
}

function resolveExperienceModifierIndices(
	character: Character,
	modifier: CharacterModifier
): number[] {
	let rawValues: string[] = [];
	if (modifier.target === 'experience_from_card_choice_selection') {
		rawValues = character.card_choices[modifier.card_id]?.[modifier.choice_id] ?? [];
	}
	return rawValues.map((value) => Number.parseInt(value, 10));
}

function deriveExperienceModifierValue(
	character: Character,
	context: EvaluationContext,
	currentValue: number,
	modifier: CharacterModifier
): number {
	if (modifier.type === 'flat') return modifier.value;
	if (modifier.type === 'derived_from_trait') {
		return Math.ceil(traitValue(context.traits, modifier.trait) * modifier.multiplier);
	}
	if (modifier.type === 'derived_from_proficiency') {
		return Math.ceil(context.proficiency * modifier.multiplier);
	}
	if (modifier.type === 'derived_from_level') {
		return Math.ceil(character.level * modifier.multiplier);
	}
	return currentValue;
}

function deriveExperienceModifiers(
	character: Character,
	modifiers: ModifierBuckets,
	context: EvaluationContext
): number[] {
	const count = character.experiences.length;
	const values = Array(count).fill(BASE_STATS.experience_modifier);
	const applyChoiceModifier = (
		modifier: CharacterModifier,
		mode: 'base' | 'bonus' | 'override'
	) => {
		const indices = resolveExperienceModifierIndices(character, modifier);
		for (const index of indices) {
			if (!Number.isInteger(index) || index < 0 || index >= count) continue;
			const nextValue = deriveExperienceModifierValue(character, context, values[index], modifier);
			if (mode === 'bonus') values[index] += nextValue;
			else values[index] = nextValue;
		}
	};

	for (const mode of ['base', 'bonus', 'override'] as const) {
		const source =
			mode === 'base'
				? modifiers.base_character_modifiers
				: mode === 'bonus'
					? modifiers.bonus_character_modifiers
					: modifiers.override_character_modifiers;
		for (const modifier of source) {
			if (modifier.target !== 'experience_from_card_choice_selection') {
				continue;
			}
			if (
				!modifier.character_conditions.every((condition) =>
					evaluateCharacterCondition(condition, context)
				)
			) {
				continue;
			}
			applyChoiceModifier(modifier, mode);
		}
	}

	for (let level = 2; level <= character.level; level++) {
		for (const slot of ['A', 'B'] as const) {
			const choice = character.level_up_choices[level]?.[slot];
			if (
				choice?.option_id !== 'tier_2_experience_bonus' &&
				choice?.option_id !== 'tier_3_experience_bonus' &&
				choice?.option_id !== 'tier_4_experience_bonus'
			) {
				continue;
			}
			for (const index of choice.selected_experiences ?? []) {
				if (index >= 0 && index < count) values[index] += 1;
			}
		}
	}

	return values;
}

function deriveDamageThresholds(
	character: Character,
	derivedArmor: InventoryArmor | undefined,
	modifiers: ModifierBuckets,
	context: EvaluationContext
): DamageThresholds {
	let thresholds: DamageThresholds = derivedArmor
		? { ...derivedArmor.damage_thresholds }
		: { major: character.level, severe: character.level * 2 };

	thresholds.major = applyScalarModifiers(
		'major_damage_threshold',
		thresholds.major,
		modifiers.base_character_modifiers,
		context
	);
	thresholds.severe = applyScalarModifiers(
		'severe_damage_threshold',
		thresholds.severe,
		modifiers.base_character_modifiers,
		context
	);

	const shouldApplyMajorLevelBump =
		(derivedArmor !== undefined && derivedArmor.damage_thresholds.major !== character.level) ||
		hasActiveScalarModifier('major_damage_threshold', modifiers.base_character_modifiers, context);
	const shouldApplySevereLevelBump =
		(derivedArmor !== undefined && derivedArmor.damage_thresholds.severe !== character.level * 2) ||
		hasActiveScalarModifier('severe_damage_threshold', modifiers.base_character_modifiers, context);
	if (shouldApplyMajorLevelBump) {
		thresholds.major += character.level;
	}
	if (shouldApplySevereLevelBump) {
		thresholds.severe += character.level;
	}

	thresholds.major = applyScalarModifiers(
		'major_damage_threshold',
		thresholds.major,
		modifiers.bonus_character_modifiers,
		context
	);
	thresholds.severe = applyScalarModifiers(
		'severe_damage_threshold',
		thresholds.severe,
		modifiers.bonus_character_modifiers,
		context
	);
	thresholds.major = applyScalarModifiers(
		'major_damage_threshold',
		thresholds.major,
		modifiers.override_character_modifiers,
		context
	);
	thresholds.severe = applyScalarModifiers(
		'severe_damage_threshold',
		thresholds.severe,
		modifiers.override_character_modifiers,
		context
	);

	return thresholds;
}

export function derive_character_data(
	character: Character,
	compendium: CompendiumContent
): DerivedCharacterData {
	const refs = resolveDirectReferences(character, compendium);
	const intrinsic = deriveIntrinsicMastery(character);
	const level_up = deriveLevelUpMetadata(character, compendium, refs, intrinsic);
	const active_base_equipment = resolveActiveBaseEquipment(character, refs);
	const baseFlags = deriveBaseFeatureFlags(refs);
	const derived_beastform = deriveBeastform(character, compendium, baseFlags);
	const derived_companion = deriveCompanion(character);
	const domain_card_vault = deriveDomainCardVault(character, compendium, refs, level_up);
	const loop = resolveLoopState(
		character,
		refs,
		level_up,
		domain_card_vault,
		derived_beastform,
		active_base_equipment,
		intrinsic,
		baseFlags
	);

	const finalFlags = deriveFinalFlags(refs, loop, baseFlags);
	const baseContext: EvaluationContext = {
		character,
		refs,
		level_up,
		domain_card_vault,
		domain_card_loadout: loop.loadout,
		derived_beastform,
		traits: loop.traits,
		proficiency: loop.proficiency,
		primary_class_mastery_level: loop.primary_mastery,
		secondary_class_mastery_level: loop.secondary_mastery,
		active_base_equipment
	};
	const baseEquipment = applyWeaponModifiers(active_base_equipment, loop.modifiers, baseContext);
	const combatTrainingResults = applyCombatTrainingEffects(
		character,
		baseEquipment,
		derived_beastform,
		finalFlags
	);
	const finalEquipment = combatTrainingResults.finalEquipment;
	const experience_modifiers = deriveExperienceModifiers(character, loop.modifiers, baseContext);

	let max_experiences = applyScalarModifiers(
		'max_experiences',
		BASE_STATS.max_experiences,
		loop.modifiers.base_character_modifiers,
		baseContext
	);
	if (character.level >= 2) max_experiences += 1;
	if (character.level >= 5) max_experiences += 1;
	if (character.level >= 8) max_experiences += 1;
	max_experiences = applyScalarModifiers(
		'max_experiences',
		max_experiences,
		loop.modifiers.bonus_character_modifiers,
		baseContext
	);
	max_experiences = applyScalarModifiers(
		'max_experiences',
		max_experiences,
		loop.modifiers.override_character_modifiers,
		baseContext
	);

	const max_loadout = deriveMaxLoadout(baseContext, loop.modifiers);

	const applyScalarTriplet = (target: ScalarTarget, baseValue: number): number =>
		applyScalarModifiers(
			target,
			applyScalarModifiers(
				target,
				applyScalarModifiers(
					target,
					baseValue,
					loop.modifiers.base_character_modifiers,
					baseContext
				),
				loop.modifiers.bonus_character_modifiers,
				baseContext
			),
			loop.modifiers.override_character_modifiers,
			baseContext
		);

	const unscarred_max_hope = applyScalarTriplet('max_hope', BASE_STATS.max_hope);
	const max_hope = Math.max(0, unscarred_max_hope - character.scars);
	const max_hp = applyScalarTriplet(
		'max_hp',
		refs.primary_class?.starting_max_hp ?? BASE_STATS.max_hp
	);
	const max_stress = applyScalarTriplet('max_stress', BASE_STATS.max_stress);
	const max_burden = applyScalarTriplet('max_burden', BASE_STATS.max_burden);
	const max_short_rest_actions = applyScalarTriplet(
		'max_short_rest_actions',
		BASE_STATS.max_short_rest_actions
	);
	const max_long_rest_actions = applyScalarTriplet(
		'max_long_rest_actions',
		BASE_STATS.max_long_rest_actions
	);
	const spellcast_roll_bonus = applyScalarTriplet(
		'spellcast_roll_bonus',
		BASE_STATS.spellcast_roll_bonus
	);

	let evasion = applyScalarModifiers(
		'evasion',
		refs.primary_class?.starting_evasion ?? BASE_STATS.evasion,
		loop.modifiers.base_character_modifiers,
		baseContext
	);
	if (character.chosen_beastform?.apply_beastform_bonuses && derived_beastform) {
		evasion += derived_beastform.evasion_bonus;
	}
	evasion = applyScalarModifiers(
		'evasion',
		evasion,
		loop.modifiers.bonus_character_modifiers,
		baseContext
	);
	evasion = applyScalarModifiers(
		'evasion',
		evasion,
		loop.modifiers.override_character_modifiers,
		baseContext
	);

	let max_armor = applyScalarTriplet(
		'max_armor',
		finalEquipment.derived_armor?.max_armor ?? refs.derived_unarmored.max_armor
	);
	max_armor = Math.min(12, max_armor);

	const damage_thresholds = deriveDamageThresholds(
		character,
		finalEquipment.derived_armor,
		loop.modifiers,
		baseContext
	);

	return {
		...level_up,
		...refs,
		derived_armor: finalEquipment.derived_armor,
		derived_unarmored: refs.derived_unarmored,
		derived_primary_weapon: finalEquipment.derived_primary_weapon,
		derived_secondary_weapon: finalEquipment.derived_secondary_weapon,
		derived_unarmed_attack: finalEquipment.derived_unarmed_attack,
		derived_beastform: combatTrainingResults.derived_beastform,
		derived_companion,
		domain_card_vault,
		domain_card_loadout: loop.loadout,
		traits: loop.traits,
		proficiency: loop.proficiency,
		experience_modifiers,
		max_experiences,
		max_loadout,
		max_hope,
		max_armor,
		max_hp,
		max_stress,
		max_burden,
		max_short_rest_actions,
		max_long_rest_actions,
		max_consumables: BASE_STATS.max_consumables,
		consumable_count: character.inventory.consumables.length,
		evasion,
		damage_thresholds,
		primary_class_mastery_level: loop.primary_mastery,
		secondary_class_mastery_level: loop.secondary_mastery,
		spellcast_roll_bonus,
		...finalFlags
	};
}

function cloneCharacter(character: Character): Character {
	return JSON.parse(JSON.stringify(character)) as Character;
}

function cloneCompanion(companion: Companion): Companion {
	return JSON.parse(JSON.stringify(companion)) as Companion;
}

function normalizeLevelUpChoices(character: Character, compendium: CompendiumContent): boolean {
	let changed = false;

	for (let level = 2; level <= 10; level++) {
		if (level > character.level) {
			if (character.level_up_choices[level]?.A?.option_id) {
				character.level_up_choices[level].A = blankLevelUpChoice();
				changed = true;
			}
			if (character.level_up_choices[level]?.B?.option_id) {
				character.level_up_choices[level].B = blankLevelUpChoice();
				changed = true;
			}
			if (character.level_up_domain_card_ids[level]?.A) {
				character.level_up_domain_card_ids[level].A = undefined;
				changed = true;
			}
			if (character.level_up_domain_card_ids[level]?.B) {
				character.level_up_domain_card_ids[level].B = undefined;
				changed = true;
			}
			continue;
		}

		for (const slot of ['A', 'B'] as const) {
			const choice = character.level_up_choices[level]?.[slot];
			if (!choice?.option_id) continue;

			if (!levelAllowsOption(level, choice.option_id)) {
				character.level_up_choices[level][slot] = blankLevelUpChoice();
				changed = true;
				continue;
			}

			const nextChoice: LevelUpChoice = { option_id: choice.option_id };
			if (
				choice.option_id === 'tier_2_traits' ||
				choice.option_id === 'tier_3_traits' ||
				choice.option_id === 'tier_4_traits'
			) {
				const markedTraits = [choice.marked_traits?.A, choice.marked_traits?.B].filter(
					(trait): trait is TraitId => !!trait
				);
				if (markedTraits.length > 0) {
					nextChoice.marked_traits = {
						A: markedTraits[0],
						B: markedTraits.find((trait) => trait !== markedTraits[0])
					};
				}
			}
			if (
				choice.option_id === 'tier_2_experience_bonus' ||
				choice.option_id === 'tier_3_experience_bonus' ||
				choice.option_id === 'tier_4_experience_bonus'
			) {
				const selectedExperiences = [...new Set(choice.selected_experiences ?? [])].filter(
					(index) => Number.isInteger(index) && index >= 0 && index < character.experiences.length
				);
				if (selectedExperiences.length > 0) {
					nextChoice.selected_experiences = selectedExperiences.slice(0, 2);
				}
			}
			if (
				choice.option_id === 'tier_2_domain_card' ||
				choice.option_id === 'tier_3_domain_card' ||
				choice.option_id === 'tier_4_domain_card'
			) {
				const selected = choice.selected_domain_card_id;
				const card = selected ? compendium.domain_cards[selected.card_id] : undefined;
				const allowedDomains = allowedDomainIdsForLevel(
					character,
					{
						primary_class: character.primary_class_id
							? compendium.classes[character.primary_class_id]
							: undefined
					},
					level
				);
				if (
					selected &&
					card &&
					card.level_requirement <= character.level &&
					card.level_requirement <= level &&
					(!card.domain_id || allowedDomains.has(card.domain_id))
				) {
					nextChoice.selected_domain_card_id = selected;
				}
			}
			if (
				choice.option_id === 'tier_3_subclass_upgrade' ||
				choice.option_id === 'tier_4_subclass_upgrade'
			) {
				if (
					choice.selected_subclass_upgrade === 'primary' &&
					character.primary_class_id &&
					character.primary_subclass_id
				) {
					nextChoice.selected_subclass_upgrade = 'primary';
				} else if (
					choice.selected_subclass_upgrade === 'secondary' &&
					character.secondary_class_id &&
					character.secondary_subclass_id
				) {
					nextChoice.selected_subclass_upgrade = 'secondary';
				}
			}

			if (JSON.stringify(choice) !== JSON.stringify(nextChoice)) {
				character.level_up_choices[level][slot] = nextChoice;
				changed = true;
			}
		}
	}

	return changed;
}

function normalizeClassRelationships(character: Character, compendium: CompendiumContent): boolean {
	let changed = false;

	if (character.primary_subclass_id) {
		const primarySubclass = compendium.subclasses[character.primary_subclass_id];
		if (
			!character.primary_class_id ||
			!primarySubclass ||
			(primarySubclass.class_id !== character.primary_class_id &&
				!compendium.classes[character.primary_class_id]?.subclass_ids.includes(
					character.primary_subclass_id
				))
		) {
			character.primary_subclass_id = undefined;
			changed = true;
		}
	}

	const multiclassUnlocked = unlockedSecondaryDomainByLevel(character, 10);
	if (!multiclassUnlocked) {
		if (character.secondary_class_id) {
			character.secondary_class_id = undefined;
			changed = true;
		}
		if (character.secondary_subclass_id) {
			character.secondary_subclass_id = undefined;
			changed = true;
		}
		if (character.secondary_class_domain_id) {
			character.secondary_class_domain_id = undefined;
			changed = true;
		}
	}

	if (character.secondary_class_id === character.primary_class_id) {
		character.secondary_class_id = undefined;
		character.secondary_subclass_id = undefined;
		character.secondary_class_domain_id = undefined;
		changed = true;
	}

	if (character.secondary_subclass_id) {
		const secondarySubclass = compendium.subclasses[character.secondary_subclass_id];
		if (
			!character.secondary_class_id ||
			!secondarySubclass ||
			(secondarySubclass.class_id !== character.secondary_class_id &&
				!compendium.classes[character.secondary_class_id]?.subclass_ids.includes(
					character.secondary_subclass_id
				))
		) {
			character.secondary_subclass_id = undefined;
			changed = true;
		}
	}

	if (character.secondary_class_domain_id && character.secondary_class_id) {
		const secondaryClass = compendium.classes[character.secondary_class_id];
		const validSecondaryDomains = new Set(
			[secondaryClass?.primary_domain_id, secondaryClass?.secondary_domain_id].filter(
				(value): value is string => !!value
			)
		);
		if (!validSecondaryDomains.has(character.secondary_class_domain_id)) {
			character.secondary_class_domain_id = undefined;
			changed = true;
		}
	}

	return changed;
}

function normalizeInventoryAndEquipment(
	character: Character,
	compendium: CompendiumContent
): boolean {
	let changed = false;

	const filterInventory = <T extends { inventory_id: string }>(
		items: T[],
		isValid: (item: T) => boolean
	) => {
		const nextItems = items.filter(isValid);
		if (nextItems.length !== items.length) changed = true;
		return nextItems;
	};

	character.inventory.primary_weapons = filterInventory(
		character.inventory.primary_weapons,
		(item) => Boolean(compendium.primary_weapons[item.base_primary_weapon_id])
	);
	character.inventory.secondary_weapons = filterInventory(
		character.inventory.secondary_weapons,
		(item) => Boolean(compendium.secondary_weapons[item.base_secondary_weapon_id])
	);
	character.inventory.armor = filterInventory(character.inventory.armor, (item) =>
		Boolean(compendium.armor[item.base_armor_id])
	);
	character.inventory.loot = filterInventory(character.inventory.loot, (item) =>
		Boolean(compendium.loot[item.base_loot_id])
	);
	character.inventory.consumables = filterInventory(character.inventory.consumables, (item) =>
		Boolean(compendium.consumables[item.base_consumable_id])
	);

	const validPrimaryIds = new Set(
		character.inventory.primary_weapons
			.filter(
				(item) =>
					(item.custom_level_requirement ??
						compendium.primary_weapons[item.base_primary_weapon_id]?.level_requirement ??
						0) <= character.level
			)
			.map((item) => item.inventory_id)
	);
	if (
		character.active_primary_weapon_inventory_id &&
		!validPrimaryIds.has(character.active_primary_weapon_inventory_id)
	) {
		character.active_primary_weapon_inventory_id = undefined;
		changed = true;
	}

	const validSecondaryIds = new Set(
		character.inventory.secondary_weapons
			.filter(
				(item) =>
					(item.custom_level_requirement ??
						compendium.secondary_weapons[item.base_secondary_weapon_id]?.level_requirement ??
						0) <= character.level
			)
			.map((item) => item.inventory_id)
	);
	if (
		character.active_secondary_weapon_inventory_id &&
		!validSecondaryIds.has(character.active_secondary_weapon_inventory_id)
	) {
		character.active_secondary_weapon_inventory_id = undefined;
		changed = true;
	}

	const validArmorIds = new Set(
		character.inventory.armor
			.filter(
				(item) =>
					(item.custom_level_requirement ??
						compendium.armor[item.base_armor_id]?.level_requirement ??
						0) <= character.level
			)
			.map((item) => item.inventory_id)
	);
	if (
		character.active_armor_inventory_id &&
		!validArmorIds.has(character.active_armor_inventory_id)
	) {
		character.active_armor_inventory_id = undefined;
		changed = true;
	}

	return changed;
}

function normalizeReferencesAndChoices(
	character: Character,
	compendium: CompendiumContent
): boolean {
	let changed = false;

	const clearIfMissing = <T>(value: T | undefined, exists: boolean): T | undefined => {
		if (!value || exists) return value;
		changed = true;
		return undefined;
	};

	character.ancestry_card_id = clearIfMissing(
		character.ancestry_card_id,
		!character.ancestry_card_id || Boolean(compendium.ancestry_cards[character.ancestry_card_id])
	);
	character.community_card_id = clearIfMissing(
		character.community_card_id,
		!character.community_card_id || Boolean(compendium.community_cards[character.community_card_id])
	);
	character.transformation_card_id = clearIfMissing(
		character.transformation_card_id,
		!character.transformation_card_id ||
			Boolean(compendium.transformations[character.transformation_card_id])
	);
	character.primary_class_id = clearIfMissing(
		character.primary_class_id,
		!character.primary_class_id || Boolean(compendium.classes[character.primary_class_id])
	);
	character.secondary_class_id = clearIfMissing(
		character.secondary_class_id,
		!character.secondary_class_id || Boolean(compendium.classes[character.secondary_class_id])
	);
	if (!character.subclass_level_up_choices) {
		character.subclass_level_up_choices = {};
		changed = true;
	}
	if (!character.sheet_addon_choices) {
		character.sheet_addon_choices = {};
		changed = true;
	}
	if (!character.sheet_addon_resources) {
		character.sheet_addon_resources = {};
		changed = true;
	}

	if (character.chosen_beastform) {
		const chosenBase = compendium.beastforms[character.chosen_beastform.beastform_id];
		if (!chosenBase) {
			character.chosen_beastform = undefined;
			changed = true;
		}
	}

	const nextAdditionalDomainCards = character.additional_domain_card_ids.filter(({ card_id }) =>
		Boolean(compendium.domain_cards[card_id])
	);
	if (nextAdditionalDomainCards.length !== character.additional_domain_card_ids.length) {
		character.additional_domain_card_ids = nextAdditionalDomainCards;
		changed = true;
	}
	const nextAdditionalAncestryCards = character.additional_ancestry_card_ids.filter((id) =>
		Boolean(compendium.ancestry_cards[id])
	);
	if (nextAdditionalAncestryCards.length !== character.additional_ancestry_card_ids.length) {
		character.additional_ancestry_card_ids = nextAdditionalAncestryCards;
		changed = true;
	}
	const nextAdditionalCommunityCards = character.additional_community_card_ids.filter((id) =>
		Boolean(compendium.community_cards[id])
	);
	if (nextAdditionalCommunityCards.length !== character.additional_community_card_ids.length) {
		character.additional_community_card_ids = nextAdditionalCommunityCards;
		changed = true;
	}
	const nextAdditionalTransformationCards = character.additional_transformation_card_ids.filter(
		(id) => Boolean(compendium.transformations[id])
	);
	if (
		nextAdditionalTransformationCards.length !== character.additional_transformation_card_ids.length
	) {
		character.additional_transformation_card_ids = nextAdditionalTransformationCards;
		changed = true;
	}

	const validCardIds = new Set<string>();
	if (character.ancestry_card_id) validCardIds.add(character.ancestry_card_id);
	if (character.community_card_id) validCardIds.add(character.community_card_id);
	if (character.transformation_card_id) validCardIds.add(character.transformation_card_id);
	if (character.primary_subclass_id) validCardIds.add(character.primary_subclass_id);
	if (character.secondary_subclass_id) validCardIds.add(character.secondary_subclass_id);
	for (const { card_id } of character.additional_domain_card_ids) validCardIds.add(card_id);
	for (const id of character.additional_ancestry_card_ids) validCardIds.add(id);
	for (const id of character.additional_community_card_ids) validCardIds.add(id);
	for (const id of character.additional_transformation_card_ids) validCardIds.add(id);
	for (const item of character.inventory.loot) validCardIds.add(item.base_loot_id);

	const refs = resolveDirectReferences(character, compendium);
	const baseFlags = deriveBaseFeatureFlags(refs);
	if (baseFlags.hasCompanionSubclassFeature && !character.companion) {
		character.companion = cloneCompanion(BASE_COMPANION);
		changed = true;
	}

	const intrinsic = deriveIntrinsicMastery(character);
	const subclassLevelUpMetadata = deriveLevelUpMetadata(character, compendium, refs, intrinsic);
	const activeSubclassOptions = new Map<
		string,
		{ granted_level: number; max: number; allowed_domains: Set<string> }
	>();
	const claimedDomainCardIds = new Set<string>();
	const canClaimDomainCard = (
		cardId: string | undefined,
		maxLevel: number,
		allowedDomains: Set<string>
	) => {
		if (!cardId) return false;
		const card = compendium.domain_cards[cardId];
		return (
			!!card &&
			card.level_requirement <= character.level &&
			card.level_requirement <= maxLevel &&
			(!card.domain_id || allowedDomains.has(card.domain_id))
		);
	};
	const claimDomainCard = (cardId: string | undefined) => {
		if (!cardId || claimedDomainCardIds.has(cardId)) return false;
		claimedDomainCardIds.add(cardId);
		return true;
	};

	for (const slot of ['A', 'B'] as const) {
		const selected = character.level_up_domain_card_ids[1]?.[slot];
		if (
			selected &&
			canClaimDomainCard(selected.card_id, 1, allowedDomainIdsForLevel(character, refs, 1))
		) {
			claimDomainCard(selected.card_id);
		}
	}
	for (let level = 2; level <= character.level; level++) {
		const levelAllowedDomains = allowedDomainIdsForLevel(character, refs, level);
		const levelUpCard = character.level_up_domain_card_ids[level]?.A;
		if (levelUpCard && canClaimDomainCard(levelUpCard.card_id, level, levelAllowedDomains)) {
			claimDomainCard(levelUpCard.card_id);
		}

		for (const slot of ['A', 'B'] as const) {
			const selected = character.level_up_choices[level]?.[slot]?.selected_domain_card_id;
			if (selected && canClaimDomainCard(selected.card_id, level, levelAllowedDomains)) {
				claimDomainCard(selected.card_id);
			}
		}
	}

	for (const level of [1, 5, 8] as const) {
		for (const option of subclassLevelUpMetadata.subclass_level_up_options[level]) {
			activeSubclassOptions.set(option.option_id, {
				granted_level: option.granted_level,
				max: option.max,
				allowed_domains: allowedDomainIdsForLevel(character, refs, option.granted_level)
			});
		}
	}
	const normalizedSubclassLevelUpChoices = Object.fromEntries(
		([1, 5, 8] as const).flatMap((level) =>
			subclassLevelUpMetadata.subclass_level_up_options[level].flatMap((option) => {
				const activeOption = activeSubclassOptions.get(option.option_id);
				if (!activeOption) return [];
				const selectedIds = character.subclass_level_up_choices?.[option.option_id] ?? [];
				const normalizedIds = uniqueStrings(selectedIds)
					.filter((cardId) => {
						if (
							!canClaimDomainCard(cardId, activeOption.granted_level, activeOption.allowed_domains)
						) {
							return false;
						}
						return claimDomainCard(cardId);
					})
					.slice(0, activeOption.max);
				return normalizedIds.length > 0 ? ([[option.option_id, normalizedIds]] as const) : [];
			})
		)
	);
	if (
		JSON.stringify(normalizedSubclassLevelUpChoices) !==
		JSON.stringify(character.subclass_level_up_choices)
	) {
		character.subclass_level_up_choices = normalizedSubclassLevelUpChoices;
		changed = true;
	}

	const activeSheetAddonIds = new Set<string>();
	for (const subclass of [refs.primary_subclass, refs.secondary_subclass]) {
		for (const addonId of subclass?.sheet_addon_ids ?? []) {
			if (compendium.character_sheet_addons[addonId]) activeSheetAddonIds.add(addonId);
		}
	}
	const normalizedSheetAddonChoices = Object.fromEntries(
		[...activeSheetAddonIds].flatMap((addonId) => {
			const addon = compendium.character_sheet_addons[addonId];
			return addon.sections.flatMap((section, sectionIndex) => {
				const choiceKey = `${addonId}:${sectionIndex}`;
				const validOptionIds = new Set(section.options.map((option) => option.option_id));
				const choices = uniqueStrings(character.sheet_addon_choices?.[choiceKey] ?? []).filter(
					(optionId) => validOptionIds.has(optionId)
				);
				return choices.length > 0 ? ([[choiceKey, choices]] as const) : [];
			});
		})
	);
	if (JSON.stringify(normalizedSheetAddonChoices) !== JSON.stringify(character.sheet_addon_choices)) {
		character.sheet_addon_choices = normalizedSheetAddonChoices;
		changed = true;
	}

	const normalizedSheetAddonResources = Object.fromEntries(
		[...activeSheetAddonIds].flatMap((addonId) => {
			const max = compendium.character_sheet_addons[addonId]?.resource?.max ?? 0;
			if (max <= 0) return [];
			const current = character.sheet_addon_resources?.[addonId] ?? 0;
			return [[addonId, Math.max(0, Math.min(max, Math.trunc(current)))]];
		})
	);
	if (
		JSON.stringify(normalizedSheetAddonResources) !== JSON.stringify(character.sheet_addon_resources)
	) {
		character.sheet_addon_resources = normalizedSheetAddonResources;
		changed = true;
	}
	const levelUp = deriveLevelUpMetadata(character, compendium, refs, intrinsic);
	const domainCardVault = deriveDomainCardVault(character, compendium, refs, levelUp);
	for (const card of domainCardVault) validCardIds.add(card.id);

	const nextCardChoices = Object.fromEntries(
		Object.entries(character.card_choices).filter(([cardId]) => validCardIds.has(cardId))
	);
	if (JSON.stringify(nextCardChoices) !== JSON.stringify(character.card_choices)) {
		character.card_choices = nextCardChoices;
		changed = true;
	}

	const nextCardTokens = Object.fromEntries(
		Object.entries(character.card_tokens).filter(([cardId]) => validCardIds.has(cardId))
	);
	if (JSON.stringify(nextCardTokens) !== JSON.stringify(character.card_tokens)) {
		character.card_tokens = nextCardTokens;
		changed = true;
	}

	const activeChoiceCards: { id: string; options: CardOption[] }[] = [];
	if (refs.ancestry_card) {
		activeChoiceCards.push({
			id: character.ancestry_card_id!,
			options: refs.ancestry_card.options ?? []
		});
	}
	if (refs.community_card) {
		activeChoiceCards.push({
			id: character.community_card_id!,
			options: refs.community_card.options ?? []
		});
	}
	for (const card of domainCardVault) {
		activeChoiceCards.push({ id: card.id, options: card.options ?? [] });
	}
	if (refs.primary_subclass && character.primary_subclass_id) {
		activeChoiceCards.push({
			id: character.primary_subclass_id,
			options: subclassOptionsForMastery(
				refs.primary_subclass,
				intrinsic.intrinsic_primary_mastery_level
			)
		});
	}
	if (refs.secondary_subclass && character.secondary_subclass_id) {
		activeChoiceCards.push({
			id: character.secondary_subclass_id,
			options: subclassOptionsForMastery(
				refs.secondary_subclass,
				intrinsic.intrinsic_secondary_mastery_level
			)
		});
	}

	const normalizedCardChoices = Object.fromEntries(
		activeChoiceCards
			.map(
				({ id, options }) =>
					[
						id,
						sanitizeCardChoiceRecord(
							character.card_choices[id],
							options,
							character.experiences.length
						)
					] as const
			)
			.filter((entry): entry is [string, Record<string, string[]>] => Boolean(entry[1]))
	);
	if (JSON.stringify(normalizedCardChoices) !== JSON.stringify(character.card_choices)) {
		character.card_choices = normalizedCardChoices;
		changed = true;
	}

	const nextMixedAncestryChoices: Character['mixed_ancestry_choices'] = {};
	if (refs.ancestry_card?.is_mixed_ancestry && character.ancestry_card_id) {
		const current = character.mixed_ancestry_choices[character.ancestry_card_id];
		if (current) {
			const topId =
				current.top_ancestry_id && compendium.ancestry_cards[current.top_ancestry_id]
					? current.top_ancestry_id
					: undefined;
			const bottomId =
				current.bottom_ancestry_id && compendium.ancestry_cards[current.bottom_ancestry_id]
					? current.bottom_ancestry_id
					: undefined;
			if (topId || bottomId) {
				nextMixedAncestryChoices[character.ancestry_card_id] = {
					top_ancestry_id: topId,
					bottom_ancestry_id: bottomId
				};
			}
		}
	}
	if (
		JSON.stringify(nextMixedAncestryChoices) !== JSON.stringify(character.mixed_ancestry_choices)
	) {
		character.mixed_ancestry_choices = nextMixedAncestryChoices;
		changed = true;
	}

	if (character.chosen_beastform) {
		const baseBeastform = compendium.beastforms[character.chosen_beastform.beastform_id];
		const nextBeastformChoices: Record<string, string[]> = {};
		if (baseBeastform) {
			if (baseBeastform.special_case === 'legendary_beast') {
				const selectedId = character.chosen_beastform.choices.legendary_beast_base_form?.[0];
				if (selectedId && compendium.beastforms[selectedId]?.level_requirement === 1) {
					nextBeastformChoices.legendary_beast_base_form = [selectedId];
				}
			}
			if (baseBeastform.special_case === 'mythic_beast') {
				const selectedId = character.chosen_beastform.choices.mythic_beast_base_form?.[0];
				if (selectedId && (compendium.beastforms[selectedId]?.level_requirement ?? 99) <= 4) {
					nextBeastformChoices.mythic_beast_base_form = [selectedId];
				}
			}
			const hybridConfig =
				baseBeastform.special_case === 'legendary_hybrid'
					? { formsKey: 'legendary_hybrid_base_forms', formCount: 2, maxLevel: 4 }
					: baseBeastform.special_case === 'mythic_hybrid'
						? { formsKey: 'mythic_hybrid_base_forms', formCount: 3, maxLevel: 7 }
						: undefined;
			if (hybridConfig) {
				const rawForms = character.chosen_beastform.choices[hybridConfig.formsKey] ?? [];
				const baseForms = uniqueStrings(rawForms)
					.filter(
						(id) => (compendium.beastforms[id]?.level_requirement ?? 99) <= hybridConfig.maxLevel
					)
					.slice(0, hybridConfig.formCount);
				if (baseForms.length > 0) nextBeastformChoices[hybridConfig.formsKey] = baseForms;

				baseForms.forEach((formId, index) => {
					const form = compendium.beastforms[formId];
					if (!form) return;
					for (const kind of ['advantages', 'features'] as const) {
						const key = `${hybridConfig.formsKey}_${index}_${kind}`.replace(
							'_base_forms',
							'_base_forms'
						);
						const limit = kind === 'advantages' ? form.advantages.length : form.features.length;
						const normalized = uniqueStrings(character.chosen_beastform?.choices[key] ?? []).filter(
							(value) => {
								const parsed = Number.parseInt(value, 10);
								return Number.isInteger(parsed) && parsed >= 0 && parsed < limit;
							}
						);
						if (normalized.length > 0) nextBeastformChoices[key] = normalized;
					}
				});
			}
		}
		if (
			JSON.stringify(nextBeastformChoices) !== JSON.stringify(character.chosen_beastform.choices)
		) {
			character.chosen_beastform.choices = nextBeastformChoices;
			changed = true;
		}
	}

	const evolutionChoice = character.feature_choices['evolution_trait']?.[0];
	const evolutionTraitValid =
		evolutionChoice &&
		ALL_TRAIT_IDS.includes(evolutionChoice as TraitId) &&
		character.chosen_beastform?.apply_beastform_bonuses;
	const nextFeatureChoices = { ...character.feature_choices };
	if (evolutionTraitValid) {
		nextFeatureChoices.evolution_trait = [evolutionChoice];
	} else {
		delete nextFeatureChoices.evolution_trait;
	}
	if (JSON.stringify(nextFeatureChoices) !== JSON.stringify(character.feature_choices)) {
		character.feature_choices = nextFeatureChoices;
		changed = true;
	}

	return changed;
}

function normalizeClassQuestions(character: Character, compendium: CompendiumContent): boolean {
	let changed = false;

	const primaryClass = character.primary_class_id
		? compendium.classes[character.primary_class_id]
		: undefined;

	if (!primaryClass) {
		if (character.background_questions.length > 0) {
			character.background_questions = [];
			changed = true;
		}
		if (character.connection_questions.length > 0) {
			character.connection_questions = [];
			changed = true;
		}
		return changed;
	}

	if (character.background_questions.length === 0) {
		character.background_questions = primaryClass.background_questions.map((question) => ({
			question,
			answer: ''
		}));
		changed = true;
	}
	if (character.connection_questions.length === 0) {
		character.connection_questions = primaryClass.connection_questions.map((question) => ({
			question,
			answer: ''
		}));
		changed = true;
	}

	return changed;
}

function normalizeTransformationQuestions(
	character: Character,
	compendium: CompendiumContent
): boolean {
	let changed = false;
	const existingQuestions = character.transformation_questions ?? [];
	const transformation = character.transformation_card_id
		? compendium.transformations[character.transformation_card_id]
		: undefined;

	if (!transformation) {
		if (existingQuestions.length > 0 || !character.transformation_questions) {
			character.transformation_questions = [];
			return true;
		}
		return false;
	}

	const existingAnswers = new Map(
		existingQuestions.map((item) => [item.question, item.answer] as const)
	);
	const nextQuestions = transformation.questions.map((question) => ({
		question,
		answer: existingAnswers.get(question) ?? ''
	}));

	if (JSON.stringify(nextQuestions) !== JSON.stringify(existingQuestions)) {
		character.transformation_questions = nextQuestions;
		changed = true;
	}

	return changed;
}

function normalizeDerivedLimits(character: Character, compendium: CompendiumContent): boolean {
	let changed = false;

	const refs = resolveDirectReferences(character, compendium);
	const intrinsic = deriveIntrinsicMastery(character);
	const levelUp = deriveLevelUpMetadata(character, compendium, refs, intrinsic);
	const activeBaseEquipment = resolveActiveBaseEquipment(character, refs);
	const baseFlags = deriveBaseFeatureFlags(refs);
	const derivedBeastform = deriveBeastform(character, compendium, baseFlags);
	const domainCardVault = deriveDomainCardVault(character, compendium, refs, levelUp);
	const loop = resolveLoopState(
		character,
		refs,
		levelUp,
		domainCardVault,
		derivedBeastform,
		activeBaseEquipment,
		intrinsic,
		baseFlags
	);
	const baseContext: EvaluationContext = {
		character,
		refs,
		level_up: levelUp,
		domain_card_vault: domainCardVault,
		domain_card_loadout: loop.loadout,
		derived_beastform: derivedBeastform,
		traits: loop.traits,
		proficiency: loop.proficiency,
		primary_class_mastery_level: loop.primary_mastery,
		secondary_class_mastery_level: loop.secondary_mastery,
		active_base_equipment: activeBaseEquipment
	};

	let maxExperiences = applyScalarModifiers(
		'max_experiences',
		BASE_STATS.max_experiences,
		loop.modifiers.base_character_modifiers,
		baseContext
	);
	if (character.level >= 2) maxExperiences += 1;
	if (character.level >= 5) maxExperiences += 1;
	if (character.level >= 8) maxExperiences += 1;
	maxExperiences = applyScalarModifiers(
		'max_experiences',
		maxExperiences,
		loop.modifiers.bonus_character_modifiers,
		baseContext
	);
	maxExperiences = applyScalarModifiers(
		'max_experiences',
		maxExperiences,
		loop.modifiers.override_character_modifiers,
		baseContext
	);

	if (character.experiences.length > maxExperiences) {
		character.experiences = character.experiences.slice(0, maxExperiences);
		changed = true;
	} else if (character.experiences.length < maxExperiences) {
		character.experiences = [
			...character.experiences,
			...Array(maxExperiences - character.experiences.length).fill('')
		];
		changed = true;
	}

	const loadoutIds = new Set(loop.loadout.map((card) => card.id));
	let normalizedLoadout = character.loadout_domain_card_ids.filter((id) =>
		loadoutIds.has(id.card_id)
	);
	normalizedLoadout = normalizedLoadout.filter(
		(id, index, items) => index === items.findIndex((candidate) => sameDomainCardId(candidate, id))
	);
	const forcedCards = loop.loadout
		.filter((card) => card.forced_in_loadout)
		.map((card) => ({ domain_id: card.domain_id, card_id: card.id }));
	for (const forcedCard of forcedCards.reverse()) {
		if (!normalizedLoadout.some((id) => sameDomainCardId(id, forcedCard))) {
			normalizedLoadout.unshift(forcedCard);
		}
	}
	normalizedLoadout = normalizedLoadout.slice(0, Math.max(0, loop.max_loadout));
	if (JSON.stringify(normalizedLoadout) !== JSON.stringify(character.loadout_domain_card_ids)) {
		character.loadout_domain_card_ids = normalizedLoadout;
		changed = true;
	}

	const derived = derive_character_data(character, compendium);
	const totalWeaponBurden = totalEquippedWeaponBurden(
		activeBaseEquipment,
		derived.hasCompatTrainingClassFeature
	);
	if (totalWeaponBurden > derived.max_burden) {
		if (character.active_secondary_weapon_inventory_id) {
			character.active_secondary_weapon_inventory_id = undefined;
			return true;
		}
		if (character.active_primary_weapon_inventory_id) {
			character.active_primary_weapon_inventory_id = undefined;
			return true;
		}
	}

	const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
	const nextMarkedHp = clamp(character.marked_hp, 0, derived.max_hp);
	const nextMarkedStress = clamp(character.marked_stress, 0, derived.max_stress);
	const nextMarkedHope = clamp(character.marked_hope, 0, derived.max_hope);
	const nextMarkedArmor = clamp(character.marked_armor, 0, derived.max_armor);
	if (nextMarkedHp !== character.marked_hp) {
		character.marked_hp = nextMarkedHp;
		changed = true;
	}
	if (nextMarkedStress !== character.marked_stress) {
		character.marked_stress = nextMarkedStress;
		changed = true;
	}
	if (nextMarkedHope !== character.marked_hope) {
		character.marked_hope = nextMarkedHope;
		changed = true;
	}
	if (nextMarkedArmor !== character.marked_armor) {
		character.marked_armor = nextMarkedArmor;
		changed = true;
	}

	const nextFeatureChoices = { ...character.feature_choices };

	if (derived.hasRallyClassFeature) {
		const rallyValue = nextFeatureChoices.given_out_this_session?.[0];
		nextFeatureChoices.given_out_this_session = [rallyValue === 'yes' ? 'yes' : 'no'];
	} else if (nextFeatureChoices.given_out_this_session) {
		delete nextFeatureChoices.given_out_this_session;
	}

	if (derived.hasUnstoppableClassFeature) {
		const enabled = nextFeatureChoices.unstoppable_active?.[0] === 'yes';
		const rawValue = Number.parseInt(nextFeatureChoices.unstoppable_active?.[1] ?? '1', 10);
		const maxUnstoppableValue = character.level < 5 ? 4 : 6;
		const normalizedValue = Number.isInteger(rawValue)
			? clamp(rawValue, 1, maxUnstoppableValue)
			: 1;
		nextFeatureChoices.unstoppable_active = enabled
			? ['yes', String(normalizedValue)]
			: ['no', '-1'];
	} else if (nextFeatureChoices.unstoppable_active) {
		delete nextFeatureChoices.unstoppable_active;
	}

	if (derived.hasStrangePatternsClassFeature) {
		const rawValue = Number.parseInt(nextFeatureChoices.strange_pattern?.[0] ?? '1', 10);
		const normalizedValue = Number.isInteger(rawValue) ? clamp(rawValue, 1, 12) : 1;
		nextFeatureChoices.strange_pattern = [String(normalizedValue)];
	} else if (nextFeatureChoices.strange_pattern) {
		delete nextFeatureChoices.strange_pattern;
	}

	if (derived.hasPrayerDiceClassFeature) {
		const maxPrayerDice = Math.max(0, derived.traits.strength ?? 0);
		const rawValues = nextFeatureChoices.prayer_dice_values ?? [];
		const normalizedPrayerDiceValues = rawValues.slice(0, maxPrayerDice).map((value) => {
			const parsed = Number.parseInt(value, 10);
			return Number.isInteger(parsed) && parsed >= 1 && parsed <= 4 ? String(parsed) : '';
		});
		while (normalizedPrayerDiceValues.length < maxPrayerDice) {
			normalizedPrayerDiceValues.push('');
		}
		nextFeatureChoices.prayer_dice_values = normalizedPrayerDiceValues;
	} else if (nextFeatureChoices.prayer_dice_values) {
		delete nextFeatureChoices.prayer_dice_values;
	}

	if (JSON.stringify(nextFeatureChoices) !== JSON.stringify(character.feature_choices)) {
		character.feature_choices = nextFeatureChoices;
		changed = true;
	}

	const classFeatureTokenMaxByKey = new Map<string, number>();
	for (const [classId, characterClass] of [
		[character.primary_class_id, refs.primary_class],
		[character.secondary_class_id, refs.secondary_class]
	] as const) {
		if (!classId || !characterClass) continue;
		characterClass.class_features.forEach((feature, index) => {
			if (feature.tokens_enabled) {
				classFeatureTokenMaxByKey.set(
					`class_feature_tokens:${classId}:${index}`,
					Math.max(0, Math.min(20, Math.trunc(feature.token_max ?? 0)))
				);
			}
		});
	}
	const nextClassFeatureTokenChoices = { ...character.feature_choices };
	for (const key of Object.keys(nextClassFeatureTokenChoices)) {
		if (key.startsWith('class_feature_tokens:') && !classFeatureTokenMaxByKey.has(key)) {
			delete nextClassFeatureTokenChoices[key];
			continue;
		}
		const maxTokens = classFeatureTokenMaxByKey.get(key);
		if (maxTokens !== undefined) {
			const current = Number(nextClassFeatureTokenChoices[key]?.[0] ?? 0);
			nextClassFeatureTokenChoices[key] = [
				String(Math.max(0, Math.min(maxTokens, Number.isFinite(current) ? Math.trunc(current) : 0)))
			];
		}
	}
	if (JSON.stringify(nextClassFeatureTokenChoices) !== JSON.stringify(character.feature_choices)) {
		character.feature_choices = nextClassFeatureTokenChoices;
		changed = true;
	}

	const nextUnarmedAttackChoices: Character['unarmed_attack_choices'] = {};
	const selectedUnarmedTrait = character.unarmed_attack_choices.trait?.[0];
	if (
		selectedUnarmedTrait &&
		derived.derived_unarmed_attack.available_traits.includes(selectedUnarmedTrait as TraitId)
	) {
		nextUnarmedAttackChoices.trait = [selectedUnarmedTrait];
	}
	const selectedUnarmedDamageType = character.unarmed_attack_choices.damage_type?.[0];
	if (
		selectedUnarmedDamageType &&
		derived.derived_unarmed_attack.available_damage_types.includes(
			selectedUnarmedDamageType as 'phy' | 'mag'
		)
	) {
		nextUnarmedAttackChoices.damage_type = [selectedUnarmedDamageType];
	}
	if (
		JSON.stringify(nextUnarmedAttackChoices) !== JSON.stringify(character.unarmed_attack_choices)
	) {
		character.unarmed_attack_choices = nextUnarmedAttackChoices;
		changed = true;
	}

	return changed;
}

function normalize_character(character: Character, compendium: CompendiumContent): Character {
	const normalized = cloneCharacter(character);

	for (let iteration = 0; iteration < 5; iteration++) {
		const before = JSON.stringify(normalized);
		normalizeLevelUpChoices(normalized, compendium);
		normalizeClassRelationships(normalized, compendium);
		normalizeInventoryAndEquipment(normalized, compendium);
		normalizeReferencesAndChoices(normalized, compendium);
		normalizeClassQuestions(normalized, compendium);
		normalizeTransformationQuestions(normalized, compendium);
		normalizeDerivedLimits(normalized, compendium);
		if (JSON.stringify(normalized) === before) break;
	}

	return normalized;
}

function build_derived_descriptors(
	derived: DerivedCharacterData,
	compendium: CompendiumContent
): Character['derived_descriptors'] {
	const buildBannerDomain = (
		domain: Domain | undefined
	): CharacterClassBannerDomain | undefined => {
		if (!domain) return undefined;

		return {
			title: domain.title,
			color: domain.color,
			foreground_color: domain.foreground_color,
			image_url: domain.image_url
		};
	};

	const buildClassBanner = (
		characterClass: CharacterClass | undefined
	): CharacterClassBanner | undefined => {
		if (!characterClass) return undefined;

		const primaryDomain = characterClass.primary_domain_id
			? compendium.domains[characterClass.primary_domain_id]
			: undefined;
		const secondaryDomain = characterClass.secondary_domain_id
			? compendium.domains[characterClass.secondary_domain_id]
			: undefined;

		if (!primaryDomain && !secondaryDomain) return undefined;

		return {
			primary_domain: buildBannerDomain(primaryDomain),
			secondary_domain: buildBannerDomain(secondaryDomain)
		};
	};

	return {
		ancestry_name: derived.ancestry_card?.title ?? '',
		community_name: derived.community_card?.title ?? '',
		primary_class_name: derived.primary_class?.title ?? '',
		primary_subclass_name: derived.primary_subclass?.title ?? '',
		secondary_class_name: derived.secondary_class?.title ?? '',
		secondary_subclass_name: derived.secondary_subclass?.title ?? '',
		max_hp: derived.max_hp,
		max_stress: derived.max_stress,
		max_hope: derived.max_hope,
		evasion: derived.evasion,
		max_armor: derived.max_armor,
		damage_thresholds: derived.damage_thresholds,
		primary_class_banner: buildClassBanner(derived.primary_class),
		secondary_class_banner: buildClassBanner(derived.secondary_class)
	};
}

export function derive_character_state(
	character: Character,
	compendium: CompendiumContent
): DerivedCharacterState {
	const normalizedCharacter = normalize_character(character, compendium);
	const derived = derive_character_data(normalizedCharacter, compendium);
	normalizedCharacter.derived_descriptors = build_derived_descriptors(derived, compendium);

	return {
		character: normalizedCharacter,
		derived,
		didCorrectCharacter: JSON.stringify(character) !== JSON.stringify(normalizedCharacter)
	};
}
