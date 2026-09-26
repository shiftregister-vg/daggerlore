import { describe, expect, it } from 'vitest';
import { HAF_COMPENDIUM } from '../../compendium/Hope_and_Fear';
import { SRD_COMPENDIUM } from '../../compendium/SRD';
import { THE_VOID_COMPENDIUM } from '../../compendium/The_Void';
import { CHARACTER_DEFAULTS } from '$lib/domain/constants/constants';
import { CharacterSchema, type Character } from '$lib/domain/schemas/characters';
import { merge_compendium_content } from '$lib/utils';
import { derive_character_state } from './derive_character';

const compendium = merge_compendium_content(HAF_COMPENDIUM, SRD_COMPENDIUM, THE_VOID_COMPENDIUM);

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
		const result = derive_character_state(legacyCharacter(), compendium);

		expect(result.character.card_fields).toEqual({ orderborne: [] });
		expect(result.derived.ancestry_card?.title).toBe('Clank');
		expect(result.derived.community_card?.title).toBe('Orderborne');
		expect(result.derived.primary_subclass?.title).toBe('Call of the Slayer');
	});

	it('preserves hidden values while the character still possesses the card', () => {
		const character = legacyCharacter();
		character.card_fields = { orderborne: ['Honor', 'Service', 'Discipline'] };
		const reducedCompendium = structuredClone(compendium);
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
