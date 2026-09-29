import { describe, expect, it } from 'vitest';
import {
	describeDelta,
	describeGrant,
	dueWork,
	initialSideStates,
	INVALID_STATE,
	needsAttention,
	reconcile,
	NOT_AUTHORIZED,
	sideAffected,
	sidesOf,
	transition
} from './character-requests';
import {
	CharacterRequestSchema,
	RequestPayloadSchema,
	type CharacterRequest,
	type RequestPayload
} from './schemas/character-requests';

const SENDER = 'user-sender';
const RECIPIENT = 'user-recipient';
const GM = 'user-gm';

function request(
	payload: Partial<RequestPayload> = {},
	overrides: Partial<CharacterRequest> = {}
): CharacterRequest {
	const changesSomething = Object.keys(payload).length > 0;
	const parsed = RequestPayloadSchema.parse({
		title: 'Share the Burden',
		sender_deltas: [],
		recipient_deltas: [],
		...(changesSomething ? {} : { recipient_grant: { kind: 'note', text: 'A favor' } }),
		...payload
	});
	return CharacterRequestSchema.parse({
		id: 'r1',
		campaign_id: 'c1',
		from_character_id: 'from',
		to_character_id: 'to',
		from_user_id: SENDER,
		to_user_id: RECIPIENT,
		payload: parsed,
		status: 'pending',
		...initialSideStates(parsed),
		created_at: 't',
		updated_at: 't',
		...overrides
	});
}

const transfer = {
	sender_deltas: [
		{ field: 'marked_stress', delta: 2 },
		{ field: 'marked_hope', delta: 2 }
	],
	recipient_deltas: [{ field: 'marked_stress', delta: -2 }]
} as const satisfies Partial<RequestPayload>;
const grant = {
	recipient_grant: { kind: 'extra_move', rest: 'any', count: 1 }
} as const satisfies Partial<RequestPayload>;

const ackOk = (
	side: 'sender' | 'recipient',
	applied = [{ field: 'marked_stress', delta: 1 }] as const
) => ({
	side,
	ok: true,
	applied: [...applied]
});

describe('request payload', () => {
	it('needs at least one change and one change per resource', () => {
		expect(RequestPayloadSchema.safeParse({ title: 'Nothing' }).success).toBe(false);
		expect(
			RequestPayloadSchema.safeParse({
				title: 'Twice',
				recipient_deltas: [
					{ field: 'marked_hp', delta: 1 },
					{ field: 'marked_hp', delta: 2 }
				]
			}).success
		).toBe(false);
		expect(
			RequestPayloadSchema.safeParse({
				title: 'Zero',
				recipient_deltas: [{ field: 'marked_hp', delta: 0 }]
			}).success
		).toBe(false);
	});

	it('knows which sides a request changes', () => {
		const payload = RequestPayloadSchema.parse({ title: 'Grant', ...grant });
		expect(sideAffected(payload, 'recipient')).toBe(true);
		expect(sideAffected(payload, 'sender')).toBe(false);
		expect(initialSideStates(payload)).toEqual({ sender_state: 'none', recipient_state: 'todo' });
	});
});

describe('who can act', () => {
	it('gives a user a side per character they own', () => {
		expect(sidesOf(request(), SENDER)).toEqual(['sender']);
		expect(sidesOf(request(), RECIPIENT)).toEqual(['recipient']);
		expect(sidesOf(request(), GM)).toEqual([]);
		expect(sidesOf(request({}, { to_user_id: SENDER }), SENDER)).toEqual(['sender', 'recipient']);
	});

	it('lets only the recipient accept or decline, and only the sender cancel', () => {
		const pending = request(transfer);
		for (const user of [SENDER, GM]) {
			expect(() => transition(pending, user, 'accept')).toThrow(NOT_AUTHORIZED);
			expect(() => transition(pending, user, 'decline')).toThrow(NOT_AUTHORIZED);
		}
		for (const user of [RECIPIENT, GM]) {
			expect(() => transition(pending, user, 'cancel')).toThrow(NOT_AUTHORIZED);
		}
		expect(transition(pending, RECIPIENT, 'accept').status).toBe('accepted');
		expect(transition(pending, RECIPIENT, 'decline').status).toBe('declined');
		expect(transition(pending, SENDER, 'cancel').status).toBe('cancelled');
	});

	it('cannot act twice or out of order', () => {
		const accepted = transition(request(transfer), RECIPIENT, 'accept');
		expect(() => transition(accepted, RECIPIENT, 'accept')).toThrow(INVALID_STATE);
		expect(() => transition(accepted, RECIPIENT, 'decline')).toThrow(INVALID_STATE);
		expect(() => transition(accepted, SENDER, 'cancel')).toThrow(INVALID_STATE);
		expect(() => transition(request(transfer), RECIPIENT, 'ack', ackOk('recipient'))).toThrow(
			INVALID_STATE
		);
	});
});

