import { describe, expect, it } from 'vitest';
import type {
	CharacterRequest,
	ReceivedGrant,
	RequestPayload
} from '@domain/schemas/character-requests';
import {
	applyDeltas,
	applyGrantEvent,
	applySide,
	extraMoveGrantsFor,
	grantIdFor,
	isOrphaned,
	revertDeltas,
	revertSide,
	type SheetMaxes,
	type SheetState,
	type SheetValues
} from './request-effects';

const maxes: SheetMaxes = { marked_hp: 6, marked_stress: 6, marked_hope: 6 };
const values = (overrides: Partial<SheetValues> = {}): SheetValues => ({
	marked_hp: 2,
	marked_stress: 3,
	marked_hope: 2,
	...overrides
});
const state = (overrides: Partial<SheetState> = {}): SheetState => ({
	values: values(),
	grants: [],
	applications: {},
	...overrides
});

function request(payload: Partial<RequestPayload>, overrides: Partial<CharacterRequest> = {}) {
	return {
		id: 'r1',
		campaign_id: 'c',
		from_character_id: 'a',
		to_character_id: 'b',
		from_user_id: 'ua',
		to_user_id: 'ub',
		from_name: 'Aria',
		to_name: 'Bram',
		payload: { title: 'Share', sender_deltas: [], recipient_deltas: [], ...payload },
		status: 'accepted',
		revert_requested_by: null,
		sender_state: 'todo',
		recipient_state: 'todo',
		sender_applied: [],
		recipient_applied: [],
		created_at: 't',
		updated_at: 't',
		...overrides
	} as CharacterRequest;
}

describe('applyDeltas', () => {
	it('applies changes and reports what changed', () => {
		const result = applyDeltas(
			values(),
			[
				{ field: 'marked_stress', delta: 2 },
				{ field: 'marked_hope', delta: 1 }
			],
			maxes
		);
		expect(result).toEqual({
			ok: true,
			values: values({ marked_stress: 5, marked_hope: 3 }),
			applied: [
				{ field: 'marked_stress', delta: 2 },
				{ field: 'marked_hope', delta: 1 }
			]
		});
	});

	it('clamps clearing and gaining Hope, and reports the smaller change', () => {
		const result = applyDeltas(
			values({ marked_hope: 5 }),
			[
				{ field: 'marked_stress', delta: -9 },
				{ field: 'marked_hope', delta: 4 }
			],
			maxes
		);
		expect(result).toMatchObject({
			ok: true,
			applied: [
				{ field: 'marked_stress', delta: -3 },
				{ field: 'marked_hope', delta: 1 }
			]
		});
	});

	it('blocks marking past the maximum and spending Hope you lack', () => {
		expect(
			applyDeltas(values({ marked_stress: 5 }), [{ field: 'marked_stress', delta: 2 }], maxes)
		).toMatchObject({
			ok: false,
			reason: expect.stringContaining('Stress')
		});
		expect(
			applyDeltas(values({ marked_hope: 1 }), [{ field: 'marked_hope', delta: -2 }], maxes)
		).toMatchObject({
			ok: false,
			reason: expect.stringContaining('Hope')
		});
	});

	it('changes nothing at all when one of the changes is blocked', () => {
		const start = values({ marked_stress: 6 });
		const result = applyDeltas(
			start,
			[
				{ field: 'marked_hp', delta: -1 },
				{ field: 'marked_stress', delta: 1 }
			],
			maxes
		);
		expect(result.ok).toBe(false);
		expect(start).toEqual(values({ marked_stress: 6 }));
	});
});

describe('revertDeltas', () => {
	it('puts back exactly what was applied, even after clamping', () => {
		const start = values({ marked_stress: 1 });
		const result = applyDeltas(start, [{ field: 'marked_stress', delta: -5 }], maxes);
		if (!result.ok) throw new Error('expected success');
		expect(result.applied).toEqual([{ field: 'marked_stress', delta: -1 }]);
		expect(revertDeltas(result.values, result.applied, maxes)).toEqual(start);
	});

	it('never leaves the sheet outside its limits', () => {
		expect(
			revertDeltas(values({ marked_hope: 0 }), [{ field: 'marked_hope', delta: 3 }], maxes)
				.marked_hope
		).toBe(0);
		expect(
			revertDeltas(values({ marked_hp: 6 }), [{ field: 'marked_hp', delta: -3 }], maxes).marked_hp
		).toBe(6);
	});
});

