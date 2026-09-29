import type { Roll, RollAdjustment } from '@domain/schemas/dice';

const isHope = (type: string) => type === 'hope' || type === 'hope_d20';

/** Sum of the dice, advantage added, disadvantage subtracted, plus the modifier and adjustments. */
export function rollTotal(roll: Roll): number {
	const rolled = roll.dice.filter((die) => die.result !== undefined);
	const standard = rolled
		.filter((die) => die.type !== 'advantage' && die.type !== 'disadvantage')
		.reduce((sum, die) => sum + (die.result ?? 0), 0);
	const advantage = rolled
		.filter((die) => die.type === 'advantage')
		.reduce((sum, die) => sum + (die.result ?? 0), 0);
	const disadvantage = rolled
		.filter((die) => die.type === 'disadvantage')
		.reduce((sum, die) => sum + (die.result ?? 0), 0);
	const adjustments = (roll.adjustments ?? []).reduce((sum, entry) => sum + entry.amount, 0);
	return standard + advantage - disadvantage + roll.modifier + adjustments;
}

export type RollOutcome = 'critical' | 'hope' | 'fear' | '';

/** Which side the Duality Dice favour. A swap switches Hope and Fear; a critical stays one. */
export function rollOutcome(roll: Roll): RollOutcome {
	const fear = roll.dice.filter((die) => die.type === 'fear' && die.result !== undefined);
	const hope = roll.dice.filter((die) => isHope(die.type) && die.result !== undefined);
	const fearValues = fear.map((die) => die.result ?? 0);
	const hopeValues = hope.map((die) => die.result ?? 0);
	if (
		fear.length > 0 &&
		hope.length > 0 &&
		fearValues.some((value) => hopeValues.includes(value))
	) {
		return 'critical';
	}
	const totalFear = fearValues.reduce((sum, value) => sum + value, 0);
	const totalHope = hopeValues.reduce((sum, value) => sum + value, 0);
	let outcome: RollOutcome = '';
	if (fear.length > 0 && totalFear > totalHope) outcome = 'fear';
	else if (hope.length > 0 && totalHope > totalFear) outcome = 'hope';
	if (roll.swapped && outcome !== '') return outcome === 'hope' ? 'fear' : 'hope';
	return outcome;
}

const OUTCOME_TEXT: Record<RollOutcome, string> = {
	critical: 'Critical Success',
	hope: 'with Hope',
	fear: 'with Fear',
	'': ''
};

export function rollDescription(roll: Roll): string {
	return OUTCOME_TEXT[rollOutcome(roll)];
}

const DIE_NAMES: Record<string, string> = {
	hope: 'Hope',
	hope_d20: 'Hope d20',
	fear: 'Fear',
	advantage: 'Advantage',
	disadvantage: 'Disadvantage'
};

/** One readable line per contribution, ending with the total, e.g. "Hope 7", "+2 modifier". */
export function rollArithmetic(roll: Roll): string[] {
	const lines: string[] = [];
	for (const die of roll.dice) {
		if (die.result === undefined) continue;
		const name = DIE_NAMES[die.type] ?? die.type;
		lines.push(die.type === 'disadvantage' ? `−${die.result} ${name}` : `${name} ${die.result}`);
	}
	if (roll.modifier !== 0) lines.push(`${signed(roll.modifier)} modifier`);
	for (const adjustment of roll.adjustments ?? []) {
		lines.push(`${signed(adjustment.amount)} ${adjustment.label}`);
	}
	if (roll.swapped) lines.push('Hope and Fear results swapped');
	lines.push(`Total ${rollTotal(roll)}`);
	return lines;
}

function signed(value: number): string {
	return value >= 0 ? `+${value}` : `−${Math.abs(value)}`;
}

export function withAdjustment(roll: Roll, adjustment: RollAdjustment, applied?: string): Roll {
	return {
		...roll,
		adjustments: [...(roll.adjustments ?? []), adjustment],
		applied: applied ? [...(roll.applied ?? []), applied] : roll.applied
	};
}
