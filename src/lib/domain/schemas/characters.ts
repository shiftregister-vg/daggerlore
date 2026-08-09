import { z } from 'zod';
import { zid } from '../ids';
import {
	BurdenSchema,
	CardChoicesSchema,
	DamageThresholdsSchema,
	DamageTypeSchema,
	DomainCardIdSchema,
	LevelUpChoicesSchema,
	LevelUpDomainCardIdsSchema,
	RangeSchema,
	SourceKeySchema,
	TraitsSchema
} from './rules';
import { AdventuringGearSchema, CompendiumContentIdsSchema } from './compendium';

export const OfficialSourceVersionsSchema = z.record(SourceKeySchema, z.number().int().min(1));
export type OfficialSourceVersions = z.infer<typeof OfficialSourceVersionsSchema>;
export const OfficialItemVersionsSchema = z.record(z.string(), z.number().int().min(1));
export type OfficialItemVersions = z.infer<typeof OfficialItemVersionsSchema>;

// ============================================================================
// Inventory Items
// ============================================================================

export const PrimaryWeaponInventoryItemSchema = z.object({
	inventory_id: z.string(),
	base_primary_weapon_id: z.string(),
	choices: z.record(z.string(), z.array(z.string())),
	custom_title: z.string().optional(),
	custom_level_requirement: z.number().int().min(0).max(10).optional(),
	custom_range: RangeSchema.optional(),
	custom_available_damage_types: z.array(DamageTypeSchema).optional(),
	custom_burden: BurdenSchema.optional(),
	custom_damage_bonus: z.number().int().optional(),
	custom_damage_dice: z.string().optional(),
	custom_attack_roll_bonus: z.number().int().optional()
});
export type PrimaryWeaponInventoryItem = z.infer<typeof PrimaryWeaponInventoryItemSchema>;

export const SecondaryWeaponInventoryItemSchema = z.object({
	inventory_id: z.string(),
	base_secondary_weapon_id: z.string(),
	choices: z.record(z.string(), z.array(z.string())),
	custom_title: z.string().optional(),
	custom_level_requirement: z.number().int().min(0).max(10).optional(),
	custom_range: RangeSchema.optional(),
	custom_available_damage_types: z.array(DamageTypeSchema).optional(),
	custom_burden: BurdenSchema.optional(),
	custom_damage_bonus: z.number().int().optional(),
	custom_damage_dice: z.string().optional(),
	custom_attack_roll_bonus: z.number().int().optional()
});
export type SecondaryWeaponInventoryItem = z.infer<typeof SecondaryWeaponInventoryItemSchema>;

export const ArmorInventoryItemSchema = z.object({
	inventory_id: z.string(),
	base_armor_id: z.string(),
	choices: z.record(z.string(), z.array(z.string())),
	custom_title: z.string().optional(),
	custom_level_requirement: z.number().int().min(0).max(10).optional(),
	custom_max_armor: z.number().int().min(0).optional(),
	custom_damage_thresholds: z
		.object({
			major: z.number().int().optional(),
			severe: z.number().int().optional()
		})
		.optional()
});
export type ArmorInventoryItem = z.infer<typeof ArmorInventoryItemSchema>;

export const ConsumableInventoryItemSchema = z.object({
	inventory_id: z.string(),
	base_consumable_id: z.string(),
	choices: z.record(z.string(), z.array(z.string())),
	quantity: z.number().int().min(1).default(1),
	custom_title: z.string().optional(),
	custom_description: z.string().optional()
});
export type ConsumableInventoryItem = z.infer<typeof ConsumableInventoryItemSchema>;

export const LootInventoryItemSchema = z.object({
	inventory_id: z.string(),
	base_loot_id: z.string(),
	choices: z.record(z.string(), z.array(z.string())),
	custom_title: z.string().optional(),
	custom_description: z.string().optional()
});
export type LootInventoryItem = z.infer<typeof LootInventoryItemSchema>;

export const AdventuringGearInventoryItemSchema = z.union([
	AdventuringGearSchema,
	z.object({
		title: z.string().trim().min(1),
		quantity: z.number().int().min(1).default(1)
	})
]);
export type AdventuringGearInventoryItem = z.infer<typeof AdventuringGearInventoryItemSchema>;

