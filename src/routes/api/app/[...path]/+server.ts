import { json, text, type RequestEvent } from '@sveltejs/kit';
import * as repo from '$lib/server/app/repository';
import { eventStream } from '$lib/server/app/events';
import { SourceKeySchema, type SourceKey } from '@domain/schemas/rules';
import { OFFICIAL_COMPENDIUM_TABLES } from '$lib/server/compendium/official-seed';
import type { HomebrewTable } from '@domain/permissions';
import type { OfficialItemVersions, OfficialSourceVersions } from '@domain/schemas/characters';

async function userId(event: RequestEvent) {
	const session = await event.locals.auth();
	return session?.user?.id;
}

async function body<T>(event: RequestEvent): Promise<T> {
	return (await event.request.json()) as T;
}

function pathParts(event: RequestEvent) {
	return (event.params.path ?? '').split('/').filter(Boolean);
}

function ok(data: unknown) {
	return json(data);
}

function noContent() {
	return new Response(null, { status: 204 });
}

function notFound() {
	return text('Not found', { status: 404 });
}

async function handleError(error: unknown) {
	const message = error instanceof Error ? error.message : 'Request failed';
	const status =
		message === 'Unauthenticated'
			? 401
			: message === 'Not authorized' || message === 'Account disabled' || message === 'Account banned'
				? 403
				: 400;
	return text(message, { status });
}

function sourceKeys(event: RequestEvent): SourceKey[] | undefined {
	const rawKeys = event.url.searchParams.getAll('source_key').filter(Boolean);
	if (!rawKeys.length) return undefined;
	return rawKeys.map((sourceKey) => SourceKeySchema.parse(sourceKey));
}

function homebrewTable(event: RequestEvent): HomebrewTable | undefined {
	const value = event.url.searchParams.get('item_type');
	if (!value) return undefined;
	if (!OFFICIAL_COMPENDIUM_TABLES.includes(value as HomebrewTable)) {
		throw new Error('Invalid item type');
	}
	return value as HomebrewTable;
}

function sourceVersionMap(event: RequestEvent): OfficialSourceVersions | undefined {
	const rawVersions = event.url.searchParams.getAll('source_version').filter(Boolean);
	if (!rawVersions.length) return undefined;
	const versions: OfficialSourceVersions = {};
	for (const rawVersion of rawVersions) {
		const [rawSourceKey, rawVersionNumber] = rawVersion.split(':');
		const sourceKey = SourceKeySchema.parse(rawSourceKey);
		const version = Number(rawVersionNumber);
		if (!Number.isInteger(version) || version < 1) throw new Error('Invalid source version');
		versions[sourceKey] = version;
	}
	return versions;
}

function itemVersionMap(event: RequestEvent): OfficialItemVersions | undefined {
	const rawVersions = event.url.searchParams.getAll('item_version').filter(Boolean);
	if (!rawVersions.length) return undefined;
	const versions: OfficialItemVersions = {};
	for (const rawVersion of rawVersions) {
		const [sourceKey, itemType, itemId, rawVersionNumber] = rawVersion.split(':');
		if (!sourceKey || !itemType || !itemId || !rawVersionNumber) {
			throw new Error('Invalid item version');
		}
		const version = Number(rawVersionNumber);
		if (!Number.isInteger(version) || version < 1) throw new Error('Invalid item version');
		versions[`${sourceKey}:${itemType}:${itemId}`] = version;
	}
	return versions;
}

function version(event: RequestEvent): number | undefined {
	const value = event.url.searchParams.get('version');
	if (!value) return undefined;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 1) throw new Error('Invalid version');
	return parsed;
}

