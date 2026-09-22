import { z } from 'zod';
import { zid } from '../ids';
import type { BaseCard } from './rules';
import {
	AdversaryTypeSchema,
	BaseCardSchema,
	CharacterModifierSchema,
	DamageThresholdsSchema,
	DamageTypeSchema,
	EnvironmentTypeSchema,
	FeatureSchema,
	RangeSchema,
	SourceKeySchema,
	TierSchema,
	TraitIdSchema,
	TraitsSchema,
	WeaponModifierSchema,
	WeaponTypeSchema
} from './rules';

const DamageDiceSchema = z.string().trim();

export const PrimaryWeaponSchema = z.object({
	source_key: SourceKeySchema,
	title: z.string(),
	description_html: z.string(),
	level_requirement: z.number().int().min(1).max(10),
	type: WeaponTypeSchema,
	available_traits: z.array(TraitIdSchema).min(1, 'Select at least one trait'),
	range: RangeSchema,
	features: z.array(FeatureSchema),
	attack_roll_bonus: z.number().int(),
	damage_bonus: z.number().int(),
	damage_dice: DamageDiceSchema,
	available_damage_types: z.array(DamageTypeSchema).min(1, 'Select at least one damage type'),
	burden: z.union([z.literal(0), z.literal(1), z.literal(2)])
});
export type PrimaryWeapon = z.infer<typeof PrimaryWeaponSchema>;

export const SecondaryWeaponSchema = z.object({
	source_key: SourceKeySchema,
	title: z.string(),
	description_html: z.string(),
	level_requirement: z.number().int().min(1).max(10),
	type: WeaponTypeSchema,
	available_traits: z.array(TraitIdSchema).min(1, 'Select at least one trait'),
	range: RangeSchema,
	features: z.array(FeatureSchema),
	attack_roll_bonus: z.number().int(),
	damage_bonus: z.number().int(),
	damage_dice: DamageDiceSchema,
	available_damage_types: z.array(DamageTypeSchema).min(1, 'Select at least one damage type'),
	burden: z.union([z.literal(0), z.literal(1), z.literal(2)])
});
export type SecondaryWeapon = z.infer<typeof SecondaryWeaponSchema>;

export const UnarmedAttackSchema = z.object({
	source_key: SourceKeySchema,
	title: z.string(),
	description_html: z.string(),
	level_requirement: z.number().int().min(1).max(10),
	type: WeaponTypeSchema,
	available_traits: z.array(TraitIdSchema),
	range: RangeSchema,
	features: z.array(FeatureSchema),
	attack_roll_bonus: z.number().int(),
	damage_bonus: z.number().int(),
	damage_dice: DamageDiceSchema,
	available_damage_types: z.array(DamageTypeSchema),
	burden: z.union([z.literal(0), z.literal(1), z.literal(2)])
});
export type UnarmedAttack = z.infer<typeof UnarmedAttackSchema>;

export const ArmorSchema = z.object({
	source_key: SourceKeySchema,
	level_requirement: z.number().int().min(1).max(10),
	title: z.string(),
	description_html: z.string(),
	max_armor: z.number().int().min(0),
	damage_thresholds: DamageThresholdsSchema,
	features: z.array(FeatureSchema)
});
export type Armor = z.infer<typeof ArmorSchema>;

export const LootSchema = z.object({
	source_key: SourceKeySchema,
	rarity_roll: z.number(),
	title: z.string(),
	description_html: z.string(),
	character_modifiers: z.array(CharacterModifierSchema),
	weapon_modifiers: z.array(WeaponModifierSchema)
});
export type Loot = z.infer<typeof LootSchema>;

export const ConsumableSchema = z.object({
	source_key: SourceKeySchema,
	rarity_roll: z.number(),
	title: z.string(),
	description_html: z.string()
});
export type Consumable = z.infer<typeof ConsumableSchema>;

export const AdventuringGearSchema = z.string();
export type AdventuringGear = z.infer<typeof AdventuringGearSchema>;

export const BeastformSchema = z.object({
	source_key: SourceKeySchema,
	level_requirement: z.number().int().min(1).max(10),
	title: z.string(),
	category: z.string(),
	character_trait: z.object({
		trait: TraitIdSchema,
		bonus: z.number().int()
	}),
	attack: z.object({
		range: RangeSchema,
		trait: TraitIdSchema,
		damage_dice: DamageDiceSchema,
		damage_bonus: z.number().int(),
		damage_type: DamageTypeSchema
	}),
	advantages: z.array(z.string()),
	evasion_bonus: z.number().int(),
	features: z.array(FeatureSchema),
	special_case: z
		.enum(['legendary_beast', 'legendary_hybrid', 'mythic_beast', 'mythic_hybrid'])
		.optional()
});
export type Beastform = z.infer<typeof BeastformSchema>;

