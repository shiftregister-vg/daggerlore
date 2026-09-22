import type { Subclass } from '@domain/schemas/compendium';
export const SUBCLASSES = {
	bard_troubadour: {
		source_key: 'SRD',
		class_id: 'bard',
		title: 'Troubadour',
		description_html: 'Play the Troubadour if you want to play music to bolster your allies.',
		// image_url: '/api/images/card/art/subclasses/troubadour.webp',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'presence',
		foundation_card: {
			features: [
				{
					title: 'Gifted Performer',
					description_html: `Describe how you perform for others. You can play each song once per long rest:
- **Relaxing Song:** You and all allies within Close range clear a Hit Point.
- **Epic Song:** Make a target within Close range temporarily *Vulnerable*.
- **Heartbreaking Song:** You and all allies within Close range gain a Hope.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Maestro',
					description_html:
						'Your rallying songs steel the courage of those who listen. When you give a Rally Die to an ally, they can immediately gain a Hope or clear a Stress.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Virtuoso',
					description_html:
						'You are among the greatest of your craft and your skill is boundless. You can perform each of your "Gifted Performer" feature\'s songs twice instead of once per long rest.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	bard_wordsmith: {
		source_key: 'SRD',
		class_id: 'bard',
		title: 'Wordsmith',
		description_html: 'Play the Wordsmith if you want to use clever wordplay and captivate crowds.',
		// image_url: '/api/images/card/art/subclasses/wordsmith.webp',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'presence',
		foundation_card: {
			features: [
				{
					title: 'Rousing Speech',
					description_html:
						'Once per long rest, you can give a heartfelt, inspiring speech. All allies within Far range clear 2 Stress.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Heart of a Poet',
					description_html:
						'After you make an action roll to impress, persuade, or offend someone, you can **spend a Hope** to add a **d4** to the roll.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Eloquent',
					description_html: `Your moving words can boost morale. Once per session, when you encourage an ally, you can do one of the following:
- Allow them to find a mundane object or tool they need.
- Help an Ally without spending Hope.
- Give them an additional downtime move during their next rest.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Epic Poetry',
					description_html:
						'Your Rally Die increases to a **d10**. Additionally, when you Help an Ally, you can narrate the moment as if you were writing the tale of their heroism in a memoir. When you do, roll a **d10** as your advantage die.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	druid_warden_of_renewal: {
		source_key: 'SRD',
		class_id: 'druid',
		title: 'Warden of Renewal',
		description_html: 'Play the Warden of Renewal if you want to focus on healing and protection.',
		// image_url: '/api/images/card/art/subclasses/warden-of-renewal.webp',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'instinct',
		foundation_card: {
			features: [
				{
					title: 'Clarity of Nature',
					description_html:
						'Once per long rest, you can create a space of natural serenity within Close range. When you spend a few minutes resting within the space, clear Stress equal to your Instinct, distributed as you choose between you and your allies.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Regeneration',
					description_html:
						'Touch a creature and **spend 3 Hope**. That creature clears **1d4** Hit Points.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Regenerative Reach',
					description_html:
						'You can target creatures within Very Close range with your "Regeneration" feature.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: "Warden's Protection",
					description_html:
						'Once per long rest, **spend 2 Hope** to clear 2 Hit Points on **1d4 allies** within Close range.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Healing Guardian Spirit',
					description_html:
						"When you're in Beastform and an ally within Close range marks 2 or more Hit Points, you can **mark a Stress** to reduce the number of Hit Points they mark by 1.",
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	druid_warden_of_the_elements: {
		source_key: 'SRD',
		class_id: 'druid',
		title: 'Warden of the Elements',
		description_html: 'Play the Warden of the Elements if you want to channel elemental power.',
		// image_url: '/api/images/card/art/subclasses/warden-of-the-elements.webp',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'instinct',
		foundation_card: {
			features: [
				{
					title: 'Elemental Incarnation',
					description_html: `**Mark a Stress** to *Channel* one of the following elements until you take Severe damage or until your next rest:
- **Fire:** When an adversary within Melee range deals damage to you, they take **1d10** magic damage.
- **Earth:** Gain a bonus to your damage thresholds equal to your Proficiency.
- **Water:** When you deal damage to an adversary within Melee range, all other adversaries within Very Close range must mark a Stress.
- **Air:** You can hover, gaining advantage on Agility Rolls.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Elemental Aura',
					description_html: `Once per rest while *Channeling*, you can assume an aura matching your element. The aura affects targets within Close range until your *Channeling* ends.
- **Fire:** When an adversary marks 1 or more Hit Points, they must also mark a Stress.
- **Earth:** Your allies gain a **+1** bonus to Strength.
- **Water:** When an adversary deals damage to you, you can **mark a Stress** to move them anywhere within Very Close range of where they are.
- **Air:** When you or an ally takes damage from an attack beyond Melee range, reduce the damage by **1d8**.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Elemental Dominion',
					description_html: `You further embody your element. While *Channeling*, you gain the following benefit:
- **Fire:** You gain a **+1** bonus to your Proficiency for attacks and spells that deal damage.
- **Earth:** When you would mark Hit Points, roll a **d6** per Hit Point marked. For each result of 6, reduce the number of Hit Points you mark by 1.
- **Water:** When an attack against you succeeds, you can **mark a Stress** to make the attacker temporarily *Vulnerable*.
- **Air:** You gain a **+1** bonus to your Evasion and can fly.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	guardian_stalwart: {
		source_key: 'SRD',
		class_id: 'guardian',
		title: 'Stalwart',
		description_html: 'Play the Stalwart if you want to be an unbreakable defender.',
		// image_url: '/api/images/card/art/subclasses/stalwart.webp',
		image_url: '',
		artist_name: '',
		foundation_card: {
			features: [
				{
					title: 'Unwavering',
					description_html: 'Gain a permanent **+1** bonus to your damage thresholds.',
					character_modifiers: [
						{
							behaviour: 'bonus',
							character_conditions: [],
							type: 'flat',
							value: 1,
							target: 'major_damage_threshold'
						},
						{
							behaviour: 'bonus',
							character_conditions: [],
							type: 'flat',
							value: 1,
							target: 'severe_damage_threshold'
						}
					],
					weapon_modifiers: []
				},
				{
					title: 'Iron Will',
					description_html:
						'When you take physical damage, you can mark an additional Armor Slot to reduce the severity.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Unrelenting',
					description_html: 'Gain a permanent **+2** bonus to your damage thresholds.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Partners in Arms',
					description_html:
						'When an ally within Very Close range takes damage, you can mark an Armor Slot to reduce the severity by one threshold.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Undaunted',
					description_html: 'Gain a permanent **+3** bonus to your damage thresholds.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Loyal Protector',
					description_html:
						'When an ally within Close range has 2 or fewer Hit Points and would take damage, you can **mark a Stress** to sprint to their side and take the damage instead.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	guardian_vengeance: {
		source_key: 'SRD',
		class_id: 'guardian',
		title: 'Vengeance',
		description_html: 'Play the Vengeance if you want to punish those who harm your allies.',
		// image_url: '/api/images/card/art/subclasses/vengeance.webp',
		image_url: '',
		artist_name: '',
		foundation_card: {
			features: [
				{
					title: 'At Ease',
					description_html: 'Gain an additional Stress slot.',
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
					title: 'Revenge',
					description_html:
						'When an adversary within Melee range succeeds on an attack against you, you can **mark 2 Stress** to force the attacker to mark a Hit Point.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Act of Reprisal',
					description_html:
						'When an adversary damages an ally within Melee range, you gain a **+1** bonus to your Proficiency for the next successful attack you make against that adversary.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Nemesis',
					description_html:
						'**Spend 2 Hope** to *Prioritize* an adversary until your next rest. When you make an attack against your *Prioritized* adversary, you can swap the results of your Hope and Fear Dice. You can only *Prioritize* one adversary at a time.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	ranger_wayfinder: {
		source_key: 'SRD',
		class_id: 'ranger',
		title: 'Wayfinder',
		description_html: 'Play the Wayfinder if you want to be a relentless tracker and hunter.',
		// image_url: '/api/images/card/art/subclasses/wayfinder.webp',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'agility',
		foundation_card: {
			features: [
				{
					title: 'Ruthless Predator',
					description_html:
						'When you make a damage roll, you can **mark a Stress** to gain a **+1** bonus to your Proficiency. Additionally, when you deal Severe damage to an adversary, they must mark a Stress.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Path Forward',
					description_html:
						"When you're traveling to a place you've previously visited or you carry an object that has been at the location before, you can identify the shortest, most direct path to your destination.",
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Elusive Predator',
					description_html:
						'When your *Focus* makes an attack against you, you gain a **+2** bonus to your Evasion against the attack.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Apex Predator',
					description_html:
						"Before you make an attack roll against your *Focus*, you can **spend a Hope**. On a successful attack, you remove a Fear from the GM's Fear pool.",
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	ranger_beastbound: {
		source_key: 'SRD',
		class_id: 'ranger',
		title: 'Beastbound',
		description_html: 'Play the Beastbound if you want to fight alongside an animal companion.',
		// image_url: '/api/images/card/art/subclasses/beastbound.webp',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'agility',
		foundation_card: {
			features: [
				{
					title: 'Companion',
					description_html:
						"You have an animal companion of your choice (at the GM's discretion). They stay by your side unless you tell them otherwise. Take the Ranger Companion sheet. When you level up your character, choose a level-up option for your companion from this sheet as well.",
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Expert Training',
					description_html: 'Choose an additional level-up option for your companion.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Battle-Bonded',
					description_html:
						"When an adversary attacks you while they're within your companion's Melee range, you gain a **+2** bonus to your Evasion against the attack.",
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Advanced Training',
					description_html: 'Choose two additional level-up options for your companion.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Loyal Friend',
					description_html:
						"Once per long rest, when the damage from an attack would mark your companion's last Stress or your last Hit Point and you're within Close range of each other, you or your companion can rush to the other's side and take that damage instead.",
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	rogue_syndicate: {
		source_key: 'SRD',
		class_id: 'rogue',
		title: 'Syndicate',
		description_html: 'Play the Syndicate if you want to leverage your network of contacts.',
		// image_url: '/api/images/card/art/subclasses/syndicate.webp',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'finesse',
		foundation_card: {
			features: [
				{
					title: 'Well-Connected',
					description_html: `When you arrive in a prominent town or environment, you know somebody who calls this place home. Give them a name, note how you think they could be useful, and choose one fact from the following list:
- They owe me a favor, but they'll be hard to find.
- They're going to ask for something in exchange.
- They're always in a great deal of trouble.
- We used to be together. It's a long story.
- We didn't part on great terms.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Contacts Everywhere',
					description_html: `Once per session, you can briefly call on a shady contact. Choose one of the following benefits and describe what brought them here to help you in this moment:
- They provide 1 handful of gold, a unique tool, or a mundane object that the situation requires.
- On your next action roll, their help provides a **+3** bonus to the result of your Hope or Fear Die.
- The next time you deal damage, they snipe from the shadows, adding **2d8** to your damage roll.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Reliable Backup',
					description_html: `You can use your "Contacts Everywhere" feature three times per session. The following options are added to the list of benefits you can choose from when you use that feature:
- When you mark 1 or more Hit Points, they can rush out to shield you, reducing the Hit Points marked by 1.
- When you make a Presence Roll in conversation, they back you up. You can roll a **d20** as your Hope Die.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	rogue_nightwalker: {
		source_key: 'SRD',
		class_id: 'rogue',
		title: 'Nightwalker',
		description_html: 'Play the Nightwalker if you want to master shadow and darkness.',
		// image_url: '/api/images/card/art/subclasses/nightwalker.webp',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'finesse',
		foundation_card: {
			features: [
				{
					title: 'Shadow Stepper',
					description_html:
						'You can move from shadow to shadow. When you move into an area of darkness or a shadow cast by another creature or object, you can **mark a Stress** to disappear from where you are and reappear inside another shadow within Far range. When you reappear, you are *Cloaked*.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Dark Cloud',
					description_html:
						"Make a Spellcast Roll (15). On a success, create a temporary dark cloud that covers any area within Close range. Anyone in this cloud can't see outside of it, and anyone outside of it can't see in. You're considered *Cloaked* from any adversary for whom the cloud blocks line of sight.",
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Adrenaline',
					description_html: "While you're *Vulnerable*, add your level to your damage rolls.",
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Fleeting Shadow',
					description_html:
						'Gain a permanent **+1** bonus to your Evasion. You can use your "Shadow Stepper" feature to move within Very Far range.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Vanishing Act',
					description_html:
						'**Mark a Stress** to become *Cloaked* at any time. When *Cloaked* from this feature, you automatically clear the *Restrained* condition if you have it. You remain *Cloaked* in this way until you roll with Fear or until your next rest.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	seraph_divine_wielder: {
		source_key: 'SRD',
		class_id: 'seraph',
		title: 'Divine Wielder',
		description_html:
			'Play the Divine Wielder if you want to channel divine power through your weapon.',
		// image_url: '/api/images/card/art/subclasses/divine-wielder.webp',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'strength',
		foundation_card: {
			features: [
				{
					title: 'Spirit Weapon',
					description_html:
						'When you have an equipped weapon with a range of Melee or Very Close, it can fly from your hand to attack an adversary within Close range and then return to you. You can **mark a Stress** to target an additional adversary within range with the same attack roll.',
					character_modifiers: [],
					weapon_modifiers: [
						{
							behaviour: 'override',
							target_weapon: 'primary',
							character_conditions: [],
							weapon_conditions: [
								{
									type: 'range',
									ranges: ['Melee', 'Very Close']
								}
							],
							target_stat: 'range',
							range: 'Close'
						},
						{
							behaviour: 'override',
							target_weapon: 'secondary',
							character_conditions: [],
							weapon_conditions: [
								{
									type: 'range',
									ranges: ['Melee', 'Very Close']
								}
							],
							target_stat: 'range',
							range: 'Close'
						}
					]
				},
				{
					title: 'Sparing Touch',
					description_html:
						'Once per long rest, touch a creature and clear 2 Hit Points or 2 Stress from them.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Devout',
					description_html:
						'When you roll your Prayer Dice, you can roll an additional die and discard the lowest result. Additionally, you can use your "Sparing Touch" feature twice instead of once per long rest.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Sacred Resonance',
					description_html:
						'When you roll damage for your "Spirit Weapon" feature, if any of the die results match, double the value of each matching die. For example, if you roll two 5s, they count as two 10s.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	seraph_winged_sentinel: {
		source_key: 'SRD',
		class_id: 'seraph',
		title: 'Winged Sentinel',
		description_html: 'Play the Winged Sentinel if you want to take flight and protect from above.',
		// image_url: '/api/images/card/art/subclasses/winged-sentinel.webp',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'strength',
		foundation_card: {
			features: [
				{
					title: 'Wings of Light',
					description_html: `You can fly. While flying, you can do the following:
- **Mark a Stress** to pick up and carry another willing creature approximately your size or smaller.
- **Spend a Hope** to deal an extra **1d8** damage on a successful attack.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Ethereal Visage',
					description_html:
						"Your supernatural visage strikes awe and fear. While flying, you have advantage on Presence Rolls. When you succeed with Hope on a Presence Roll, you can remove a Fear from the GM's Fear pool instead of gaining Hope.",
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Ascendant',
					description_html: 'Gain a permanent **+4** bonus to your Severe damage threshold.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Power of the Gods',
					description_html:
						'While flying, you deal an extra **1d12** damage instead of **1d8** with your "Wings of Light" feature.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	sorcerer_elemental_origin: {
		source_key: 'SRD',
		class_id: 'sorcerer',
		title: 'Elemental Origin',
		description_html: 'Play the Elemental Origin if you want to command the elements.',
		// image_url: '/api/images/card/art/subclasses/elemental-origin.webp',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'instinct',
		foundation_card: {
			features: [
				{
					title: 'Elementalist',
					description_html: `Choose one of the following elements at character creation:

**Air Â· Earth Â· Fire Â· Lightning Â· Water**

You can shape this element into harmless effects. Additionally, **spend a Hope** and describe how your control over this element helps an action roll you're about to make, then either gain a **+2** bonus to the roll or a **+3** bonus to the roll's damage.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Natural Evasion',
					description_html:
						'You can call forth your element to protect you from harm. When an attack roll against you succeeds, you can **mark a Stress** and describe how you use your element to defend you. When you do, roll a **d6** and add its result to your Evasion against the attack.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Transcendence',
					description_html: `Once per long rest, you can transform into a physical manifestation of your element. When you do, describe your transformation and choose two of the following benefits to gain until your next rest:
- **+4** bonus to your Severe threshold
- **+1** bonus to a character trait of your choice
- **+1** bonus to your Proficiency
- **+2** bonus to your Evasion`,
					character_modifiers: [
						{
							behaviour: 'bonus',
							character_conditions: [
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'transcendence_benefits',
									selection_id: 'severe_threshold_bonus'
								}
							],
							type: 'flat',
							value: 4,
							target: 'severe_damage_threshold'
						},
						{
							behaviour: 'bonus',
							character_conditions: [
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'transcendence_benefits',
									selection_id: 'proficiency_bonus'
								}
							],
							type: 'flat',
							value: 1,
							target: 'proficiency'
						},
						{
							behaviour: 'bonus',
							character_conditions: [
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'transcendence_benefits',
									selection_id: 'evasion_bonus'
								}
							],
							type: 'flat',
							value: 2,
							target: 'evasion'
						},
						{
							behaviour: 'bonus',
							character_conditions: [
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'choose_trait_bonus',
									selection_id: 'agility_bonus'
								},
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'transcendence_benefits',
									selection_id: 'character_trait_bonus'
								}
							],
							type: 'flat',
							value: 1,
							trait: 'agility',
							target: 'trait'
						},
						{
							behaviour: 'bonus',
							character_conditions: [
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'choose_trait_bonus',
									selection_id: 'strength_bonus'
								},
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'transcendence_benefits',
									selection_id: 'character_trait_bonus'
								}
							],
							type: 'flat',
							value: 1,
							target: 'trait',
							trait: 'strength'
						},
						{
							behaviour: 'bonus',
							character_conditions: [
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'choose_trait_bonus',
									selection_id: 'finesse_bonus'
								},
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'transcendence_benefits',
									selection_id: 'character_trait_bonus'
								}
							],
							type: 'flat',
							value: 1,
							target: 'trait',
							trait: 'finesse'
						},
						{
							behaviour: 'bonus',
							character_conditions: [
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'choose_trait_bonus',
									selection_id: 'instinct_bonus'
								},
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'transcendence_benefits',
									selection_id: 'character_trait_bonus'
								}
							],
							type: 'flat',
							value: 1,
							target: 'trait',
							trait: 'instinct'
						},
						{
							behaviour: 'bonus',
							character_conditions: [
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'choose_trait_bonus',
									selection_id: 'presence_bonus'
								},
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'transcendence_benefits',
									selection_id: 'character_trait_bonus'
								}
							],
							type: 'flat',
							value: 1,
							target: 'trait',
							trait: 'presence'
						},
						{
							behaviour: 'bonus',
							character_conditions: [
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'choose_trait_bonus',
									selection_id: 'knowledge_bonus'
								},
								{
									type: 'card_choice',
									card_id: 'sorcerer_elemental_origin_mastery',
									choice_id: 'transcendence_benefits',
									selection_id: 'character_trait_bonus'
								}
							],
							type: 'flat',
							value: 1,
							target: 'trait',
							trait: 'knowledge'
						}
					],
					weapon_modifiers: []
				}
			],
			options: [
				{
					choice_id: 'transcendence_benefits',
					type: 'arbitrary',
					max: 2,
					conditional_choice: null,
					options: [
						{
							selection_id: 'severe_threshold_bonus',
							title: '+4 bonus to your Severe threshold',
							short_title: '+4 Severe threshold'
						},
						{
							selection_id: 'character_trait_bonus',
							title: '+1 bonus to a character trait of your choice',
							short_title: '+1 to trait'
						},
						{
							selection_id: 'proficiency_bonus',
							title: '+1 bonus to your Proficiency',
							short_title: '+1 Proficiency'
						},
						{
							selection_id: 'evasion_bonus',
							title: '+2 bonus to your Evasion',
							short_title: '+2 Evasion'
						}
					]
				},
				{
					choice_id: 'choose_trait_bonus',
					type: 'arbitrary',
					max: 1,
					conditional_choice: {
						choice_id: 'transcendence_benefits',
						selection_id: 'character_trait_bonus'
					},
					options: [
						{
							selection_id: 'agility_bonus',
							title: '+1 bonus to Agility',
							short_title: '+1 Agility'
						},
						{
							selection_id: 'strength_bonus',
							title: '+1 bonus to Strength',
							short_title: '+1 Strength'
						},
						{
							selection_id: 'finesse_bonus',
							title: '+1 bonus to Finesse',
							short_title: '+1 Finesse'
						},
						{
							selection_id: 'instinct_bonus',
							title: '+1 bonus to Instinct',
							short_title: '+1 Instinct'
						},
						{
							selection_id: 'presence_bonus',
							title: '+1 bonus to Presence',
							short_title: '+1 Presence'
						},
						{
							selection_id: 'knowledge_bonus',
							title: '+1 bonus to Knowledge',
							short_title: '+1 Knowledge'
						}
					]
				}
			]
		}
	},
	sorcerer_primal_origin: {
		source_key: 'SRD',
		class_id: 'sorcerer',
		title: 'Primal Origin',
		description_html:
			'Play the Primal Origin if you want to manipulate the essence of magic itself.',
		// image_url: '/api/images/card/art/subclasses/primal-origin.webp',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'instinct',
		foundation_card: {
			features: [
				{
					title: 'Manipulate Magic',
					description_html: `Your primal origin allows you to modify the essence of magic itself. After you cast a spell or make an attack using a weapon that deals magic damage, you can **mark a Stress** to do one of the following:
- Extend the spell or attack's reach by one range
- Gain a **+2** bonus to the action roll's result
- Double a damage die of your choice
- Hit an additional target within range`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Enchanted Aid',
					description_html:
						'You can enhance the magic of others with your essence. When you Help an Ally with a Spellcast Roll, you can roll a **d8** as your advantage die. Once per long rest, after an ally has made a Spellcast Roll with your help, you can swap the results of their Duality Dice.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Arcane Charge',
					description_html: `You can gather magical energy to enhance your capabilities. When you take magic damage, you become *Charged*. Alternatively, you can **spend 2 Hope** to become *Charged*. When you successfully make an attack that deals magic damage while *Charged*, you can clear your *Charge* to either gain a +10 bonus to the damage roll or gain a +3 bonus to the Difficulty of a reaction roll the spell causes the target to make.

You stop being *Charged* at your next long rest.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	warrior_call_of_the_brave: {
		source_key: 'SRD',
		class_id: 'warrior',
		title: 'Call of the Brave',
		description_html:
			'Play Call of the Brave if you want to inspire courage and face danger head-on.',
		image_url: '',
		artist_name: '',
		foundation_card: {
			features: [
				{
					title: 'Courage',
					description_html: 'When you fail a roll with Fear, you gain a Hope.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Battle Ritual',
					description_html:
						'Once per long rest, before you attempt something incredibly dangerous or face off against a foe who clearly outmatches you, describe what ritual you perform or preparations you make. When you do, clear 2 Stress and gain 2 Hope.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Rise to the Challenge',
					description_html:
						'You are vigilant in the face of mounting danger. While you have 2 or fewer Hit Points unmarked, you can roll a **d20** as your Hope Die.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Camaraderie',
					description_html:
						'Your unwavering bravery is a rallying point for your allies. You can initiate a Tag Team Roll one additional time per session. Additionally, when an ally initiates a Tag Team Roll with you, they only need to spend 2 Hope to do so.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	warrior_call_of_the_slayer: {
		source_key: 'SRD',
		class_id: 'warrior',
		title: 'Call of the Slayer',
		description_html:
			'Play Call of the Slayer if you want to be a relentless combatant who builds power through battle.',
		image_url: '',
		artist_name: '',
		foundation_card: {
			tokens_enabled: true,
			token_label: 'Slayer Dice',
			features: [
				{
					title: 'Slayer',
					description_html: `You gain a pool of dice called Slayer Dice. On a roll with Hope, you can place a **d6** on this card instead of gaining a Hope, adding the die to the pool. You can store a number of Slayer Dice equal to your Proficiency. When you make an attack roll or damage roll, you can spend any number of these Slayer Dice, rolling them and adding their result to the roll. At the end of each session, clear any unspent Slayer Dice on this card and gain a Hope per die cleared.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Weapon Specialist',
					description_html: `You can wield multiple weapons with dangerous ease. When you succeed on an attack, you can spend a Hope to add one of the damage dice from your secondary weapon to the damage roll.

					Additionally, once per long rest when you roll your Slayer Dice, reroll any 1s.`,
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Martial Preparation',
					description_html:
						"You're an inspirational warrior to all who travel with you. Your party gains access to the Martial Preparation downtime move. To use this move during a rest, describe how you instruct and train with your party. You and each ally who chooses this downtime move gain a **d6 Slayer Die**. A PC with a Slayer Die can spend it to roll the die and add the result to an attack or damage roll of their choice.",
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	},
	wizard_school_of_knowledge: {
		source_key: 'SRD',
		class_id: 'wizard',
		title: 'School of Knowledge',
		description_html:
			'Play School of Knowledge if you want to master the arcane through study and preparation.',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'knowledge',
		foundation_card: {
			features: [
				{
					title: 'Prepared',
					description_html:
						'Take an additional domain card of your level or lower from a domain you have access to.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Adept',
					description_html:
						'When you Utilize an Experience, you can mark a Stress instead of spending a Hope. If you do, double your Experience modifier for that roll.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: [],
			level_up_options: [
				{
					type: 'domain_card',
					max: 1,
					option_id: 'wizard_school_of_knowledge_prepared_domain_card',
					title:
						'Take an additional domain card of your level or lower from a domain you have access to.',
					short_title: 'Prepared'
				}
			]
		},
		specialization_card: {
			features: [
				{
					title: 'Accomplished',
					description_html:
						'Take an additional domain card of your level or lower from a domain you have access to.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Perfect Recall',
					description_html:
						'Once per rest, when you recall a domain card in your vault, you can reduce its Recall Cost by 1.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: [],
			level_up_options: [
				{
					type: 'domain_card',
					max: 1,
					option_id: 'wizard_school_of_knowledge_accomplished_domain_card',
					title:
						'Take an additional domain card of your level or lower from a domain you have access to.',
					short_title: 'Accomplished'
				}
			]
		},
		mastery_card: {
			features: [
				{
					title: 'Brilliant',
					description_html:
						'Take an additional domain card of your level or lower from a domain you have access to.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Honed Expertise',
					description_html:
						'When you use an Experience, roll a **d6**. On a result of 5 or higher, you can use it without spending Hope.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: [],
			level_up_options: [
				{
					type: 'domain_card',
					max: 1,
					option_id: 'wizard_school_of_knowledge_brilliant_domain_card',
					title:
						'Take an additional domain card of your level or lower from a domain you have access to.',
					short_title: 'Brilliant'
				}
			]
		}
	},
	wizard_school_of_war: {
		source_key: 'SRD',
		class_id: 'wizard',
		title: 'School of War',
		description_html:
			'Play School of War if you want to be a battle-focused wizard who thrives in combat.',
		image_url: '',
		artist_name: '',
		spellcast_trait: 'knowledge',
		foundation_card: {
			features: [
				{
					title: 'Battlemage',
					description_html:
						"You've focused your studies on becoming an unconquerable force on the battlefield. Gain an additional Hit Point slot.",
					character_modifiers: [
						{
							behaviour: 'bonus',
							character_conditions: [],
							type: 'flat',
							value: 1,
							target: 'max_hp'
						}
					],
					weapon_modifiers: []
				},
				{
					title: 'Face Your Fear',
					description_html:
						'When you succeed with Fear on an attack roll, you deal an extra **1d10** magic damage.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		specialization_card: {
			features: [
				{
					title: 'Conjure Shield',
					description_html:
						'You can maintain a protective barrier of magic. While you have at least 2 Hope, you add your Proficiency to your Evasion.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Fueled by Fear',
					description_html:
						'The extra magic damage from your "Face Your Fear" feature increases to **2d10**.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		},
		mastery_card: {
			features: [
				{
					title: 'Thrive in Chaos',
					description_html:
						'When you succeed on an attack, you can mark a Stress after rolling damage to force the target to mark an additional Hit Point.',
					character_modifiers: [],
					weapon_modifiers: []
				},
				{
					title: 'Have No Fear',
					description_html:
						'The extra magic damage from your "Face Your Fear" feature increases to **3d10**.',
					character_modifiers: [],
					weapon_modifiers: []
				}
			],
			options: []
		}
	}
} satisfies Record<string, Subclass>;
