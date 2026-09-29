import { z } from 'zod';
import type {
	AncestryCard,
	CommunityCard,
	DomainCard,
	SubclassCard,
	Transformation
} from './compendium';
import type { TableNames } from '../ids';
import { RollKindSchema } from './dice';

export const SourceKeySchema = z.string().trim().min(1, 'Source key is required');
export type SourceKey = z.infer<typeof SourceKeySchema>;

export const DomainCardIdSchema = z.object({
	domain_id: z.string().optional(),
	card_id: z.string().trim().min(1, 'Card is required')
});
export type DomainCardId = z.infer<typeof DomainCardIdSchema>;

export const TierSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type Tier = z.infer<typeof TierSchema>;

export const RangeSchema = z.enum(['Melee', 'Very Close', 'Close', 'Far', 'Very Far']);
export type Range = z.infer<typeof RangeSchema>;

export const DamageTypeSchema = z.enum(['phy', 'mag']);
export type DamageType = z.infer<typeof DamageTypeSchema>;

export const DamageThresholdsSchema = z.object({
	major: z.number().int(),
	severe: z.number().int()
});
export type DamageThresholds = z.infer<typeof DamageThresholdsSchema>;

export const WeaponTypeSchema = z.enum(['Physical', 'Magical']);
export type WeaponType = z.infer<typeof WeaponTypeSchema>;

export const BurdenSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type Burden = z.infer<typeof BurdenSchema>;

export const TraitIdSchema = z.enum([
	'agility',
	'strength',
	'finesse',
	'instinct',
	'presence',
	'knowledge'
]);
export type TraitId = z.infer<typeof TraitIdSchema>;

export const TraitSchema = z.object({
	id: TraitIdSchema,
	name: z.string(),
	short_name: z.string(),
	examples: z.array(z.string())
});
export type Trait = z.infer<typeof TraitSchema>;

export const TraitsSchema = z.object({
	agility: z.number().optional(),
	strength: z.number().optional(),
	finesse: z.number().optional(),
	instinct: z.number().optional(),
	presence: z.number().optional(),
	knowledge: z.number().optional()
});
export type Traits = z.infer<typeof TraitsSchema>;

export const CardOptionSchema = z
	.object({
		choice_id: z.string().trim().min(1, 'Choice ID is required'),
		conditional_choice: z
			.object({
				choice_id: z.string().trim().min(1, 'Conditional choice is required'),
				selection_id: z.string().trim().min(1, 'Conditional selection is required')
			})
			.nullable()
	})
	.and(
		z.discriminatedUnion('type', [
			z.object({
				type: z.literal('arbitrary'),
				max: z.number(),
				options: z.array(
					z.object({
						selection_id: z.string().trim().min(1, 'Selection is required'),
						title: z.string(),
						short_title: z.string()
					})
				)
			}),
			z.object({
				type: z.literal('experience'),
				max: z.number()
			})
		])
	);
export type CardOption = z.infer<typeof CardOptionSchema>;

export const CardChoicesSchema = z.record(z.string(), z.array(z.string()));
export type CardChoices = z.infer<typeof CardChoicesSchema>;

export const CharacterConditionSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('armor_equipped'),
		value: z.boolean()
	}),
	z.object({
		type: z.literal('level'),
		min_level: z.number(),
		max_level: z.number()
	}),
	z.object({
		type: z.literal('card_choice'),
		card_id: z.string().trim().min(1, 'Card is required'),
		choice_id: z.string().trim().min(1, 'Choice is required'),
		selection_id: z.string().trim().min(1, 'Selection is required')
	}),
	z.object({
		type: z.literal('loot_choice'),
		loot_id: z.string(),
		choice_id: z.string(),
		selection_id: z.string()
	}),
	z.object({
		type: z.literal('min_loadout_cards_from_domain'),
		domain_id: z.string(),
		min_cards: z.number().int()
	}),
	z.object({
		type: z.enum(['primary_weapon_equipped', 'secondary_weapon_equipped']),
		weapon_id: z.string().optional()
	})
]);
export type CharacterCondition = z.infer<typeof CharacterConditionSchema>;

