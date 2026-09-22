import type { Character } from '../schemas/characters';
import type {
	Adversary,
	AncestryCard,
	Armor,
	Beastform,
	CharacterClass,
	CommunityCard,
	Consumable,
	Domain,
	DomainCard,
	Environment,
	Loot,
	Subclass,
	Transformation,
	PrimaryWeapon,
	SecondaryWeapon
} from '../schemas/compendium';
import type { Encounter } from '../schemas/encounters';
import type { AdversaryType, Feature } from '../schemas/rules';

export const CHARACTER_DEFAULTS: Character = {
	// core
	name: 'New Character',
	image_url: '',
	artist_name: '',
	sheet_appearance: {
		background_id: 'mountains'
	},
	settings: {
		void_enabled: false,
		use_gold_coins: false,
		homebrew_enabled: false,
		show_campaign_info: true
	},
	level: 1,
	experiences: ['', ''],
	official_source_versions: {},
	official_item_versions: {},
	compendium_update_muted_until: undefined,

	// derived descriptors
	derived_descriptors: {
		ancestry_name: '',
		community_name: '',
		primary_class_name: '',
		primary_subclass_name: '',
		secondary_class_name: '',
		secondary_subclass_name: '',
		max_hp: 0,
		max_stress: 6,
		max_hope: 6,
		evasion: 0,
		max_armor: 0,
		damage_thresholds: { major: 0, severe: 0 },
		primary_class_banner: undefined,
		secondary_class_banner: undefined
	},

	// campaign
	//! === COMPATABILITY ===
	/*
	 * Related git commit: 9653f7785d9d04738183743bb00d2ffeb31b4607
	 * DATE: 2026-05-06T08:49:54-04:00
	 * REASON: Older character payloads include nested campaign_id even though membership now belongs on the character document.
	 * REPLACE WITH:
	 * Remove this default field.
	 */
	campaign_id: undefined,
	//! === END ===

	// heritage
	ancestry_card_id: undefined,
	community_card_id: undefined,
	transformation_card_id: undefined,
	active_transformation_card_id: undefined,

	// classes
	primary_class_id: undefined,
	primary_subclass_id: undefined,
	secondary_class_id: undefined,
	secondary_class_domain_id: undefined,
	secondary_subclass_id: undefined,

	// beastform
	chosen_beastform: undefined,
	companion: undefined,

	// notes / descriptions
	background_questions: [],
	connection_questions: [],
	transformation_questions: [],
	character_descriptions: {
		clothes: '',
		eyes: '',
		body: '',
		skin: '',
		attitude: ''
	},
	notes: '',
	long_term_projects: [],

	// equipment
	active_armor_inventory_id: undefined,
	active_primary_weapon_inventory_id: undefined,
	active_secondary_weapon_inventory_id: undefined,
	inventory: {
		primary_weapons: [],
		secondary_weapons: [],
		armor: [],
		loot: [],
		consumables: [],
		adventuring_gear: [],
		gold_coins: 0
	},

	// the void / other
	conditions: [],
	additional_domain_card_ids: [],
	subclass_level_up_choices: {},
	sheet_addon_choices: {},
	sheet_addon_resources: {},
	additional_ancestry_card_ids: [],
	additional_community_card_ids: [],
	additional_transformation_card_ids: [],

	// ephemeral stats set by the player
	card_choices: {},
	card_tokens: {},
	card_fields: {},
	card_layout: undefined,
	mixed_ancestry_choices: {},
	feature_choices: {},
	unarmed_attack_choices: {},
	selected_traits: {},
	scars: 0,
	death_state: undefined,
	marked_hp: 0,
	marked_stress: 0,
	marked_hope: 2,
	marked_armor: 0,
	loadout_domain_card_ids: [],
	bonus_max_loadout: 0,

	// Level up choices
	level_up_domain_card_ids: {
		1: {},
		2: {},
		3: {},
		4: {},
		5: {},
		6: {},
		7: {},
		8: {},
		9: {},
		10: {}
	},
	level_up_choices: {
		2: {},
		3: {},
		4: {},
		5: {},
		6: {},
		7: {},
		8: {},
		9: {},
		10: {}
	}
};

export const BLANK_ENCOUNTER: Encounter = {
	name: '',
	description_html: '',
	condition_list: [],
	enable_massive_damage: false,
	items: [],
	number_of_players: 4,
	extra_battle_points: 0,
	bonus_damage: false,
	encounter_tier: 1
};

export const ADVERSARY_TYPE_BATTLE_POINTS_MAP: Record<AdversaryType, number> = {
	Minion: 1,
	Social: 1,
	Support: 1,
	Horde: 2,
	Ranged: 2,
	Skulk: 2,
	Standard: 2,
	Leader: 3,
	Bruiser: 4,
	Solo: 5
};

const DEFAULT_FEATURE: Feature = {
	title: '',
	description_html: '',
	character_modifiers: [],
	weapon_modifiers: []
};

