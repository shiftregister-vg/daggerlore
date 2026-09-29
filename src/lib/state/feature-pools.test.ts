import { describe, expect, it } from 'vitest';
import type { Feature, FeaturePool } from '@domain/schemas/rules';
import {
	applyPoolEvent,
	collectPoolTrackers,
	poolCaption,
	poolDiceSlots,
	poolTokens,
	prunePoolState,
	refillPoolTokens,
	resolvePoolQuantity,
	setPoolDie,
	setPoolTokens,
	type PoolContext,
	type PoolSource
} from './feature-pools';

const context: PoolContext = {
	traits: { agility: -1, presence: 3, knowledge: 0 },
	proficiency: 2,
	level: 5,
	spellcast: 2
};

function feature(title: string, pools: FeaturePool[]): Feature {
	return { title, description_html: '', character_modifiers: [], weapon_modifiers: [], pools };
}

function source(
	itemId: string,
	pools: FeaturePool[],
	itemType: PoolSource['item_type'] = 'domain_cards'
): PoolSource {
	return {
		item_type: itemType,
		item_id: itemId,
		title: itemId,
		features: [feature('', pools)],
		context
	};
}

const trackers = collectPoolTrackers([
	source('inspirational_words', [
		{
			id: 'words',
			kind: 'tokens',
			refill: { source: 'trait', trait: 'presence' },
			refill_on: ['long_rest']
		}
	]),
	source('unleash_chaos', [
		{
			id: 'chaos',
			kind: 'tokens',
			capacity: { source: 'spellcast_trait' },
			refill: { source: 'spellcast_trait' },
			refill_on: ['session_start'],
			clear_on: ['session_end']
		}
	]),
	source(
		'seraph',
		[
			{
				id: 'prayer_dice',
				kind: 'dice',
				die: 'd4',
				refill: { source: 'spellcast_trait' },
				refill_on: ['session_start'],
				clear_on: ['session_end']
			}
		],
		'classes'
	)
]);
const tracker = (id: string) => trackers.find((entry) => entry.key.endsWith(`:${id}`))!;

describe('resolvePoolQuantity', () => {
	it('reads character numbers and applies minimums', () => {
		expect(resolvePoolQuantity({ source: 'fixed', value: 8 }, context)).toBe(8);
		expect(resolvePoolQuantity({ source: 'proficiency' }, context)).toBe(2);
		expect(resolvePoolQuantity({ source: 'level' }, context)).toBe(5);
		expect(resolvePoolQuantity({ source: 'tier' }, context)).toBe(3);
		expect(resolvePoolQuantity({ source: 'trait', trait: 'presence' }, context)).toBe(3);
		expect(resolvePoolQuantity({ source: 'spellcast_trait' }, context)).toBe(2);
		expect(resolvePoolQuantity({ source: 'trait', trait: 'agility', minimum: 1 }, context)).toBe(1);
		expect(resolvePoolQuantity({ source: 'trait', trait: 'agility' }, context)).toBe(0);
	});
});

describe('collectPoolTrackers', () => {
	it('resolves capacity and refill separately', () => {
		expect(tracker('words')).toMatchObject({ kind: 'tokens', capacity: undefined, refill: 3 });
		expect(tracker('chaos')).toMatchObject({ capacity: 2, refill: 2 });
		expect(tracker('prayer_dice')).toMatchObject({ kind: 'dice', die: 'd4', refill: 2 });
	});
});

describe('token pools', () => {
	it('does not cap a pool just because it has a starting amount', () => {
		const words = tracker('words');
		expect(poolTokens(setPoolTokens({}, words, 7), words)).toBe(7);
	});

	it('clamps a capped pool and removes empty entries', () => {
		const chaos = tracker('chaos');
		expect(setPoolTokens({}, chaos, 5)[chaos.key]).toBe(2);
		expect(setPoolTokens({ [chaos.key]: 2 }, chaos, -1)).toEqual({});
	});

	it('refills to the refill amount', () => {
		const words = tracker('words');
		expect(refillPoolTokens({ [words.key]: 1 }, words)[words.key]).toBe(3);
	});
});

describe('dice pools', () => {
	it('sizes slots to the dice count and drops out-of-range values', () => {
		const prayer = tracker('prayer_dice');
		expect(poolDiceSlots({ [prayer.key]: [4, 9, 2] }, prayer)).toEqual([4, 0]);
		expect(poolDiceSlots({}, prayer)).toEqual([0, 0]);
	});

	it('spends one die without touching the others', () => {
		const prayer = tracker('prayer_dice');
		const next = setPoolDie({ [prayer.key]: [3, 1] }, prayer, 0, 0);
		expect(next[prayer.key]).toEqual([0, 1]);
		expect(setPoolDie(next, prayer, 1, 0)).toEqual({});
	});
});

