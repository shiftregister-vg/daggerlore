import type { DomainCard } from '@domain/schemas/compendium';

export const SPLENDOR_DOMAIN_CARDS = {
	bolt_beacon: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/bolt-beacon.webp',
		image_url: '',
		category: 'spell',
		title: 'Bolt Beacon',
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
				description_html: `Make a **Spellcast Roll** against a target within Far range. On a success, **spend a Hope** to send a bolt of shimmering light toward them, dealing **d8+2** magic damage using your Proficiency. The target becomes temporarily *Vulnerable* and glows brightly until this condition is cleared.`,
				character_modifiers: []
			}
		]
	},

	mending_touch: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/mending-touch.webp',
		image_url: '',
		category: 'spell',
		title: 'Mending Touch',
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
				description_html: `You lay your hands upon a creature and channel healing magic to close their wounds. When you can take a few minutes to focus on the target you're helping, you can **spend 2 Hope** to clear a Hit Point or a Stress on them.

Once per long rest, when you spend this healing time learning something new about them or revealing something about yourself, you can clear **2 Hit Points or 2 Stress** on them instead.`,
				character_modifiers: []
			}
		]
	},

	reassurance: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/reassurance.webp',
		image_url: '',
		category: 'ability',
		title: 'Reassurance',
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
				description_html: `Once per rest, after an ally attempts an action roll but before the consequences take place, you can offer assistance or words of support. When you do, your ally can reroll their dice.`,
				character_modifiers: []
			}
		]
	},

	final_words: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/final-words.webp',
		image_url: '',
		category: 'spell',
		title: 'Final Words',
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
				description_html: `You can infuse a corpse with a moment of life to speak with it. Make a **Spellcast Roll (13)**.

- On a success with Hope, the corpse answers up to three questions.
- On a success with Fear, the corpse answers one question.

The corpse answers truthfully, but it can't impart information it didn't know in life. On a failure, or once the corpse has finished answering your questions, the body turns to dust.`,
				character_modifiers: []
			}
		]
	},

	healing_hands: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/healing-hands.webp',
		image_url: '',
		category: 'spell',
		title: 'Healing Hands',
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
				description_html: `Make a **Spellcast Roll (13)** and target a creature other than yourself within Melee range.

- On a success, **mark a Stress** to clear 2 Hit Points or 2 Stress on the target.
- On a failure, **mark a Stress** to clear a Hit Point or a Stress on the target.

You can't heal the same target again until your next long rest.`,
				character_modifiers: []
			}
		]
	},

	second_wind: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/second-wind.webp',
		image_url: '',
		category: 'ability',
		title: 'Second Wind',
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
				description_html: `Once per rest, when you succeed on an attack against an adversary, you can clear **3 Stress or a Hit Point**.

On a success with Hope, you also clear **3 Stress or a Hit Point** on an ally within Close range of you.`,
				character_modifiers: []
			}
		]
	},

	voice_of_reason: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/voice-of-reason.webp',
		image_url: '',
		category: 'ability',
		title: 'Voice of Reason',
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
				description_html: `You speak with an unmatched power and authority. You have **advantage** on action rolls to de-escalate violent situations or convince someone to follow your lead.

Additionally, you're emboldened in moments of duress. When all of your Stress slots are marked, you gain a **+1 bonus to your Proficiency** for damage rolls.`,
				character_modifiers: []
			}
		]
	},
	divination: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/divination.webp',
		image_url: '',
		category: 'spell',
		title: 'Divination',
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
				description_html: `Once per long rest, **spend 3 Hope** to reach out to the forces beyond and ask one "yes or no" question about an event, person, place, or situation in the near future. For a moment, the present falls away and you see the answer before you.`,
				character_modifiers: []
			}
		]
	},

	life_ward: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/life-ward.webp',
		image_url: '',
		category: 'spell',
		title: 'Life Ward',
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
				description_html: `**Spend 3 Hope** and choose an ally within Close range. They are marked with a glowing sigil of protection. When this ally would make a death move, they clear a Hit Point instead.

This effect ends when it saves the target from a death move, you cast Life Ward on another target, or you take a long rest.`,
				character_modifiers: []
			}
		]
	},

	shape_material: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/shape-material.webp',
		image_url: '',
		category: 'spell',
		title: 'Shape Material',
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
				description_html: `**Spend a Hope** to shape a section of natural material you're touching (such as stone, ice, or wood) to suit your purpose. The area of the material can be no larger than you.

For example, you can form a rudimentary tool or create a door. You can only affect the material within Close range of where you're touching it.`,
				character_modifiers: []
			}
		]
	},

	smite: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/smite.webp',
		image_url: '',
		category: 'spell',
		title: 'Smite',
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
				description_html: `Once per rest, **spend 3 Hope** to charge your powerful smite. When you next successfully attack with a weapon, **double the result** of your damage roll. This attack deals magic damage regardless of the weapon's damage type.`,
				character_modifiers: []
			}
		]
	},

	restoration: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/restoration.webp',
		image_url: '',
		category: 'spell',
		title: 'Restoration',
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
				description_html: `After a long rest, place a number of tokens equal to your Spellcast trait on this card.

Touch a creature and spend any number of tokens to clear **2 Hit Points or 2 Stress** for each token spent.

You can also spend a token from this card when touching a creature to clear the *Vulnerable* condition or heal a physical or magical ailment (the GM might require additional tokens depending on the strength of the ailment).

When you take a long rest, clear all unspent tokens.`,
				character_modifiers: [],
				pools: [
					{
						id: 'restoration',
						kind: 'tokens',
						refill: { source: 'spellcast_trait' },
						refill_on: ['long_rest']
					}
				]
			}
		]
	},

	zone_of_protection: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/zone-of-protection.webp',
		image_url: '',
		category: 'spell',
		title: 'Zone of Protection',
		level_requirement: 6,
		recall_cost: 2,
		applies_in_vault: false,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: true,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html: `Make a **Spellcast Roll (16)**. Once per long rest on a success, choose a point within Far range and create a visible zone of protection there for all allies within Very Close range of that point.

When you do, place a **d6** on this card with the 1 value facing up. When an ally in this zone takes damage, they reduce it by the die's value. You then increase the die's value by one. When the die's value would exceed 6, this effect ends.`,
				character_modifiers: []
			}
		]
	},
	healing_strike: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/healing-strike.webp',
		image_url: '',
		category: 'spell',
		title: 'Healing Strike',
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
				description_html: `When you deal damage to an adversary, you can **spend 2 Hope** to clear a Hit Point on an ally within Close range.`,
				character_modifiers: []
			}
		]
	},

	splendor_touched: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/splendor-touched.webp',
		image_url: '',
		category: 'ability',
		title: 'Splendor-Touched',
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
				description_html: `When 4 or more of the domain cards in your loadout are from the Splendor domain, gain the following benefits:

- +3 bonus to your Severe damage threshold
- Once per long rest, when incoming damage would require you to mark a number of Hit Points, you can choose to mark that much Stress or spend that much Hope instead.`,
				character_modifiers: [
					{
						behaviour: 'bonus',
						target: 'severe_damage_threshold',
						type: 'flat',
						value: 3,
						character_conditions: [
							{
								type: 'min_loadout_cards_from_domain',
								domain_id: 'splendor',
								min_cards: 4
							}
						]
					}
				]
			}
		]
	},

	shield_aura: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/shield-aura.webp',
		image_url: '',
		category: 'spell',
		title: 'Shield Aura',
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
				description_html: `**Mark a Stress** to cast a protective aura on a target within Very Close range. When the target marks an Armor Slot, they reduce the severity of the attack by an additional threshold. If this spell causes a creature who would be damaged to instead mark no Hit Points, the effect ends.

You can only hold Shield Aura on one creature at a time.`,
				character_modifiers: []
			}
		]
	},

	stunning_sunlight: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/stunning-sunlight.webp',
		image_url: '',
		category: 'spell',
		title: 'Stunning Sunlight',
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
				description_html: `Make a **Spellcast Roll** to unleash powerful rays of burning sunlight against all adversaries in front of you within Far range. On a success, **spend any number of Hope** and force that many targets you succeeded against to make a **Reaction Roll (14)**.

- Targets who succeed take **3d20+3** magic damage.
- Targets who fail take **4d20+5** magic damage and are temporarily *Stunned*.

While Stunned, they can't use reactions and can't take any other actions until they clear this condition.`,
				character_modifiers: []
			}
		]
	},

	overwhelming_aura: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/overwhelming-aura.webp',
		image_url: '',
		category: 'spell',
		title: 'Overwhelming Aura',
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
				description_html: `Make a **Spellcast Roll (15)** to magically empower your aura. On a success, **spend 2 Hope** to make your Presence equal to your Spellcast trait until your next long rest.

While this spell is active, an adversary must **mark a Stress** when they target you with an attack.`,
				character_modifiers: []
			}
		]
	},

	salvation_beam: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/salvation-beam.webp',
		image_url: '',
		category: 'spell',
		title: 'Salvation Beam',
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
				description_html: `Make a **Spellcast Roll (16)**. On a success, **mark any number of Stress** to target a line of allies within Far range.

You can clear Hit Points on the targets equal to the number of Stress marked, divided among them however you'd like.`,
				character_modifiers: []
			}
		]
	},

	invigoration: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/invigoration.webp',
		image_url: '',
		category: 'spell',
		title: 'Invigoration',
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
				description_html: `When you or an ally within Close range has used a feature that has an exhaustion limit (such as once per rest or once per session), you can **spend any number of Hope** and roll that many **d6s**. If any roll a 6, the feature can be used again.`,
				character_modifiers: []
			}
		]
	},

	resurrection: {
		source_key: 'SRD',
		domain_id: 'splendor',
		artist_name: '',
		// image_url: '/api/images/card/art/domains/splendor/resurrection.webp',
		image_url: '',
		category: 'spell',
		title: 'Resurrection',
		level_requirement: 10,
		recall_cost: 2,
		applies_in_vault: true,
		forced_in_loadout: false,
		forced_in_vault: false,
		options: [],
		tokens_enabled: false,
		features: [
			{
				weapon_modifiers: [],
				title: '',
				description_html: `Make a **Spellcast Roll (20)**. On a success, restore one creature who has been dead no longer than 100 years to full strength. Then roll a **d6**. On a result of 5 or lower, place this card in your vault permanently.

On a failure, you can't cast Resurrection again for a week.`,
				character_modifiers: []
			}
		]
	}
} as const satisfies Record<string, DomainCard>;
