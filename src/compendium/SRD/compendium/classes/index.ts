import type { CharacterClass } from '@domain/schemas/compendium';

export const CLASSES = {
	bard: {
		source_key: 'SRD',
		starting_evasion: 10,
		starting_max_hp: 5,
		suggested_traits: {
			agility: 0,
			strength: -1,
			finesse: 1,
			instinct: 0,
			presence: 2,
			knowledge: 1
		},
		title: 'Bard',
		image_url: '',
		artist_name: '',
		description_html:
			'As a bard, you know how to get people to talk, bring attention to yourself, and use words or music to influence the world around you.',
		hope_feature: {
			title: 'Make a Scene',
			description_html:
				'**Spend 3 Hope** to temporarily *Distract* a target within Close range, giving them a -2 penalty to their Difficulty.',
			character_modifiers: [],
			weapon_modifiers: []
		},
		primary_domain_id: 'grace',
		secondary_domain_id: 'codex',
		class_features: [
			{
				title: 'Rally',
				description_html: `Once per session, describe how you rally the party and give yourself and each of your allies a Rally Die. At level 1, your Rally Die is a **d6**. A PC can spend their Rally Die to roll it, adding the result to their action roll, reaction roll, damage roll, or to clear a number of Stress equal to the result. At the end of each session, clear all unspent Rally Dice. At level 5, your Rally Die increases to a **d8**.`,
				character_modifiers: [],
				weapon_modifiers: []
			}
		],
		subclass_ids: ['bard_troubadour', 'bard_wordsmith'],
		suggested_primary_weapon_id: 'rapier',
		suggested_secondary_weapon_id: 'small_dagger',
		suggested_armor_id: 'gambeson_armor',
		starting_inventory: {
			gold_coins: 10,
			free_gear: ['Torch', '50 feet of rope', 'Basic Supplies'],
			loot_or_consumable_options: [
				{ type: 'consumable', id: 'minor_health_potion' },
				{ type: 'consumable', id: 'minor_stamina_potion' }
			],
			class_gear_options: ['A romance novel', 'A letter never opened'],
			spellbook_prompt: 'Songbook, journal, etc.'
		},
		background_questions: [
			'Who from your community taught you to have such confidence in yourself?',
			'You were in love once. Who did you adore, and how did they hurt you?',
			"You've always looked up to another bard. Who are they, and why do you idolize them?"
		],
		connection_questions: [
			'What made you realize we were going to be such good friends?',
			'What do I do that annoys you?',
			'Why do you grab my hand at night?'
		],
		character_description_suggestions: {
			clothes: 'extravagant, fancy, loud, oversized, ragged, sleek, wild',
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: 'a barkeep, a magician, a ringmaster, a rock star, a swashbuckler'
		}
	},

	druid: {
		source_key: 'SRD',
		starting_evasion: 10,
		starting_max_hp: 6,
		suggested_traits: {
			agility: 1,
			strength: 0,
			finesse: 1,
			instinct: 2,
			presence: -1,
			knowledge: 0
		},
		title: 'Druid',
		image_url: '',
		artist_name: '',
		description_html:
			'As a druid, you are a force of nature, preserving the balance of life and death by channeling the wilds themselves through you.',
		hope_feature: {
			title: 'Evolution',
			description_html:
				'**Spend 3 Hope** to transform into a Beastform without marking a Stress. When you do, choose one trait to raise by +1 until you drop out of that Beastform.',
			character_modifiers: [],
			weapon_modifiers: []
		},
		primary_domain_id: 'sage',
		secondary_domain_id: 'arcana',
		class_features: [
			{
				title: 'Beastform',
				description_html: `**Mark a Stress** to magically transform into a creature of your tier or lower from the Beastform list. You can drop out of this form at any time. While transformed, you can't use weapons or cast spells from domain cards, but you can still use other features or abilities you have access to. Spells you cast before you transform stay active and last for their normal duration, and you can talk and communicate as normal. Additionally, you gain the Beastform's features, add their Evasion bonus to your Evasion, and use the trait specified in their statistics for your attack. While you're in a Beastform, your armor becomes part of your body and you mark Armor Slots as usual; when you drop out of a Beastform, those marked Armor Slots remain marked. If you mark your last Hit Point, you automatically drop out of this form.`,
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Wildtouch',
				description_html:
					'You can perform harmless, subtle effects that involve nature—such as causing a flower to rapidly grow, summoning a slight gust of wind, or starting a campfire—at will.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		],
		subclass_ids: ['druid_warden_of_renewal', 'druid_warden_of_the_elements'],
		suggested_primary_weapon_id: 'shortstaff',
		suggested_secondary_weapon_id: 'round_shield',
		suggested_armor_id: 'leather_armor',
		starting_inventory: {
			gold_coins: 10,
			free_gear: ['Torch', '50 feet of rope', 'Basic Supplies'],
			loot_or_consumable_options: [
				{ type: 'consumable', id: 'minor_health_potion' },
				{ type: 'consumable', id: 'minor_stamina_potion' }
			],
			class_gear_options: ['A small bag of rocks and bones', 'A strange pendant found in the dirt'],
			spellbook_prompt: undefined
		},
		background_questions: [
			'Why was the community you grew up in so reliant on nature and its creatures?',
			'Who was the first wild animal you bonded with? Why did your bond end?',
			'Who has been trying to hunt you down? What do they want from you?'
		],
		connection_questions: [
			'What did you confide in me that makes me leap into danger for you every time?',
			'What animal do I say you remind me of?',
			'What affectionate nickname have you given me?'
		],
		character_description_suggestions: {
			clothes: 'camouflaged, grown, loose, natural, patchwork, regal, scraps',
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: 'a firecracker, a fox, a guide, a hippie, a witch'
		}
	},

	guardian: {
		source_key: 'SRD',
		starting_evasion: 9,
		starting_max_hp: 7,
		suggested_traits: {
			agility: 1,
			strength: 2,
			finesse: -1,
			instinct: 0,
			presence: 1,
			knowledge: 0
		},
		title: 'Guardian',
		image_url: '',
		artist_name: '',
		description_html:
			'As a guardian, you run into danger to protect your party, keeping watch over those who might not survive without you there.',
		hope_feature: {
			title: 'Frontline Tank',
			description_html: '**Spend 3 Hope** to clear 2 Armor Slots.',
			character_modifiers: [],
			weapon_modifiers: []
		},
		primary_domain_id: 'valor',
		secondary_domain_id: 'blade',
		class_features: [
			{
				title: 'Unstoppable',
				description_html: `Once per long rest, you can become *Unstoppable*. You gain an Unstoppable Die. At level 1, your Unstoppable Die is a **d4**. Place it on your character sheet in the space provided, starting with the 1 value facing up. After you make a damage roll that deals 1 or more Hit Points to a target, increase the Unstoppable Die value by one. When the die's value would exceed its maximum value or when the scene ends, remove the die and drop out of *Unstoppable*. At level 5, your Unstoppable Die increases to a **d6**.

While *Unstoppable*, you gain the following benefits:

- You reduce the severity of physical damage by one threshold (Severe to Major, Major to Minor, Minor to None).
- You add the current value of the Unstoppable Die to your damage roll.
- You can't be Restrained or Vulnerable.`,
				character_modifiers: [],
				weapon_modifiers: []
			}
		],
		subclass_ids: ['guardian_stalwart', 'guardian_vengeance'],
		suggested_primary_weapon_id: 'battleaxe',
		suggested_secondary_weapon_id: undefined,
		suggested_armor_id: 'chainmail_armor',
		starting_inventory: {
			gold_coins: 10,
			free_gear: ['Torch', '50 feet of rope', 'Basic Supplies'],
			loot_or_consumable_options: [
				{ type: 'consumable', id: 'minor_health_potion' },
				{ type: 'consumable', id: 'minor_stamina_potion' }
			],
			class_gear_options: ['A totem from your mentor', 'A secret key'],
			spellbook_prompt: undefined
		},
		background_questions: [
			'Who from your community did you fail to protect, and why do you still think of them?',
			"You've been tasked with protecting something important and delivering it somewhere dangerous. What is it, and where does it need to go?",
			'You consider an aspect of yourself to be a weakness. What is it, and how has it affected you?'
		],
		connection_questions: [
			'How did I save your life the first time we met?',
			'What small gift did you give me that you notice I always carry with me?',
			'What lie have you told me about yourself that I absolutely believe?'
		],
		character_description_suggestions: {
			clothes: 'casual, intricate, loose, padded, royal, tactical, weathered',
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: 'a captain, a caretaker, an elephant, a general, a wrestler'
		}
	},

	ranger: {
		source_key: 'SRD',
		starting_evasion: 12,
		starting_max_hp: 6,
		suggested_traits: {
			agility: 2,
			strength: 0,
			finesse: 1,
			instinct: 1,
			presence: -1,
			knowledge: 0
		},
		title: 'Ranger',
		image_url: '',
		artist_name: '',
		description_html:
			'As a ranger, your keen eyes and graceful haste make you indispensable when tracking down enemies and navigating the wilds.',
		hope_feature: {
			title: 'Hold Them Off',
			description_html:
				'**Spend 3 Hope** when you succeed on an attack with a weapon to use that same roll against two additional adversaries within range of the attack.',
			character_modifiers: [],
			weapon_modifiers: []
		},
		primary_domain_id: 'bone',
		secondary_domain_id: 'sage',
		class_features: [
			{
				title: "Ranger's Focus",
				description_html: `**Spend a Hope** and make an attack against a target. On a success, deal your attack's normal damage and temporarily make the attack's target your *Focus*. Until this feature ends or you make a different creature your *Focus*, you gain the following benefits against your *Focus*:
- You know precisely what direction they are in.
- When you deal damage to them, they must mark a Stress.
- When you fail an attack against them, you can end your Ranger's Focus feature to reroll your Duality Dice.`,
				character_modifiers: [],
				weapon_modifiers: [],
				effects: [
					{
						id: 'rangers_focus',
						label: 'Focus',
						cost: { hope: 1 },
						requires_success: true,
						target: { label: 'Focus' },
						instances: 'replace',
						character_modifiers: [],
						weapon_modifiers: [],
						notes:
							'You know precisely what direction your Focus is in. When you deal damage to them, they must mark a Stress. When you fail an attack against them, you can end this feature to reroll your Duality Dice.',
						ends_on: [],
						ends_when: ['You end it to reroll a failed attack against your Focus']
					}
				],
				roll_options: [
					{
						id: 'rangers_focus_reroll',
						label: "End Ranger's Focus to reroll the Duality Dice",
						applies_to: ['attack'],
						timing: 'after',
						requires_outcome: 'failure',
						requires_active_effect: 'rangers_focus',
						ends_effect: true,
						effect: { type: 'reroll', dice: 'duality' }
					}
				]
			}
		],
		subclass_ids: ['ranger_wayfinder', 'ranger_beastbound'],
		suggested_primary_weapon_id: 'shortbow',
		suggested_secondary_weapon_id: undefined,
		suggested_armor_id: 'leather_armor',
		starting_inventory: {
			gold_coins: 10,
			free_gear: ['Torch', '50 feet of rope', 'Basic Supplies'],
			loot_or_consumable_options: [
				{ type: 'consumable', id: 'minor_health_potion' },
				{ type: 'consumable', id: 'minor_stamina_potion' }
			],
			class_gear_options: ['A trophy from your first kill', 'A seemingly broken compass'],
			spellbook_prompt: undefined
		},
		background_questions: [
			"A terrible creature hurt your community, and you've vowed to hunt them down. What are they, and what unique trail or sign do they leave behind?",
			'Your first kill almost killed you, too. What was it, and what part of you was never the same after that event?',
			"You've traveled many dangerous lands, but what is the one place you refuse to go?"
		],
		connection_questions: [
			'What friendly competition do we have?',
			"Why do you act differently when we're alone than when others are around?",
			'What threat have you asked me to watch for, and why are you worried about it?'
		],
		character_description_suggestions: {
			clothes: 'flowing, muted, natural, stained, tactical, tight, woven',
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: 'a child, a ghost, a survivalist, a teacher, a watchdog'
		}
	},

	rogue: {
		source_key: 'SRD',
		starting_evasion: 12,
		starting_max_hp: 6,
		suggested_traits: {
			agility: 1,
			strength: -1,
			finesse: 2,
			instinct: 0,
			presence: 1,
			knowledge: 0
		},
		title: 'Rogue',
		image_url: '',
		artist_name: '',
		description_html:
			'As a rogue, you have experience fighting with your blade as well as your wit, preferring to move quickly and fight quietly.',
		hope_feature: {
			title: "Rogue's Dodge",
			description_html:
				'**Spend 3 Hope** to gain a **+2** bonus to your Evasion until the next time an attack succeeds against you. Otherwise, this bonus lasts until your next rest.',
			character_modifiers: [],
			weapon_modifiers: [],
			effects: [
				{
					id: 'rogues_dodge',
					label: "Rogue's Dodge",
					cost: { hope: 3 },
					character_modifiers: [
						{
							behaviour: 'bonus',
							character_conditions: [],
							type: 'flat',
							value: 2,
							target: 'evasion'
						}
					],
					weapon_modifiers: [],
					ends_on: ['attacked_successfully', 'short_rest', 'long_rest']
				}
			]
		},
		primary_domain_id: 'midnight',
		secondary_domain_id: 'grace',
		class_features: [
			{
				title: 'Cloaked',
				description_html: `Any time you would be *Hidden*, you are instead *Cloaked*. In addition to the benefits of the *Hidden* condition, while *Cloaked* you remain unseen if you are stationary when an adversary moves to where they would normally see you. After you make an attack or end a move within line of sight of an adversary, you are no longer *Cloaked*.`,
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Sneak Attack',
				description_html: `When you succeed on an attack while *Cloaked* or while an ally is within Melee range of your target, add a number of **d6s** equal to your tier to your damage roll.
- Level 1 → Tier 1
- Levels 2–4 → Tier 2
- Levels 5–7 → Tier 3
- Levels 8–10 → Tier 4`,
				character_modifiers: [],
				weapon_modifiers: []
			}
		],
		subclass_ids: ['rogue_syndicate', 'rogue_nightwalker'],
		suggested_primary_weapon_id: 'dagger',
		suggested_secondary_weapon_id: 'small_dagger',
		suggested_armor_id: 'gambeson_armor',
		starting_inventory: {
			gold_coins: 10,
			free_gear: ['Torch', '50 feet of rope', 'Basic Supplies'],
			loot_or_consumable_options: [
				{ type: 'consumable', id: 'minor_health_potion' },
				{ type: 'consumable', id: 'minor_stamina_potion' }
			],
			class_gear_options: ['A set of forgery tools', 'A grappling hook'],
			spellbook_prompt: undefined
		},
		background_questions: [
			'What did you get caught doing that got you exiled from your home community?',
			"You used to have a different life, but you've tried to leave it behind. Who from your past is still chasing you?",
			'Who from your past were you most sad to say goodbye to?'
		],
		connection_questions: [
			'What did I recently convince you to do that got us both in trouble?',
			'What have I discovered about your past that I hold secret from the others?',
			'Who do you know from my past, and how have they influenced your feelings about me?'
		],
		character_description_suggestions: {
			clothes: 'clean, dark, inconspicuous, leather, scary, tactical, tight',
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: 'a bandit, a con artist, a gambler, a mob boss, a pirate'
		}
	},

	seraph: {
		source_key: 'SRD',
		starting_evasion: 9,
		starting_max_hp: 7,
		suggested_traits: {
			agility: 0,
			strength: 2,
			finesse: 0,
			instinct: 1,
			presence: 1,
			knowledge: -1
		},
		title: 'Seraph',
		image_url: '',
		artist_name: '',
		description_html:
			"As a seraph, you've taken a vow to a god who helps you channel sacred arcane power to keep your party on their feet.",
		hope_feature: {
			title: 'Life Support',
			description_html: '**Spend 3 Hope** to clear a Hit Point on an ally within Close range.',
			character_modifiers: [],
			weapon_modifiers: []
		},
		primary_domain_id: 'splendor',
		secondary_domain_id: 'valor',
		class_features: [
			{
				title: 'Prayer Dice',
				description_html: `At the beginning of each session, roll a number of **d4s** equal to your subclass's Spellcast trait and place them on your character sheet in the space provided. These are your Prayer Dice. You can spend any number of Prayer Dice to aid yourself or an ally within Far range. You can use a spent die's value to reduce incoming damage, add to a roll's result after the roll is made, or gain Hope equal to the result. At the end of each session, clear all unspent Prayer Dice.`,
				character_modifiers: [],
				weapon_modifiers: [],
				pools: [
					{
						id: 'prayer_dice',
						label: 'Prayer Dice',
						kind: 'dice',
						die: 'd4',
						refill: { source: 'spellcast_trait' },
						refill_on: ['session_start'],
						clear_on: ['session_end']
					}
				],
				roll_options: [
					{
						id: 'prayer_die_roll',
						label: 'Add a Prayer Die to the result',
						applies_to: ['trait', 'attack', 'spellcast', 'experience', 'damage'],
						timing: 'after',
						cost: { pool: { id: 'prayer_dice' } },
						effect: { type: 'bonus_die', die: 'pool' }
					},
					{
						id: 'prayer_die_damage',
						label: 'Reduce incoming damage with a Prayer Die',
						timing: 'defense',
						cost: { pool: { id: 'prayer_dice' } },
						effect: { type: 'reduce_damage', amount: 'pool' }
					}
				]
			}
		],
		subclass_ids: ['seraph_divine_wielder', 'seraph_winged_sentinel'],
		suggested_primary_weapon_id: 'hallowed_axe',
		suggested_secondary_weapon_id: 'round_shield',
		suggested_armor_id: 'chainmail_armor',
		starting_inventory: {
			gold_coins: 10,
			free_gear: ['Torch', '50 feet of rope', 'Basic Supplies'],
			loot_or_consumable_options: [
				{ type: 'consumable', id: 'minor_health_potion' },
				{ type: 'consumable', id: 'minor_stamina_potion' }
			],
			class_gear_options: ['A bundle of offerings', 'A sigil of your god'],
			spellbook_prompt: undefined
		},
		background_questions: [
			'Which god did you devote yourself to? What incredible feat did they perform for you in a moment of desperation?',
			'How did your appearance change after taking your oath?',
			'In what strange or unique way do you communicate with your god?'
		],
		connection_questions: [
			'What promise did you make me agree to, should you die on the battlefield?',
			'Why do you ask me so many questions about my god?',
			"You've told me to protect one member of our party above all others, even yourself. Who are they and why?"
		],
		character_description_suggestions: {
			clothes: 'glowing, rippling, ornate, tight, modest, strange, natural',
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: 'an angel, a doctor, an evangelist, a monk, a priest'
		}
	},

	sorcerer: {
		source_key: 'SRD',
		starting_evasion: 10,
		starting_max_hp: 6,
		suggested_traits: {
			agility: 0,
			strength: -1,
			finesse: 1,
			instinct: 2,
			presence: 1,
			knowledge: 0
		},
		title: 'Sorcerer',
		image_url: '',
		artist_name: '',
		description_html:
			"As a sorcerer, you were born with innate magical power, and you've learned how to wield that power to get what you want.",
		hope_feature: {
			title: 'Volatile Magic',
			description_html:
				'**Spend 3 Hope** to reroll any number of your damage dice on an attack that deals magic damage.',
			character_modifiers: [],
			weapon_modifiers: []
		},
		primary_domain_id: 'arcana',
		secondary_domain_id: 'midnight',
		class_features: [
			{
				title: 'Arcane Sense',
				description_html:
					'You can sense the presence of magical people and objects within Close range.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Minor Illusion',
				description_html:
					'Make a Spellcast Roll (10). On a success, you create a minor visual illusion no larger than yourself within Close range. This illusion is convincing to anyone at Close range or farther.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Channel Raw Power',
				description_html: `Once per long rest, you can place a domain card from your loadout into your vault and choose to either:
- Gain Hope equal to the level of the card.
- Enhance a spell that deals damage, gaining a bonus to your damage roll equal to twice the level of the card.`,
				character_modifiers: [],
				weapon_modifiers: []
			}
		],
		subclass_ids: ['sorcerer_elemental_origin', 'sorcerer_primal_origin'],
		suggested_primary_weapon_id: 'dualstaff',
		suggested_secondary_weapon_id: undefined,
		suggested_armor_id: 'gambeson_armor',
		starting_inventory: {
			gold_coins: 10,
			free_gear: ['Torch', '50 feet of rope', 'Basic Supplies'],
			loot_or_consumable_options: [
				{ type: 'consumable', id: 'minor_health_potion' },
				{ type: 'consumable', id: 'minor_stamina_potion' }
			],
			class_gear_options: ['A whispering orb', 'A family heirloom'],
			spellbook_prompt: undefined
		},
		background_questions: [
			'What did you do that made the people in your community wary of you?',
			'What mentor taught you to control your untamed magic, and why are they no longer able to guide you?',
			'You have a deep fear you hide from everyone. What is it, and why does it scare you?'
		],
		connection_questions: [
			'Why do you trust me so deeply?',
			'What did I do that makes you cautious around me?',
			'Why do we keep our shared past a secret?'
		],
		character_description_suggestions: {
			clothes: 'always moving, flamboyant, inconspicuous, layered, ornate, tight',
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: "a celebrity, a commander, a politician, a prankster, a wolf in sheep's clothing"
		}
	},

	warrior: {
		source_key: 'SRD',
		starting_evasion: 11,
		starting_max_hp: 6,
		suggested_traits: {
			agility: 2,
			strength: 1,
			finesse: 0,
			instinct: 1,
			presence: -1,
			knowledge: 0
		},
		title: 'Warrior',
		image_url: '',
		artist_name: '',
		description_html:
			'As a warrior, you have trained your body and mind to face any challenge that comes your way.',
		hope_feature: {
			title: 'No Mercy',
			description_html:
				'**Spend 3 Hope** to gain a **+1** bonus to your attack rolls until your next rest.',
			character_modifiers: [],
			weapon_modifiers: []
		},
		primary_domain_id: 'blade',
		secondary_domain_id: 'bone',
		class_features: [
			{
				title: 'Attack of Opportunity',
				description_html: `If an adversary within Melee range attempts to leave that range, make a reaction roll using a trait of your choice against their Difficulty. Choose one effect on a success, or two if you critically succeed:
- They can't move from where they are.
- You deal damage to them equal to your primary weapon's damage.
- You move with them.`,
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Combat Training',
				description_html: `You ignore burden when equipping weapons. When you deal physical damage, you gain a bonus to your damage roll equal to your level.`,
				character_modifiers: [],
				weapon_modifiers: []
			}
		],
		subclass_ids: ['warrior_call_of_the_brave', 'warrior_call_of_the_slayer'],
		suggested_primary_weapon_id: 'dualstaff',
		suggested_secondary_weapon_id: undefined,
		suggested_armor_id: 'gambeson_armor',
		starting_inventory: {
			gold_coins: 10,
			free_gear: ['Torch', '50 feet of rope', 'Basic Supplies'],
			loot_or_consumable_options: [
				{ type: 'consumable', id: 'minor_health_potion' },
				{ type: 'consumable', id: 'minor_stamina_potion' }
			],
			class_gear_options: ['The drawing of a lover', 'A sharpening stone'],
			spellbook_prompt: undefined
		},
		background_questions: [
			'Who taught you to fight, and why did they stay behind when you left home?',
			'Somebody defeated you in battle years ago and left you to die. Who was it, and how did they betray you?',
			'What legendary place have you always wanted to visit, and why is it so special?'
		],
		connection_questions: [
			'We knew each other long before this party came together. How?',
			'What mundane task do you usually help me with off the battlefield?',
			'What fear am I helping you overcome?'
		],
		character_description_suggestions: {
			clothes: 'bold, patched, reinforced, royal, sleek, sparing, weathered',
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: 'a bull, a dedicated soldier, a gladiator, a hero, a hired hand'
		}
	},

	wizard: {
		source_key: 'SRD',
		starting_evasion: 11,
		starting_max_hp: 5,
		suggested_traits: {
			agility: -1,
			strength: 0,
			finesse: 0,
			instinct: 1,
			presence: 1,
			knowledge: 2
		},
		title: 'Wizard',
		image_url: '',
		artist_name: '',
		description_html:
			"As a wizard, you've become familiar with the arcane through the relentless study of grimoires and other tools of magic.",
		hope_feature: {
			title: 'Not This Time',
			description_html:
				'**Spend 3 Hope** to force an adversary within Far range to reroll an attack or damage roll.',
			character_modifiers: [],
			weapon_modifiers: []
		},
		primary_domain_id: 'codex',
		secondary_domain_id: 'splendor',
		class_features: [
			{
				title: 'Prestidigitation',
				description_html: `You can perform harmless, subtle magical effects at will. For example, you can change an object's color, create a smell, light a candle, cause a tiny object to float, illuminate a room, or repair a small object.`,
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Strange Patterns',
				description_html: `Choose a number between 1 and 12. When you roll that number on a Duality Die, gain a Hope or clear a Stress.

You can change this number when you take a long rest.`,
				character_modifiers: [],
				weapon_modifiers: []
			}
		],
		subclass_ids: ['wizard_school_of_knowledge', 'wizard_school_of_war'],
		suggested_primary_weapon_id: 'greatstaff',
		suggested_secondary_weapon_id: undefined,
		suggested_armor_id: 'leather_armor',
		starting_inventory: {
			gold_coins: 10,
			free_gear: ['Torch', '50 feet of rope', 'Basic Supplies'],
			loot_or_consumable_options: [
				{ type: 'consumable', id: 'minor_health_potion' },
				{ type: 'consumable', id: 'minor_stamina_potion' }
			],
			class_gear_options: ['A tiny, harmless elemental pet'],
			spellbook_prompt: 'Large tomes, tarot cards, etc.'
		},
		background_questions: [
			'What responsibilities did your community once count on you for? How did you let them down?',
			"You've spent your life searching for a book or object of great significance. What is it, and why is it so important to you?",
			'You have a powerful rival. Who are they, and why are you so determined to defeat them?'
		],
		connection_questions: [
			"What favor have I asked of you that you're not sure you can fulfill?",
			'What weird hobby or strange fascination do we both share?',
			'What secret about yourself have you entrusted only to me?'
		],
		character_description_suggestions: {
			clothes: 'beautiful, clean, common, flowing, layered, patchwork, tight',
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: 'an eccentric, a librarian, a lit fuse, a philosopher, a professor'
		}
	}
} as const satisfies Record<string, CharacterClass>;
