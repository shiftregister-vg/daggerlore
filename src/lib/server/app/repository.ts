import { CHARACTER_DEFAULTS } from '@domain/constants/constants';
import type { Campaign, CampaignCharacter, CampaignMember } from '@domain/schemas/campaigns';
import type {
	Character,
	CharacterCompendiumScope,
	OfficialItemVersions,
	OfficialSourceVersions
} from '@domain/schemas/characters';
import type { CompendiumContent, CompendiumContentIds } from '@domain/schemas/compendium';
import type { DiceHistory } from '@domain/schemas/dice';
import type { Encounter } from '@domain/schemas/encounters';
import type { SourceKey } from '@domain/schemas/rules';
import type { SourceMetadata } from '@domain/schemas/sources';
import type { HomebrewAccess, HomebrewItem, HomebrewTable } from '@domain/permissions';
import type { Id } from '@domain/ids';
import { publish } from './events';
import { databaseDialect, execute, jsonParam, parseJson, queryOne, queryRows } from '$lib/server/db/client';
import {
	createEmptyCompendiumContentIds,
	normalizeCompendiumContentIds
} from '@domain/character-compendium';
import {
	OFFICIAL_COMPENDIUM_TABLES,
	ensureOfficialCompendiumSeeded,
	validateOfficialCompendiumItem
} from '$lib/server/compendium/official-seed';
import { acceptCampaignInviteForUser } from './invite-access';

const VAULT_KEYS = [
	'primary_weapons',
	'secondary_weapons',
	'armor',
	'loot',
	'consumables',
	'beastforms',
	'classes',
	'subclasses',
	'domains',
	'domain_cards',
	'ancestry_cards',
	'community_cards',
	'transformations',
	'adversaries',
	'environments'
] as const satisfies (keyof CompendiumContentIds)[];

type UserRow = {
	id: string;
	name: string | null;
	email: string | null;
	image: string | null;
	is_admin: boolean | number;
	invite_accepted_at?: string | number | null;
	disabled_at?: string | number | null;
	disabled_reason?: string | null;
	banned_at?: string | number | null;
	ban_reason?: string | null;
	homebrew_vault: unknown;
};

type AdminUserRow = UserRow & {
	created_at: string | number;
	updated_at: string | number;
	character_count: string | number;
	campaign_count: string | number;
	encounter_count: string | number;
	homebrew_count: string | number;
	session_count: string | number;
};

type InvitationRow = {
	id: string;
	invite_type: 'admin' | 'campaign';
	email: string | null;
	invite_code: string;
	campaign_id: string | null;
	campaign?: unknown;
	campaign_name?: string | null;
	created_by_user_id: string | null;
	created_by_name?: string | null;
	accepted_by_user_id: string | null;
	accepted_by_name?: string | null;
	accepted_at: string | number | null;
	revoked_at: string | number | null;
	expires_at: string | number | null;
	created_at: string | number;
	updated_at: string | number;
};

type FeedbackStatus = 'new' | 'reviewing' | 'resolved' | 'archived';

type FeedbackRow = {
	id: string;
	user_id: string | null;
	user_name?: string | null;
	user_email?: string | null;
	name: string | null;
	email: string | null;
	category: string;
	subject: string;
	message: string;
	page_url: string | null;
	user_agent: string | null;
	status: FeedbackStatus;
	admin_notes: string | null;
	resolved_at: string | number | null;
	created_at: string | number;
	updated_at: string | number;
};

type CharacterRow = {
	id: string;
	owner_user_id: string;
	campaign_id: string | null;
	character: unknown;
};

type CampaignRow = {
	id: string;
	invite_code: string;
	campaign: unknown;
	members: unknown;
	characters: unknown;
};

type EncounterRow = {
	id: string;
	owner_user_id: string;
	encounter: unknown;
};

type HomebrewRow = {
	id: string;
	owner_user_id: string;
	type: HomebrewTable;
	item: unknown;
};

type OfficialSourceRow = {
	source_key: SourceKey;
	metadata: unknown;
	enabled: boolean | number;
	deleted_at?: TransferTimestamp;
};

type OfficialCompendiumItemRow = {
	item_type: HomebrewTable;
	item_id: string;
	source_key: SourceKey;
	current_version: string | number;
	created_at?: string | number;
	updated_at: string | number;
	deleted_at?: TransferTimestamp;
};

type OfficialCompendiumItemVersionRow = {
	item_type: HomebrewTable;
	item_id: string;
	source_key: SourceKey;
	item_version: string | number;
	label: string;
	changelog: string;
	item: unknown;
	created_at: string | number;
	published_at: string | number;
	deleted_at?: TransferTimestamp;
};

type TransferTimestamp = string | number | Date | null;

type CompendiumTransferSource = SourceMetadata & {
	enabled: boolean;
	created_at?: string | number;
	updated_at?: string | number;
	deleted_at?: TransferTimestamp;
};

type CompendiumTransferItem = {
	item_type: HomebrewTable;
	item_id: string;
	source_key: SourceKey;
	current_version: number;
	created_at?: string | number;
	updated_at?: string | number;
	deleted_at?: TransferTimestamp;
};

type CompendiumTransferVersion = {
	item_type: HomebrewTable;
	item_id: string;
	source_key: SourceKey;
	item_version: number;
	label: string;
	changelog: string;
	item: unknown;
	created_at?: string | number;
	published_at?: string | number;
	deleted_at?: TransferTimestamp;
};

type CompendiumTransfer = {
	format: 'daggerlore-compendium-transfer';
	format_version: 1;
	exported_at: string;
	sources: CompendiumTransferSource[];
	items: CompendiumTransferItem[];
	versions: CompendiumTransferVersion[];
};

type CompendiumImportAction =
	| 'create'
	| 'update'
	| 'restore'
	| 'delete'
	| 'import'
	| 'advance'
	| 'skip'
	| 'conflict'
	| 'unchanged';

type CompendiumImportResolution =
	| 'skip'
	| 'replace'
	| 'next_version'
	| { action: 'skip' | 'replace' | 'next_version' | 'custom_version'; version?: number };

type CompendiumImportRequest = {
	transfer: CompendiumTransfer;
	resolutions: {
		version_conflicts: Record<string, CompendiumImportResolution>;
	};
};

type CharacterCompendiumUpdate = {
	key: string;
	source_key: SourceKey;
	item_type: HomebrewTable;
	item_id: string;
	title: string;
	pinned_version: number;
	latest_version: number;
	current_label: string;
	latest_label: string;
	changelog: string;
	current_item: unknown;
	latest_item: unknown;
};

type StreamOverlayRow = {
	id: string;
	campaign_id: string;
	token: string;
	enabled: boolean | number;
	modules: unknown;
	settings: unknown;
	layout: unknown;
};

type SystemSettingRow = {
	key: string;
	value: unknown;
	updated_at: string | number;
};

export type OperationsSettings = {
	maintenance_enabled: boolean;
	maintenance_message: string;
	invite_only_enabled: boolean;
	contact_email: string;
	community: {
		articles_enabled: boolean;
		changelog_enabled: boolean;
		roadmap_enabled: boolean;
		faq_enabled: boolean;
		contact_enabled: boolean;
		discord_enabled: boolean;
		socials_enabled: boolean;
	};
};

export const DEFAULT_OPERATIONS_SETTINGS: OperationsSettings = {
	maintenance_enabled: false,
	maintenance_message: 'Daggerlore is being upgraded!',
	invite_only_enabled: true,
	contact_email: 'scribe@daggerlore.com',
	community: {
		articles_enabled: true,
		changelog_enabled: true,
		roadmap_enabled: true,
		faq_enabled: true,
		contact_enabled: true,
		discord_enabled: true,
		socials_enabled: true
	}
};

function newId() {
	return crypto.randomUUID();
}

function nowIso() {
	return new Date().toISOString();
}

function nowDbTimestamp() {
	return databaseDialect === 'sqlite' ? Date.now() : nowIso();
}

function normalizeDbTimestamp(value: TransferTimestamp | undefined) {
	if (value == null || value === '') return null;
	if (value instanceof Date) {
		return databaseDialect === 'sqlite' ? value.getTime() : value.toISOString();
	}
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return null;
		return databaseDialect === 'sqlite' ? value : new Date(value).toISOString();
	}
	if (/^\d+$/.test(value)) {
		const timestamp = Number(value);
		if (!Number.isFinite(timestamp)) return null;
		return databaseDialect === 'sqlite' ? timestamp : new Date(timestamp).toISOString();
	}
	const parsed = Date.parse(value);
	if (!Number.isFinite(parsed)) return null;
	return databaseDialect === 'sqlite' ? parsed : new Date(parsed).toISOString();
}

function parseOperationsSettings(value: unknown): OperationsSettings {
	const parsed = value ? parseJson<Partial<OperationsSettings>>(value) : {};
	const community = (parsed.community ?? {}) as Partial<OperationsSettings['community']>;
	return {
		maintenance_enabled: parsed.maintenance_enabled === true,
		maintenance_message:
			typeof parsed.maintenance_message === 'string' && parsed.maintenance_message.trim()
				? parsed.maintenance_message
				: DEFAULT_OPERATIONS_SETTINGS.maintenance_message,
		invite_only_enabled: parsed.invite_only_enabled !== false,
		contact_email:
			typeof parsed.contact_email === 'string' && parsed.contact_email.trim()
				? parsed.contact_email.trim()
				: DEFAULT_OPERATIONS_SETTINGS.contact_email,
		community: {
			articles_enabled: community.articles_enabled !== false,
			changelog_enabled: community.changelog_enabled !== false,
			roadmap_enabled: community.roadmap_enabled !== false,
			faq_enabled: community.faq_enabled !== false,
			contact_enabled: community.contact_enabled !== false,
			discord_enabled: community.discord_enabled !== false,
			socials_enabled: community.socials_enabled !== false
		}
	};
}

function validateOperationsSettings(data: unknown): OperationsSettings {
	const input = (data ?? {}) as Partial<OperationsSettings>;
	const community = (input.community ?? {}) as Partial<OperationsSettings['community']>;
	const maintenanceMessage =
		typeof input.maintenance_message === 'string'
			? input.maintenance_message.trim()
			: DEFAULT_OPERATIONS_SETTINGS.maintenance_message;
	const contactEmail =
		typeof input.contact_email === 'string'
			? input.contact_email.trim()
			: DEFAULT_OPERATIONS_SETTINGS.contact_email;

	if (maintenanceMessage.length > 500) {
		throw new Error('Maintenance message must be 500 characters or less');
	}
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
		throw new Error('Contact email must be a valid email address');
	}

	return {
		maintenance_enabled: input.maintenance_enabled === true,
		maintenance_message: maintenanceMessage || DEFAULT_OPERATIONS_SETTINGS.maintenance_message,
		invite_only_enabled: true,
		contact_email: contactEmail,
		community: {
			articles_enabled: community.articles_enabled === true,
			changelog_enabled: community.changelog_enabled === true,
			roadmap_enabled: community.roadmap_enabled === true,
			faq_enabled: community.faq_enabled === true,
			contact_enabled: community.contact_enabled === true,
			discord_enabled: community.discord_enabled === true,
			socials_enabled: community.socials_enabled === true
		}
	};
}

function textField(value: unknown, options: { max: number; min?: number; label: string }) {
	const text = typeof value === 'string' ? value.trim() : '';
	if ((options.min ?? 0) > 0 && text.length < (options.min ?? 0)) {
		throw new Error(`${options.label} is required`);
	}
	if (text.length > options.max) {
		throw new Error(`${options.label} must be ${options.max} characters or less`);
	}
	return text;
}

function nullableTextField(value: unknown, options: { max: number }) {
	const text = typeof value === 'string' ? value.trim() : '';
	if (!text) return null;
	return text.slice(0, options.max);
}

function feedbackCategory(value: unknown) {
	const category = typeof value === 'string' ? value.trim().toLowerCase() : 'general';
	if (['general', 'bug', 'feature', 'content', 'account'].includes(category)) return category;
	return 'general';
}

function feedbackStatus(value: unknown): FeedbackStatus {
	if (value === 'new' || value === 'reviewing' || value === 'resolved' || value === 'archived') {
		return value;
	}
	throw new Error('Invalid feedback status');
}

function requireUserId(userId: string | undefined) {
	if (!userId) throw new Error('Unauthenticated');
	return userId;
}

function parseVault(value: unknown): CompendiumContentIds {
	return normalizeCompendiumContentIds(value ? parseJson<Partial<CompendiumContentIds>>(value) : null);
}

function countHomebrewVault(vault: CompendiumContentIds): number {
	return Object.values(vault).reduce((total, ids) => total + ids.length, 0);
}

function emptyCompendium(): CompendiumContent {
	return {
		primary_weapons: {},
		secondary_weapons: {},
		armor: {},
		loot: {},
		consumables: {},
		beastforms: {},
		classes: {},
		subclasses: {},
		domains: {},
		domain_cards: {},
		ancestry_cards: {},
		community_cards: {},
		transformations: {},
		character_sheet_addons: {},
		adversaries: {},
		environments: {}
	};
}

