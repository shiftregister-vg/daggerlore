import { z } from 'zod';

export const DiceTypeSchema = z.enum([
	'd4',
	'd6',
	'd8',
	'd10',
	'd12',
	'd20',
	'hope',
	'hope_d20',
	'fear',
	'advantage',
	'disadvantage'
]);
export type DiceType = z.infer<typeof DiceTypeSchema>;

export const RollKindSchema = z.enum([
	'trait',
	'attack',
	'damage',
	'spellcast',
	'experience',
	'other'
]);
export type RollKind = z.infer<typeof RollKindSchema>;

// What a roll is for, so features can offer choices that only apply to that kind of roll.
export const RollContextSchema = z.object({
	kind: RollKindSchema,
	trait: z.string().optional(),
	damage_type: z.enum(['phy', 'mag']).optional(),
	source_key: z.string().optional()
});
export type RollContext = z.infer<typeof RollContextSchema>;

// A flat piece a feature added to a finished roll, e.g. a spent Prayer Die.
export const RollAdjustmentSchema = z.object({
	id: z.string(),
	label: z.string(),
	amount: z.number().int()
});
export type RollAdjustment = z.infer<typeof RollAdjustmentSchema>;

export const RollSchema = z.object({
	id: z.string(),
	name: z.string(),
	isReroll: z.boolean().optional(),
	rerollingDieIndices: z.array(z.number().int()).optional(),
	dice: z.array(
		z.object({
			type: DiceTypeSchema,
			result: z.number().optional(),
			disabled: z.boolean().optional()
		})
	),
	modifier: z.number().int(),
	status: z.enum(['rolling', 'complete']),
	timestamp: z.number(),
	rollerName: z.string().optional(),
	context: RollContextSchema.optional(),
	adjustments: z.array(RollAdjustmentSchema).optional(),
	// The Hope and Fear results were switched after the roll.
	swapped: z.boolean().optional(),
	// Labels of the feature options that changed this roll.
	applied: z.array(z.string()).optional()
});
export type Roll = z.infer<typeof RollSchema>;

export const DiceHistorySchema = z.object({
	rolls: z.array(RollSchema)
});
export type DiceHistory = z.infer<typeof DiceHistorySchema>;

export const RollInputSchema = z.object({
	name: z.string().optional(),
	dice: RollSchema.shape.dice,
	modifier: z.number().optional(),
	context: RollContextSchema.optional(),
	// Adjustments and labels chosen before the roll (see Roll).
	adjustments: RollSchema.shape.adjustments,
	applied: RollSchema.shape.applied
});
export type RollInput = z.infer<typeof RollInputSchema>;
