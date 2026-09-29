import { TRAITS } from '@domain/constants/rules';
import type { TraitId } from '@domain/schemas/rules';
import type { RecordValueResolver } from '$lib/state/feature-records';

/** Resolves Experience, trait and domain card references to names for display. */
export function recordValueResolver(
	experiences: string[],
	domainCards: { id: string; title: string }[]
): RecordValueResolver {
	return (field, value) => {
		if (field.type === 'experience') return experiences[Number(value)] ?? '';
		if (field.type === 'trait') return TRAITS[value as TraitId]?.name ?? value;
		if (field.type === 'domain_card') {
			return domainCards.find((card) => card.id === value)?.title ?? value;
		}
		return value;
	};
}
