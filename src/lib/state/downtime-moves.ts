import type { Character } from '@domain/schemas/characters';
import type { DowntimeAllowance } from '@domain/schemas/rules';
import { usageKey, type UsageItemType, type UsageSource } from './feature-usage';
import type { EffectState } from './feature-effects';
import { extraMoveGrantsFor } from './request-effects';
import type { ReceivedGrant } from '@domain/schemas/character-requests';

export type RestKind = 'short' | 'long';
export type MoveEntry = Character['rest_moves'][number];

/** One line of a rest's allowance, e.g. "Standard: 2 moves" or "Recovery: 1 long rest move". */
export type AllowanceSlot = {
	id: string;
	label: string;
	source_title?: string;
	kind: 'standard' | DowntimeAllowance['kind'];
	count: number;
};

export type RestAllowances = Record<RestKind, AllowanceSlot[]>;

export type AllowanceSummary = {
	rest: RestKind;
	/** Moves the rest allows: the standard ones plus every extra grant. */
	total: number;
	/** Moves taken since this rest last completed. */
	taken: number;
	/** How many of those moves may be of the other rest's kind. */
	alternate_allowed: number;
	alternate_taken: number;
	over_total: number;
	over_alternate: number;
	slots: AllowanceSlot[];
};

export const STANDARD_ALLOWANCE_ID = 'standard';

const REST_LABELS: Record<RestKind, string> = { short: 'short rest', long: 'long rest' };

/**
 * Builds each rest's allowances: the standard moves (the existing modifier-driven maximum, which
 * already includes always-on bonuses like Celestial Trance) plus the allowances features grant.
 * A feature's allowance only counts while its card is eligible and its required effect is active.
 */
export function collectDowntimeAllowances(
	sources: UsageSource[],
	standard: Record<RestKind, number>,
	options: {
		isEligible?: (source: UsageSource, allowance: DowntimeAllowance) => boolean;
		activeEffects?: EffectState;
		/** Extra moves other players granted, which count toward the rest they name. */
		received?: readonly ReceivedGrant[];
	} = {}
): RestAllowances {
	const result: RestAllowances = {
		short: [
			{ id: STANDARD_ALLOWANCE_ID, label: 'Standard', kind: 'standard', count: standard.short }
		],
		long: [{ id: STANDARD_ALLOWANCE_ID, label: 'Standard', kind: 'standard', count: standard.long }]
	};
	const seen = new Set<string>();
	for (const source of sources) {
		for (const feature of source.features) {
			for (const allowance of feature.downtime_allowances ?? []) {
				const key = usageKey(source.item_type, source.item_id, allowance.id);
				if (seen.has(key)) continue;
				seen.add(key);
				if (options.isEligible && !options.isEligible(source, allowance)) continue;
				if (allowance.requires_active_effect) {
					const effectKey = usageKey(
						source.item_type as UsageItemType,
						source.item_id,
						allowance.requires_active_effect
					);
					if (!(options.activeEffects?.[effectKey]?.length ?? 0)) continue;
				}
				result[allowance.rest].push({
					id: key,
					label: allowance.label || feature.title || source.title,
					source_title: source.title,
					kind: allowance.kind,
					count: allowance.count
				});
			}
		}
	}
	for (const rest of ['short', 'long'] as const) {
		for (const received of extraMoveGrantsFor(options.received ?? [], rest)) {
			if (received.grant.kind !== 'extra_move') continue;
			result[rest].push({
				id: received.id,
				label: received.grant.label || `From ${received.from_name || 'an ally'}`,
				source_title: received.from_name,
				kind: 'extra_move',
				count: received.grant.count
			});
		}
	}
	return result;
}

export function summarizeRest(
	rest: RestKind,
	allowances: RestAllowances,
	moves: readonly MoveEntry[]
): AllowanceSummary {
	const slots = allowances[rest];
	const total = slots
		.filter((slot) => slot.kind !== 'alternate_move')
		.reduce((sum, slot) => sum + slot.count, 0);
	const alternate_allowed = slots
		.filter((slot) => slot.kind === 'alternate_move')
		.reduce((sum, slot) => sum + slot.count, 0);
	const taken = moves.filter((move) => move.rest === rest);
	const alternate_taken = taken.filter((move) => move.category !== rest).length;
	return {
		rest,
		total,
		taken: taken.length,
		alternate_allowed,
		alternate_taken,
		over_total: Math.max(0, taken.length - total),
		over_alternate: Math.max(0, alternate_taken - alternate_allowed),
		slots
	};
}

