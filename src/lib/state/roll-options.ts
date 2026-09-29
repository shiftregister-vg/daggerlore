import type {
	DamageThresholds,
	FeatureRollOption,
	RollOptionEffect,
	RollOptionTiming
} from '@domain/schemas/rules';
import type { Roll, RollInput, RollKind } from '@domain/schemas/dice';
import { withAdjustment } from './roll-math';
import {
	endEffectInstance,
	effectInstances,
	type EffectState,
	type EffectTracker
} from './feature-effects';
import {
	poolDiceSlots,
	poolTokens,
	setPoolDie,
	setPoolTokens,
	type PoolTracker
} from './feature-pools';
import {
	setFeatureUses,
	spentUses,
	usageKey,
	type UsageItemType,
	type UsageSource,
	type UsageTracker
} from './feature-usage';

export type RollOptionTracker = {
	key: string;
	item_type: UsageItemType;
	item_id: string;
	source_title: string;
	feature_title: string;
	option: FeatureRollOption;
	pool?: PoolTracker;
	usage?: UsageTracker;
	/** The effect this option requires, or ends. */
	effect?: EffectTracker;
	/** False while the source or a condition doesn't apply; the option is listed but disabled. */
	eligible: boolean;
	ineligible_reason?: string;
};

export type RollOptionEligibility = (
	source: UsageSource,
	option: FeatureRollOption
) => { eligible: boolean; reason?: string };

/** Everything an option can spend, and the state a `requires_active_effect` reads. */
export type RollOptionResources = {
	hope: number;
	stress: number;
	max_stress: number;
	feature_uses: Record<string, number>;
	pool_tokens: Record<string, number>;
	pool_dice: Record<string, number[]>;
	active_effects: EffectState;
};

/** What the player picked in the panel: which pool die, or how many tokens. */
export type OptionChoice = { die_index?: number; tokens?: number };

export function collectRollOptionTrackers(
	sources: UsageSource[],
	poolTrackers: PoolTracker[],
	usageTrackers: UsageTracker[],
	effectTrackers: EffectTracker[],
	eligibility: RollOptionEligibility
): RollOptionTracker[] {
	const trackers = new Map<string, RollOptionTracker>();
	for (const source of sources) {
		for (const feature of source.features) {
			for (const option of feature.roll_options ?? []) {
				const key = usageKey(source.item_type, source.item_id, option.id);
				if (trackers.has(key)) continue;
				const { eligible, reason } = eligibility(source, option);
				trackers.set(key, {
					key,
					item_type: source.item_type,
					item_id: source.item_id,
					source_title: source.title,
					feature_title: feature.title,
					option,
					pool: option.cost?.pool
						? poolTrackers.find(
								(pool) =>
									pool.key === usageKey(source.item_type, source.item_id, option.cost!.pool!.id)
							)
						: undefined,
					usage: feature.usage
						? usageTrackers.find(
								(usage) =>
									usage.key === usageKey(source.item_type, source.item_id, feature.usage!.id)
							)
						: undefined,
					effect: option.requires_active_effect
						? effectTrackers.find(
								(effect) =>
									effect.key ===
									usageKey(source.item_type, source.item_id, option.requires_active_effect!)
							)
						: undefined,
					eligible,
					ineligible_reason: eligible ? undefined : reason
				});
			}
		}
	}
	return [...trackers.values()];
}

/** Options that list this kind of roll at this time. Disabled ones are included so they can explain why. */
export function optionsFor(
	trackers: RollOptionTracker[],
	query: { kind?: RollKind; timing: RollOptionTiming; outcome?: 'success' | 'failure' }
): RollOptionTracker[] {
	return trackers.filter(
		(tracker) =>
			tracker.option.timing === query.timing &&
			(!tracker.option.requires_outcome || tracker.option.requires_outcome === query.outcome) &&
			(query.timing === 'defense' ||
				(query.kind !== undefined && (tracker.option.applies_to ?? []).includes(query.kind)))
	);
}

const DIE_LABELS: Partial<Record<RollOptionEffect['type'], string>> = {
	hope_die: 'Use a d20 Hope Die',
	advantage: 'Gain advantage',
	swap_results: 'Swap Hope and Fear results'
};