async function getUserRow(userId: string, options: { allowRestricted?: boolean } = {}): Promise<UserRow> {
	const row = await queryOne<UserRow>(
		'select id, name, email, image, is_admin, invite_accepted_at, disabled_at, disabled_reason, banned_at, ban_reason, homebrew_vault from users where id = ?',
		[userId]
	);
	if (!row) throw new Error('User not found');
	if (!options.allowRestricted) {
		if (row.banned_at) throw new Error('Account banned');
		if (row.disabled_at) throw new Error('Account disabled');
	}
	return row;
}

function isAdminValue(value: boolean | number) {
	return value === true || value === 1;
}

function isEnabledValue(value: boolean | number) {
	return value === true || value === 1;
}

function placeholders(values: unknown[]) {
	return values.map(() => '?').join(', ');
}

async function getUnlockedSourceKeys(userId: string): Promise<SourceKey[]> {
	await ensureOfficialCompendiumSeeded();
	const row = await queryOne<{ unlocked_source_keys: unknown }>(
		'select unlocked_source_keys from user_unlocked_sources where user_id = ?',
		[userId]
	);
	const unlockedSourceKeys = row ? parseJson<SourceKey[]>(row.unlocked_source_keys) : [];
	const enabledSources = await queryRows<{ source_key: SourceKey }>(
		'select source_key from official_sources where enabled = true and deleted_at is null order by source_key'
	);
	return [...new Set([...enabledSources.map((source) => source.source_key), ...unlockedSourceKeys])];
}

export async function getCurrentUser(userId: string | undefined) {
	const id = requireUserId(userId);
	const [user, characterCount, homebrewCount, campaigns] = await Promise.all([
		getUserRow(id),
		queryOne<{ count: string | number }>('select count(*) as count from characters where owner_user_id = ?', [
			id
		]),
		queryOne<{ count: string | number }>(
			'select count(*) as count from homebrew_items where owner_user_id = ?',
			[id]
		),
		queryRows<{ id: string }>('select id from campaigns')
	]);

	const campaignIds: string[] = [];
	for (const campaign of campaigns) {
		const access = await getCampaignAccess(id, campaign.id);
		if (access) campaignIds.push(campaign.id);
	}

	return {
		_id: user.id,
		clerk_id: user.id,
		campaign_ids: campaignIds,
		character_count: Number(characterCount?.count ?? 0),
		homebrew_count: Number(homebrewCount?.count ?? 0),
		homebrew_vault: parseVault(user.homebrew_vault),
		is_admin: isAdminValue(user.is_admin),
		invite_accepted: Boolean(user.invite_accepted_at),
		name: user.name,
		email: user.email,
		image: user.image
	};
}

export async function getAdminAccess(userId: string | undefined) {
	const id = requireUserId(userId);
	const user = await getUserRow(id);
	if (!isAdminValue(user.is_admin)) throw new Error('Not authorized');

	return {
		is_admin: true,
		user: {
			_id: user.id,
			name: user.name,
			email: user.email,
			image: user.image
		}
	};
}

export async function isUserAdmin(userId: string | undefined) {
	if (!userId) return false;
	try {
		const user = await getUserRow(userId);
		return isAdminValue(user.is_admin);
	} catch {
		return false;
	}
}

export async function getSystemOperationsSettings(): Promise<OperationsSettings> {
	const row = await queryOne<SystemSettingRow>('select key, value, updated_at from system_settings where key = ?', [
		'operations'
	]);
	if (!row) return DEFAULT_OPERATIONS_SETTINGS;
	return parseOperationsSettings(row.value);
}

export async function getAdminSystemSettings(userId: string | undefined) {
	await getAdminAccess(userId);
	return {
		operations: await getSystemOperationsSettings()
	};
}

export async function updateAdminSystemSettings(userId: string | undefined, data: unknown) {
	await getAdminAccess(userId);
	const operations = validateOperationsSettings(data);
	const updatedAt = nowDbTimestamp();
	await execute(
		`insert into system_settings (key, value, updated_at)
			values (?, ?, ?)
			on conflict(key) do update set
				value = excluded.value,
				updated_at = excluded.updated_at`,
		['operations', jsonParam(operations), updatedAt]
	);
	return { operations };
}

function parseFeedbackRow(row: FeedbackRow) {
	return {
		id: row.id,
		user_id: row.user_id,
		user_name: row.user_name ?? null,
		user_email: row.user_email ?? null,
		name: row.name,
		email: row.email,
		category: row.category,
		subject: row.subject,
		message: row.message,
		page_url: row.page_url,
		user_agent: row.user_agent,
		status: row.status,
		admin_notes: row.admin_notes,
		resolved_at: row.resolved_at,
		created_at: row.created_at,
		updated_at: row.updated_at
	};
}

export async function createFeedbackSubmission(
	userId: string | undefined,
	data: unknown,
	meta: { userAgent?: string | null } = {}
) {
	const input = (data ?? {}) as Record<string, unknown>;
	const subject = textField(input.subject, { min: 3, max: 160, label: 'Subject' });
	const message = textField(input.message, { min: 10, max: 5000, label: 'Message' });
	const category = feedbackCategory(input.category);
	const pageUrl = nullableTextField(input.page_url, { max: 1000 });
	const userAgent = nullableTextField(meta.userAgent, { max: 1000 });

	let user: UserRow | null = null;
	if (userId) {
		try {
			user = await getUserRow(userId);
		} catch {
			user = null;
		}
	}

	const name =
		user?.name ??
		nullableTextField(input.name, { max: 160 });
	const email =
		user?.email ??
		nullableTextField(input.email, { max: 255 });
	const id = newId();
	const now = nowDbTimestamp();

	await execute(
		`insert into feedback_submissions (
			id, user_id, name, email, category, subject, message, page_url, user_agent,
			status, admin_notes, resolved_at, created_at, updated_at
		) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[id, user?.id ?? null, name, email, category, subject, message, pageUrl, userAgent, 'new', null, null, now, now]
	);

	return { id };
}

export async function listAdminFeedback(userId: string | undefined) {
	await getAdminAccess(userId);
	const rows = await queryRows<FeedbackRow>(
		`select
			feedback_submissions.*,
			users.name as user_name,
			users.email as user_email
		from feedback_submissions
		left join users on users.id = feedback_submissions.user_id
		order by
			case feedback_submissions.status
				when 'new' then 0
				when 'reviewing' then 1
				when 'resolved' then 2
				else 3
			end,
			feedback_submissions.created_at desc`
	);
	return rows.map(parseFeedbackRow);
}

export async function getAdminFeedback(userId: string | undefined, feedbackId: string) {
	await getAdminAccess(userId);
	const row = await queryOne<FeedbackRow>(
		`select
			feedback_submissions.*,
			users.name as user_name,
			users.email as user_email
		from feedback_submissions
		left join users on users.id = feedback_submissions.user_id
		where feedback_submissions.id = ?`,
		[feedbackId]
	);
	if (!row) throw new Error('Feedback not found');
	return parseFeedbackRow(row);
}

export async function updateAdminFeedback(userId: string | undefined, feedbackId: string, data: unknown) {
	await getAdminAccess(userId);
	const input = (data ?? {}) as Record<string, unknown>;
	const status = feedbackStatus(input.status);
	const adminNotes = nullableTextField(input.admin_notes, { max: 5000 });
	const now = nowDbTimestamp();
	await execute(
		`update feedback_submissions
			set status = ?, admin_notes = ?, resolved_at = ?, updated_at = ?
			where id = ?`,
		[status, adminNotes, status === 'resolved' ? now : null, now, feedbackId]
	);
	return getAdminFeedback(userId, feedbackId);
}

function adminUserStatus(row: Pick<UserRow, 'disabled_at' | 'banned_at'>) {
	if (row.banned_at) return 'banned';
	if (row.disabled_at) return 'disabled';
	return 'active';
}

function parseAdminUserRow(row: AdminUserRow) {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		image: row.image,
		is_admin: isAdminValue(row.is_admin),
		status: adminUserStatus(row),
		invite_accepted_at: row.invite_accepted_at ?? null,
		disabled_at: row.disabled_at ?? null,
		disabled_reason: row.disabled_reason ?? null,
		banned_at: row.banned_at ?? null,
		ban_reason: row.ban_reason ?? null,
		created_at: row.created_at,
		updated_at: row.updated_at,
		character_count: Number(row.character_count ?? 0),
		campaign_count: Number(row.campaign_count ?? 0),
		encounter_count: Number(row.encounter_count ?? 0),
		homebrew_count: Number(row.homebrew_count ?? 0),
		session_count: Number(row.session_count ?? 0)
	};
}

export async function listAdminUsers(userId: string | undefined) {
	await getAdminAccess(userId);
	const rows = await queryRows<AdminUserRow>(
		`select
			users.id,
			users.name,
			users.email,
			users.image,
			users.is_admin,
			users.invite_accepted_at,
			users.disabled_at,
			users.disabled_reason,
			users.banned_at,
			users.ban_reason,
			users.homebrew_vault,
			users.created_at,
			users.updated_at,
			(select count(*) from characters where characters.owner_user_id = users.id) as character_count,
			(select count(*) from campaigns where cast(campaigns.members as text) like '%' || cast(users.id as text) || '%') as campaign_count,
			(select count(*) from encounters where encounters.owner_user_id = users.id) as encounter_count,
			(select count(*) from homebrew_items where homebrew_items.owner_user_id = users.id) as homebrew_count,
			(select count(*) from sessions where sessions.user_id = users.id) as session_count
		from users
		order by coalesce(users.name, users.email), users.email`
	);
	return rows.map(parseAdminUserRow);
}

export async function getAdminUser(userId: string | undefined, targetUserId: string) {
	await getAdminAccess(userId);
	const row = await queryOne<AdminUserRow>(
		`select
			users.id,
			users.name,
			users.email,
			users.image,
			users.is_admin,
			users.invite_accepted_at,
			users.disabled_at,
			users.disabled_reason,
			users.banned_at,
			users.ban_reason,
			users.homebrew_vault,
			users.created_at,
			users.updated_at,
			(select count(*) from characters where characters.owner_user_id = users.id) as character_count,
			(select count(*) from campaigns where cast(campaigns.members as text) like '%' || cast(users.id as text) || '%') as campaign_count,
			(select count(*) from encounters where encounters.owner_user_id = users.id) as encounter_count,
			(select count(*) from homebrew_items where homebrew_items.owner_user_id = users.id) as homebrew_count,
			(select count(*) from sessions where sessions.user_id = users.id) as session_count
		from users
		where users.id = ?`,
		[targetUserId]
	);
	if (!row) throw new Error('User not found');
	return parseAdminUserRow(row);
}

function nullableReason(value: unknown) {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length ? trimmed : null;
}

async function requireNotSelf(adminUserId: string | undefined, targetUserId: string) {
	const id = requireUserId(adminUserId);
	if (id === targetUserId) throw new Error('Admins cannot moderate their own account');
	await getAdminAccess(id);
	return id;
}

export async function setAdminUserDisabled(
	userId: string | undefined,
	targetUserId: string,
	data: { disabled: boolean; reason?: string }
) {
	await requireNotSelf(userId, targetUserId);
	const target = await getUserRow(targetUserId, { allowRestricted: true });
	if (isAdminValue(target.is_admin) && data.disabled) {
		throw new Error('Admin accounts cannot be disabled from this dashboard');
	}
	await execute(
		'update users set disabled_at = ?, disabled_reason = ?, updated_at = ? where id = ?',
		[
			data.disabled ? nowDbTimestamp() : null,
			data.disabled ? nullableReason(data.reason) : null,
			nowDbTimestamp(),
			targetUserId
		]
	);
	if (data.disabled) await invalidateAdminUserSessions(userId, targetUserId);
	return getAdminUser(userId, targetUserId);
}

export async function setAdminUserBanned(
	userId: string | undefined,
	targetUserId: string,
	data: { banned: boolean; reason?: string }
) {
	await requireNotSelf(userId, targetUserId);
	const target = await getUserRow(targetUserId, { allowRestricted: true });
	if (isAdminValue(target.is_admin) && data.banned) {
		throw new Error('Admin accounts cannot be banned from this dashboard');
	}
	await execute('update users set banned_at = ?, ban_reason = ?, updated_at = ? where id = ?', [
		data.banned ? nowDbTimestamp() : null,
		data.banned ? nullableReason(data.reason) : null,
		nowDbTimestamp(),
		targetUserId
	]);
	if (data.banned) await invalidateAdminUserSessions(userId, targetUserId);
	return getAdminUser(userId, targetUserId);
}

export async function invalidateAdminUserSessions(userId: string | undefined, targetUserId: string) {
	await requireNotSelf(userId, targetUserId);
	await getUserRow(targetUserId, { allowRestricted: true });
	await execute('delete from sessions where user_id = ?', [targetUserId]);
	return getAdminUser(userId, targetUserId);
}

function parseInvitationRow(row: InvitationRow) {
	const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null;
	return {
		id: row.id,
		invite_type: row.invite_type,
		email: row.email,
		invite_code: row.invite_code,
		campaign_id: row.campaign_id,
		campaign_name: row.campaign_name ?? (row.campaign ? parseJson<Campaign>(row.campaign).name : null),
		created_by_user_id: row.created_by_user_id,
		created_by_name: row.created_by_name ?? null,
		accepted_by_user_id: row.accepted_by_user_id,
		accepted_by_name: row.accepted_by_name ?? null,
		accepted_at: row.accepted_at,
		revoked_at: row.revoked_at,
		expires_at: row.expires_at,
		created_at: row.created_at,
		updated_at: row.updated_at,
		status: row.revoked_at
			? 'revoked'
			: row.accepted_at
				? 'accepted'
				: expiresAt && expiresAt < Date.now()
					? 'expired'
					: 'pending'
	};
}

function adminInviteCode() {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export async function listAdminInvitations(userId: string | undefined) {
	await getAdminAccess(userId);
	const rows = await queryRows<InvitationRow>(
		`select
			invitations.id,
			invitations.invite_type,
			invitations.email,
			invitations.invite_code,
			invitations.campaign_id,
			invitations.created_by_user_id,
			invitations.accepted_by_user_id,
			invitations.accepted_at,
			invitations.revoked_at,
			invitations.expires_at,
			invitations.created_at,
			invitations.updated_at,
			creator.name as created_by_name,
			accepted_user.name as accepted_by_name,
			campaigns.campaign as campaign
		from invitations
		left join users creator on creator.id = invitations.created_by_user_id
		left join users accepted_user on accepted_user.id = invitations.accepted_by_user_id
		left join campaigns on campaigns.id = invitations.campaign_id
		order by invitations.created_at desc`
	);
	return rows.map(parseInvitationRow);
}

export async function createAdminInvitation(
	userId: string | undefined,
	data: { expires_in_hours?: number } = {}
) {
	const admin = await getAdminAccess(userId);
	const expiresInHours = Number(data.expires_in_hours ?? 168);
	if (!Number.isFinite(expiresInHours) || expiresInHours <= 0) {
		throw new Error('Invite expiration is required');
	}
	const now = nowDbTimestamp();
	const expiresAt =
		databaseDialect === 'sqlite'
			? Date.now() + expiresInHours * 60 * 60 * 1000
			: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
	await execute(
		`insert into invitations (
			id,
			invite_type,
			email,
			invite_code,
			created_by_user_id,
			expires_at,
			created_at,
			updated_at
		) values (?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			newId(),
			'admin',
			null,
			adminInviteCode(),
			admin.user._id,
			expiresAt,
			now,
			now
		]
	);
	return listAdminInvitations(userId);
}

