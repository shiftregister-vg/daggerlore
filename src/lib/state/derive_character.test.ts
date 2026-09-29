import { describe, expect, it } from 'vitest';
import { HAF_COMPENDIUM } from '../../compendium/Hope_and_Fear';
import { SRD_COMPENDIUM } from '../../compendium/SRD';
import { THE_VOID_COMPENDIUM } from '../../compendium/The_Void';
import { CHARACTER_DEFAULTS } from '$lib/domain/constants/constants';
import { CharacterSchema, type Character } from '$lib/domain/schemas/characters';
import {
	AncestryCardSchema,
	CharacterClassSchema,
	CommunityCardSchema,
	DomainCardSchema,
	SubclassSchema
} from '$lib/domain/schemas/compendium';
import { merge_compendium_content } from '$lib/utils';
import { derive_character_state } from './derive_character';

const compendium = merge_compendium_content(HAF_COMPENDIUM, SRD_COMPENDIUM, THE_VOID_COMPENDIUM);

/** Orderborne as published before v3: sayings stored in a community field group, no record. */
function fieldGroupCompendium() {
	const pinned = structuredClone(compendium);
	const orderborne = pinned.community_cards.orderborne;
	orderborne.field_group = { name: 'Sayings or Values', count: 3 };
	for (const feature of orderborne.features) delete feature.records;
	return pinned;
}

function legacyCharacter(): Character {
	const character = structuredClone(CHARACTER_DEFAULTS) as Character & {
		card_fields?: Record<string, string[]>;
	};
	character.level = 2;
	character.ancestry_card_id = 'clank';
	character.community_card_id = 'orderborne';
	character.primary_class_id = 'warrior';
	character.primary_subclass_id = 'warrior_call_of_the_slayer';
	Reflect.deleteProperty(character, 'card_fields');
	return character as Character;
}

describe('character card field normalization', () => {
	it('applies an empty field map while parsing legacy API data', () => {
		const character = legacyCharacter();
		expect(CharacterSchema.parse(character).card_fields).toEqual({});
	});

	it('applies an empty project list while parsing legacy API data', () => {
		const character = legacyCharacter() as Character & { long_term_projects?: unknown[] };
		Reflect.deleteProperty(character, 'long_term_projects');
		expect(CharacterSchema.parse(character).long_term_projects).toEqual([]);
	});

	it('loads legacy characters without card field data while preserving their cards', () => {
		const result = derive_character_state(legacyCharacter(), fieldGroupCompendium());

		expect(result.character.card_fields).toEqual({ orderborne: [] });
		expect(result.derived.ancestry_card?.title).toBe('Clank');
		expect(result.derived.community_card?.title).toBe('Orderborne');
		expect(result.derived.primary_subclass?.title).toBe('Call of the Slayer');
	});

	it('preserves hidden values while the character still possesses the card', () => {
		const character = legacyCharacter();
		character.card_fields = { orderborne: ['Honor', 'Service', 'Discipline'] };
		const reducedCompendium = fieldGroupCompendium();
		reducedCompendium.community_cards.orderborne.field_group = {
			name: 'Principles',
			count: 1
		};

		const reduced = derive_character_state(character, reducedCompendium);
		expect(reduced.character.card_fields.orderborne).toEqual(['Honor', 'Service', 'Discipline']);

		delete reducedCompendium.community_cards.orderborne.field_group;
		const removedConfiguration = derive_character_state(character, reducedCompendium);
		expect(removedConfiguration.character.card_fields.orderborne).toEqual([
			'Honor',
			'Service',
			'Discipline'
		]);
	});

	it('discards values after the character no longer possesses the card', () => {
		const character = legacyCharacter();
		character.card_fields = { orderborne: ['Honor', 'Service', 'Discipline'] };
		character.community_card_id = undefined;

		const result = derive_character_state(character, compendium);
		expect(result.character.card_fields).toEqual({});
	});
});

