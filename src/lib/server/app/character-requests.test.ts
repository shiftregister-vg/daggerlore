import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INVALID_STATE, NOT_AUTHORIZED } from '@domain/character-requests';

// The request SQL runs against a real in-memory SQLite database built from the migration, so the
// queries, constraints and JSON round trips are exercised, not mocked.
vi.mock('$lib/server/db/client', async () => {
	const Database = (await import('better-sqlite3')).default;
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	return {
		databaseDialect: 'sqlite',
		__sqlite: sqlite,
		queryRows: async (query: string, params: unknown[] = []) =>
			sqlite.prepare(query).all(...params),
		queryOne: async (query: string, params: unknown[] = []) =>
			sqlite.prepare(query).all(...params)[0] ?? null,
		execute: async (query: string, params: unknown[] = []) => {
			sqlite.prepare(query).run(...params);
		},
		jsonParam: (value: unknown) => JSON.stringify(value),
		parseJson: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value)
	};
});

// Access rules as the repository defines them: any campaign member reads a campaign character, and
// only the owner is treated as its player.
vi.mock('./repository', () => ({
	getCharacterAccess: vi.fn(),
	getCampaignAccess: vi.fn()
}));

import * as client from '$lib/server/db/client';
import * as repository from './repository';
import {
	createCharacterRequest,
	listCharacterRequests,
	respondToCharacterRequest
} from './character-requests';

const sqlite = (client as unknown as { __sqlite: import('better-sqlite3').Database }).__sqlite;

const ALICE = 'alice';
const BOB = 'bob';
const GM = 'gm';
const EVE = 'eve';
const CAMPAIGN = 'campaign-1';

const characters: Record<string, { owner: string; name: string; campaign: string | null }> = {
	A: { owner: ALICE, name: 'Aria', campaign: CAMPAIGN },
	A2: { owner: ALICE, name: 'Aria the Younger', campaign: CAMPAIGN },
	B: { owner: BOB, name: 'Bram', campaign: CAMPAIGN },
	N: { owner: GM, name: 'Narrator', campaign: CAMPAIGN }
};
const members = [
	{ clerk_id: ALICE, display_name: 'Alice', role: 'Player' },
	{ clerk_id: BOB, display_name: 'Bob', role: 'Player' },
	{ clerk_id: GM, display_name: 'Gary', role: 'GM' }
];
const campaignCharacters = [
	{ character_id: 'A', status: 'active' },
	{ character_id: 'A2', status: 'active' },
	{ character_id: 'B', status: 'active' },
	{ character_id: 'N', status: 'unclaimed' }
];

const transferPayload = {
	title: 'Share the Burden',
	sender_deltas: [
		{ field: 'marked_stress', delta: 2 },
		{ field: 'marked_hope', delta: 2 }
	],
	recipient_deltas: [{ field: 'marked_stress', delta: -2 }]
};
const grantPayload = {
	title: 'Eloquent',
	recipient_grant: { kind: 'extra_move', rest: 'any', count: 1 }
};

beforeEach(() => {
	sqlite.exec(
		'drop table if exists character_requests; drop table if exists characters; drop table if exists campaigns; drop table if exists users;'
	);
	sqlite.exec(
		'create table users (id text primary key); create table campaigns (id text primary key); create table characters (id text primary key, owner_user_id text, campaign_id text, character text);'
	);
	for (const id of [ALICE, BOB, GM, EVE])
		sqlite.prepare('insert into users (id) values (?)').run(id);
	sqlite.prepare('insert into campaigns (id) values (?)').run(CAMPAIGN);
	for (const [id, row] of Object.entries(characters)) {
		sqlite
			.prepare(
				'insert into characters (id, owner_user_id, campaign_id, character) values (?, ?, ?, ?)'
			)
			.run(id, row.owner, row.campaign, JSON.stringify({ name: row.name }));
	}
	const migration = readFileSync('drizzle/sqlite/0012_character_requests.sql', 'utf8');
	for (const statement of migration.split('--> statement-breakpoint')) sqlite.exec(statement);

	vi.mocked(repository.getCampaignAccess).mockImplementation(async (userId, campaignId) => {
		const member = members.find((candidate) => candidate.clerk_id === userId);
		if (!member || campaignId !== CAMPAIGN) return null;
		return {
			campaign_id: CAMPAIGN,
			invite_code: 'x',
			campaign: {} as never,
			members: members as never,
			characters: campaignCharacters as never,
			isOwner: member.role === 'GM'
		};
	});
	vi.mocked(repository.getCharacterAccess).mockImplementation(async (userId, characterId) => {
		const row = characters[characterId];
		const member = members.find((candidate) => candidate.clerk_id === userId);
		if (!row || (!member && row.owner !== userId)) return null;
		return {
			character: { name: row.name, campaign_id: row.campaign ?? undefined } as never,
			canEdit: row.owner === userId || member?.role === 'GM',
			canEditInventory: true,
			isOwner: row.owner === userId,
			ownerUserId: row.owner
		};
	});
});

