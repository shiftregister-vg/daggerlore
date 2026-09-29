import type {
	CharacterRequest,
	RequestAckInput,
	RequestAction,
	RequestDelta,
	RequestPayload,
	RequestSide,
	RequestSideState
} from './schemas/character-requests';

// The state machine behind shared-character requests. It runs on the server (which stores the result)
// and on the client (to know what to show and apply). Errors use the messages the API maps to
// 403 ("Not authorized") and 400.

export const NOT_AUTHORIZED = 'Not authorized';
export const INVALID_STATE = 'That is not possible in the request’s current state';

const OTHER_SIDE: Record<RequestSide, RequestSide> = { sender: 'recipient', recipient: 'sender' };

/** The sides a user plays. One user can play both when they own both characters. */
export function sidesOf(
	request: Pick<CharacterRequest, 'from_user_id' | 'to_user_id'>,
	userId: string
): RequestSide[] {
	const sides: RequestSide[] = [];
	if (request.from_user_id === userId) sides.push('sender');
	if (request.to_user_id === userId) sides.push('recipient');
	return sides;
}

/** Whether the request changes anything on that side's character. */
export function sideAffected(payload: RequestPayload, side: RequestSide): boolean {
	return side === 'sender'
		? payload.sender_deltas.length > 0
		: payload.recipient_deltas.length > 0 || payload.recipient_grant !== undefined;
}

export function initialSideStates(payload: RequestPayload): {
	sender_state: RequestSideState;
	recipient_state: RequestSideState;
} {
	return {
		sender_state: sideAffected(payload, 'sender') ? 'todo' : 'none',
		recipient_state: sideAffected(payload, 'recipient') ? 'todo' : 'none'
	};
}

function stateOf(request: CharacterRequest, side: RequestSide): RequestSideState {
	return side === 'sender' ? request.sender_state : request.recipient_state;
}

function withSide(
	request: CharacterRequest,
	side: RequestSide,
	state: RequestSideState,
	applied?: RequestDelta[]
): CharacterRequest {
	return side === 'sender'
		? { ...request, sender_state: state, sender_applied: applied ?? request.sender_applied }
		: {
				...request,
				recipient_state: state,
				recipient_applied: applied ?? request.recipient_applied
			};
}

function requireSide(request: CharacterRequest, userId: string, side: RequestSide) {
	if (!sidesOf(request, userId).includes(side)) throw new Error(NOT_AUTHORIZED);
}

function requireStatus(request: CharacterRequest, ...statuses: CharacterRequest['status'][]) {
	if (!statuses.includes(request.status)) throw new Error(INVALID_STATE);
}

/**
 * Applies one action by one user. A recipient's player accepts or declines; a GM or any other member
 * has no side and cannot act. Returns the next request; never mutates.
 */
export function transition(
	request: CharacterRequest,
	userId: string,
	action: RequestAction,
	ack?: RequestAckInput,
	now: string = new Date().toISOString()
): CharacterRequest {
	const next = applyAction(request, userId, action, ack);
	return { ...next, updated_at: now };
}

function applyAction(
	request: CharacterRequest,
	userId: string,
	action: RequestAction,
	ack?: RequestAckInput
): CharacterRequest {
	switch (action) {
		case 'accept': {
			requireSide(request, userId, 'recipient');
			requireStatus(request, 'pending');
			return settle({ ...request, status: 'accepted' });
		}
		case 'decline': {
			requireSide(request, userId, 'recipient');
			requireStatus(request, 'pending');
			return { ...request, status: 'declined' };
		}
		case 'cancel': {
			requireSide(request, userId, 'sender');
			requireStatus(request, 'pending');
			return { ...request, status: 'cancelled' };
		}
		case 'ack': {
			if (!ack) throw new Error(INVALID_STATE);
			requireSide(request, userId, ack.side);
			requireStatus(request, 'accepted');
			if (stateOf(request, ack.side) !== 'todo') throw new Error(INVALID_STATE);
			if (!ack.ok) return { ...withSide(request, ack.side, 'failed'), status: 'failed' };
			return settle(withSide(request, ack.side, 'applied', ack.applied));
		}
		case 'request_revert': {
			const sides = sidesOf(request, userId);
			if (sides.length === 0) throw new Error(NOT_AUTHORIZED);
			requireStatus(request, 'applied');
			// The asker may undo alone when the other player's character was untouched.
			const asker = sides[0];
			const others = sides.length === 2 ? [] : [OTHER_SIDE[asker]];
			const needsOther = others.some((side) => sideAffected(request.payload, side));
			return needsOther
				? { ...request, status: 'revert_requested', revert_requested_by: asker }
				: { ...request, status: 'reverting', revert_requested_by: asker };
		}
		case 'confirm_revert':
		case 'decline_revert': {
			requireStatus(request, 'revert_requested');
			const asker = request.revert_requested_by;
			if (!asker) throw new Error(INVALID_STATE);
			requireSide(request, userId, OTHER_SIDE[asker]);
			return action === 'confirm_revert'
				? { ...request, status: 'reverting' }
				: { ...request, status: 'applied', revert_requested_by: null };
		}
		case 'ack_revert': {
			if (!ack) throw new Error(INVALID_STATE);
			requireSide(request, userId, ack.side);
			requireStatus(request, 'reverting', 'failed');
			if (stateOf(request, ack.side) !== 'applied') throw new Error(INVALID_STATE);
			const undone = withSide(request, ack.side, 'undone');
			const outstanding = [undone.sender_state, undone.recipient_state].includes('applied');
			return !outstanding && undone.status === 'reverting'
				? { ...undone, status: 'reverted' }
				: undone;
		}
	}
}