export const CharacterModifierSchema = z
	.object({
		behaviour: z.enum(['bonus', 'base', 'override']),
		character_conditions: z.array(CharacterConditionSchema)
	})
	.and(
		z.discriminatedUnion('type', [
			z.object({
				type: z.literal('derived_from_trait'),
				trait: TraitIdSchema,
				multiplier: z.number()
			}),
			z.object({
				type: z.literal('flat'),
				value: z.number()
			}),
			z.object({
				type: z.literal('derived_from_proficiency'),
				multiplier: z.number()
			}),
			z.object({
				type: z.literal('derived_from_level'),
				multiplier: z.number()
			})
		])
	)
	.and(
		z.discriminatedUnion('target', [
			z.object({
				target: z.enum([
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
					'max_long_rest_actions'
				])
			}),
			z.object({
				target: z.literal('trait'),
				trait: TraitIdSchema
			}),
			z.object({
				target: z.literal('experience_from_card_choice_selection'),
				card_id: z.string().trim().min(1, 'Card is required'),
				choice_id: z.string().trim().min(1, 'Choice is required')
			})
		])
	);
export type CharacterModifier = z.infer<typeof CharacterModifierSchema>;

export const WeaponConditionSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('range'),
		ranges: z.array(RangeSchema).min(1)
	}),
	z.object({
		type: z.literal('damage_type'),
		damage_type: DamageTypeSchema
	})
]);
export type WeaponCondition = z.infer<typeof WeaponConditionSchema>;

const NumericWeaponModifierSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('flat'),
		value: z.number()
	}),
	z.object({
		type: z.literal('derived_from_trait'),
		trait: TraitIdSchema,
		multiplier: z.number()
	})
]);

export const WeaponModifierSchema = z
	.object({
		behaviour: z.enum(['bonus', 'base', 'override']),
		character_conditions: z.array(CharacterConditionSchema),
		weapon_conditions: z.array(WeaponConditionSchema),
		target_weapon: z.enum(['primary', 'secondary', 'unarmed', 'all'])
	})
	.and(
		z.union([
			z
				.object({
					target_stat: z.literal('attack_roll')
				})
				.and(NumericWeaponModifierSchema),
			z
				.object({
					target_stat: z.literal('damage_bonus')
				})
				.and(NumericWeaponModifierSchema),
			z.object({
				target_stat: z.literal('damage_dice'),
				dice: z.string().trim().min(1, 'Damage dice is required')
			}),
			z.object({
				target_stat: z.literal('damage_type'),
				damage_type: z.enum(['phy', 'mag'])
			}),
			z.object({
				target_stat: z.literal('range'),
				range: z.enum(['Melee', 'Very Close', 'Close', 'Far', 'Very Far'])
			}),
			z.object({
				target_stat: z.literal('trait'),
				trait: TraitIdSchema
			})
		])
	);
export type WeaponModifier = z.infer<typeof WeaponModifierSchema>;

// 'rest' refreshes on a short or long rest; 'never' only refreshes manually (one-time use).
export const UsageResetSchema = z.enum(['rest', 'long_rest', 'scene', 'session', 'never']);
export type UsageReset = z.infer<typeof UsageResetSchema>;

export const FeatureUsageSchema = z.object({
	// stable across versions; character state is keyed by it
	id: z
		.string()
		.trim()
		.regex(/^[a-z0-9_-]+$/i, 'Use letters, numbers, dashes and underscores only'),
	label: z.string().trim().min(1).optional(),
	max_uses: z.number().int().min(1).max(20),
	reset: UsageResetSchema
});
export type FeatureUsage = z.infer<typeof FeatureUsageSchema>;

// A number that comes from the character, e.g. "equal to your Spellcast trait" or "max(1, Agility)".
export const PoolQuantitySchema = z
	.object({
		source: z.enum(['fixed', 'proficiency', 'level', 'tier', 'trait', 'spellcast_trait']),
		value: z.number().int().min(0).max(99).optional(),
		trait: TraitIdSchema.optional(),
		minimum: z.number().int().min(0).max(99).optional()
	})
	.superRefine((quantity, ctx) => {
		if (quantity.source === 'fixed' && quantity.value === undefined) {
			ctx.addIssue({ code: 'custom', path: ['value'], message: 'Enter a number' });
		}
		if (quantity.source === 'trait' && !quantity.trait) {
			ctx.addIssue({ code: 'custom', path: ['trait'], message: 'Choose a trait' });
		}
	});
