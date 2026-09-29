import type { AncestryCard } from '@domain/schemas/compendium';

export const ANCESTRY_CARDS = {
	// todo: verify everything below
	mixed_ancestry: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/drakona.webp',
		image_url: '',
		title: 'Mixed Ancestry',
		description_html:
			"Anyone's appearance and abilities can be shaped by blood, magic, proximity, or a variety of other factors.",
		artist_name: '',
		options: [],
		is_mixed_ancestry: true,
		features: []
	},
	drakona: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/drakona.webp',
		image_url: '',
		title: 'Drakona',
		description_html:
			'Drakona resemble wingless dragons in humanoid form and possess a powerful elemental breath.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Scales',
				description_html:
					'Your scales act as natural protection. When you would take Severe damage, you can **mark a Stress** to mark 1 fewer Hit Points.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Elemental Breath',
				description_html:
					'Choose an element for your breath (such as electricity, fire, or ice). You can use this breath against a target or group of targets within Very Close range, treating it as an Instinct weapon that deals **d8** magic damage using your Proficiency.',
				character_modifiers: [],
				weapon_modifiers: [],
				records: [
					{
						id: 'breath_element',
						label: 'Breath element',
						kind: 'single',
						fields: [
							{
								id: 'element',
								label: 'Element',
								type: 'text',
								placeholder: 'e.g. electricity, fire or ice'
							}
						]
					}
				]
			}
		]
	},
	clank: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/clank.webp',
		image_url: '',
		title: 'Clank',
		description_html:
			'Clanks are sentient mechanical beings built from a variety of materials, including metal, wood, and stone.',
		artist_name: '',
		options: [
			{
				choice_id: 'choose_experience',
				type: 'experience',
				max: 1,
				conditional_choice: null
			}
		],
		features: [
			{
				title: 'Purposeful Design',
				description_html:
					'Decide who made you and for what purpose. At character creation, choose one of your Experiences that best aligns with this purpose and gain a permanent +1 bonus to it.',
				character_modifiers: [
					{
						behaviour: 'bonus',
						type: 'flat',
						value: 1,
						target: 'experience_from_card_choice_selection',
						card_id: 'clank',
						choice_id: 'choose_experience',
						character_conditions: []
					}
				],
				weapon_modifiers: []
			},
			{
				title: 'Efficient',
				description_html:
					'When you take a short rest, you can choose a long rest move instead of a short rest move.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	dwarf: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/dwarf.webp',
		image_url: '',
		title: 'Dwarf',
		description_html:
			'Dwarves are most easily recognized as short humanoids with square frames, dense musculature, and thick hair.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Thick Skin',
				description_html:
					'When you take Minor damage, you can **mark 2 Stress** instead of marking a Hit Point.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Increased Fortitude',
				description_html: '**Spend 3 Hope** to halve incoming physical damage.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	elf: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/elf.webp',
		image_url: '',
		title: 'Elf',
		description_html:
			'Elves are typically tall humanoids with pointed ears and acutely attuned senses.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Quick Reactions',
				description_html: '**Mark a Stress** to gain advantage on a reaction roll.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Celestial Trance',
				description_html:
					'During a rest, you can drop into a trance to choose an additional downtime move.',
				character_modifiers: [
					{
						behaviour: 'bonus',
						target: 'max_short_rest_actions',
						type: 'flat',
						value: 1,
						character_conditions: []
					},
					{
						behaviour: 'bonus',
						target: 'max_long_rest_actions',
						type: 'flat',
						value: 1,
						character_conditions: []
					}
				],
				weapon_modifiers: []
			}
		]
	},
	faerie: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/faerie.webp',
		image_url: '',
		title: 'Faerie',
		description_html: 'Faeries are winged humanoid creatures with insectile features.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Luckbender',
				description_html:
					'Once per session, after you or a willing ally within Close range makes an action roll, you can **spend 3 Hope** to reroll the Duality Dice.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Wings',
				description_html:
					'You can fly. While flying, you can **mark a Stress** after an adversary makes an attack against you to gain a +2 bonus to your Evasion against that attack.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	faun: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/faun.webp',
		image_url: '',
		title: 'Faun',
		description_html:
			'Fauns resemble humanoid goats with curving horns, square pupils, and cloven hooves.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Caprine Leap',
				description_html:
					'You can leap anywhere within Close range as though you were using normal movement, allowing you to vault obstacles, jump across gaps, or scale barriers with ease.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Kick',
				description_html:
					'When you succeed on an attack against a target within Melee range, you can **mark a Stress** to kick yourself off them, dealing an extra **2d6** damage and knocking back either yourself or the target to Very Close range.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	firbolg: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/firbolg.webp',
		image_url: '',
		title: 'Firbolg',
		description_html:
			'Firbolgs are bovine humanoids typically recognized by their broad noses and long, drooping ears.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Charge',
				description_html:
					'When you succeed on an Agility Roll to move from Far or Very Far range into Melee range with one or more targets, you can **mark a Stress** to deal **1d12** physical damage to all targets within Melee range.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Unshakable',
				description_html:
					"When you would mark a Stress, roll a **d6**. On a result of 6, don't mark it.",
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	fungril: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/fungril.webp',
		image_url: '',
		title: 'Fungril',
		description_html: 'Fungril resemble humanoid mushrooms.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Fungril Network',
				description_html:
					'Make an **Instinct Roll (12)** to use your mycelial array to speak with others of your ancestry. On a success, you can communicate across any distance.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Death Connection',
				description_html:
					'While touching a corpse that died recently, you can **mark a Stress** to extract one memory from the corpse related to a specific emotion or sensation of your choice.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	galapa: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/galapa.webp',
		image_url: '',
		title: 'Galapa',
		description_html:
			'Galapa resemble anthropomorphic turtles with large, domed shells into which they can retract.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Shell',
				description_html: 'Gain a bonus to your damage thresholds equal to your Proficiency.',
				character_modifiers: [
					{
						behaviour: 'bonus',
						target: 'major_damage_threshold',
						type: 'derived_from_proficiency',
						multiplier: 1,
						character_conditions: []
					},
					{
						behaviour: 'bonus',
						target: 'severe_damage_threshold',
						type: 'derived_from_proficiency',
						multiplier: 1,
						character_conditions: []
					}
				],
				weapon_modifiers: []
			},
			{
				title: 'Retract',
				description_html:
					"**Mark a Stress** to retract into your shell. While in your shell, you have resistance to physical damage, you have disadvantage on action rolls, and you can't move.",
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	giant: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/giant.webp',
		image_url: '',
		title: 'Giant',
		description_html:
			'Giants are towering humanoids with broad shoulders, long arms, and one to three eyes.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Endurance',
				description_html: 'Gain an additional Hit Point slot at character creation.',
				character_modifiers: [
					{
						behaviour: 'bonus',
						target: 'max_hp',
						type: 'flat',
						value: 1,
						character_conditions: []
					}
				],
				weapon_modifiers: []
			},
			{
				title: 'Reach',
				description_html:
					'Treat any weapon, ability, spell, or other feature that has a Melee range as though it has a Very Close range instead.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	goblin: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/goblin.webp',
		image_url: '',
		title: 'Goblin',
		description_html:
			'Goblins are small humanoids easily recognizable by their large eyes and massive membranous ears.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Surefooted',
				description_html: 'You ignore disadvantage on Agility Rolls.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Danger Sense',
				description_html:
					'Once per rest, **mark a Stress** to force an adversary to reroll an attack against you or an ally within Very Close range.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	halfling: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/halflings.webp',
		image_url: '',
		title: 'Halfling',
		description_html:
			'Halflings are small humanoids with large hairy feet and prominent rounded ears.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Luckbringer',
				description_html: 'At the start of each session, everyone in your party gains a Hope.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Internal Compass',
				description_html: 'When you roll a 1 on your Hope Die, you can reroll it.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	human: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/human.webp',
		image_url: '',
		title: 'Human',
		description_html:
			'Humans are most easily recognized by their dexterous hands, rounded ears, and bodies built for endurance.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'High Stamina',
				description_html: 'Gain an additional Stress slot at character creation.',
				character_modifiers: [
					{
						behaviour: 'bonus',
						target: 'max_stress',
						type: 'flat',
						value: 1,
						character_conditions: []
					}
				],
				weapon_modifiers: []
			},
			{
				title: 'Adaptability',
				description_html:
					'When you fail a roll that utilized one of your Experiences, you can **mark a Stress** to reroll.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	infernis: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/infernis.webp',
		image_url: '',
		title: 'Infernis',
		description_html:
			'Infernis are humanoids who possess sharp canine teeth, pointed ears, and horns. They are the descendants of demons from the Circles Below.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Fearless',
				description_html:
					'When you roll with Fear, you can **mark 2 Stress** to change it into a roll with Hope instead.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Dread Visage',
				description_html: 'You have advantage on rolls to intimidate hostile creatures.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	katari: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/katari.webp',
		image_url: '',
		title: 'Katari',
		description_html:
			'Katari are feline humanoids with retractable claws, vertically slit pupils, and high, triangular ears.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Feline Instincts',
				description_html:
					'When you make an Agility Roll, you can **spend 2 Hope** to reroll your Hope Die.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Retracting Claws',
				description_html:
					'Make an **Agility Roll** to scratch a target within Melee range. On a success, they become temporarily Vulnerable.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	orc: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/orcs.webp',
		image_url: '',
		title: 'Orc',
		description_html:
			'Orcs are humanoids most easily recognized by their square features and boar-like tusks that protrude from their lower jaw.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Sturdy',
				description_html:
					'When you have 1 Hit Point remaining, attacks against you have disadvantage.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Tusks',
				description_html:
					'When you succeed on an attack against a target within Melee range, you can **spend a Hope** to gore the target with your tusks, dealing an extra **1d6** damage.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	ribbet: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/ribbet.webp',
		image_url: '',
		title: 'Ribbet',
		description_html:
			'Ribbets resemble anthropomorphic frogs with protruding eyes and webbed hands and feet.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Amphibious',
				description_html: 'You can breathe and move naturally underwater.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Long Tongue',
				description_html:
					'You can use your long tongue to grab onto things within Close range. **Mark a Stress** to use your tongue as a Finesse Close weapon that deals **d12** physical damage using your Proficiency.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		]
	},
	simiah: {
		source_key: 'SRD',
		// image_url: '/api/images/card/art/ancestries/simiah.webp',
		image_url: '',
		title: 'Simiah',
		description_html:
			'Simiah resemble anthropomorphic monkeys and apes with long limbs and prehensile feet.',
		artist_name: '',
		options: [],
		features: [
			{
				title: 'Natural Climber',
				description_html:
					'You have advantage on Agility Rolls that involve balancing and climbing.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Nimble',
				description_html: 'Gain a permanent +1 bonus to your Evasion at character creation.',
				character_modifiers: [
					{
						behaviour: 'bonus',
						target: 'evasion',
						type: 'flat',
						value: 1,
						character_conditions: []
					}
				],
				weapon_modifiers: []
			}
		]
	}
} as const satisfies Record<string, AncestryCard>;
