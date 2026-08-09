<script lang="ts">
	import type { Encounter } from '@domain/schemas/encounters';
	import Button from '$lib/components/ui/button/button.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { getEncounterContext } from '$lib/state/encounters.svelte';
	import { getLocalstorageContext } from '$lib/state/localstorage.svelte';
	import { cn } from '$lib/utils';
	import { renderMarkdown } from '$lib/utils';
	import Check from '@lucide/svelte/icons/check';
	import SquarePen from '@lucide/svelte/icons/square-pen';

	let {
		class: className = '',
		encounter,
		title = 'Notes'
	}: {
		class?: string;
		encounter: Encounter;
		title?: string;
	} = $props();

	const encounterCtx = getEncounterContext();
	const localstorageCtx = getLocalstorageContext();

	const fallbackShowPreview = false;

	let showPreview = $state(
		encounterCtx.id
			? (localstorageCtx.app_preferences.encounter_notes_preferences[encounterCtx.id]
					?.showPreview ?? fallbackShowPreview)
			: fallbackShowPreview
	);

	$effect(() => {
		if (!encounterCtx.id) return;

		localstorageCtx.app_preferences.encounter_notes_preferences[encounterCtx.id] = {
			showPreview
		};
	});
</script>

<div class={cn('rounded-2xl border-y bg-background/70 p-4 pt-3 shadow-xl', className)}>
	<div class="mb-2 flex items-center justify-between">
		<h2 class="text-lg font-semibold">{title}</h2>
		{#if encounterCtx.isOwner}
			<Button variant="ghost" size="sm" class="px-2" onclick={() => (showPreview = !showPreview)}>
				{#if showPreview}
					<SquarePen class="size-4" />
				{:else}
					<Check class="size-4" />
				{/if}
			</Button>
		{/if}
	</div>

	{#if showPreview || !encounterCtx.isOwner}
		<div class="text-sm text-muted-foreground">
			{@html renderMarkdown(encounter.description_html || 'No notes')}
		</div>
	{:else}
		<Textarea
			bind:value={encounter.description_html}
			spellcheck="false"
			class="min-h-48 resize-y bg-background"
			placeholder="Add notes..."
		/>
	{/if}
</div>
