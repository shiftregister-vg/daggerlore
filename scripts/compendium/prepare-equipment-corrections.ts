// Offline content-authoring plan for Forgejo #106. No database/network access,
// no lazy-seed mutation, and no item-name special cases in the character engine.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import type { CharacterModifier, WeaponModifier } from '../../src/lib/domain/schemas/rules';

type ItemType = 'armor' | 'primary_weapons' | 'secondary_weapons';
type Correction = {
	item_type: ItemType;
	item_id: string;
	feature: string;
	character: CharacterModifier[];
	weapon: WeaponModifier[];
};
const flat = (
	target: 'max_armor' | 'major_damage_threshold' | 'severe_damage_threshold' | 'evasion',
	value: number
): CharacterModifier => ({
	behaviour: 'bonus',
	character_conditions: [],
	target,
	type: 'flat',
	value
});
const trait = (id: 'finesse' | 'agility', value: number): CharacterModifier => ({
	behaviour: 'bonus',
	character_conditions: [],
	target: 'trait',
	trait: id,
	type: 'flat',
	value
});
const enchanted = (): CharacterModifier[] =>
	['major_damage_threshold', 'severe_damage_threshold'].map(
		(target) =>
			({
				behaviour: 'bonus',
				character_conditions: [],
				target,
				type: 'derived_from_spellcast_trait',
				multiplier: 1
			}) as CharacterModifier
	);
const correction = (
	item_type: ItemType,
	item_id: string,
	feature: string,
	character: CharacterModifier[],
	weapon: WeaponModifier[] = []
): Correction => ({ item_type, item_id, feature, character, weapon });

// H&F equipment tables, printed pp.44–53. Only unconditional, representable
// passives are included. Conditional/range/activated effects remain manual.
export const EQUIPMENT_CORRECTIONS: readonly Correction[] = [
	...['', 'improved_', 'advanced_', 'legendary_'].flatMap((prefix, tier) => [
		correction('secondary_weapons', prefix + 'rune_shield', 'Protective', [
			flat('max_armor', tier + 1)
		]),
		correction('secondary_weapons', prefix + 'fighting_cloak', 'Padded', [
			flat('major_damage_threshold', tier + 2),
			flat('severe_damage_threshold', tier + 2)
		]),
		correction('armor', prefix + 'mage_robes', 'Enchanted', enchanted()),
		correction('armor', prefix + 'scale_mail_armor', 'Cumbersome', [trait('finesse', -1)]),
		correction('armor', prefix + 'banded_armor', 'Bulky', [flat('evasion', -1)])
	]),
	correction('armor', 'granminster_s_finery', 'Magnificent', [
		{
			behaviour: 'bonus',
			character_conditions: [],
			target: 'max_armor',
			type: 'derived_from_trait',
			trait: 'presence',
			multiplier: 1
		}
	]),
	correction('armor', 'skywarden_s_lamellar', 'Vigilant', [flat('evasion', 2)]),
	correction('armor', 'spidersilk_tunic', 'Wall-Crawling', [flat('evasion', 1)]),
	correction('primary_weapons', 'enchanted_shillelagh', 'Protective', [flat('max_armor', 1)]),
	correction('primary_weapons', 'lance', 'Cumbersome', [trait('finesse', -1)]),
	correction('primary_weapons', 'black_powder_serpentine', 'Incendiary', [trait('agility', -1)]),
	correction('primary_weapons', 'severed_dragon_claw', 'Destructive', [trait('agility', -1)]),
	correction('secondary_weapons', 'segmented_staff', 'Double Duty', [flat('max_armor', 1)]),
	correction(
		'secondary_weapons',
		'tinker_s_hammer',
		'Trusty',
		[],
		[
			{
				behaviour: 'bonus',
				character_conditions: [],
				weapon_conditions: [],
				target_weapon: 'primary',
				target_stat: 'attack_roll',
				type: 'flat',
				value: 1
			}
		]
	)
];

type ObjectData = Record<string, unknown>;
const object = (value: unknown): value is ObjectData =>
	!!value && typeof value === 'object' && !Array.isArray(value);
