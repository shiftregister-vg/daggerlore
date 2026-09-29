import type { Character } from '@domain/schemas/characters';

const KEYS = [
	'marked_hp',
	'marked_stress',
	'marked_hope',
	'marked_armor',
	'card_tokens',
	'feature_choices',
	'feature_uses',
	'feature_pool_tokens',
	'feature_pool_dice',
	'feature_records',
	'active_effects',
	'rest_moves',
	'companion'
] as const satisfies readonly (keyof Character)[];

export type DowntimeSnapshot = Pick<Character, (typeof KEYS)[number]>;
export type CharacterGetter = () => Character | undefined;

/** Everything a downtime move, rest, scene or session change can touch, copied so it can be restored. */
export function snapshotDowntime(character: Character): DowntimeSnapshot {
	return Object.fromEntries(KEYS.map((key) => [key, clone(character[key])])) as DowntimeSnapshot;
}

// JSON rather than structuredClone: character fields can be Svelte state proxies.
function clone<T>(value: T): T {
	return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

/** Writes a snapshot back. Restoring the same snapshot twice leaves the same character. */
export function restoreDowntime(character: Character, snapshot: DowntimeSnapshot) {
	for (const key of KEYS) {
		(character as Record<string, unknown>)[key] = clone(snapshot[key]);
	}
}
