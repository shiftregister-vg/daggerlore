import type { DomainCard } from '@domain/schemas/compendium';

export const BLADE_DOMAIN_CARDS = {
	get_back_up: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/get-back-up.webp',
		image_url: '',
		category: 'ability',
		title: 'Get Back Up',
		level_requirement: 1,
		recall_cost: 1,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					'When you take Severe damage, you can **mark a Stress** to reduce the severity by one threshold.',
				character_modifiers: []
			}
		]
	},
	whirlwind: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/whirlwind.webp',
		image_url: '',
		category: 'ability',
		title: 'Whrilwind',
		level_requirement: 1,
		recall_cost: 0,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					'When you make a successful attack agains a target within Very Close range, you can **spend a Hope** to use the attack against all other targets within Very Close range. All additional adversaries you succeed against with this ability take half damage.',
				character_modifiers: []
			}
		]
	},
	not_good_enough: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/not-good-enough.webp',
		image_url: '',
		category: 'ability',
		title: 'Not Good Enough',
		level_requirement: 1,
		recall_cost: 1,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html: 'When you roll your damage dice, you can reroll any 1s or 2s.',
				character_modifiers: []
			}
		]
	},
	reckless: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/reckless.webp',
		image_url: '',
		category: 'ability',
		title: 'Reckless',
		level_requirement: 2,
		recall_cost: 1,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html: '**Mark a Stress** to gain advantage on an attack.',
				character_modifiers: []
			}
		]
	},
	a_soldiers_bond: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/a-soldiers-bond.webp',
		image_url: '',
		category: 'ability',
		title: "A Soldier's Bond",
		level_requirement: 2,
		recall_cost: 1,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: true,
		token_max: 1,
		token_label: 'Used',
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					"Once per long rest, when you compliment someone or ask them about something they're good at, you can both gain 3 Hope.",
				character_modifiers: []
			}
		]
	},
	scramble: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/scramble.webp',
		image_url: '',
		category: 'ability',
		title: 'Scramble',
		level_requirement: 3,
		recall_cost: 1,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					'Once per rest, when a creature within Melee range would deal damage to you, you can avoid the attack and safely move out of Melee range of the enemy.',
				character_modifiers: []
			}
		]
	},
	versatile_fighter: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/versatile-fighter.webp',
		image_url: '',
		category: 'ability',
		title: 'Versatile Fighter',
		level_requirement: 3,
		recall_cost: 1,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					'You can use a different character trait for an equipped weapon, rather than the trait the weapon calls for. When you deal damage, you can **mark a Stress** to use the maximum result of one of your damage dice instead of rolling it.',
				character_modifiers: []
			}
		]
	},
	deadly_focus: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/deadly-focus.webp',
		image_url: '',
		category: 'ability',
		title: 'Deadly Focus',
		level_requirement: 4,
		recall_cost: 2,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					'Once per rest, you can apply all your focus toward a target of your choice. Until you attack another creature, you defeat the target, or the battle ends, gain a +1 bonus to your Proficiency.',
				character_modifiers: []
			}
		]
	},
	fortified_armor: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/fortified-armor.webp',
		image_url: '',
		category: 'ability',
		title: 'Fortified Armor',
		level_requirement: 4,
		recall_cost: 0,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html: 'While you are wearing armor, gain a +2 bonus to your damage thresholds.',
				character_modifiers: [
					{
						behaviour: 'bonus',
						target: 'major_damage_threshold',
						type: 'flat',
						value: 2,
						character_conditions: [
							{
								type: 'armor_equipped',
								value: true
							},
							{
								type: 'level',
								min_level: 4,
								max_level: 10
							}
						]
					},
					{
						behaviour: 'bonus',
						target: 'severe_damage_threshold',
						type: 'flat',
						value: 2,
						character_conditions: [
							{
								type: 'armor_equipped',
								value: true
							},
							{
								type: 'level',
								min_level: 4,
								max_level: 10
							}
						]
					}
				]
			}
		]
	},
	champions_edge: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/champions-edge.webp',
		image_url: '',
		category: 'ability',
		title: "Champion's Edge",
		level_requirement: 5,
		recall_cost: 1,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html: `When you critically succeed on an attack, you can **spend up to 3 Hope** and choose one of the following options for each Hope spent:

- You clear a Hit Point.
- You clear an Armor Slot.
- The target must mark an additional Hit Point.

You can't choose the same option more than once.`,
				character_modifiers: []
			}
		]
	},
	vitality: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/vitality.webp',
		image_url: '',
		category: 'ability',
		title: 'Vitality',
		level_requirement: 5,
		recall_cost: 0,
		applies_in_vault: true,
		forced_in_loadout: false,
		forced_in_vault: true,
		options: [
			{
				choice_id: 'choose_two',
				type: 'arbitrary',
				max: 2,
				conditional_choice: null,
				options: [
					{
						selection_id: 'stress_slot',
						title: '+1 Stress slot',
						short_title: '+1 Stress'
					},
					{
						selection_id: 'hp_slot',
						title: '+1 Hit Point slot',
						short_title: '+1 HP'
					},
					{
						selection_id: 'damage_thresholds',
						title: '+2 bonus to your damage thresholds',
						short_title: '+2 to thresholds'
					}
				]
			}
		],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html: `When you choose this card, permanently gain two of the following benefits:

- One Stress slot
- One Hit Point slot
- +2 bonus to your damage thresholds

Then place this card in your vault permanently.`,
				character_modifiers: [
					{
						behaviour: 'bonus',
						target: 'max_stress',
						type: 'flat',
						value: 1,
						character_conditions: [
							{
								type: 'card_choice',
								card_id: 'vitality',
								choice_id: 'choose_two',
								selection_id: 'stress_slot'
							}
						]
					},
					{
						behaviour: 'bonus',
						target: 'max_hp',
						type: 'flat',
						value: 1,
						character_conditions: [
							{
								type: 'card_choice',
								card_id: 'vitality',
								choice_id: 'choose_two',
								selection_id: 'hp_slot'
							}
						]
					},
					{
						behaviour: 'bonus',
						target: 'major_damage_threshold',
						type: 'flat',
						value: 2,
						character_conditions: [
							{
								type: 'card_choice',
								card_id: 'vitality',
								choice_id: 'choose_two',
								selection_id: 'damage_thresholds'
							}
						]
					},
					{
						behaviour: 'bonus',
						target: 'severe_damage_threshold',
						type: 'flat',
						value: 2,
						character_conditions: [
							{
								type: 'card_choice',
								card_id: 'vitality',
								choice_id: 'choose_two',
								selection_id: 'damage_thresholds'
							}
						]
					}
				]
			}
		]
	},
	battle_hardened: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/battle-hardened.webp',
		image_url: '',
		category: 'ability',
		title: 'Battle-Hardened',
		level_requirement: 6,
		recall_cost: 2,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					'Once per long rest when you would make a Death Move, you can **spend a Hope** to clear a Hit Point instead.',
				character_modifiers: []
			}
		]
	},
	rage_up: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/rage-up.webp',
		image_url: '',
		category: 'ability',
		title: 'Rage Up',
		level_requirement: 6,
		recall_cost: 1,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					'Before you make an attack, you can **mark a Stress** to gain a bonus to your damage roll equal to twice your Strength.\n\nYou can Rage Up twice per attack.',
				character_modifiers: []
			}
		]
	},
	blade_touched: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/blade-touched.webp',
		image_url: '',
		category: 'ability',
		title: 'Blade-Touched',
		level_requirement: 7,
		recall_cost: 1,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,

		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [
					{
						behaviour: 'bonus',
						target_weapon: 'all',
						target_stat: 'attack_roll',
						type: 'flat',
						value: 2,
						character_conditions: [
							{
								type: 'min_loadout_cards_from_domain',
								domain_id: 'blade',
								min_cards: 4
							}
						],
						weapon_conditions: []
					}
				],
				title: '',
				description_html: `When 4 or more of the domain cards in your loadout are from the Blade domain, gain the following benefits:

- +2 bonus to your attack rolls
- +4 bonus to your Severe damage threshold`,
				character_modifiers: [
					{
						behaviour: 'bonus',
						target: 'severe_damage_threshold',
						type: 'flat',
						value: 4,
						character_conditions: [
							{
								type: 'min_loadout_cards_from_domain',
								domain_id: 'blade',
								min_cards: 4
							}
						]
					}
				]
			}
		]
	},
	glancing_blow: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/glancing-blow.webp',
		image_url: '',
		category: 'ability',
		title: 'Glancing Blow',
		level_requirement: 7,
		recall_cost: 1,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					'When you fail an attack, you can **mark a Stress** to deal weapon damage using half your Proficiency.',
				character_modifiers: []
			}
		]
	},
	battle_cry: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/battle-cry.webp',
		image_url: '',
		category: 'ability',
		title: 'Battle Cry',
		level_requirement: 8,
		recall_cost: 2,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					"Once per long rest, while you're charging into danger, you can muster a rousing call that inspires your allies. All allies who can hear you each clear a Stress and gain a Hope. Additionally, your allies gain advantage on attack rolls until you or an ally rolls a failure with Fear.",
				character_modifiers: []
			}
		]
	},
	frenzy: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/frenzy.webp',
		image_url: '',
		category: 'ability',
		title: 'Frenzy',
		level_requirement: 8,
		recall_cost: 3,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					"Once per long rest, you can go into a *Frenzy* until there are no more adversaries within sight.\n\nWhile *Frenzied*, you can't use Armor Slots, and you gain a +10 bonus to your damage rolls and a +8 bonus to your Severe damage threshold.",
				character_modifiers: []
			}
		]
	},
	gore_and_glory: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/gore-and-glory.webp',
		image_url: '',
		category: 'ability',
		title: 'Gore and Glory',
		level_requirement: 9,
		recall_cost: 2,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					'When you critically succeed on a weapon attack, gain an additional Hope or clear an additional Stress. Additionally, when you deal enough damage to defeat an enemy, gain a Hope or clear a Stress.',
				character_modifiers: []
			}
		]
	},
	reapers_strike: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/reapers-strike.webp',
		image_url: '',
		category: 'ability',
		title: "Reaper's Strike",
		level_requirement: 9,
		recall_cost: 3,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					'Once per long rest, **spend a Hope** to make an attack roll. The GM tells you which targets within range it would succeed against. Choose one of these targets and force them to mark 5 Hit Points.',
				character_modifiers: []
			}
		]
	},
	battle_monster: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/battle-monster.webp',
		image_url: '',
		category: 'ability',
		title: 'Battle Monster',
		level_requirement: 10,
		recall_cost: 0,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					'When you make a successful attack against an adversary, you can **mark 4 Stress** to force the target to mark a number of Hit Points equal to the number of Hit Points you currently have marked instead of rolling for damage.',
				character_modifiers: []
			}
		]
	},
	onslaught: {
		source_key: 'SRD',
		domain_id: 'blade',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/blade/onslaught.webp',
		image_url: '',
		category: 'ability',
		title: 'Onslaught',
		level_requirement: 10,
		recall_cost: 3,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html:
					"When you successfully make an attack with your weapon, you never deal damage beneath a target's Major damage threshold (the target always marks a minimum of 2 Hit Points).\n\nAdditionally, when a creature within your weapon's range deals damage to an ally with an attack that doesn't include you, you can **mark a Stress** to force them to make a Reaction Roll (15). On a failure, the target must mark a Hit Point.",
				character_modifiers: []
			}
		]
	}
} as const satisfies Record<string, DomainCard>;