export type PoolQuantity = z.infer<typeof PoolQuantitySchema>;

export const PoolEventSchema = z.enum([
	'short_rest',
	'long_rest',
	'scene',
	'session_start',
	'session_end'
]);
export type PoolEvent = z.infer<typeof PoolEventSchema>;

export const PoolDieSchema = z.enum(['d4', 'd6', 'd8', 'd10', 'd12', 'd20']);
export type PoolDie = z.infer<typeof PoolDieSchema>;

export const FeaturePoolSchema = z
	.object({
		// stable across versions; character state is keyed by it
		id: FeatureUsageSchema.shape.id,
		label: z.string().trim().min(1).optional(),
		kind: z.enum(['tokens', 'dice']),
		die: PoolDieSchema.optional(),
		// Tokens only. Without a capacity the pool is uncapped: a starting amount is not a maximum.
		capacity: PoolQuantitySchema.optional(),
		// Tokens: the amount Refill sets. Dice: the number of dice rolled.
		refill: PoolQuantitySchema.optional(),
		refill_on: z.array(PoolEventSchema).optional(),
		clear_on: z.array(PoolEventSchema).optional()
	})
	.superRefine((pool, ctx) => {
		if (pool.kind === 'dice' && !pool.die) {
			ctx.addIssue({ code: 'custom', path: ['die'], message: 'Choose a die' });
		}
		if (pool.kind === 'dice' && !pool.refill) {
			ctx.addIssue({ code: 'custom', path: ['refill'], message: 'Set how many dice are rolled' });
		}
	});
export type FeaturePool = z.infer<typeof FeaturePoolSchema>;

export const RecordFieldTypeSchema = z.enum([
	'text',
	'long_text',
	'number',
	'choice',
	'experience',
	'trait',
	'domain_card'
]);
export type RecordFieldType = z.infer<typeof RecordFieldTypeSchema>;

export const RecordFieldSchema = z
	.object({
		// stable across versions; entry values are keyed by it
		id: FeatureUsageSchema.shape.id,
		label: z.string().trim().min(1, 'Field label is required'),
		placeholder: z.string().trim().min(1).optional(),
		type: RecordFieldTypeSchema,
		options: z
			.array(
				z.object({
					id: FeatureUsageSchema.shape.id,
					label: z.string().trim().min(1, 'Option label is required')
				})
			)
			.optional()
	})
	.superRefine((field, ctx) => {
		if (field.type === 'choice' && !field.options?.length) {
			ctx.addIssue({ code: 'custom', path: ['options'], message: 'Add at least one option' });
		}
	});
export type RecordField = z.infer<typeof RecordFieldSchema>;

// Things a player records or chooses for a feature: one record (e.g. a signature move) or a
// ledger of entries (e.g. targets). Records are kept separate from temporary active effects.
export const FeatureRecordSchema = z
	.object({
		// stable across versions; character state is keyed by it
		id: FeatureUsageSchema.shape.id,
		label: z.string().trim().min(1).optional(),
		kind: z.enum(['single', 'ledger']),
		fields: z.array(RecordFieldSchema).min(1).max(8),
		// Ledger only; no cap when absent.
		max_entries: z.number().int().min(1).max(50).optional(),
		// Ledger only; clears every entry on these confirmed events.
		clear_on: z.array(PoolEventSchema).optional()
	})
	.superRefine((record, ctx) => {
		const ids = new Set<string>();
		record.fields.forEach((field, index) => {
			if (ids.has(field.id)) {
				ctx.addIssue({
					code: 'custom',
					path: ['fields', index, 'id'],
					message: 'Field ids must be unique'
				});
			}
			ids.add(field.id);
		});
	});
export type FeatureRecord = z.infer<typeof FeatureRecordSchema>;

// Rest, scene and session events end effects from Downtime; the rest are combat events the player
// confirms until rolls report them (#8). 'attacked_successfully' is an attack succeeding against you.
export const EffectEndEventSchema = z.enum([
	'short_rest',
	'long_rest',
	'scene',
	'session_end',
	'attack_made',
	'attack_succeeded',
	'damage_rolled',
	'damage_dealt',
	'hp_marked',
	'attacked_successfully'
]);
export type EffectEndEvent = z.infer<typeof EffectEndEventSchema>;

