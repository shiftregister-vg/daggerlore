import type { FeaturePool, PoolDie, PoolEvent, PoolQuantity, Traits } from '@domain/schemas/rules';
import {
	ownedFeatureKeyFilter,
	usageKey,
	type UsageItemType,
	type UsageSource
} from './feature-usage';

/** Character numbers a pool quantity can refer to, resolved for one source item. */
export type PoolContext = {
	traits: Traits;
	proficiency: number;
	level: number;
	/** Value of the Spellcast trait that applies to this source (0 when it has none). */
	spellcast: number;
};

export type PoolSource = UsageSource & { context: PoolContext };

export type PoolTracker = {
	key: string;
	item_type: UsageItemType;
	item_id: string;
	source_title: string;
	feature_title: string;
	label?: string;
	kind: FeaturePool['kind'];
	die?: PoolDie;
	/** Tokens only; undefined means uncapped. */
	capacity?: number;
	/** Tokens: the amount Refill sets. Dice: the number of dice (slots). */
	refill?: number;
	refill_on: PoolEvent[];
	clear_on: PoolEvent[];
	/** Tokens only: what remains when the pool clears turns into this resource. */
	clear_gain?: 'hope';
};

export type PoolState = {
	tokens: Record<string, number>;
	dice: Record<string, number[]>;
};

const POOL_EVENT_TIMES: Record<PoolEvent, string> = {
	short_rest: 'after a short rest',
	long_rest: 'after a long rest',
	scene: 'at the end of a scene',
	session_start: 'at the start of a session',
	session_end: 'at the end of a session'
};

const DIE_FACES: Record<PoolDie, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };

function tierForLevel(level: number): number {
	if (level >= 8) return 4;
	if (level >= 5) return 3;
	if (level >= 2) return 2;
	return 1;
}

export function resolvePoolQuantity(quantity: PoolQuantity, context: PoolContext): number {
	let value: number;
	switch (quantity.source) {
		case 'fixed':
			value = quantity.value ?? 0;
			break;
		case 'proficiency':
			value = context.proficiency;
			break;
		case 'level':
			value = context.level;
			break;
		case 'tier':
			value = tierForLevel(context.level);
			break;
		case 'trait':
			value = quantity.trait ? (context.traits[quantity.trait] ?? 0) : 0;
			break;
		case 'spellcast_trait':
			value = context.spellcast;
			break;
	}
	return Math.max(quantity.minimum ?? 0, Math.trunc(value), 0);
}

export function dieFaces(die: PoolDie | undefined): number {
	return die ? DIE_FACES[die] : 0;
}

export function collectPoolTrackers(sources: PoolSource[]): PoolTracker[] {
	const trackers = new Map<string, PoolTracker>();
	for (const source of sources) {
		for (const feature of source.features) {
			for (const pool of feature.pools ?? []) {
				const key = usageKey(source.item_type, source.item_id, pool.id);
				if (trackers.has(key)) continue;
				trackers.set(key, {
					key,
					item_type: source.item_type,
					item_id: source.item_id,
					source_title: source.title,
					feature_title: feature.title,
					label: pool.label,
					kind: pool.kind,
					die: pool.die,
					capacity:
						pool.kind === 'tokens' && pool.capacity
							? resolvePoolQuantity(pool.capacity, source.context)
							: undefined,
					refill: pool.refill ? resolvePoolQuantity(pool.refill, source.context) : undefined,
					refill_on: pool.refill_on ?? [],
					clear_on: pool.clear_on ?? [],
					clear_gain: pool.kind === 'tokens' ? pool.clear_gain : undefined
				});
			}
		}
	}
	return [...trackers.values()];
}

function clampTokens(value: number, tracker: PoolTracker): number {
	const count = Math.max(0, Number.isFinite(value) ? Math.trunc(value) : 0);
	return tracker.capacity === undefined ? count : Math.min(tracker.capacity, count);
}

export function poolTokens(tokens: Record<string, number>, tracker: PoolTracker): number {
	return clampTokens(tokens[tracker.key] ?? 0, tracker);
}

export function setPoolTokens(
	tokens: Record<string, number>,
	tracker: PoolTracker,
	value: number
): Record<string, number> {
	const next = { ...tokens };
	const count = clampTokens(value, tracker);
	if (count > 0) next[tracker.key] = count;
	else delete next[tracker.key];
	return next;
}

/** The amount Refill sets: the refill quantity, or the capacity when only a cap is configured. */
export function poolRefillAmount(tracker: PoolTracker): number | undefined {
	return tracker.refill ?? tracker.capacity;
}

export function refillPoolTokens(
	tokens: Record<string, number>,
	tracker: PoolTracker
): Record<string, number> {
	const amount = poolRefillAmount(tracker);
	return amount === undefined ? tokens : setPoolTokens(tokens, tracker, amount);
}