describe('applying', () => {
	it('is applied once both sides have acked their own change', () => {
		let current = transition(request(transfer), RECIPIENT, 'accept');
		expect(dueWork(current, RECIPIENT)).toEqual([{ side: 'recipient', work: 'apply' }]);
		expect(dueWork(current, SENDER)).toEqual([{ side: 'sender', work: 'apply' }]);

		current = transition(current, RECIPIENT, 'ack', ackOk('recipient'));
		expect(current.status).toBe('accepted');
		expect(current.recipient_applied).toEqual([{ field: 'marked_stress', delta: 1 }]);
		expect(dueWork(current, RECIPIENT)).toEqual([]);

		current = transition(current, SENDER, 'ack', ackOk('sender'));
		expect(current.status).toBe('applied');
	});

	it('applies straight away when only the recipient changes', () => {
		const current = transition(request(grant), RECIPIENT, 'accept');
		expect(transition(current, RECIPIENT, 'ack', { side: 'recipient', ok: true }).status).toBe(
			'applied'
		);
	});

	it('cannot ack for the other player', () => {
		const accepted = transition(request(transfer), RECIPIENT, 'accept');
		expect(() => transition(accepted, RECIPIENT, 'ack', ackOk('sender'))).toThrow(NOT_AUTHORIZED);
		expect(() => transition(accepted, GM, 'ack', ackOk('recipient'))).toThrow(NOT_AUTHORIZED);
	});

	it('cannot ack a side twice', () => {
		const once = transition(
			transition(request(transfer), RECIPIENT, 'accept'),
			RECIPIENT,
			'ack',
			ackOk('recipient')
		);
		expect(() => transition(once, RECIPIENT, 'ack', ackOk('recipient'))).toThrow(INVALID_STATE);
	});

	it('fails when a side cannot apply, and the other side undoes its change', () => {
		let current = transition(request(transfer), RECIPIENT, 'accept');
		current = transition(current, RECIPIENT, 'ack', ackOk('recipient'));
		current = transition(current, SENDER, 'ack', { side: 'sender', ok: false, reason: 'Full' });
		expect(current.status).toBe('failed');
		expect(current.sender_state).toBe('failed');
		expect(dueWork(current, RECIPIENT)).toEqual([{ side: 'recipient', work: 'revert' }]);
		expect(dueWork(current, SENDER)).toEqual([]);

		current = transition(current, RECIPIENT, 'ack_revert', { side: 'recipient', ok: true });
		expect(current.recipient_state).toBe('undone');
		expect(current.status).toBe('failed');
		expect(dueWork(current, RECIPIENT)).toEqual([]);
	});
});

