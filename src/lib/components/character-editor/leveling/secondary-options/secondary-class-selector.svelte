<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/';
	import * as Collapsible from '$lib/components/ui/collapsible/';
	import { cn, compareAlpha, renderMarkdown, sortEntriesByTitle } from '$lib/utils';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ClassSummary from './class-summary.svelte';
	import SubclassCard from '$lib/components/compendium-items/cards/subclass-card.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import RecordEditor from '$lib/components/character-sheet/features/record-editor.svelte';
	import { usageKey } from '$lib/state/feature-usage';
	import type { CharacterClass } from '@domain/schemas/compendium';
	import SubclassSheetAddons from './subclass-sheet-addons.svelte';

	let { after_remove_secondary_class = () => {} } = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);
	const compendium = $derived(characterCtx.character_compendium);
	const primary_class = $derived(derived_character_data?.primary_class);
	const secondary_class = $derived(derived_character_data?.secondary_class);
	const secondary_subclass = $derived(derived_character_data?.secondary_subclass);
	const primary_class_mastery_level = $derived(
		derived_character_data?.primary_class_mastery_level ?? 0
	);
	const secondary_class_mastery_level = $derived(
		derived_character_data?.secondary_class_mastery_level ?? 0
	);
	const classEntries = $derived(
		sortEntriesByTitle(Object.entries(compendium?.classes ?? {}) as [string, CharacterClass][])
	);

	const secondarySubclassOptions = $derived.by(() => {
		if (!secondary_class || !compendium) return [];
		return (secondary_class.subclass_ids ?? [])
			.map((id) => ({ id, subclass: compendium.subclasses[id] }))
			.filter(
				(entry): entry is { id: typeof entry.id; subclass: NonNullable<typeof entry.subclass> } =>
					Boolean(entry.subclass)
			)
			.sort((left, right) => compareAlpha(left.subclass.title, right.subclass.title));
	});

	let secondary_class_dialog_open = $state(false);
	let remove_secondary_class_dialog_open = $state(false);
	let secondary_subclass_dialog_open = $state(false);
	let secondary_subclass_cards_open = $state(false);
</script>

