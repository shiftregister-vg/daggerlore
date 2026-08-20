import { sql } from 'drizzle-orm';
import {
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex,
	index
} from 'drizzle-orm/sqlite-core';
import type { AdapterAccountType } from '@auth/core/adapters';
import type { Campaign, CampaignCharacter, CampaignMember } from '@domain/schemas/campaigns';
import type { Character } from '@domain/schemas/characters';
import type { CompendiumContentIds } from '@domain/schemas/compendium';
import type { DiceHistory } from '@domain/schemas/dice';
import type { Encounter } from '@domain/schemas/encounters';
import type { SourceKey } from '@domain/schemas/rules';
import type { SourceMetadata } from '@domain/schemas/sources';

const emptyHomebrewVault = JSON.stringify({
	primary_weapons: [],
	secondary_weapons: [],
	armor: [],
	loot: [],
	consumables: [],
	beastforms: [],
	classes: [],
	subclasses: [],
	domains: [],
	domain_cards: [],
	ancestry_cards: [],
	community_cards: [],
	transformations: [],
	adversaries: [],
	environments: []
});

const nowSql = sql`(unixepoch() * 1000)`;

export const users = sqliteTable(
	'users',
	{
		id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
		name: text('name'),
		email: text('email').notNull().unique(),
		emailVerified: integer('email_verified', { mode: 'timestamp_ms' }),
		image: text('image'),
		legacyClerkId: text('legacy_clerk_id').unique(),
		isAdmin: integer('is_admin', { mode: 'boolean' }).default(false).notNull(),
		inviteAcceptedAt: integer('invite_accepted_at', { mode: 'timestamp_ms' }),
		disabledAt: integer('disabled_at', { mode: 'timestamp_ms' }),
		disabledReason: text('disabled_reason'),
		bannedAt: integer('banned_at', { mode: 'timestamp_ms' }),
		banReason: text('ban_reason'),
		homebrewVault: text('homebrew_vault', { mode: 'json' })
			.$type<CompendiumContentIds>()
			.default(sql.raw(`'${emptyHomebrewVault}'`))
			.notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(nowSql).notNull()
	},
	(table) => ({
		emailIdx: index('users_email_idx').on(table.email),
		legacyClerkIdIdx: index('users_legacy_clerk_id_idx').on(table.legacyClerkId)
	})
);