export async function resolveAccessInvitation(userId: string | undefined, inviteCode: string) {
	const invitation = await queryOne<InvitationRow>(
		`select
			invitations.id,
			invitations.invite_type,
			invitations.email,
			invitations.invite_code,
			invitations.campaign_id,
			invitations.created_by_user_id,
			invitations.accepted_by_user_id,
			invitations.accepted_at,
			invitations.revoked_at,
			invitations.expires_at,
			invitations.created_at,
			invitations.updated_at,
			creator.name as created_by_name,
			accepted_user.name as accepted_by_name,
			campaigns.campaign as campaign
		from invitations
		left join users creator on creator.id = invitations.created_by_user_id
		left join users accepted_user on accepted_user.id = invitations.accepted_by_user_id
		left join campaigns on campaigns.id = invitations.campaign_id
		where invitations.invite_type = 'admin' and invitations.invite_code = ?`,
		[inviteCode]
	);
	if (!invitation) return null;
	return parseInvitationRow(invitation);
}

export async function acceptAccessInvitation(userId: string | undefined, inviteCode: string) {
	const id = requireUserId(userId);
	await getUserRow(id);
	const invitation = await queryOne<InvitationRow>(
		`select * from invitations
		where invite_type = 'admin' and invite_code = ?`,
		[inviteCode]
	);
	if (!invitation) throw new Error('Invite not found');
	const parsed = parseInvitationRow(invitation);
	if (parsed.status !== 'pending') throw new Error('Invite is no longer available');

	const now = nowDbTimestamp();
	await execute(
		'update invitations set accepted_by_user_id = ?, accepted_at = ?, updated_at = ? where id = ?',
		[id, now, now, invitation.id]
	);
	await execute('update users set invite_accepted_at = ?, updated_at = ? where id = ?', [now, now, id]);
	return resolveAccessInvitation(userId, inviteCode);
}

export async function revokeAdminInvitation(userId: string | undefined, invitationId: string) {
	await getAdminAccess(userId);
	const invitation = await queryOne<InvitationRow>('select * from invitations where id = ?', [invitationId]);
	if (!invitation) throw new Error('Invite not found');
	if (invitation.accepted_at) throw new Error('Accepted invites cannot be revoked');
	const now = nowDbTimestamp();
	await execute('update invitations set revoked_at = ?, updated_at = ? where id = ?', [
		now,
		now,
		invitationId
	]);
	return listAdminInvitations(userId);
}

export async function listSources(userId: string | undefined) {
	const id = requireUserId(userId);
	return getUnlockedSourceKeys(id);
}

function parseOfficialSourceRow(row: OfficialSourceRow): SourceMetadata {
	const metadata = parseJson<SourceMetadata>(row.metadata);
	return { ...metadata, source_key: row.source_key };
}

function addOfficialItemToCompendium(
	compendium: CompendiumContent,
	row: OfficialCompendiumItemVersionRow
) {
	const item = {
		...parseJson<HomebrewItem<HomebrewTable>>(row.item),
		source_key: row.source_key
	};
	(compendium[row.item_type] as Record<string, HomebrewItem<HomebrewTable>>)[row.item_id] = item;
}

function officialItemVersionKey(sourceKey: SourceKey, itemType: HomebrewTable, itemId: string) {
	return `${sourceKey}:${itemType}:${itemId}`;
}

function parseOfficialItemVersionKey(key: string) {
	const [sourceKey, itemType, ...itemIdParts] = key.split(':');
	const itemId = itemIdParts.join(':');
	if (!sourceKey || !itemType || !itemId) return null;
	if (!OFFICIAL_COMPENDIUM_TABLES.includes(itemType as HomebrewTable)) return null;
	return {
		sourceKey: sourceKey as SourceKey,
		itemType: itemType as HomebrewTable,
		itemId
	};
}

function addUsedId(
	used: Partial<Record<HomebrewTable, Set<string>>>,
	itemType: HomebrewTable,
	itemId: string | undefined | null
) {
	if (!itemId) return;
	(used[itemType] ??= new Set()).add(itemId);
}

function addUsedIds(
	used: Partial<Record<HomebrewTable, Set<string>>>,
	itemType: HomebrewTable,
	itemIds: Iterable<string | undefined | null>
) {
	for (const itemId of itemIds) addUsedId(used, itemType, itemId);
}

function collectStrings(value: unknown, result = new Set<string>()) {
	if (typeof value === 'string') {
		result.add(value);
		return result;
	}
	if (Array.isArray(value)) {
		for (const entry of value) collectStrings(entry, result);
		return result;
	}
	if (value && typeof value === 'object') {
		for (const entry of Object.values(value)) collectStrings(entry, result);
	}
	return result;
}

function usedOfficialItemIds(character: Character): Partial<Record<HomebrewTable, Set<string>>> {
	const used: Partial<Record<HomebrewTable, Set<string>>> = {};

	addUsedId(used, 'ancestry_cards', character.ancestry_card_id);
	addUsedIds(used, 'ancestry_cards', character.additional_ancestry_card_ids ?? []);
	for (const choice of Object.values(character.mixed_ancestry_choices ?? {})) {
		addUsedId(used, 'ancestry_cards', choice.top_ancestry_id);
		addUsedId(used, 'ancestry_cards', choice.bottom_ancestry_id);
	}

	addUsedId(used, 'community_cards', character.community_card_id);
	addUsedIds(used, 'community_cards', character.additional_community_card_ids ?? []);
	addUsedId(used, 'transformations', character.transformation_card_id);
	addUsedIds(used, 'transformations', character.additional_transformation_card_ids ?? []);

	addUsedId(used, 'classes', character.primary_class_id);
	addUsedId(used, 'classes', character.secondary_class_id);
	addUsedId(used, 'subclasses', character.primary_subclass_id);
	addUsedId(used, 'subclasses', character.secondary_subclass_id);
	addUsedId(used, 'domains', character.secondary_class_domain_id);

	addUsedIds(
		used,
		'domain_cards',
		(character.loadout_domain_card_ids ?? []).map((card) => card.card_id)
	);
	addUsedIds(
		used,
		'domain_cards',
		(character.additional_domain_card_ids ?? []).map((card) => card.card_id)
	);
	addUsedIds(used, 'domain_cards', collectStrings(character.level_up_domain_card_ids));

	addUsedIds(
		used,
		'primary_weapons',
		(character.inventory.primary_weapons ?? []).map((item) => item.base_primary_weapon_id)
	);
	addUsedIds(
		used,
		'secondary_weapons',
		(character.inventory.secondary_weapons ?? []).map((item) => item.base_secondary_weapon_id)
	);
	addUsedIds(
		used,
		'armor',
		(character.inventory.armor ?? []).map((item) => item.base_armor_id)
	);
	addUsedIds(
		used,
		'loot',
		(character.inventory.loot ?? []).map((item) => item.base_loot_id)
	);
	addUsedIds(
		used,
		'consumables',
		(character.inventory.consumables ?? []).map((item) => item.base_consumable_id)
	);
	addUsedId(used, 'beastforms', character.chosen_beastform?.beastform_id);
	addUsedIds(used, 'character_sheet_addons', Object.keys(character.sheet_addon_choices ?? {}));
	addUsedIds(used, 'character_sheet_addons', Object.keys(character.sheet_addon_resources ?? {}));

	return used;
}

async function currentOfficialItemVersionMap(
	sourceKeys: SourceKey[],
	used: Partial<Record<HomebrewTable, Set<string>>>
): Promise<OfficialItemVersions> {
	if (!sourceKeys.length) return {};
	const rows = await queryRows<OfficialCompendiumItemRow>(
		`select item_type, item_id, source_key, current_version, updated_at, deleted_at from official_compendium_items where deleted_at is null and source_key in (${placeholders(
			sourceKeys
		)})`,
		sourceKeys
	);
	const result: OfficialItemVersions = {};
	for (const row of rows) {
		if (!used[row.item_type]?.has(row.item_id)) continue;
		result[officialItemVersionKey(row.source_key, row.item_type, row.item_id)] = Number(
			row.current_version
		);
	}
	return result;
}

async function getLatestOfficialSourceVersions(sourceKeys: SourceKey[]): Promise<OfficialSourceVersions> {
	return Object.fromEntries(sourceKeys.map((sourceKey) => [sourceKey, 1])) as OfficialSourceVersions;
}

export async function listOfficialSources(
	userId: string | undefined,
	sourceKeys?: SourceKey[]
): Promise<SourceMetadata[]> {
	const id = requireUserId(userId);
	const unlockedSourceKeys = await getUnlockedSourceKeys(id);
	const allowedSourceKeys = sourceKeys?.length
		? sourceKeys.filter((sourceKey) => unlockedSourceKeys.includes(sourceKey))
		: unlockedSourceKeys;
	if (!allowedSourceKeys.length) return [];

	await ensureOfficialCompendiumSeeded();

	const rows = await queryRows<OfficialSourceRow>(
		`select source_key, metadata, enabled, deleted_at from official_sources where enabled = true and deleted_at is null and source_key in (${placeholders(
			allowedSourceKeys
		)}) order by source_key`,
		allowedSourceKeys
	);
	return rows.filter((row) => isEnabledValue(row.enabled)).map(parseOfficialSourceRow);
}

