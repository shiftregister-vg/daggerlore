import type { Character } from '@domain/schemas/characters';
import {
	databaseDialect,
	execute,
	jsonParam,
	parseJson,
	queryOne,
	queryRows
} from '$lib/server/db/client';

// A short history of each character, so a bad save (a sheet that loaded incompletely, a bug) can always
// be undone. A version is the character as it was just before a save changed it. They are kept at most
// every few minutes while a character is being edited, and only the newest few are kept.

export const VERSION_INTERVAL_MS = 15 * 60 * 1000;
export const MAX_VERSIONS = 20;

export type CharacterVersionRow = {
	id: string;
	character_id: string;
	character: unknown;
	reason: string;
	created_at: string | number | Date;
};

function nowDb() {
	return databaseDialect === 'sqlite' ? Date.now() : new Date().toISOString();
}

export function versionTime(value: string | number | Date): number {
	if (value instanceof Date) return value.getTime();
	if (typeof value === 'number') return value;
	return /^\d+$/.test(value) ? Number(value) : new Date(value).getTime();
}

/**
 * Keeps the character as it is now, unless nothing has changed since the last version or the last version
 * is recent. `force` keeps one regardless of age (before a restore, or before refusing an unsafe save).
 */
export async function snapshotCharacter(
	characterId: string,
	character: Character,
	reason: string,
	options: { force?: boolean; now?: number } = {}
): Promise<boolean> {
	const latest = await queryOne<CharacterVersionRow>(
		'select id, character, created_at from character_versions where character_id = ? order by created_at desc limit 1',
		[characterId]
	);
	const serialized = jsonParam(character);
	if (latest) {
		const same = jsonParam(parseJson<Character>(latest.character)) === serialized;
		if (same) return false;
		const age = (options.now ?? Date.now()) - versionTime(latest.created_at);
		if (!options.force && age < VERSION_INTERVAL_MS) return false;
	}

	await execute(
		'insert into character_versions (id, character_id, character, reason, created_at) values (?, ?, ?, ?, ?)',
		[crypto.randomUUID(), characterId, serialized, reason, nowDb()]
	);
	await execute(
		`delete from character_versions where character_id = ? and id not in (
			select id from character_versions where character_id = ? order by created_at desc limit ${MAX_VERSIONS}
		)`,
		[characterId, characterId]
	);
	return true;
}

export async function listVersionRows(characterId: string): Promise<CharacterVersionRow[]> {
	return await queryRows<CharacterVersionRow>(
		'select id, character_id, character, reason, created_at from character_versions where character_id = ? order by created_at desc',
		[characterId]
	);
}

export async function getVersionRow(
	characterId: string,
	versionId: string
): Promise<CharacterVersionRow | null> {
	return await queryOne<CharacterVersionRow>(
		'select id, character_id, character, reason, created_at from character_versions where character_id = ? and id = ?',
		[characterId, versionId]
	);
}