export const CharacterClassSchema = z
	.object({
		source_key: SourceKeySchema,
		title: z.string(),
		image_url: z.string(),
		artist_name: z.string(),
		description_html: z.string(),
		starting_evasion: z.number().int().min(0),
		starting_max_hp: z.number().int().min(0),
		spellcast_trait: TraitIdSchema.optional(),
		hope_feature: FeatureSchema,
		primary_domain_id: z.string().trim().min(1, 'Invalid Primary domain').optional(),
		secondary_domain_id: z.string().trim().min(1, 'Invalid Secondary domain').optional(),
		class_features: z.array(FeatureSchema),
		subclass_ids: z.array(z.string().trim().min(1, 'Subclass is required')),
		suggested_traits: TraitsSchema,
		suggested_primary_weapon_id: z.string().optional(),
		suggested_secondary_weapon_id: z.string().optional(),
		suggested_armor_id: z.string().optional(),
		starting_inventory: z.object({
			gold_coins: z.number().int().min(0),
			free_gear: z.array(z.string().trim().min(1, 'Free gear is required')),
			loot_or_consumable_options: z.array(
				z.union([
					z.object({ type: z.literal('loot'), id: z.string().trim().min(1, 'Loot is required') }),
					z.object({
						type: z.literal('consumable'),
						id: z.string().trim().min(1, 'Consumable is required')
					})
				])
			),
			class_gear_options: z.array(z.string().trim().min(1, 'Class gear option is required')),
			spellbook_prompt: z.string().optional()
		}),
		background_questions: z.array(z.string().trim().min(1, 'Background question is required')),
		connection_questions: z.array(z.string().trim().min(1, 'Connection question is required')),
		character_description_suggestions: z.object({
			clothes: z.string(),
			eyes: z.string(),
			body: z.string(),
			skin: z.string(),
			attitude: z.string()
		})
	})
	.superRefine((characterClass, ctx) => {
		// Prevent classes from selecting the same domain in both domain slots.
		if (
			characterClass.primary_domain_id &&
			characterClass.secondary_domain_id &&
			characterClass.primary_domain_id.trim().toLowerCase() ===
				characterClass.secondary_domain_id.trim().toLowerCase()
		) {
			ctx.addIssue({
				code: 'custom',
				message: 'Primary and secondary domains must be different',
				path: ['secondary_domain_id']
			});
		}

		// Keep subclass references unique so class option lists do not render or save duplicates.
		const seenSubclassIds = new Map<string, number>();
		characterClass.subclass_ids.forEach((subclassId, index) => {
			const normalized = subclassId.trim().toLowerCase();
			if (normalized === '') return;

			const firstIndex = seenSubclassIds.get(normalized);
			if (firstIndex !== undefined) {
				ctx.addIssue({
					code: 'custom',
					message: 'Subclass IDs must be unique',
					path: ['subclass_ids', index]
				});
				ctx.addIssue({
					code: 'custom',
					message: 'Subclass IDs must be unique',
					path: ['subclass_ids', firstIndex]
				});
				return;
			}

			seenSubclassIds.set(normalized, index);
		});
	});
export type CharacterClass = z.infer<typeof CharacterClassSchema>;

export const SubclassLevelUpOptionSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('domain_card'),
		max: z.number().int().min(1),
		option_id: z.string().trim().min(1, 'Option is required'),
		title: z.string(),
		short_title: z.string()
	})
]);
export type SubclassLevelUpOption = z.infer<typeof SubclassLevelUpOptionSchema>;