export const InventorySchema = z.object({
	primary_weapons: z.array(PrimaryWeaponInventoryItemSchema),
	secondary_weapons: z.array(SecondaryWeaponInventoryItemSchema),
	armor: z.array(ArmorInventoryItemSchema),
	loot: z.array(LootInventoryItemSchema),
	consumables: z.array(ConsumableInventoryItemSchema),
	adventuring_gear: z.array(AdventuringGearInventoryItemSchema),
	gold_coins: z.number().int().min(0)
});
export type Inventory = z.infer<typeof InventorySchema>;

// ============================================================================
// Companion
// ============================================================================

export const CompanionSchema = z.object({
	name: z.string(),
	image_url: z.string(),
	attack: z
		.object({
			name: z.string(),
			range: RangeSchema,
			damage_dice: z.string(),
			damage_bonus: z.number().int(),
			damage_type: DamageTypeSchema
		})
		.optional(),
	max_stress: z.number().int().min(0),
	marked_stress: z.number().int().min(0),
	max_hope: z.number().int().min(0),
	marked_hope: z.number().int().min(0),
	evasion: z.number().int().min(0),
	level_up_choices: z.array(z.string()),
	experiences: z.array(z.string()),
	experience_modifiers: z.array(z.number().int()),
	choices: z.record(z.string(), z.array(z.string()))
});
export type Companion = z.infer<typeof CompanionSchema>;

export const CharacterClassBannerDomainSchema = z.object({
	title: z.string(),
	color: z.string(),
	foreground_color: z.string(),
	image_url: z.string()
});
export type CharacterClassBannerDomain = z.infer<typeof CharacterClassBannerDomainSchema>;

export const CharacterClassBannerSchema = z.object({
	primary_domain: CharacterClassBannerDomainSchema.optional(),
	secondary_domain: CharacterClassBannerDomainSchema.optional()
});
export type CharacterClassBanner = z.infer<typeof CharacterClassBannerSchema>;

export const DeathMoveIdSchema = z.enum(['blaze_of_glory', 'avoid_death', 'risk_it_all']);
export type DeathMoveId = z.infer<typeof DeathMoveIdSchema>;

export const DeathStateSchema = z.object({
	is_dead: z.literal(true),
	death_move: DeathMoveIdSchema
});
export type DeathState = z.infer<typeof DeathStateSchema>;

export const ConditionSchema = z.object({
	name: z.string().trim(),
	enabled: z.boolean()
});
export type Condition = z.infer<typeof ConditionSchema>;

const CharacterQuestionAnswerSchema = z.object({
	question: z.string(),
	answer: z.string()
});

export const CharacterCardLayoutSchema = z.object({
	version: z.literal(1),
	loose_card_keys: z.array(z.string().trim().min(1)),
	tabletop_order: z.array(z.string().trim().min(1)).optional(),
	view_mode: z.enum(['cards', 'summary']).optional()
});
export type CharacterCardLayout = z.infer<typeof CharacterCardLayoutSchema>;

// ============================================================================
// Character Schema (full character model)
// ============================================================================

