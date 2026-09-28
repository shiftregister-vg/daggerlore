import { describe, expect, it } from 'vitest';
import type { Feature, FeatureUsage } from '@domain/schemas/rules';
import {
	applyUsageResetEvent,
	collectUsageTrackers,
	pruneFeatureUses,
	refreshFeatureUses,
	setFeatureUses,
	usageLimitCaption,
	usageStateCaption,
	spentUses,
	type UsageSource
} from './feature-usage';

function feature(title: string, usage?: FeatureUsage): Feature {
	return { title, description_html: '', character_modifiers: [], weapon_modifiers: [], usage };
}

const sources: UsageSource[] = [
	{
		item_type: 'domain_cards',
		item_id: 'scramble',
		title: 'Scramble',
		features: [feature('', { id: 'scramble', max_uses: 1, reset: 'rest' })]
	},
	{
		item_type: 'domain_cards',
		item_id: 'premonition',
		title: 'Premonition',
		features: [feature('', { id: 'premonition', max_uses: 1, reset: 'long_rest' })]
	},
	{
		item_type: 'subclasses',
		item_id: 'bard_troubadour',
		title: 'Troubadour',
		features: [
			feature('Gifted Performer', {
				id: 'relaxing_song',
				label: 'Relaxing Song',
				max_uses: 2,
				reset: 'long_rest'
			}),
			feature('Ignored')
		]
	},
	{
		item_type: 'ancestry_cards',
		item_id: 'faerie',
		title: 'Faerie',
		features: [feature('Luckbender', { id: 'luckbender', max_uses: 1, reset: 'session' })]
	},
	{
		item_type: 'community_cards',
		item_id: 'test',
		title: 'Test',
		features: [
			feature('Scene thing', { id: 'scene_thing', max_uses: 1, reset: 'scene' }),
			feature('Once ever', { id: 'once_ever', max_uses: 1, reset: 'never' })
		]
	}
];

const trackers = collectUsageTrackers(sources);
const tracker = (key: string) => trackers.find((entry) => entry.key === key)!;
const allSpent = Object.fromEntries(trackers.map((entry) => [entry.key, entry.max_uses]));

describe('collectUsageTrackers', () => {
	it('creates one tracker per configured feature keyed by item and usage id', () => {
		expect(trackers.map((entry) => entry.key)).toEqual([
			'domain_cards:scramble:scramble',
			'domain_cards:premonition:premonition',
			'subclasses:bard_troubadour:relaxing_song',
			'ancestry_cards:faerie:luckbender',
			'community_cards:test:scene_thing',
			'community_cards:test:once_ever'
		]);
		expect(tracker('domain_cards:scramble:scramble').label).toBeUndefined();
		expect(tracker('subclasses:bard_troubadour:relaxing_song').label).toBe('Relaxing Song');
	});

	it('ignores duplicate usage ids on the same item', () => {
		const duplicate = collectUsageTrackers([
			{
				...sources[0],
				features: [
					feature('A', { id: 'same', max_uses: 1, reset: 'rest' }),
					feature('B', { id: 'same', max_uses: 3, reset: 'scene' })
				]
			}
		]);
		expect(duplicate).toHaveLength(1);
		expect(duplicate[0].feature_title).toBe('A');
	});
});

