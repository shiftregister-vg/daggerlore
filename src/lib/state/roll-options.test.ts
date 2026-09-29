import { describe, expect, it } from 'vitest';
import type { Feature, FeatureRollOption } from '@domain/schemas/rules';
import { FeatureSchema } from '@domain/schemas/rules';
import { collectEffectTrackers } from './feature-effects';
import { collectPoolTrackers, type PoolSource } from './feature-pools';
import { collectUsageTrackers } from './feature-usage';
import type { Roll, RollInput } from '@domain/schemas/dice';
import {
	applyBeforeRoll,
	applyOption,
	damageReduction,
	planAfterRoll,
	availablePoolDice,
	collectRollOptionTrackers,
	needsDieChoice,
	optionBlocker,
	optionCostCaption,
	optionsFor,
	resolveDamage,
	tokenRange,
	type RollOptionResources
} from './roll-options';

const context = { traits: {} as never, proficiency: 1, level: 5, spellcast: 3 };

function build(feature: Partial<Feature>, id = 'card', eligible = true) {
	const full: Feature = {
		title: 'Test',
		description_html: '',
		character_modifiers: [],
		weapon_modifiers: [],
		...feature
	};
	const source: PoolSource = {
		item_type: 'domain_cards',
		item_id: id,
		title: id,
		features: [full],
		context
	};
	const pools = collectPoolTrackers([source]);
	const usages = collectUsageTrackers([source]);
	const effects = collectEffectTrackers([source], usages, () => ({ eligible: true }));
	return collectRollOptionTrackers([source], pools, usages, effects, () => ({
		eligible,
		reason: 'In vault'
	}));
}

function resources(overrides: Partial<RollOptionResources> = {}): RollOptionResources {
	return {
		hope: 3,
		stress: 0,
		max_stress: 6,
		feature_uses: {},
		pool_tokens: {},
		pool_dice: {},
		active_effects: {},
		...overrides
	};
}

const hopeDie: FeatureRollOption = {
	id: 'hope_die',
	applies_to: ['trait', 'attack'],
	timing: 'before',
	cost: { usage: true },
	effect: { type: 'hope_die', die: 'd20' }
};

