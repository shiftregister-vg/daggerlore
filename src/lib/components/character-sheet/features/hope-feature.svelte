<script lang="ts">
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { cn } from '$lib/utils';
	import { renderMarkdown } from '$lib/utils';
	import * as Select from '$lib/components/ui/select';
	import { TRAITS } from '@domain/constants/rules';
	import type { TraitId } from '@domain/schemas/rules';
	import Button from '$lib/components/ui/button/button.svelte';

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);

	let evolution_trait = $derived(character?.feature_choices['evolution_trait']?.[0]);
	let noMercyBonus = $derived(derived_character_data?.no_mercy_bonus ?? 0);

	function useNoMercy() {
		if (!character || !characterCtx.canEdit || character.marked_hope < 3) return;
		character.marked_hope -= 3;
		character.feature_choices.no_mercy_bonus = [String(noMercyBonus + 1)];
	}

	function resetNoMercy() {
		if (!character || !characterCtx.canEdit) return;
		character.feature_choices.no_mercy_bonus = ['0'];
	}
</script>

{#if derived_character_data && derived_character_data.primary_class}
	<div class="flex flex-col items-center gap-2 px-4 text-center">
		<p class="text-xs text-muted-foreground">
			{@html renderMarkdown(
				`**${derived_character_data.primary_class.hope_feature.title}**: ` +
					derived_character_data.primary_class.hope_feature.description_html
			)}
		</p>
		{#if derived_character_data.hasEvolutionHopeFeature && characterCtx.canEdit}
			<Select.Root
				type="single"
				value={evolution_trait}
				onValueChange={(value) => {
					if (!character) return;
					character.feature_choices['evolution_trait'] = [value || ''];
					if (value && character.chosen_beastform) {
						character.chosen_beastform.apply_beastform_bonuses = true;
					}
				}}
			>
				<Select.Trigger
					class={cn(
						'w-min max-w-xs text-xs',
						evolution_trait && 'border border-accent/50 text-accent'
					)}
				>
					<p class="truncate">
						{evolution_trait ? TRAITS[evolution_trait as TraitId]?.name : 'None'}
					</p>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="">None</Select.Item>
					{#each Object.keys(TRAITS) as traitId}
						{@const trait = TRAITS[traitId as TraitId]}
						<Select.Item value={traitId}>{trait.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}
		{#if derived_character_data.hasNoMercyHopeFeature}
			<div class="flex flex-wrap items-center justify-center gap-2">
				<span class="rounded-full border border-primary/40 bg-primary-muted px-3 py-1 text-xs font-semibold">
					Attack bonus +{noMercyBonus}
				</span>
				{#if characterCtx.canEdit}
					<Button size="sm" onclick={useNoMercy} disabled={!character || character.marked_hope < 3}>
						Spend 3 Hope (+1)
					</Button>
					{#if noMercyBonus > 0}
						<Button size="sm" variant="ghost" onclick={resetNoMercy}>Reset</Button>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
{/if}
