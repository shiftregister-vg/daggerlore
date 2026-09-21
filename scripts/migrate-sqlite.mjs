import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl?.startsWith('file:')) {
	throw new Error('DATABASE_URL must be a file: URL for the SQLite migration');
}

const databasePath = databaseUrl.slice('file:'.length);

if (!databasePath) {
	throw new Error('DATABASE_URL must include a SQLite database path');
}

const resolvedDatabasePath = resolve(databasePath);
const migrationsFolder = resolve(process.env.SQLITE_MIGRATIONS_DIR ?? '/app/drizzle/sqlite');

mkdirSync(dirname(resolvedDatabasePath), { recursive: true });

const sqlite = new Database(resolvedDatabasePath);

try {
	sqlite.pragma('foreign_keys = ON');
	migrate(drizzle(sqlite), { migrationsFolder });
	console.log(`SQLite migrations completed for ${resolvedDatabasePath}`);
} finally {
	sqlite.close();
}