/** Describes what one more move would exceed, or undefined when it fits. Never blocks the move. */
export function moveWarning(summary: AllowanceSummary, category: RestKind): string | undefined {
	const alternate = category !== summary.rest;
	const overTotal = summary.taken + 1 > summary.total;
	const overAlternate = alternate && summary.alternate_taken + 1 > summary.alternate_allowed;
	if (overAlternate) {
		return `Nothing on your sheet lets you take a ${REST_LABELS[category]} move during a ${REST_LABELS[summary.rest]}. Confirm with your GM.`;
	}
	if (overTotal) {
		return `That is more than the ${summary.total} ${summary.total === 1 ? 'move' : 'moves'} your ${REST_LABELS[summary.rest]} allows. Confirm with your GM.`;
	}
	return undefined;
}

export function recordMove(
	moves: readonly MoveEntry[],
	entry: Omit<MoveEntry, 'id' | 'at'>,
	id: string = crypto.randomUUID(),
	at: string = new Date().toISOString()
): MoveEntry[] {
	return [...moves, { ...entry, id, at }];
}

export function undoMove(moves: readonly MoveEntry[], id: string): MoveEntry[] {
	return moves.filter((move) => move.id !== id);
}

/** Completing a rest clears that rest's chosen moves; moves chosen for the other rest stay chosen. */
export function clearRestMoves(moves: readonly MoveEntry[], rest: RestKind): MoveEntry[] {
	return moves.filter((move) => move.rest !== rest);
}

export type MoveResources = Pick<
	Character,
	'marked_hp' | 'marked_stress' | 'marked_hope' | 'marked_armor'
>;

/**
 * Applies chosen moves in the order they were chosen. Choosing a move changes nothing on the sheet;
 * this runs when the rest is completed. `stressCleared` is what the owner actually cleared, which a
 * companion may clear as well.
 */
export function applyMoves(
	resources: MoveResources,
	moves: readonly Pick<MoveEntry, 'action' | 'amount'>[],
	maxHope: number
): { resources: MoveResources; stressCleared: number } {
	const next = { ...resources };
	let stressCleared = 0;
	const clear = (key: 'marked_hp' | 'marked_stress' | 'marked_armor', amount: number) => {
		const before = next[key];
		next[key] = Math.max(0, before - amount);
		return before - next[key];
	};
	for (const move of moves) {
		const amount = move.amount ?? 0;
		switch (move.action) {
			case 'tend_to_wounds':
				clear('marked_hp', amount);
				break;
			case 'clear_all_hp':
				clear('marked_hp', next.marked_hp);
				break;
			case 'clear_stress':
				stressCleared += clear('marked_stress', amount);
				break;
			case 'clear_all_stress':
				stressCleared += clear('marked_stress', next.marked_stress);
				break;
			case 'repair_armor':
				clear('marked_armor', amount);
				break;
			case 'clear_all_armor':
				clear('marked_armor', next.marked_armor);
				break;
			case 'prepare':
				next.marked_hope = Math.min(maxHope, next.marked_hope + amount);
				break;
			case 'project':
				break;
		}
	}
	return { resources: next, stressCleared };
}

/** What a chosen move will do once the rest is completed, e.g. "clears 5 HP". */
export function describeMove(move: Pick<MoveEntry, 'action' | 'amount'>): string {
	const amount = move.amount ?? 0;
	switch (move.action) {
		case 'tend_to_wounds':
			return `clears ${amount} HP`;
		case 'clear_stress':
			return `clears ${amount} Stress`;
		case 'repair_armor':
			return `clears ${amount} Armor ${amount === 1 ? 'Slot' : 'Slots'}`;
		case 'prepare':
			return `gains ${amount} Hope`;
		case 'clear_all_hp':
			return 'clears all HP';
		case 'clear_all_stress':
			return 'clears all Stress';
		case 'clear_all_armor':
			return 'clears all Armor Slots';
		case 'project':
			return 'no change to the sheet';
	}
}

/** Describes what a feature's allowance grants, e.g. "1 long rest move during a short rest". */
export function describeDowntimeAllowance(
	allowance: Pick<DowntimeAllowance, 'rest' | 'kind' | 'count'>
): string {
	const other = allowance.rest === 'short' ? 'long' : 'short';
	const moves = allowance.count === 1 ? 'move' : 'moves';
	return allowance.kind === 'extra_move'
		? `${allowance.count} extra ${moves} during a ${allowance.rest} rest`
		: `${allowance.count} ${other} rest ${moves} during a ${allowance.rest} rest`;
}

/** e.g. "Standard 2 · Recovery: 1 long rest move". */
export function allowanceBreakdown(summary: AllowanceSummary): string {
	return summary.slots
		.map((slot) => {
			if (slot.kind === 'standard') return `Standard ${slot.count}`;
			if (slot.kind === 'extra_move') return `${slot.label} +${slot.count}`;
			const other = summary.rest === 'short' ? 'long' : 'short';
			return `${slot.label}: ${slot.count} ${other} rest ${slot.count === 1 ? 'move' : 'moves'}`;
		})
		.join(' · ');
}