async function sendTransfer() {
	return await createCharacterRequest(ALICE, 'A', {
		to_character_id: 'B',
		payload: transferPayload
	});
}
async function sendGrant() {
	return await createCharacterRequest(ALICE, 'A', { to_character_id: 'B', payload: grantPayload });
}
const ack = (side: 'sender' | 'recipient') => ({
	side,
	ok: true,
	applied: [{ field: 'marked_stress', delta: side === 'sender' ? 2 : -2 }]
});

describe('createCharacterRequest', () => {
	it('stores a pending request between two active characters, with what each side must do', async () => {
		const request = await sendTransfer();
		expect(request).toMatchObject({
			status: 'pending',
			from_character_id: 'A',
			to_character_id: 'B',
			from_user_id: ALICE,
			to_user_id: BOB,
			from_name: 'Aria',
			to_name: 'Bram',
			sender_state: 'todo',
			recipient_state: 'todo'
		});
		expect(request.payload.sender_deltas).toHaveLength(2);
	});

	it('marks the untouched side as having nothing to do', async () => {
		expect(await sendGrant()).toMatchObject({ sender_state: 'none', recipient_state: 'todo' });
	});

	it('lets a player send between their own characters', async () => {
		const request = await createCharacterRequest(ALICE, 'A', {
			to_character_id: 'A2',
			payload: grantPayload
		});
		expect(request.to_user_id).toBe(ALICE);
	});

	it('only lets a character’s own player send from it', async () => {
		for (const user of [BOB, GM, EVE]) {
			await expect(
				createCharacterRequest(user, 'A', { to_character_id: 'B', payload: grantPayload })
			).rejects.toThrow(NOT_AUTHORIZED);
		}
	});

	it('only reaches active characters in the same campaign', async () => {
		await expect(
			createCharacterRequest(ALICE, 'A', { to_character_id: 'N', payload: grantPayload })
		).rejects.toThrow('active');
		await expect(
			createCharacterRequest(ALICE, 'A', { to_character_id: 'A', payload: grantPayload })
		).rejects.toThrow('another character');
		await expect(
			createCharacterRequest(ALICE, 'A', { to_character_id: 'missing', payload: grantPayload })
		).rejects.toThrow(NOT_AUTHORIZED);
	});

	it('rejects an invalid payload', async () => {
		await expect(
			createCharacterRequest(ALICE, 'A', { to_character_id: 'B', payload: { title: 'Nothing' } })
		).rejects.toThrow();
	});

	it('limits how many requests wait for a reply', async () => {
		for (let i = 0; i < 20; i++) await sendGrant();
		await expect(sendGrant()).rejects.toThrow('Too many');
	});
});

describe('listCharacterRequests', () => {
	it('shows a request to both players, and offers recipients only to the character’s player', async () => {
		await sendGrant();
		const sender = await listCharacterRequests(ALICE, 'A');
		const recipient = await listCharacterRequests(BOB, 'B');
		expect(sender.requests).toHaveLength(1);
		expect(recipient.requests).toHaveLength(1);
		expect(sender.viewer_user_id).toBe(ALICE);
		expect(sender.recipients.map((entry) => entry.character_id).sort()).toEqual(['A2', 'B']);
		expect(sender.recipients.find((entry) => entry.character_id === 'B')).toMatchObject({
			name: 'Bram',
			player_name: 'Bob'
		});
		expect(recipient.recipients.map((entry) => entry.character_id).sort()).toEqual(['A', 'A2']);
	});

	it('lets a GM read a request but not send anything', async () => {
		await sendGrant();
		const gm = await listCharacterRequests(GM, 'A');
		expect(gm.requests).toHaveLength(1);
		expect(gm.recipients).toEqual([]);
	});

	it('hides everything from people outside the campaign', async () => {
		await sendGrant();
		await expect(listCharacterRequests(EVE, 'A')).rejects.toThrow(NOT_AUTHORIZED);
	});
});