export const COMPENDIUM_DEFAULTS = {
	classes: {
		source_key: 'Homebrew',
		title: '',
		image_url: '',
		artist_name: '',
		description_html: '',
		starting_evasion: 0,
		starting_max_hp: 0,
		spellcast_trait: undefined,
		hope_feature: DEFAULT_FEATURE,
		primary_domain_id: undefined,
		secondary_domain_id: undefined,
		class_features: [],
		subclass_ids: [],
		suggested_traits: {
			agility: 0,
			strength: 0,
			finesse: 0,
			instinct: 0,
			presence: 0,
			knowledge: 0
		},
		suggested_primary_weapon_id: undefined,
		suggested_secondary_weapon_id: undefined,
		suggested_armor_id: undefined,
		starting_inventory: {
			gold_coins: 0,
			free_gear: [],
			loot_or_consumable_options: [],
			class_gear_options: [],
			spellbook_prompt: undefined
		},
		background_questions: [],
		connection_questions: [],
		character_description_suggestions: {
			clothes: '',
			eyes: '',
			body: '',
			skin: '',
			attitude: ''
		}
	} satisfies CharacterClass,
	subclasses: {
		source_key: 'Homebrew',
		class_id: undefined,
		title: '',
		description_html: '',
		image_url: '',
		artist_name: '',
		spellcast_trait: undefined,
		suggested_traits: undefined,
		suggested_primary_weapon_id: undefined,
		suggested_secondary_weapon_id: undefined,
		suggested_armor_id: undefined,
		sheet_addon_ids: [],
		foundation_card: {
			options: [],
			features: [],
			tokens_enabled: false,
			level_up_options: []
		},
		specialization_card: {
			options: [],
			features: [],
			tokens_enabled: false,
			level_up_options: []
		},
		mastery_card: {
			options: [],
			features: [],
			tokens_enabled: false,
			level_up_options: []
		}
	} satisfies Subclass,
	domains: {
		source_key: 'Homebrew',
		title: '',
		description_html: '',
		color: '#000000',
		foreground_color: '#ffffff',
		image_url: '',
		artist_name: ''
	} satisfies Domain,
	domain_cards: {
		source_key: 'Homebrew',
		domain_id: undefined,
		image_url: '',
		title: '',
		artist_name: '',
		features: [],
		level_requirement: 1,
		recall_cost: 0,
		category: 'ability',
		options: [],
		tokens_enabled: false,
		applies_in_vault: true,
		forced_in_loadout: false,
		forced_in_vault: false
	} satisfies DomainCard,
	primary_weapons: {
		source_key: 'Homebrew',
		title: '',
		description_html: '',
		level_requirement: 1,
		type: 'Physical',
		available_traits: ['agility'],
		range: 'Melee',
		features: [],
		attack_roll_bonus: 0,
		damage_bonus: 0,
		damage_dice: '1d6',
		available_damage_types: ['phy'],
		burden: 1
	} satisfies PrimaryWeapon,
	secondary_weapons: {
		source_key: 'Homebrew',
		title: '',
		description_html: '',
		level_requirement: 1,
		type: 'Physical',
		available_traits: ['agility'],
		range: 'Melee',
		features: [],
		attack_roll_bonus: 0,
		damage_bonus: 0,
		damage_dice: '1d6',
		available_damage_types: ['phy'],
		burden: 1
	} satisfies SecondaryWeapon,
	armor: {
		source_key: 'Homebrew',
		level_requirement: 1,
		title: '',
		description_html: '',
		max_armor: 0,
		damage_thresholds: {
			major: 0,
			severe: 0
		},
		features: []
	} satisfies Armor,
	loot: {
		source_key: 'Homebrew',
		rarity_roll: 1,
		title: '',
		description_html: '',
		character_modifiers: [],
		weapon_modifiers: []
	} satisfies Loot,
	consumables: {
		source_key: 'Homebrew',
		rarity_roll: 1,
		title: '',
		description_html: ''
	} satisfies Consumable,
	ancestry_cards: {
		source_key: 'Homebrew',
		image_url: '',
		title: '',
		description_html: '',
		artist_name: '',
		features: [],
		options: [],
		tokens_enabled: undefined
	} satisfies AncestryCard,
	community_cards: {
		source_key: 'Homebrew',
		image_url: '',
		title: '',
		description_html: '',
		tokens_enabled: undefined,
		artist_name: '',
		features: [],
		options: []
	} satisfies CommunityCard,
	transformations: {
		source_key: 'Homebrew',
		title: '',
		description_html: '',
		features: [],
		questions: []
	} satisfies Transformation,
	beastforms: {
		source_key: 'Homebrew',
		level_requirement: 1,
		title: '',
		category: '',
		character_trait: {
			trait: 'agility',
			bonus: 0
		},
		attack: {
			range: 'Melee',
			trait: 'agility',
			damage_dice: '1d6',
			damage_bonus: 0,
			damage_type: 'phy'
		},
		advantages: [],
		evasion_bonus: 0,
		features: [],
		special_case: undefined
	} satisfies Beastform,
	adversaries: {
		source_key: 'Homebrew',
		title: '',
		tier: 1,
		type: 'Standard',
		image_url: '',
		artist_name: '',
		description: '',
		motives_tactics: '',
		difficulty: 1,
		thresholds: {
			major: 0,
			severe: 0
		},
		max_hp: 0,
		max_stress: 0,
		attack_modifier: 0,
		standard_attack: {
			name: '',
			range: 'Melee',
			damage_dice: '1d6',
			damage_bonus: 0,
			damage_type: 'phy'
		},
		experiences: [],
		experience_modifiers: [],
		features: []
	} satisfies Adversary,
	environments: {
		source_key: 'Homebrew',
		title: '',
		description: '',
		tier: 1,
		image_url: '',
		artist_name: '',
		type: 'Event',
		impulses: '',
		relative_strength: false,
		difficulty: 1,
		potential_adversaries: '',
		potential_adversaries_ids: [],
		features: []
	} satisfies Environment
} as const;
