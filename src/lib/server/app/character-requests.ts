import type { Character } from '@domain/schemas/characters';
import {
	CharacterRequestSchema,
	CreateRequestSchema,
	RequestAckSchema,
	RequestActionSchema,
	type CharacterRequest,
	type CharacterRequestList,
	type RequestAction,
	type RequestRecipient
} from '@domain/schemas/character-requests';
import {
	initialSideStates,
	NOT_AUTHORIZED,
	reconcile,
	sidesOf,
	transition
} from '@domain/character-requests';
import {
	databaseDialect,
	execute,
	jsonParam,
	parseJson,
	queryOne,
	queryRows
} from '$lib/server/db/client';
import { getCampaignAccess, getCharacterAccess } from './repository';

// Shared-character requests. The server tracks consent and progress only: it never edits a character,
// because every player's sheet saves its whole character and would overwrite such an edit. Each
// player's own sheet applies its own side of an accepted request and reports back.

const MAX_PENDING_PER_PLAYER = 20;
const LIST_LIMIT = 40;

type RequestRow = {
	id: string;
	campaign_id: string;
	from_character_id: string;
	to_character_id: string;
	from_user_id: string;
	to_user_id: string;
	payload: unknown;
	status: string;
	revert_requested_by: string | null;
	sender_state: string;
	recipient_state: string;
	sender_applied: unknown;
	recipient_applied: unknown;
	created_at: string | number | Date;
	updated_at: string | number | Date;
};

type CharacterRow = { id: string; owner_user_id: string; character: unknown };

function requireUser(userId: string | undefined) {
	if (!userId) throw new Error('Unauthenticated');
	return userId;
}

function nowDb() {
	return databaseDialect === 'sqlite' ? Date.now() : new Date().toISOString();
}

