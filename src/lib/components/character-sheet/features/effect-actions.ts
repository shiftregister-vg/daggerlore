import type { Character } from '@domain/schemas/characters';
import { toast } from 'svelte-sonner';
import {
	activateEffect,
	effectLabel,
	endEffectInstance,
	type EffectTracker
} from '$lib/state/feature-effects';

type Snapshot = Pick<
	Character,
	'marked_hope' | 'marked_stress' | 'feature_uses' | 'active_effects'
>;

function snapshot(character: Character): Snapshot {
	return {
		marked_hope: character.marked_hope,
		marked_stress: character.marked_stress,
		feature_uses: character.feature_uses ?? {},
		active_effects: character.active_effects ?? {}
	};
}

// The sheet replaces its character object as it re-derives, so undo reads the current one.
type CharacterGetter = () => Character | undefined;

function restore(getCharacter: CharacterGetter, previous: Snapshot) {
	const character = getCharacter();
	if (!character) return;
	character.marked_hope = previous.marked_hope;
	character.marked_stress = previous.marked_stress;
	character.feature_uses = previous.feature_uses;
	character.active_effects = previous.active_effects;
}

function undoToast(message: string, getCharacter: CharacterGetter, previous: Snapshot) {
	toast.success(message, {
		action: { label: 'Undo', onClick: () => restore(getCharacter, previous) }
	});
}

/** Pays the cost and starts the effect in one transaction, with one undo. */
export function activateWithUndo(
	getCharacter: CharacterGetter,
	maxStress: number,
	tracker: EffectTracker,
	options: { target?: string; succeeded?: boolean } = {}
): boolean {
	const character = getCharacter();
	if (!character) return false;
	const previous = snapshot(character);
	const result = activateEffect(
		{
			hope: character.marked_hope,
			stress: character.marked_stress,
			max_stress: maxStress,
			feature_uses: previous.feature_uses,
			active_effects: previous.active_effects
		},
		tracker,
		{ ...options, id: crypto.randomUUID(), now: new Date().toISOString() }
	);
	if (!result) return false;
	character.marked_hope = result.hope;
	character.marked_stress = result.stress;
	character.feature_uses = result.feature_uses;
	character.active_effects = result.active_effects;
	const label = effectLabel(tracker);
	const target = options.target?.trim();
	undoToast(
		result.started
			? `${label} is active${target ? ` against ${target}` : ''}.`
			: `${label} didn't start; the cost was paid.`,
		getCharacter,
		previous
	);
	return true;
}

export function endWithUndo(
	getCharacter: CharacterGetter,
	tracker: EffectTracker,
	instanceId: string,
	reason?: string
) {
	const character = getCharacter();
	if (!character) return;
	const previous = snapshot(character);
	character.active_effects = endEffectInstance(previous.active_effects, tracker, instanceId);
	undoToast(
		`Ended ${effectLabel(tracker)}${reason ? ` (${reason})` : ''}.`,
		getCharacter,
		previous
	);
}
