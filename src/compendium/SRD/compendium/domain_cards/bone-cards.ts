import type { DomainCard } from '@domain/schemas/compendium';

export const BONE_DOMAIN_CARDS = {
	untouchable: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/untouchable.webp',
		image_url: '',
		category: 'ability',
		title: 'Untouchable',
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
				description_html: 'Gain a bonus to your Evasion equal to half your Agility.',
				character_modifiers: [
					{
						behaviour: 'bonus',
						target: 'evasion',
						type: 'derived_from_trait',
						trait: 'agility',
						multiplier: 0.5,
						character_conditions: [
							{
								type: 'level',
								min_level: 1,
								max_level: 10
							}
						]
					}
				]
			}
		]
	},
	deft_maneuvers: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/deft-maneuvers.webp',
		image_url: '',
		category: 'ability',
		title: 'Deft Maneuvers',
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
					'Once per rest, **mark a Stress** to sprint anywhere within Far range without making an Agility Roll to get there. If you end this movement within Melee range of an adversary and immediately make an attack against them, gain a +1 bonus to the attack roll.',
				character_modifiers: []
			}
		]
	},
	i_see_it_coming: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/i-see-it-coming.webp',
		image_url: '',
		category: 'ability',
		title: 'I See It Coming',
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
					"When you're targeted by an attack made from beyond Melee range, you can **mark a Stress** to roll a **d4** and gain a bonus to your Evasion equal to the result against the attack.",
				character_modifiers: []
			}
		]
	},
	ferocity: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/ferocity.webp',
		image_url: '',
		category: 'ability',
		title: 'Ferocity',
		level_requirement: 2,
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
					'When you cause an adversary to mark 1 or more Hit Points, you can **spend 2 Hope** to increase your Evasion by the number of Hit Points they marked. This bonus lasts until after the next attack made against you.',
				character_modifiers: []
			}
		]
	},
	strategic_approach: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/strategic-approach.webp',
		image_url: '',
		category: 'ability',
		title: 'Strategic Approach',
		level_requirement: 2,
		recall_cost: 1,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: true,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html: `After a long rest, place a number of tokens equal to your Knowledge on this card (minimum 1). The first time you move within Close range of an adversary and make an attack against them, you can spend one token to choose one of the following options:

- You make the attack with advantage.
- You clear a Stress on an ally within Melee range of the adversary.
- You add a **d8** to your damage roll.

When you take a long rest, clear all unspent tokens.`,
				character_modifiers: []
			}
		]
	},
	brace: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/brace.webp',
		image_url: '',
		category: 'ability',
		title: 'Brace',
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
					'When you mark an Armor Slot to reduce incoming damage, you can **mark a Stress** to mark an additional Armor Slot.',
				character_modifiers: []
			}
		]
	},
	tactician: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/tactician.webp',
		image_url: '',
		category: 'ability',
		title: 'Tactician',
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
					'When you Help an Ally, they can spend a Hope to add one of your Experiences to their roll alongside your advantage die.\n\nWhen making a Tag Team Roll, you can roll a **d20** as your Hope Die.',
				character_modifiers: []
			}
		]
	},
	boost: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/boost.webp',
		image_url: '',
		category: 'ability',
		title: 'Boost',
		level_requirement: 4,
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
					'**Mark a Stress** to boost off a willing ally within Close range, fling yourself into the air, and perform an aerial attack against a target within Far range. You have advantage on the attack, add a **d10** to the damage roll, and end your move within Melee range of the target.',
				character_modifiers: []
			}
		]
	},
	redirect: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/redirect.webp',
		image_url: '',
		category: 'ability',
		title: 'Redirect',
		level_requirement: 4,
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
					'When an attack made against you from beyond Melee range fails, roll a number of **d6s** equal to your Proficiency. If any roll a 6, you can **mark a Stress** to redirect the attack to damage an adversary within Very Close range instead.',
				character_modifiers: []
			}
		]
	},
	know_thy_enemy: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/know-thy-enemy.webp',
		image_url: '',
		category: 'ability',
		title: 'Know Thy Enemy',
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
				description_html: `When observing a creature, you can make an **Instinct Roll** against them. On a success, **spend a Hope** and ask the GM for one set of information about the target from the following options:

- Their unmarked Hit Points and Stress.
- Their Difficulty and damage thresholds.
- Their tactics and standard attack damage dice.
- Their features and Experiences.

Additionally on a success, you can **mark a Stress** to remove a Fear from the GM's Fear Pool.`,
				character_modifiers: [],
				records: [
					{
						id: 'dossier',
						label: 'Dossier',
						kind: 'ledger',
						fields: [
							{ id: 'target', label: 'Target', type: 'text' },
							{
								id: 'information',
								label: 'Information',
								type: 'choice',
								options: [
									{ id: 'hp_stress', label: 'Unmarked Hit Points and Stress' },
									{ id: 'difficulty_thresholds', label: 'Difficulty and damage thresholds' },
									{ id: 'tactics_damage', label: 'Tactics and standard attack damage dice' },
									{ id: 'features_experiences', label: 'Features and Experiences' }
								]
							},
							{
								id: 'notes',
								label: 'Notes',
								type: 'long_text',
								placeholder: 'What the GM revealed'
							}
						]
					}
				]
			}
		]
	},
	signature_move: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/signature-move.webp',
		image_url: '',
		category: 'ability',
		title: 'Signature Move',
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
				description_html:
					"Name and describe your signature combat move. Once per rest, when you perform this signature move as part of an action you're taking, you can roll a **d20** as your Hope Die. On a success, clear a Stress.",
				character_modifiers: [],
				usage: { id: 'signature_move', max_uses: 1, reset: 'rest' },
				roll_options: [
					{
						id: 'signature_move_hope_die',
						label: 'Perform your signature move (d20 Hope Die)',
						applies_to: ['trait', 'attack', 'spellcast', 'experience'],
						timing: 'before',
						cost: { usage: true },
						effect: { type: 'hope_die', die: 'd20' }
					}
				],
				records: [
					{
						id: 'signature_move',
						label: 'Signature move',
						kind: 'single',
						fields: [
							{ id: 'name', label: 'Name', type: 'text' },
							{ id: 'description', label: 'Description', type: 'long_text' }
						]
					}
				]
			}
		]
	},
	rapid_riposte: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/rapid-riposte.webp',
		image_url: '',
		category: 'ability',
		title: 'Rapid Riposte',
		level_requirement: 6,
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
					'When an attack made against you from within Melee range fails, you can **mark a Stress** and seize the opportunity to deal the weapon damage of one of your active weapons to the attacker.',
				character_modifiers: []
			}
		]
	},
	recovery: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/recovery.webp',
		image_url: '',
		category: 'ability',
		title: 'Recovery',
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
					'During a short rest, you can choose a long rest downtime move instead. You can **spend a Hope** to let an ally do the same.',
				character_modifiers: []
			}
		]
	},
	bone_touched: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/bone-touched.webp',
		image_url: '',
		category: 'ability',
		title: 'Bone-Touched',
		level_requirement: 7,
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
				description_html: `When 4 or more of the domain cards in your loadout are from the Bone domain, gain the following benefits:

- +1 bonus to Agility
- Once per rest, you can **spend 3 Hope** to cause an attack that succeeded against you to fail instead.`,
				character_modifiers: [
					{
						behaviour: 'bonus',
						target: 'trait',
						trait: 'agility',
						type: 'flat',
						value: 1,
						character_conditions: [
							{
								type: 'min_loadout_cards_from_domain',
								domain_id: 'bone',
								min_cards: 4
							}
						]
					}
				]
			}
		]
	},
	cruel_precision: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/cruel-precision.webp',
		image_url: '',
		category: 'ability',
		title: 'Cruel Precision',
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
					'When you make a successful attack with a weapon, gain a bonus to your damage roll equal to either your Finesse or Agility.',
				character_modifiers: []
			}
		]
	},
	breaking_blow: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/breaking-blow.webp',
		image_url: '',
		category: 'ability',
		title: 'Breaking Blow',
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
					'When you make a successful attack, you can **mark a Stress** to make the next successful attack against that same target deal an extra **2d12** damage.',
				character_modifiers: []
			}
		]
	},
	wrangle: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/wrangle.webp',
		image_url: '',
		category: 'ability',
		title: 'Wrangle',
		level_requirement: 8,
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
					'Make an Agility Roll against all targets within Close range. **Spend a Hope** to move targets you succeed against, and any willing allies within Close range, to another point within Close range.',
				character_modifiers: []
			}
		]
	},
	on_the_brink: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/on-the-brink.webp',
		image_url: '',
		category: 'ability',
		title: 'On The Brink',
		level_requirement: 9,
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
					"When you have 2 or fewer Hit Points unmarked, you don't take Minor damage.",
				character_modifiers: []
			}
		]
	},
	splintering_strike: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/splintering-strike.webp',
		image_url: '',
		category: 'ability',
		title: 'Splintering Strike',
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
					"**Spend a Hope** and make an attack against all adversaries within your weapon's range. Once per long rest, on a success against any targets, roll your weapon's damage and distribute that damage however you wish between the targets you succeeded against. Before you deal damage to each target, roll an additional damage die and add its result to the damage you deal to them.",
				character_modifiers: []
			}
		]
	},
	deathrun: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/deathrun.webp',
		image_url: '',
		category: 'ability',
		title: 'Deathrun',
		level_requirement: 10,
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
					"Spend **3 Hope** to run a straight path through the battlefield to a point within Far range, making an attack against all adversaries within your weapon's range along that path. Choose the order in which you deal damage to the targets you succeeded against.\n\nFor the first, roll your weapon damage with a **+1 bonus** to your Proficiency. Then remove a die from your damage roll and deal the remaining damage to the next target. Continue to remove a die for each subsequent target until you have no more damage dice or adversaries. You can't target the same adversary more than once per attack.",
				character_modifiers: []
			}
		]
	},
	swift_step: {
		source_key: 'SRD',
		domain_id: 'bone',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/bone/swift-step.webp',
		image_url: '',
		category: 'ability',
		title: 'Swift Step',
		level_requirement: 10,
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
					"When an attack made against you fails, clear a Stress. If you can't clear a Stress, gain a Hope.",
				character_modifiers: []
			}
		]
	}
} as const satisfies Record<string, DomainCard>;
