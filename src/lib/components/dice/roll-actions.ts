import type { Character } from '@domain/schemas/characters';
import { toast } from 'svelte-sonner';
import {
	applyOption,
	optionBlocker,
	optionsFor,
	type OptionApplication,
	type OptionChoice,
	type RollOptionResources,
	type RollOptionTracker
} from '$lib/state/roll-options';
import type { RollKind } from '@domain/schemas/dice';

type Snapshot = Pick<
	Character,
	| 'marked_hope'
	| 'marked_stress'
	| 'marked_hp'
	| 'marked_armor'
	| 'feature_uses'
	| 'feature_pool_tokens'
	| 'feature_pool_dice'
	| 'active_effects'
>;

export type CharacterGetter = () => Character | undefined;

export function snapshot(character: Character): Snapshot {
	return {
		marked_hope: character.marked_hope,
		marked_stress: character.marked_stress,
		marked_hp: character.marked_hp,
		marked_armor: character.marked_armor,
		feature_uses: character.feature_uses ?? {},
		feature_pool_tokens: character.feature_pool_tokens ?? {},
		feature_pool_dice: character.feature_pool_dice ?? {},
		active_effects: character.active_effects ?? {}
	};
}

export function restore(character: Character, previous: Snapshot) {
	character.marked_hope = previous.marked_hope;
	character.marked_stress = previous.marked_stress;
	character.marked_hp = previous.marked_hp;
	character.marked_armor = previous.marked_armor;
	character.feature_uses = previous.feature_uses;
	character.feature_pool_tokens = previous.feature_pool_tokens;
	character.feature_pool_dice = previous.feature_pool_dice;
	character.active_effects = previous.active_effects;
}

export function resourcesOf(character: Character, maxStress: number): RollOptionResources {
	return {
		hope: character.marked_hope,
		stress: character.marked_stress,
		max_stress: maxStress,
		feature_uses: character.feature_uses ?? {},
		pool_tokens: character.feature_pool_tokens ?? {},
		pool_dice: character.feature_pool_dice ?? {},
		active_effects: character.active_effects ?? {}
	};
}

export function commit(character: Character, resources: RollOptionResources) {
	character.marked_hope = resources.hope;
	character.marked_stress = resources.stress;
	character.feature_uses = resources.feature_uses;
	character.feature_pool_tokens = resources.pool_tokens;
	character.feature_pool_dice = resources.pool_dice;
	character.active_effects = resources.active_effects;
}

/** One undo for everything a roll flow changed. The undo writes to the live character. */
export function undoToast(
	message: string,
	getCharacter: CharacterGetter,
	previous: Snapshot,
	description?: string,
	onUndo?: () => void
) {
	toast.success(message, {
		description,
		action: {
			label: 'Undo',
			onClick: () => {
				const character = getCharacter();
				if (character) restore(character, previous);
				onUndo?.();
			}
		}
	});
}

/** Pays for several options at once (the pre-roll dialog). Returns the applications, or undefined. */
export function spendOptions(
	character: Character,
	maxStress: number,
	picks: { tracker: RollOptionTracker; choice: OptionChoice }[]
): OptionApplication[] | undefined {
	let resources = resourcesOf(character, maxStress);
	const applications: OptionApplication[] = [];
	for (const pick of picks) {
		const application = applyOption(resources, pick.tracker, pick.choice);
		if (!application) return undefined;
		applications.push(application);
		resources = application.resources;
	}
	commit(character, resources);
	return applications;
}

/** True when at least one option for this roll can be used now, so a dialog is worth showing. */
export function hasUsablePreRollOption(
	trackers: RollOptionTracker[],
	character: Character,
	maxStress: number,
	kind: RollKind
): boolean {
	const resources = resourcesOf(character, maxStress);
	return optionsFor(trackers, { kind, timing: 'before' }).some(
		(tracker) => optionBlocker(resources, tracker) === undefined
	);
}
