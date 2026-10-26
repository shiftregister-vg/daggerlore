import { describe, expect, it } from 'vitest';
import { SRD_COMPENDIUM } from '../../compendium/SRD';
import { CHARACTER_DEFAULTS } from '$lib/domain/constants/constants';
import { CharacterModifierSchema } from '$lib/domain/schemas/rules';
import type { CompendiumContent } from '$lib/domain/schemas/compendium';
import { derive_character_state } from './derive_character';

function equipmentCharacter() {
	const character = structuredClone(CHARACTER_DEFAULTS);
	character.primary_class_id = 'wizard';
	character.primary_subclass_id = 'wizard_school_of_knowledge';
	character.selected_traits = { knowledge: 3, strength: 1, instinct: 2 };
	character.inventory.armor = [{ inventory_id: 'robes', base_armor_id: 'test_robes', choices: {} }];
	character.active_armor_inventory_id = 'robes';
	return character;
}
function equipmentCompendium() {
	const compendium: CompendiumContent = structuredClone(SRD_COMPENDIUM);
	compendium.armor.test_robes = {
		...structuredClone(compendium.armor.leather_armor),
		title: 'Mage Robes',
		max_armor: 2,
		damage_thresholds: { major: 4, severe: 10 },
		features: [
			{
				title: 'Enchanted',
				description_html: 'Spellcast trait to damage thresholds.',
				weapon_modifiers: [],
				character_modifiers: ['major_damage_threshold', 'severe_damage_threshold'].map((target) =>
					CharacterModifierSchema.parse({
						behaviour: 'bonus',
						character_conditions: [],
						target,
						type: 'derived_from_spellcast_trait',
						multiplier: 1
					})
				)
			}
		]
	};
	compendium.secondary_weapons.test_shield = {
		...structuredClone(compendium.secondary_weapons.round_shield),
		title: 'Rune Shield',
		features: [
			{
				title: 'Protective',
				description_html: '+1 Armor Score',
				weapon_modifiers: [],
				character_modifiers: [
					{
						behaviour: 'bonus',
						character_conditions: [],
						target: 'max_armor',
						type: 'flat',
						value: 1
					}
				]
			}
		]
	};
	return compendium;
}

describe('equipped passive stat modifiers (Forgejo #106)', () => {
	it('adds Spellcast to both Mage Robes thresholds, not damage rolls', () => {
		const character = equipmentCharacter();
		const compendium = equipmentCompendium();
		character.inventory.primary_weapons = [
			{ inventory_id: 'weapon', base_primary_weapon_id: 'broadsword', choices: {} }
		];
		character.active_primary_weapon_inventory_id = 'weapon';
		const result = derive_character_state(character, compendium);
		expect(result.derived.damage_thresholds).toEqual({ major: 8, severe: 14 });
		expect(result.derived.derived_primary_weapon?.damage_bonus).toBe(
			compendium.primary_weapons.broadsword.damage_bonus
		);
	});
	it('recalculates after a trait change without changing the armor definition', () => {
		const character = equipmentCharacter();
		const compendium = equipmentCompendium();
		const before = structuredClone(compendium);
		character.selected_traits.knowledge = 1;
		expect(derive_character_state(character, compendium).derived.damage_thresholds).toEqual({
			major: 6,
			severe: 12
		});
		character.selected_traits.knowledge = 4;
		expect(derive_character_state(character, compendium).derived.damage_thresholds).toEqual({
			major: 9,
			severe: 15
		});
		expect(compendium).toEqual(before);
	});
	it('uses the actual subclass casting trait and also supports a secondary caster', () => {
		const character = equipmentCharacter();
		const compendium = equipmentCompendium();
		compendium.subclasses.wizard_school_of_knowledge.spellcast_trait = 'instinct';
		expect(derive_character_state(character, compendium).derived.damage_thresholds).toEqual({
			major: 7,
			severe: 13
		});
		character.level = 5;
		character.level_up_choices[5] = { A: { option_id: 'tier_3_multiclass' } };
		character.primary_class_id = 'warrior';
		character.primary_subclass_id = 'warrior_call_of_the_slayer';
		character.secondary_class_id = 'wizard';
		character.secondary_subclass_id = 'wizard_school_of_knowledge';
		character.secondary_class_domain_id = 'codex';
		expect(derive_character_state(character, compendium).derived.damage_thresholds).toEqual({
			major: 11,
			severe: 17
		});
	});
	it('adds level even when an armor base threshold equals the unarmored threshold', () => {
		const character = equipmentCharacter();
		const compendium = equipmentCompendium();
		character.level = 5;
		character.primary_class_id = 'warrior';
		character.primary_subclass_id = 'warrior_call_of_the_slayer';
		compendium.armor.test_robes.damage_thresholds = { major: 5, severe: 10 };
		expect(derive_character_state(character, compendium).derived.damage_thresholds).toEqual({
			major: 10,
			severe: 15
		});
	});
	it('can use either available Spellcast trait for a passive bonus', () => {
		const character = equipmentCharacter();
		character.level = 5;
		character.level_up_choices[5] = { A: { option_id: 'tier_3_multiclass' } };
		character.secondary_class_id = 'seraph';
		character.secondary_subclass_id = 'seraph_divine_wielder';
		character.secondary_class_domain_id = 'splendor';
		character.selected_traits.strength = 4;
		expect(
			derive_character_state(character, equipmentCompendium()).derived.damage_thresholds
		).toEqual({ major: 13, severe: 19 });
	});

	it('uses zero without a casting trait, and does not turn a negative casting trait into zero', () => {
		const character = equipmentCharacter();
		const compendium = equipmentCompendium();
		character.primary_class_id = 'warrior';
		character.primary_subclass_id = 'warrior_call_of_the_slayer';
		expect(derive_character_state(character, compendium).derived.damage_thresholds).toEqual({
			major: 5,
			severe: 11
		});
		character.primary_class_id = 'wizard';
		character.primary_subclass_id = 'wizard_school_of_knowledge';
		character.selected_traits.knowledge = -1;
		expect(derive_character_state(character, compendium).derived.damage_thresholds).toEqual({
			major: 4,
			severe: 10
		});
	});
	it('adds Rune Shield Armor Score only while that inventory instance is equipped', () => {
		const character = equipmentCharacter();
		const compendium = equipmentCompendium();
		character.inventory.secondary_weapons = [
			{ inventory_id: 'shield', base_secondary_weapon_id: 'test_shield', choices: {} }
		];
		character.active_secondary_weapon_inventory_id = 'shield';
		expect(derive_character_state(character, compendium).derived.max_armor).toBe(3);
		character.active_secondary_weapon_inventory_id = undefined;
		expect(derive_character_state(character, compendium).derived.max_armor).toBe(2);
		character.active_armor_inventory_id = undefined;
		expect(derive_character_state(character, compendium).derived.damage_thresholds).toEqual({
			major: 1,
			severe: 2
		});
	});
});