function toIso(value: string | number | Date): string {
	if (value instanceof Date) return value.toISOString();
	const date =
		typeof value === 'number'
			? new Date(value)
			: new Date(/^\d+$/.test(value) ? Number(value) : value);
	return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

async function loadCharacters(ids: string[]): Promise<Map<string, CharacterRow>> {
	if (ids.length === 0) return new Map();
	const rows = await queryRows<CharacterRow>(
		`select id, owner_user_id, character from characters where id in (${ids.map(() => '?').join(',')})`,
		ids
	);
	return new Map(rows.map((row) => [row.id, row]));
}

function characterName(row: CharacterRow | undefined): string {
	if (!row) return '';
	const character = parseJson<Partial<Character>>(row.character);
	return (character.name ?? '').trim();
}

function toRequest(row: RequestRow, characters: Map<string, CharacterRow>): CharacterRequest {
	return CharacterRequestSchema.parse({
		id: row.id,
		campaign_id: row.campaign_id,
		from_character_id: row.from_character_id,
		to_character_id: row.to_character_id,
		from_user_id: row.from_user_id,
		to_user_id: row.to_user_id,
		from_name: characterName(characters.get(row.from_character_id)),
		to_name: characterName(characters.get(row.to_character_id)),
		payload: parseJson(row.payload),
		status: row.status,
		revert_requested_by: row.revert_requested_by ?? null,
		sender_state: row.sender_state,
		recipient_state: row.recipient_state,
		sender_applied: parseJson(row.sender_applied ?? '[]'),
		recipient_applied: parseJson(row.recipient_applied ?? '[]'),
		created_at: toIso(row.created_at),
		updated_at: toIso(row.updated_at)
	});
}

async function loadRequest(id: string): Promise<RequestRow | null> {
	return await queryOne<RequestRow>('select * from character_requests where id = ?', [id]);
}

/** Writes the status when reconciling finds it behind its sides. */
async function healStatus(row: RequestRow, characters: Map<string, CharacterRow>) {
	const request = toRequest(row, characters);
	const healed = reconcile(request);
	if (healed.status !== request.status) {
		await execute('update character_requests set status = ?, updated_at = ? where id = ?', [
			healed.status,
			nowDb(),
			row.id
		]);
	}
	return healed;
}

/** The requests that involve a character, and the allies the viewer can send to. */
export async function listCharacterRequests(
	userId: string | undefined,
	characterId: string
): Promise<CharacterRequestList> {
	const uid = requireUser(userId);
	const access = await getCharacterAccess(uid, characterId);
	if (!access) throw new Error(NOT_AUTHORIZED);

	const rows = await queryRows<RequestRow>(
		`select * from character_requests
		 where from_character_id = ? or to_character_id = ?
		 order by updated_at desc limit ${LIST_LIMIT}`,
		[characterId, characterId]
	);
	const ids = [...new Set(rows.flatMap((row) => [row.from_character_id, row.to_character_id]))];
	const characters = await loadCharacters(ids);
	const requests = await Promise.all(rows.map((row) => healStatus(row, characters)));

	return {
		viewer_user_id: uid,
		requests,
		recipients: access.isOwner
			? await listRecipients(uid, characterId, access.character.campaign_id)
			: []
	};
}

async function listRecipients(
	userId: string,
	characterId: string,
	campaignId: string | undefined
): Promise<RequestRecipient[]> {
	if (!campaignId) return [];
	const campaign = await getCampaignAccess(userId, campaignId);
	if (!campaign) return [];
	const ids = campaign.characters
		.filter((entry) => entry.status === 'active' && entry.character_id !== characterId)
		.map((entry) => entry.character_id as string);
	const characters = await loadCharacters(ids);
	return ids.flatMap((id) => {
		const row = characters.get(id);
		const member = campaign.members.find((candidate) => candidate.clerk_id === row?.owner_user_id);
		if (!row || !member) return [];
		return [
			{
				character_id: id,
				name: characterName(row) || 'Unnamed character',
				player_name: member.display_name ?? ''
			}
		];
	});
}

/** A player asks to change their own and/or an ally's character. Nothing changes until the ally accepts. */
export async function createCharacterRequest(
	userId: string | undefined,
	fromCharacterId: string,
	data: unknown
): Promise<CharacterRequest> {
	const uid = requireUser(userId);
	const input = CreateRequestSchema.parse(data);
	if (input.to_character_id === fromCharacterId) throw new Error('Choose another character');

	const from = await getCharacterAccess(uid, fromCharacterId);
	if (!from?.isOwner) throw new Error(NOT_AUTHORIZED);
	const campaignId = from.character.campaign_id;
	if (!campaignId) throw new Error('This character is not in a campaign');
	const campaign = await getCampaignAccess(uid, campaignId);
	if (!campaign) throw new Error(NOT_AUTHORIZED);

	const to = await getCharacterAccess(uid, input.to_character_id);
	if (!to || to.character.campaign_id !== campaignId) throw new Error(NOT_AUTHORIZED);
	const isActive = (id: string) =>
		campaign.characters.some((entry) => entry.character_id === id && entry.status === 'active');
	if (!isActive(fromCharacterId) || !isActive(input.to_character_id)) {
		throw new Error('Both characters must be active in the campaign');
	}
	if (!campaign.members.some((member) => member.clerk_id === to.ownerUserId)) {
		throw new Error('That character has no player in the campaign');
	}

	const pending = await queryOne<{ count: number | string }>(
		"select count(*) as count from character_requests where from_user_id = ? and status = 'pending'",
		[uid]
	);
	if (Number(pending?.count ?? 0) >= MAX_PENDING_PER_PLAYER) {
		throw new Error('Too many requests are waiting for a reply');
	}

	const id = crypto.randomUUID();
	const states = initialSideStates(input.payload);
	const now = nowDb();
	await execute(
		`insert into character_requests (
			id, campaign_id, from_character_id, to_character_id, from_user_id, to_user_id,
			payload, status, revert_requested_by, sender_state, recipient_state,
			sender_applied, recipient_applied, created_at, updated_at
		) values (?, ?, ?, ?, ?, ?, ?, 'pending', null, ?, ?, '[]', '[]', ?, ?)`,
		[
			id,
			campaignId,
			fromCharacterId,
			input.to_character_id,
			uid,
			to.ownerUserId,
			jsonParam(input.payload),
			states.sender_state,
			states.recipient_state,
			now,
			now
		]
	);
	const row = await loadRequest(id);
	if (!row) throw new Error('Request was not saved');
	return toRequest(row, await loadCharacters([fromCharacterId, input.to_character_id]));
}

/** One player's step on a request: reply, cancel, report applying it, or ask for / answer an undo. */
export async function respondToCharacterRequest(
	userId: string | undefined,
	requestId: string,
	action: string,
	data?: unknown
): Promise<CharacterRequest> {
	const uid = requireUser(userId);
	const parsedAction: RequestAction = RequestActionSchema.parse(action);
	const row = await loadRequest(requestId);
	if (!row) throw new Error('Request not found');
	// Only players still in the campaign take part; a GM or any other member has no side to act for.
	if (!(await getCampaignAccess(uid, row.campaign_id))) throw new Error(NOT_AUTHORIZED);

	const characters = await loadCharacters([row.from_character_id, row.to_character_id]);
	const current = toRequest(row, characters);
	if (sidesOf(current, uid).length === 0) throw new Error(NOT_AUTHORIZED);

	const ack =
		parsedAction === 'ack' || parsedAction === 'ack_revert'
			? RequestAckSchema.parse(data)
			: undefined;
	const next = transition(current, uid, parsedAction, ack);
	const now = nowDb();

	if (ack) {
		// Each side writes only its own columns so two players acking at once cannot overwrite each other.
		const sender = ack.side === 'sender';
		const stateColumn = sender ? 'sender_state' : 'recipient_state';
		const appliedColumn = sender ? 'sender_applied' : 'recipient_applied';
		const state = sender ? next.sender_state : next.recipient_state;
		const applied = sender ? next.sender_applied : next.recipient_applied;
		await execute(
			`update character_requests set ${stateColumn} = ?, ${appliedColumn} = ?, updated_at = ? where id = ?`,
			[state, jsonParam(applied), now, requestId]
		);
		if (next.status === 'failed' && current.status !== 'failed') {
			await execute("update character_requests set status = 'failed' where id = ?", [requestId]);
		}
	} else {
		await execute(
			'update character_requests set status = ?, revert_requested_by = ?, updated_at = ? where id = ?',
			[next.status, next.revert_requested_by, now, requestId]
		);
	}

	const saved = await loadRequest(requestId);
	if (!saved) throw new Error('Request not found');
	return await healStatus(saved, characters);
}