function defaultOptionLabel(option: FeatureRollOption): string | undefined {
	const effect = option.effect;
	if (effect.type === 'flat_bonus') return `${signed(effect.value)} to the roll`;
	if (effect.type === 'bonus_die') {
		return effect.die === 'pool' ? 'Add a spent die' : `Add a ${effect.die}`;
	}
	if (effect.type === 'extra_damage') return `Roll ${effect.die} damage dice`;
	if (effect.type === 'reroll') {
		return effect.dice === 'duality' ? 'Reroll the Duality Dice' : `Reroll the ${effect.dice} die`;
	}
	if (effect.type === 'reduce_damage') return 'Reduce the damage';
	return DIE_LABELS[effect.type];
}

export function optionLabel(tracker: RollOptionTracker): string {
	return (
		tracker.option.label ??
		defaultOptionLabel(tracker.option) ??
		tracker.feature_title ??
		tracker.source_title
	);
}

const TIMING_TEXT: Record<RollOptionTiming, string> = {
	before: 'before a roll',
	after: 'after a roll',
	defense: 'when taking damage'
};

/** e.g. "Add a spent die (after a roll; 1 pool die)" for the compendium update diff. */
export function describeRollOption(option: FeatureRollOption): string {
	const cost = option.cost;
	const parts = [TIMING_TEXT[option.timing]];
	if (cost?.hope) parts.push(`${cost.hope} Hope`);
	if (cost?.stress) parts.push(`${cost.stress} Stress`);
	if (cost?.usage) parts.push('1 use');
	if (cost?.pool) parts.push(`pool ${cost.pool.id.replaceAll('_', ' ')}`);
	if (option.requires_outcome) parts.push(`after a ${option.requires_outcome}`);
	if (option.ends_effect) parts.push('ends the effect');
	return `${option.label ?? defaultOptionLabel(option) ?? option.effect.type.replaceAll('_', ' ')} (${parts.join('; ')})`;
}

/** e.g. "3 Hope · 1 use", or "1 Prayer Die"; empty when free. */
export function optionCostCaption(tracker: RollOptionTracker): string {
	const { cost } = tracker.option;
	const parts: string[] = [];
	if (cost?.hope) parts.push(`${cost.hope} Hope`);
	if (cost?.stress) parts.push(`${cost.stress} Stress`);
	if (cost?.usage) parts.push('1 use');
	if (cost?.pool) {
		const name = tracker.pool?.label ?? (tracker.pool?.feature_title || tracker.pool?.source_title);
		if (tracker.pool?.kind === 'dice') {
			parts.push(name ? `1 die from ${name}` : '1 pool die');
		} else {
			parts.push(`${cost.pool.amount ?? 1}+ tokens`);
		}
	}
	if (tracker.option.ends_effect) parts.push('ends the effect');
	return parts.join(' · ');
}

/** True when the option spends a die from a dice pool, so the player has to pick which one. */
export function needsDieChoice(tracker: RollOptionTracker): boolean {
	return tracker.option.cost?.pool !== undefined && tracker.pool?.kind === 'dice';
}

/** True when the option spends a number of tokens the player chooses. */
export function needsTokenChoice(tracker: RollOptionTracker): boolean {
	return tracker.option.cost?.pool !== undefined && tracker.pool?.kind === 'tokens';
}

/** Tokens available to spend, and the smallest amount the option allows. */
export function tokenRange(
	resources: Pick<RollOptionResources, 'pool_tokens'>,
	tracker: RollOptionTracker
): { min: number; max: number } {
	const min = tracker.option.cost?.pool?.amount ?? 1;
	const max = tracker.pool ? poolTokens(resources.pool_tokens, tracker.pool) : 0;
	return { min, max };
}

/** The dice left in the pool, as `{ index, value }`. */
export function availablePoolDice(
	resources: Pick<RollOptionResources, 'pool_dice'>,
	tracker: RollOptionTracker
): { index: number; value: number }[] {
	if (!tracker.pool) return [];
	return poolDiceSlots(resources.pool_dice, tracker.pool).flatMap((value, index) =>
		value > 0 ? [{ index, value }] : []
	);
}