describe('respondToCharacterRequest', () => {
	it('lets only the recipient’s player accept or decline', async () => {
		const { id } = await sendTransfer();
		for (const user of [ALICE, GM, EVE]) {
			await expect(respondToCharacterRequest(user, id, 'accept')).rejects.toThrow(NOT_AUTHORIZED);
			await expect(respondToCharacterRequest(user, id, 'decline')).rejects.toThrow(NOT_AUTHORIZED);
		}
		expect((await respondToCharacterRequest(BOB, id, 'accept')).status).toBe('accepted');
		await expect(respondToCharacterRequest(BOB, id, 'accept')).rejects.toThrow(INVALID_STATE);
		await expect(respondToCharacterRequest(BOB, id, 'decline')).rejects.toThrow(INVALID_STATE);
	});

	it('lets the sender cancel only while it waits', async () => {
		const { id } = await sendTransfer();
		await expect(respondToCharacterRequest(BOB, id, 'cancel')).rejects.toThrow(NOT_AUTHORIZED);
		expect((await respondToCharacterRequest(ALICE, id, 'cancel')).status).toBe('cancelled');

		const accepted = await sendTransfer();
		await respondToCharacterRequest(BOB, accepted.id, 'accept');
		await expect(respondToCharacterRequest(ALICE, accepted.id, 'cancel')).rejects.toThrow(
			INVALID_STATE
		);
	});

	it('applies once each player has reported their own change, in any order or at once', async () => {
		const { id } = await sendTransfer();
		await respondToCharacterRequest(BOB, id, 'accept');
		const [a, b] = await Promise.all([
			respondToCharacterRequest(ALICE, id, 'ack', ack('sender')),
			respondToCharacterRequest(BOB, id, 'ack', ack('recipient'))
		]);
		expect([a.status, b.status]).toContain('applied');
		const listed = await listCharacterRequests(ALICE, 'A');
		expect(listed.requests[0]).toMatchObject({
			status: 'applied',
			sender_state: 'applied',
			recipient_state: 'applied'
		});
		expect(listed.requests[0].sender_applied).toEqual(ack('sender').applied);
	});

	it('does not let a player report for the other side or a GM report at all', async () => {
		const { id } = await sendTransfer();
		await respondToCharacterRequest(BOB, id, 'accept');
		await expect(respondToCharacterRequest(BOB, id, 'ack', ack('sender'))).rejects.toThrow(
			NOT_AUTHORIZED
		);
		await expect(respondToCharacterRequest(GM, id, 'ack', ack('recipient'))).rejects.toThrow(
			NOT_AUTHORIZED
		);
		await expect(respondToCharacterRequest(BOB, id, 'ack', { side: 'bogus' })).rejects.toThrow();
	});

	it('fails the request when a side cannot apply and lets the other undo', async () => {
		const { id } = await sendTransfer();
		await respondToCharacterRequest(BOB, id, 'accept');
		await respondToCharacterRequest(BOB, id, 'ack', ack('recipient'));
		const failed = await respondToCharacterRequest(ALICE, id, 'ack', {
			side: 'sender',
			ok: false,
			reason: 'Stress is full'
		});
		expect(failed).toMatchObject({ status: 'failed', sender_state: 'failed' });
		const undone = await respondToCharacterRequest(BOB, id, 'ack_revert', {
			side: 'recipient',
			ok: true
		});
		expect(undone).toMatchObject({ status: 'failed', recipient_state: 'undone' });
	});

	it('undoes a change to the other player only when they confirm', async () => {
		const { id } = await sendTransfer();
		await respondToCharacterRequest(BOB, id, 'accept');
		await respondToCharacterRequest(BOB, id, 'ack', ack('recipient'));
		await respondToCharacterRequest(ALICE, id, 'ack', ack('sender'));

		const asked = await respondToCharacterRequest(ALICE, id, 'request_revert');
		expect(asked).toMatchObject({ status: 'revert_requested', revert_requested_by: 'sender' });
		await expect(respondToCharacterRequest(ALICE, id, 'confirm_revert')).rejects.toThrow(
			NOT_AUTHORIZED
		);
		await expect(respondToCharacterRequest(GM, id, 'confirm_revert')).rejects.toThrow(
			NOT_AUTHORIZED
		);
		expect((await respondToCharacterRequest(BOB, id, 'confirm_revert')).status).toBe('reverting');

		await respondToCharacterRequest(ALICE, id, 'ack_revert', { side: 'sender', ok: true });
		const done = await respondToCharacterRequest(BOB, id, 'ack_revert', {
			side: 'recipient',
			ok: true
		});
		expect(done.status).toBe('reverted');
	});

	it('lets the other player refuse an undo', async () => {
		const { id } = await sendGrant();
		await respondToCharacterRequest(BOB, id, 'accept');
		await respondToCharacterRequest(BOB, id, 'ack', { side: 'recipient', ok: true });
		await respondToCharacterRequest(ALICE, id, 'request_revert');
		const refused = await respondToCharacterRequest(BOB, id, 'decline_revert');
		expect(refused).toMatchObject({ status: 'applied', revert_requested_by: null });
	});

	it('undoes at once when the other player’s character was untouched', async () => {
		const { id } = await createCharacterRequest(ALICE, 'A', {
			to_character_id: 'B',
			payload: { title: 'Take on Stress', sender_deltas: [{ field: 'marked_stress', delta: 1 }] }
		});
		await respondToCharacterRequest(BOB, id, 'accept');
		await respondToCharacterRequest(ALICE, id, 'ack', ack('sender'));
		expect((await respondToCharacterRequest(ALICE, id, 'request_revert')).status).toBe('reverting');
	});

	it('stops a player who left the campaign from acting', async () => {
		const { id } = await sendGrant();
		vi.mocked(repository.getCampaignAccess).mockResolvedValueOnce(null);
		await expect(respondToCharacterRequest(BOB, id, 'accept')).rejects.toThrow(NOT_AUTHORIZED);
	});

	it('rejects unknown actions and requests', async () => {
		const { id } = await sendGrant();
		await expect(respondToCharacterRequest(BOB, id, 'explode')).rejects.toThrow();
		await expect(respondToCharacterRequest(BOB, 'missing', 'accept')).rejects.toThrow('not found');
	});
});