// A temporary effect a feature switches on: its modifiers apply only while it is active and its
// source is eligible, and it ends on the listed events or when someone ends it by hand.
export const FeatureEffectSchema = z.object({
	// stable across versions; character state is keyed by it
	id: FeatureUsageSchema.shape.id,
	label: z.string().trim().min(1).optional(),
	cost: z
		.object({
			hope: z.number().int().min(1).max(12).optional(),
			stress: z.number().int().min(1).max(12).optional(),
			// Spends a use of the feature's usage tracker.
			usage: z.boolean().optional()
		})
		.optional(),
	// Hope and Stress are paid on the attempt; the effect (and any use) only on a success.
	requires_success: z.boolean().optional(),
	target: z.object({ label: z.string().trim().min(1, 'Target label is required') }).optional(),
	// single: can't activate again while active; replace: a new activation ends the old one;
	// per_target: one instance per target. Defaults to single.
	instances: z.enum(['single', 'replace', 'per_target']).optional(),
	// against_target modifiers only apply to rolls against the target, so they don't change the sheet.
	// Defaults to self.
	scope: z.enum(['self', 'against_target']).optional(),
	character_modifiers: z.array(CharacterModifierSchema),
	weapon_modifiers: z.array(WeaponModifierSchema),
	notes: z.string().trim().min(1).optional(),
	ends_on: z.array(EffectEndEventSchema),
	// Narrative ends the player or GM confirms, e.g. "You attack another creature".
	ends_when: z.array(z.string().trim().min(1)).optional()
});
export type FeatureEffect = z.infer<typeof FeatureEffectSchema>;

export const RollOptionTimingSchema = z.enum(['before', 'after', 'defense']);
export type RollOptionTiming = z.infer<typeof RollOptionTimingSchema>;

// What a roll option does. 'pool' takes the value of a die spent from one of the feature's dice pools.
export const RollOptionEffectSchema = z.discriminatedUnion('type', [
	// before: replaces the Hope Die with a d20
	z.object({ type: z.literal('hope_die'), die: z.literal('d20') }),
	// before: adds an advantage die
	z.object({ type: z.literal('advantage') }),
	z.object({ type: z.literal('flat_bonus'), value: z.number().int() }),
	z.object({ type: z.literal('bonus_die'), die: z.union([z.literal('pool'), PoolDieSchema]) }),
	// after: rolls one die per pool token spent as a separate damage roll
	z.object({ type: z.literal('extra_damage'), die: PoolDieSchema }),
	// after: rerolls the chosen Duality Dice
	z.object({ type: z.literal('reroll'), dice: z.enum(['duality', 'hope', 'fear']) }),
	// after: switches the Hope and Fear results
	z.object({ type: z.literal('swap_results') }),
	// defense: reduces incoming damage
	z.object({
		type: z.literal('reduce_damage'),
		amount: z.union([z.literal('pool'), PoolDieSchema, z.number().int().min(1)])
	})
]);
export type RollOptionEffect = z.infer<typeof RollOptionEffectSchema>;

// A choice a feature offers on a roll or when taking damage. Costs are paid when the player confirms.
export const FeatureRollOptionSchema = z.object({
	// stable across versions; character state is keyed by it
	id: FeatureUsageSchema.shape.id,
	label: z.string().trim().min(1).optional(),
	// Which rolls list the option. Not used for defense options.
	applies_to: z.array(RollKindSchema).optional(),
	timing: RollOptionTimingSchema,
	cost: z
		.object({
			hope: z.number().int().min(1).max(12).optional(),
			stress: z.number().int().min(1).max(12).optional(),
			// Spends a use of the feature's usage tracker.
			usage: z.boolean().optional(),
			// Spends tokens (amount) or one die from this feature's pool.
			pool: z
				.object({ id: FeatureUsageSchema.shape.id, amount: z.number().int().min(1).optional() })
				.optional()
		})
		.optional(),
	// Only offered once the player has confirmed the roll succeeded or failed.
	requires_outcome: z.enum(['success', 'failure']).optional(),
	// Only offered while this effect (an id on the same feature) is active.
	requires_active_effect: FeatureUsageSchema.shape.id.optional(),
	// Pays by ending the required effect.
	ends_effect: z.boolean().optional(),
	character_conditions: z.array(CharacterConditionSchema).optional(),
	effect: RollOptionEffectSchema
});
export type FeatureRollOption = z.infer<typeof FeatureRollOptionSchema>;

