import { describe, expect, it } from 'vitest';
import type { DowntimeAllowance, Feature } from '@domain/schemas/rules';
import {
	allowanceBreakdown,
	applyMoves,
	clearRestMoves,
	collectDowntimeAllowances,
	describeMove,
	moveWarning,
	recordMove,
	summarizeRest,
	undoMove,
	type MoveEntry
} from './downtime-moves';
import type { UsageSource } from './feature-usage';

function source(
	itemId: string,
	allowances: DowntimeAllowance[],
	itemType: UsageSource['item_type'] = 'domain_cards'
): UsageSource {
	const feature: Feature = {
		title: itemId,
		description_html: '',
		character_modifiers: [],
		weapon_modifiers: [],
		downtime_allowances: allowances
	};
	return { item_type: itemType, item_id: itemId, title: itemId, features: [feature] };
}

const recovery = source('recovery', [
	{ id: 'recovery', label: 'Recovery', rest: 'short', kind: 'alternate_move', count: 1 }
]);
const eloquent = source(
	'wordsmith',
	[{ id: 'eloquent_move', label: 'Eloquent', rest: 'long', kind: 'extra_move', count: 1 }],
	'subclasses'
);

describe('collectDowntimeAllowances', () => {
	it('starts from the standard moves of each rest', () => {
		expect(collectDowntimeAllowances([], { short: 2, long: 3 })).toEqual({
			short: [{ id: 'standard', label: 'Standard', kind: 'standard', count: 2 }],
			long: [{ id: 'standard', label: 'Standard', kind: 'standard', count: 3 }]
		});
	});

	it('keeps each feature allowance separate on the rest it applies to', () => {
		const result = collectDowntimeAllowances([recovery, eloquent], { short: 2, long: 2 });
		expect(result.short.map((slot) => [slot.label, slot.kind, slot.count])).toEqual([
			['Standard', 'standard', 2],
			['Recovery', 'alternate_move', 1]
		]);
		expect(result.long.map((slot) => [slot.label, slot.kind, slot.count])).toEqual([
			['Standard', 'standard', 2],
			['Eloquent', 'extra_move', 1]
		]);
	});

	it('leaves out allowances of ineligible cards', () => {
		const result = collectDowntimeAllowances(
			[recovery],
			{ short: 2, long: 2 },
			{
				isEligible: (candidate) => candidate.item_id !== 'recovery'
			}
		);
		expect(result.short).toHaveLength(1);
	});

	it('needs the required effect to be active', () => {
		const gated = source('gated', [
			{
				id: 'gated',
				rest: 'short',
				kind: 'extra_move',
				count: 1,
				requires_active_effect: 'channel'
			}
		]);
		expect(collectDowntimeAllowances([gated], { short: 2, long: 2 }).short).toHaveLength(1);
		const active = {
			'domain_cards:gated:channel': [{ id: 'a', started_at: '2026-09-29T00:00:00.000Z' }]
		};
		expect(
			collectDowntimeAllowances([gated], { short: 2, long: 2 }, { activeEffects: active }).short
		).toHaveLength(2);
	});

	it('counts a repeated allowance once', () => {
		const result = collectDowntimeAllowances([recovery, recovery], { short: 2, long: 2 });
		expect(result.short).toHaveLength(2);
	});
});

describe('summarizeRest', () => {
	const allowances = collectDowntimeAllowances([recovery, eloquent], { short: 2, long: 2 });
	const moves = (...entries: [MoveEntry['move'], MoveEntry['rest'], MoveEntry['category']][]) =>
		entries.map(([move, rest, category], index) => ({
			id: String(index),
			move,
			action: 'project' as const,
			rest,
			category,
			at: ''
		}));

	it('adds extra moves to the total and keeps alternates out of it', () => {
		expect(summarizeRest('short', allowances, []).total).toBe(2);
		expect(summarizeRest('short', allowances, []).alternate_allowed).toBe(1);
		expect(summarizeRest('long', allowances, []).total).toBe(3);
	});

	it('counts only the moves taken during that rest', () => {
		const taken = moves(['Prepare', 'short', 'short'], ['Prepare', 'long', 'long']);
		expect(summarizeRest('short', allowances, taken).taken).toBe(1);
		expect(summarizeRest('long', allowances, taken).taken).toBe(1);
	});

	it('flags moves beyond the total or beyond the alternate allowance', () => {
		const within = moves(['Prepare', 'short', 'short'], ['Tend to All Wounds', 'short', 'long']);
		const summary = summarizeRest('short', allowances, within);
		expect(summary).toMatchObject({
			taken: 2,
			over_total: 0,
			alternate_taken: 1,
			over_alternate: 0
		});

		const over = moves(
			['Prepare', 'short', 'short'],
			['Tend to All Wounds', 'short', 'long'],
			['Clear All Stress', 'short', 'long']
		);
		expect(summarizeRest('short', allowances, over)).toMatchObject({
			over_total: 1,
			over_alternate: 1
		});
	});
});