describe('applySide / revertSide', () => {
	const transfer = request({
		sender_deltas: [{ field: 'marked_stress', delta: 2 }],
		recipient_deltas: [{ field: 'marked_stress', delta: -2 }]
	});
	const grant = request({ recipient_grant: { kind: 'extra_move', rest: 'any', count: 1 } });

	it('applies a side, remembers it, and reports the amounts', () => {
		const { state: next, ack } = applySide(state(), transfer, 'recipient', maxes);
		expect(next.values.marked_stress).toBe(1);
		expect(next.applications.r1).toEqual({
			side: 'recipient',
			deltas: [{ field: 'marked_stress', delta: -2 }],
			grant_id: undefined,
			undone: false
		});
		expect(ack).toEqual({
			side: 'recipient',
			ok: true,
			applied: [{ field: 'marked_stress', delta: -2 }]
		});
	});

	it('does not apply twice when the reply was lost', () => {
		const once = applySide(state(), transfer, 'recipient', maxes);
		const again = applySide(once.state, transfer, 'recipient', maxes);
		expect(again.state.values.marked_stress).toBe(1);
		expect(again.ack).toEqual(once.ack);
	});

	it('reports why it could not apply and changes nothing', () => {
		const full = state({ values: values({ marked_stress: 6 }) });
		const { state: next, ack } = applySide(full, transfer, 'sender', maxes);
		expect(next).toBe(full);
		expect(ack).toMatchObject({ side: 'sender', ok: false });
		expect(ack.reason).toContain('Stress');
	});

	it('keeps a received grant and removes it on undo', () => {
		const { state: given } = applySide(state(), grant, 'recipient', maxes);
		expect(given.grants).toEqual([
			{
				id: grantIdFor('r1'),
				request_id: 'r1',
				from_name: 'Aria',
				grant: { kind: 'extra_move', rest: 'any', count: 1 }
			}
		]);
		const { state: undone } = revertSide(given, grant, 'recipient', maxes);
		expect(undone.grants).toEqual([]);
		expect(undone.applications.r1.undone).toBe(true);
	});

	it('undoes a change exactly, once', () => {
		const start = state();
		const applied = applySide(start, transfer, 'recipient', maxes).state;
		const undone = revertSide(applied, transfer, 'recipient', maxes);
		expect(undone.state.values).toEqual(start.values);
		const again = revertSide(undone.state, transfer, 'recipient', maxes);
		expect(again.state.values).toEqual(start.values);
	});

	it('undoes from the server’s record when the sheet lost its own', () => {
		const onServer = request(transfer.payload, {
			recipient_state: 'applied',
			recipient_applied: [{ field: 'marked_stress', delta: -2 }]
		});
		const result = revertSide(
			state({ values: values({ marked_stress: 1 }) }),
			onServer,
			'recipient',
			maxes
		);
		expect(result.state.values.marked_stress).toBe(3);
	});

	it('keeps only the newest applications', () => {
		let current = state();
		for (let i = 0; i < 55; i++) {
			current = applySide(current, request(transfer.payload, { id: `r${i}` }), 'recipient', {
				...maxes,
				marked_stress: 99
			}).state;
		}
		expect(Object.keys(current.applications)).toHaveLength(50);
		expect(current.applications.r54).toBeDefined();
		expect(current.applications.r0).toBeUndefined();
	});
});

describe('isOrphaned', () => {
	const application = { side: 'recipient' as const, deltas: [], undone: false };
	it('flags a change the server no longer counts', () => {
		expect(isOrphaned(request({}, { status: 'failed' }), application)).toBe(true);
		expect(isOrphaned(request({}, { status: 'declined' }), application)).toBe(true);
	});

	it('leaves a change the server counts, or one still in progress', () => {
		expect(isOrphaned(request({}, { status: 'accepted' }), application)).toBe(false);
		expect(
			isOrphaned(request({}, { status: 'failed', recipient_state: 'applied' }), application)
		).toBe(false);
		expect(isOrphaned(request({}, { status: 'failed' }), { ...application, undone: true })).toBe(
			false
		);
	});
});

describe('received grants', () => {
	const grants: ReceivedGrant[] = [
		{
			id: 'g1',
			request_id: 'r1',
			from_name: 'A',
			grant: { kind: 'extra_move', rest: 'short', count: 1 }
		},
		{
			id: 'g2',
			request_id: 'r2',
			from_name: 'A',
			grant: { kind: 'extra_move', rest: 'long', count: 2 }
		},
		{
			id: 'g3',
			request_id: 'r3',
			from_name: 'A',
			grant: { kind: 'extra_move', rest: 'any', count: 1 }
		},
		{
			id: 'g4',
			request_id: 'r4',
			from_name: 'A',
			grant: { kind: 'note', text: 'Owes a favor', clear_on: ['session_end'] }
		},
		{
			id: 'g5',
			request_id: 'r5',
			from_name: 'A',
			grant: { kind: 'note', text: 'Keep', clear_on: [] }
		}
	];

	it('counts a grant toward the rest it names, or either rest for "any"', () => {
		expect(extraMoveGrantsFor(grants, 'short').map((grant) => grant.id)).toEqual(['g1', 'g3']);
		expect(extraMoveGrantsFor(grants, 'long').map((grant) => grant.id)).toEqual(['g2', 'g3']);
	});

	it('removes extra moves when their rest completes', () => {
		const short = applyGrantEvent(grants, 'short_rest');
		expect(short.cleared.map((grant) => grant.id)).toEqual(['g1', 'g3']);
		expect(short.next.map((grant) => grant.id)).toEqual(['g2', 'g4', 'g5']);
		expect(applyGrantEvent(grants, 'long_rest').cleared.map((grant) => grant.id)).toEqual([
			'g2',
			'g3'
		]);
	});

	it('clears a note only on its own reset', () => {
		expect(applyGrantEvent(grants, 'session_end').cleared.map((grant) => grant.id)).toEqual(['g4']);
		expect(applyGrantEvent(grants, 'scene').cleared).toEqual([]);
	});
});
