import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from '@auth/core/adapters';
import type { Character } from '@domain/schemas/characters';
import type { Campaign, CampaignCharacter, CampaignMember } from '@domain/schemas/campaigns';
import type { CompendiumContentIds } from '@domain/schemas/compendium';
import type { DiceHistory } from '@domain/schemas/dice';
import type { Encounter } from '@domain/schemas/encounters';
import type { SourceKey } from '@domain/schemas/rules';
import type { SourceMetadata } from '@domain/schemas/sources';

const emptyHomebrewVaultSql = sql`'{
	"primary_weapons": [],
	"secondary_weapons": [],
	"armor": [],
	"loot": [],
	"consumables": [],
	"beastforms": [],
	"classes": [],
	"subclasses": [],
	"domains": [],
	"domain_cards": [],
	"ancestry_cards": [],
	"community_cards": [],
	"transformations": [],
	"adversaries": [],
	"environments": []
}'::jsonb`;

export const users = pgTable(
	'users',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		name: text('name'),
		email: text('email').notNull().unique(),
		emailVerified: timestamp('email_verified', { mode: 'date' }),
		image: text('image'),
		legacyClerkId: text('legacy_clerk_id').unique(),
		isAdmin: boolean('is_admin').default(false).notNull(),
		inviteAcceptedAt: timestamp('invite_accepted_at', { mode: 'date' }),
		disabledAt: timestamp('disabled_at', { mode: 'date' }),
		disabledReason: text('disabled_reason'),
		bannedAt: timestamp('banned_at', { mode: 'date' }),
		banReason: text('ban_reason'),
		homebrewVault: jsonb('homebrew_vault')
			.$type<CompendiumContentIds>()
			.default(emptyHomebrewVaultSql)
			.notNull(),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => ({
		emailIdx: index('users_email_idx').on(table.email),
		legacyClerkIdIdx: index('users_legacy_clerk_id_idx').on(table.legacyClerkId)
	})
);

export const systemSettings = pgTable('system_settings', {
	key: text('key').primaryKey(),
	value: jsonb('value').notNull(),
	updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
});