describe('moveWarning', () => {
	const allowances = collectDowntimeAllowances([recovery], { short: 1, long: 2 });

	it('does not warn while the move fits', () => {
		expect(moveWarning(summarizeRest('short', allowances, []), 'short')).toBeUndefined();
		expect(moveWarning(summarizeRest('short', allowances, []), 'long')).toBeUndefined();
	});

	it('warns about too many moves, and never blocks', () => {
		const taken = recordMove([], {
			move: 'Prepare',
			action: 'prepare',
			rest: 'short',
			category: 'short'
		});
		expect(moveWarning(summarizeRest('short', allowances, taken), 'short')).toContain(
			'more than the 1 move'
		);
	});

	it('warns when nothing allows a move of the other kind', () => {
		const none = collectDowntimeAllowances([], { short: 2, long: 2 });
		expect(moveWarning(summarizeRest('short', none, []), 'long')).toContain(
			'Nothing on your sheet lets you take a long rest move'
		);
	});
});

describe('move log', () => {
	const prepare = { move: 'Prepare', action: 'prepare', amount: 1, category: 'short' } as const;

	it('chooses and unchooses a move by id', () => {
		const one = recordMove([], { ...prepare, rest: 'short' }, 'a', 't');
		const two = recordMove(
			one,
			{ move: 'Clear Stress', action: 'clear_stress', amount: 3, rest: 'short', category: 'short' },
			'b',
			't'
		);
		expect(two.map((move) => move.id)).toEqual(['a', 'b']);
		expect(undoMove(two, 'a').map((move) => move.id)).toEqual(['b']);
		expect(one).toHaveLength(1);
	});

	it("clears only the completed rest's moves", () => {
		let log = recordMove([], { ...prepare, rest: 'short' }, 'a', 't');
		log = recordMove(log, { ...prepare, rest: 'long', category: 'long' }, 'b', 't');
		expect(clearRestMoves(log, 'short').map((move) => move.id)).toEqual(['b']);
		expect(clearRestMoves(log, 'long').map((move) => move.id)).toEqual(['a']);
	});
});

describe('applyMoves', () => {
	const sheet = { marked_hp: 5, marked_stress: 4, marked_hope: 1, marked_armor: 3 };

	it('changes nothing until moves are applied, and applies each chosen move', () => {
		const { resources } = applyMoves(
			sheet,
			[
				{ action: 'tend_to_wounds', amount: 2 },
				{ action: 'repair_armor', amount: 1 },
				{ action: 'prepare', amount: 2 }
			],
			6
		);
		expect(resources).toEqual({ marked_hp: 3, marked_stress: 4, marked_hope: 3, marked_armor: 2 });
		expect(sheet.marked_hp).toBe(5);
	});

	it('clears everything for the long rest moves', () => {
		const { resources } = applyMoves(
			sheet,
			[{ action: 'clear_all_hp' }, { action: 'clear_all_stress' }, { action: 'clear_all_armor' }],
			6
		);
		expect(resources).toEqual({ marked_hp: 0, marked_stress: 0, marked_hope: 1, marked_armor: 0 });
	});

	it('never goes below zero or above the Hope maximum', () => {
		const { resources } = applyMoves(
			sheet,
			[
				{ action: 'tend_to_wounds', amount: 99 },
				{ action: 'prepare', amount: 2 },
				{ action: 'prepare', amount: 2 }
			],
			4
		);
		expect(resources.marked_hp).toBe(0);
		expect(resources.marked_hope).toBe(4);
	});

	it('reports the Stress actually cleared, for a companion to clear as well', () => {
		expect(
			applyMoves(
				sheet,
				[
					{ action: 'clear_stress', amount: 3 },
					{ action: 'clear_stress', amount: 3 }
				],
				6
			).stressCleared
		).toBe(4);
		expect(applyMoves(sheet, [{ action: 'clear_all_stress' }], 6).stressCleared).toBe(4);
		expect(applyMoves(sheet, [{ action: 'tend_to_wounds', amount: 2 }], 6).stressCleared).toBe(0);
	});

	it('leaves a project as a record only', () => {
		expect(applyMoves(sheet, [{ action: 'project' }], 6).resources).toEqual(sheet);
	});
});

describe('describeMove', () => {
	it('says what the move will do', () => {
		expect(describeMove({ action: 'tend_to_wounds', amount: 5 })).toBe('clears 5 HP');
		expect(describeMove({ action: 'repair_armor', amount: 1 })).toBe('clears 1 Armor Slot');
		expect(describeMove({ action: 'prepare', amount: 2 })).toBe('gains 2 Hope');
		expect(describeMove({ action: 'clear_all_hp' })).toBe('clears all HP');
	});
});

describe('allowanceBreakdown', () => {
	it('names every source', () => {
		const allowances = collectDowntimeAllowances([recovery, eloquent], { short: 2, long: 2 });
		expect(allowanceBreakdown(summarizeRest('short', allowances, []))).toBe(
			'Standard 2 · Recovery: 1 long rest move'
		);
		expect(allowanceBreakdown(summarizeRest('long', allowances, []))).toBe(
			'Standard 2 · Eloquent +1'
		);
	});
});
