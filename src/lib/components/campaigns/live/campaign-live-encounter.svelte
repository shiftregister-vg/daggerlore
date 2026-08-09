<script lang="ts">
	import type { Id } from '@domain/ids';
	import { BLANK_ENCOUNTER } from '@domain/constants/constants';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Encounter from '$lib/components/encounters/encounter.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Label from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { getCampaignContext } from '$lib/state/campaign.svelte';
	import { getEncounterContext } from '$lib/state/encounters.svelte';
	import { cn } from '$lib/utils';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Map from '@lucide/svelte/icons/map';
	import { toast } from 'svelte-sonner';
	import { createApiResource } from '$lib/state/api-resource.svelte';
	import { getApi } from '$lib/api/client';
	import type { Encounter as EncounterType } from '@domain/schemas/encounters';

	let {
		class: className = '',
		isGM
	}: {
		class?: string;
		isGM: boolean;
	} = $props();

	const campaignCtx = getCampaignContext();
	const encounterCtx = getEncounterContext();

	const encountersQuery = createApiResource<{ id: Id<'encounters'>; encounter: EncounterType }[]>(
		async () => await getApi('/encounters')
	);
	const encounters = $derived(encountersQuery.data ?? []);
	const currentEncounterId = $derived(campaignCtx.campaign?.current_encounter_id);
	const encounter = $derived(encounterCtx.encounter);
	const activeCharacterCount = $derived(campaignCtx.active_characters.length);
	const availableEncounters = $derived(
		encounters.map(({ id, encounter }) => ({
			id,
			name: encounter.name
		}))
	);

	let showLoadEncounterDialog = $state(false);
	let showPlayerCountMismatchDialog = $state(false);
	let selectedEncounterId = $state('');
	let isLoading = $state(false);
	let editingName = $state(false);
	let mismatchEncounterPlayers = $state(0);
	let mismatchTargetPlayers = $state(0);

	$effect(() => {
		encounterCtx.id = currentEncounterId as Id<'encounters'> | undefined;
	});

	$effect(() => {
		if (showLoadEncounterDialog) {
			selectedEncounterId = (currentEncounterId as string) || '';
		} else {
			selectedEncounterId = '';
		}
	});

	function maybePromptPlayerCountMismatch(loadedEncounterPlayers: number) {
		if (!isGM) return;

		const targetPlayers = activeCharacterCount;
		if (targetPlayers <= 0) return;
		if (loadedEncounterPlayers === targetPlayers) return;

		mismatchEncounterPlayers = loadedEncounterPlayers;
		mismatchTargetPlayers = targetPlayers;
		showPlayerCountMismatchDialog = true;
	}

	function removeCurrentEncounter() {
		if (!campaignCtx.campaign) return;
		campaignCtx.campaign.current_encounter_id = undefined;
		selectedEncounterId = '';
		showLoadEncounterDialog = false;
	}

	async function handleSelectEncounter(value: string) {
		if (isLoading) return;

		if (!value) {
			removeCurrentEncounter();
			return;
		}

		selectedEncounterId = value;
		const selectedEncounter = encounters.find(({ id }) => id === value)?.encounter;
		if (campaignCtx.campaign) {
			campaignCtx.campaign.current_encounter_id = value as Id<'encounters'>;
		}
		showLoadEncounterDialog = false;
		if (selectedEncounter) {
			maybePromptPlayerCountMismatch(selectedEncounter.number_of_players);
		}
	}

	async function handleCreateEncounter() {
		if (isLoading) return;

		isLoading = true;
		try {
			const id = await encounterCtx.create({
				...BLANK_ENCOUNTER,
				number_of_players:
					activeCharacterCount > 0 ? activeCharacterCount : BLANK_ENCOUNTER.number_of_players
			});

			if (campaignCtx.campaign) {
				campaignCtx.campaign.current_encounter_id = id;
			}
			showLoadEncounterDialog = false;
		} catch (error) {
			console.error('Failed to create encounter', error);
			toast.error('Failed to create encounter');
		} finally {
			isLoading = false;
		}
	}

	function handleConfirmPlayerCountMismatchUpdate() {
		if (mismatchTargetPlayers <= 0) {
			showPlayerCountMismatchDialog = false;
			return;
		}

		if (!encounter) {
			toast.error('Encounter is still loading');
			return;
		}

		encounter.number_of_players = mismatchTargetPlayers;
		showPlayerCountMismatchDialog = false;
	}

	function clearCurrentEncounterOnDelete(encounterId: string) {
		if (campaignCtx.campaign?.current_encounter_id === encounterId) {
			campaignCtx.campaign.current_encounter_id = undefined;
		}
	}