{#if character && compendium}
	<div class="flex flex-col gap-2 rounded-md bg-primary/50 p-2">
		<p class="px-2 py-1 text-xs text-muted-foreground italic">
			Choose an additional class, select one of its domains, gain its class features, and take the
			foundation card from one of its subclasses.
		</p>

		<div class="rounded-lg border bg-primary-muted p-2">
			{#if !secondary_class}
				<Button onclick={() => (secondary_class_dialog_open = true)}>
					Choose an additional class
				</Button>
			{:else}
				<div class="flex flex-col gap-2">
					<ClassSummary
						character_class={secondary_class}
						multiclass
						bind:domain_id_selection={character.secondary_class_domain_id}
						class="mb-2"
					/>

					{#each secondary_class.class_features as feature}
						<div class="flex flex-col gap-2">
							<p class="text-sm font-medium">{feature.title}</p>
							<div class="mb-2 flex flex-col gap-2 text-xs text-muted-foreground">
								{@html renderMarkdown(feature.description_html)}
							</div>
							{#each feature.records ?? [] as record (record.id)}
								<RecordEditor
									{record}
									tracker_key={usageKey('classes', character.secondary_class_id ?? '', record.id)}
								/>
							{/each}
						</div>
					{/each}
					<div class="flex justify-center sm:justify-end">
						<Button
							variant="link"
							class="text-destructive"
							onclick={() => (remove_secondary_class_dialog_open = true)}
						>
							Remove
						</Button>
					</div>
				</div>
			{/if}
		</div>

		<div class="rounded-lg border bg-primary-muted p-2">
			{#if !secondary_subclass}
				<Button
					disabled={!character.secondary_class_id}
					onclick={() => (secondary_subclass_dialog_open = true)}>Choose a subclass</Button
				>
			{:else}
				<div class="flex flex-col gap-4">
					<p class="text-lg font-medium">{secondary_subclass.title}</p>
					<p class="-mt-2 text-xs text-muted-foreground italic">
						{@html renderMarkdown(secondary_subclass.description_html)}
					</p>

					<SubclassCard
						{compendium}
						card={{
							type: 'foundation',
							...secondary_subclass,
							...secondary_subclass.foundation_card
						}}
					/>

					<SubclassSheetAddons {character} {compendium} subclass={secondary_subclass} />

					{#if secondary_class_mastery_level < 3 && primary_class_mastery_level <= 1}
						<Collapsible.Root bind:open={secondary_subclass_cards_open}>
							<Collapsible.Trigger
								class="flex items-center text-left text-sm text-muted-foreground"
							>
								<ChevronRight
									class={cn(
										'w-k h-4 transition-transform',
										secondary_subclass_cards_open && 'rotate-90'
									)}
								/>
								Specialization and Mastery Cards
							</Collapsible.Trigger>
							<Collapsible.Content class="flex flex-col gap-3 py-4 opacity-70">
								<SubclassCard
									{compendium}
									card={{
										type: 'specialization',
										...secondary_subclass,
										...secondary_subclass.specialization_card
									}}
								/>
								<SubclassCard
									{compendium}
									card={{
										type: 'mastery',
										...secondary_subclass,
										...secondary_subclass.mastery_card
									}}
								/>
							</Collapsible.Content>
						</Collapsible.Root>
					{/if}

					<div class="flex justify-center sm:justify-end">
						<Button
							variant="link"
							class="text-destructive"
							onclick={() => (character.secondary_subclass_id = undefined)}>Remove</Button
						>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<Dialog.Root bind:open={secondary_class_dialog_open}>
		<Dialog.Content class="flex max-h-[90%] min-w-[calc(100%-1rem)] flex-col md:min-w-3xl">
			<Dialog.Header>
				<Dialog.Title>Select an Additional Class</Dialog.Title>
			</Dialog.Header>
			<div class="grid grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
				{#each classEntries.filter(([, c]) => c.title !== primary_class?.title) as [id, c]}
					<div class="flex gap-3 rounded-md border-2 bg-primary-muted p-3">
						<ClassSummary hide_starting_stats character_class={c} bannerClasses="-mt-3">
							<Button
								disabled={secondary_class?.title === c.title}
								onclick={() => {
									character.secondary_class_id = id as typeof character.secondary_class_id;
									character.secondary_subclass_id = undefined;
									character.secondary_class_domain_id = undefined;
									secondary_class_dialog_open = false;
								}}
							>
								{secondary_class?.title === c.title ? 'Selected' : 'Select ' + c.title}
							</Button>
						</ClassSummary>
					</div>
				{/each}
			</div>
			<Dialog.Footer>
				<Dialog.Close class={buttonVariants({ variant: 'link' })}>Cancel</Dialog.Close>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={remove_secondary_class_dialog_open}>
		<Dialog.Content class="flex max-h-[90%] min-w-[calc(100%-1rem)] flex-col md:min-w-3xl">
			<Dialog.Header>
				<Dialog.Title>Remove your Multiclass Selection</Dialog.Title>
			</Dialog.Header>
			<Dialog.Description>
				Removing your multiclass selection will remove your related subclass and domain card
				selections. This action cannot be undone.
			</Dialog.Description>
			<Dialog.Footer>
				<Dialog.Close class={buttonVariants({ variant: 'link' })}>Cancel</Dialog.Close>
				<Dialog.Close
					class={buttonVariants({ variant: 'destructive' })}
					onclick={() => {
						character.secondary_class_id = undefined;
						character.secondary_subclass_id = undefined;
						character.secondary_class_domain_id = undefined;
						if (after_remove_secondary_class) {
							after_remove_secondary_class();
						}
					}}>Remove</Dialog.Close
				>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={secondary_subclass_dialog_open}>
		<Dialog.Content class="flex max-h-[90%] min-w-[calc(100%-1rem)] flex-col md:min-w-3xl">
			<Dialog.Header>
				<Dialog.Title>Select a Subclass</Dialog.Title>
			</Dialog.Header>
			<div class="grid grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
				{#each secondarySubclassOptions as { id, subclass }}
					<div class="flex flex-col gap-3 rounded-md border-2 bg-primary-muted p-3">
						<p class="text-lg font-medium">{subclass.title}</p>
						<p class="-mt-2 text-xs text-muted-foreground italic">
							{@html renderMarkdown(subclass.description_html)}
						</p>
						{#if subclass.spellcast_trait}
							<p class="text-xs text-muted-foreground italic">
								<b class="text-foreground"><em>Spellcast Trait:</em></b>
								{subclass.spellcast_trait}
							</p>
						{/if}
						<Button
							class="mt-2"
							disabled={secondary_subclass?.title === subclass.title}
							onclick={() => {
								character.secondary_subclass_id = id as typeof character.secondary_subclass_id;
								secondary_subclass_dialog_open = false;
							}}
						>
							{secondary_subclass?.title === subclass.title
								? 'Selected'
								: 'Select ' + subclass.title}
						</Button>
					</div>
				{/each}
			</div>
			<Dialog.Footer>
				<Dialog.Close class={buttonVariants({ variant: 'link' })}>Cancel</Dialog.Close>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