/** Die slots for a dice pool, sized to its dice count; 0 is an empty or spent slot. */
export function poolDiceSlots(dice: Record<string, number[]>, tracker: PoolTracker): number[] {
	const count = tracker.refill ?? 0;
	const faces = dieFaces(tracker.die);
	const stored = dice[tracker.key] ?? [];
	return Array.from({ length: count }, (_, index) => {
		const value = Math.trunc(stored[index] ?? 0);
		return value >= 1 && value <= faces ? value : 0;
	});
}

export function setPoolDice(
	dice: Record<string, number[]>,
	tracker: PoolTracker,
	values: number[]
): Record<string, number[]> {
	const next = { ...dice };
	const slots = poolDiceSlots({ [tracker.key]: values }, tracker);
	if (slots.some((value) => value > 0)) next[tracker.key] = slots;
	else delete next[tracker.key];
	return next;
}

export function setPoolDie(
	dice: Record<string, number[]>,
	tracker: PoolTracker,
	index: number,
	value: number
): Record<string, number[]> {
	const slots = poolDiceSlots(dice, tracker);
	if (index < 0 || index >= slots.length) return dice;
	slots[index] = value;
	return setPoolDice(dice, tracker, slots);
}

/**
 * Applies one confirmed event. A pool that both clears and refills on the event is cleared first.
 * Dice pools cannot be rolled here, so refilled dice pools are emptied and returned in `diceToRoll`.
 */
export function applyPoolEvent(
	state: PoolState,
	trackers: PoolTracker[],
	event: PoolEvent
): PoolState & {
	refreshed: PoolTracker[];
	diceToRoll: { tracker: PoolTracker; count: number }[];
	/** Tokens that turned into a resource because the pool cleared. */
	converted: { tracker: PoolTracker; amount: number }[];
} {
	let tokens = { ...state.tokens };
	let dice = { ...state.dice };
	const refreshed: PoolTracker[] = [];
	const diceToRoll: { tracker: PoolTracker; count: number }[] = [];
	const converted: { tracker: PoolTracker; amount: number }[] = [];

	for (const tracker of trackers) {
		const clears = tracker.clear_on.includes(event);
		const refills = tracker.refill_on.includes(event);
		if (!clears && !refills) continue;

		if (tracker.kind === 'tokens') {
			const before = poolTokens(tokens, tracker);
			if (clears && tracker.clear_gain && before > 0) {
				converted.push({ tracker, amount: before });
			}
			if (clears) tokens = setPoolTokens(tokens, tracker, 0);
			if (refills) tokens = refillPoolTokens(tokens, tracker);
			if (poolTokens(tokens, tracker) !== before) refreshed.push(tracker);
			continue;
		}

		const hadDice = poolDiceSlots(dice, tracker).some((value) => value > 0);
		dice = setPoolDice(dice, tracker, []);
		const count = refills ? (tracker.refill ?? 0) : 0;
		if (count > 0) diceToRoll.push({ tracker, count });
		if (hadDice || count > 0) refreshed.push(tracker);
	}

	return { tokens, dice, refreshed, diceToRoll, converted };
}

/** Drops pool state for items the character no longer possesses. */
export function prunePoolState(
	state: PoolState,
	sources: Pick<UsageSource, 'item_type' | 'item_id'>[]
): PoolState {
	const isOwned = ownedFeatureKeyFilter(sources);
	return {
		tokens: Object.fromEntries(
			Object.entries(state.tokens).filter(
				([key, count]) => Number.isInteger(count) && count > 0 && isOwned(key)
			)
		),
		dice: Object.fromEntries(
			Object.entries(state.dice).filter(
				([key, values]) => values.some((value) => value > 0) && isOwned(key)
			)
		)
	};
}

function eventTimes(events: PoolEvent[]): string {
	const times = events.map((event) => POOL_EVENT_TIMES[event]);
	return times.length <= 1
		? (times[0] ?? '')
		: `${times.slice(0, -1).join(', ')} or ${times.at(-1)}`;
}

/** Describes a pool's limits and lifecycle, e.g. "Refills to 3 after a long rest · Up to 3". */
export function poolCaption(tracker: PoolTracker): string {
	const parts: string[] = [];
	const refillOn = eventTimes(tracker.refill_on);
	const clearOn = eventTimes(
		tracker.clear_on.filter((event) => !tracker.refill_on.includes(event))
	);
	if (tracker.kind === 'dice') {
		if (refillOn) parts.push(`Roll ${tracker.refill ?? 0}${tracker.die ?? ''} ${refillOn}`);
		if (clearOn) parts.push(`Clears ${clearOn}`);
		return parts.join(' · ');
	}
	const refill = poolRefillAmount(tracker);
	if (refillOn && refill !== undefined) parts.push(`Refills to ${refill} ${refillOn}`);
	if (clearOn) {
		parts.push(tracker.clear_gain ? `Turns into Hope ${clearOn}` : `Clears ${clearOn}`);
	}
	if (tracker.capacity !== undefined) parts.push(`Up to ${tracker.capacity}`);
	return parts.join(' · ');
}
