<script lang="ts">
	import { capitalize } from '$lib/utils';
	import { renderMarkdown } from '$lib/utils';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import BardFeatures from './bard-features.svelte';
	import GuardianFeatures from './guardian-features.svelte';
	import SeraphFeatures from './seraph-features.svelte';
	import WizardFeatures from './wizard-features.svelte';
	import FeatureTokens from './feature-tokens.svelte';

	const characterCtx = getCharacterContext();
	const derived_character_data = $derived(characterCtx.derived_character_data);
	const primary_class = $derived(derived_character_data?.primary_class);
	const secondary_class = $derived(derived_character_data?.secondary_class);
	const primarySpellcastTrait = $derived(
		derived_character_data?.primary_subclass?.spellcast_trait ?? primary_class?.spellcast_trait
	);
	const secondarySpellcastTrait = $derived(
		derived_character_data?.secondary_subclass?.spellcast_trait ?? secondary_class?.spellcast_trait
	);
	const transformation = $derived.by(() => {
		const character = characterCtx.character;
		const activeId = character?.active_transformation_card_id;
		if (!activeId || !derived_character_data) return undefined;
		if (activeId === character.transformation_card_id) {
			return derived_character_data.transformation_card;
		}
		return derived_character_data.additional_transformation_cards[activeId];
	});
	const hasClassFeatures = $derived(
		Boolean(
			derived_character_data?.hasRallyClassFeature ||
				derived_character_data?.hasUnstoppableClassFeature ||
				derived_character_data?.hasPrayerDiceClassFeature ||
				derived_character_data?.hasStrangePatternsClassFeature ||
				primary_class?.class_features.length ||
				secondary_class?.class_features.length ||
				primarySpellcastTrait ||
				secondarySpellcastTrait
		)
	);

	function tokenKey(classId: string, featureIndex: number) {
		return `class_feature_tokens:${classId}:${featureIndex}`;
	}
</script>

{#if derived_character_data}
	<div class="flex flex-col gap-4">
		{#if hasClassFeatures}
			<section class="feature-section">
				<div class="section-heading">
					<p class="text-[10px] font-semibold tracking-wide text-primary uppercase">Class</p>
					<p class="text-sm font-semibold text-foreground">Class Features</p>
				</div>

				{#if derived_character_data.hasRallyClassFeature}
					<BardFeatures />
				{/if}

				{#if derived_character_data.hasUnstoppableClassFeature}
					<GuardianFeatures />
				{/if}

				{#if derived_character_data.hasPrayerDiceClassFeature}
					<SeraphFeatures />
				{/if}

				{#if derived_character_data.hasStrangePatternsClassFeature}
					<WizardFeatures />
				{/if}

				{#each primary_class?.class_features as feature, index}
					<div class="relative text-sm">
						<div class="flex flex-wrap items-center gap-x-3 gap-y-2 pb-2">
							<p class="text-sm font-medium">{feature.title}</p>
							{#if feature.tokens_enabled && characterCtx.character?.primary_class_id}
								<FeatureTokens
									tokenKey={tokenKey(characterCtx.character.primary_class_id, index)}
									max={feature.token_max ?? 0}
								/>
							{/if}
						</div>
						<div class="flex flex-col gap-2 pl-2 text-xs leading-relaxed text-muted-foreground">
							{@html renderMarkdown(feature.description_html)}
						</div>
					</div>
				{/each}

				{#each secondary_class?.class_features as feature, index}
					<div class="relative text-sm">
						<div class="flex flex-wrap items-center gap-x-3 gap-y-2 pb-2">
							<p class="text-sm font-medium">{feature.title}</p>
							{#if feature.tokens_enabled && characterCtx.character?.secondary_class_id}
								<FeatureTokens
									tokenKey={tokenKey(characterCtx.character.secondary_class_id, index)}
									max={feature.token_max ?? 0}
								/>
							{/if}
						</div>
						<div class="flex flex-col gap-2 pl-2 text-xs leading-relaxed text-muted-foreground">
							{@html renderMarkdown(feature.description_html)}
						</div>
					</div>
				{/each}

				{#if primarySpellcastTrait || secondarySpellcastTrait}
					<div class="relative flex items-center gap-1 text-xs">
						<p class="font-medium">Spellcast Trait:</p>
						<p class="text-xs text-muted-foreground">
							{[
								capitalize(primarySpellcastTrait ?? ''),
								capitalize(secondarySpellcastTrait ?? '')
							]
								.filter((str) => !!str?.trim())
								.join(', ')}
						</p>
					</div>
				{/if}
			</section>
		{/if}

		{#if transformation && transformation.features.length > 0}
			<section class="feature-section">
				<div class="section-heading">
					<p class="text-[10px] font-semibold tracking-wide text-primary uppercase">
						Transformation
					</p>
					<p class="text-sm font-semibold text-foreground">{transformation.title}</p>
				</div>
				{#each transformation.features as feature}
					<div class="relative text-sm">
						<p class="pb-2 text-sm font-medium">{feature.name}</p>
						<div
							class="markdown-content flex flex-col gap-2 pl-2 text-xs leading-relaxed text-muted-foreground"
						>
							{@html renderMarkdown(feature.description_html)}
						</div>
					</div>
				{/each}
			</section>
		{/if}
	</div>
{/if}

<style>
	.feature-section {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		border-left: 2px solid hsl(var(--primary) / 0.45);
		border-bottom: 1px solid hsl(var(--primary) / 0.2);
		padding: 0 0 1rem 0.875rem;
	}

	.section-heading {
		display: grid;
		gap: 0.125rem;
	}

	.markdown-content :global(p + p) {
		margin-top: 0.625rem;
	}

	.markdown-content :global(p + ul),
	.markdown-content :global(p + ol),
	.markdown-content :global(ul + p),
	.markdown-content :global(ol + p) {
		margin-top: 0.625rem;
	}
</style>
