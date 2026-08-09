<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { getCampaignContext } from '$lib/state/campaign.svelte';
	import { cn, renderMarkdown } from '$lib/utils';
	import Check from '@lucide/svelte/icons/check';
	import SquarePen from '@lucide/svelte/icons/square-pen';

	let {
		isGM,
		class: className = ''
	}: {
		isGM: boolean;
		class?: string;
	} = $props();

	const campaignCtx = getCampaignContext();
	const campaign = $derived(campaignCtx.campaign);

	let showPreview = $state(true);
</script>

{#if campaign}
	<div class={cn('rounded-2xl border-y bg-primary-muted p-4 pt-3 shadow-xl', className)}>
		<div class="mb-2 flex items-center justify-between">
			<h2 class="text-lg font-semibold">
				{#if isGM}
					Public Notes
				{:else}
					Notes from the GM
				{/if}
			</h2>
			{#if isGM}
				<Button variant="ghost" size="sm" class="px-2" onclick={() => (showPreview = !showPreview)}>
					{#if showPreview}
						<SquarePen class="size-4" />
					{:else}
						<Check class="size-4" />
					{/if}
				</Button>
			{/if}
		</div>

		{#if showPreview || !isGM}
			<div class="px-2 py-2 text-sm text-muted-foreground">
				{@html renderMarkdown(campaign.public_notes || 'No notes')}
			</div>
		{:else}
			<Textarea
				bind:value={campaign.public_notes}
				class="bg-background"
				placeholder="Add campaign notes..."
			/>
		{/if}
	</div>
{/if}
