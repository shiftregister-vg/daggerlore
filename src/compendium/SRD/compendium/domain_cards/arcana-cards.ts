import type { DomainCard } from '@domain/schemas/compendium';

export const ARCANA_DOMAIN_CARDS = {
	rune_ward: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/rune-ward.webp',
		image_url: '',
		category: 'spell',
		title: 'Rune Ward',
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
					"You have a deeply personal trinket that can be infused with protective magic and held as a ward by you or an ally. Describe what it is and why it's important to you.\n\nThe ward's holder can spend a Hope to reduce incoming damage by **1d8**.\n\nIf the Ward Die result is 8, the ward's power ends after it reduces damage this turn. It can be recharged for free on your next rest.",
				character_modifiers: []
			}
		]
	},
	unleash_chaos: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/unleash-chaos.webp',
		image_url: '',
		category: 'spell',
		title: 'Unleash Chaos',
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
					'At the beginning of a session, place a number of tokens equal to your Spellcast trait on this card.\n\nMake a **Spellcast Roll** against a target within Far range and spend any number of tokens to channel raw energy from within yourself to unleash against them.\n\nOn a success, roll a number of **d10s** equal to the tokens you spent and deal that much magic damage to the target. **Mark Stress** to replenish this card with tokens (up to your Spellcast trait). At the end of each session, clear all unspent tokens.',
				character_modifiers: [],
				pools: [
					{
						id: 'unleash_chaos',
						kind: 'tokens',
						capacity: { source: 'spellcast_trait' },
						refill: { source: 'spellcast_trait' },
						refill_on: ['session_start'],
						clear_on: ['session_end']
					}
				]
			}
		]
	},
	wall_walk: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/wall-walk.webp',
		image_url: '',
		category: 'spell',
		title: 'Wall Walk',
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
					'Spend a **Hope** to allow a creature you can touch to climb on walls and ceilings as easily as walking on the ground. This lasts until the end of the scene or you cast Wall Walk again.',
				character_modifiers: []
			}
		]
	},
	cinder_grasp: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/cinder-grasp.webp',
		image_url: '',
		category: 'spell',
		title: 'Cinder Grasp',
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
				description_html:
					'Make a **Spellcast Roll** against a target within Melee range. On a success, the target instantly bursts into flames, takes **1d20+3** magic damage, and is temporarily lit *On Fire*. When a creature acts while *On Fire*, they must take an extra **2d6** magic damage if they are still *On Fire* at the end of their action.',
				character_modifiers: []
			}
		]
	},
	floating_eye: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/floating-eye.webp',
		image_url: '',
		category: 'spell',
		title: 'Floating Eye',
		level_requirement: 2,
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
					"Spend a **Hope** to create a single, small floating orb that you can move anywhere within Very Far range. While this spell is active, you can see through the orb as though you're looking out from its position. You can transition between using your own senses and seeing through the orb freely. If the orb takes damage or moves out of range, the spell ends.",
				character_modifiers: []
			}
		]
	},
	counterspell: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/counterspell.webp',
		image_url: '',
		category: 'spell',
		title: 'Counterspell',
		level_requirement: 3,
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
					'You can interrupt a magical effect taking place by making a reaction roll using your Spellcast trait. On a success, the effect stops and any consequences are avoided, and this card is placed in your vault.',
				character_modifiers: []
			}
		]
	},
	flight: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/flight.webp',
		image_url: '',
		category: 'spell',
		title: 'Flight',
		level_requirement: 3,
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
				description_html:
					'Make a **Spellcast Roll (15)**. On a success, place a number of tokens equal to your Agility on this card (minimum 1). When you make an action roll while flying, spend a token from this card. After the action that spends the last token is resolved, you descend to the ground directly below you.',
				character_modifiers: []
			}
		]
	},
	blink_out: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/blink-out.webp',
		image_url: '',
		category: 'spell',
		title: 'Blink Out',
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
					'Make a **Spellcast Roll (12)**. On a success, **spend a Hope** to teleport to another point you can see within Far range. If any willing creatures are within Very Close range, **spend an additional Hope** for each creature to bring them with you.',
				character_modifiers: []
			}
		]
	},
	preservation_blast: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/preservation-blast.webp',
		image_url: '',
		category: 'spell',
		title: 'Preservation Blast',
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
					'Make a **Spellcast Roll** against all targets within Melee range. Targets you succeed against are forced back to Far range and take **d8+3** magic damage using your Spellcast trait.',
				character_modifiers: []
			}
		]
	},
	chain_lightning: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/chain-lightning.webp',
		image_url: '',
		category: 'spell',
		title: 'Chain Lightning',
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
					'**Mark 2 Stress** to make a **Spellcast Roll**, unleashing lightning on all targets within Close range. Targets you succeed against must make a reaction roll with a Difficulty equal to the result of your Spellcast Roll. Targets who fail take **2d8+4** magic damage.\n\nAdditional adversaries not already targeted by Chain Lightning and within Close range of previous targets who took damage must also make the reaction roll. Targets who fail take **2d8+4** magic damage. This chain continues until there are no more adversaries within range.',
				character_modifiers: []
			}
		]
	},
	premonition: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/premonition.webp',
		image_url: '',
		category: 'spell',
		title: 'Premonition',
		level_requirement: 5,
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
					'You can channel arcane energy to have visions of the future. Once per long rest, immediately after the GM conveys the consequences of a roll you made, you can rescind the move and consequences like they never happened and make another move instead.',
				character_modifiers: [],
				usage: { id: 'premonition', max_uses: 1, reset: 'long_rest' }
			}
		]
	},
	rift_walker: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/rift-walker.webp',
		image_url: '',
		category: 'spell',
		title: 'Rift Walker',
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
					'Make a **Spellcast Roll (15)**. On a success, you place an arcane marking on the ground where you currently stand. The next time you successfully cast Rift Walker, a rift in space opens up, providing safe passage back to the exact spot where the marking was placed. This rift stays open until you choose to close it or you cast another spell. You can drop the spell at any time to cast Rift Walker again and place the marking somewhere new.',
				character_modifiers: []
			}
		]
	},
	telekinesis: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/telekinesis.webp',
		image_url: '',
		category: 'spell',
		title: 'Telekinesis',
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
					"Make a **Spellcast Roll** against a target within Far range. On a success, you can use your mind to move them anywhere within Far range of their original position. You can throw the lifted target as an attack by making an additional Spellcast Roll against the second target you're trying to attack. On a success, deal **d12+4** physical damage to the second target using your Proficiency. This spell then ends.",
				character_modifiers: []
			}
		]
	},
	arcana_touched: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/arcana-touched.webp',
		image_url: '',
		category: 'ability',
		title: 'Arcana-Touched',
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
				description_html: `When 4 or more of the domain cards in your loadout are from the Arcana domain, gain the following benefits:

- +1 bonus to your Spellcast Rolls
- Once per rest, you can switch the results of your Hope and Fear Dice`,
				character_modifiers: [
					{
						behaviour: 'bonus',
						target: 'spellcast_roll_bonus',
						type: 'flat',
						value: 1,
						character_conditions: [
							{
								type: 'min_loadout_cards_from_domain',
								domain_id: 'arcana',
								min_cards: 4
							}
						]
					}
				]
			}
		]
	},
	cloaking_blast: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/cloaking-blast.webp',
		image_url: '',
		category: 'spell',
		title: 'Cloaking Blast',
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
				description_html:
					"When you make a successful **Spellcast Roll** to cast a different spell, you can **spend a Hope** to become *Cloaked*. While *Cloaked*, you remain unseen if you are stationary when an adversary moves to where they would normally see you. When you move into or within an adversary's line of sight or make an attack, you are no longer *Cloaked*.",
				character_modifiers: []
			}
		]
	},
	arcane_reflection: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/arcane-reflection.webp',
		image_url: '',
		category: 'spell',
		title: 'Arcane Reflection',
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
					'When you would take magic damage, you can **spend any number of Hope** to roll that many **d6s**. If any roll a 6, the attack is reflected back to the caster, dealing the damage to them instead.',
				character_modifiers: []
			}
		]
	},
	confusing_aura: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/confusing-aura.webp',
		image_url: '',
		category: 'spell',
		title: 'Confusing Aura',
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
					'Make a **Spellcast Roll (14)**. Once per long rest on a success, you create a layer of illusion over your body that makes it hard to tell exactly where you are. **Mark any number of Stress** to make that many additional layers.\n\nWhen an adversary makes an attack against you, roll a number of **d6s** equal to the number of layers currently active. If any roll a 5 or higher, one layer of the aura is destroyed and the attack fails. If all the results are 4 or lower, you take the damage and this spell ends.',
				character_modifiers: []
			}
		]
	},
	earthquake: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/earthquake.webp',
		image_url: '',
		category: 'spell',
		title: 'Earthquake',
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
					"Make a **Spellcast Roll (16)**. Once per rest on a success, all targets within Very Far range who aren't flying must make a Reaction Roll (18). Targets who fail take **3d10+8** physical damage and are temporarily *Vulnerable*. Targets who succeed take half damage.\n\nAdditionally, when you succeed on the Spellcast Roll, all terrain within Very Far range becomes difficult to move through and structures within this range might sustain damage or crumble.",
				character_modifiers: [],
				usage: { id: 'earthquake', max_uses: 1, reset: 'rest' }
			}
		]
	},
	sensory_projection: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/sensory-projection.webp',
		image_url: '',
		category: 'spell',
		title: 'Sensory Projection',
		level_requirement: 9,
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
					'Once per rest, make a **Spellcast Roll (15)**. On a success, drop into a vision that lets you clearly see and hear any place you have been before as though you are standing there in this moment. You can move freely in this vision and are not constrained by the physics or impediments of a physical body.\n\nThis spell cannot be detected by mundane or magical means. You drop out of this vision upon taking damage or casting another spell.',
				character_modifiers: []
			}
		]
	},
	adjust_reality: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/adjust-reality.webp',
		image_url: '',
		category: 'spell',
		title: 'Adjust Reality',
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
					'After you or a willing ally make any roll, you can **spend 5 Hope** to change the numerical result of that roll to a result of your choice instead. The result must be plausible within the range of the dice.',
				character_modifiers: []
			}
		]
	},
	falling_sky: {
		source_key: 'SRD',
		domain_id: 'arcana',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/arcana/falling-sky.webp',
		image_url: '',
		category: 'spell',
		title: 'Falling Sky',
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
					'Make a **Spellcast Roll** against all adversaries within Far range. **Mark any number of Stress** to make shards of arcana rain down from above. Targets you succeed against take **1d20+2** magic damage for each Stress marked.',
				character_modifiers: []
			}
		]
	}
} as const satisfies Record<string, DomainCard>;