describe('applyPoolEvent', () => {
	const state = {
		tokens: { [tracker('words').key]: 1, [tracker('chaos').key]: 1 },
		dice: { [tracker('prayer_dice').key]: [2, 0] }
	};

	it('refills only the pools listening to the event', () => {
		const result = applyPoolEvent(state, trackers, 'long_rest');
		expect(result.tokens[tracker('words').key]).toBe(3);
		expect(result.tokens[tracker('chaos').key]).toBe(1);
		expect(result.refreshed.map((entry) => entry.key)).toEqual([tracker('words').key]);
	});

	it('requests dice rolls for dice pools that refill', () => {
		const result = applyPoolEvent(state, trackers, 'session_start');
		expect(result.tokens[tracker('chaos').key]).toBe(2);
		expect(result.dice[tracker('prayer_dice').key]).toBeUndefined();
		expect(result.diceToRoll).toEqual([{ tracker: tracker('prayer_dice'), count: 2 }]);
	});

	it('clears session pools at the end of a session', () => {
		const result = applyPoolEvent(state, trackers, 'session_end');
		expect(result.tokens[tracker('chaos').key]).toBeUndefined();
		expect(result.tokens[tracker('words').key]).toBe(1);
		expect(result.dice).toEqual({});
		expect(result.diceToRoll).toEqual([]);
	});

	it('clears before refilling when both happen on one event', () => {
		const [both] = collectPoolTrackers([
			source('both', [
				{
					id: 'both',
					kind: 'tokens',
					refill: { source: 'fixed', value: 2 },
					refill_on: ['scene'],
					clear_on: ['scene']
				}
			])
		]);
		expect(
			applyPoolEvent({ tokens: { [both.key]: 5 }, dice: {} }, [both], 'scene').tokens[both.key]
		).toBe(2);
	});

	describe('clear_gain', () => {
		const [slayer] = collectPoolTrackers([
			source('slayer', [
				{
					id: 'slayer_dice',
					kind: 'tokens',
					clear_on: ['session_end'],
					clear_gain: 'hope'
				}
			])
		]);

		it('reports what the pool held when it clears', () => {
			const result = applyPoolEvent(
				{ tokens: { [slayer.key]: 3 }, dice: {} },
				[slayer],
				'session_end'
			);
			expect(result.tokens[slayer.key]).toBeUndefined();
			expect(result.converted).toEqual([{ tracker: slayer, amount: 3 }]);
		});

		it('reports nothing for an empty pool or another event', () => {
			expect(applyPoolEvent({ tokens: {}, dice: {} }, [slayer], 'session_end').converted).toEqual(
				[]
			);
			expect(
				applyPoolEvent({ tokens: { [slayer.key]: 3 }, dice: {} }, [slayer], 'long_rest').converted
			).toEqual([]);
		});

		it('ignores the conversion on dice pools', () => {
			const [dice] = collectPoolTrackers([
				source('dice', [
					{
						id: 'd',
						kind: 'dice',
						die: 'd6',
						refill: { source: 'fixed', value: 1 },
						clear_on: ['scene']
					}
				])
			]);
			expect(dice.clear_gain).toBeUndefined();
		});

		it('describes the conversion', () => {
			expect(poolCaption(slayer)).toBe('Turns into Hope at the end of a session');
		});
	});
});

describe('prunePoolState', () => {
	it('keeps state for owned items only', () => {
		const pruned = prunePoolState(
			{
				tokens: { 'domain_cards:inspirational_words:words': 2, 'domain_cards:gone:words': 2 },
				dice: { 'classes:seraph:prayer_dice': [0, 0], 'classes:seraph:old': [3] }
			},
			[
				{ item_type: 'domain_cards', item_id: 'inspirational_words' },
				{ item_type: 'classes', item_id: 'seraph' }
			]
		);
		expect(pruned).toEqual({
			tokens: { 'domain_cards:inspirational_words:words': 2 },
			dice: { 'classes:seraph:old': [3] }
		});
	});
});

describe('poolCaption', () => {
	it('describes refills, clears and caps', () => {
		expect(poolCaption(tracker('words'))).toBe('Refills to 3 after a long rest');
		expect(poolCaption(tracker('chaos'))).toBe(
			'Refills to 2 at the start of a session · Clears at the end of a session · Up to 2'
		);
		expect(poolCaption(tracker('prayer_dice'))).toBe(
			'Roll 2d4 at the start of a session · Clears at the end of a session'
		);
	});
});