describe('active transformation normalization', () => {
	const transformationId = 'test_transformation';
	const transformationCompendium = structuredClone(compendium);
	transformationCompendium.transformations[transformationId] = {
		source_key: 'SRD',
		title: 'Test Transformation',
		description_html: 'A temporary form.',
		features: [{ name: 'Changed', description_html: 'You are visibly changed.' }],
		questions: []
	};

	it('preserves an active transformation the character possesses', () => {
		const character = legacyCharacter();
		character.transformation_card_id = transformationId;
		character.active_transformation_card_id = transformationId;

		const result = derive_character_state(character, transformationCompendium);

		expect(result.character.active_transformation_card_id).toBe(transformationId);
		expect(result.derived.transformation_card?.title).toBe('Test Transformation');
	});

	it('ends the transformation after its card is removed', () => {
		const character = legacyCharacter();
		character.active_transformation_card_id = transformationId;

		const result = derive_character_state(character, transformationCompendium);

		expect(result.character.active_transformation_card_id).toBeUndefined();
	});
});

describe('No Mercy', () => {
	it('applies the tracked bonus to every weapon attack roll', () => {
		const character = legacyCharacter();
		character.feature_choices.no_mercy_bonus = ['3'];
		character.inventory.primary_weapons = [
			{ inventory_id: 'primary', base_primary_weapon_id: 'broadsword', choices: {} }
		];
		character.inventory.secondary_weapons = [
			{ inventory_id: 'secondary', base_secondary_weapon_id: 'shortsword', choices: {} }
		];
		character.active_primary_weapon_inventory_id = 'primary';
		character.active_secondary_weapon_inventory_id = 'secondary';

		const result = derive_character_state(character, compendium);

		expect(result.derived.hasNoMercyHopeFeature).toBe(true);
		expect(result.derived.no_mercy_bonus).toBe(3);
		expect(result.derived.derived_primary_weapon?.attack_roll_bonus).toBe(4);
		expect(result.derived.derived_secondary_weapon?.attack_roll_bonus).toBe(3);
		expect(result.derived.derived_unarmed_attack.attack_roll_bonus).toBe(3);
	});

	it('removes stale No Mercy state from non-warriors', () => {
		const character = legacyCharacter();
		character.primary_class_id = undefined;
		character.primary_subclass_id = undefined;
		character.feature_choices.no_mercy_bonus = ['3'];

		const result = derive_character_state(character, compendium);

		expect(result.character.feature_choices.no_mercy_bonus).toBeUndefined();
		expect(result.derived.no_mercy_bonus).toBe(0);
	});
});

describe('companion Experience normalization', () => {
	function ranger(level = 2): Character {
		const character = structuredClone(CHARACTER_DEFAULTS);
		character.level = level;
		character.primary_class_id = 'ranger';
		character.primary_subclass_id = 'ranger_beastbound';
		return character;
	}

	it.each([
		[1, 2],
		[2, 3],
		[5, 4],
		[8, 5]
	])('creates all earned companion slots at level %i', (level, count) => {
		const result = derive_character_state(ranger(level), compendium);
		expect(result.character.companion?.experiences).toHaveLength(count);
		expect(result.derived.derived_companion?.experiences).toHaveLength(count);
	});

	it('repairs legacy slots, persists a new name, and applies Intelligent to it', () => {
		const initial = derive_character_state(ranger(1), compendium).character;
		initial.companion!.experiences = ['Tracker', 'Guardian'];
		initial.level = 2;
		const upgraded = derive_character_state(initial, compendium);
		expect(upgraded.character.companion!.experiences).toEqual(['Tracker', 'Guardian', '']);
		expect(initial.companion!.experiences).toEqual(['Tracker', 'Guardian']);

		upgraded.character.companion!.experiences[2] = 'Scout';
		upgraded.character.companion!.level_up_choices = ['intelligent'];
		upgraded.character.companion!.choices.intelligent = ['2'];
		const saved = CharacterSchema.parse(JSON.parse(JSON.stringify(upgraded.character)));
		const reloaded = derive_character_state(saved, compendium);
		expect(reloaded.derived.derived_companion!.experiences).toEqual([
			'Tracker',
			'Guardian',
			'Scout'
		]);
		expect(reloaded.derived.derived_companion!.experience_modifiers).toEqual([2, 2, 3]);
		expect(derive_character_state(reloaded.character, compendium).didCorrectCharacter).toBe(false);
	});

	it('preserves hidden names when lowering the level and restores them on level up', () => {
		const character = derive_character_state(ranger(5), compendium).character;
		character.companion!.experiences = ['Tracker', 'Guardian', 'Scout', 'Hunter'];
		character.level = 1;
		const lowered = derive_character_state(character, compendium);
		expect(lowered.character.companion!.experiences).toHaveLength(4);
		expect(lowered.derived.derived_companion!.experiences).toEqual(['Tracker', 'Guardian']);
		lowered.character.level = 5;
		const restored = derive_character_state(lowered.character, compendium);
		expect(restored.derived.derived_companion!.experiences).toEqual([
			'Tracker',
			'Guardian',
			'Scout',
			'Hunter'
		]);
	});
});

