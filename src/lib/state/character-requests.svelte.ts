import { getContext, setContext, tick, untrack } from 'svelte';
import { toast } from 'svelte-sonner';
import { getApi, postApi } from '$lib/api/client';
import { createApiResource } from '$lib/state/api-resource.svelte';
import { getCharacterContext } from '$lib/state/character.svelte';
import {
	CharacterRequestListSchema,
	type CharacterRequest,
	type CharacterRequestList,
	type RequestAction,
	type RequestAckInput,
	type RequestPayload,
	type RequestSide
} from '@domain/schemas/character-requests';
import { dueWork } from '@domain/character-requests';
import {
	applyDeltas,
	applySide,
	isOrphaned,
	removeReceivedGrant,
	revertSide,
	type SheetMaxes,
	type SheetState
} from './request-effects';

// The sheet's side of shared-character requests. The server tracks consent; this applies what this
// player's own sheet has to change (through the normal character save) and reports back.

const POLL_MS = 15_000;
// The character saves after a short debounce; reporting sooner could leave the server ahead of the sheet.
const SAVE_SETTLE_MS = 700;

const OTHER_SIDE: Record<RequestSide, RequestSide> = { sender: 'recipient', recipient: 'sender' };

function createRequests() {
	const characterCtx = getCharacterContext();
	let lastList: CharacterRequestList | null = null;

	const resource = createApiResource<CharacterRequestList | null>(
		async () => {
			const id = characterCtx.id;
			if (!id || !characterCtx.character?.campaign_id) return null;
			if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return lastList;
			lastList = CharacterRequestListSchema.parse(await getApi(`/characters/${id}/requests`));
			return lastList;
		},
		{ intervalMs: POLL_MS, immediate: false }
	);

	// Load when the sheet (or its campaign) changes.
	$effect(() => {
		void characterCtx.id;
		void characterCtx.character?.campaign_id;
		lastList = null;
		void resource.refresh();
	});

	const list = $derived(resource.data ?? null);
	const userId = $derived(list?.viewer_user_id);
	const requests = $derived(list?.requests ?? []);
	const recipients = $derived(list?.recipients ?? []);

	/** The side this sheet plays in a request, if this player plays it. */
	function mySide(request: CharacterRequest): RequestSide | undefined {
		if (!userId || !characterCtx.id) return undefined;
		if (request.from_character_id === characterCtx.id && request.from_user_id === userId) {
			return 'sender';
		}
		if (request.to_character_id === characterCtx.id && request.to_user_id === userId) {
			return 'recipient';
		}
		return undefined;
	}

	/** Requests waiting on this player: a reply to give, or an undo to answer. */
	const needsAttention = $derived(
		requests.filter((request) => {
			const side = mySide(request);
			if (!side) return false;
			if (request.status === 'pending') return side === 'recipient';
			return (
				request.status === 'revert_requested' &&
				request.revert_requested_by !== null &&
				side === OTHER_SIDE[request.revert_requested_by]
			);
		})
	);

	function maxes(): SheetMaxes | undefined {
		const derived = characterCtx.derived_character_data;
		if (!derived) return undefined;
		return {
			marked_hp: derived.max_hp,
			marked_stress: derived.max_stress,
			marked_hope: derived.max_hope
		};
	}

	function sheetState(): SheetState | undefined {
		const character = characterCtx.character;
		if (!character) return undefined;
		return {
			values: {
				marked_hp: character.marked_hp,
				marked_stress: character.marked_stress,
				marked_hope: character.marked_hope
			},
			grants: character.received_grants ?? [],
			applications: character.request_applications ?? {}
		};
	}

	function writeSheet(next: SheetState) {
		const character = characterCtx.character;
		if (!character) return;
		character.marked_hp = next.values.marked_hp;
		character.marked_stress = next.values.marked_stress;
		character.marked_hope = next.values.marked_hope;
		character.received_grants = next.grants;
		character.request_applications = next.applications;
	}

	async function post(path: string, body: unknown = {}) {
		return await postApi<CharacterRequest>(path, body);
	}

	async function ack(request: CharacterRequest, work: 'apply' | 'revert', body: RequestAckInput) {
		await post(
			`/character-requests/${request.id}/${work === 'apply' ? 'ack' : 'ack_revert'}`,
			body
		);
	}

	const inFlight = new Set<string>();

	async function perform(request: CharacterRequest, side: RequestSide, work: 'apply' | 'revert') {
		const key = `${request.id}:${side}:${work}`;
		if (inFlight.has(key)) return;
		// Never write to a sheet that is still loading: its character has been cleaned up against an
		// incomplete compendium, and saving that would delete the character's class, cards and gear.
		if (characterCtx.isLoading || characterCtx.compendiumIncomplete) return;
		const limits = maxes();
		const state = sheetState();
		if (!limits || !state || !characterCtx.canEdit) return;
		inFlight.add(key);
		try {
			const outcome = (work === 'apply' ? applySide : revertSide)(state, request, side, limits);
			if (outcome.ack.ok) {
				writeSheet(outcome.state);
				await tick();
				await new Promise((resolve) => setTimeout(resolve, SAVE_SETTLE_MS));
			}
			await ack(request, work, outcome.ack);
			if (!outcome.ack.ok) {
				toast.error(outcome.ack.reason ?? 'That change could not be applied.', {
					description: `${request.payload.title} was not applied.`
				});
			}
			await resource.refresh();
		} catch (error) {
			// The sheet keeps its record of what it applied, so the next poll reports it again.
			console.error('Could not report a shared change', error);
		} finally {
			inFlight.delete(key);
		}
	}

	// Apply or undo whatever the server says this sheet owes.
	$effect(() => {
		const current = requests;
		const id = userId;
		if (
			!id ||
			!characterCtx.canEdit ||
			!characterCtx.character ||
			characterCtx.isLoading ||
			characterCtx.compendiumIncomplete
		)
			return;
		untrack(() => {
			for (const request of current) {
				const here = mySide(request);
				if (!here) continue;
				for (const { side, work } of dueWork(request, id)) {
					if (side === here) void perform(request, side, work);
				}
			}
		});
	});

	// A change this sheet kept for a request the server no longer counts is undone quietly.
	$effect(() => {
		const current = requests;
		const applications = characterCtx.character?.request_applications;
		const limits = maxes();
		if (
			!applications ||
			!limits ||
			!characterCtx.canEdit ||
			characterCtx.isLoading ||
			characterCtx.compendiumIncomplete
		)
			return;
		untrack(() => {
			for (const request of current) {
				const application = applications[request.id];
				if (!application || !isOrphaned(request, application)) continue;
				const state = sheetState();
				if (!state) return;
				writeSheet(revertSide(state, request, application.side, limits).state);
			}
		});
	});

	async function act(request: CharacterRequest, action: RequestAction, message?: string) {
		try {
			await post(`/character-requests/${request.id}/${action}`);
			await resource.refresh();
			if (message) toast.success(message);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'That did not work.');
			await resource.refresh();
		}
	}

	/** Why this player's own side of a request cannot be applied right now, if it cannot. */
	function blockedReason(
		request: Pick<CharacterRequest, 'payload'>,
		side: RequestSide
	): string | undefined {
		const state = sheetState();
		const limits = maxes();
		if (!state || !limits) return undefined;
		const deltas =
			side === 'sender' ? request.payload.sender_deltas : request.payload.recipient_deltas;
		const result = applyDeltas(state.values, deltas, limits);
		return result.ok ? undefined : result.reason;
	}

	async function send(toCharacterId: string, payload: RequestPayload): Promise<boolean> {
		const id = characterCtx.id;
		if (!id) return false;
		try {
			await post(`/characters/${id}/requests`, { to_character_id: toCharacterId, payload });
			await resource.refresh();
			toast.success('Request sent', { description: 'Nothing changes until they accept.' });
			return true;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not send the request.');
			return false;
		}
	}

	function dismissGrant(grantId: string) {
		const character = characterCtx.character;
		if (
			!character ||
			!characterCtx.canEdit ||
			characterCtx.isLoading ||
			characterCtx.compendiumIncomplete
		)
			return;
		character.received_grants = removeReceivedGrant(character.received_grants ?? [], grantId);
	}

	return {
		get requests() {
			return requests;
		},
		get recipients() {
			return recipients;
		},
		get needsAttention() {
			return needsAttention;
		},
		get isLoading() {
			return resource.isLoading;
		},
		get error() {
			return resource.error;
		},
		get inCampaign() {
			return !!characterCtx.character?.campaign_id;
		},
		mySide,
		blockedReason,
		refresh: () => resource.refresh(),
		send,
		accept: (request: CharacterRequest) => act(request, 'accept'),
		decline: (request: CharacterRequest) => act(request, 'decline', 'Declined'),
		cancel: (request: CharacterRequest) => act(request, 'cancel', 'Cancelled'),
		requestUndo: (request: CharacterRequest) => act(request, 'request_revert', 'Undo requested'),
		confirmUndo: (request: CharacterRequest) => act(request, 'confirm_revert'),
		declineUndo: (request: CharacterRequest) => act(request, 'decline_revert', 'Undo declined'),
		dismissGrant
	};
}

const REQUESTS_KEY = Symbol('CharacterRequests');

export const setRequestsContext = () => setContext(REQUESTS_KEY, createRequests());

export const getRequestsContext = (): ReturnType<typeof setRequestsContext> =>
	getContext(REQUESTS_KEY) as ReturnType<typeof setRequestsContext>;