describe('roll options', () => {
	it('filters options by roll kind and timing', () => {
		const trackers = build({
			usage: { id: 'u', max_uses: 1, reset: 'rest' },
			roll_options: [
				hopeDie,
				{ id: 'swap', applies_to: ['trait'], timing: 'after', effect: { type: 'swap_results' } }
			]
		});
		expect(
			optionsFor(trackers, { kind: 'trait', timing: 'before' }).map((t) => t.option.id)
		).toEqual(['hope_die']);
		expect(optionsFor(trackers, { kind: 'damage', timing: 'before' })).toEqual([]);
		expect(
			optionsFor(trackers, { kind: 'trait', timing: 'after' }).map((t) => t.option.id)
		).toEqual(['swap']);
	});

	it('spends a use and blocks when none are left', () => {
		const [tracker] = build({
			usage: { id: 'u', max_uses: 1, reset: 'rest' },
			roll_options: [hopeDie]
		});
		expect(optionBlocker(resources(), tracker)).toBeUndefined();
		const applied = applyOption(resources(), tracker);
		expect(applied?.resources.feature_uses).toEqual({ 'domain_cards:card:u': 1 });
		expect(optionBlocker(applied!.resources, tracker)).toBe('No uses left');
		expect(applyOption(applied!.resources, tracker)).toBeUndefined();
	});

	it('pays Hope and Stress and reports shortages', () => {
		const [tracker] = build({
			roll_options: [
				{
					id: 'reroll',
					applies_to: ['attack'],
					timing: 'after',
					cost: { hope: 2, stress: 1 },
					effect: { type: 'reroll', dice: 'duality' }
				}
			]
		});
		expect(optionBlocker(resources({ hope: 1 }), tracker)).toBe('Needs 2 Hope');
		expect(optionBlocker(resources({ stress: 6 }), tracker)).toBe('Needs 1 free Stress');
		const applied = applyOption(resources(), tracker);
		expect(applied?.resources).toMatchObject({ hope: 1, stress: 1 });
		expect(optionCostCaption(tracker)).toBe('2 Hope · 1 Stress');
	});

	it('spends a chosen pool die and reports its value', () => {
		const [tracker] = build({
			pools: [
				{
					id: 'prayer',
					label: 'Prayer Dice',
					kind: 'dice',
					die: 'd4',
					refill: { source: 'fixed', value: 3 }
				}
			],
			roll_options: [
				{
					id: 'prayer',
					applies_to: ['trait'],
					timing: 'before',
					cost: { pool: { id: 'prayer' } },
					effect: { type: 'bonus_die', die: 'pool' }
				}
			]
		});
		const pool_dice = { 'domain_cards:card:prayer': [4, 0, 2] };
		expect(needsDieChoice(tracker)).toBe(true);
		expect(availablePoolDice(resources({ pool_dice }), tracker)).toEqual([
			{ index: 0, value: 4 },
			{ index: 2, value: 2 }
		]);
		expect(applyOption(resources({ pool_dice }), tracker)).toBeUndefined();
		expect(optionBlocker(resources({ pool_dice }), tracker, { die_index: 1 })).toBe(
			'Choose a die that is still available'
		);
		const applied = applyOption(resources({ pool_dice }), tracker, { die_index: 2 });
		expect(applied?.spent_die).toBe(2);
		expect(applied?.resources.pool_dice['domain_cards:card:prayer']).toEqual([4, 0, 0]);
		expect(optionBlocker(resources(), tracker)).toBe('No dice left');
	});

	it('spends a chosen number of tokens within the available range', () => {
		const [tracker] = build({
			pools: [{ id: 'chaos', kind: 'tokens', capacity: { source: 'fixed', value: 4 } }],
			roll_options: [
				{
					id: 'unleash',
					applies_to: ['spellcast'],
					timing: 'after',
					cost: { pool: { id: 'chaos' } },
					effect: { type: 'extra_damage', die: 'd10' }
				}
			]
		});
		const pool_tokens = { 'domain_cards:card:chaos': 3 };
		expect(tokenRange(resources({ pool_tokens }), tracker)).toEqual({ min: 1, max: 3 });
		expect(optionBlocker(resources({ pool_tokens }), tracker, { tokens: 4 })).toBe(
			'Choose between 1 and 3'
		);
		const applied = applyOption(resources({ pool_tokens }), tracker, { tokens: 2 });
		expect(applied?.tokens_spent).toBe(2);
		expect(applied?.resources.pool_tokens).toEqual({ 'domain_cards:card:chaos': 1 });
		expect(optionBlocker(resources(), tracker)).toBe('Needs 1 token');
	});

	it('requires an active effect and can end it as the cost', () => {
		const [tracker] = build({
			effects: [
				{
					id: 'focus',
					character_modifiers: [],
					weapon_modifiers: [],
					ends_on: []
				}
			],
			roll_options: [
				{
					id: 'reroll',
					applies_to: ['attack'],
					timing: 'after',
					requires_active_effect: 'focus',
					ends_effect: true,
					effect: { type: 'reroll', dice: 'duality' }
				}
			]
		});
		expect(optionBlocker(resources(), tracker)).toBe('Not active');
		const active_effects = { 'domain_cards:card:focus': [{ id: 'a', started_at: '' }] };
		const applied = applyOption(resources({ active_effects }), tracker);
		expect(applied?.resources.active_effects).toEqual({});
		expect(optionCostCaption(tracker)).toBe('ends the effect');
	});

	it('lists ineligible options as disabled with the reason', () => {
		const [tracker] = build(
			{ roll_options: [hopeDie], usage: { id: 'u', max_uses: 1, reset: 'rest' } },
			'card',
			false
		);
		expect(optionsFor([tracker], { kind: 'trait', timing: 'before' })).toHaveLength(1);
		expect(optionBlocker(resources(), tracker)).toBe('In vault');
	});

	it('validates timing, pools, uses and effect references', () => {
		const parse = (options: FeatureRollOption[], extra: Partial<Feature> = {}) =>
			FeatureSchema.safeParse({
				title: '',
				description_html: '',
				character_modifiers: [],
				weapon_modifiers: [],
				roll_options: options,
				...extra
			});
		expect(parse([{ ...hopeDie, cost: undefined }]).success).toBe(true);
		expect(parse([{ ...hopeDie, timing: 'after' }]).success).toBe(false);
		expect(parse([hopeDie]).success).toBe(false); // spends a use, but no usage tracker
		expect(parse([{ ...hopeDie, applies_to: undefined, cost: undefined }]).success).toBe(false);
		expect(
			parse([
				{
					id: 'x',
					applies_to: ['trait'],
					timing: 'before',
					effect: { type: 'bonus_die', die: 'pool' }
				}
			]).success
		).toBe(false);
		expect(
			parse([
				{
					id: 'x',
					applies_to: ['attack'],
					timing: 'after',
					ends_effect: true,
					effect: { type: 'swap_results' }
				}
			]).success
		).toBe(false);
	});
});

describe('resolveDamage', () => {
	const thresholds = { major: 8, severe: 15 };

	it('maps damage to Hit Points marked', () => {
		expect(resolveDamage(0, thresholds)).toEqual({ damage: 0, severity: 'none', hp: 0 });
		expect(resolveDamage(5, thresholds).hp).toBe(1);
		expect(resolveDamage(8, thresholds)).toMatchObject({ severity: 'major', hp: 2 });
		expect(resolveDamage(15, thresholds)).toMatchObject({ severity: 'severe', hp: 3 });
		expect(resolveDamage(30, thresholds, { massive: true })).toMatchObject({
			severity: 'massive',
			hp: 4
		});
		expect(resolveDamage(30, thresholds)).toMatchObject({ severity: 'severe' });
	});

	it('applies reductions before thresholds and an Armor Slot after', () => {
		expect(resolveDamage(10, thresholds, { reduction: 3 })).toMatchObject({
			damage: 7,
			severity: 'minor',
			hp: 1
		});
		expect(resolveDamage(10, thresholds, { armor_slot: true }).hp).toBe(1);
		expect(resolveDamage(5, thresholds, { armor_slot: true }).hp).toBe(0);
		expect(resolveDamage(3, thresholds, { reduction: 9 }).damage).toBe(0);
	});
});

