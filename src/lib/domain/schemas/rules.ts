import { z } from 'zod';
import type {
	AncestryCard,
	CommunityCard,
	DomainCard,
	SubclassCard,
	Transformation
} from './compendium';
import type { TableNames } from '../ids';

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

export const FeatureSchema = z.object({
	title: z.string(),
	description_html: z.string(),
	character_modifiers: z.array(CharacterModifierSchema),
	weapon_modifiers: z.array(WeaponModifierSchema),
	tokens_enabled: z.boolean().optional(),
	token_max: z.number().int().min(0).optional()
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