export async function getOfficialCompendiumFromSourceKeys(
	userId: string | undefined,
	sourceKeys?: SourceKey[],
	sourceVersions?: OfficialSourceVersions,
	itemVersions?: OfficialItemVersions
): Promise<CompendiumContent> {
	const id = requireUserId(userId);
	const unlockedSourceKeys = await getUnlockedSourceKeys(id);
	const allowedSourceKeys = sourceKeys?.length
		? sourceKeys.filter((sourceKey) => unlockedSourceKeys.includes(sourceKey))
		: unlockedSourceKeys;
	const compendium = emptyCompendium();
	if (!allowedSourceKeys.length) return compendium;

	await ensureOfficialCompendiumSeeded();
	const rows = await queryRows<OfficialCompendiumItemVersionRow>(
		[
			[
				'select official_compendium_items.item_type, official_compendium_items.item_id, official_compendium_items.source_key,',
				'official_compendium_item_versions.item_version, official_compendium_item_versions.label,',
				'official_compendium_item_versions.changelog, official_compendium_item_versions.item,',
				'official_compendium_item_versions.created_at, official_compendium_item_versions.published_at,',
				'official_compendium_item_versions.deleted_at'
			].join(' '),
			'from official_compendium_items',
			'inner join official_sources on official_sources.source_key = official_compendium_items.source_key',
			[
				'inner join official_compendium_item_versions on',
				'official_compendium_item_versions.source_key = official_compendium_items.source_key and',
				'official_compendium_item_versions.item_type = official_compendium_items.item_type and',
				'official_compendium_item_versions.item_id = official_compendium_items.item_id and',
				'official_compendium_item_versions.item_version = official_compendium_items.current_version'
			].join(' '),
			`where official_sources.enabled = true and official_sources.deleted_at is null and official_compendium_items.deleted_at is null and official_compendium_item_versions.deleted_at is null and official_compendium_items.source_key in (${placeholders(
				allowedSourceKeys
			)})`,
			'order by official_compendium_items.item_type, official_compendium_items.item_id'
		].join(' '),
		allowedSourceKeys
	);
	for (const row of rows) {
		addOfficialItemToCompendium(compendium, row);
	}

	const pinnedEntries = Object.entries(itemVersions ?? {})
		.map(([key, itemVersion]) => ({ key, itemVersion, parsed: parseOfficialItemVersionKey(key) }))
		.filter(
			(entry): entry is {
				key: string;
				itemVersion: number;
				parsed: { sourceKey: SourceKey; itemType: HomebrewTable; itemId: string };
			} =>
				!!entry.parsed &&
				allowedSourceKeys.includes(entry.parsed.sourceKey) &&
				Number.isInteger(entry.itemVersion) &&
				entry.itemVersion > 0
		);

	for (const entry of pinnedEntries) {
		const row = await queryOne<OfficialCompendiumItemVersionRow>(
			[
				'select item_type, item_id, source_key, item_version, label, changelog, item, created_at, published_at, deleted_at',
				'from official_compendium_item_versions',
				'where source_key = ? and item_type = ? and item_id = ? and item_version = ? and deleted_at is null'
			].join(' '),
			[
				entry.parsed.sourceKey,
				entry.parsed.itemType,
				entry.parsed.itemId,
				entry.itemVersion
			]
		);
		if (row) addOfficialItemToCompendium(compendium, row);
	}
	return compendium;
}

export async function getAdminCompendiumDashboard(userId: string | undefined) {
	await getAdminAccess(userId);
	await ensureOfficialCompendiumSeeded();

	const sources = await queryRows<OfficialSourceRow>(
		'select source_key, metadata, enabled, deleted_at from official_sources where deleted_at is null order by source_key'
	);
	const counts = await queryRows<{
		source_key: SourceKey;
		item_type: HomebrewTable;
		count: string | number;
	}>(
		[
			'select official_compendium_items.source_key, official_compendium_items.item_type, count(*) as count',
			'from official_compendium_items',
			'inner join official_sources on official_sources.source_key = official_compendium_items.source_key',
			'where official_compendium_items.deleted_at is null and official_sources.deleted_at is null',
			'group by official_compendium_items.source_key, official_compendium_items.item_type',
			'order by official_compendium_items.source_key, official_compendium_items.item_type'
		].join(' ')
	);

	return {
		sources: sources.map((source) => ({
			...parseOfficialSourceRow(source),
			enabled: isEnabledValue(source.enabled)
		})),
		versions: [],
		item_types: OFFICIAL_COMPENDIUM_TABLES,
		counts: counts.map((count) => ({
			source_key: count.source_key,
			item_type: count.item_type,
			count: Number(count.count)
		}))
	};
}

export async function updateAdminOfficialSource(
	userId: string | undefined,
	data: {
		source_key: SourceKey;
		name?: string;
		short_title?: string;
		enabled?: boolean;
	}
) {
	await getAdminAccess(userId);
	await ensureOfficialCompendiumSeeded();

	const existing = await queryOne<OfficialSourceRow>(
		'select source_key, metadata, enabled from official_sources where source_key = ?',
		[data.source_key]
	);
	if (!existing) throw new Error('Source not found');

	const metadata = parseOfficialSourceRow(existing);
	const nextMetadata: SourceMetadata = {
		source_key: data.source_key,
		name: data.name?.trim() || metadata.name,
		short_title: data.short_title?.trim() || metadata.short_title
	};
	await execute('update official_sources set metadata = ?, enabled = ?, updated_at = ? where source_key = ?', [
		jsonParam(nextMetadata),
		data.enabled === false ? false : true,
		nowIso(),
		data.source_key
	]);
}

export async function createAdminOfficialSource(
	userId: string | undefined,
	data: {
		source_key: SourceKey;
		name: string;
		short_title: string;
		enabled?: boolean;
	}
) {
	await getAdminAccess(userId);
	await ensureOfficialCompendiumSeeded();

	const sourceKey = data.source_key.trim();
	const name = data.name.trim();
	const shortTitle = data.short_title.trim();
	if (!sourceKey) throw new Error('Source key is required');
	if (!name) throw new Error('Source name is required');
	if (!shortTitle) throw new Error('Source short title is required');

	const existing = await queryOne<OfficialSourceRow>(
		'select source_key, metadata, enabled from official_sources where source_key = ?',
		[sourceKey]
	);
	if (existing) throw new Error('Source already exists');

	const metadata: SourceMetadata = {
		source_key: sourceKey,
		name,
		short_title: shortTitle
	};
	const timestamp = nowIso();
	await execute(
		'insert into official_sources (source_key, metadata, enabled, created_at, updated_at) values (?, ?, ?, ?, ?)',
		[sourceKey, jsonParam(metadata), data.enabled === false ? false : true, timestamp, timestamp]
	);
}

function parseTransfer(data: unknown): CompendiumTransfer {
	if (!data || typeof data !== 'object') throw new Error('Invalid compendium import file');
	const transfer = data as Partial<CompendiumTransfer>;
	if (transfer.format !== 'daggerlore-compendium-transfer' || transfer.format_version !== 1) {
		throw new Error('Unsupported compendium import format');
	}
	if (!Array.isArray(transfer.sources) || !Array.isArray(transfer.items) || !Array.isArray(transfer.versions)) {
		throw new Error('Invalid compendium import file');
	}
	return transfer as CompendiumTransfer;
}

function parseImportRequest(data: unknown): CompendiumImportRequest {
	if (
		data &&
		typeof data === 'object' &&
		'transfer' in data &&
		(data as { transfer?: unknown }).transfer
	) {
		const resolutions = (data as { resolutions?: unknown }).resolutions;
		const versionConflicts =
			resolutions && typeof resolutions === 'object' && 'version_conflicts' in resolutions
				? (resolutions as { version_conflicts?: unknown }).version_conflicts
				: {};
		return {
			transfer: parseTransfer((data as { transfer: unknown }).transfer),
			resolutions: {
				version_conflicts:
					versionConflicts && typeof versionConflicts === 'object'
						? Object.fromEntries(
								Object.entries(versionConflicts as Record<string, unknown>)
									.map(([key, value]) => [key, normalizeImportResolution(value)] as const)
									.filter((entry): entry is [string, CompendiumImportResolution] => Boolean(entry[1]))
							)
						: {}
			}
		};
	}
	return { transfer: parseTransfer(data), resolutions: { version_conflicts: {} } };
}

function normalizeImportResolution(value: unknown): CompendiumImportResolution | null {
	if (value === 'skip' || value === 'replace' || value === 'next_version') return value;
	if (!value || typeof value !== 'object') return null;
	const action = (value as { action?: unknown }).action;
	if (action === 'skip' || action === 'replace' || action === 'next_version') return { action };
	if (action === 'custom_version') {
		const version = Number((value as { version?: unknown }).version);
		return Number.isInteger(version) && version > 0 ? { action, version } : null;
	}
	return null;
}

function importResolutionAction(resolution: CompendiumImportResolution | undefined) {
	return typeof resolution === 'string' ? resolution : resolution?.action;
}

function importResolutionVersion(resolution: CompendiumImportResolution | undefined) {
	if (resolution && typeof resolution === 'object' && resolution.action === 'custom_version') {
		return resolution.version;
	}
	return undefined;
}

function versionConflictKey(version: Pick<CompendiumTransferVersion, 'source_key' | 'item_type' | 'item_id' | 'item_version'>) {
	return `${version.source_key}:${version.item_type}:${version.item_id}:${version.item_version}`;
}

function normalizeTransferSource(source: CompendiumTransferSource) {
	const sourceKey = source.source_key.trim();
	const name = source.name.trim();
	const shortTitle = source.short_title.trim();
	if (!sourceKey) throw new Error('Source key is required');
	if (!name) throw new Error(`Source ${sourceKey} is missing a name`);
	if (!shortTitle) throw new Error(`Source ${sourceKey} is missing a short title`);
	return {
		source_key: sourceKey as SourceKey,
		name,
		short_title: shortTitle,
		enabled: source.enabled !== false
	};
}

function normalizeTransferItem(item: CompendiumTransferItem) {
	if (!OFFICIAL_COMPENDIUM_TABLES.includes(item.item_type)) throw new Error('Invalid item type');
	const itemId = item.item_id.trim();
	if (!itemId) throw new Error('Item ID is required');
	const currentVersion = Number(item.current_version);
	if (!Number.isInteger(currentVersion) || currentVersion < 1) {
		throw new Error(`Invalid current version for ${item.source_key}/${item.item_type}/${item.item_id}`);
	}
	return {
		item_type: item.item_type,
		item_id: itemId,
		source_key: item.source_key,
		current_version: currentVersion
	};
}

function normalizeTransferVersion(version: CompendiumTransferVersion) {
	if (!OFFICIAL_COMPENDIUM_TABLES.includes(version.item_type)) throw new Error('Invalid item type');
	const itemId = version.item_id.trim();
	if (!itemId) throw new Error('Item ID is required');
	const itemVersion = Number(version.item_version);
	if (!Number.isInteger(itemVersion) || itemVersion < 1) {
		throw new Error(`Invalid version for ${version.source_key}/${version.item_type}/${version.item_id}`);
	}
	const parsedItem = validateOfficialCompendiumItem(version.item_type, {
		...(version.item && typeof version.item === 'object' ? version.item : {}),
		source_key: version.source_key
	});
	return {
		item_type: version.item_type,
		item_id: itemId,
		source_key: version.source_key,
		item_version: itemVersion,
		label: version.label?.trim() || `Version ${itemVersion}`,
		changelog: version.changelog?.trim() || '',
		item: parsedItem
	};
}

export async function exportAdminCompendium(userId: string | undefined): Promise<CompendiumTransfer> {
	await getAdminAccess(userId);
	await ensureOfficialCompendiumSeeded();

	const sourceRows = await queryRows<OfficialSourceRow & { created_at?: string | number; updated_at?: string | number }>(
		'select source_key, metadata, enabled, created_at, updated_at, deleted_at from official_sources order by source_key'
	);
	const itemRows = await queryRows<OfficialCompendiumItemRow>(
		'select item_type, item_id, source_key, current_version, created_at, updated_at, deleted_at from official_compendium_items order by source_key, item_type, item_id'
	);
	const versionRows = await queryRows<OfficialCompendiumItemVersionRow>(
		'select item_type, item_id, source_key, item_version, label, changelog, item, created_at, published_at, deleted_at from official_compendium_item_versions order by source_key, item_type, item_id, item_version'
	);

	return {
		format: 'daggerlore-compendium-transfer',
		format_version: 1,
		exported_at: nowIso(),
		sources: sourceRows.map((row) => ({
			...parseOfficialSourceRow(row),
			enabled: isEnabledValue(row.enabled),
			created_at: row.created_at,
			updated_at: row.updated_at,
			deleted_at: row.deleted_at ?? null
		})),
		items: itemRows.map((row) => ({
			item_type: row.item_type,
			item_id: row.item_id,
			source_key: row.source_key,
			current_version: Number(row.current_version),
			created_at: row.created_at,
			updated_at: row.updated_at,
			deleted_at: row.deleted_at ?? null
		})),
		versions: versionRows.map((row) => ({
			item_type: row.item_type,
			item_id: row.item_id,
			source_key: row.source_key,
			item_version: Number(row.item_version),
			label: row.label,
			changelog: row.changelog,
			item: parseJson(row.item),
			created_at: row.created_at,
			published_at: row.published_at,
			deleted_at: row.deleted_at ?? null
		}))
	};
}

