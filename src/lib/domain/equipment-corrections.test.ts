import { describe, expect, it } from 'vitest';
import { CharacterModifierSchema, WeaponModifierSchema } from './schemas/rules';
import {
	EQUIPMENT_CORRECTIONS,
	prepareEquipmentCorrections
} from '../../../scripts/compendium/prepare-equipment-corrections';

const rows = () =>
	EQUIPMENT_CORRECTIONS.map((correction) => ({
		source_key: 'HAF',
		item_type: correction.item_type,
		item_id: correction.item_id,
		current_version: 1,
		item: {
			source_key: 'HAF',
			future: 'preserve',
			features: [
				{
					title: correction.feature,
					description_html: 'Unchanged rules text',
					character_modifiers: [],
					weapon_modifiers: [],
					future: true
				}
			]
		}
	}));

describe('offline equipment correction plan', () => {
	it('prepares only validated modifier data, without modifying exported definitions', () => {
		const input = rows();
		const before = structuredClone(input);
		const plan = prepareEquipmentCorrections(input);
		expect(plan.conflicts).toEqual([]);
		expect(plan.updates).toHaveLength(EQUIPMENT_CORRECTIONS.length);
		expect(input).toEqual(before);
		for (const update of plan.updates) {
			expect(update.expected_current_version).toBe(1);
			for (const modifier of update.character_modifiers)
				expect(CharacterModifierSchema.safeParse(modifier).success).toBe(true);
			for (const modifier of update.weapon_modifiers)
				expect(WeaponModifierSchema.safeParse(modifier).success).toBe(true);
		}
		expect(plan.updates.find((item) => item.item_id === 'mage_robes')?.character_modifiers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					target: 'major_damage_threshold',
					type: 'derived_from_spellcast_trait'
				}),
				expect.objectContaining({
					target: 'severe_damage_threshold',
					type: 'derived_from_spellcast_trait'
				})
			])
		);
		expect(
			plan.updates.find((item) => item.item_id === 'legendary_rune_shield')?.character_modifiers
		).toEqual([expect.objectContaining({ target: 'max_armor', value: 4 })]);
	});
	it('is idempotent after the prepared modifiers are published', () => {
		const input = rows();
		const plan = prepareEquipmentCorrections(input);
		const corrected = input.map((row) => {
			const update = plan.updates.find(
				(item) => item.item_type === row.item_type && item.item_id === row.item_id
			)!;
			return {
				...row,
				item: {
					...row.item,
					features: row.item.features.map((feature) => ({
						...feature,
						character_modifiers: update.character_modifiers,
						weapon_modifiers: update.weapon_modifiers
					}))
				}
			};
		});
		expect(prepareEquipmentCorrections(corrected)).toMatchObject({ updates: [], conflicts: [] });
	});
	it('does not overwrite or double stack a different hand-authored modifier', () => {
		const input = rows();
		const shield = input.find((row) => row.item_id === 'rune_shield')!;
		const overridden = {
			...shield,
			item: {
				...shield.item,
				features: [
					{
						...shield.item.features[0],
						character_modifiers: [
							{
								behaviour: 'bonus',
								character_conditions: [],
								target: 'max_armor',
								type: 'flat',
								value: 2
							}
						]
					}
				]
			}
		};
		const plan = prepareEquipmentCorrections([overridden]);
		expect(plan.updates).toEqual([]);
		expect(plan.conflicts).toEqual([expect.objectContaining({ item_id: 'rune_shield' })]);
	});
	it('does not touch another source, an unknown item, or a mismatched feature', () => {
		const input = rows()[0];
		expect(prepareEquipmentCorrections([{ ...input, source_key: 'Homebrew' }]).updates).toEqual([]);
		expect(prepareEquipmentCorrections([{ ...input, item_id: 'custom' }]).updates).toEqual([]);
		const plan = prepareEquipmentCorrections([{ ...input, item: { ...input.item, features: [] } }]);
		expect(plan.updates).toEqual([]);
		expect(plan.conflicts).toHaveLength(1);
	});
	it('refuses duplicate identities and missing version baselines', () => {
		const input = rows()[0];
		expect(prepareEquipmentCorrections([input, input]).conflicts).toHaveLength(1);
		expect(prepareEquipmentCorrections([{ ...input, current_version: 0 }]).conflicts).toHaveLength(
			1
		);
		expect(() => prepareEquipmentCorrections({ items: [input] })).toThrow('array');
	});
});