export const SubclassSchema = z
	.object({
		source_key: SourceKeySchema,
		class_id: z.string().trim().min(1, 'Invalid Class').optional(),
		title: z.string(),
		description_html: z.string(),
		image_url: z.string(),
		artist_name: z.string(),
		spellcast_trait: TraitIdSchema.optional(),
		suggested_traits: TraitsSchema.optional(),
		suggested_primary_weapon_id: z.string().nullable().optional(),
		suggested_secondary_weapon_id: z.string().nullable().optional(),
		suggested_armor_id: z.string().nullable().optional(),
		sheet_addon_ids: z.array(z.string().trim().min(1, 'Sheet add-on is required')).optional(),
		foundation_card: BaseCardSchema.extend({
			level_up_options: z.array(SubclassLevelUpOptionSchema).optional()
		}),
		specialization_card: BaseCardSchema.extend({
			level_up_options: z.array(SubclassLevelUpOptionSchema).optional()
		}),
		mastery_card: BaseCardSchema.extend({
			level_up_options: z.array(SubclassLevelUpOptionSchema).optional()
		})
	})
	.superRefine((subclass, ctx) => {
		const seen = new Map<string, Array<{ card: string; index: number }>>();
		const cards = [
			['foundation_card', subclass.foundation_card],
			['specialization_card', subclass.specialization_card],
			['mastery_card', subclass.mastery_card]
		] as const;

		for (const [cardKey, card] of cards) {
			(card.options ?? []).forEach((option, index) => {
				if (option.type !== 'arbitrary') return;
				const normalized = option.choice_id.trim().toLowerCase();
				if (normalized === '') return;
				const entries = seen.get(normalized) ?? [];
				entries.push({ card: cardKey, index });
				seen.set(normalized, entries);
			});
		}

		for (const entries of seen.values()) {
			if (entries.length < 2) continue;
			for (const entry of entries) {
				ctx.addIssue({
					code: 'custom',
					message: 'Choice ID must be unique across subclass cards',
					path: [entry.card, 'options', entry.index, 'choice_id']
				});
			}
		}
	});
export type Subclass = z.infer<typeof SubclassSchema>;
export type SubclassCard = Subclass &
	BaseCard & { type: 'foundation' | 'specialization' | 'mastery' };

export const CharacterSheetAddonSchema = z.object({
	source_key: SourceKeySchema,
	title: z.string(),
	description_html: z.string(),
	resource: z
		.object({
			title: z.string(),
			description_html: z.string(),
			max: z.number().int().min(0)
		})
		.optional(),
	sections: z.array(
		z.object({
			title: z.string(),
			description_html: z.string(),
			tier: TierSchema.optional(),
			options: z.array(
				z.object({
					option_id: z.string().trim().min(1, 'Option ID is required'),
					title: z.string(),
					description_html: z.string()
				})
			)
		})
	)
});
export type CharacterSheetAddon = z.infer<typeof CharacterSheetAddonSchema>;

export const DomainSchema = z.object({
	source_key: SourceKeySchema,
	title: z.string(),
	description_html: z.string(),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code'),
	foreground_color: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/, 'Foreground color must be a valid hex code'),
	image_url: z.string(),
	artist_name: z.string()
});
export type Domain = z.infer<typeof DomainSchema>;

export const DomainCardSchema = z
	.object({
		source_key: SourceKeySchema,
		domain_id: z.string().trim().min(1, 'Invalid Domain').optional(),
		title: z.string(),
		image_url: z.string(),
		artist_name: z.string(),
		level_requirement: z.number().int().min(1).max(10),
		recall_cost: z.number().int().min(0),
		category: z.enum(['ability', 'spell', 'grimoire']),
		applies_in_vault: z.boolean().optional(),
		forced_in_loadout: z.boolean().optional(),
		forced_in_vault: z.boolean().optional()
	})
	.superRefine((domainCard, ctx) => {
		// Domain cards must belong to a domain even though the stored field remains optional.
		if (!domainCard.domain_id || domainCard.domain_id.trim() === '') {
			ctx.addIssue({ code: 'custom', message: 'Domain is required', path: ['domain_id'] });
		}
	})
	.and(BaseCardSchema);
export type DomainCard = z.infer<typeof DomainCardSchema>;

export const AncestryCardSchema = z
	.object({
		source_key: SourceKeySchema,
		title: z.string(),
		description_html: z.string(),
		image_url: z.string(),
		artist_name: z.string(),
		is_mixed_ancestry: z.boolean().optional()
	})
	.and(BaseCardSchema);
export type AncestryCard = z.infer<typeof AncestryCardSchema>;

export const CommunityCardSchema = z
	.object({
		source_key: SourceKeySchema,
		title: z.string(),
		description_html: z.string(),
		image_url: z.string(),
		artist_name: z.string(),
		field_group: z
			.object({
				name: z.string().trim().min(1, 'Field group name is required'),
				count: z.number().int().min(1).max(6)
			})
			.optional()
	})
	.and(BaseCardSchema);
export type CommunityCard = z.infer<typeof CommunityCardSchema>;

export const TransformationFeatureSchema = z.object({
	name: z.string().trim().min(1, 'Feature name is required'),
	description_html: z.string()
});
export type TransformationFeature = z.infer<typeof TransformationFeatureSchema>;