export async function previewAdminCompendiumImport(userId: string | undefined, data: unknown) {
	await getAdminAccess(userId);
	await ensureOfficialCompendiumSeeded();

	const transfer = parseTransfer(data);
	const result = {
		sources: [] as Array<{
			source_key: SourceKey;
			name: string;
			short_title: string;
			action: CompendiumImportAction;
			enabled: boolean;
			deleted_at: ReturnType<typeof normalizeDbTimestamp>;
		}>,
		versions: [] as Array<{
			key: string;
			source_key: SourceKey;
			item_type: HomebrewTable;
			item_id: string;
			item_version: number;
			title: string;
			label: string;
			action: CompendiumImportAction;
			deleted_at: ReturnType<typeof normalizeDbTimestamp>;
		}>,
		items: [] as Array<{
			key: string;
			source_key: SourceKey;
			item_type: HomebrewTable;
			item_id: string;
			current_version: number;
			action: CompendiumImportAction;
			deleted_at: ReturnType<typeof normalizeDbTimestamp>;
		}>,
		summary: {
			sources_created: 0,
			sources_updated: 0,
			sources_unchanged: 0,
			items_created: 0,
			items_advanced: 0,
			items_unchanged: 0,
			versions_imported: 0,
			versions_skipped: 0,
			version_conflicts: 0,
			current_version_conflicts: 0
		},
		omitted: {
			sources: 0,
			versions: 0,
			items: 0
		}
	};
	const conflictingVersionKeys = new Set<string>();

	for (const rawSource of transfer.sources) {
		const source = normalizeTransferSource(rawSource);
		const existing = await queryOne<OfficialSourceRow>(
			'select source_key, metadata, enabled, deleted_at from official_sources where source_key = ?',
			[source.source_key]
		);
		const metadata = existing ? parseOfficialSourceRow(existing) : null;
		const deletedAt = normalizeDbTimestamp(rawSource.deleted_at);
		let action: CompendiumImportAction = 'create';
		if (existing) {
			const existingDeletedAt = normalizeDbTimestamp(existing.deleted_at);
			const changed =
				metadata?.name !== source.name ||
				metadata?.short_title !== source.short_title ||
				isEnabledValue(existing.enabled) !== source.enabled ||
				existingDeletedAt !== deletedAt;
			action = changed ? (existingDeletedAt && !deletedAt ? 'restore' : 'update') : 'unchanged';
		}
		if (action === 'create') result.summary.sources_created += 1;
		else if (action === 'unchanged') result.summary.sources_unchanged += 1;
		else result.summary.sources_updated += 1;
		if (action === 'unchanged') {
			result.omitted.sources += 1;
		} else {
			result.sources.push({
				source_key: source.source_key,
				name: source.name,
				short_title: source.short_title,
				action,
				enabled: source.enabled,
				deleted_at: deletedAt
			});
		}
	}

	for (const rawVersion of transfer.versions) {
		const version = normalizeTransferVersion(rawVersion);
		const key = versionConflictKey(version);
		const existing = await queryOne<OfficialCompendiumItemVersionRow>(
			'select item_type, item_id, source_key, item_version, label, changelog, item, created_at, published_at, deleted_at from official_compendium_item_versions where source_key = ? and item_type = ? and item_id = ? and item_version = ?',
			[version.source_key, version.item_type, version.item_id, version.item_version]
		);
		const deletedAt = normalizeDbTimestamp(rawVersion.deleted_at);
		let action: CompendiumImportAction = 'import';
		if (existing) {
			const existingItem = JSON.stringify(parseJson(existing.item));
			const importedItem = JSON.stringify(version.item);
			if (
				existingItem !== importedItem ||
				existing.label !== version.label ||
				existing.changelog !== version.changelog
			) {
				action = 'conflict';
				result.summary.version_conflicts += 1;
				conflictingVersionKeys.add(key);
			} else {
				action = normalizeDbTimestamp(existing.deleted_at) !== deletedAt ? 'update' : 'skip';
				result.summary.versions_skipped += 1;
			}
		} else {
			result.summary.versions_imported += 1;
		}
		if (action === 'skip') {
			result.omitted.versions += 1;
		} else {
			result.versions.push({
				key,
				source_key: version.source_key,
				item_type: version.item_type,
				item_id: version.item_id,
				item_version: version.item_version,
				title: itemTitle(version.item),
				label: version.label,
				action,
				deleted_at: deletedAt
			});
		}
	}

	for (const rawItem of transfer.items) {
		const item = normalizeTransferItem(rawItem);
		const key = `${item.source_key}:${item.item_type}:${item.item_id}`;
		const existing = await queryOne<OfficialCompendiumItemRow>(
			'select item_type, item_id, source_key, current_version, updated_at, deleted_at from official_compendium_items where source_key = ? and item_type = ? and item_id = ?',
			[item.source_key, item.item_type, item.item_id]
		);
		const deletedAt = normalizeDbTimestamp(rawItem.deleted_at);
		let action: CompendiumImportAction = 'create';
		if (!existing) {
			result.summary.items_created += 1;
		} else if (
			Number(existing.current_version) < item.current_version &&
			conflictingVersionKeys.has(`${item.source_key}:${item.item_type}:${item.item_id}:${item.current_version}`)
		) {
			action = 'conflict';
			result.summary.current_version_conflicts += 1;
		} else if (Number(existing.current_version) < item.current_version) {
			action = 'advance';
			result.summary.items_advanced += 1;
		} else if (normalizeDbTimestamp(existing.deleted_at) !== deletedAt) {
			action = deletedAt ? 'delete' : 'restore';
			result.summary.items_advanced += 1;
		} else {
			action = 'unchanged';
			result.summary.items_unchanged += 1;
		}
		if (action === 'unchanged') {
			result.omitted.items += 1;
		} else {
			result.items.push({
				key,
				source_key: item.source_key,
				item_type: item.item_type,
				item_id: item.item_id,
				current_version: item.current_version,
				action,
				deleted_at: deletedAt
			});
		}
	}

	return result;
}

export async function importAdminCompendium(userId: string | undefined, data: unknown) {
	await getAdminAccess(userId);
	await ensureOfficialCompendiumSeeded();

	const { transfer, resolutions } = parseImportRequest(data);
	const timestamp = nowIso();
	const result = {
		sources_upserted: 0,
		items_created: 0,
		items_updated: 0,
		versions_imported: 0,
		versions_replaced: 0,
		versions_skipped: 0,
		version_conflicts: 0,
		current_version_conflicts: 0
	};
	const conflictingVersionKeys = new Set<string>();
	const remappedVersionKeys = new Map<string, number>();

	for (const rawSource of transfer.sources) {
		const source = normalizeTransferSource(rawSource);
		const deletedAt = normalizeDbTimestamp(rawSource.deleted_at);
		await execute(
			[
				'insert into official_sources (source_key, metadata, enabled, created_at, updated_at, deleted_at)',
				'values (?, ?, ?, ?, ?, ?)',
				'on conflict (source_key) do update set',
				'metadata = excluded.metadata,',
				'enabled = excluded.enabled,',
				'updated_at = excluded.updated_at,',
				'deleted_at = excluded.deleted_at'
			].join(' '),
			[
				source.source_key,
				jsonParam({
					source_key: source.source_key,
					name: source.name,
					short_title: source.short_title
				} satisfies SourceMetadata),
				source.enabled,
				timestamp,
				timestamp,
				deletedAt
			]
		);
		result.sources_upserted += 1;
	}

	for (const rawVersion of transfer.versions) {
		const version = normalizeTransferVersion(rawVersion);
		const key = versionConflictKey(version);
		const deletedAt = normalizeDbTimestamp(rawVersion.deleted_at);
		const existing = await queryOne<OfficialCompendiumItemVersionRow>(
			'select item_type, item_id, source_key, item_version, label, changelog, item, created_at, published_at, deleted_at from official_compendium_item_versions where source_key = ? and item_type = ? and item_id = ? and item_version = ?',
			[version.source_key, version.item_type, version.item_id, version.item_version]
		);
		if (existing) {
			const existingItem = JSON.stringify(parseJson(existing.item));
			const importedItem = JSON.stringify(version.item);
			if (existingItem !== importedItem || existing.label !== version.label || existing.changelog !== version.changelog) {
				const resolution = resolutions.version_conflicts[key];
				const resolutionAction = importResolutionAction(resolution);
				if (resolutionAction === 'replace') {
					await execute(
						[
							'update official_compendium_item_versions set',
							'label = ?, changelog = ?, item = ?, published_at = ?, deleted_at = ?',
							'where source_key = ? and item_type = ? and item_id = ? and item_version = ?'
						].join(' '),
						[
							version.label,
							version.changelog,
							jsonParam(version.item),
							timestamp,
							deletedAt,
							version.source_key,
							version.item_type,
							version.item_id,
							version.item_version
						]
					);
					result.versions_replaced += 1;
					continue;
				}
				if (resolutionAction === 'next_version' || resolutionAction === 'custom_version') {
					const maxVersion = await queryOne<{ max_version: number | null }>(
						'select max(item_version) as max_version from official_compendium_item_versions where source_key = ? and item_type = ? and item_id = ?',
						[version.source_key, version.item_type, version.item_id]
					);
					const targetVersion =
						resolutionAction === 'custom_version'
							? importResolutionVersion(resolution)
							: Number(maxVersion?.max_version ?? 0) + 1;
					if (!targetVersion || !Number.isInteger(targetVersion) || targetVersion < 1) {
						throw new Error(`Invalid import version for ${version.source_key}/${version.item_type}/${version.item_id}`);
					}
					const targetExisting = await queryOne<OfficialCompendiumItemVersionRow>(
						'select item_type, item_id, source_key, item_version, label, changelog, item, created_at, published_at, deleted_at from official_compendium_item_versions where source_key = ? and item_type = ? and item_id = ? and item_version = ?',
						[version.source_key, version.item_type, version.item_id, targetVersion]
					);
					if (targetExisting) {
						throw new Error(
							`Version v${targetVersion} already exists for ${version.source_key}/${version.item_type}/${version.item_id}`
						);
					}
					await execute(
						[
							'insert into official_compendium_item_versions',
							'(item_type, item_id, source_key, item_version, label, changelog, item, created_at, published_at, deleted_at)',
							'values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
						].join(' '),
						[
							version.item_type,
							version.item_id,
							version.source_key,
							targetVersion,
							version.label,
							version.changelog,
							jsonParam(version.item),
							timestamp,
							timestamp,
							deletedAt
						]
					);
					remappedVersionKeys.set(key, targetVersion);
					result.versions_imported += 1;
					continue;
				}
				result.version_conflicts += 1;
				conflictingVersionKeys.add(key);
			}
			await execute(
				'update official_compendium_item_versions set deleted_at = ? where source_key = ? and item_type = ? and item_id = ? and item_version = ?',
				[
					deletedAt,
					version.source_key,
					version.item_type,
					version.item_id,
					version.item_version
				]
			);
			result.versions_skipped += 1;
			continue;
		}
		await execute(
			[
				'insert into official_compendium_item_versions',
				'(item_type, item_id, source_key, item_version, label, changelog, item, created_at, published_at, deleted_at)',
				'values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
			].join(' '),
			[
				version.item_type,
				version.item_id,
				version.source_key,
				version.item_version,
				version.label,
				version.changelog,
				jsonParam(version.item),
				timestamp,
				timestamp,
				deletedAt
			]
		);
		result.versions_imported += 1;
	}

	for (const rawItem of transfer.items) {
		const item = normalizeTransferItem(rawItem);
		const deletedAt = normalizeDbTimestamp(rawItem.deleted_at);
		const currentVersionKey = `${item.source_key}:${item.item_type}:${item.item_id}:${item.current_version}`;
		const remappedCurrentVersion = remappedVersionKeys.get(currentVersionKey);
		const currentVersion = remappedCurrentVersion ?? item.current_version;
		const existing = await queryOne<OfficialCompendiumItemRow>(
			'select item_type, item_id, source_key, current_version, updated_at, deleted_at from official_compendium_items where source_key = ? and item_type = ? and item_id = ?',
			[item.source_key, item.item_type, item.item_id]
		);
		if (!existing) {
			await execute(
				[
					'insert into official_compendium_items',
					'(item_type, item_id, source_key, current_version, created_at, updated_at, deleted_at)',
					'values (?, ?, ?, ?, ?, ?, ?)'
				].join(' '),
				[
					item.item_type,
					item.item_id,
					item.source_key,
					currentVersion,
					timestamp,
					timestamp,
					deletedAt
				]
			);
			result.items_created += 1;
			continue;
		}
		await execute(
			'update official_compendium_items set deleted_at = ?, updated_at = ? where source_key = ? and item_type = ? and item_id = ?',
			[deletedAt, timestamp, item.source_key, item.item_type, item.item_id]
		);
		if (
			Number(existing.current_version) < currentVersion &&
			conflictingVersionKeys.has(currentVersionKey)
		) {
			result.current_version_conflicts += 1;
			continue;
		}
		if (Number(existing.current_version) < currentVersion) {
			await execute(
				'update official_compendium_items set current_version = ?, updated_at = ? where source_key = ? and item_type = ? and item_id = ?',
				[currentVersion, timestamp, item.source_key, item.item_type, item.item_id]
			);
			result.items_updated += 1;
		}
	}

	return result;
}

function itemTitle(item: unknown) {
	if (item && typeof item === 'object' && 'title' in item && typeof item.title === 'string') {
		return item.title;
	}
	return 'Untitled';
}

