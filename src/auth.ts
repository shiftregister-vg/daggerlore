import { SvelteKitAuth } from '@auth/sveltekit';
import type { SvelteKitAuthConfig } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { env } from '$env/dynamic/private';
import { databaseDialect, db } from '$lib/server/db/client';
import { queryOne } from '$lib/server/db/client';
import * as pgSchema from '$lib/server/db/schema';
import * as sqliteSchema from '$lib/server/db/schema.sqlite';
import { pgAuthUsers, sqliteAuthUsers } from '$lib/server/db/auth-schema';

const schema = databaseDialect === 'sqlite' ? sqliteSchema : pgSchema;
const authUsersTable = databaseDialect === 'sqlite' ? sqliteAuthUsers : pgAuthUsers;

const authTables = {
	usersTable: authUsersTable,
	accountsTable: schema.accounts,
	sessionsTable: schema.sessions,
	verificationTokensTable: schema.verificationTokens,
	authenticatorsTable: schema.authenticators
};

const authConfig = {
	adapter: DrizzleAdapter(db as never, authTables as never),
	providers: [
		Google({
			clientId: env.GOOGLE_CLIENT_ID ?? '',
			clientSecret: env.GOOGLE_CLIENT_SECRET ?? ''
		})
	],
	secret: env.AUTH_SECRET ?? '',
	trustHost: true,
	session: {
		strategy: 'database'
	},
	callbacks: {
		async signIn({ user }) {
			if (!user.email) return true;
			const account = await queryOne<{ disabled_at: string | number | null; banned_at: string | number | null }>(
				'select disabled_at, banned_at from users where email = ?',
				[user.email]
			);
			if (account?.banned_at || account?.disabled_at) return false;
			return true;
		},
		session({ session, user }) {
			if (session.user) {
				session.user.id = user.id;
			}
			return session;
		}
	}
} satisfies SvelteKitAuthConfig;

export const { handle, signIn, signOut } = SvelteKitAuth(authConfig);