/** Moves an accepted request to applied once no side has anything left to apply. */
function settle(request: CharacterRequest): CharacterRequest {
	const done = [request.sender_state, request.recipient_state].every(
		(state) => state === 'none' || state === 'applied'
	);
	return done && request.status === 'accepted' ? { ...request, status: 'applied' } : request;
}

/**
 * Brings a request's status in line with its sides. Sides are written separately (so two players acking
 * at the same moment cannot overwrite each other), which can leave the status one step behind.
 */
export function reconcile(request: CharacterRequest): CharacterRequest {
	const states = [request.sender_state, request.recipient_state];
	if (request.status === 'accepted' && states.every((s) => s === 'none' || s === 'applied')) {
		return { ...request, status: 'applied' };
	}
	if (request.status === 'reverting' && !states.includes('applied')) {
		return { ...request, status: 'reverted' };
	}
	return request;
}

/** What a side's own sheet should do now, if anything. */
export function dueWork(
	request: CharacterRequest,
	userId: string
): { side: RequestSide; work: 'apply' | 'revert' }[] {
	return sidesOf(request, userId).flatMap(
		(side): { side: RequestSide; work: 'apply' | 'revert' }[] => {
			const state = stateOf(request, side);
			if (request.status === 'accepted' && state === 'todo') return [{ side, work: 'apply' }];
			if ((request.status === 'reverting' || request.status === 'failed') && state === 'applied') {
				return [{ side, work: 'revert' }];
			}
			return [];
		}
	);
}

/** Requests that wait on this user right now: incoming to accept, or an undo to confirm. */
export function needsAttention(request: CharacterRequest, userId: string): boolean {
	const sides = sidesOf(request, userId);
	if (request.status === 'pending') return sides.includes('recipient');
	if (request.status === 'revert_requested' && request.revert_requested_by) {
		return sides.includes(OTHER_SIDE[request.revert_requested_by]);
	}
	return false;
}

const FIELD_LABELS: Record<RequestDelta['field'], { unit: string; up: string; down: string }> = {
	marked_hp: { unit: 'HP', up: 'Mark', down: 'Clear' },
	marked_stress: { unit: 'Stress', up: 'Mark', down: 'Clear' },
	marked_hope: { unit: 'Hope', up: 'Gain', down: 'Spend' }
};

/** e.g. "Mark 2 Stress", "Clear 1 HP", "Gain 2 Hope". */
export function describeDelta(delta: RequestDelta): string {
	const label = FIELD_LABELS[delta.field];
	return `${delta.delta > 0 ? label.up : label.down} ${Math.abs(delta.delta)} ${label.unit}`;
}

export function describeGrant(grant: NonNullable<RequestPayload['recipient_grant']>): string {
	if (grant.kind === 'note') return `Note: ${grant.text}`;
	const moves = grant.count === 1 ? 'extra downtime move' : `${grant.count} extra downtime moves`;
	const when = grant.rest === 'any' ? 'at their next rest' : `during their next ${grant.rest} rest`;
	return `${grant.count === 1 ? '1 ' : ''}${moves} ${when}`;
}

/** The status shown to players, in plain words. */
export const STATUS_LABELS: Record<CharacterRequest['status'], string> = {
	pending: 'Waiting for a reply',
	accepted: 'Applying',
	applied: 'Applied',
	declined: 'Declined',
	cancelled: 'Cancelled',
	failed: 'Could not be applied',
	revert_requested: 'Undo requested',
	reverting: 'Undoing',
	reverted: 'Undone'
};