export async function listAdminCompendiumItems(
	userId: string | undefined,
	options: { sourceKey?: SourceKey; itemType?: HomebrewTable } = {}
) {
	await getAdminAccess(userId);
	await ensureOfficialCompendiumSeeded();

	const clauses: string[] = [];
	const params: unknown[] = [];
	if (options.sourceKey) {
		clauses.push('official_compendium_items.source_key = ?');
		params.push(options.sourceKey);
	}
	if (options.itemType) {
		clauses.push('official_compendium_items.item_type = ?');
		params.push(options.itemType);
	}
	clauses.push('official_compendium_items.deleted_at is null');
	clauses.push('official_sources.deleted_at is null');
	clauses.push('official_compendium_item_versions.deleted_at is null');

	const whereClause = clauses.length ? `where ${clauses.join(' and ')}` : '';
	const rows = await queryRows<OfficialCompendiumItemVersionRow & { updated_at: string | number }>(
		[
			[
				'select official_compendium_items.item_type, official_compendium_items.item_id, official_compendium_items.source_key,',
				'official_compendium_items.current_version as item_version, official_compendium_items.updated_at,',
				'official_compendium_item_versions.label, official_compendium_item_versions.changelog,',
				'official_compendium_item_versions.item, official_compendium_item_versions.created_at,',
				'official_compendium_item_versions.published_at, official_compendium_item_versions.deleted_at'
			].join(' '),
			'from official_compendium_items',
			'inner join official_sources on official_sources.source_key = official_compendium_items.source_key',
			[
				'inner join official_compendium_item_versions on',
				'official_compendium_item_versions.source_key = official_compendium_items.source_key and',
				'official_compendium_item_versions.item_type = official_compendium_items.item_type and',
				'official_compendium_item_versions.item_id = official_compendium_items.item_id and',
				'official_compendium_item_versions.item_version = official_compendium_items.current_version'
			].join(' '),
			whereClause,
			'order by official_compendium_items.item_type, official_compendium_items.item_id'
		].join(' '),
		params
	);

	return rows.map((row) => {
		const item = parseJson<HomebrewItem<HomebrewTable>>(row.item);
		return {
			item_type: row.item_type,
			item_id: row.item_id,
			source_key: row.source_key,
			version: Number(row.item_version),
			current_version: Number(row.item_version),
			label: row.label,
			changelog: row.changelog,
			title: itemTitle(item),
			item,
			updated_at: row.updated_at
		};
	});
}

export async function updateAdminCompendiumItem(
	userId: string | undefined,
	data: {
		source_key: SourceKey;
		original_source_key?: SourceKey;
		item_type: HomebrewTable;
		item_id: string;
		item: unknown;
		label?: string;
		changelog?: string;
	}
) {
	await getAdminAccess(userId);
	await ensureOfficialCompendiumSeeded();

	const lookupSourceKey = data.original_source_key ?? data.source_key;
	const existing = await queryOne<OfficialCompendiumItemRow>(
		'select item_type, item_id, source_key, current_version, updated_at, deleted_at from official_compendium_items where source_key = ? and item_type = ? and item_id = ? and deleted_at is null',
		[lookupSourceKey, data.item_type, data.item_id]
	);
	if (!existing) throw new Error('Compendium item not found');
	if (data.source_key !== existing.source_key) {
		const conflict = await queryOne<OfficialCompendiumItemRow>(
			'select item_type, item_id, source_key, current_version, updated_at, deleted_at from official_compendium_items where source_key = ? and item_type = ? and item_id = ? and deleted_at is null',
			[data.source_key, data.item_type, data.item_id]
		);
		if (conflict) throw new Error('Another item already uses this source and item ID');
		await execute(
			'update official_compendium_items set source_key = ?, updated_at = ? where source_key = ? and item_type = ? and item_id = ?',
			[data.source_key, nowIso(), existing.source_key, data.item_type, data.item_id]
		);
		await execute(
			'update official_compendium_item_versions set source_key = ? where source_key = ? and item_type = ? and item_id = ?',
			[data.source_key, existing.source_key, data.item_type, data.item_id]
		);
	}

	const parsedItem = validateOfficialCompendiumItem(data.item_type, {
		...(data.item && typeof data.item === 'object' ? data.item : {}),
		source_key: data.source_key
	});
	const nextVersion = Number(existing.current_version) + 1;
	const timestamp = nowIso();
	await execute(
		[
			'insert into official_compendium_item_versions',
			'(item_type, item_id, source_key, item_version, label, changelog, item, created_at, published_at)',
			'values (?, ?, ?, ?, ?, ?, ?, ?, ?)'
		].join(' '),
		[
			data.item_type,
			data.item_id,
			data.source_key,
			nextVersion,
			data.label?.trim() || `Version ${nextVersion}`,
			data.changelog?.trim() || '',
			jsonParam(parsedItem),
			timestamp,
			timestamp
		]
	);
	await execute(
		'update official_compendium_items set current_version = ?, updated_at = ? where source_key = ? and item_type = ? and item_id = ?',
		[nextVersion, timestamp, data.source_key, data.item_type, data.item_id]
	);
}

export async function createAdminCompendiumItem(
	userId: string | undefined,
	data: {
		source_key: SourceKey;
		item_type: HomebrewTable;
		item_id: string;
		item: unknown;
	}
) {
	await getAdminAccess(userId);
	await ensureOfficialCompendiumSeeded();

	if (!OFFICIAL_COMPENDIUM_TABLES.includes(data.item_type)) throw new Error('Invalid item type');
	const itemId = data.item_id.trim();
	if (!itemId) throw new Error('Item ID is required');

	const existing = await queryOne<OfficialCompendiumItemRow>(
		'select item_type, item_id, source_key, current_version, updated_at, deleted_at from official_compendium_items where source_key = ? and item_type = ? and item_id = ?',
		[data.source_key, data.item_type, itemId]
	);
	if (existing) throw new Error('Compendium item already exists');

	const parsedItem = validateOfficialCompendiumItem(data.item_type, {
		...(data.item && typeof data.item === 'object' ? data.item : {}),
		source_key: data.source_key
	});
	const timestamp = nowIso();
	await execute(
		[
			'insert into official_compendium_items',
			'(item_type, item_id, source_key, current_version, created_at, updated_at)',
			'values (?, ?, ?, ?, ?, ?)'
		].join(' '),
		[data.item_type, itemId, data.source_key, 1, timestamp, timestamp]
	);
	await execute(
		[
			'insert into official_compendium_item_versions',
			'(item_type, item_id, source_key, item_version, label, changelog, item, created_at, published_at)',
			'values (?, ?, ?, ?, ?, ?, ?, ?, ?)'
		].join(' '),
		[
			data.item_type,
			itemId,
			data.source_key,
			1,
			'Initial Version',
			'Created in admin.',
			jsonParam(parsedItem),
			timestamp,
			timestamp
		]
	);
}

export async function deleteAdminCompendiumItem(
	userId: string | undefined,
	data: {
		source_key: SourceKey;
		item_type: HomebrewTable;
		item_id: string;
	}
) {
	await getAdminAccess(userId);
	await ensureOfficialCompendiumSeeded();

	const existing = await queryOne<OfficialCompendiumItemRow>(
		'select item_type, item_id, source_key, current_version, updated_at, deleted_at from official_compendium_items where source_key = ? and item_type = ? and item_id = ? and deleted_at is null',
		[data.source_key, data.item_type, data.item_id]
	);
	if (!existing) throw new Error('Compendium item not found');

	const timestamp = nowIso();
	await execute(
		'update official_compendium_item_versions set deleted_at = ? where source_key = ? and item_type = ? and item_id = ? and deleted_at is null',
		[timestamp, data.source_key, data.item_type, data.item_id]
	);
	await execute(
		'update official_compendium_items set deleted_at = ?, updated_at = ? where source_key = ? and item_type = ? and item_id = ? and deleted_at is null',
		[timestamp, timestamp, data.source_key, data.item_type, data.item_id]
	);
}

export async function createAdminCompendiumVersion(
	userId: string | undefined,
	data: { source_key: SourceKey; label?: string; changelog?: string }
) {
	await getAdminAccess(userId);
	throw new Error('Source-level compendium versions are no longer supported');
}

export async function listCharacters(userId: string | undefined) {
	const id = requireUserId(userId);
	const rows = await queryRows<CharacterRow>(
		'select id, owner_user_id, campaign_id, character from characters where owner_user_id = ? order by updated_at desc',
		[id]
	);

	return Promise.all(
		rows.map(async (row) => {
			const character = parseJson<Character>(row.character);
			const campaignId = row.campaign_id ?? character.campaign_id;
			const campaignAccess = campaignId ? await getCampaignAccess(id, campaignId) : null;
			return {
				id: row.id,
				character: { ...character, campaign_id: campaignId ?? undefined },
				campaign_name: campaignAccess?.campaign.name
			};
		})
	);
}

export async function createCharacter(userId: string | undefined, character = CHARACTER_DEFAULTS) {
	const id = requireUserId(userId);
	const characterId = newId();
	const sourceKeys = await getUnlockedSourceKeys(id);
	const latestSourceVersions = await getLatestOfficialSourceVersions(sourceKeys);
	await execute(
		'insert into characters (id, owner_user_id, campaign_id, character, created_at, updated_at) values (?, ?, ?, ?, ?, ?)',
		[
			characterId,
			id,
			null,
			jsonParam({
				...character,
				campaign_id: undefined,
				official_source_versions: {
					...latestSourceVersions,
					...(character.official_source_versions ?? {})
				}
			}),
			nowIso(),
			nowIso()
		]
	);
	return characterId;
}

export async function getCharacterAccess(userId: string | undefined, characterId: string) {
	const id = requireUserId(userId);
	const row = await queryOne<CharacterRow>(
		'select id, owner_user_id, campaign_id, character from characters where id = ?',
		[characterId]
	);
	if (!row) return null;

	const character = parseJson<Character>(row.character);
	const campaignId = row.campaign_id ?? character.campaign_id ?? null;
	if (row.owner_user_id === id) {
		return {
			character: { ...character, campaign_id: campaignId ?? undefined },
			canEdit: true,
			canEditInventory: true,
			isOwner: true,
			ownerUserId: row.owner_user_id
		};
	}

	if (!campaignId) return null;
	const campaign = await getCampaignRow(campaignId);
	if (!campaign) return null;
	const members = parseJson<CampaignMember[]>(campaign.members);
	const member = members.find((campaignMember) => campaignMember.clerk_id === id);
	if (!member) return null;
	const campaignCharacters = parseJson<CampaignCharacter[]>(campaign.characters);
	const campaignCharacter = campaignCharacters.find(
		(entry) => entry.character_id === characterId && entry.status === 'active'
	);
	const canEdit = member.role === 'GM';
	const canEditInventory = canEdit || campaignCharacter?.claimed_by_clerk_id === id;

	return {
		character: { ...character, campaign_id: campaignId },
		canEdit,
		canEditInventory,
		isOwner: false,
		ownerUserId: row.owner_user_id
	};
}

export async function updateCharacter(
	userId: string | undefined,
	characterId: string,
	character: Character
) {
	const access = await getCharacterAccess(userId, characterId);
	if (!access?.canEdit) throw new Error('Not authorized');
	await execute('update characters set character = ?, updated_at = ? where id = ?', [
		jsonParam({ ...character, campaign_id: access.character.campaign_id }),
		nowIso(),
		characterId
	]);
}

export async function updateCharacterInventory(
	userId: string | undefined,
	characterId: string,
	data: Pick<
		Character,
		| 'inventory'
		| 'active_armor_inventory_id'
		| 'active_primary_weapon_inventory_id'
		| 'active_secondary_weapon_inventory_id'
	>
) {
	const access = await getCharacterAccess(userId, characterId);
	if (!access?.canEditInventory) throw new Error('Not authorized');

	const nextCharacter: Character = {
		...access.character,
		inventory: data.inventory,
		active_armor_inventory_id: data.active_armor_inventory_id,
		active_primary_weapon_inventory_id: data.active_primary_weapon_inventory_id,
		active_secondary_weapon_inventory_id: data.active_secondary_weapon_inventory_id
	};

	await execute('update characters set character = ?, updated_at = ? where id = ?', [
		jsonParam(nextCharacter),
		nowIso(),
		characterId
	]);
}

async function getOfficialVersionRow(
	sourceKey: SourceKey,
	itemType: HomebrewTable,
	itemId: string,
	itemVersion: number
) {
	return queryOne<OfficialCompendiumItemVersionRow>(
		[
			'select item_type, item_id, source_key, item_version, label, changelog, item, created_at, published_at, deleted_at',
			'from official_compendium_item_versions',
			'where source_key = ? and item_type = ? and item_id = ? and item_version = ? and deleted_at is null'
		].join(' '),
		[sourceKey, itemType, itemId, itemVersion]
	);
}

