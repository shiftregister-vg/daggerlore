import type { Character } from '@domain/schemas/characters';
import type {
	CharacterRequest,
	ReceivedGrant,
	RequestApplication,
	RequestDelta,
	RequestField,
	RequestSide
} from '@domain/schemas/character-requests';
import type { PoolEvent } from '@domain/schemas/rules';

// What a player's own sheet does for a request it took part in. Pure: the applier in
// character-requests.svelte.ts feeds these the live character and writes the results back.

export type SheetValues = Pick<Character, RequestField>;
export type SheetMaxes = Record<RequestField, number>;

export type SheetState = {
	values: SheetValues;
	grants: ReceivedGrant[];
	applications: Record<string, RequestApplication>;
};

export type ApplyResult =
	{ ok: true; values: SheetValues; applied: RequestDelta[] } | { ok: false; reason: string };

const FIELD_NAMES: Record<RequestField, string> = {
	marked_hp: 'HP',
	marked_stress: 'Stress',
	marked_hope: 'Hope'
};

const MAX_APPLICATIONS = 50;

/**
 * Applies changes to a sheet. Marking Stress or HP past the maximum, or spending Hope you don't have,
 * blocks the whole change; clearing more than is marked, or gaining Hope past the maximum, is clamped.
 * `applied` holds what actually changed so an undo restores exactly that.
 */
export function applyDeltas(
	values: SheetValues,
	deltas: readonly RequestDelta[],
	maxes: SheetMaxes
): ApplyResult {
	const next = { ...values };
	const applied: RequestDelta[] = [];
	for (const { field, delta } of deltas) {
		const before = next[field];
		if (field !== 'marked_hope' && delta > 0 && before + delta > maxes[field]) {
			return { ok: false, reason: `That would mark more ${FIELD_NAMES[field]} than you have.` };
		}
		if (field === 'marked_hope' && delta < 0 && before + delta < 0) {
			return { ok: false, reason: 'You do not have enough Hope.' };
		}
		next[field] = Math.max(0, Math.min(maxes[field], before + delta));
		const change = next[field] - before;
		if (change !== 0) applied.push({ field, delta: change });
	}
	return { ok: true, values: next, applied };
}

/** Undoes what was applied. Never blocks: it puts back what changed, within the sheet's limits. */
export function revertDeltas(
	values: SheetValues,
	applied: readonly RequestDelta[],
	maxes: SheetMaxes
): SheetValues {
	const next = { ...values };
	for (const { field, delta } of applied) {
		next[field] = Math.max(0, Math.min(maxes[field], next[field] - delta));
	}
	return next;
}

export function grantIdFor(requestId: string): string {
	return `grant-${requestId}`;
}

export type SideAck = { side: RequestSide; ok: boolean; applied: RequestDelta[]; reason?: string };

function sideDeltas(request: CharacterRequest, side: RequestSide): RequestDelta[] {
	return side === 'sender' ? request.payload.sender_deltas : request.payload.recipient_deltas;
}

function appliedOnServer(request: CharacterRequest, side: RequestSide): RequestDelta[] {
	return side === 'sender' ? request.sender_applied : request.recipient_applied;
}

/** Applies this side of an accepted request. Applying twice (a lost reply) changes nothing the second time. */
export function applySide(
	state: SheetState,
	request: CharacterRequest,
	side: RequestSide,
	maxes: SheetMaxes
): { state: SheetState; ack: SideAck } {
	const existing = state.applications[request.id];
	if (existing && existing.side === side && !existing.undone) {
		return { state, ack: { side, ok: true, applied: existing.deltas } };
	}
	const result = applyDeltas(state.values, sideDeltas(request, side), maxes);
	if (!result.ok) return { state, ack: { side, ok: false, applied: [], reason: result.reason } };

	const grant = side === 'recipient' ? request.payload.recipient_grant : undefined;
	const grantId = grant ? grantIdFor(request.id) : undefined;
	const grants =
		grant && grantId
			? [
					...state.grants.filter((entry) => entry.id !== grantId),
					{ id: grantId, request_id: request.id, from_name: request.from_name, grant }
				]
			: state.grants;
	return {
		state: {
			values: result.values,
			grants,
			applications: rememberApplication(state.applications, request.id, {
				side,
				deltas: result.applied,
				grant_id: grantId,
				undone: false
			})
		},
		ack: { side, ok: true, applied: result.applied }
	};
}

/** Undoes this side. Uses what the sheet recorded, or what the server recorded if the sheet lost it. */
export function revertSide(
	state: SheetState,
	request: CharacterRequest,
	side: RequestSide,
	maxes: SheetMaxes
): { state: SheetState; ack: SideAck } {
	const application = state.applications[request.id];
	if (application?.undone) return { state, ack: { side, ok: true, applied: [] } };
	const deltas = application?.deltas ?? appliedOnServer(request, side);
	const grantId =
		application?.grant_id ??
		(request.payload.recipient_grant && side === 'recipient' ? grantIdFor(request.id) : undefined);
	return {
		state: {
			values: revertDeltas(state.values, deltas, maxes),
			grants: grantId ? state.grants.filter((entry) => entry.id !== grantId) : state.grants,
			applications: application
				? { ...state.applications, [request.id]: { ...application, undone: true } }
				: state.applications
		},
		ack: { side, ok: true, applied: [] }
	};
}

/** Whether a sheet kept a change for a request the server no longer counts, e.g. its reply was lost. */
export function isOrphaned(request: CharacterRequest, application: RequestApplication): boolean {
	if (application.undone) return false;
	const serverState =
		application.side === 'sender' ? request.sender_state : request.recipient_state;
	const settled = ['failed', 'declined', 'cancelled', 'reverted'].includes(request.status);
	return settled && serverState !== 'applied';
}

/** Keeps the newest applications, so the record stays small. */
function rememberApplication(
	applications: Record<string, RequestApplication>,
	requestId: string,
	application: RequestApplication
): Record<string, RequestApplication> {
	const { [requestId]: _replaced, ...rest } = applications;
	const entries = Object.entries({ ...rest, [requestId]: application });
	return Object.fromEntries(entries.slice(-MAX_APPLICATIONS));
}

/**
 * Grants leave when their rest completes (an extra move) or when their own reset comes (a note).
 * Returns what was removed so completing a rest can say so.
 */
export function applyGrantEvent(
	grants: readonly ReceivedGrant[],
	event: PoolEvent
): { next: ReceivedGrant[]; cleared: ReceivedGrant[] } {
	const leaves = (received: ReceivedGrant) => {
		const { grant } = received;
		if (grant.kind === 'note') return grant.clear_on.includes(event);
		if (event === 'short_rest') return grant.rest === 'short' || grant.rest === 'any';
		if (event === 'long_rest') return grant.rest === 'long' || grant.rest === 'any';
		return false;
	};
	return {
		next: grants.filter((received) => !leaves(received)),
		cleared: grants.filter(leaves)
	};
}

export function removeReceivedGrant(grants: readonly ReceivedGrant[], id: string): ReceivedGrant[] {
	return grants.filter((grant) => grant.id !== id);
}

/** Extra-move grants that count toward a rest's allowance: that rest's, or either rest's when 'any'. */
export function extraMoveGrantsFor(
	grants: readonly ReceivedGrant[],
	rest: 'short' | 'long'
): ReceivedGrant[] {
	return grants.filter(
		({ grant }) => grant.kind === 'extra_move' && (grant.rest === rest || grant.rest === 'any')
	);
}