export const CharacterSchema = z.object({
	// core
	name: z.string(),
	image_url: z.string(),
	artist_name: z.string(),
	sheet_appearance: z
		.object({
			theme_id: z.string().optional(),
			background_id: z.string().optional(),
			text_size: z.enum(['normal', 'large', 'extra_large']).optional()
		})
		.optional(),
	settings: z.object({
		void_enabled: z.boolean(),
		use_gold_coins: z.boolean(),
		homebrew_enabled: z.boolean(),
		show_campaign_info: z.boolean(),
		enabled_source_keys: z.array(SourceKeySchema).optional(),
		massive_damage: z.boolean().optional()
	}),
	level: z.number().int().min(1).max(10),
	experiences: z.array(z.string()),
	official_source_versions: OfficialSourceVersionsSchema.optional(),
	official_item_versions: OfficialItemVersionsSchema.optional(),
	compendium_update_muted_until: z.string().optional(),

	// derived descriptors
	derived_descriptors: z.object({
		ancestry_name: z.string(),
		community_name: z.string(),
		primary_class_name: z.string(),
		primary_subclass_name: z.string(),
		secondary_class_name: z.string(),
		secondary_subclass_name: z.string(),
		max_hp: z.number().int().min(0),
		max_stress: z.number().int().min(0),
		max_hope: z.number().int().min(0),
		evasion: z.number().int().min(0),
		max_armor: z.number().int().min(0),
		damage_thresholds: DamageThresholdsSchema,
		primary_class_banner: CharacterClassBannerSchema.optional(),
		secondary_class_banner: CharacterClassBannerSchema.optional()
	}),

	// campaign
	//! === COMPATABILITY ===
	/*
	 * COMMIT: 9653f7785d9d04738183743bb00d2ffeb31b4607
	 * DATE: 2026-05-06T08:49:54-04:00
	 * REASON: Older character payloads include nested campaign_id even though membership now belongs on the character document.
	 * REPLACE WITH:
	 * Remove this schema field.
	 */
	campaign_id: zid('campaigns').optional(),
	//! === END ===

	// heritage
	ancestry_card_id: z.string().optional(),
	community_card_id: z.string().optional(),
	transformation_card_id: z.string().optional(),

	// classes
	primary_class_id: z.string().optional(),
	primary_subclass_id: z.string().optional(),
	secondary_class_id: z.string().optional(),
	secondary_class_domain_id: z.string().optional(),
	secondary_subclass_id: z.string().optional(),

	// beastform / companion
	chosen_beastform: z
		.object({
			beastform_id: z.string(),
			apply_beastform_bonuses: z.boolean(),
			choices: z.record(z.string(), z.array(z.string())),
			custom_title: z.string().optional(),
			custom_level_requirement: z.number().min(0).max(10).optional()
		})
		.optional(),
	companion: CompanionSchema.optional(),

	// notes / descriptions
	background_questions: z.array(CharacterQuestionAnswerSchema),
	connection_questions: z.array(CharacterQuestionAnswerSchema),
	transformation_questions: z.array(CharacterQuestionAnswerSchema).optional(),
	character_descriptions: z.object({
		clothes: z.string(),
		eyes: z.string(),
		body: z.string(),
		skin: z.string(),
		attitude: z.string()
	}),
	notes: z.string(),

	// equipment
	active_armor_inventory_id: z.string().optional(),
	active_primary_weapon_inventory_id: z.string().optional(),
	active_secondary_weapon_inventory_id: z.string().optional(),
	inventory: InventorySchema,

	// the void / other
	conditions: z.array(ConditionSchema).optional(),
	additional_domain_card_ids: z.array(DomainCardIdSchema),
	additional_ancestry_card_ids: z.array(z.string()),
	additional_community_card_ids: z.array(z.string()),
	additional_transformation_card_ids: z.array(z.string()),

	// ephemeral stats
	subclass_level_up_choices: z.record(z.string(), z.array(z.string())).optional(),
	sheet_addon_choices: z.record(z.string(), z.array(z.string())).optional(),
	sheet_addon_resources: z.record(z.string(), z.number().int().min(0)).optional(),
	card_choices: z.record(z.string(), CardChoicesSchema), // only for cards (inventory and other compendium choices are stored elsewhere)
	card_tokens: z.record(z.string(), z.number().int().min(0)),
	card_layout: CharacterCardLayoutSchema.optional(),
	feature_choices: z.record(z.string(), z.array(z.string())), // used by specific feature flags
	unarmed_attack_choices: z.record(z.string(), z.array(z.string())),
	mixed_ancestry_choices: z.record(
		z.string(),
		z.object({
			top_ancestry_id: z.string().optional(),
			bottom_ancestry_id: z.string().optional()
		})
	),

	selected_traits: TraitsSchema,
	marked_hp: z.number().int().min(0),
	marked_stress: z.number().int().min(0),
	marked_hope: z.number().int().min(0),
	marked_armor: z.number().int().min(0),
	scars: z.number().int().min(0),
	death_state: DeathStateSchema.optional(),
	loadout_domain_card_ids: z.array(DomainCardIdSchema),
	bonus_max_loadout: z.number().int(),

	// level up
	level_up_domain_card_ids: LevelUpDomainCardIdsSchema,
	level_up_choices: LevelUpChoicesSchema
});
export type Character = z.infer<typeof CharacterSchema>;

export const CharacterCompendiumScopeSchema = z.object({
	source_keys: z.array(SourceKeySchema),
	source_versions: OfficialSourceVersionsSchema,
	latest_source_versions: OfficialSourceVersionsSchema,
	official_item_versions: OfficialItemVersionsSchema,
	campaign_source_keys: z.array(SourceKeySchema).optional(),
	homebrew_vault: CompendiumContentIdsSchema,
	campaign_id: zid('campaigns').nullable(),
	campaign_vault: CompendiumContentIdsSchema
});
export type CharacterCompendiumScope = z.infer<typeof CharacterCompendiumScopeSchema>;
