import { describe, expect, it } from 'vitest';
import type {
	CharacterModifier,
	Feature,
	FeatureEffect,
	FeatureUsage
} from '@domain/schemas/rules';
import {
	activateEffect,
	activationBlocker,
	activeEffectModifiers,
	applyEffectEvent,
	collectEffectTrackers,
	describeEffectModifiers,
	effectCostCaption,
	effectEndCaption,
	endEffectInstance,
	pruneEffects,
	type EffectResources,
	type EffectTracker
} from './feature-effects';
import { collectUsageTrackers, type UsageSource } from './feature-usage';

const evasionBonus: CharacterModifier = {
	behaviour: 'bonus',
	character_conditions: [],
	type: 'flat',
	value: 2,
	target: 'evasion'
};
const proficiencyBonus: CharacterModifier = { ...evasionBonus, value: 1, target: 'proficiency' };

function source(itemId: string, effect: FeatureEffect, usage?: FeatureUsage): UsageSource {
	const feature: Feature = {
		title: itemId,
		description_html: '',
		character_modifiers: [],
		weapon_modifiers: [],
		usage,
		effects: [effect]
	};
	return { item_type: 'domain_cards', item_id: itemId, title: itemId, features: [feature] };
}

const sources = [
	source('dodge', {
		id: 'dodge',
		cost: { hope: 3 },
		character_modifiers: [evasionBonus],
		weapon_modifiers: [],
		ends_on: ['attacked_successfully', 'short_rest', 'long_rest']
	}),
	source(
		'focus',
		{
			id: 'focus',
			cost: { usage: true },
			target: { label: 'Target' },
			character_modifiers: [],
			weapon_modifiers: [],
			ends_on: [],
			ends_when: ['You attack another creature']
		},
		{ id: 'focus', max_uses: 1, reset: 'rest' }
	),
	source('ranger', {
		id: 'ranger',
		cost: { hope: 1 },
		requires_success: true,
		target: { label: 'Focus' },
		instances: 'replace',
		character_modifiers: [],
		weapon_modifiers: [],
		ends_on: []
	}),
	source('reprisal', {
		id: 'reprisal',
		target: { label: 'Adversary' },
		instances: 'per_target',
		scope: 'against_target',
		character_modifiers: [proficiencyBonus],
		weapon_modifiers: [],
		ends_on: ['attack_succeeded']
	})
];

function trackers(inVault: string[] = []): EffectTracker[] {
	return collectEffectTrackers(sources, collectUsageTrackers(sources), (entry) =>
		inVault.includes(entry.item_id) ? { eligible: false, reason: 'In vault' } : { eligible: true }
	);
}

const [dodge, focus, ranger, reprisal] = trackers();

function resources(overrides: Partial<EffectResources> = {}): EffectResources {
	return {
		hope: 3,
		stress: 0,
		max_stress: 6,
		feature_uses: {},
		active_effects: {},
		...overrides
	};
}

const at = { now: '2026-09-28T00:00:00.000Z' };