export const systemSettings = sqliteTable('system_settings', {
	key: text('key').primaryKey(),
	value: text('value', { mode: 'json' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(nowSql).notNull()
});

export const accounts = sqliteTable(
	'accounts',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type').$type<AdapterAccountType>().notNull(),
		provider: text('provider').notNull(),
		providerAccountId: text('provider_account_id').notNull(),
		refresh_token: text('refresh_token'),
		access_token: text('access_token'),
		expires_at: integer('expires_at'),
		token_type: text('token_type'),
		scope: text('scope'),
		id_token: text('id_token'),
		session_state: text('session_state')
	},
	(table) => ({
		pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
		userIdIdx: index('accounts_user_id_idx').on(table.userId)
	})
);

export const sessions = sqliteTable(
	'sessions',
	{
		sessionToken: text('session_token').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expires: integer('expires', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => ({
		userIdIdx: index('sessions_user_id_idx').on(table.userId)
	})
);

export const verificationTokens = sqliteTable(
	'verification_tokens',
	{
		identifier: text('identifier').notNull(),
		token: text('token').notNull(),
		expires: integer('expires', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => ({
		pk: primaryKey({ columns: [table.identifier, table.token] })
	})
);

export const authenticators = sqliteTable(
	'authenticators',
	{
		credentialID: text('credential_id').notNull().unique(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		providerAccountId: text('provider_account_id').notNull(),
		credentialPublicKey: text('credential_public_key').notNull(),
		counter: integer('counter').notNull(),
		credentialDeviceType: text('credential_device_type').notNull(),
		credentialBackedUp: integer('credential_backed_up', { mode: 'boolean' }).notNull(),
		transports: text('transports')
	},
	(table) => ({
		pk: primaryKey({ columns: [table.userId, table.credentialID] })
	})
);

export const userUnlockedSources = sqliteTable('user_unlocked_sources', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	unlockedSourceKeys: text('unlocked_source_keys', { mode: 'json' }).$type<SourceKey[]>().notNull()
});

export const invitations = sqliteTable(
	'invitations',
	{
		id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
		inviteType: text('invite_type').notNull(),
		email: text('email'),
		inviteCode: text('invite_code').notNull().unique(),
		campaignId: text('campaign_id'),
		createdByUserId: text('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
		acceptedByUserId: text('accepted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
		acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }),
		revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(nowSql).notNull()
	},
	(table) => ({
		emailIdx: index('invitations_email_idx').on(table.email),
		inviteCodeIdx: uniqueIndex('invitations_invite_code_idx').on(table.inviteCode),
		campaignIdIdx: index('invitations_campaign_id_idx').on(table.campaignId),
		acceptedByUserIdIdx: index('invitations_accepted_by_user_id_idx').on(table.acceptedByUserId)
	})
);

export const feedbackSubmissions = sqliteTable(
	'feedback_submissions',
	{
		id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
		name: text('name'),
		email: text('email'),
		category: text('category').default('general').notNull(),
		subject: text('subject').notNull(),
		message: text('message').notNull(),
		pageUrl: text('page_url'),
		userAgent: text('user_agent'),
		status: text('status').default('new').notNull(),
		adminNotes: text('admin_notes'),
		resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
		githubRepository: text('github_repository'),
		githubIssueId: text('github_issue_id'),
		githubIssueNumber: integer('github_issue_number'),
		githubIssueUrl: text('github_issue_url'),
		githubIssueState: text('github_issue_state'),
		githubIssueStateReason: text('github_issue_state_reason'),
		githubIssueUpdatedAt: integer('github_issue_updated_at', { mode: 'timestamp_ms' }),
		githubSyncStatus: text('github_sync_status').default('unlinked').notNull(),
		githubSyncError: text('github_sync_error'),
		githubSyncedAt: integer('github_synced_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(nowSql).notNull()
	},
	(table) => ({
		userIdIdx: index('feedback_submissions_user_id_idx').on(table.userId),
		statusIdx: index('feedback_submissions_status_idx').on(table.status),
		githubIssueIdx: index('feedback_submissions_github_issue_idx').on(
			table.githubRepository,
			table.githubIssueNumber
		),
		createdAtIdx: index('feedback_submissions_created_at_idx').on(table.createdAt)
	})
);

export const officialSources = sqliteTable('official_sources', {
	sourceKey: text('source_key').primaryKey().$type<SourceKey>(),
	metadata: text('metadata', { mode: 'json' }).$type<SourceMetadata>().notNull(),
	enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
	deletedAt: integer('deleted_at', { mode: 'timestamp_ms' })
});

export const officialCompendiumItems = sqliteTable(
	'official_compendium_items',
	{
		itemType: text('item_type').notNull(),
		itemId: text('item_id').notNull(),
		sourceKey: text('source_key')
			.$type<SourceKey>()
			.notNull()
			.references(() => officialSources.sourceKey, { onDelete: 'cascade' }),
		currentVersion: integer('current_version').default(1).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
		deletedAt: integer('deleted_at', { mode: 'timestamp_ms' })
	},
	(table) => ({
		pk: primaryKey({ columns: [table.sourceKey, table.itemType, table.itemId] }),
		sourceItemTypeIdx: index('official_compendium_items_source_item_type_idx').on(
			table.sourceKey,
			table.itemType
		)
	})
);

export const officialCompendiumItemVersions = sqliteTable(
	'official_compendium_item_versions',
	{
		itemType: text('item_type').notNull(),
		itemId: text('item_id').notNull(),
		sourceKey: text('source_key')
			.$type<SourceKey>()
			.notNull()
			.references(() => officialSources.sourceKey, { onDelete: 'cascade' }),
		itemVersion: integer('item_version').default(1).notNull(),
		label: text('label').notNull(),
		changelog: text('changelog').default('').notNull(),
		item: text('item', { mode: 'json' }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
		publishedAt: integer('published_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
		deletedAt: integer('deleted_at', { mode: 'timestamp_ms' })
	},
	(table) => ({
		pk: primaryKey({
			columns: [table.sourceKey, table.itemType, table.itemId, table.itemVersion]
		}),
		sourceItemTypeIdx: index('official_compendium_item_versions_source_item_type_idx').on(
			table.sourceKey,
			table.itemType
		),
		itemVersionIdx: index('official_compendium_item_versions_item_version_idx').on(
			table.sourceKey,
			table.itemType,
			table.itemId,
			table.itemVersion
		)
	})
);

export const characters = sqliteTable(
	'characters',
	{
		id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
		ownerUserId: text('owner_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		campaignId: text('campaign_id'),
		character: text('character', { mode: 'json' }).$type<Character>().notNull(),
		legacyImportId: text('legacy_import_id').unique(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(nowSql).notNull()
	},
	(table) => ({
		ownerUserIdIdx: index('characters_owner_user_id_idx').on(table.ownerUserId),
		campaignIdIdx: index('characters_campaign_id_idx').on(table.campaignId)
	})
);

export const campaigns = sqliteTable(
	'campaigns',
	{
		id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
		inviteCode: text('invite_code').notNull().unique(),
		campaign: text('campaign', { mode: 'json' }).$type<Campaign>().notNull(),
		members: text('members', { mode: 'json' }).$type<CampaignMember[]>().notNull(),
		characters: text('characters', { mode: 'json' }).$type<CampaignCharacter[]>().notNull(),
		legacyImportId: text('legacy_import_id').unique(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(nowSql).notNull()
	},
	(table) => ({
		inviteCodeIdx: uniqueIndex('campaigns_invite_code_idx').on(table.inviteCode)
	})
);

export const encounters = sqliteTable(
	'encounters',
	{
		id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
		ownerUserId: text('owner_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		encounter: text('encounter', { mode: 'json' }).$type<Encounter>().notNull(),
		legacyImportId: text('legacy_import_id').unique(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(nowSql).notNull()
	},
	(table) => ({
		ownerUserIdIdx: index('encounters_owner_user_id_idx').on(table.ownerUserId)
	})
);

export const diceHistory = sqliteTable(
	'dice_history',
	{
		id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
		campaignId: text('campaign_id')
			.notNull()
			.references(() => campaigns.id, { onDelete: 'cascade' }),
		history: text('history', { mode: 'json' }).$type<DiceHistory>().notNull()
	},
	(table) => ({
		campaignIdIdx: index('dice_history_campaign_id_idx').on(table.campaignId)
	})
);

export const streamOverlays = sqliteTable(
	'stream_overlays',
	{
		id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
		campaignId: text('campaign_id')
			.notNull()
			.references(() => campaigns.id, { onDelete: 'cascade' }),
		token: text('token').notNull().unique(),
		enabled: integer('enabled', { mode: 'boolean' }).notNull(),
		modules: text('modules', { mode: 'json' }).$type<{ fear: boolean; countdowns: boolean }>().notNull(),
		settings: text('settings', { mode: 'json' }).notNull(),
		layout: text('layout', { mode: 'json' }).notNull()
	},
	(table) => ({
		campaignIdIdx: index('stream_overlays_campaign_id_idx').on(table.campaignId),
		tokenIdx: index('stream_overlays_token_idx').on(table.token)
	})
);

export const homebrewItems = sqliteTable(
	'homebrew_items',
	{
		id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
		ownerUserId: text('owner_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		item: text('item', { mode: 'json' }).notNull(),
		legacyImportId: text('legacy_import_id').unique(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowSql).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(nowSql).notNull()
	},
	(table) => ({
		ownerUserIdIdx: index('homebrew_items_owner_user_id_idx').on(table.ownerUserId),
		ownerUserIdTypeIdx: index('homebrew_items_owner_user_id_type_idx').on(
			table.ownerUserId,
			table.type
		)
	})
);