</script>

<div class={cn('relative grow', className)}>
	<Encounter
		class={cn(!encounter && 'h-0')}
		hideDesktopNotesColumn={true}
		onBeforeDelete={clearCurrentEncounterOnDelete}
	>
		{#if encounter}
			<div class="flex items-center gap-2 truncate">
				{#if isGM}
					<Button
						variant="ghost"
						size="icon"
						class="min-w-9"
						onclick={() => (showLoadEncounterDialog = true)}
					>
						<Map />
					</Button>
				{/if}

				{#if editingName && isGM}
					<Input
						class="border-none px-2 sm:-ml-2"
						autofocus
						onblur={() => (editingName = false)}
						bind:value={encounter.name}
						placeholder="Encounter name"
					/>
				{:else}
					<Button
						variant="ghost"
						onclick={() => {
							if (isGM) editingName = true;
						}}
						class="truncate px-2 sm:-ml-2"
					>
						<span class="truncate">{encounter.name || 'Unnamed Encounter'} </span>
					</Button>
				{/if}
			</div>
		{:else if isGM}
			<Button
				class="absolute top-20 left-1/2 -translate-x-1/2 border-b border-primary/50"
				onclick={() => (showLoadEncounterDialog = true)}
			>
				Load an Encounter
			</Button>
		{/if}
	</Encounter>
</div>

<Dialog.Root bind:open={showLoadEncounterDialog}>
	<Dialog.Content class="flex max-h-[90%] flex-col sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Choose an Encounter</Dialog.Title>
			<Dialog.Description>
				Select an existing encounter to open in the campaign, or create a new one.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-6 overflow-y-auto py-4">
			<div class="flex flex-col gap-2">
				<Label.Root>Encounters</Label.Root>
				<Select.Root
					type="single"
					value={selectedEncounterId || ''}
					onValueChange={(value) => {
						handleSelectEncounter(value);
					}}
				>
					<Select.Trigger class="w-full">
						<p class={cn('truncate', !encounter && 'text-muted-foreground')}>
							{selectedEncounterId &&
							encounters.find(({ id }) => id === selectedEncounterId)?.encounter
								? encounters.find(({ id }) => id === selectedEncounterId)?.encounter.name ||
									'Unnamed Encounter'
								: 'Select an encounter'}
						</p>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="" class="justify-center text-muted-foreground"
							>-- Select an encouter --</Select.Item
						>
						{#if availableEncounters.length === 0}
							<p class="p-2 text-sm text-muted-foreground">No encounters available</p>
						{/if}
						{#each availableEncounters as item}
							<Select.Item value={item.id}>{item.name || 'Unnamed Encounter'}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="flex items-center gap-4">
				<div class="h-px flex-1 bg-border"></div>
				<span class="text-sm text-muted-foreground">Or</span>
				<div class="h-px flex-1 bg-border"></div>
			</div>

			<div class="flex flex-col gap-2">
				<Button onclick={handleCreateEncounter} disabled={isLoading}>
					{#if isLoading && !selectedEncounterId}
						<Loader2 class="size-4 animate-spin" />
						Creating...
					{:else}
						Create New Encounter
					{/if}
				</Button>
			</div>
		</div>

		<Dialog.Footer class="flex w-full justify-between">
			<Dialog.Close
				type="button"
				class={cn(buttonVariants({ variant: 'link' }), 'text-muted-foreground')}
			>
				Cancel
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showPlayerCountMismatchDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Update Encounter Player Count?</Dialog.Title>
			<Dialog.Description>
				This encounter is set to {mismatchEncounterPlayers} players, but your campaign has
				{mismatchTargetPlayers} active character{mismatchTargetPlayers === 1 ? '' : 's'}. Update the
				encounter to {mismatchTargetPlayers} players?
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="flex gap-3">
			<Dialog.Close
				type="button"
				class={cn(buttonVariants({ variant: 'link' }), 'text-muted-foreground')}
			>
				Keep current
			</Dialog.Close>
			<Button onclick={handleConfirmPlayerCountMismatchUpdate}>Update</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
