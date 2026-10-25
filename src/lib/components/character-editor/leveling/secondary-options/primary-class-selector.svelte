<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/';
	import ClassSummary from './class-summary.svelte';
	import { renderMarkdown, sortEntriesByTitle } from '$lib/utils';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import RecordEditor from '$lib/components/character-sheet/features/record-editor.svelte';
	import { usageKey } from '$lib/state/feature-usage';
	import type { CharacterClass } from '@domain/schemas/compendium';

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);
	const compendium = $derived(characterCtx.character_compendium);
	const primary_class = $derived(derived_character_data?.primary_class);
	const classEntries = $derived(sortEntriesByTitle(Object.entries(compendium?.classes ?? {})));

	let class_dialog_open = $state(false);
	let remove_class_dialog_open = $state(false);
</script>

{#if character}
	{#if !primary_class}
		<Button onclick={() => (class_dialog_open = true)}>Choose a class</Button>
	{:else}
		<div class="flex flex-col gap-2">
			<ClassSummary character_class={primary_class} bannerClasses="-mt-4" />
			<div class="mt-4 flex flex-col gap-2">
				<p class="text font-medium">{primary_class.hope_feature.title}</p>
				<div class="mb-2 flex flex-col gap-2 text-sm text-muted-foreground">
					{@html renderMarkdown(primary_class.hope_feature.description_html)}
				</div>
				{#each primary_class.hope_feature.records ?? [] as record (record.id)}
					<RecordEditor
						{record}
						tracker_key={usageKey('classes', character.primary_class_id ?? '', record.id)}
					/>
				{/each}
			</div>
			{#each primary_class.class_features as feature}
				<div class="flex flex-col gap-2">
					<p class="text font-medium">{feature.title}</p>
					<div class="mb-2 flex flex-col gap-2 text-sm text-muted-foreground">
						{@html renderMarkdown(feature.description_html)}
					</div>
					{#each feature.records ?? [] as record (record.id)}
						<RecordEditor
							{record}
							tracker_key={usageKey('classes', character.primary_class_id ?? '', record.id)}
						/>
					{/each}
				</div>
			{/each}
			<div class="flex justify-center sm:justify-end">
				<Button
					variant="link"
					class="text-destructive"
					onclick={() => (remove_class_dialog_open = true)}>Remove</Button
				>
			</div>
		</div>
	{/if}

	<Dialog.Root bind:open={class_dialog_open}>
		<Dialog.Content class="flex max-h-[90%] min-w-[calc(100%-1rem)] flex-col md:min-w-3xl">
			<Dialog.Header>
				<Dialog.Title>Select a Class</Dialog.Title>
			</Dialog.Header>
			<div class="grid grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
				{#each classEntries as [id, c]}
					<div class="flex gap-3 rounded-md border-2 bg-primary-muted p-3">
						<ClassSummary show_badge character_class={c} bannerClasses="-mt-3">
							<Button
								disabled={primary_class?.title === c.title}
								onclick={() => {
									character.primary_class_id = id;
									character.primary_subclass_id = undefined;
									class_dialog_open = false;
								}}
							>
								{primary_class?.title === c.title ? 'Selected' : 'Select ' + c.title}
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

	<Dialog.Root bind:open={remove_class_dialog_open}>
		<Dialog.Content class="flex max-h-[90%] min-w-[calc(100%-1rem)] flex-col md:min-w-3xl">
			<Dialog.Header>
				<Dialog.Title>Remove your class</Dialog.Title>
			</Dialog.Header>
			<Dialog.Description>
				Removing your class will remove your subclass and domain card selections. This action cannot
				be undone.
			</Dialog.Description>
			<Dialog.Footer>
				<Dialog.Close class={buttonVariants({ variant: 'link' })}>Cancel</Dialog.Close>
				<Dialog.Close
					class={buttonVariants({ variant: 'destructive' })}
					onclick={() => {
						character.primary_class_id = undefined;
					}}>Remove</Dialog.Close
				>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