const ROLL_OPTION_TIMING_BY_EFFECT: Record<RollOptionEffect['type'], RollOptionTiming[]> = {
	hope_die: ['before'],
	advantage: ['before'],
	flat_bonus: ['before', 'after'],
	bonus_die: ['before', 'after'],
	extra_damage: ['after'],
	reroll: ['after'],
	swap_results: ['after'],
	reduce_damage: ['defense']
};

export const FeatureSchema = z
	.object({
		title: z.string(),
		description_html: z.string(),
		character_modifiers: z.array(CharacterModifierSchema),
		weapon_modifiers: z.array(WeaponModifierSchema),
		tokens_enabled: z.boolean().optional(),
		token_max: z.number().int().min(0).optional(),
		usage: FeatureUsageSchema.optional(),
		pools: z.array(FeaturePoolSchema).optional(),
		records: z.array(FeatureRecordSchema).optional(),
		effects: z.array(FeatureEffectSchema).optional(),
		roll_options: z.array(FeatureRollOptionSchema).optional()
	})
	.superRefine((feature, ctx) => {
		const ids = new Set<string>();
		(feature.pools ?? []).forEach((pool, index) => {
			if (ids.has(pool.id)) {
				ctx.addIssue({
					code: 'custom',
					path: ['pools', index, 'id'],
					message: 'Pool ids must be unique'
				});
			}
			ids.add(pool.id);
		});
		const recordIds = new Set<string>();
		(feature.records ?? []).forEach((record, index) => {
			if (recordIds.has(record.id)) {
				ctx.addIssue({
					code: 'custom',
					path: ['records', index, 'id'],
					message: 'Record ids must be unique'
				});
			}
			recordIds.add(record.id);
		});
		const effectIds = new Set<string>();
		(feature.effects ?? []).forEach((effect, index) => {
			if (effectIds.has(effect.id)) {
				ctx.addIssue({
					code: 'custom',
					path: ['effects', index, 'id'],
					message: 'Effect ids must be unique'
				});
			}
			effectIds.add(effect.id);
			if (effect.cost?.usage && !feature.usage) {
				ctx.addIssue({
					code: 'custom',
					path: ['effects', index, 'cost', 'usage'],
					message: 'Add a usage tracker to spend a use'
				});
			}
		});
		const optionIds = new Set<string>();
		const poolIds = new Set((feature.pools ?? []).map((pool) => pool.id));
		(feature.roll_options ?? []).forEach((option, index) => {
			const issue = (path: (string | number)[], message: string) =>
				ctx.addIssue({ code: 'custom', path: ['roll_options', index, ...path], message });
			if (optionIds.has(option.id)) issue(['id'], 'Roll option ids must be unique');
			optionIds.add(option.id);
			if (!ROLL_OPTION_TIMING_BY_EFFECT[option.effect.type].includes(option.timing)) {
				issue(['timing'], 'This effect does not work at that time');
			}
			if (option.timing !== 'defense' && !option.applies_to?.length) {
				issue(['applies_to'], 'Choose which rolls this applies to');
			}
			if (option.cost?.usage && !feature.usage) {
				issue(['cost', 'usage'], 'Add a usage tracker to spend a use');
			}
			if (option.cost?.pool && !poolIds.has(option.cost.pool.id)) {
				issue(['cost', 'pool', 'id'], 'Choose a pool on this feature');
			}
			const usesPoolDie =
				(option.effect.type === 'bonus_die' && option.effect.die === 'pool') ||
				(option.effect.type === 'reduce_damage' && option.effect.amount === 'pool');
			if (usesPoolDie && !option.cost?.pool) {
				issue(['cost', 'pool'], 'Spend a pool die to use its value');
			}
			if (option.effect.type === 'extra_damage' && !option.cost?.pool) {
				issue(['cost', 'pool'], 'Spend pool tokens to roll damage dice');
			}
			if (option.requires_outcome && option.timing !== 'after') {
				issue(['requires_outcome'], 'A success or failure is only known after the roll');
			}
			if (option.ends_effect && !option.requires_active_effect) {
				issue(['ends_effect'], 'Choose the effect this ends');
			}
			if (
				option.requires_active_effect &&
				!(feature.effects ?? []).some((effect) => effect.id === option.requires_active_effect)
			) {
				issue(['requires_active_effect'], 'Choose an effect on this feature');
			}
		});
	});