export async function getCharacterCompendiumUpdates(userId: string | undefined, characterId: string) {
	const access = await getCharacterAccess(userId, characterId);
	if (!access) return null;
	await ensureOfficialCompendiumSeeded();

	const mutedUntil = access.character.compendium_update_muted_until;
	const isMuted = mutedUntil ? new Date(mutedUntil).getTime() > Date.now() : false;
	if (isMuted) {
		return {
			muted_until: mutedUntil,
			updates: [] as CharacterCompendiumUpdate[]
		};
	}

	const sourceKeys = await getUnlockedSourceKeys(access.ownerUserId);
	const used = usedOfficialItemIds(access.character);
	const currentVersions = await currentOfficialItemVersionMap(sourceKeys, used);
	const pinnedVersions: OfficialItemVersions = {
		...currentVersions,
		...(access.character.official_item_versions ?? {})
	};
	const updates: CharacterCompendiumUpdate[] = [];

	for (const [key, latestVersion] of Object.entries(currentVersions)) {
		const pinnedVersion = pinnedVersions[key] ?? latestVersion;
		if (pinnedVersion >= latestVersion) continue;

		const parsed = parseOfficialItemVersionKey(key);
		if (!parsed) continue;

		const currentRow = await getOfficialVersionRow(
			parsed.sourceKey,
			parsed.itemType,
			parsed.itemId,
			pinnedVersion
		);
		const latestRow = await getOfficialVersionRow(
			parsed.sourceKey,
			parsed.itemType,
			parsed.itemId,
			latestVersion
		);
		if (!currentRow || !latestRow) continue;

		const currentItem = {
			...parseJson<HomebrewItem<HomebrewTable>>(currentRow.item),
			source_key: currentRow.source_key
		};
		const latestItem = {
			...parseJson<HomebrewItem<HomebrewTable>>(latestRow.item),
			source_key: latestRow.source_key
		};

		updates.push({
			key,
			source_key: parsed.sourceKey,
			item_type: parsed.itemType,
			item_id: parsed.itemId,
			title: itemTitle(latestItem),
			pinned_version: pinnedVersion,
			latest_version: latestVersion,
			current_label: currentRow.label,
			latest_label: latestRow.label,
			changelog: latestRow.changelog,
			current_item: currentItem,
			latest_item: latestItem
		});
	}

	return {
		muted_until: mutedUntil ?? null,
		updates: updates.sort((left, right) => left.title.localeCompare(right.title))
	};
}

export async function updateCharacterCompendiumVersions(
	userId: string | undefined,
	characterId: string,
	data: { action: 'update' | 'mute'; keys?: string[]; mute_days?: number }
) {
	const access = await getCharacterAccess(userId, characterId);
	if (!access?.canEdit) throw new Error('Not authorized');
	await ensureOfficialCompendiumSeeded();

	if (data.action === 'mute') {
		const days = Number.isInteger(data.mute_days) && data.mute_days && data.mute_days > 0 ? data.mute_days : 7;
		const nextCharacter: Character = {
			...access.character,
			compendium_update_muted_until: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
		};
		await execute('update characters set character = ?, updated_at = ? where id = ?', [
			jsonParam(nextCharacter),
			nowIso(),
			characterId
		]);
		return getCharacterCompendiumUpdates(userId, characterId);
	}

	const updates = await getCharacterCompendiumUpdates(userId, characterId);
	if (!updates) return null;
	const requested = new Set(data.keys?.length ? data.keys : updates.updates.map((update) => update.key));
	const nextVersions: OfficialItemVersions = { ...(access.character.official_item_versions ?? {}) };
	for (const update of updates.updates) {
		if (requested.has(update.key)) nextVersions[update.key] = update.latest_version;
	}

	const nextCharacter: Character = {
		...access.character,
		official_item_versions: nextVersions,
		compendium_update_muted_until: undefined
	};
	await execute('update characters set character = ?, updated_at = ? where id = ?', [
		jsonParam(nextCharacter),
		nowIso(),
		characterId
	]);
	return getCharacterCompendiumUpdates(userId, characterId);
}

export async function deleteCharacter(userId: string | undefined, characterId: string) {
	const access = await getCharacterAccess(userId, characterId);
	if (!access?.isOwner) throw new Error('Not authorized');

	if (access.character.campaign_id) {
		const campaign = await getCampaignRow(access.character.campaign_id);
		if (campaign) {
			const characters = parseJson<CampaignCharacter[]>(campaign.characters).filter(
				(character) => character.character_id !== characterId
			);
			await execute('update campaigns set characters = ?, updated_at = ? where id = ?', [
				jsonParam(characters),
				nowIso(),
				access.character.campaign_id
			]);
		}
	}

	await execute('delete from characters where id = ?', [characterId]);
}

async function getCampaignRow(campaignId: string) {
	return queryOne<CampaignRow>(
		'select id, invite_code, campaign, members, characters from campaigns where id = ?',
		[campaignId]
	);
}

async function publishStreamUpdatesForCampaign(campaignId: string) {
	const rows = await queryRows<{ token: string }>(
		'select token from stream_overlays where campaign_id = ?',
		[campaignId]
	);
	for (const row of rows) {
		publish(`stream:${row.token}`, { campaignId });
	}
}

export async function getCampaignAccess(userId: string | undefined, campaignId: string) {
	const id = requireUserId(userId);
	const row = await getCampaignRow(campaignId);
	if (!row) return null;
	const campaign = parseJson<Campaign>(row.campaign);
	const members = parseJson<CampaignMember[]>(row.members);
	const characters = parseJson<CampaignCharacter[]>(row.characters);
	const member = members.find((campaignMember) => campaignMember.clerk_id === id);
	if (!member) return null;
	return {
		campaign_id: row.id,
		invite_code: row.invite_code,
		campaign,
		members,
		characters,
		isOwner: member.role === 'GM'
	};
}

export async function listCampaigns(userId: string | undefined) {
	const id = requireUserId(userId);
	const rows = await queryRows<CampaignRow & { created_at: string | number }>(
		'select id, invite_code, campaign, members, characters, created_at from campaigns order by updated_at desc'
	);
	const campaigns: Record<string, unknown> = {};
	for (const row of rows) {
		const access = await getCampaignAccess(id, row.id);
		if (!access) continue;
		const activeCharacterImageUrls = [];
		for (const campaignCharacter of access.characters.filter((entry) => entry.status === 'active')) {
			const character = await getCharacterAccess(id, campaignCharacter.character_id as string);
			if (character?.character.image_url) activeCharacterImageUrls.push(character.character.image_url);
		}
		const member = access.members.find((member) => member.clerk_id === id);
		campaigns[row.id] = {
			role: member?.role ?? 'Player',
			name: access.campaign.name,
			player_count: access.members.filter((member) => member.role === 'Player').length,
			active_character_image_urls: activeCharacterImageUrls,
			creation_time: row.created_at
		};
	}
	return campaigns;
}

