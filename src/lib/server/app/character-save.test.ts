import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHARACTER_DEFAULTS } from '@domain/constants/constants';
import { UNSAFE_CHANGE } from '@domain/character-safety';
import type { Character } from '@domain/schemas/characters';

// The real save path (updateCharacter) against in-memory SQLite: an unsafe save is refused and the
// character is left as it was; ordinary saves go through and keep a version to go back to.
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

import * as client from '$lib/server/db/client';
import { updateCharacter, updateCharacterInventory } from './repository';

const sqlite = (client as unknown as { __sqlite: import('better-sqlite3').Database }).__sqlite;

const OWNER = 'owner';
const ID = 'char-1';

function character(overrides: Partial<Character> = {}): Character {
	return {
		...structuredClone(CHARACTER_DEFAULTS),
		name: 'Aria',
		primary_class_id: 'ranger',
		primary_subclass_id: 'ranger_beastbound',
		ancestry_card_id: 'human',
		community_card_id: 'wanderborne',
		inventory: {
			...structuredClone(CHARACTER_DEFAULTS.inventory),
			armor: [{ inventory_id: 'a', base_armor_id: 'leather_armor', choices: {} }],
			primary_weapons: [{ inventory_id: 'b', base_primary_weapon_id: 'shortbow', choices: {} }]
		},
		...overrides
	} as Character;
}

const stored = () =>
	JSON.parse(
		(
			sqlite.prepare('select character from characters where id = ?').get(ID) as {
				character: string;
			}
		).character
	) as Character;
const versions = () =>
	sqlite.prepare('select reason from character_versions order by created_at').all() as {
		reason: string;
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
});

const wiped = () =>
	character({
		primary_class_id: undefined,
		primary_subclass_id: undefined,
		ancestry_card_id: undefined,
		community_card_id: undefined,
		inventory: structuredClone(CHARACTER_DEFAULTS.inventory)
	});

describe('updateCharacter', () => {
	it('saves an ordinary change and keeps a version of what it replaced', async () => {
		await updateCharacter(OWNER, ID, character({ marked_hp: 3 }));
		expect(stored().marked_hp).toBe(3);
		expect(versions()).toEqual([{ reason: 'periodic' }]);
	});

	it('refuses a save that would remove the class, ancestry, community and gear', async () => {
		await expect(updateCharacter(OWNER, ID, wiped())).rejects.toThrow(UNSAFE_CHANGE);
		expect(stored()).toMatchObject({
			primary_class_id: 'ranger',
			ancestry_card_id: 'human',
			community_card_id: 'wanderborne'
		});
		expect(stored().inventory.armor).toHaveLength(1);
		expect(versions()).toEqual([{ reason: 'before a refused save' }]);
	});

	it('still lets a character switch class', async () => {
		await updateCharacter(
			OWNER,
			ID,
			character({ primary_class_id: 'rogue', primary_subclass_id: 'rogue_syndicate' })
		);
		expect(stored().primary_class_id).toBe('rogue');
	});
});

describe('updateCharacterInventory', () => {
	it('lets a player empty their own inventory, which never touches who the character is', async () => {
		await updateCharacterInventory(OWNER, ID, {
			inventory: structuredClone(CHARACTER_DEFAULTS.inventory),
			active_armor_inventory_id: undefined,
			active_primary_weapon_inventory_id: undefined,
			active_secondary_weapon_inventory_id: undefined
		});
		expect(stored().inventory.armor).toHaveLength(0);
		expect(stored().primary_class_id).toBe('ranger');
	});
});