describe('feature usage trackers', () => {
	const bondKey = 'domain_cards:a_soldiers_bond:soldiers_bond';

	function bondCharacter(): Character {
		const character = legacyCharacter();
		character.additional_domain_card_ids = [{ domain_id: 'blade', card_id: 'a_soldiers_bond' }];
		return character;
	}

	it('exposes trackers for owned configured features', () => {
		const result = derive_character_state(bondCharacter(), compendium);
		const bond = result.derived.usage_trackers.find((tracker) => tracker.key === bondKey);

		expect(bond).toMatchObject({ max_uses: 1, reset: 'long_rest' });
		expect(bond?.label).toBeUndefined();
	});

	it('applies an empty usage map while parsing legacy API data', () => {
		const character = legacyCharacter() as Character & { feature_uses?: unknown };
		Reflect.deleteProperty(character, 'feature_uses');
		expect(CharacterSchema.parse(character).feature_uses).toEqual({});
	});

	it('carries a legacy Used token over to the usage tracker once', () => {
		const character = bondCharacter();
		character.card_tokens = { a_soldiers_bond: 1 };

		const result = derive_character_state(character, compendium);

		expect(result.character.card_tokens.a_soldiers_bond).toBeUndefined();
		expect(result.character.feature_uses[bondKey]).toBe(1);
	});

	it('does not overwrite tracker state with a stale legacy token', () => {
		const character = bondCharacter();
		character.card_tokens = { a_soldiers_bond: 1 };
		character.feature_uses = { [bondKey]: 0 };

		const result = derive_character_state(character, compendium);

		expect(result.character.card_tokens.a_soldiers_bond).toBeUndefined();
		expect(result.character.feature_uses[bondKey]).toBeUndefined();
	});

	it('keeps the legacy token while the pinned version still uses tokens', () => {
		const character = bondCharacter();
		character.card_tokens = { a_soldiers_bond: 1 };
		const pinnedCompendium = structuredClone(compendium);
		const bond = pinnedCompendium.domain_cards.a_soldiers_bond;
		bond.tokens_enabled = true;
		bond.token_max = 1;
		delete bond.features[0].usage;

		const result = derive_character_state(character, pinnedCompendium);

		expect(result.character.card_tokens.a_soldiers_bond).toBe(1);
		expect(result.character.feature_uses).toEqual({});
	});

	it('keeps spent uses through vault moves and discards them when the card is removed', () => {
		const character = bondCharacter();
		character.feature_uses = { [bondKey]: 1 };
		character.loadout_domain_card_ids = [];

		expect(derive_character_state(character, compendium).character.feature_uses).toEqual({
			[bondKey]: 1
		});

		character.additional_domain_card_ids = [];
		expect(derive_character_state(character, compendium).character.feature_uses).toEqual({});
	});
});