describe('applyUsageResetEvent', () => {
	const refreshedKeys = (event: Parameters<typeof applyUsageResetEvent>[2]) =>
		applyUsageResetEvent(allSpent, trackers, event).refreshed.map((entry) => entry.key);

	it('refreshes only per-rest features on a short rest', () => {
		expect(refreshedKeys('short_rest')).toEqual(['domain_cards:scramble:scramble']);
	});

	it('refreshes per-rest and per-long-rest features on a long rest', () => {
		expect(refreshedKeys('long_rest')).toEqual([
			'domain_cards:scramble:scramble',
			'domain_cards:premonition:premonition',
			'subclasses:bard_troubadour:relaxing_song'
		]);
	});

	it('refreshes scene and session features only on their own events', () => {
		expect(refreshedKeys('scene')).toEqual(['community_cards:test:scene_thing']);
		expect(refreshedKeys('session')).toEqual(['ancestry_cards:faerie:luckbender']);
	});

	it('never refreshes one-time features', () => {
		for (const event of ['short_rest', 'long_rest', 'scene', 'session'] as const) {
			const { next } = applyUsageResetEvent(allSpent, trackers, event);
			expect(next['community_cards:test:once_ever']).toBe(1);
		}
	});

	it('does not report unspent features as refreshed and keeps unrelated state', () => {
		const { next, refreshed } = applyUsageResetEvent(
			{ 'domain_cards:premonition:premonition': 1, 'other:item:use': 4 },
			trackers,
			'short_rest'
		);
		expect(refreshed).toEqual([]);
		expect(next).toEqual({ 'domain_cards:premonition:premonition': 1, 'other:item:use': 4 });
	});
});

describe('setting and refreshing uses', () => {
	it('clamps spent uses to the tracker limit', () => {
		const relaxing = tracker('subclasses:bard_troubadour:relaxing_song');
		expect(setFeatureUses({}, relaxing, 5)[relaxing.key]).toBe(2);
		expect(setFeatureUses({ [relaxing.key]: 2 }, relaxing, -1)).toEqual({});
		expect(spentUses({ [relaxing.key]: 9 }, relaxing)).toBe(2);
	});

	it('refreshes one selected feature without touching others', () => {
		const next = refreshFeatureUses(allSpent, tracker('domain_cards:premonition:premonition'));
		expect(next['domain_cards:premonition:premonition']).toBeUndefined();
		expect(next['domain_cards:scramble:scramble']).toBe(1);
		expect(next['community_cards:test:once_ever']).toBe(1);
	});
});

describe('pruneFeatureUses', () => {
	it('keeps uses for owned items, even when a tracker is no longer configured', () => {
		const pruned = pruneFeatureUses(
			{
				'domain_cards:scramble:scramble': 1,
				'domain_cards:scramble:retired_use': 1,
				'domain_cards:removed_card:use': 1,
				'domain_cards:premonition:premonition': 0
			},
			sources
		);
		expect(pruned).toEqual({
			'domain_cards:scramble:scramble': 1,
			'domain_cards:scramble:retired_use': 1
		});
	});
});

describe('usage captions', () => {
	it('describes the limit while every use is available or state is unknown', () => {
		expect(usageStateCaption({ max_uses: 1, reset: 'rest' })).toBe('Once per rest');
		expect(usageStateCaption({ max_uses: 2, reset: 'long_rest' }, 2)).toBe('2× per long rest');
		expect(usageLimitCaption({ max_uses: 1, reset: 'never' })).toBe('One-time use');
		expect(usageLimitCaption({ max_uses: 3, reset: 'never' })).toBe('3 one-time uses');
	});

	it('counts remaining uses while partly spent', () => {
		expect(usageStateCaption({ max_uses: 2, reset: 'long_rest' }, 1)).toBe(
			'1 of 2 left · per long rest'
		);
	});

	it('says when a spent feature refreshes', () => {
		expect(usageStateCaption({ max_uses: 1, reset: 'rest' }, 0)).toBe(
			'Spent · refreshes on a rest'
		);
		expect(usageStateCaption({ max_uses: 1, reset: 'long_rest' }, 0)).toBe(
			'Spent · refreshes on a long rest'
		);
		expect(usageStateCaption({ max_uses: 1, reset: 'scene' }, 0)).toBe(
			'Spent · refreshes next scene'
		);
		expect(usageStateCaption({ max_uses: 1, reset: 'session' }, 0)).toBe(
			'Spent · refreshes next session'
		);
		expect(usageStateCaption({ max_uses: 1, reset: 'never' }, 0)).toBe('Spent');
	});
});