/** Why the option can't be used now, or undefined when it can. */
export function optionBlocker(
	resources: RollOptionResources,
	tracker: RollOptionTracker,
	choice: OptionChoice = {}
): string | undefined {
	const { option } = tracker;
	const cost = option.cost;
	if (!tracker.eligible) return tracker.ineligible_reason ?? 'Not available';
	if (option.requires_active_effect) {
		const active = tracker.effect
			? effectInstances(resources.active_effects, tracker.effect).length > 0
			: false;
		if (!active) return 'Not active';
	}
	if (cost?.hope && resources.hope < cost.hope) return `Needs ${cost.hope} Hope`;
	if (cost?.stress && resources.stress + cost.stress > resources.max_stress) {
		return `Needs ${cost.stress} free Stress`;
	}
	if (cost?.usage) {
		if (!tracker.usage) return 'No uses configured';
		if (spentUses(resources.feature_uses, tracker.usage) >= tracker.usage.max_uses) {
			return 'No uses left';
		}
	}
	if (cost?.pool) {
		if (!tracker.pool) return 'Pool unavailable';
		if (tracker.pool.kind === 'dice') {
			const dice = availablePoolDice(resources, tracker);
			if (dice.length === 0) return 'No dice left';
			if (choice.die_index !== undefined && !dice.some((die) => die.index === choice.die_index)) {
				return 'Choose a die that is still available';
			}
		} else {
			const { min, max } = tokenRange(resources, tracker);
			if (max < min) return `Needs ${min} ${tracker.pool.label ?? 'token'}${min === 1 ? '' : 's'}`;
			if (choice.tokens !== undefined && (choice.tokens < min || choice.tokens > max)) {
				return `Choose between ${min} and ${max}`;
			}
		}
	}
	return undefined;
}

export type OptionApplication = {
	resources: RollOptionResources;
	/** Value of the pool die that was spent. */
	spent_die?: number;
	/** Tokens that were spent. */
	tokens_spent?: number;
};

/**
 * Pays the option's cost. A pool die or token amount must be chosen when the cost needs one.
 * Returns undefined when the option is blocked or the choice is missing.
 */
export function applyOption(
	resources: RollOptionResources,
	tracker: RollOptionTracker,
	choice: OptionChoice = {}
): OptionApplication | undefined {
	const cost = tracker.option.cost;
	if (needsDieChoice(tracker) && choice.die_index === undefined) return undefined;
	if (needsTokenChoice(tracker) && choice.tokens === undefined) {
		choice = { ...choice, tokens: tokenRange(resources, tracker).min };
	}
	if (optionBlocker(resources, tracker, choice) !== undefined) return undefined;

	const next: RollOptionResources = {
		...resources,
		hope: resources.hope - (cost?.hope ?? 0),
		stress: resources.stress + (cost?.stress ?? 0)
	};
	const result: OptionApplication = { resources: next };
	if (cost?.usage && tracker.usage) {
		next.feature_uses = setFeatureUses(
			resources.feature_uses,
			tracker.usage,
			spentUses(resources.feature_uses, tracker.usage) + 1
		);
	}
	if (cost?.pool && tracker.pool) {
		if (tracker.pool.kind === 'dice' && choice.die_index !== undefined) {
			const slots = poolDiceSlots(resources.pool_dice, tracker.pool);
			result.spent_die = slots[choice.die_index];
			next.pool_dice = setPoolDie(resources.pool_dice, tracker.pool, choice.die_index, 0);
		} else if (tracker.pool.kind === 'tokens' && choice.tokens !== undefined) {
			result.tokens_spent = choice.tokens;
			next.pool_tokens = setPoolTokens(
				resources.pool_tokens,
				tracker.pool,
				poolTokens(resources.pool_tokens, tracker.pool) - choice.tokens
			);
		}
	}
	if (tracker.option.ends_effect && tracker.effect) {
		const instance = effectInstances(resources.active_effects, tracker.effect)[0];
		if (instance) {
			next.active_effects = endEffectInstance(
				resources.active_effects,
				tracker.effect,
				instance.id
			);
		}
	}
	return result;
}

export type DamageResult = {
	/** Damage after reductions, never below zero. */
	damage: number;
	severity: 'none' | 'minor' | 'major' | 'severe' | 'massive';
	/** Hit Points to mark, after the Armor Slot if one is used. */
	hp: number;
};

const SEVERITY_HP: Record<DamageResult['severity'], number> = {
	none: 0,
	minor: 1,
	major: 2,
	severe: 3,
	massive: 4
};

/**
 * Turns incoming damage into Hit Points marked. Reductions apply to the damage before it is compared
 * to the thresholds. Marking an Armor Slot lowers the result by one step. `massive` enables the
 * optional Massive Damage rule (twice the Severe threshold marks four).
 */