function inviteCode() {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

export async function createCampaign(
	userId: string | undefined,
	data: { name: string; display_name?: string }
) {
	const id = requireUserId(userId);
	const name = data.name.trim();
	if (!name) throw new Error('Campaign name is required');
	const campaignId = newId();
	const code = inviteCode();
	const campaign: Campaign = {
		name,
		fear_track: 0,
		countdowns: [],
		homebrew_vault: createEmptyCompendiumContentIds()
	};
	const members: CampaignMember[] = [
		{
			clerk_id: id,
			display_name: data.display_name ?? '',
			role: 'GM'
		}
	];
	await execute(
		'insert into campaigns (id, invite_code, campaign, members, characters, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)',
		[`${campaignId}`, code, jsonParam(campaign), jsonParam(members), jsonParam([]), nowIso(), nowIso()]
	);
	return campaignId;
}

export async function deleteCampaign(userId: string | undefined, campaignId: string) {
	const access = await getCampaignAccess(userId, campaignId);
	if (!access?.isOwner) throw new Error('Not authorized');
	for (const campaignCharacter of access.characters) {
		const characterAccess = await getCharacterAccess(userId, campaignCharacter.character_id as string);
		if (characterAccess?.isOwner) {
			await execute('update characters set campaign_id = ?, updated_at = ? where id = ?', [
				null,
				nowIso(),
				campaignCharacter.character_id
			]);
		}
	}
	await execute('delete from campaigns where id = ?', [campaignId]);
}

export async function changeCampaignDisplayName(
	userId: string | undefined,
	campaignId: string,
	displayName: string
) {
	const id = requireUserId(userId);
	const access = await getCampaignAccess(id, campaignId);
	if (!access) throw new Error('Not authorized');
	const members = access.members.map((member) =>
		member.clerk_id === id ? { ...member, display_name: displayName } : member
	);
	await execute('update campaigns set members = ?, updated_at = ? where id = ?', [
		jsonParam(members),
		nowIso(),
		campaignId
	]);
}

export async function addCharacterToCampaign(
	userId: string | undefined,
	campaignId: string,
	characterId: string
) {
	const id = requireUserId(userId);
	const access = await getCampaignAccess(id, campaignId);
	if (!access) throw new Error('Not authorized');
	const characterAccess = await getCharacterAccess(id, characterId);
	if (!characterAccess?.isOwner) throw new Error('Not authorized');
	if (characterAccess.character.campaign_id) throw new Error('Character already belongs to a campaign');

	const status: CampaignCharacter['status'] = access.isOwner ? 'unclaimed' : 'active';
	const nextCharacters: CampaignCharacter[] = access.characters.some(
		(character) => character.character_id === characterId
	)
		? access.characters
		: [
				...access.characters,
				{
					character_id: characterId as Id<'characters'>,
					status,
					claimed_by_clerk_id: access.isOwner ? undefined : id
				}
			];

	await execute('update campaigns set characters = ?, updated_at = ? where id = ?', [
		jsonParam(nextCharacters),
		nowIso(),
		campaignId
	]);
	await execute('update characters set campaign_id = ?, updated_at = ? where id = ?', [
		campaignId,
		nowIso(),
		characterId
	]);
}

export async function removeCharacterFromCampaign(
	userId: string | undefined,
	campaignId: string,
	characterId: string
) {
	const access = await getCampaignAccess(userId, campaignId);
	if (!access?.isOwner) throw new Error('Not authorized');
	const nextCharacters = access.characters.filter(
		(character) => character.character_id !== characterId
	);
	await execute('update campaigns set characters = ?, updated_at = ? where id = ?', [
		jsonParam(nextCharacters),
		nowIso(),
		campaignId
	]);
	await execute('update characters set campaign_id = ?, updated_at = ? where id = ?', [
		null,
		nowIso(),
		characterId
	]);
}

export async function claimCampaignCharacter(
	userId: string | undefined,
	campaignId: string,
	characterId: string
) {
	const id = requireUserId(userId);
	const access = await getCampaignAccess(id, campaignId);
	if (!access) throw new Error('Not authorized');
	const hasActiveCharacter = access.characters.some(
		(character) => character.status === 'active' && character.claimed_by_clerk_id === id
	);
	if (hasActiveCharacter) throw new Error('You already have a character in this campaign');
	const nextCharacters = access.characters.map((character) =>
		character.character_id === characterId
			? { ...character, status: 'active' as const, claimed_by_clerk_id: id }
			: character
	);
	await execute('update campaigns set characters = ?, updated_at = ? where id = ?', [
		jsonParam(nextCharacters),
		nowIso(),
		campaignId
	]);
}

export async function unassignCampaignCharacter(
	userId: string | undefined,
	campaignId: string,
	characterId: string
) {
	const access = await getCampaignAccess(userId, campaignId);
	if (!access?.isOwner) throw new Error('Not authorized');
	const nextCharacters = access.characters.map((character) =>
		character.character_id === characterId
			? { ...character, status: 'unclaimed' as const, claimed_by_clerk_id: undefined }
			: character
	);
	await execute('update campaigns set characters = ?, updated_at = ? where id = ?', [
		jsonParam(nextCharacters),
		nowIso(),
		campaignId
	]);
}

export async function leaveCampaign(userId: string | undefined, campaignId: string) {
	const id = requireUserId(userId);
	const access = await getCampaignAccess(id, campaignId);
	if (!access) throw new Error('Not authorized');
	if (access.isOwner) throw new Error('GM cannot leave campaign');
	const members = access.members.filter((member) => member.clerk_id !== id);
	const characters = access.characters.map((character) =>
		character.claimed_by_clerk_id === id
			? { ...character, status: 'unclaimed' as const, claimed_by_clerk_id: undefined }
			: character
	);
	await execute('update campaigns set members = ?, characters = ?, updated_at = ? where id = ?', [
		jsonParam(members),
		jsonParam(characters),
		nowIso(),
		campaignId
	]);
}

export async function updateCampaign(userId: string | undefined, campaignId: string, campaign: Campaign) {
	const access = await getCampaignAccess(userId, campaignId);
	if (!access?.isOwner) throw new Error('Not authorized');
	await execute('update campaigns set campaign = ?, updated_at = ? where id = ?', [
		jsonParam(campaign),
		nowIso(),
		campaignId
	]);
	await publishStreamUpdatesForCampaign(campaignId);
}

export async function updateDiceHistory(
	userId: string | undefined,
	campaignId: string,
	history: DiceHistory
) {
	const access = await getCampaignAccess(userId, campaignId);
	if (!access) throw new Error('Not authorized');
	const existing = await queryOne<{ id: string }>('select id from dice_history where campaign_id = ?', [
		campaignId
	]);
	if (existing) {
		await execute('update dice_history set history = ? where campaign_id = ?', [
			jsonParam(history),
			campaignId
		]);
		return;
	}
	await execute('insert into dice_history (id, campaign_id, history) values (?, ?, ?)', [
		newId(),
		campaignId,
		jsonParam(history)
	]);
}

export async function getDiceHistory(userId: string | undefined, campaignId: string) {
	const access = await getCampaignAccess(userId, campaignId);
	if (!access) throw new Error('Not authorized');
	const row = await queryOne<{ history: unknown }>(
		'select history from dice_history where campaign_id = ?',
		[campaignId]
	);
	return row ? parseJson<DiceHistory>(row.history) : { rolls: [] };
}

export async function resolveInvite(userId: string | undefined, code: string) {
	requireUserId(userId);
	const row = await queryOne<CampaignRow>(
		'select id, invite_code, campaign, members, characters from campaigns where invite_code = ?',
		[code]
	);
	if (!row) return null;
	const members = parseJson<CampaignMember[]>(row.members);
	return {
		campaign_id: row.id,
		campaign_name: parseJson<Campaign>(row.campaign).name,
		is_member: members.some((member) => member.clerk_id === userId)
	};
}

export async function joinCampaign(userId: string | undefined, code: string, displayName: string) {
	const id = requireUserId(userId);
	const user = await getUserRow(id);
	const row = await queryOne<CampaignRow>(
		'select id, invite_code, campaign, members, characters from campaigns where invite_code = ?',
		[code]
	);
	if (!row) throw new Error('Invite not found');
	const members = parseJson<CampaignMember[]>(row.members);
	if (!members.some((member) => member.clerk_id === id)) {
		members.push({ clerk_id: id, display_name: displayName, role: 'Player' });
		await execute('update campaigns set members = ?, updated_at = ? where id = ?', [
			jsonParam(members),
			nowIso(),
			row.id
		]);
	}
	if (!user.invite_accepted_at) {
		await acceptCampaignInviteForUser(id, user.email, row.id, code);
	}
	return row.id;
}

export async function rotateInviteCode(userId: string | undefined, campaignId: string) {
	const access = await getCampaignAccess(userId, campaignId);
	if (!access?.isOwner) throw new Error('Not authorized');
	const code = inviteCode();
	await execute('update campaigns set invite_code = ?, updated_at = ? where id = ?', [
		code,
		nowIso(),
		campaignId
	]);
	return code;
}

export async function listHomebrew(userId: string | undefined): Promise<CompendiumContent> {
	const id = requireUserId(userId);
	const rows = await queryRows<HomebrewRow>(
		'select id, owner_user_id, type, item from homebrew_items where owner_user_id = ? order by updated_at desc',
		[id]
	);
	const compendium = emptyCompendium();
	for (const row of rows) {
		const item = parseJson<HomebrewItem<HomebrewTable>>(row.item);
		(compendium[row.type] as Record<string, HomebrewItem<HomebrewTable>>)[row.id] = item;
	}
	return compendium;
}

export async function getHomebrewAccess<T extends HomebrewTable>(
	userId: string | undefined,
	itemId: string
): Promise<HomebrewAccess<T> | null> {
	const id = requireUserId(userId);
	const row = await queryOne<HomebrewRow>(
		'select id, owner_user_id, type, item from homebrew_items where id = ?',
		[itemId]
	);
	if (!row) return null;
	if (row.owner_user_id !== id) {
		const campaigns = await queryRows<CampaignRow>(
			'select id, invite_code, campaign, members, characters from campaigns order by updated_at desc'
		);
		const canReadFromCampaignVault = campaigns.some((campaignRow) => {
			const members = parseJson<CampaignMember[]>(campaignRow.members);
			if (!members.some((member) => member.clerk_id === id)) return false;

			const campaign = parseJson<Campaign>(campaignRow.campaign);
			const vault = normalizeCompendiumContentIds(campaign.homebrew_vault);
			return (vault[row.type] as readonly string[]).includes(itemId);
		});

		if (!canReadFromCampaignVault) return null;

		return {
			item: parseJson<HomebrewItem<T>>(row.item),
			canEdit: false,
			isOwner: false
		};
	}

	return {
		item: parseJson<HomebrewItem<T>>(row.item),
		canEdit: true,
		isOwner: true
	};
}

export async function createHomebrew(
	userId: string | undefined,
	data: { type: HomebrewTable; item: HomebrewItem<HomebrewTable> }
) {
	const id = requireUserId(userId);
	const itemId = newId();
	const item = { ...data.item, source_key: 'Homebrew' };
	await execute(
		'insert into homebrew_items (id, owner_user_id, type, item, created_at, updated_at) values (?, ?, ?, ?, ?, ?)',
		[itemId, id, data.type, jsonParam(item), nowIso(), nowIso()]
	);
	const user = await getUserRow(id);
	const vault = parseVault(user.homebrew_vault);
	vault[data.type] = [...vault[data.type], itemId] as never;
	await execute('update users set homebrew_vault = ?, updated_at = ? where id = ?', [
		jsonParam(vault),
		nowIso(),
		id
	]);
	return itemId;
}

export async function updateHomebrew(
	userId: string | undefined,
	data: { type: HomebrewTable; id: string; item: HomebrewItem<HomebrewTable> }
) {
	const access = await getHomebrewAccess(userId, data.id);
	if (!access?.canEdit) throw new Error('Not authorized');
	await execute('update homebrew_items set item = ?, updated_at = ? where id = ?', [
		jsonParam({ ...data.item, source_key: 'Homebrew' }),
		nowIso(),
		data.id
	]);
}

export async function deleteHomebrew(userId: string | undefined, itemId: string) {
	const id = requireUserId(userId);
	const access = await getHomebrewAccess(id, itemId);
	if (!access?.isOwner) throw new Error('Not authorized');
	await execute('delete from homebrew_items where id = ?', [itemId]);
	const user = await getUserRow(id);
	const vault = parseVault(user.homebrew_vault);
	for (const key of VAULT_KEYS) {
		vault[key] = vault[key].filter((id) => id !== itemId) as never;
	}
	await execute('update users set homebrew_vault = ?, updated_at = ? where id = ?', [
		jsonParam(vault),
		nowIso(),
		id
	]);
}

export async function listEncounters(userId: string | undefined) {
	const id = requireUserId(userId);
	const rows = await queryRows<EncounterRow>(
		'select id, owner_user_id, encounter from encounters where owner_user_id = ? order by updated_at desc',
		[id]
	);
	return rows.map((row) => ({ id: row.id, encounter: parseJson<Encounter>(row.encounter) }));
}

export async function getEncounterAccess(userId: string | undefined, encounterId: string) {
	const id = requireUserId(userId);
	const row = await queryOne<EncounterRow>(
		'select id, owner_user_id, encounter from encounters where id = ?',
		[encounterId]
	);
	if (!row || row.owner_user_id !== id) return null;
	return { encounter: parseJson<Encounter>(row.encounter), isOwner: true };
}

export async function createEncounter(userId: string | undefined, encounter: Encounter) {
	const id = requireUserId(userId);
	const encounterId = newId();
	await execute(
		'insert into encounters (id, owner_user_id, encounter, created_at, updated_at) values (?, ?, ?, ?, ?)',
		[encounterId, id, jsonParam(encounter), nowIso(), nowIso()]
	);
	return encounterId;
}

export async function updateEncounter(
	userId: string | undefined,
	encounterId: string,
	encounter: Encounter
) {
	const access = await getEncounterAccess(userId, encounterId);
	if (!access?.isOwner) throw new Error('Not authorized');
	await execute('update encounters set encounter = ?, updated_at = ? where id = ?', [
		jsonParam(encounter),
		nowIso(),
		encounterId
	]);
}

export async function deleteEncounter(userId: string | undefined, encounterId: string) {
	const access = await getEncounterAccess(userId, encounterId);
	if (!access?.isOwner) throw new Error('Not authorized');
	await execute('delete from encounters where id = ?', [encounterId]);
}

export async function getCharacterCompendiumScope(
	userId: string | undefined,
	characterId: string
): Promise<CharacterCompendiumScope | null> {
	const access = await getCharacterAccess(userId, characterId);
	if (!access) return null;
	const sourceKeys = await getUnlockedSourceKeys(access.ownerUserId);
	const latestSourceVersions = await getLatestOfficialSourceVersions(sourceKeys);
	const sourceVersions = {
		...latestSourceVersions,
		...(access.character.official_source_versions ?? {})
	};
	const used = usedOfficialItemIds(access.character);
	const currentItemVersions = await currentOfficialItemVersionMap(sourceKeys, used);
	const itemVersions: OfficialItemVersions = {
		...currentItemVersions,
		...(access.character.official_item_versions ?? {})
	};
	const missingPins = Object.entries(currentItemVersions).filter(
		([key]) => access.character.official_item_versions?.[key] == null
	);
	if (missingPins.length && access.canEdit) {
		const nextCharacter: Character = {
			...access.character,
			official_item_versions: itemVersions
		};
		await execute('update characters set character = ?, updated_at = ? where id = ?', [
			jsonParam(nextCharacter),
			nowIso(),
			characterId
		]);
	}
	const owner = await getUserRow(access.ownerUserId);
	const campaignId = access.character.campaign_id ?? null;
	const campaign = campaignId ? await getCampaignRow(campaignId) : null;
	const campaignData = campaign ? parseJson<Campaign>(campaign.campaign) : null;
	return {
		source_keys: sourceKeys,
		source_versions: sourceVersions,
		latest_source_versions: latestSourceVersions,
		official_item_versions: itemVersions,
		campaign_source_keys: campaignData?.enabled_source_keys,
		homebrew_vault: parseVault(owner.homebrew_vault),
		campaign_id: campaignId as CharacterCompendiumScope['campaign_id'],
		campaign_vault: campaignData
			? normalizeCompendiumContentIds(campaignData.homebrew_vault)
			: createEmptyCompendiumContentIds()
	};
}

export async function getHomebrewItemsByVault(
	vault: CompendiumContentIds,
	sourceKey: SourceKey = 'Homebrew'
) {
	const compendium = emptyCompendium();
	for (const key of VAULT_KEYS) {
		for (const id of vault[key]) {
			const row = await queryOne<HomebrewRow>(
				'select id, owner_user_id, type, item from homebrew_items where id = ?',
				[id]
			);
			if (!row) continue;
			(compendium[key] as Record<string, HomebrewItem<HomebrewTable>>)[id] = {
				...parseJson<HomebrewItem<HomebrewTable>>(row.item),
				source_key: sourceKey
			};
		}
	}
	return compendium;
}

export async function getStreamOverlayForCampaign(userId: string | undefined, campaignId: string) {
	const access = await getCampaignAccess(userId, campaignId);
	if (!access?.isOwner) throw new Error('Not authorized');
	const row = await queryOne<StreamOverlayRow>(
		'select id, campaign_id, token, enabled, modules, settings, layout from stream_overlays where campaign_id = ?',
		[campaignId]
	);
	return row ? serializeStreamOverlay(row) : null;
}

export async function getStreamOverlayState(token: string) {
	const row = await queryOne<StreamOverlayRow>(
		'select id, campaign_id, token, enabled, modules, settings, layout from stream_overlays where token = ?',
		[token]
	);
	if (!row || !row.enabled) return null;
	const campaign = await getCampaignRow(row.campaign_id);
	if (!campaign) return null;
	const campaignPayload = parseJson<Campaign>(campaign.campaign);
	return {
		...serializeStreamOverlay(row),
		campaign: campaignPayload,
		countdowns: campaignPayload.countdowns ?? []
	};
}

export async function upsertStreamOverlay(
	userId: string | undefined,
	campaignId: string,
	data: Omit<ReturnType<typeof serializeStreamOverlay>, 'id' | 'campaign_id' | 'token'> & {
		token?: string;
	}
) {
	const access = await getCampaignAccess(userId, campaignId);
	if (!access?.isOwner) throw new Error('Not authorized');
	const existing = await queryOne<StreamOverlayRow>(
		'select id, campaign_id, token, enabled, modules, settings, layout from stream_overlays where campaign_id = ?',
		[campaignId]
	);
	const token = data.token ?? existing?.token ?? crypto.randomUUID().replace(/-/g, '');
	if (existing) {
		await execute(
			'update stream_overlays set token = ?, enabled = ?, modules = ?, settings = ?, layout = ? where campaign_id = ?',
			[
				token,
				data.enabled ? 1 : 0,
				jsonParam(data.modules),
				jsonParam(data.settings),
				jsonParam(data.layout),
				campaignId
			]
		);
		const overlay = await getStreamOverlayForCampaign(userId, campaignId);
		publish(`stream:${token}`, { campaignId });
		return overlay;
	}
	await execute(
		'insert into stream_overlays (id, campaign_id, token, enabled, modules, settings, layout) values (?, ?, ?, ?, ?, ?, ?)',
		[
			newId(),
			campaignId,
			token,
			data.enabled ? 1 : 0,
			jsonParam(data.modules),
			jsonParam(data.settings),
			jsonParam(data.layout)
		]
	);
	const overlay = await getStreamOverlayForCampaign(userId, campaignId);
	publish(`stream:${token}`, { campaignId });
	return overlay;
}

function serializeStreamOverlay(row: StreamOverlayRow) {
	return {
		id: row.id,
		campaign_id: row.campaign_id,
		token: row.token,
		enabled: !!row.enabled,
		modules: parseJson<{ fear: boolean; countdowns: boolean }>(row.modules),
		settings: parseJson<Record<string, unknown>>(row.settings),
		layout: parseJson<Record<string, unknown>>(row.layout)
	};
}