describe('applying options to rolls', () => {
	const input: RollInput = {
		name: 'Agility',
		dice: [{ type: 'hope' }, { type: 'fear' }],
		modifier: 2
	};
	const rolled: Roll = {
		id: 'r',
		name: 'Agility',
		dice: [
			{ type: 'hope', result: 4 },
			{ type: 'fear', result: 9 }
		],
		modifier: 2,
		status: 'complete',
		timestamp: 0
	};

	function chosen(option: FeatureRollOption, feature: Partial<Feature> = {}, choice = {}) {
		const [tracker] = build({ roll_options: [option], ...feature });
		const pool_dice = { 'domain_cards:card:prayer': [3, 0, 0] };
		const application = applyOption(
			resources({ pool_dice, pool_tokens: { 'domain_cards:card:chaos': 4 } }),
			tracker,
			choice
		)!;
		return { tracker, application };
	}

	it('swaps the Hope Die for a d20 and adds advantage before a roll', () => {
		const hope = chosen({ ...hopeDie, cost: undefined }, {});
		const advantage = chosen({
			id: 'adv',
			applies_to: ['trait'],
			timing: 'before',
			effect: { type: 'advantage' }
		});
		const result = applyBeforeRoll(input, [hope, advantage]);
		expect(result.dice.map((die) => die.type)).toEqual(['hope_d20', 'fear', 'advantage']);
		expect(result.applied).toHaveLength(2);
		expect(input.dice[0].type).toBe('hope');
	});

	it('records a spent pool die as an adjustment before the roll', () => {
		const option: FeatureRollOption = {
			id: 'prayer',
			applies_to: ['trait'],
			timing: 'before',
			cost: { pool: { id: 'prayer' } },
			effect: { type: 'bonus_die', die: 'pool' }
		};
		const pick = chosen(
			option,
			{
				pools: [
					{
						id: 'prayer',
						label: 'Prayer Dice',
						kind: 'dice',
						die: 'd4',
						refill: { source: 'fixed', value: 3 }
					}
				]
			},
			{ die_index: 0 }
		);
		const result = applyBeforeRoll(input, [pick]);
		expect(result.adjustments).toEqual([
			{ id: 'domain_cards:card:prayer', label: 'Add a spent die', amount: 3 }
		]);
	});

	it('plans swaps, adjustments, rerolls and damage after a roll', () => {
		const swap = chosen({
			id: 'swap',
			applies_to: ['trait'],
			timing: 'after',
			effect: { type: 'swap_results' }
		});
		const swapped = planAfterRoll(rolled, swap.tracker, swap.application);
		expect(swapped).toMatchObject({ type: 'update', roll: { swapped: true } });
		if (swapped?.type === 'update') {
			expect(planAfterRoll(swapped.roll, swap.tracker, swap.application)).toMatchObject({
				roll: { swapped: false }
			});
		}

		const flat = chosen({
			id: 'flat',
			applies_to: ['trait'],
			timing: 'after',
			effect: { type: 'flat_bonus', value: 2 }
		});
		expect(planAfterRoll(rolled, flat.tracker, flat.application)).toMatchObject({
			type: 'update',
			roll: { adjustments: [{ amount: 2 }] }
		});

		const reroll = chosen({
			id: 'rr',
			applies_to: ['attack'],
			timing: 'after',
			effect: { type: 'reroll', dice: 'fear' }
		});
		expect(planAfterRoll(rolled, reroll.tracker, reroll.application)).toEqual({
			type: 'reroll',
			indices: [1]
		});

		const damage = chosen(
			{
				id: 'chaos',
				applies_to: ['spellcast'],
				timing: 'after',
				cost: { pool: { id: 'chaos' } },
				effect: { type: 'extra_damage', die: 'd10' }
			},
			{ pools: [{ id: 'chaos', kind: 'tokens', capacity: { source: 'fixed', value: 4 } }] },
			{ tokens: 3 }
		);
		expect(planAfterRoll(rolled, damage.tracker, damage.application)).toEqual({
			type: 'damage',
			die: 'd10',
			count: 3
		});
	});

	it('reads damage reduction from a spent die or a fixed amount', () => {
		const pool = chosen(
			{
				id: 'guard',
				timing: 'defense',
				cost: { pool: { id: 'prayer' } },
				effect: { type: 'reduce_damage', amount: 'pool' }
			},
			{ pools: [{ id: 'prayer', kind: 'dice', die: 'd4', refill: { source: 'fixed', value: 3 } }] },
			{ die_index: 0 }
		);
		expect(damageReduction(pool.tracker, pool.application)).toBe(3);
		const fixed = chosen({
			id: 'fixed',
			timing: 'defense',
			effect: { type: 'reduce_damage', amount: 2 }
		});
		expect(damageReduction(fixed.tracker, fixed.application)).toBe(2);
	});
});
