import type { Character } from './schemas/characters';

// A character sheet tidies its character against the compendium it has loaded, and saves the result. If that
// compendium is incomplete (still loading, a failed fetch), the tidy-up removes what it doesn't recognise:
// the class, ancestry, cards and gear. These checks recognise that shape of loss so it is never saved.
// The client and the server both run them; neither may be the only line of defence.

export const UNSAFE_CHANGE = 'Unsafe change';

type Identity = Pick<
	Character,
	| 'primary_class_id'
	| 'primary_subclass_id'
	| 'secondary_class_id'
	| 'secondary_subclass_id'
	| 'ancestry_card_id'
	| 'community_card_id'
>;

const IDENTITY_LABELS: Record<keyof Identity, string> = {
	primary_class_id: 'class',
	primary_subclass_id: 'subclass',
	secondary_class_id: 'second class',
	secondary_subclass_id: 'second subclass',
	ancestry_card_id: 'ancestry',
	community_card_id: 'community'
};

function gearCount(character: Pick<Character, 'inventory'>): number {
	const inventory = character.inventory;
	if (!inventory) return 0;
	return (
		(inventory.armor?.length ?? 0) +
		(inventory.primary_weapons?.length ?? 0) +
		(inventory.secondary_weapons?.length ?? 0) +
		(inventory.loot?.length ?? 0) +
		(inventory.consumables?.length ?? 0)
	);
}

function cardCount(
	character: Pick<Character, 'level_up_domain_card_ids' | 'additional_domain_card_ids'>
): number {
	const fromLevels = Object.values(character.level_up_domain_card_ids ?? {}).reduce(
		(sum, choices) => sum + Object.keys(choices ?? {}).length,
		0
	);
	return fromLevels + (character.additional_domain_card_ids?.length ?? 0);
}

function identityLost(before: Partial<Character>, after: Partial<Character>): string[] {
	return (Object.keys(IDENTITY_LABELS) as (keyof Identity)[])
		.filter((field) => before[field] && !after[field])
		.map((field) => IDENTITY_LABELS[field]);
}

/**
 * What tidying a character removed that a sheet never removes on purpose: its class, subclass, ancestry
 * or community. Edits are already applied to the character before it is tidied, so any identity the tidy-up
 * drops means the compendium it used was incomplete. Returns undefined when nothing was dropped.
 */
export function detectNormalizationLoss(
	input: Partial<Character>,
	tidied: Partial<Character>
): string | undefined {
	const lost = identityLost(input, tidied);
	return lost.length > 0 ? `Its ${lost.join(', ')} would be removed.` : undefined;
}

/**
 * Whether a save looks like a wipe: the character loses three or more of its class, subclass, ancestry and
 * community at once, or loses one of them together with all of its gear or all of its domain cards.
 * Editing does none of that in a single save (removing a class or ancestry is one field at a time, and
 * choosing a new class keeps a class), so this is refused without getting in the way of real edits.
 */
export function detectDestructiveLoss(
	before: Partial<Character>,
	after: Partial<Character>
): string | undefined {
	const lost = identityLost(before, after);
	if (lost.length === 0) return undefined;

	const gearGone =
		!!before.inventory &&
		gearCount(before as Character) >= 2 &&
		gearCount(after as Character) === 0;
	const cardsGone =
		cardCount(before as Character) >= 2 &&
		!!after.level_up_domain_card_ids &&
		cardCount(after as Character) === 0;
	if (lost.length < 3 && !gearGone && !cardsGone) return undefined;

	const also = [
		gearGone ? 'all of its gear' : '',
		cardsGone ? 'all of its domain cards' : ''
	].filter(Boolean);
	return `This would remove the character's ${[...lost, ...also].join(', ')}.`;
}
