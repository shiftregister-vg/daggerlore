import { describe, expect, it } from 'vitest';
import { SRD_COMPENDIUM } from '../../compendium/SRD';
import { CHARACTER_DEFAULTS } from '$lib/domain/constants/constants';
import { derive_character_state } from './derive_character';
import { getCompanionCommandRoll } from './companion-rolls';
import { applyProficiencyToDice, parseDiceString } from '$lib/utils';

function ranger(level = 2) {
	const character = structuredClone(CHARACTER_DEFAULTS);
	character.level = level;
	character.primary_class_id = 'ranger';
	character.primary_subclass_id = 'ranger_beastbound';
	character.selected_traits.agility = 2;
	return derive_character_state(character, SRD_COMPENDIUM);
}

describe('companion rolls', () => {
	it('uses the Ranger Spellcast trait and spellcast bonus', () => {
		const { derived } = ranger();
		expect(getCompanionCommandRoll(derived)).toEqual({ traitId: 'agility', modifier: 2 });
		derived.traits.agility = 4;
		derived.spellcast_roll_bonus = 1;
		expect(getCompanionCommandRoll(derived)).toEqual({ traitId: 'agility', modifier: 5 });
	});

	it('uses the companion-granting secondary subclass instead of the primary caster', () => {
		const { derived } = ranger();
		derived.secondary_subclass = derived.primary_subclass;
		derived.secondary_class = derived.primary_class;
		derived.primary_subclass = {
			...derived.primary_subclass!,
			foundation_card: { features: [], options: [] },
			spellcast_trait: 'knowledge'
		};
		derived.traits.knowledge = 5;
		expect(getCompanionCommandRoll(derived)).toEqual({ traitId: 'agility', modifier: 2 });
	});

	it('supports a changed subclass Spellcast trait and hides commands without a granting subclass', () => {
		const { derived } = ranger();
		derived.primary_subclass = { ...derived.primary_subclass!, spellcast_trait: 'instinct' };
		derived.traits.instinct = 3;
		expect(getCompanionCommandRoll(derived)).toEqual({ traitId: 'instinct', modifier: 3 });
		derived.primary_subclass = undefined;
		expect(getCompanionCommandRoll(derived)).toBeUndefined();
	});

	it.each([
		[1, 1],
		[2, 2],
		[5, 3],
		[8, 4]
	])('scales companion damage at level %i with derived Proficiency', (level, count) => {
		const { derived } = ranger(level);
		const dice = applyProficiencyToDice(
			derived.derived_companion!.attack!.damage_dice,
			derived.proficiency
		);
		expect(parseDiceString(dice).dice).toHaveLength(count);
		expect(parseDiceString(dice).dice.every((die) => die.type === 'd6')).toBe(true);
	});

	it('preserves Vicious upgrades and the damage bonus when scaling dice', () => {
		const { character } = ranger(2);
		character.companion!.level_up_choices = ['vicious'];
		character.companion!.choices.vicious = ['damage_dice'];
		character.companion!.attack!.damage_bonus = 3;
		const { derived } = derive_character_state(character, SRD_COMPENDIUM);
		expect(
			applyProficiencyToDice(derived.derived_companion!.attack!.damage_dice, derived.proficiency)
		).toBe('2d8');
		expect(derived.derived_companion!.attack!.damage_bonus).toBe(3);
	});
});