describe('feature resource pools', () => {
	const prayerKey = 'classes:seraph:prayer_dice';

	function seraph(): Character {
		const character = legacyCharacter();
		character.level = 5;
		character.primary_class_id = 'seraph';
		character.primary_subclass_id = 'seraph_divine_wielder';
		character.selected_traits = { ...character.selected_traits, strength: 2, presence: 1 };
		character.additional_domain_card_ids = [
			{ domain_id: 'grace', card_id: 'inspirational_words' },
			{ domain_id: 'arcana', card_id: 'unleash_chaos' }
		];
		return character;
	}

	it('publishes valid pool configuration for the proof content', () => {
		for (const id of ['inspirational_words', 'restoration', 'unleash_chaos']) {
			expect(() => DomainCardSchema.parse(compendium.domain_cards[id])).not.toThrow();
		}
		expect(() => CharacterClassSchema.parse(compendium.classes.seraph)).not.toThrow();
	});

	it('resolves pools from the character, without capping a starting amount', () => {
		const result = derive_character_state(seraph(), compendium);
		const byKey = Object.fromEntries(
			result.derived.pool_trackers.map((tracker) => [tracker.key, tracker])
		);
		const strength = result.derived.traits.strength ?? 0;
		const presence = result.derived.traits.presence ?? 0;

		expect(byKey[prayerKey]).toMatchObject({ kind: 'dice', die: 'd4', refill: strength });
		expect(byKey['domain_cards:inspirational_words:inspirational_words']).toMatchObject({
			refill: presence,
			capacity: undefined
		});
		expect(byKey['domain_cards:unleash_chaos:unleash_chaos']).toMatchObject({
			refill: strength,
			capacity: strength
		});
	});

	it('carries generic card tokens into the pool that replaced them', () => {
		const character = seraph();
		character.card_tokens = { inspirational_words: 2 };

		const result = derive_character_state(character, compendium);

		expect(result.character.card_tokens.inspirational_words).toBeUndefined();
		expect(
			result.character.feature_pool_tokens['domain_cards:inspirational_words:inspirational_words']
		).toBe(2);
	});

	it('moves stored Prayer Dice into the dice pool', () => {
		const character = seraph();
		character.feature_choices = {
			...character.feature_choices,
			prayer_dice_values: ['3', '', '9']
		};

		const result = derive_character_state(character, compendium);

		expect(result.character.feature_choices.prayer_dice_values).toBeUndefined();
		expect(result.character.feature_pool_dice[prayerKey]).toEqual([3, 0, 0]);
	});

	it('discards pool state when the item is removed', () => {
		const character = seraph();
		character.feature_pool_tokens = { 'domain_cards:inspirational_words:inspirational_words': 2 };
		character.additional_domain_card_ids = [];

		expect(derive_character_state(character, compendium).character.feature_pool_tokens).toEqual({});
	});
});

describe('feature records', () => {
	const sayingsKey = 'community_cards:orderborne:sayings_or_values';

	it('publishes valid record configuration for the proof content', () => {
		for (const id of ['signature_move', 'know_thy_enemy', 'healing_hands']) {
			expect(() => DomainCardSchema.parse(compendium.domain_cards[id])).not.toThrow();
		}
		expect(() => CommunityCardSchema.parse(compendium.community_cards.orderborne)).not.toThrow();
		expect(() => AncestryCardSchema.parse(compendium.ancestry_cards.drakona)).not.toThrow();
	});

	it('exposes record trackers for owned features', () => {
		const character = legacyCharacter();
		character.ancestry_card_id = 'drakona';
		character.additional_domain_card_ids = [{ domain_id: 'bone', card_id: 'know_thy_enemy' }];

		const keys = derive_character_state(character, compendium).derived.record_trackers.map(
			(tracker) => tracker.key
		);

		expect(keys).toEqual(
			expect.arrayContaining([
				sayingsKey,
				'ancestry_cards:drakona:breath_element',
				'domain_cards:know_thy_enemy:dossier'
			])
		);
	});

	it('carries Orderborne field values into its record once', () => {
		const character = legacyCharacter();
		character.card_fields = { orderborne: ['Honor', '', 'Discipline'] };

		const result = derive_character_state(character, compendium);

		expect(result.character.card_fields.orderborne).toBeUndefined();
		expect(result.character.feature_records[sayingsKey]).toEqual([
			{ id: 'legacy-orderborne', values: { first: 'Honor', third: 'Discipline' } }
		]);
	});

	it('does not overwrite an existing record with stale field values', () => {
		const character = legacyCharacter();
		character.card_fields = { orderborne: ['Old'] };
		character.feature_records = { [sayingsKey]: [{ id: 'e1', values: { first: 'New' } }] };

		const result = derive_character_state(character, compendium);

		expect(result.character.card_fields.orderborne).toBeUndefined();
		expect(result.character.feature_records[sayingsKey]).toEqual([
			{ id: 'e1', values: { first: 'New' } }
		]);
	});

	it('discards records when the item is removed', () => {
		const character = legacyCharacter();
		character.feature_records = { [sayingsKey]: [{ id: 'e1', values: { first: 'Honor' } }] };
		character.community_card_id = undefined;

		expect(derive_character_state(character, compendium).character.feature_records).toEqual({});
	});
});

