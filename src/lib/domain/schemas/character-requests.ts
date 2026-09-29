import { z } from 'zod';
import { PoolEventSchema } from './rules';

// A change one player asks to make to another player's character, or that two players make together.
// The server only tracks consent and progress; each player's own sheet applies its own side.

export const RequestFieldSchema = z.enum(['marked_hp', 'marked_stress', 'marked_hope']);
export type RequestField = z.infer<typeof RequestFieldSchema>;

/** A change to a stored value, e.g. +2 marked Stress. Applying clamps it, and the applied amount is kept. */
export const RequestDeltaSchema = z.object({
	field: RequestFieldSchema,
	delta: z
		.number()
		.int()
		.min(-12)
		.max(12)
		.refine((delta) => delta !== 0, 'Enter an amount')
});
export type RequestDelta = z.infer<typeof RequestDeltaSchema>;

const DeltasSchema = z
	.array(RequestDeltaSchema)
	.max(4)
	.default([])
	.superRefine((deltas, ctx) => {
		const fields = new Set<string>();
		deltas.forEach((delta, index) => {
			if (fields.has(delta.field)) {
				ctx.addIssue({
					code: 'custom',
					path: [index, 'field'],
					message: 'Each resource can change once'
				});
			}
			fields.add(delta.field);
		});
	});

export const RequestGrantSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('extra_move'),
		// 'any' is whichever rest the recipient completes first
		rest: z.enum(['short', 'long', 'any']),
		count: z.number().int().min(1).max(5).default(1),
		label: z.string().trim().max(80).optional()
	}),
	z.object({
		kind: z.literal('note'),
		text: z.string().trim().min(1).max(500),
		// Without a reset the recipient dismisses it by hand.
		clear_on: z.array(PoolEventSchema).max(5).default([])
	})
]);
export type RequestGrant = z.infer<typeof RequestGrantSchema>;

export const RequestPayloadSchema = z
	.object({
		title: z.string().trim().min(1).max(80),
		message: z.string().trim().max(500).optional(),
		sender_deltas: DeltasSchema,
		recipient_deltas: DeltasSchema,
		recipient_grant: RequestGrantSchema.optional()
	})
	.refine(
		(payload) =>
			payload.sender_deltas.length > 0 ||
			payload.recipient_deltas.length > 0 ||
			payload.recipient_grant !== undefined,
		{ message: 'Choose what changes', path: ['recipient_deltas'] }
	);
export type RequestPayload = z.infer<typeof RequestPayloadSchema>;

export const RequestSideSchema = z.enum(['sender', 'recipient']);
export type RequestSide = z.infer<typeof RequestSideSchema>;

export const RequestStatusSchema = z.enum([
	'pending', // waiting for the recipient
	'accepted', // recipient agreed; each side applies its own change
	'applied', // both sides applied
	'declined',
	'cancelled',
	'failed', // a side could not apply; the others undo
	'revert_requested', // an undo waits for the other player
	'reverting', // each side undoes its own change
	'reverted'
]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

// none: this side has nothing to do; todo: waiting to apply; applied; undone; failed: could not apply
export const RequestSideStateSchema = z.enum(['none', 'todo', 'applied', 'undone', 'failed']);
export type RequestSideState = z.infer<typeof RequestSideStateSchema>;

export const CharacterRequestSchema = z.object({
	id: z.string(),
	campaign_id: z.string(),
	from_character_id: z.string(),
	to_character_id: z.string(),
	from_user_id: z.string(),
	to_user_id: z.string(),
	from_name: z.string().default(''),
	to_name: z.string().default(''),
	payload: RequestPayloadSchema,
	status: RequestStatusSchema,
	revert_requested_by: RequestSideSchema.nullable().default(null),
	sender_state: RequestSideStateSchema,
	recipient_state: RequestSideStateSchema,
	sender_applied: z.array(RequestDeltaSchema).default([]),
	recipient_applied: z.array(RequestDeltaSchema).default([]),
	created_at: z.string(),
	updated_at: z.string()
});
export type CharacterRequest = z.infer<typeof CharacterRequestSchema>;

export const RequestActionSchema = z.enum([
	'accept',
	'decline',
	'cancel',
	'ack',
	'request_revert',
	'confirm_revert',
	'decline_revert',
	'ack_revert'
]);
export type RequestAction = z.infer<typeof RequestActionSchema>;

/** What a player's sheet reports after applying (or failing to apply) its own change. */
export const RequestAckSchema = z.object({
	side: RequestSideSchema,
	ok: z.boolean(),
	applied: z.array(RequestDeltaSchema).max(4).default([]),
	reason: z.string().trim().max(200).optional()
});
export type RequestAck = z.infer<typeof RequestAckSchema>;
export type RequestAckInput = z.input<typeof RequestAckSchema>;

export const CreateRequestSchema = z.object({
	to_character_id: z.string().min(1),
	payload: RequestPayloadSchema
});
export type CreateRequest = z.infer<typeof CreateRequestSchema>;

/** A character the caller can send to: an active character in the same campaign owned by someone else's sheet. */
export const RequestRecipientSchema = z.object({
	character_id: z.string(),
	name: z.string(),
	player_name: z.string().default('')
});
export type RequestRecipient = z.infer<typeof RequestRecipientSchema>;

export const CharacterRequestListSchema = z.object({
	viewer_user_id: z.string(),
	requests: z.array(CharacterRequestSchema),
	recipients: z.array(RequestRecipientSchema)
});
export type CharacterRequestList = z.infer<typeof CharacterRequestListSchema>;

/** Grants a recipient's sheet holds until they are used, cleared by an event or dismissed. */
export const ReceivedGrantSchema = z.object({
	id: z.string().min(1),
	request_id: z.string().min(1),
	from_name: z.string(),
	grant: RequestGrantSchema
});
export type ReceivedGrant = z.infer<typeof ReceivedGrantSchema>;

/** The amounts a sheet applied for a request, kept so a lost ack never applies twice and undo is exact. */
export const RequestApplicationSchema = z.object({
	side: RequestSideSchema,
	deltas: z.array(RequestDeltaSchema),
	grant_id: z.string().optional(),
	undone: z.boolean().default(false)
});
export type RequestApplication = z.infer<typeof RequestApplicationSchema>;
