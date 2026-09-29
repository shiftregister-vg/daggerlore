import { describe, expect, it } from 'vitest';
import type { Roll } from '@domain/schemas/dice';
import {
	rollArithmetic,
	rollDescription,
	rollOutcome,
	rollTotal,
	withAdjustment
} from './roll-math';

function duality(hope: number, fear: number, extra: Partial<Roll> = {}): Roll {
	return {
		id: 'r',
		name: 'Agility',
		dice: [
			{ type: 'hope', result: hope },
			{ type: 'fear', result: fear }
		],
		modifier: 2,
		status: 'complete',
		timestamp: 0,
		...extra
	};
}

describe('roll math', () => {
	it('totals dice, advantage, disadvantage, modifier and adjustments', () => {
		const roll = duality(7, 3, {
			dice: [
				{ type: 'hope', result: 7 },
				{ type: 'fear', result: 3 },
				{ type: 'advantage', result: 4 },
				{ type: 'disadvantage', result: 1 }
			],
			adjustments: [{ id: 'a', label: 'Prayer Die', amount: 3 }]
		});
		expect(rollTotal(roll)).toBe(7 + 3 + 4 - 1 + 2 + 3);
	});

	it('reads the favoured side and criticals', () => {
		expect(rollOutcome(duality(9, 4))).toBe('hope');
		expect(rollOutcome(duality(4, 9))).toBe('fear');
		expect(rollOutcome(duality(6, 6))).toBe('critical');
		expect(rollDescription(duality(9, 4))).toBe('with Hope');
	});

	it('counts an alternate d20 Hope Die as a Hope die', () => {
		const roll = duality(0, 5, {
			dice: [
				{ type: 'hope_d20', result: 15 },
				{ type: 'fear', result: 5 }
			]
		});
		expect(rollOutcome(roll)).toBe('hope');
		expect(rollTotal(roll)).toBe(15 + 5 + 2);
	});

	it('swaps Hope and Fear without touching a critical', () => {
		expect(rollOutcome(duality(9, 4, { swapped: true }))).toBe('fear');
		expect(rollOutcome(duality(4, 9, { swapped: true }))).toBe('hope');
		expect(rollOutcome(duality(6, 6, { swapped: true }))).toBe('critical');
	});

	it('lists each contribution and the total', () => {
		const roll = withAdjustment(
			duality(7, 3),
			{ id: 'a', label: 'Prayer Die', amount: 3 },
			'Prayer Dice'
		);
		expect(rollArithmetic(roll)).toEqual([
			'Hope 7',
			'Fear 3',
			'+2 modifier',
			'+3 Prayer Die',
			'Total 15'
		]);
		expect(roll.applied).toEqual(['Prayer Dice']);
	});
});
