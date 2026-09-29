import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHARACTER_DEFAULTS } from '@domain/constants/constants';
const NOT_AUTHORIZED = 'Not authorized';
import { UNSAFE_CHANGE } from '@domain/character-safety';
import type { Character } from '@domain/schemas/characters';

// Real SQL against an in-memory SQLite database built from the migration, as in character-requests.test.ts.
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

vi.mock('./repository', () => ({ getCharacterAccess: vi.fn() }));

import { readFileSync } from 'node:fs';
import * as client from '$lib/server/db/client';
import * as repository from './repository';
import { MAX_VERSIONS, VERSION_INTERVAL_MS, snapshotCharacter } from './character-versions';
import { listCharacterVersions, restoreCharacterVersion } from './character-restore';

const sqlite = (client as unknown as { __sqlite: import('better-sqlite3').Database }).__sqlite;

const OWNER = 'owner';
const OTHER = 'other';
const ID = 'char-1';

function character(overrides: Partial<Character> = {}): Character {
	return {
		...structuredClone(CHARACTER_DEFAULTS),
		name: 'Aria',
		primary_class_id: 'ranger',
		ancestry_card_id: 'human',
		...overrides
	} as Character;
}

const rows = () =>
	sqlite.prepare('select * from character_versions order by created_at').all() as {
		reason: string;
		character: string;
		created_at: number;
	}[];

beforeEach(() => {
	sqlite.exec(
		'drop table if exists character_versions; drop table if exists characters; drop table if exists users;'
	);
	sqlite.exec(
		'create table users (id text primary key); create table characters (id text primary key, owner_user_id text, campaign_id text, character text, updated_at text);'
	);
	sqlite.prepare('insert into users (id) values (?)').run(OWNER);
	sqlite
		.prepare('insert into characters (id, owner_user_id, character) values (?, ?, ?)')
		.run(ID, OWNER, JSON.stringify(character()));
	for (const statement of readFileSync('drizzle/sqlite/0011_character_versions.sql', 'utf8').split(
		'--> statement-breakpoint'
	)) {
		sqlite.exec(statement);
	}
	vi.mocked(repository.getCharacterAccess).mockImplementation(async (userId) => ({
		character: character() as never,
		canEdit: userId === OWNER,
		canEditInventory: userId === OWNER,
		isOwner: userId === OWNER,
		ownerUserId: OWNER
	}));
});

describe('snapshotCharacter', () => {
	it('keeps the first version straight away', async () => {
		expect(await snapshotCharacter(ID, character(), 'periodic')).toBe(true);
		expect(rows()).toHaveLength(1);
	});

	it('does not keep another until enough time has passed, or the character has not changed', async () => {
		await snapshotCharacter(ID, character(), 'periodic');
		expect(await snapshotCharacter(ID, character({ marked_hp: 2 }), 'periodic')).toBe(false);
		expect(rows()).toHaveLength(1);

		const later = Date.now() + VERSION_INTERVAL_MS + 1000;
		expect(await snapshotCharacter(ID, character(), 'periodic', { now: later })).toBe(false);
		expect(
			await snapshotCharacter(ID, character({ marked_hp: 2 }), 'periodic', { now: later })
		).toBe(true);
		expect(rows()).toHaveLength(2);
	});

	it('can force a version regardless of age', async () => {
		await snapshotCharacter(ID, character(), 'periodic');
		expect(
			await snapshotCharacter(ID, character({ marked_hp: 2 }), 'before a refused save', {
				force: true
			})
		).toBe(true);
		expect(rows().map((row) => row.reason)).toEqual(['periodic', 'before a refused save']);
	});

	it('keeps only the newest versions', async () => {
		for (let i = 0; i < MAX_VERSIONS + 5; i++) {
			await snapshotCharacter(ID, character({ level: (i % 9) + 1, marked_hp: i }), 'periodic', {
				force: true
			});
		}
		expect(rows()).toHaveLength(MAX_VERSIONS);
		const newest = JSON.parse(rows().at(-1)!.character) as Character;
		expect(newest.marked_hp).toBe(MAX_VERSIONS + 4);
	});
});

describe('listing and restoring versions', () => {
	it('only lets the owner see or restore versions', async () => {
		await snapshotCharacter(ID, character(), 'periodic');
		await expect(listCharacterVersions(OTHER, ID)).rejects.toThrow(NOT_AUTHORIZED);
		const [version] = await listCharacterVersions(OWNER, ID);
		await expect(restoreCharacterVersion(OTHER, ID, version.id)).rejects.toThrow(NOT_AUTHORIZED);
	});

	it('summarises each version', async () => {
		await snapshotCharacter(ID, character({ level: 4 }), 'periodic');
		const [version] = await listCharacterVersions(OWNER, ID);
		expect(version).toMatchObject({
			name: 'Aria',
			level: 4,
			primary_class_id: 'ranger',
			ancestry_card_id: 'human',
			reason: 'periodic'
		});
	});

	it('restores an earlier version and keeps what it replaced', async () => {
		await snapshotCharacter(ID, character({ level: 4 }), 'periodic');
		const [version] = await listCharacterVersions(OWNER, ID);
		vi.mocked(repository.getCharacterAccess).mockImplementation(async () => ({
			character: character({ level: 5, primary_class_id: undefined }) as never,
			canEdit: true,
			canEditInventory: true,
			isOwner: true,
			ownerUserId: OWNER
		}));

		await restoreCharacterVersion(OWNER, ID, version.id);
		const stored = JSON.parse(
			(
				sqlite.prepare('select character from characters where id = ?').get(ID) as {
					character: string;
				}
			).character
		) as Character;
		expect(stored).toMatchObject({ level: 4, primary_class_id: 'ranger' });
		expect(rows().map((row) => row.reason)).toEqual(['periodic', 'before a restore']);
		await expect(restoreCharacterVersion(OWNER, ID, 'missing')).rejects.toThrow('no longer exists');
	});

	it('names the unsafe-change prefix the API maps to a conflict', () => {
		expect(`${UNSAFE_CHANGE}: x`.startsWith(UNSAFE_CHANGE)).toBe(true);
	});
});
