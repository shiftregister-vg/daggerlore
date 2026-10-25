import type { CharacterClass } from '@domain/schemas/compendium';

export const CLASSES = {
	assassin: {
		source_key: 'HAF',
		starting_evasion: 12,
		starting_max_hp: 5,
		suggested_traits: {
			agility: 2,
			strength: -1,
			finesse: 1,
			instinct: 0,
			presence: 0,
			knowledge: 1
		},
		title: 'Assassin',
		image_url: '',
		artist_name: '',
		description_html:
			'Assassins rely on stealth, precision, and relentless focus to isolate and eliminate dangerous targets.',
		hope_feature: {
			title: 'Grim Resolve',
			description_html: '**Spend 3 Hope** to clear 2 Stress.',
			character_modifiers: [],
			weapon_modifiers: []
		},
		primary_domain_id: 'midnight',
		secondary_domain_id: 'blade',
		class_features: [
			{
				title: 'Marked for Death',
				description_html:
					'On a successful weapon attack, you can mark a Stress to mark the target for death. Your attacks against that target deal extra damage based on your tier until the mark ends.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Get In & Get Out',
				description_html:
					'Spend a Hope to ask the GM for a quick or inconspicuous route into or out of a visible structure; the next roll using that information has advantage.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		],
		subclass_ids: ['assassin_executioners_guild', 'assassin_poisoners_guild'],
		suggested_primary_weapon_id: 'broadsword',
		suggested_secondary_weapon_id: 'short_sword',
		suggested_armor_id: 'leather_armor',
		starting_inventory: {
			gold_coins: 10,
			free_gear: ['Torch', '50 feet of rope', 'Basic Supplies'],
			loot_or_consumable_options: [
				{ type: 'consumable', id: 'minor_health_potion' },
				{ type: 'consumable', id: 'minor_stamina_potion' }
			],
			class_gear_options: [
				'A list of names with several marked off',
				'A mortar and pestle inscribed with a mysterious insignia'
			],
			spellbook_prompt: undefined
		},
		background_questions: [
			'What line will you never cross when pursuing a target?',
			'Which target has escaped you, and how did they do it?',
			'What organization trained you, and how did you join?'
		],
		connection_questions: [
			'What about me frightens you?',
			'What did you ask me to do that still keeps you awake?',
			'What secret did I tell you, and how did it change your view of me?'
		],
		character_description_suggestions: {
			clothes: 'sinister, weathered, hooded, finely tailored, incognito, padded for silence',
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: 'a hidden razor, a judge, an owl, a butcher, a coiled viper, a merchant, a hunter'
		}
	},
	brawler: {
		source_key: 'HAF',
		starting_evasion: 10,
		starting_max_hp: 7,
		suggested_traits: {
			agility: 1,
			strength: 1,
			finesse: 0,
			instinct: 2,
			presence: 0,
			knowledge: -1
		},
		title: 'Brawler',
		image_url: '',
		artist_name: '',
		description_html:
			'Brawlers turn disciplined bodies and raw physicality into weapons, fighting just as well unarmed as armed.',
		hope_feature: {
			title: 'Staggering Strike',
			description_html:
				'**Spend 3 Hope** on a successful attack to Stagger the target and make them mark a Stress. While Staggered, they have disadvantage on attack rolls.',
			character_modifiers: [],
			weapon_modifiers: []
		},
		primary_domain_id: 'bone',
		secondary_domain_id: 'valor',
		class_features: [
			{
				title: 'I Am the Weapon',
				description_html:
					'While you have no equipped weapons, you gain +1 Evasion and can treat unarmed strikes as a Melee weapon using a trait of your choice.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Combo Strikes',
				description_html:
					'After a Melee damage roll, mark a Stress to roll your Combo Die repeatedly until the chain stops, adding the total to the damage.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		],
		subclass_ids: ['brawler_juggernaut', 'brawler_martial_artist'],
		suggested_primary_weapon_id: 'quarterstaff',
		suggested_secondary_weapon_id: undefined,
		suggested_armor_id: 'leather_armor',
		starting_inventory: {
			gold_coins: 10,
			free_gear: ['Torch', '50 feet of rope', 'Basic Supplies'],
			loot_or_consumable_options: [
				{ type: 'consumable', id: 'minor_health_potion' },
				{ type: 'consumable', id: 'minor_stamina_potion' }
			],
			class_gear_options: ['Hand wraps from a mentor', 'A book about your secret hobby'],
			spellbook_prompt: undefined
		},
		background_questions: [
			'Who do you want a rematch against?',
			'What group has always had your back?',
			'Where did you learn your fighting style?'
		],
		connection_questions: [
			'What have I not forgiven you for saying?',
			'What important thing do I rely on you for?',
			'What is one thing we are both afraid of?'
		],
		character_description_suggestions: {
			clothes: "practical, haphazard, pristine, standard-issue, bright, someone else's",
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: 'a loose cannon, a parent, a veteran, a flowing river, a protector'
		}
	},
	warlock: {
		source_key: 'HAF',
		starting_evasion: 11,
		starting_max_hp: 6,
		suggested_traits: {
			agility: 1,
			strength: -1,
			finesse: 0,
			instinct: 1,
			presence: 2,
			knowledge: 0
		},
		title: 'Warlock',
		image_url: '',
		artist_name: '',
		description_html:
			'Warlocks bind themselves to an otherworldly patron, trading devotion and offerings for supernatural favor.',
		hope_feature: {
			title: "Patron's Boon",
			description_html: '**Spend 3 Hope** to call on your patron and gain 1d4 Favor.',
			character_modifiers: [],
			weapon_modifiers: []
		},
		primary_domain_id: 'dread',
		secondary_domain_id: 'grace',
		class_features: [
			{
				title: 'Patron’s Pact',
				description_html:
					'You have committed yourself to a supernatural entity—such as a god, fae, or demon—in exchange for power. Write their name on your character sheet, then work with your GM to determine their sphere of influence (such as Nature, Chaos, Wisdom, Mischief, Love, War, Justice, or Death). Before making an action roll that relates to your patron’s sphere of influence, you can **spend a Favor** to call upon their aid, rolling your Patron Die and adding its result to the total. Your Patron Die starts at a **d6** and increases to a **d8** at level 5.',
				character_modifiers: [],
				weapon_modifiers: [],
				records: [
					{
						id: 'patron',
						label: 'Patron',
						kind: 'single',
						fields: [
							{
								id: 'name',
								label: 'Patron name',
								type: 'text',
								placeholder: 'e.g. a god, fae or demon'
							},
							{
								id: 'sphere',
								label: 'Sphere of influence',
								type: 'text',
								placeholder: 'e.g. Nature, Chaos or War'
							}
						]
					}
				]
			},
			{
				title: 'Favor',
				description_html:
					'Start with Favor and gain more during rests by making an offering to your patron. Refusing the offering gives the GM Fear.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		],
		subclass_ids: ['warlock_pact_of_the_endless', 'warlock_pact_of_the_wrathful'],
		suggested_primary_weapon_id: 'scepter',
		suggested_secondary_weapon_id: undefined,
		suggested_armor_id: 'leather_armor',
		starting_inventory: {
			gold_coins: 10,
			free_gear: ['Torch', '50 feet of rope', 'Basic Supplies'],
			loot_or_consumable_options: [
				{ type: 'consumable', id: 'minor_health_potion' },
				{ type: 'consumable', id: 'minor_stamina_potion' }
			],
			class_gear_options: ['A carving that symbolizes your patron', "A ring you can't remove"],
			spellbook_prompt: undefined
		},
		background_questions: [
			'What desperate situation led you to pledge yourself to your patron?',
			'What task has your patron given you above all else?',
			'How are you and your patron alike?'
		],
		connection_questions: [
			'Why do I confide in you about my patron?',
			'What did you see when I tithed to my patron?',
			'What foolish thing did I do that you will not let me forget?'
		],
		character_description_suggestions: {
			clothes: 'shadowy, billowing, smoking, lavish, sacred, mended, neat, luminous',
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: 'a coming storm, a devotee, a jester, a soothsayer, a monarch, a live wire'
		}
	},
	witch: {
		source_key: 'HAF',
		starting_evasion: 10,
		starting_max_hp: 5,
		suggested_traits: {
			agility: 0,
			strength: -1,
			finesse: 0,
			instinct: 2,
			presence: 1,
			knowledge: 1
		},
		title: 'Witch',
		image_url: '',
		artist_name: '',
		description_html:
			'Witches draw on earth, sky, spirit, ritual, and craft to protect allies, read omens, and hex enemies.',
		hope_feature: {
			title: "Witch's Charm",
			description_html:
				'**Spend 3 Hope** when you or an ally within Far range fails an action roll to change it into a success with Fear.',
			character_modifiers: [],
			weapon_modifiers: []
		},
		primary_domain_id: 'dread',
		secondary_domain_id: 'sage',
		class_features: [
			{
				title: 'Hex',
				description_html:
					'Mark a Stress when a creature causes you or an ally nearby to mark Hit Points. Rolls against the Hexed creature gain a tier-based bonus until the Hex ends.',
				character_modifiers: [],
				weapon_modifiers: []
			},
			{
				title: 'Commune',
				description_html:
					'Once per long rest, commune with an ancestor, deity, spirit, or other being to ask a question and receive an omen.',
				character_modifiers: [],
				weapon_modifiers: []
			}
		],
		subclass_ids: ['witch_hedge', 'witch_moon'],
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
			class_gear_options: ['A small, harmless pet', 'A talking skull'],
			spellbook_prompt: 'Handwritten journal, runestones, etc.'
		},
		background_questions: [
			'How did you first discover your magical craft?',
			'Whom did you help with your power, and why did they come to you?',
			'What did your magic once open that should have stayed closed?'
		],
		connection_questions: [
			'Why do you come to me for advice?',
			'What about my magical practice makes you uneasy?',
			'What future vision did I once share with you?'
		],
		character_description_suggestions: {
			clothes: 'forboding, ragged, flowing, stately, diaphanous, uniquely patterned',
			eyes: 'carnations, earth, endless ocean, fire, ivy, lilacs, night, seafoam, winter',
			body: 'broad, carved, curvy, lanky, rotund, short, stocky, tall, thin, tiny, toned',
			skin: 'ashes, clover, falling snow, fine sand, obsidian, rose, sapphire, wisteria',
			attitude: 'a spider, a sunny day, a doctor, a candle flame, an old tree, an oracle'
		}
	}
} as const satisfies Record<string, CharacterClass>;
