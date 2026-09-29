import { describe, expect, it } from 'vitest';
import { CHARACTER_DEFAULTS } from './constants/constants';
import type { Character } from './schemas/characters';
import { detectDestructiveLoss, detectNormalizationLoss } from './character-safety';

function character(overrides: Partial<Character> = {}): Character {
	return {
		...structuredClone(CHARACTER_DEFAULTS),
		primary_class_id: 'ranger',
		primary_subclass_id: 'ranger_beastbound',
		ancestry_card_id: 'human',
		community_card_id: 'wanderborne',
		inventory: {
			...structuredClone(CHARACTER_DEFAULTS.inventory),
			armor: [{ inventory_id: 'a', base_armor_id: 'leather_armor', choices: {} }],
			primary_weapons: [{ inventory_id: 'b', base_primary_weapon_id: 'shortbow', choices: {} }]
		},
		level_up_domain_card_ids: {
			1: { A: { domain_id: 'sage', card_id: 'gifted_tracker' } },
			2: { A: { domain_id: 'bone', card_id: 'untouchable' } }
		},
		...overrides
	} as Character;
}

describe('detectDestructiveLoss', () => {
	it('accepts an unchanged character and ordinary edits', () => {
		const before = character();
		expect(detectDestructiveLoss(before, character())).toBeUndefined();
		expect(detectDestructiveLoss(before, character({ marked_hp: 3, level: 3 }))).toBeUndefined();
	});

	it('accepts switching to a different class, ancestry or community', () => {
		const before = character();
		expect(
			detectDestructiveLoss(
				before,
				character({
					primary_class_id: 'rogue',
					primary_subclass_id: 'rogue_syndicate',
					ancestry_card_id: 'elf'
				})
			)
		).toBeUndefined();
	});

	it('accepts a new character that has not chosen anything yet', () => {
		const empty = character({
			primary_class_id: undefined,
			primary_subclass_id: undefined,
			ancestry_card_id: undefined,
			community_card_id: undefined,
			inventory: structuredClone(CHARACTER_DEFAULTS.inventory),
			level_up_domain_card_ids: {}
		});
		expect(detectDestructiveLoss(empty, empty)).toBeUndefined();
	});

	it('accepts removing one part of the character on purpose', () => {
		for (const change of [
			{ primary_class_id: undefined },
			{ ancestry_card_id: undefined },
			{ community_card_id: undefined },
			{ primary_subclass_id: undefined }
		] as Partial<Character>[]) {
			expect(detectDestructiveLoss(character(), character(change))).toBeUndefined();
		}
	});

	it('accepts clearing a class together with its subclass', () => {
		expect(
			detectDestructiveLoss(
				character(),
				character({ primary_class_id: undefined, primary_subclass_id: undefined })
			)
		).toBeUndefined();
	});

	it('accepts emptying the gear or the cards on their own', () => {
		expect(
			detectDestructiveLoss(
				character(),
				character({ inventory: structuredClone(CHARACTER_DEFAULTS.inventory) })
			)
		).toBeUndefined();
		expect(
			detectDestructiveLoss(character(), character({ level_up_domain_card_ids: {} }))
		).toBeUndefined();
	});

	it('refuses losing three parts of the character at once', () => {
		const message = detectDestructiveLoss(
			character(),
			character({
				primary_class_id: undefined,
				primary_subclass_id: undefined,
				ancestry_card_id: undefined
			})
		);
		expect(message).toContain('class');
		expect(message).toContain('ancestry');
	});

	it('refuses losing a class together with all gear or all cards', () => {
		expect(
			detectDestructiveLoss(
				character(),
				character({
					primary_class_id: undefined,
					inventory: structuredClone(CHARACTER_DEFAULTS.inventory)
				})
			)
		).toContain('gear');
		expect(
			detectDestructiveLoss(
				character(),
				character({ ancestry_card_id: undefined, level_up_domain_card_ids: {} })
			)
		).toContain('domain cards');
	});

	it('names everything a wipe would remove', () => {
		const wiped = character({
			primary_class_id: undefined,
			primary_subclass_id: undefined,
			ancestry_card_id: undefined,
			community_card_id: undefined,
			inventory: structuredClone(CHARACTER_DEFAULTS.inventory),
			level_up_domain_card_ids: {}
		});
		const message = detectDestructiveLoss(character(), wiped) ?? '';
		for (const part of ['class', 'subclass', 'ancestry', 'community', 'gear', 'domain cards']) {
			expect(message).toContain(part);
		}
	});

	it('ignores a character that never had the thing', () => {
		const bare = character({ ancestry_card_id: undefined });
		expect(detectDestructiveLoss(bare, bare)).toBeUndefined();
	});
});

describe('detectNormalizationLoss', () => {
	it('accepts a tidy-up that keeps who the character is', () => {
		expect(detectNormalizationLoss(character(), character({ marked_hp: 1 }))).toBeUndefined();
	});

	it('flags a tidy-up that drops the class, subclass, ancestry or community', () => {
		expect(
			detectNormalizationLoss(character(), character({ primary_class_id: undefined }))
		).toContain('class');
		expect(
			detectNormalizationLoss(character(), character({ community_card_id: undefined }))
		).toContain('community');
	});

	it('does not mind a character that never had an ancestry', () => {
		const bare = character({ ancestry_card_id: undefined });
		expect(detectNormalizationLoss(bare, bare)).toBeUndefined();
	});
});