export type Feature = z.infer<typeof FeatureSchema>;

export const CountdownSchema = z.object({
	id: z.string(),
	name: z.string(),
	min: z.number().int().min(0),
	current: z.number().int().min(0),
	visibleToPlayers: z.boolean().optional()
});
export type Countdown = z.infer<typeof CountdownSchema>;

export const FearSchema = z.number().min(0).max(12);
export type Fear = z.infer<typeof FearSchema>;

export const Tier1LevelUpOptionIdSchema = z.literal('tier_1_domain_cards');
export type Tier1LevelUpOptionId = z.infer<typeof Tier1LevelUpOptionIdSchema>;

export const Tier2LevelUpOptionIdSchema = z.enum([
	'tier_2_domain_card',
	'tier_2_traits',
	'tier_2_experience_bonus',
	'tier_2_max_hp',
	'tier_2_max_stress',
	'tier_2_evasion'
]);
export type Tier2LevelUpOptionId = z.infer<typeof Tier2LevelUpOptionIdSchema>;

export const Tier3LevelUpOptionIdSchema = z.enum([
	'tier_3_domain_card',
	'tier_3_traits',
	'tier_3_experience_bonus',
	'tier_3_max_hp',
	'tier_3_max_stress',
	'tier_3_evasion',
	'tier_3_proficiency',
	'tier_3_subclass_upgrade',
	'tier_3_multiclass'
]);
export type Tier3LevelUpOptionId = z.infer<typeof Tier3LevelUpOptionIdSchema>;

export const Tier4LevelUpOptionIdSchema = z.enum([
	'tier_4_domain_card',
	'tier_4_traits',
	'tier_4_experience_bonus',
	'tier_4_max_hp',
	'tier_4_max_stress',
	'tier_4_evasion',
	'tier_4_proficiency',
	'tier_4_subclass_upgrade',
	'tier_4_multiclass'
]);
export type Tier4LevelUpOptionId = z.infer<typeof Tier4LevelUpOptionIdSchema>;

export const AllTierLevelUpOptionIdSchema = z.union([
	Tier1LevelUpOptionIdSchema,
	Tier2LevelUpOptionIdSchema,
	Tier3LevelUpOptionIdSchema,
	Tier4LevelUpOptionIdSchema
]);
export type AllTierLevelUpOptionId = z.infer<typeof AllTierLevelUpOptionIdSchema>;

export const LevelUpChoiceSchema = z.object({
	option_id: AllTierLevelUpOptionIdSchema.optional(),
	marked_traits: z
		.object({
			A: TraitIdSchema.optional(),
			B: TraitIdSchema.optional()
		})
		.optional(),
	selected_experiences: z.array(z.number().int()).optional(),
	selected_domain_card_id: DomainCardIdSchema.optional(),
	selected_subclass_upgrade: z.enum(['primary', 'secondary']).optional()
});
export type LevelUpChoice = z.infer<typeof LevelUpChoiceSchema>;

export const LevelUpDomainCardIdsSchema = z.record(
	z.number().int(),
	z.object({
		A: DomainCardIdSchema.optional(),
		B: DomainCardIdSchema.optional()
	})
);
export type LevelUpDomainCardIds = z.infer<typeof LevelUpDomainCardIdsSchema>;

export const LevelUpChoicesSchema = z.record(
	z.number().int(),
	z.object({
		A: LevelUpChoiceSchema.optional(),
		B: LevelUpChoiceSchema.optional()
	})
);
export type LevelUpChoices = z.infer<typeof LevelUpChoicesSchema>;

export const LevelUpOptionSchema = z.object({
	title: z.string(),
	short_title: z.string(),
	max: z.number(),
	costs_two_choices: z.boolean().optional(),
	character_modifiers: z.array(CharacterModifierSchema)
});
export type LevelUpOption = z.infer<typeof LevelUpOptionSchema>;