export function resolveDamage(
	incoming: number,
	thresholds: DamageThresholds,
	options: { reduction?: number; armor_slot?: boolean; massive?: boolean } = {}
): DamageResult {
	const damage = Math.max(0, Math.trunc(incoming) - Math.max(0, options.reduction ?? 0));
	let severity: DamageResult['severity'] = 'none';
	if (damage > 0) severity = 'minor';
	if (damage >= thresholds.major) severity = 'major';
	if (damage >= thresholds.severe) severity = 'severe';
	if (options.massive && damage >= thresholds.severe * 2) severity = 'massive';
	const hp = Math.max(0, SEVERITY_HP[severity] - (options.armor_slot ? 1 : 0));
	return { damage, severity, hp };
}

function signed(value: number): string {
	return value >= 0 ? `+${value}` : `−${Math.abs(value)}`;
}

export type ChosenOption = { tracker: RollOptionTracker; application: OptionApplication };

/** Applies the options chosen before a roll to its dice, adjustments and labels. */
export function applyBeforeRoll(input: RollInput, chosen: ChosenOption[]): RollInput {
	const dice = input.dice.map((die) => ({ ...die }));
	const adjustments = [...(input.adjustments ?? [])];
	const applied = [...(input.applied ?? [])];
	for (const { tracker, application } of chosen) {
		const { effect } = tracker.option;
		const label = optionLabel(tracker);
		if (effect.type === 'hope_die') {
			const index = dice.findIndex((die) => die.type === 'hope');
			if (index !== -1) dice[index] = { type: 'hope_d20' };
		} else if (effect.type === 'advantage') {
			dice.push({ type: 'advantage' });
		} else if (effect.type === 'flat_bonus') {
			adjustments.push({ id: tracker.key, label, amount: effect.value });
		} else if (effect.type === 'bonus_die') {
			if (effect.die === 'pool') {
				adjustments.push({ id: tracker.key, label, amount: application.spent_die ?? 0 });
			} else {
				dice.push({ type: effect.die });
			}
		}
		applied.push(label);
	}
	return { ...input, dice, adjustments, applied };
}

/** What the panel does with an option chosen after a roll. */
export type AfterRollPlan =
	| { type: 'update'; roll: Roll }
	| { type: 'extra_die'; die: string }
	| { type: 'reroll'; indices: number[] }
	| { type: 'damage'; die: string; count: number };

export function planAfterRoll(
	roll: Roll,
	tracker: RollOptionTracker,
	application: OptionApplication
): AfterRollPlan | undefined {
	const { effect } = tracker.option;
	const label = optionLabel(tracker);
	if (effect.type === 'flat_bonus') {
		return {
			type: 'update',
			roll: withAdjustment(roll, { id: tracker.key, label, amount: effect.value }, label)
		};
	}
	if (effect.type === 'bonus_die') {
		if (effect.die === 'pool') {
			const amount = application.spent_die ?? 0;
			return {
				type: 'update',
				roll: withAdjustment(roll, { id: tracker.key, label, amount }, label)
			};
		}
		return { type: 'extra_die', die: effect.die };
	}
	if (effect.type === 'swap_results') {
		return {
			type: 'update',
			roll: { ...roll, swapped: !roll.swapped, applied: [...(roll.applied ?? []), label] }
		};
	}
	if (effect.type === 'reroll') {
		const indices = roll.dice.flatMap((die, index) => {
			const isHope = die.type === 'hope' || die.type === 'hope_d20';
			const wanted =
				effect.dice === 'duality'
					? isHope || die.type === 'fear'
					: effect.dice === 'hope'
						? isHope
						: die.type === 'fear';
			return wanted && die.result !== undefined ? [index] : [];
		});
		return indices.length > 0 ? { type: 'reroll', indices } : undefined;
	}
	if (effect.type === 'extra_damage') {
		const count = application.tokens_spent ?? 0;
		return count > 0 ? { type: 'damage', die: effect.die, count } : undefined;
	}
	return undefined;
}

/** How much a spent pool die, or a fixed amount, reduces incoming damage. */
export function damageReduction(
	tracker: RollOptionTracker,
	application: OptionApplication
): number {
	const { effect } = tracker.option;
	if (effect.type !== 'reduce_damage') return 0;
	if (effect.amount === 'pool') return application.spent_die ?? 0;
	return typeof effect.amount === 'number' ? effect.amount : 0;
}
