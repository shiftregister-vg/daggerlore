import { describe, expect, it } from 'vitest';
import { CHARACTER_DEFAULTS } from '$lib/domain/constants/constants';
import type { Character } from '$lib/domain/schemas/characters';
import { BASE_COMPANION } from '$lib/domain/constants/rules';
import { restoreDowntime, snapshotDowntime } from './downtime-snapshot';

function character(): Character {
	return {
		...structuredClone(CHARACTER_DEFAULTS),
		marked_hp: 3,
		marked_stress: 2,
		marked_hope: 1,
		card_tokens: { a_soldiers_bond: 1 },
		feature_choices: { no_mercy_bonus: ['4'] },
		rest_moves: [
			{ id: 'a', move: 'Prepare', action: 'prepare', rest: 'short', category: 'short', at: '' }
		],
		companion: { ...BASE_COMPANION, marked_stress: 3, away: true }
	} as Character;
}

describe('downtime snapshot', () => {
	it('restores everything a downtime change can touch', () => {
		const live = character();
		const before = snapshotDowntime(live);

		live.marked_hp = 0;
		live.marked_hope = 5;
		live.card_tokens = { a_soldiers_bond: 0 };
		live.feature_choices.no_mercy_bonus = ['0'];
		live.feature_uses = { 'domain_cards:x:y': 1 };
		live.rest_moves = [];
		live.companion = { ...live.companion!, away: false, marked_stress: 2 };

		restoreDowntime(live, before);
		expect(live).toMatchObject(character());
	});

	it('is not changed by later edits, and can be restored twice', () => {
		const live = character();
		const before = snapshotDowntime(live);
		live.feature_choices.no_mercy_bonus[0] = '0';
		live.rest_moves.push({
			id: 'b',
			move: 'Prepare',
			action: 'prepare',
			rest: 'short',
			category: 'short',
			at: ''
		});

		restoreDowntime(live, before);
		restoreDowntime(live, before);
		expect(live.feature_choices.no_mercy_bonus).toEqual(['4']);
		expect(live.rest_moves).toHaveLength(1);
	});

	it('restores a missing companion', () => {
		const live = character();
		live.companion = undefined;
		const before = snapshotDowntime(live);
		live.companion = { ...BASE_COMPANION };
		restoreDowntime(live, before);
		expect(live.companion).toBeUndefined();
	});
});