describe('undo', () => {
	function applied(payload: Partial<RequestPayload>) {
		let current = transition(request(payload), RECIPIENT, 'accept');
		current = transition(current, RECIPIENT, 'ack', ackOk('recipient'));
		if (payload.sender_deltas?.length) {
			current = transition(current, SENDER, 'ack', ackOk('sender'));
		}
		expect(current.status).toBe('applied');
		return current;
	}

	it('needs the other player when their character was changed', () => {
		const current = applied(transfer);
		const asked = transition(current, SENDER, 'request_revert');
		expect(asked.status).toBe('revert_requested');
		expect(asked.revert_requested_by).toBe('sender');
		expect(needsAttention(asked, RECIPIENT)).toBe(true);
		expect(needsAttention(asked, SENDER)).toBe(false);
		expect(() => transition(asked, SENDER, 'confirm_revert')).toThrow(NOT_AUTHORIZED);
		expect(() => transition(asked, GM, 'confirm_revert')).toThrow(NOT_AUTHORIZED);
		expect(transition(asked, RECIPIENT, 'confirm_revert').status).toBe('reverting');
	});

	it('lets the other player refuse, leaving the request applied', () => {
		const asked = transition(applied(transfer), RECIPIENT, 'request_revert');
		const refused = transition(asked, SENDER, 'decline_revert');
		expect(refused.status).toBe('applied');
		expect(refused.revert_requested_by).toBeNull();
	});

	it('is immediate when the other player was not changed', () => {
		const current = applied(grant);
		const undone = transition(current, RECIPIENT, 'request_revert');
		expect(undone.status).toBe('reverting');
		// the sender never changed, so their undo of a recipient-only change still asks the recipient
		expect(transition(current, SENDER, 'request_revert').status).toBe('revert_requested');
	});

	it('is immediate when one player plays both sides', () => {
		const both = request(transfer, { to_user_id: SENDER });
		let current = transition(both, SENDER, 'accept');
		current = transition(current, SENDER, 'ack', ackOk('recipient'));
		current = transition(current, SENDER, 'ack', ackOk('sender'));
		expect(transition(current, SENDER, 'request_revert').status).toBe('reverting');
	});

	it('is reverted once every applied side has undone its change', () => {
		let current = transition(
			transition(applied(transfer), SENDER, 'request_revert'),
			RECIPIENT,
			'confirm_revert'
		);
		expect(dueWork(current, RECIPIENT)).toEqual([{ side: 'recipient', work: 'revert' }]);
		expect(dueWork(current, SENDER)).toEqual([{ side: 'sender', work: 'revert' }]);

		current = transition(current, RECIPIENT, 'ack_revert', { side: 'recipient', ok: true });
		expect(current.status).toBe('reverting');
		current = transition(current, SENDER, 'ack_revert', { side: 'sender', ok: true });
		expect(current.status).toBe('reverted');
	});

	it('only applies to an applied request', () => {
		expect(() => transition(request(transfer), SENDER, 'request_revert')).toThrow(INVALID_STATE);
		expect(() => transition(applied(transfer), GM, 'request_revert')).toThrow(NOT_AUTHORIZED);
	});
});

describe('descriptions', () => {
	it('describes changes in plain words', () => {
		expect(describeDelta({ field: 'marked_stress', delta: 2 })).toBe('Mark 2 Stress');
		expect(describeDelta({ field: 'marked_hp', delta: -1 })).toBe('Clear 1 HP');
		expect(describeDelta({ field: 'marked_hope', delta: 2 })).toBe('Gain 2 Hope');
		expect(describeDelta({ field: 'marked_hope', delta: -1 })).toBe('Spend 1 Hope');
		expect(describeGrant({ kind: 'extra_move', rest: 'any', count: 1 })).toBe(
			'1 extra downtime move at their next rest'
		);
		expect(describeGrant({ kind: 'extra_move', rest: 'short', count: 2 })).toBe(
			'2 extra downtime moves during their next short rest'
		);
		expect(describeGrant({ kind: 'note', text: 'Owes a favor', clear_on: [] })).toBe(
			'Note: Owes a favor'
		);
	});
});

describe('reconcile', () => {
	it('settles a status left behind by two acks written at once', () => {
		const stale = request(transfer, {
			status: 'accepted',
			sender_state: 'applied',
			recipient_state: 'applied'
		});
		expect(reconcile(stale).status).toBe('applied');
		const undoing = request(transfer, {
			status: 'reverting',
			sender_state: 'undone',
			recipient_state: 'undone'
		});
		expect(reconcile(undoing).status).toBe('reverted');
	});

	it('leaves a request that still has work to do', () => {
		const waiting = request(transfer, { status: 'accepted', sender_state: 'applied' });
		expect(reconcile(waiting)).toBe(waiting);
	});
});
