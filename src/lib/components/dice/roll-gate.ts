import type { RollInput } from '@domain/schemas/dice';
import type { getCharacterContext } from '$lib/state/character.svelte';
import type { getDiceContext } from '$lib/state/dice.svelte';
import { preRoll } from '$lib/state/pre-roll.svelte';
import { hasUsablePreRollOption } from './roll-actions';

type DiceContext = ReturnType<typeof getDiceContext>;
type CharacterContext = ReturnType<typeof getCharacterContext> | undefined;

/**
 * Starts a roll. When a feature offers a choice before this kind of roll and the player can use one,
 * the pre-roll dialog opens instead; it rolls once the player confirms. Everything else rolls at once.
 */
export function startRoll(
	diceCtx: DiceContext,
	characterCtx: CharacterContext,
	input: RollInput
): void {
	const character = characterCtx?.character;
	const derived = characterCtx?.derived_character_data;
	if (
		input.context &&
		character &&
		derived &&
		characterCtx?.canEdit &&
		hasUsablePreRollOption(
			derived.roll_option_trackers,
			character,
			derived.max_stress,
			input.context.kind
		)
	) {
		preRoll.request(input);
		return;
	}
	diceCtx.roll(input);
}
