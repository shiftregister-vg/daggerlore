import type { DerivedCharacterData } from './derive_character';

/** Commands use the Spellcast trait of the subclass that grants the companion. */
export function getCompanionCommandRoll(
	character: Pick<
		DerivedCharacterData,
		| 'primary_subclass'
		| 'secondary_subclass'
		| 'primary_class'
		| 'secondary_class'
		| 'traits'
		| 'spellcast_roll_bonus'
	>
) {
	for (const [subclass, classData] of [
		[character.primary_subclass, character.primary_class],
		[character.secondary_subclass, character.secondary_class]
	] as const) {
		if (!subclass?.foundation_card.features.some((feature) => feature.title === 'Companion'))
			continue;
		const traitId = subclass.spellcast_trait ?? classData?.spellcast_trait;
		if (traitId) {
			return {
				traitId,
				modifier: (character.traits[traitId] ?? 0) + character.spellcast_roll_bonus
			};
		}
	}
	return undefined;
}