export const TransformationSchema = z.object({
	source_key: SourceKeySchema,
	title: z.string(),
	description_html: z.string(),
	features: z.array(TransformationFeatureSchema),
	questions: z.array(z.string().trim().min(1, 'Question is required'))
});
export type Transformation = z.infer<typeof TransformationSchema>;

export const AdversarySchema = z
	.object({
		source_key: SourceKeySchema,
		title: z.string(),
		tier: TierSchema,
		type: AdversaryTypeSchema,
		image_url: z.string(),
		artist_name: z.string(),
		description: z.string(),
		motives_tactics: z.string(),
		difficulty: z.number().int().min(0),
		thresholds: DamageThresholdsSchema,
		max_hp: z.number().int().min(0),
		max_stress: z.number().int().min(0),
		attack_modifier: z.number().int(),
		standard_attack: z.object({
			name: z.string(),
			range: RangeSchema,
			damage_dice: DamageDiceSchema,
			damage_bonus: z.number().int(),
			damage_type: DamageTypeSchema
		}),
		experiences: z.array(z.string()),
		experience_modifiers: z.array(z.number()),
		features: z.array(
			z.object({
				type: z.enum(['Action', 'Reaction', 'Passive', 'Evolution']),
				name: z.string(),
				max_uses: z.number().int().min(0).nullable(),
				description_html: z.string()
			})
		)
	})
	.superRefine((adversary, ctx) => {
		// Experience names and modifiers are parallel arrays and must stay index-aligned.
		if (adversary.experiences.length !== adversary.experience_modifiers.length) {
			ctx.addIssue({
				code: 'custom',
				message: 'Experience names and modifiers must have the same length',
				path: ['experience_modifiers']
			});
		}
	});
export type Adversary = z.infer<typeof AdversarySchema>;

export const EnvironmentSchema = z.object({
	source_key: SourceKeySchema,
	title: z.string(),
	description: z.string(),
	tier: TierSchema,
	image_url: z.string(),
	artist_name: z.string(),
	type: EnvironmentTypeSchema,
	impulses: z.string(),
	relative_strength: z.boolean().optional(),
	difficulty: z.number().int().min(0),
	potential_adversaries: z.string(),
	potential_adversaries_ids: z.array(z.string()),
	features: z.array(
		z.object({
			type: z.enum(['Action', 'Reaction', 'Passive']),
			name: z.string(),
			description_html: z.string(),
			questions: z.string()
		})
	)
});
export type Environment = z.infer<typeof EnvironmentSchema>;

export const CompendiumContentIdsSchema = z.object({
	primary_weapons: z.array(zid('primary_weapons')),
	secondary_weapons: z.array(zid('secondary_weapons')),
	armor: z.array(zid('armor')),
	loot: z.array(zid('loot')),
	consumables: z.array(zid('consumables')),
	beastforms: z.array(zid('beastforms')),
	classes: z.array(zid('classes')),
	subclasses: z.array(zid('subclasses')),
	domains: z.array(zid('domains')),
	domain_cards: z.array(zid('domain_cards')),
	ancestry_cards: z.array(zid('ancestry_cards')),
	community_cards: z.array(zid('community_cards')),
	transformations: z.array(zid('transformations')),
	character_sheet_addons: z.array(zid('character_sheet_addons')),
	adversaries: z.array(zid('adversaries')),
	environments: z.array(zid('environments'))
});
export type CompendiumContentIds = z.infer<typeof CompendiumContentIdsSchema>;

// Compendium Content (aggregate container)
export const CompendiumContentSchema = z.object({
	primary_weapons: z.record(z.string(), PrimaryWeaponSchema),
	secondary_weapons: z.record(z.string(), SecondaryWeaponSchema),
	armor: z.record(z.string(), ArmorSchema),
	loot: z.record(z.string(), LootSchema),
	consumables: z.record(z.string(), ConsumableSchema),
	beastforms: z.record(z.string(), BeastformSchema),
	classes: z.record(z.string(), CharacterClassSchema),
	subclasses: z.record(z.string(), SubclassSchema),
	domain_cards: z.record(z.string(), DomainCardSchema),
	ancestry_cards: z.record(z.string(), AncestryCardSchema),
	community_cards: z.record(z.string(), CommunityCardSchema),
	transformations: z.record(z.string(), TransformationSchema),
	character_sheet_addons: z.record(z.string(), CharacterSheetAddonSchema),
	domains: z.record(z.string(), DomainSchema),
	adversaries: z.record(z.string(), AdversarySchema),
	environments: z.record(z.string(), EnvironmentSchema)
});
export type CompendiumContent = z.infer<typeof CompendiumContentSchema>;