export async function GET(event) {
	try {
		const parts = pathParts(event);
		const uid = await userId(event);

		if (parts[0] === 'me') return ok(await repo.getCurrentUser(uid));
		if (parts[0] === 'sources') return ok(await repo.listSources(uid));
		if (parts[0] === 'official-sources') {
			return ok(await repo.listOfficialSources(uid, sourceKeys(event)));
		}
		if (parts[0] === 'official-compendium') {
			return ok(
				await repo.getOfficialCompendiumFromSourceKeys(
					uid,
					sourceKeys(event),
					sourceVersionMap(event),
					itemVersionMap(event)
				)
			);
		}
		if (parts[0] === 'admin' && parts[1] === 'compendium' && parts[2] === 'export') {
			return ok(await repo.exportAdminCompendium(uid));
		}
		if (parts[0] === 'admin' && parts[1] === 'compendium' && parts.length === 2) {
			return ok(await repo.getAdminCompendiumDashboard(uid));
		}
		if (parts[0] === 'admin' && parts[1] === 'compendium' && parts[2] === 'items') {
			return ok(
				await repo.listAdminCompendiumItems(uid, {
					sourceKey: sourceKeys(event)?.[0],
					itemType: homebrewTable(event)
				})
			);
		}
		if (parts[0] === 'admin' && parts[1] === 'users' && parts.length === 2) {
			return ok(await repo.listAdminUsers(uid));
		}
		if (parts[0] === 'admin' && parts[1] === 'invitations' && parts.length === 2) {
			return ok(await repo.listAdminInvitations(uid));
		}
		if (parts[0] === 'admin' && parts[1] === 'system' && parts.length === 2) {
			return ok(await repo.getAdminSystemSettings(uid));
		}
		if (parts[0] === 'admin' && parts[1] === 'feedback' && parts.length === 2) {
			return ok(await repo.listAdminFeedback(uid));
		}
		if (parts[0] === 'admin' && parts[1] === 'feedback' && parts[2]) {
			return ok(await repo.getAdminFeedback(uid, parts[2]));
		}
		if (parts[0] === 'admin' && parts[1] === 'users' && parts[2]) {
			return ok(await repo.getAdminUser(uid, parts[2]));
		}
		if (parts[0] === 'characters' && parts.length === 1) return ok(await repo.listCharacters(uid));
		if (parts[0] === 'characters' && parts[2] === 'scope') {
			return ok(await repo.getCharacterCompendiumScope(uid, parts[1]));
		}
		if (parts[0] === 'characters' && parts[2] === 'compendium-updates') {
			return ok(await repo.getCharacterCompendiumUpdates(uid, parts[1]));
		}
		if (parts[0] === 'characters' && parts[1]) return ok(await repo.getCharacterAccess(uid, parts[1]));
		if (parts[0] === 'homebrew' && parts.length === 1) return ok(await repo.listHomebrew(uid));
		if (parts[0] === 'homebrew' && parts[1]) return ok(await repo.getHomebrewAccess(uid, parts[1]));
		if (parts[0] === 'encounters' && parts.length === 1) return ok(await repo.listEncounters(uid));
		if (parts[0] === 'encounters' && parts[1]) return ok(await repo.getEncounterAccess(uid, parts[1]));
		if (parts[0] === 'campaigns' && parts.length === 1) return ok(await repo.listCampaigns(uid));
		if (parts[0] === 'campaigns' && parts[2] === 'dice') {
			return ok(await repo.getDiceHistory(uid, parts[1]));
		}
		if (parts[0] === 'campaigns' && parts[2] === 'stream') {
			return ok(await repo.getStreamOverlayForCampaign(uid, parts[1]));
		}
		if (parts[0] === 'campaigns' && parts[1]) return ok(await repo.getCampaignAccess(uid, parts[1]));
		if (parts[0] === 'invites' && parts[1]) return ok(await repo.resolveInvite(uid, parts[1]));
		if (parts[0] === 'access-invites' && parts[1]) {
			return ok(await repo.resolveAccessInvitation(uid, parts[1]));
		}
		if (parts[0] === 'stream' && parts[1] && parts[2] === 'events') {
			return new Response(eventStream(`stream:${parts[1]}`), {
				headers: {
					'content-type': 'text/event-stream',
					'cache-control': 'no-cache, no-transform',
					connection: 'keep-alive'
				}
			});
		}
		if (parts[0] === 'stream' && parts[1]) return ok(await repo.getStreamOverlayState(parts[1]));

		return notFound();
	} catch (error) {
		return handleError(error);
	}
}

