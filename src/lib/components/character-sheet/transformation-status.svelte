<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { cn, renderMarkdown } from '$lib/utils';

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derivedCharacter = $derived(characterCtx.derived_character_data);

	const transformations = $derived.by(() => {
		if (!character || !derivedCharacter) return [];

		const entries = Object.entries(derivedCharacter.additional_transformation_cards);
		if (character.transformation_card_id && derivedCharacter.transformation_card) {
			entries.unshift([character.transformation_card_id, derivedCharacter.transformation_card]);
		}

		return entries.filter(
			([id], index, all) => all.findIndex(([candidateId]) => candidateId === id) === index
		);
	});

	const activeTransformation = $derived(
		transformations.find(([id]) => id === character?.active_transformation_card_id)
	);

	function toggleTransformation(id: string) {
		if (!character || !characterCtx.canEdit) return;
		character.active_transformation_card_id =
			character.active_transformation_card_id === id ? undefined : id;
	}
</script>

{#if character && transformations.length > 0}
	<section
		aria-label="Transformation status"
		class={cn(
			'mx-auto w-full max-w-6xl rounded-lg border px-4 py-3 shadow-sm sm:px-5',
			activeTransformation
				? 'border-primary/50 bg-primary-muted/30'
				: 'border-border bg-background/70'
		)}
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="min-w-0">
				<div class="flex items-center gap-2">
					<p class="text-[10px] font-semibold tracking-wide text-primary uppercase">
						Transformation
					</p>
					<span
						class={cn(
							'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
							activeTransformation
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground'
						)}
					>
						{activeTransformation ? 'Active' : 'Inactive'}
					</span>
				</div>
				<p class="truncate text-base font-semibold">
					{activeTransformation?.[1].title ?? 'Not currently transformed'}
				</p>
			</div>

			{#if characterCtx.canEdit}
				<div class="flex flex-wrap gap-2">
					{#each transformations as [id, transformation] (id)}
						<Button
							size="sm"
							variant={character.active_transformation_card_id === id ? 'default' : 'outline'}
							aria-pressed={character.active_transformation_card_id === id}
							onclick={() => toggleTransformation(id)}
						>
							{character.active_transformation_card_id === id
								? `End ${transformation.title}`
								: `Become ${transformation.title}`}
						</Button>
					{/each}
				</div>
			{/if}
		</div>

		{#if activeTransformation}
			<div class="mt-4 grid gap-3 border-t border-primary/20 pt-3 sm:grid-cols-2">
				{#each activeTransformation[1].features as feature}
					<div class="rounded-md bg-background/70 p-3">
						<p class="text-sm font-semibold">{feature.name}</p>
						<div class="markdown-content mt-1 text-xs leading-relaxed text-muted-foreground">
							{@html renderMarkdown(feature.description_html)}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	.markdown-content :global(p + p),
	.markdown-content :global(p + ul),
	.markdown-content :global(p + ol) {
		margin-top: 0.5rem;
	}
</style>
