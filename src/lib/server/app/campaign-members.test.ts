import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignCharacter, CampaignMember } from '@domain/schemas/campaigns';

// Campaign roster behaviour against in-memory SQLite: the card's player count only includes players
// who still hold a character, and a GM can remove a character and the player's access together.
vi.mock('$lib/server/db/client', async () => {
	const Database = (await import('better-sqlite3')).default;
	const sqlite = new Database(':memory:');
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

import * as client from '$lib/server/db/client';
import { listCampaigns, removeCharacterFromCampaign } from './repository';

const sqlite = (client as unknown as { __sqlite: import('better-sqlite3').Database }).__sqlite;

const CAMPAIGN = 'campaign-1';
const GM = 'gm';

const members: CampaignMember[] = [
	{ clerk_id: GM, display_name: 'GM', role: 'GM' },
	{ clerk_id: 'ann', display_name: 'Ann', role: 'Player' },
	{ clerk_id: 'bo', display_name: 'Bo', role: 'Player' },
	{ clerk_id: 'cy', display_name: 'Cy', role: 'Player' }
];

const campaignCharacters = (): CampaignCharacter[] =>
	[
		{ character_id: 'char-ann', status: 'active', claimed_by_clerk_id: 'ann' },
		{ character_id: 'char-bo', status: 'active', claimed_by_clerk_id: 'bo' },
		// Cy joined but their character was unassigned.
		{ character_id: 'char-cy', status: 'unclaimed' }
	] as CampaignCharacter[];

const row = () =>
	sqlite.prepare('select members, characters from campaigns where id = ?').get(CAMPAIGN) as {
		members: string;
		characters: string;
	};
const storedMembers = () => (JSON.parse(row().members) as CampaignMember[]).map((m) => m.clerk_id);
const storedCharacters = () => JSON.parse(row().characters) as CampaignCharacter[];
const playerCount = async () =>
	(
		(await listCampaigns(GM))[CAMPAIGN] as {
			player_count: number;
		}
	).player_count;

beforeEach(() => {
	sqlite.exec('drop table if exists campaigns; drop table if exists characters;');
	sqlite.exec(
		'create table campaigns (id text primary key, invite_code text, campaign text, members text, characters text, created_at text, updated_at text);' +
			'create table characters (id text primary key, owner_user_id text, campaign_id text, character text, updated_at text);'
	);
	sqlite
		.prepare(
			'insert into campaigns (id, invite_code, campaign, members, characters, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)'
		)
		.run(
			CAMPAIGN,
			'invite',
			JSON.stringify({ name: 'Test' }),
			JSON.stringify(members),
			JSON.stringify(campaignCharacters()),
			'2026-01-01',
			'2026-01-01'
		);
	for (const id of ['char-ann', 'char-bo', 'char-cy']) {
		sqlite
			.prepare(
				'insert into characters (id, owner_user_id, campaign_id, character) values (?, ?, ?, ?)'
			)
			.run(id, id.replace('char-', ''), CAMPAIGN, JSON.stringify({ name: id }));
	}
});

describe('campaign player count', () => {
	it('counts only players who hold an active character', async () => {
		expect(await playerCount()).toBe(2);
	});

	it('drops a player from the count once their character is removed', async () => {
		await removeCharacterFromCampaign(GM, CAMPAIGN, 'char-bo');
		expect(await playerCount()).toBe(1);
	});
});

describe('removeCharacterFromCampaign', () => {
	it('keeps the player as a member by default', async () => {
		await removeCharacterFromCampaign(GM, CAMPAIGN, 'char-ann');
		expect(storedMembers()).toContain('ann');
		expect(storedCharacters().map((c) => c.character_id)).not.toContain('char-ann');
	});

	it('removes the player’s access and unclaims their other characters when asked', async () => {
		const characters = storedCharacters();
		characters.push({
			character_id: 'char-ann-2',
			status: 'active',
			claimed_by_clerk_id: 'ann'
		} as CampaignCharacter);
		sqlite
			.prepare('update campaigns set characters = ? where id = ?')
			.run(JSON.stringify(characters), CAMPAIGN);

		await removeCharacterFromCampaign(GM, CAMPAIGN, 'char-ann', { removePlayerAccess: true });

		expect(storedMembers()).toEqual([GM, 'bo', 'cy']);
		const second = storedCharacters().find((c) => c.character_id === 'char-ann-2');
		expect(second?.status).toBe('unclaimed');
		expect(second?.claimed_by_clerk_id).toBeUndefined();
		expect(storedCharacters().find((c) => c.character_id === 'char-bo')?.status).toBe('active');
	});

	it('never removes the GM, even if they claimed the character', async () => {
		const characters = storedCharacters();
		characters.push({
			character_id: 'char-gm',
			status: 'active',
			claimed_by_clerk_id: GM
		} as CampaignCharacter);
		sqlite
			.prepare('update campaigns set characters = ? where id = ?')
			.run(JSON.stringify(characters), CAMPAIGN);

		await removeCharacterFromCampaign(GM, CAMPAIGN, 'char-gm', { removePlayerAccess: true });

		expect(storedMembers()).toContain(GM);
	});

	it('does nothing extra for a character with no claiming player', async () => {
		await removeCharacterFromCampaign(GM, CAMPAIGN, 'char-cy', { removePlayerAccess: true });
		expect(storedMembers()).toEqual([GM, 'ann', 'bo', 'cy']);
	});

	it('is GM-only', async () => {
		await expect(
			removeCharacterFromCampaign('ann', CAMPAIGN, 'char-bo', { removePlayerAccess: true })
		).rejects.toThrow('Not authorized');
		expect(storedMembers()).toContain('bo');
	});
});