describe('feature effects', () => {
	const dodgeKey = 'classes:rogue:rogues_dodge';
	const focusKey = 'domain_cards:deadly_focus:deadly_focus';
	const frenzyKey = 'domain_cards:frenzy:frenzy';
	const reprisalKey = 'subclasses:guardian_vengeance:act_of_reprisal';
	const started_at = '2026-09-28T00:00:00.000Z';

	function rogue(): Character {
		const character = legacyCharacter();
		character.primary_class_id = 'rogue';
		character.primary_subclass_id = 'rogue_syndicate';
		const cards = [
			{ domain_id: 'blade', card_id: 'deadly_focus' },
			{ domain_id: 'blade', card_id: 'frenzy' }
		] as Character['additional_domain_card_ids'];
		character.additional_domain_card_ids = cards;
		character.loadout_domain_card_ids = cards;
		return character;
	}

	it('publishes valid effect configuration for the proof content', () => {
		for (const id of ['deadly_focus', 'frenzy']) {
			expect(() => DomainCardSchema.parse(compendium.domain_cards[id])).not.toThrow();
		}
		for (const id of ['rogue', 'ranger']) {
			expect(() => CharacterClassSchema.parse(compendium.classes[id])).not.toThrow();
		}
		expect(() => SubclassSchema.parse(compendium.subclasses.guardian_vengeance)).not.toThrow();
	});

	it("raises Evasion only while Rogue's Dodge is active", () => {
		const character = rogue();
		const inactive = derive_character_state(character, compendium).derived;
		expect(inactive.effect_trackers.map((tracker) => tracker.key)).toEqual(
			expect.arrayContaining([dodgeKey, focusKey, frenzyKey])
		);

		character.active_effects = { [dodgeKey]: [{ id: 'a', started_at }] };
		const active = derive_character_state(character, compendium).derived;
		expect(active.evasion).toBe(inactive.evasion + 2);
	});

	it('applies Frenzy to the Severe threshold and weapon damage', () => {
		const character = rogue();
		const inactive = derive_character_state(character, compendium).derived;
		character.active_effects = { [frenzyKey]: [{ id: 'a', started_at }] };
		const active = derive_character_state(character, compendium).derived;

		expect(active.damage_thresholds.severe).toBe(inactive.damage_thresholds.severe + 8);
		expect(active.damage_thresholds.major).toBe(inactive.damage_thresholds.major);
		expect(active.derived_unarmed_attack.damage_bonus).toBe(
			inactive.derived_unarmed_attack.damage_bonus + 10
		);
	});

	it('suspends Deadly Focus while its card is in the vault and drops it when removed', () => {
		const character = rogue();
		const base = derive_character_state(character, compendium).derived.proficiency;
		character.active_effects = { [focusKey]: [{ id: 'a', started_at, target: 'Troll' }] };
		expect(derive_character_state(character, compendium).derived.proficiency).toBe(base + 1);

		character.loadout_domain_card_ids = [{ domain_id: 'blade', card_id: 'frenzy' }];
		const vaulted = derive_character_state(character, compendium);
		expect(vaulted.derived.proficiency).toBe(base);
		expect(vaulted.character.active_effects[focusKey]).toHaveLength(1);
		expect(
			vaulted.derived.effect_trackers.find((tracker) => tracker.key === focusKey)?.eligible
		).toBe(false);

		character.additional_domain_card_ids = [{ domain_id: 'blade', card_id: 'frenzy' }];
		expect(derive_character_state(character, compendium).character.active_effects).toEqual({});
	});

	it('keeps against-target Proficiency off the sheet', () => {
		const character = legacyCharacter();
		character.level = 5;
		character.primary_class_id = 'guardian';
		character.primary_subclass_id = 'guardian_vengeance';
		// Act of Reprisal is on the specialization card.
		character.level_up_choices[5] = {
			...character.level_up_choices[5],
			A: {
				...character.level_up_choices[5]?.A,
				option_id: 'tier_3_subclass_upgrade',
				selected_subclass_upgrade: 'primary'
			}
		} as Character['level_up_choices'][5];
		const base = derive_character_state(character, compendium).derived;
		expect(base.effect_trackers.map((tracker) => tracker.key)).toContain(reprisalKey);

		character.active_effects = {
			[reprisalKey]: [
				{ id: 'a', started_at, target: 'Troll' },
				{ id: 'b', started_at, target: 'Ogre' }
			]
		};
		const result = derive_character_state(character, compendium);
		expect(result.derived.proficiency).toBe(base.proficiency);
		expect(result.character.active_effects[reprisalKey]).toHaveLength(2);
	});
});