export const CompanionLevelUpOptionIdSchema = z.enum([
	'intelligent',
	'light-in-the-dark',
	'creature-comfort',
	'armored',
	'vicious',
	'resilient',
	'bonded',
	'aware'
]);
export type CompanionLevelUpOptionId = z.infer<typeof CompanionLevelUpOptionIdSchema>;

export const AdversaryTypeSchema = z.enum([
	'Bruiser',
	'Horde',
	'Leader',
	'Minion',
	'Ranged',
	'Skulk',
	'Social',
	'Solo',
	'Standard',
	'Support'
]);
export type AdversaryType = z.infer<typeof AdversaryTypeSchema>;

export const EnvironmentTypeSchema = z.enum(['Exploration', 'Social', 'Traversal', 'Event']);
export type EnvironmentType = z.infer<typeof EnvironmentTypeSchema>;

export const BaseCardSchema = z
	.object({
		features: z.array(FeatureSchema),
		options: z.array(CardOptionSchema).optional(),
		tokens_enabled: z.boolean().optional(),
		token_max: z.number().int().min(1).max(99).optional(),
		token_label: z.string().trim().min(1).optional()
	})
	.superRefine((card, ctx) => {
		const options = card.options ?? [];
		const choiceIds = new Set<string>();
		const selectionIdsByChoiceId = new Map<string, Set<string>>();

		// Build a same-card choice/selection lookup while checking for duplicate IDs.
		options.forEach((option, optionIndex) => {
			const choiceId = option.choice_id.trim();
			const normalizedChoiceId = choiceId.toLowerCase();

			if (choiceIds.has(normalizedChoiceId)) {
				ctx.addIssue({
					code: 'custom',
					message: 'Choice ID must be unique',
					path: ['options', optionIndex, 'choice_id']
				});
			}
			if (normalizedChoiceId !== '') choiceIds.add(normalizedChoiceId);

			if (option.type === 'arbitrary') {
				const selectionIds = new Set<string>();
				option.options.forEach((selection, selectionIndex) => {
					const normalizedSelectionId = selection.selection_id.trim().toLowerCase();
					if (selectionIds.has(normalizedSelectionId)) {
						ctx.addIssue({
							code: 'custom',
							message: 'Selection ID must be unique within this choice',
							path: ['options', optionIndex, 'options', selectionIndex, 'selection_id']
						});
					}
					if (normalizedSelectionId !== '') selectionIds.add(normalizedSelectionId);
				});
				selectionIdsByChoiceId.set(normalizedChoiceId, selectionIds);
			}
		});

		// Conditional choices may only point at another existing choice and selection on this card.
		options.forEach((option, optionIndex) => {
			const conditional = option.conditional_choice;
			if (!conditional) return;

			const ownChoiceId = option.choice_id.trim().toLowerCase();
			const targetChoiceId = conditional.choice_id.trim().toLowerCase();
			const targetSelectionId = conditional.selection_id.trim().toLowerCase();

			if (ownChoiceId === targetChoiceId) {
				ctx.addIssue({
					code: 'custom',
					message: 'Conditional choice cannot reference itself',
					path: ['options', optionIndex, 'conditional_choice', 'choice_id']
				});
			}

			const targetSelections = selectionIdsByChoiceId.get(targetChoiceId);
			if (!targetSelections) {
				ctx.addIssue({
					code: 'custom',
					message: 'Conditional choice must reference an existing choice on this card',
					path: ['options', optionIndex, 'conditional_choice', 'choice_id']
				});
				return;
			}

			if (!targetSelections.has(targetSelectionId)) {
				ctx.addIssue({
					code: 'custom',
					message: 'Conditional selection must reference an existing selection on this card',
					path: ['options', optionIndex, 'conditional_choice', 'selection_id']
				});
			}
		});
	});
export type BaseCard = z.infer<typeof BaseCardSchema>;

export type Card =
	| {
			type: 'ancestry_card';
			id: string;
			card: AncestryCard;
	  }
	| {
			type: 'community_card';
			id: string;
			card: CommunityCard;
	  }
	| {
			type: 'transformation';
			id: string;
			card: Transformation;
	  }
	| {
			type: 'domain_card';
			id: string;
			card: DomainCard;
	  }
	| {
			type: 'subclass_card';
			id: string;
			card: SubclassCard;
	  };