describe('feature effects', () => {
	it('collects trackers keyed like other feature state, with the usage tracker', () => {
		expect(dodge.key).toBe('domain_cards:dodge:dodge');
		expect(focus.usage?.key).toBe('domain_cards:focus:focus');
		expect(dodge.eligible).toBe(true);
	});

	it('pays Hope and starts a single effect, then blocks a second activation', () => {
		const next = activateEffect(resources(), dodge, { ...at, id: 'a' });
		expect(next?.hope).toBe(0);
		expect(next?.started).toBe(true);
		expect(next?.active_effects[dodge.key]).toEqual([{ id: 'a', started_at: at.now }]);
		expect(activationBlocker({ ...next!, hope: 3 }, dodge)).toBe('Already active');
	});

	it('blocks activation without enough Hope, Stress or uses', () => {
		expect(activationBlocker(resources({ hope: 2 }), dodge)).toBe('Needs 3 Hope');
		expect(activateEffect(resources({ hope: 2 }), dodge, { ...at, id: 'a' })).toBeUndefined();
		const stressy = { ...dodge, effect: { ...dodge.effect, cost: { stress: 2 } } };
		expect(activationBlocker(resources({ stress: 5 }), stressy)).toBe('Needs 2 free Stress');
		expect(
			activationBlocker(resources({ feature_uses: { [focus.usage!.key]: 1 } }), focus, 'Troll')
		).toBe('No uses left');
	});

	it('requires a target name and spends a use on activation', () => {
		expect(activationBlocker(resources(), focus, ' ')).toBe('Name the target');
		const next = activateEffect(resources(), focus, { ...at, id: 'a', target: ' Troll ' });
		expect(next?.feature_uses).toEqual({ [focus.usage!.key]: 1 });
		expect(next?.active_effects[focus.key]).toEqual([
			{ id: 'a', started_at: at.now, target: 'Troll' }
		]);
	});

	it('pays Hope on a failed attempt but starts nothing', () => {
		const next = activateEffect(resources(), ranger, {
			...at,
			id: 'a',
			target: 'Wolf',
			succeeded: false
		});
		expect(next?.hope).toBe(2);
		expect(next?.started).toBe(false);
		expect(next?.active_effects).toEqual({});
	});

	it('does not spend a use on a failed attempt', () => {
		const successOnly = { ...focus, effect: { ...focus.effect, requires_success: true } };
		const next = activateEffect(resources(), successOnly, {
			...at,
			id: 'a',
			target: 'Troll',
			succeeded: false
		});
		expect(next?.feature_uses).toEqual({});
		expect(next?.active_effects).toEqual({});
	});

	it('replaces the previous instance for replace effects', () => {
		const first = activateEffect(resources(), ranger, { ...at, id: 'a', target: 'Wolf' })!;
		const second = activateEffect({ ...first, hope: 3 }, ranger, {
			...at,
			id: 'b',
			target: 'Bear'
		});
		expect(second?.active_effects[ranger.key]).toEqual([
			{ id: 'b', started_at: at.now, target: 'Bear' }
		]);
	});

	it('keeps one instance per target for per-target effects', () => {
		const first = activateEffect(resources(), reprisal, { ...at, id: 'a', target: 'Troll' })!;
		expect(activationBlocker(first, reprisal, 'troll')).toBe('Already active against that target');
		const second = activateEffect(first, reprisal, { ...at, id: 'b', target: 'Ogre' })!;
		expect(second.active_effects[reprisal.key]).toHaveLength(2);
		const ended = endEffectInstance(second.active_effects, reprisal, 'a');
		expect(ended[reprisal.key]).toEqual([{ id: 'b', started_at: at.now, target: 'Ogre' }]);
		expect(endEffectInstance(ended, reprisal, 'b')).toEqual({});
	});

	it('ends effects that list a confirmed event', () => {
		const active = {
			[dodge.key]: [{ id: 'a', started_at: at.now }],
			[focus.key]: [{ id: 'b', started_at: at.now, target: 'Troll' }]
		};
		const { next, ended } = applyEffectEvent(active, trackers(), 'short_rest');
		expect(ended.map((tracker) => tracker.key)).toEqual([dodge.key]);
		expect(next).toEqual({ [focus.key]: active[focus.key] });
	});

	it('applies self modifiers once, only while eligible, and never against-target ones', () => {
		const active = {
			[dodge.key]: [{ id: 'a', started_at: at.now }],
			[reprisal.key]: [
				{ id: 'b', started_at: at.now, target: 'Troll' },
				{ id: 'c', started_at: at.now, target: 'Ogre' }
			]
		};
		expect(activeEffectModifiers(active, trackers()).character_modifiers).toEqual([evasionBonus]);
		expect(activeEffectModifiers(active, trackers(['dodge'])).character_modifiers).toEqual([]);
	});

	it('prunes effects of items the character no longer owns', () => {
		const active = {
			[dodge.key]: [{ id: 'a', started_at: at.now }],
			[focus.key]: [{ id: 'b', started_at: at.now }]
		};
		expect(pruneEffects(active, [{ item_type: 'domain_cards', item_id: 'focus' }])).toEqual({
			[focus.key]: active[focus.key]
		});
	});

	it('describes costs, endings and modifiers', () => {
		expect(effectCostCaption(dodge.effect)).toBe('3 Hope');
		expect(effectCostCaption(focus.effect)).toBe('1 use');
		expect(effectEndCaption(dodge.effect)).toBe(
			'Until an attack succeeds against you or your next rest'
		);
		expect(effectEndCaption(focus.effect)).toBe('Until you attack another creature');
		expect(describeEffectModifiers(dodge.effect)).toEqual(['+2 Evasion']);
	});
});
