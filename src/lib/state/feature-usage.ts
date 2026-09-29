import type { Feature, FeatureUsage, UsageReset } from '@domain/schemas/rules';

export type UsageItemType =
	'domain_cards' | 'classes' | 'subclasses' | 'ancestry_cards' | 'community_cards';

// Maps sheet card types to the compendium tables their usage state is keyed by.
export const USAGE_ITEM_TYPES = {
	domain_card: 'domain_cards',
	subclass_card: 'subclasses',
	ancestry_card: 'ancestry_cards',
	community_card: 'community_cards'
} as const satisfies Record<string, UsageItemType>;

export type UsageSource = {
	item_type: UsageItemType;
	item_id: string;
	title: string;
	features: Feature[];
};

export type UsageTracker = {
	key: string;
	item_type: UsageItemType;
	item_id: string;
	source_title: string;
	feature_title: string;
	label?: string;
	max_uses: number;
	reset: UsageReset;
};

export type UsageResetEvent = 'short_rest' | 'long_rest' | 'scene' | 'session';

// A long rest also counts as a rest; no event implies any other (a rest never ends a scene or session).
const RESETS_BY_EVENT: Record<UsageResetEvent, readonly UsageReset[]> = {
	short_rest: ['rest'],
	long_rest: ['rest', 'long_rest'],
	scene: ['scene'],
	session: ['session']
};

export const USAGE_RESET_CAPTIONS: Record<UsageReset, string> = {
	rest: 'per rest',
	long_rest: 'per long rest',
	scene: 'per scene',
	session: 'per session',
	never: 'one-time'
};

const REFRESH_CAPTIONS: Record<UsageReset, string | undefined> = {
	rest: 'refreshes on a rest',
	long_rest: 'refreshes on a long rest',
	scene: 'refreshes next scene',
	session: 'refreshes next session',
	never: undefined
};

/** Describes the limit, e.g. "Once per rest", "2× per long rest" or "One-time use". */
export function usageLimitCaption(usage: Pick<FeatureUsage, 'max_uses' | 'reset'>): string {
	if (usage.reset === 'never') {
		return usage.max_uses === 1 ? 'One-time use' : `${usage.max_uses} one-time uses`;
	}
	const count = usage.max_uses === 1 ? 'Once' : `${usage.max_uses}×`;
	return `${count} ${USAGE_RESET_CAPTIONS[usage.reset]}`;
}

/**
 * Describes the tracker's current state next to its diamonds. Without a known number of remaining
 * uses (e.g. when browsing the compendium) it only describes the limit.
 */
export function usageStateCaption(
	usage: Pick<FeatureUsage, 'max_uses' | 'reset'>,
	available?: number
): string {
	if (available === undefined || available >= usage.max_uses) return usageLimitCaption(usage);
	if (available <= 0) {
		const refresh = REFRESH_CAPTIONS[usage.reset];
		return refresh ? `Spent · ${refresh}` : 'Spent';
	}
	return `${available} of ${usage.max_uses} left · ${USAGE_RESET_CAPTIONS[usage.reset]}`;
}

/**
 * Builds a usage id from the feature title when uses are first enabled. Editors keep the id after
 * that, because character state is keyed by it across published versions.
 */
export function generateUsageId(
	title: string,
	takenIds: Iterable<string>,
	fallback: string
): string {
	const taken = new Set(takenIds);
	const base =
		title
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '') || fallback;
	let id = base;
	for (let suffix = 2; taken.has(id); suffix++) id = `${base}_${suffix}`;
	return id;
}

export function usageKey(itemType: UsageItemType, itemId: string, usageId: string): string {
	return `${itemType}:${itemId}:${usageId}`;
}

export function collectUsageTrackers(sources: UsageSource[]): UsageTracker[] {
	const trackers = new Map<string, UsageTracker>();
	for (const source of sources) {
		for (const feature of source.features) {
			const usage: FeatureUsage | undefined = feature.usage;
			if (!usage) continue;
			const key = usageKey(source.item_type, source.item_id, usage.id);
			if (trackers.has(key)) continue;
			trackers.set(key, {
				key,
				item_type: source.item_type,
				item_id: source.item_id,
				source_title: source.title,
				feature_title: feature.title,
				label: usage.label,
				max_uses: usage.max_uses,
				reset: usage.reset
			});
		}
	}
	return [...trackers.values()];
}

function clampUses(value: number, max: number): number {
	return Math.max(0, Math.min(max, Number.isFinite(value) ? Math.trunc(value) : 0));
}

/**
 * Drops state for items the character no longer possesses. Like card fields, spent uses are kept
 * while the item is owned even if its current version no longer configures that tracker.
 */
export function pruneFeatureUses(
	featureUses: Record<string, number>,
	sources: Pick<UsageSource, 'item_type' | 'item_id'>[]
): Record<string, number> {
	const isOwned = ownedFeatureKeyFilter(sources);
	return Object.fromEntries(
		Object.entries(featureUses).filter(
			([key, spent]) => Number.isInteger(spent) && spent > 0 && isOwned(key)
		)
	);
}

/** Matches `${item_type}:${item_id}:${id}` keys that belong to an item the character possesses. */
export function ownedFeatureKeyFilter(
	sources: Pick<UsageSource, 'item_type' | 'item_id'>[]
): (key: string) => boolean {
	const ownedPrefixes = new Set(sources.map((source) => `${source.item_type}:${source.item_id}:`));
	return (key) => ownedPrefixes.has(key.slice(0, key.lastIndexOf(':') + 1));
}

export function spentUses(featureUses: Record<string, number>, tracker: UsageTracker): number {
	return clampUses(featureUses[tracker.key] ?? 0, tracker.max_uses);
}

export function setFeatureUses(
	featureUses: Record<string, number>,
	tracker: UsageTracker,
	spent: number
): Record<string, number> {
	const next = { ...featureUses };
	const value = clampUses(spent, tracker.max_uses);
	if (value > 0) next[tracker.key] = value;
	else delete next[tracker.key];
	return next;
}

/** Refreshes a single tracker without touching any other feature. */
export function refreshFeatureUses(
	featureUses: Record<string, number>,
	tracker: UsageTracker
): Record<string, number> {
	return setFeatureUses(featureUses, tracker, 0);
}

export function applyUsageResetEvent(
	featureUses: Record<string, number>,
	trackers: UsageTracker[],
	event: UsageResetEvent
): { next: Record<string, number>; refreshed: UsageTracker[] } {
	const resets = RESETS_BY_EVENT[event];
	const next = { ...featureUses };
	const refreshed: UsageTracker[] = [];
	for (const tracker of trackers) {
		if (!resets.includes(tracker.reset)) continue;
		if ((next[tracker.key] ?? 0) <= 0) continue;
		delete next[tracker.key];
		refreshed.push(tracker);
	}
	return { next, refreshed };
}