export async function POST(event) {
	try {
		const parts = pathParts(event);
		const uid = await userId(event);

		if (parts[0] === 'characters' && parts[1] && parts[2] === 'compendium-updates') {
			return ok(await repo.updateCharacterCompendiumVersions(uid, parts[1], await body(event)));
		}
		if (parts[0] === 'characters') {
			return ok({ id: await repo.createCharacter(uid, await body(event)) });
		}
		if (parts[0] === 'homebrew') {
			return ok({ id: await repo.createHomebrew(uid, await body(event)) });
		}
		if (parts[0] === 'encounters') {
			return ok({ id: await repo.createEncounter(uid, await body(event)) });
		}
		if (parts[0] === 'campaigns' && parts.length === 1) {
			return ok({ id: await repo.createCampaign(uid, await body(event)) });
		}
		if (parts[0] === 'campaigns' && parts[2] === 'characters') {
			const data = await body<{ character_id: string }>(event);
			await repo.addCharacterToCampaign(uid, parts[1], data.character_id);
			return noContent();
		}
		if (parts[0] === 'invites' && parts[1] && parts[2] === 'join') {
			const data = await body<{ displayName: string }>(event);
			return ok({ id: await repo.joinCampaign(uid, parts[1], data.displayName) });
		}
		if (parts[0] === 'access-invites' && parts[1] && parts[2] === 'accept') {
			return ok(await repo.acceptAccessInvitation(uid, parts[1]));
		}
		if (parts[0] === 'campaigns' && parts[2] === 'invite-code') {
			return ok({ inviteCode: await repo.rotateInviteCode(uid, parts[1]) });
		}
		if (parts[0] === 'admin' && parts[1] === 'compendium' && parts[2] === 'import') {
			if (parts[3] === 'preview') {
				return ok(await repo.previewAdminCompendiumImport(uid, await body(event)));
			}
			return ok(await repo.importAdminCompendium(uid, await body(event)));
		}
		if (parts[0] === 'admin' && parts[1] === 'compendium' && parts[2] === 'versions') {
			return ok(await repo.createAdminCompendiumVersion(uid, await body(event)));
		}
		if (parts[0] === 'admin' && parts[1] === 'compendium' && parts[2] === 'items') {
			await repo.createAdminCompendiumItem(uid, await body(event));
			return noContent();
		}
		if (parts[0] === 'admin' && parts[1] === 'compendium' && parts[2] === 'sources') {
			await repo.createAdminOfficialSource(uid, await body(event));
			return noContent();
		}
		if (parts[0] === 'admin' && parts[1] === 'invitations') {
			return ok(await repo.createAdminInvitation(uid, await body(event)));
		}
		if (parts[0] === 'feedback') {
			return ok(
				await repo.createFeedbackSubmission(uid, await body(event), {
					userAgent: event.request.headers.get('user-agent')
				})
			);
		}

		return notFound();
	} catch (error) {
		return handleError(error);
	}
}

