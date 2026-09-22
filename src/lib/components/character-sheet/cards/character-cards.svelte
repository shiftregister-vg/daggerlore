<script lang="ts">
	import { cn } from '$lib/utils';
	import CardCarousel from '$lib/components/utility/card-carousel.svelte';
	import type { Card } from '@domain/schemas/rules';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Pencil from '@lucide/svelte/icons/pencil';
	import { Button } from '$lib/components/ui/button';
	import { getCharacterContext } from '$lib/state/character.svelte';

	let { openHeritageCardCatalog = () => {} }: { openHeritageCardCatalog: () => void } = $props();

	let character_cards_expanded = $state(true);

	const characterContext = getCharacterContext();
	const character = $derived(characterContext.character);
	const derived_character = $derived(characterContext.derived_character_data);

	let character_cards = $derived.by((): Card[] => {
		if (!derived_character) return [];

		let cards: Card[] = [];
		if (derived_character && character) {
			// Ancestry Card
			if (derived_character.ancestry_card && character.ancestry_card_id)
				cards.push({
					type: 'ancestry_card',
					card: derived_character.ancestry_card,
					id: character.ancestry_card_id
				});

			// Additional ancestry cards
			cards.push(
				...Object.entries(derived_character.additional_ancestry_cards).map(([id, card]) => ({
					type: 'ancestry_card' as const,
					card,
					id
				}))
			);

			// community card
			if (derived_character.community_card && character.community_card_id)
				cards.push({
					type: 'community_card',
					card: derived_character.community_card,
					id: character.community_card_id
				});

			// Additional Community Cards
			cards.push(
				...Object.entries(derived_character.additional_community_cards).map(([id, card]) => ({
					type: 'community_card' as const,
					card,
					id
				}))
			);

			// Primary subclass cards
			if (
				derived_character.primary_class_mastery_level >= 1 &&
				derived_character.primary_subclass &&
				character.primary_subclass_id
			)
				cards.push({
					type: 'subclass_card',
					card: {
						type: 'foundation',
						...derived_character.primary_subclass,
						...derived_character.primary_subclass.foundation_card
					},
					id: character.primary_subclass_id
				});
			if (
				derived_character.primary_class_mastery_level >= 2 &&
				derived_character.primary_subclass &&
				character.primary_subclass_id
			)
				cards.push({
					type: 'subclass_card',
					card: {
						type: 'specialization',
						...derived_character.primary_subclass,
						...derived_character.primary_subclass.specialization_card
					},
					id: character.primary_subclass_id
				});
			if (
				derived_character.primary_class_mastery_level >= 3 &&
				derived_character.primary_subclass &&
				character.primary_subclass_id
			)
				cards.push({
					type: 'subclass_card',
					card: {
						type: 'mastery',
						...derived_character.primary_subclass,
						...derived_character.primary_subclass.mastery_card
					},
					id: character.primary_subclass_id
				});

			// secondary subclass cards
			if (
				derived_character.secondary_class_mastery_level >= 1 &&
				derived_character.secondary_subclass &&
				character.secondary_subclass_id
			)
				cards.push({
					type: 'subclass_card',
					card: {
						type: 'foundation',
						...derived_character.secondary_subclass,
						...derived_character.secondary_subclass.foundation_card
					},
					id: character.secondary_subclass_id
				});
			if (
				derived_character.secondary_class_mastery_level >= 2 &&
				derived_character.secondary_subclass &&
				character.secondary_subclass_id
			)
				cards.push({
					type: 'subclass_card',
					card: {
						type: 'specialization',
						...derived_character.secondary_subclass,
						...derived_character.secondary_subclass.specialization_card
					},
					id: character.secondary_subclass_id
				});
			if (
				derived_character.secondary_class_mastery_level >= 3 &&
				derived_character.secondary_subclass &&
				character.secondary_subclass_id
			)
				cards.push({
					type: 'subclass_card',
					card: {
						type: 'mastery',
						...derived_character.secondary_subclass,
						...derived_character.secondary_subclass.mastery_card
					},
					id: character.secondary_subclass_id
				});

		}

		return cards;
	});
</script>

<div class={cn(!character_cards_expanded && '-mb-4')}>
	<div class="mx-auto mb-4 flex w-min items-center justify-center gap-2">
		<button
			disabled={true}
			onclick={() => (character_cards_expanded = !character_cards_expanded)}
			class="z-20 flex items-center font-medium text-nowrap"
		>
			<!-- {#if character_cards_expanded}
				<ChevronDown class="w-k h-4" />
			{:else}
				<ChevronRight class="w-k h-4" />
			{/if} -->
			Character Cards
			<div
				class="ml-2 grid h-4.5 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-background"
			>
				{character_cards.length}
			</div>
		</button>
		{#if characterContext.canEdit}
			<Button variant="ghost" size="sm" class="h-auto" onclick={openHeritageCardCatalog}
				><Pencil /></Button
			>
		{/if}
	</div>
	{#if character_cards_expanded && character}
		<CardCarousel
			cards={character_cards}
			compendium={characterContext.character_compendium}
			disabled={!characterContext.canEdit}
			bind:tokens={character.card_tokens}
			bind:field_values={character.card_fields}
			bind:choices={character.card_choices}
			bind:mixed_ancestry_choices={character.mixed_ancestry_choices}
			enable_choices
			enable_tokens
			enable_fields
			enable_mixed_ancestry
			experiences={character.experiences}
			storageKey={characterContext.id
				? `character:${characterContext.id}:character-cards`
				: undefined}
			emptyMessage="None"
		/>
	{/if}
</div>
