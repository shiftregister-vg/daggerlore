<script lang="ts">
	import CampaignPrivateNotes from '$lib/components/campaigns/campaign-private-notes.svelte';
	import CampaignPublicNotes from '$lib/components/campaigns/campaign-public-notes.svelte';
	import CampaignVault from '$lib/components/campaigns/campaign-vault.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import EncounterNotes from '$lib/components/encounters/encounter-notes.svelte';
	import { getEncounterContext } from '$lib/state/encounters.svelte';
	import { cn } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import Settings from '@lucide/svelte/icons/settings';

	let {
		class: className = '',
		isGM
	}: {
		class?: string;
		isGM: boolean;
	} = $props();

	const encounterCtx = getEncounterContext();
	const encounter = $derived(encounterCtx.encounter);

	function openEncounterAction(action: 'adversary-selector' | 'environment-selector' | 'settings') {
		window.dispatchEvent(new CustomEvent(`daggerlore:encounter-open-${action}`));
	}
</script>

<div class={cn('flex flex-col gap-4 px-4 py-5', className)}>
	{#if encounter}
		<div class="grid grid-cols-3 gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={() => openEncounterAction('adversary-selector')}
				class="rounded-full bg-background text-muted-foreground hover:bg-background hover:text-accent"
			>
				<Plus class="-ml-1 stroke-3" />
				Adversary
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={() => openEncounterAction('environment-selector')}
				class="rounded-full bg-background text-muted-foreground hover:bg-background hover:text-accent"
			>
				<Plus class="-ml-1 stroke-3" />
				Environment
			</Button>
			{#if encounterCtx.isOwner}
				<Button
					variant="outline"
					size="sm"
					onclick={() => openEncounterAction('settings')}
					class="rounded-full bg-background text-muted-foreground hover:bg-background hover:text-accent"
				>
					<Settings class="size-4" />
					Settings
				</Button>
			{/if}
		</div>

		<EncounterNotes
			{encounter}
			title="Encounter Notes"
			class="bg-primary-muted"
		/>

		<div class="flex items-center gap-3 px-1 text-xs font-semibold text-muted-foreground uppercase">
			<div class="h-px flex-1 bg-primary-muted-light/60"></div>
			<span>Campaign</span>
			<div class="h-px flex-1 bg-primary-muted-light/60"></div>
		</div>
	{/if}

	{#if isGM}
		<CampaignPrivateNotes class="h-min" />
	{/if}

	<CampaignPublicNotes {isGM} class="h-min" />

	{#if isGM}
		<CampaignVault />
	{/if}
</div>