export const accounts = pgTable(
	'accounts',
	{
		userId: uuid('user_id')
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

export const sessions = pgTable(
	'sessions',
	{
		sessionToken: text('session_token').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expires: timestamp('expires', { mode: 'date' }).notNull()
	},
	(table) => ({
		userIdIdx: index('sessions_user_id_idx').on(table.userId)
	})
);

export const verificationTokens = pgTable(
	'verification_tokens',
	{
		identifier: text('identifier').notNull(),
		token: text('token').notNull(),
		expires: timestamp('expires', { mode: 'date' }).notNull()
	},
	(table) => ({
		pk: primaryKey({ columns: [table.identifier, table.token] })
	})
);

export const authenticators = pgTable(
	'authenticators',
	{
		credentialID: text('credential_id').notNull().unique(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		providerAccountId: text('provider_account_id').notNull(),
		credentialPublicKey: text('credential_public_key').notNull(),
		counter: integer('counter').notNull(),
		credentialDeviceType: text('credential_device_type').notNull(),
		credentialBackedUp: boolean('credential_backed_up').notNull(),
		transports: text('transports')
	},
	(table) => ({
		pk: primaryKey({ columns: [table.userId, table.credentialID] })
	})
);

export const userUnlockedSources = pgTable(
	'user_unlocked_sources',
	{
		userId: uuid('user_id')
			.primaryKey()
			.references(() => users.id, { onDelete: 'cascade' }),
		unlockedSourceKeys: jsonb('unlocked_source_keys').$type<SourceKey[]>().notNull()
	}
);

export const invitations = pgTable(
	'invitations',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		inviteType: text('invite_type').notNull(),
		email: text('email'),
		inviteCode: text('invite_code').notNull().unique(),
		campaignId: uuid('campaign_id'),
		createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
		acceptedByUserId: uuid('accepted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
		acceptedAt: timestamp('accepted_at', { mode: 'date' }),
		revokedAt: timestamp('revoked_at', { mode: 'date' }),
		expiresAt: timestamp('expires_at', { mode: 'date' }),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => ({
		emailIdx: index('invitations_email_idx').on(table.email),
		inviteCodeIdx: index('invitations_invite_code_idx').on(table.inviteCode),
		campaignIdIdx: index('invitations_campaign_id_idx').on(table.campaignId),
		acceptedByUserIdIdx: index('invitations_accepted_by_user_id_idx').on(table.acceptedByUserId)
	})
);

export const feedbackSubmissions = pgTable(
	'feedback_submissions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
		name: text('name'),
		email: text('email'),
		category: text('category').default('general').notNull(),
		subject: text('subject').notNull(),
		message: text('message').notNull(),
		pageUrl: text('page_url'),
		userAgent: text('user_agent'),
		status: text('status').default('new').notNull(),
		adminNotes: text('admin_notes'),
		resolvedAt: timestamp('resolved_at', { mode: 'date' }),
		githubRepository: text('github_repository'),
		githubIssueId: text('github_issue_id'),
		githubIssueNumber: integer('github_issue_number'),
		githubIssueUrl: text('github_issue_url'),
		githubIssueState: text('github_issue_state'),
		githubIssueStateReason: text('github_issue_state_reason'),
		githubIssueUpdatedAt: timestamp('github_issue_updated_at', { mode: 'date' }),
		githubSyncStatus: text('github_sync_status').default('unlinked').notNull(),
		githubSyncError: text('github_sync_error'),
		githubSyncedAt: timestamp('github_synced_at', { mode: 'date' }),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
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

export const officialSources = pgTable('official_sources', {
	sourceKey: text('source_key').primaryKey().$type<SourceKey>(),
	metadata: jsonb('metadata').$type<SourceMetadata>().notNull(),
	enabled: boolean('enabled').default(true).notNull(),
	createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
	deletedAt: timestamp('deleted_at', { mode: 'date' })
});

export const officialCompendiumItems = pgTable(
	'official_compendium_items',
	{
		itemType: text('item_type').notNull(),
		itemId: text('item_id').notNull(),
		sourceKey: text('source_key')
			.$type<SourceKey>()
			.notNull()
			.references(() => officialSources.sourceKey, { onDelete: 'cascade' }),
		currentVersion: integer('current_version').default(1).notNull(),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
		deletedAt: timestamp('deleted_at', { mode: 'date' })
	},
	(table) => ({
		pk: primaryKey({ columns: [table.sourceKey, table.itemType, table.itemId] }),
		sourceItemTypeIdx: index('official_compendium_items_source_item_type_idx').on(
			table.sourceKey,
			table.itemType
		)
	})
);

export const officialCompendiumItemVersions = pgTable(
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
		item: jsonb('item').notNull(),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		publishedAt: timestamp('published_at', { mode: 'date' }).defaultNow().notNull(),
		deletedAt: timestamp('deleted_at', { mode: 'date' })
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

export const characters = pgTable(
	'characters',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		ownerUserId: uuid('owner_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		campaignId: uuid('campaign_id'),
		character: jsonb('character').$type<Character>().notNull(),
		legacyImportId: text('legacy_import_id').unique(),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => ({
		ownerUserIdIdx: index('characters_owner_user_id_idx').on(table.ownerUserId),
		campaignIdIdx: index('characters_campaign_id_idx').on(table.campaignId)
	})
);

export const campaigns = pgTable(
	'campaigns',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		inviteCode: text('invite_code').notNull().unique(),
		campaign: jsonb('campaign').$type<Campaign>().notNull(),
		members: jsonb('members').$type<CampaignMember[]>().notNull(),
		characters: jsonb('characters').$type<CampaignCharacter[]>().notNull(),
		legacyImportId: text('legacy_import_id').unique(),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => ({
		inviteCodeIdx: index('campaigns_invite_code_idx').on(table.inviteCode)
	})
);

export const encounters = pgTable(
	'encounters',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		ownerUserId: uuid('owner_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		encounter: jsonb('encounter').$type<Encounter>().notNull(),
		legacyImportId: text('legacy_import_id').unique(),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => ({
		ownerUserIdIdx: index('encounters_owner_user_id_idx').on(table.ownerUserId)
	})
);

export const diceHistory = pgTable(
	'dice_history',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		campaignId: uuid('campaign_id')
			.notNull()
			.references(() => campaigns.id, { onDelete: 'cascade' }),
		history: jsonb('history').$type<DiceHistory>().notNull()
	},
	(table) => ({
		campaignIdIdx: index('dice_history_campaign_id_idx').on(table.campaignId)
	})
);

export const streamOverlays = pgTable(
	'stream_overlays',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		campaignId: uuid('campaign_id')
			.notNull()
			.references(() => campaigns.id, { onDelete: 'cascade' }),
		token: text('token').notNull().unique(),
		enabled: boolean('enabled').notNull(),
		modules: jsonb('modules').$type<{ fear: boolean; countdowns: boolean }>().notNull(),
		settings: jsonb('settings').notNull(),
		layout: jsonb('layout').notNull()
	},
	(table) => ({
		campaignIdIdx: index('stream_overlays_campaign_id_idx').on(table.campaignId),
		tokenIdx: index('stream_overlays_token_idx').on(table.token)
	})
);

export const homebrewItems = pgTable(
	'homebrew_items',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		ownerUserId: uuid('owner_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		item: jsonb('item').notNull(),
		legacyImportId: text('legacy_import_id').unique(),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => ({
		ownerUserIdIdx: index('homebrew_items_owner_user_id_idx').on(table.ownerUserId),
		ownerUserIdTypeIdx: index('homebrew_items_owner_user_id_type_idx').on(
			table.ownerUserId,
			table.type
		)
	})
);