export type EquipmentCorrectionPlan = {
	updates: {
		source_key: 'HAF';
		item_type: ItemType;
		item_id: string;
		expected_current_version: number;
		feature_title: string;
		character_modifiers: unknown[];
		weapon_modifiers: unknown[];
	}[];
	conflicts: { item_id: string; reason: string }[];
	not_in_export: string[];
};
function mergeModifiers(
	existing: unknown[],
	required: (CharacterModifier | WeaponModifier)[]
): unknown[] | undefined {
	const out = structuredClone(existing);
	for (const modifier of required) {
		const matches = out.filter(
			(value) =>
				object(value) &&
				('target' in modifier
					? value.target === modifier.target &&
						(modifier.target !== 'trait' || value.trait === modifier.trait)
					: value.target_stat === modifier.target_stat &&
						value.target_weapon === modifier.target_weapon)
		);
		if (matches.length > 1 || matches.some((value) => !isDeepStrictEqual(value, modifier)))
			return undefined;
		if (!matches.length) out.push(structuredClone(modifier));
	}
	return out;
}
/** Input is the array returned by the existing admin compendium item listing. */
export function prepareEquipmentCorrections(rows: unknown): EquipmentCorrectionPlan {
	if (!Array.isArray(rows)) throw new Error('Expected an admin item-list JSON array');
	const plan: EquipmentCorrectionPlan = { updates: [], conflicts: [], not_in_export: [] };
	for (const correction of EQUIPMENT_CORRECTIONS) {
		const matches = rows.filter(
			(row) =>
				object(row) &&
				row.source_key === 'HAF' &&
				row.item_type === correction.item_type &&
				row.item_id === correction.item_id
		);
		if (!matches.length) {
			plan.not_in_export.push(correction.item_id);
			continue;
		}
		const reject = (reason: string) => plan.conflicts.push({ item_id: correction.item_id, reason });
		if (matches.length !== 1) {
			reject('Duplicate item identity; inspect the export');
			continue;
		}
		const row = matches[0] as ObjectData;
		const item = row.item;
		const version = row.current_version ?? row.version;
		if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
			reject('Missing valid current version');
			continue;
		}
		if (!object(item) || item.source_key !== 'HAF' || !Array.isArray(item.features)) {
			reject('Unexpected source/item shape');
			continue;
		}
		const features = item.features.filter(
			(feature) => object(feature) && feature.title === correction.feature
		);
		if (features.length !== 1) {
			reject('Expected exactly one matching feature; inspect its rules text');
			continue;
		}
		const feature = features[0] as ObjectData;
		if (!Array.isArray(feature.character_modifiers) || !Array.isArray(feature.weapon_modifiers)) {
			reject('Invalid modifier arrays');
			continue;
		}
		const character = mergeModifiers(feature.character_modifiers, correction.character);
		const weapon = mergeModifiers(feature.weapon_modifiers, correction.weapon);
		if (!character || !weapon) {
			reject('A relevant modifier already differs; do not stack or replace it automatically');
			continue;
		}
		if (
			isDeepStrictEqual(character, feature.character_modifiers) &&
			isDeepStrictEqual(weapon, feature.weapon_modifiers)
		)
			continue;
		plan.updates.push({
			source_key: 'HAF',
			item_type: correction.item_type,
			item_id: correction.item_id,
			expected_current_version: version,
			feature_title: correction.feature,
			character_modifiers: character,
			weapon_modifiers: weapon
		});
	}
	return plan;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2);
	if (args.length !== 4 || args[0] !== '--input' || args[2] !== '--output') {
		throw new Error(
			'Usage: npx tsx scripts/compendium/prepare-equipment-corrections.ts --input admin-items.json --output correction-plan.json (offline only)'
		);
	}
	if (resolve(args[1]) === resolve(args[3])) throw new Error('Output must not overwrite input');
	const plan = prepareEquipmentCorrections(JSON.parse(readFileSync(args[1], 'utf8')));
	writeFileSync(args[3], JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
	console.log(
		`${plan.updates.length} updates prepared; ${plan.conflicts.length} require manual review. No items published.`
	);
	if (plan.conflicts.length) process.exitCode = 1;
}