export async function PATCH(event) {
	try {
		const parts = pathParts(event);
		const uid = await userId(event);

		if (parts[0] === 'characters' && parts[1] && parts[2] === 'inventory') {
			await repo.updateCharacterInventory(uid, parts[1], await body(event));
			return noContent();
		}
		if (parts[0] === 'characters' && parts[1]) {
			await repo.updateCharacter(uid, parts[1], await body(event));
			return noContent();
		}
		if (parts[0] === 'homebrew') {
			await repo.updateHomebrew(uid, await body(event));
			return noContent();
		}
		if (parts[0] === 'encounters' && parts[1]) {
			await repo.updateEncounter(uid, parts[1], await body(event));
			return noContent();
		}
		if (parts[0] === 'campaigns' && parts[2] === 'dice') {
			await repo.updateDiceHistory(uid, parts[1], await body(event));
			return noContent();
		}
		if (parts[0] === 'campaigns' && parts[2] === 'display-name') {
			const data = await body<{ display_name: string }>(event);
			await repo.changeCampaignDisplayName(uid, parts[1], data.display_name);
			return noContent();
		}
		if (parts[0] === 'campaigns' && parts[2] === 'characters' && parts[3] && parts[4] === 'claim') {
			await repo.claimCampaignCharacter(uid, parts[1], parts[3]);
			return noContent();
		}
		if (
			parts[0] === 'campaigns' &&
			parts[2] === 'characters' &&
			parts[3] &&
			parts[4] === 'unassign'
		) {
			await repo.unassignCampaignCharacter(uid, parts[1], parts[3]);
			return noContent();
		}
		if (parts[0] === 'campaigns' && parts[2] === 'leave') {
			await repo.leaveCampaign(uid, parts[1]);
			return noContent();
		}
		if (parts[0] === 'campaigns' && parts[2] === 'stream') {
			return ok(await repo.upsertStreamOverlay(uid, parts[1], await body(event)));
		}
		if (parts[0] === 'admin' && parts[1] === 'compendium' && parts[2] === 'items') {
			await repo.updateAdminCompendiumItem(uid, await body(event));
			return noContent();
		}
		if (parts[0] === 'admin' && parts[1] === 'compendium' && parts[2] === 'sources') {
			await repo.updateAdminOfficialSource(uid, await body(event));
			return noContent();
		}
		if (parts[0] === 'admin' && parts[1] === 'users' && parts[2] && parts[3] === 'disabled') {
			return ok(await repo.setAdminUserDisabled(uid, parts[2], await body(event)));
		}
		if (parts[0] === 'admin' && parts[1] === 'users' && parts[2] && parts[3] === 'ban') {
			return ok(await repo.setAdminUserBanned(uid, parts[2], await body(event)));
		}
		if (parts[0] === 'admin' && parts[1] === 'users' && parts[2] && parts[3] === 'invalidate') {
			return ok(await repo.invalidateAdminUserSessions(uid, parts[2]));
		}
		if (parts[0] === 'admin' && parts[1] === 'system' && parts.length === 2) {
			return ok(await repo.updateAdminSystemSettings(uid, await body(event)));
		}
		if (parts[0] === 'admin' && parts[1] === 'feedback' && parts[2]) {
			return ok(await repo.updateAdminFeedback(uid, parts[2], await body(event)));
		}
		if (parts[0] === 'campaigns' && parts[1]) {
			await repo.updateCampaign(uid, parts[1], await body(event));
			return noContent();
		}

		return notFound();
	} catch (error) {
		return handleError(error);
	}
}

export async function DELETE(event) {
	try {
		const parts = pathParts(event);
		const uid = await userId(event);

		if (parts[0] === 'characters' && parts[1]) {
			await repo.deleteCharacter(uid, parts[1]);
			return noContent();
		}
		if (parts[0] === 'homebrew' && parts[1]) {
			await repo.deleteHomebrew(uid, parts[1]);
			return noContent();
		}
		if (parts[0] === 'encounters' && parts[1]) {
			await repo.deleteEncounter(uid, parts[1]);
			return noContent();
		}
		if (parts[0] === 'campaigns' && parts[1]) {
			if (parts[2] === 'characters' && parts[3]) {
				await repo.removeCharacterFromCampaign(uid, parts[1], parts[3]);
				return noContent();
			}
			await repo.deleteCampaign(uid, parts[1]);
			return noContent();
		}
		if (parts[0] === 'admin' && parts[1] === 'compendium' && parts[2] === 'items') {
			await repo.deleteAdminCompendiumItem(uid, await body(event));
			return noContent();
		}
		if (parts[0] === 'admin' && parts[1] === 'invitations' && parts[2]) {
			return ok(await repo.revokeAdminInvitation(uid, parts[2]));
		}

		return notFound();
	} catch (error) {
		return handleError(error);
	}
}