describe('roll options', () => {
	const swapKey = 'domain_cards:arcana_touched:arcana_touched_swap';
	const hopeDieKey = 'domain_cards:signature_move:signature_move_hope_die';

	function caster(cards: { domain_id: string; card_id: string }[]): Character {
		const character = legacyCharacter();
		character.level = 8;
		character.additional_domain_card_ids = cards as Character['additional_domain_card_ids'];
		character.loadout_domain_card_ids = cards as Character['loadout_domain_card_ids'];
		return character;
	}

	it('publishes valid roll option configuration for the proof content', () => {
		for (const id of ['signature_move', 'arcana_touched', 'unleash_chaos']) {
			expect(() => DomainCardSchema.parse(compendium.domain_cards[id])).not.toThrow();
		}
		for (const id of ['seraph', 'ranger']) {
			expect(() => CharacterClassSchema.parse(compendium.classes[id])).not.toThrow();
		}
	});

	it('exposes options for owned features and gates a card in the vault', () => {
		const character = caster([{ domain_id: 'bone', card_id: 'signature_move' }]);
		const loaded = derive_character_state(character, compendium).derived.roll_option_trackers;
		expect(loaded.find((tracker) => tracker.key === hopeDieKey)?.eligible).toBe(true);

		character.loadout_domain_card_ids = [];
		const vaulted = derive_character_state(character, compendium).derived.roll_option_trackers;
		expect(vaulted.find((tracker) => tracker.key === hopeDieKey)).toMatchObject({
			eligible: false,
			ineligible_reason: 'Inactive while this card is in your vault'
		});
	});

	it("requires four Arcana cards in the loadout for Arcana-Touched's swap", () => {
		const arcana = ['rune_ward', 'unleash_chaos', 'wall_walk', 'cinder_grasp'].map((card_id) => ({
			domain_id: 'arcana',
			card_id
		}));
		const three = caster([
			{ domain_id: 'arcana', card_id: 'arcana_touched' },
			...arcana.slice(0, 2)
		]);
		const tooFew = derive_character_state(three, compendium).derived.roll_option_trackers;
		expect(tooFew.find((tracker) => tracker.key === swapKey)).toMatchObject({
			eligible: false,
			ineligible_reason: "This card's requirements aren't met"
		});

		const enough = caster([{ domain_id: 'arcana', card_id: 'arcana_touched' }, ...arcana]);
		const four = derive_character_state(enough, compendium).derived.roll_option_trackers;
		expect(four.find((tracker) => tracker.key === swapKey)?.eligible).toBe(true);
	});

	it('links options to their pools, uses and required effects', () => {
		const character = legacyCharacter();
		character.level = 5;
		character.primary_class_id = 'ranger';
		character.primary_subclass_id = 'ranger_wayfinder';
		const trackers = derive_character_state(character, compendium).derived.roll_option_trackers;
		const reroll = trackers.find(
			(tracker) => tracker.key === 'classes:ranger:rangers_focus_reroll'
		);
		expect(reroll?.effect?.key).toBe('classes:ranger:rangers_focus');
		expect(reroll?.option.ends_effect).toBe(true);
	});
});
