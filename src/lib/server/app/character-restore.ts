import type { Character } from '@domain/schemas/characters';
import { execute, jsonParam, parseJson } from '$lib/server/db/client';
import { getCharacterAccess } from './repository';
import {
	getVersionRow,
	listVersionRows,
	snapshotCharacter,
	versionTime
} from './character-versions';

export type CharacterVersionSummary = {
	id: string;
	created_at: string;
	reason: string;
	name: string;
	level: number;
	primary_class_id: string | null;
	ancestry_card_id: string | null;
};

function requireUser(userId: string | undefined) {
	if (!userId) throw new Error('Unauthenticated');
	return userId;
}

/** Earlier versions of a character, newest first. Only the character's owner can see or restore them. */
export async function listCharacterVersions(
	userId: string | undefined,
	characterId: string
): Promise<CharacterVersionSummary[]> {
	const uid = requireUser(userId);
	const access = await getCharacterAccess(uid, characterId);
	if (!access?.isOwner) throw new Error('Not authorized');
	const rows = await listVersionRows(characterId);
	return rows.map((row) => {
		const character = parseJson<Partial<Character>>(row.character);
		return {
			id: row.id,
			created_at: new Date(versionTime(row.created_at)).toISOString(),
			reason: row.reason,
			name: character.name ?? '',
			level: character.level ?? 1,
			primary_class_id: character.primary_class_id ?? null,
			ancestry_card_id: character.ancestry_card_id ?? null
		};
	});
}

/** Puts an earlier version back. The current character is kept as a version first, so this can be undone. */
export async function restoreCharacterVersion(
	userId: string | undefined,
	characterId: string,
	versionId: string
): Promise<void> {
	const uid = requireUser(userId);
	const access = await getCharacterAccess(uid, characterId);
	if (!access?.isOwner) throw new Error('Not authorized');
	const row = await getVersionRow(characterId, versionId);
	if (!row) throw new Error('That version no longer exists');

	const restored = parseJson<Character>(row.character);
	await snapshotCharacter(characterId, access.character, 'before a restore', { force: true });
	await execute('update characters set character = ?, updated_at = ? where id = ?', [
		jsonParam({ ...restored, campaign_id: access.character.campaign_id }),
		new Date().toISOString(),
		characterId
	]);
}
