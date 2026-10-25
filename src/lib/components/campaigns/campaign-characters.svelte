<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Id } from '@domain/ids';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import CharacterPortrait from '$lib/components/character-sheet/standalone/character-portrait.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Label from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { getCampaignContext, type CampaignRosterEntry } from '$lib/state/campaign.svelte';
	import { getUserContext } from '$lib/state/user.svelte';
	import { cn } from '$lib/utils';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { toast } from 'svelte-sonner';
	import { createApiResource } from '$lib/state/api-resource.svelte';
	import { deleteApi, getApi, patchApi, postApi } from '$lib/api/client';
	import type { Character } from '@domain/schemas/characters';

	let { class: className = '' }: { class?: string } = $props();

	const campaignCtx = getCampaignContext();
	const userCtx = getUserContext();
	const ownedCharactersQuery = createApiResource<
		{ id: Id<'characters'>; character: Character; campaign_name?: string }[]
	>(async () => await getApi('/characters'));

	const campaign = $derived(campaignCtx.campaign);
	const activeCharacters = $derived(campaignCtx.active_characters);
	const inactiveCharacters = $derived(campaignCtx.inactive_characters);
	const ownedCharacters = $derived(ownedCharactersQuery.data ?? []);
	const isGM = $derived(campaignCtx.isGm);
	const isPlayer = $derived(!campaignCtx.isGm);
	const isLoading = $derived(userCtx.isLoading || campaignCtx.isLoading);
	const canCreateCharacter = $derived(userCtx.character_limits.can_create_character);

	const availableCharacters = $derived(
		ownedCharacters
			.filter(({ character }) => !character.campaign_id)
			.map(({ id, character }) => ({
				id,
				name: character.name.trim() || 'Unnamed Character'
			}))
	);

	const availableGmCharacters = $derived(availableCharacters);

	const playerHasCharacterInCampaign = $derived(activeCharacters.some((char) => char.isOwner));

	let showAddCharacterDialog = $state(false);
	let selectedCharacterId = $state('');
	let isAddingCharacter = $state(false);

	let showUnassignDialog = $state(false);
	let characterToUnassign = $state<Id<'characters'> | null>(null);

	let showRemoveDialog = $state(false);
	let characterToRemove = $state<Id<'characters'> | null>(null);
	let isRemovingCharacter = $state(false);
	let removePlayerAccess = $state(false);

	// The player holding the character being removed, if any. The GM is never offered for removal.
	const playerToRemove = $derived.by(() => {
		const entry = [...activeCharacters, ...inactiveCharacters].find(
			(char) => char.characterId === characterToRemove
		);
		const member = campaignCtx.members.find((m) => m.clerk_id === entry?.claimedByClerkId);
		return member && member.role !== 'GM' ? member : null;
	});

	let showLeaveCampaignDialog = $state(false);

	$effect(() => {
		if (!showAddCharacterDialog) {
			selectedCharacterId = '';
			isAddingCharacter = false;
		}

		if (!showRemoveDialog) {
			characterToRemove = null;
			isRemovingCharacter = false;
			removePlayerAccess = false;
		}

		if (!showUnassignDialog) {
			characterToUnassign = null;
		}
	});

	function requireCampaignId() {
		if (!campaignCtx.id) throw new Error('No campaign selected');
		return campaignCtx.id;
	}

	async function createAndAddCharacter() {
		if (isLoading || isAddingCharacter) return;

		isAddingCharacter = true;
		try {
			const id = await userCtx.createCharacter();
			await postApi<void>(`/campaigns/${requireCampaignId()}/characters`, { character_id: id });
			showAddCharacterDialog = false;
			await goto(`/characters/${id}/edit`);
		} catch (error) {
			toast.error('Failed to create character');
			console.error(error);
		} finally {
			isAddingCharacter = false;
		}
	}

	async function handleAddExistingCharacter(id = selectedCharacterId) {
		if (!id || isAddingCharacter) return;

		isAddingCharacter = true;
		try {
			await postApi<void>(`/campaigns/${requireCampaignId()}/characters`, {
				character_id: id as Id<'characters'>
			});
			await ownedCharactersQuery.refresh();
			showAddCharacterDialog = false;
			selectedCharacterId = '';
		} catch (error) {
			console.error('Failed to add character', error);
			toast.error('Failed to add character');
		} finally {
			isAddingCharacter = false;
		}
	}

	async function handleRemoveCharacter() {
		if (!characterToRemove || isRemovingCharacter) return;

		isRemovingCharacter = true;
		try {
			await deleteApi<void>(`/campaigns/${requireCampaignId()}/characters/${characterToRemove}`, {
				remove_player_access: removePlayerAccess && !!playerToRemove
			});
			await ownedCharactersQuery.refresh();
			showRemoveDialog = false;
		} catch (error) {
			console.error('Failed to remove character', error);
			toast.error('Failed to remove character');
		} finally {
			isRemovingCharacter = false;
		}
	}

	async function handleClaimCharacter(id: Id<'characters'>) {
		if (isLoading) {
			return;
		}

		try {
			await patchApi<void>(`/campaigns/${requireCampaignId()}/characters/${id}/claim`, {});
		} catch (error) {
			toast.error('Failed to claim character');
			console.error(error);
		}
	}

	async function handleUnassignCharacter() {
		if (!characterToUnassign) return;

		try {
			await patchApi<void>(
				`/campaigns/${requireCampaignId()}/characters/${characterToUnassign}/unassign`,
				{}
			);
			showUnassignDialog = false;
		} catch (error) {
			console.error('Failed to unassign character', error);
			toast.error('Failed to unassign character');
		}
	}

	async function handleLeaveCampaign() {
		try {
			await patchApi<void>(`/campaigns/${requireCampaignId()}/leave`, {});
			await goto('/campaigns');
		} catch (error) {
			console.error('Failed to leave campaign', error);
			toast.error('Failed to leave campaign');
			showLeaveCampaignDialog = false;
		}
	}
</script>

{#if !isLoading && campaign}
	{#snippet characterCard(char: CampaignRosterEntry, showClaimButton: boolean = false)}
		{@const characterData = char.character}
		{@const statusLabel = showClaimButton
			? 'Available to claim'
			: char.playerDisplayName || 'Anonymous'}

		<div class="mx- w-full overflow-hidden rounded-lg shadow-lg">
			<a
				href={`/characters/${char.characterId}/`}
				class="flex gap-2 border bg-primary-muted p-1 hover:bg-primary-muted/70"
			>
				<div class="size-19 shrink-0 overflow-hidden rounded-lg border-2">
					<CharacterPortrait
						src={characterData.image_url || '/images/art/portrait-placeholder.webp'}
						alt={characterData.name.trim() || 'Unnamed Character'}
						death_state={characterData.death_state}
						class="h-full w-full"
					/>
				</div>

				<div class="grow truncate">
					<p class="truncate text-lg font-bold">
						{characterData.name.trim() || 'Unnamed Character'}
					</p>
					<p class="truncate pt-0.5 pr-1 text-xs text-muted-foreground">
						{characterData.derived_descriptors.ancestry_name || 'No ancestry'}
						&ensp;&bull;&ensp;
						{characterData.derived_descriptors.primary_class_name || 'No class'}
						&ensp;&bull;&ensp;
						{characterData.derived_descriptors.primary_subclass_name || 'No subclass'}
					</p>

					{#if !showClaimButton}
						<div
							class="mt-1 w-min truncate rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-center text-xs text-accent"
						>
							{statusLabel}
						</div>
					{/if}
				</div>
			</a>

			<div class="flex bg-muted">
				<Button
					variant="ghost"
					size="sm"
					class="hover:text-text grow rounded-none border"
					href={`/characters/${char.characterId}/`}
				>
					View
				</Button>

				{#if isGM}
					<Button
						variant="ghost"
						size="sm"
						class="hover:text-text grow rounded-none border border-x-0"
						href={`/characters/${char.characterId}/edit`}
					>
						Edit
					</Button>
					<Button
						variant="ghost"
						size="sm"
						class="grow rounded-none border text-destructive hover:text-destructive"
						onclick={() => {
							characterToRemove = char.characterId;
							showRemoveDialog = true;
						}}
					>
						Remove
					</Button>
				{:else if char.isOwner && !showClaimButton}
					<Button
						variant="ghost"
						size="sm"
						class="hover:text-text grow rounded-none border border-x-0"
						href={`/characters/${char.characterId}/edit`}
					>
						Edit
					</Button>
					<Button
						variant="ghost"
						size="sm"
						class="grow rounded-none border border-x-0 text-destructive hover:text-destructive"
						onclick={() => {
							characterToUnassign = char.characterId;
							showUnassignDialog = true;
						}}
					>
						Unassign
					</Button>
					<Button
						variant="ghost"
						size="sm"
						class="grow rounded-none border text-destructive hover:text-destructive"
						onclick={() => (showLeaveCampaignDialog = true)}
					>
						Leave
					</Button>
				{/if}

				{#if showClaimButton && isPlayer && !playerHasCharacterInCampaign}
					<Button
						variant="default"
						size="sm"
						class="grow rounded-none border border-x-0"
						onclick={() => handleClaimCharacter(char.characterId)}
					>
						Claim
					</Button>
				{/if}
			</div>
		</div>
	{/snippet}

	<div class={className}>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold">Active Characters</h2>

			{#if isGM || !playerHasCharacterInCampaign}
				<Button variant="outline" size="sm" onclick={() => (showAddCharacterDialog = true)}>
					Add Character
				</Button>
			{/if}
		</div>

		{#if activeCharacters.length === 0 && inactiveCharacters.length === 0}
			<p class="text-sm text-muted-foreground">No characters assigned yet.</p>
		{:else}
			{#if activeCharacters.length > 0}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each activeCharacters as char}
						{@render characterCard(char)}
					{/each}
				</div>
			{/if}

			{#if inactiveCharacters.length > 0}
				<div class="mt-6">
					<h3 class="text-md mb-1 font-semibold">Unassigned Characters</h3>
					<p class="mb-4 text-xs text-muted-foreground">
						These characters are available for players in the campaign to claim.
					</p>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each inactiveCharacters as char}
							{@render characterCard(char, true)}
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<Dialog.Root bind:open={showAddCharacterDialog}>
		<Dialog.Content class="flex max-h-[90%] flex-col sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Add Character</Dialog.Title>
				<Dialog.Description>
					{isGM
						? 'Add characters to this campaign that players can claim.'
						: 'Add one of your characters to this campaign.'}
				</Dialog.Description>
			</Dialog.Header>

			<div class="flex flex-col gap-6 overflow-y-auto py-4">
				{#if isGM}
					<div class="mb-2 rounded border border-accent/20 bg-accent/10 p-2">
						<p class="text-sm text-accent/80">
							<TriangleAlert class="-mt-[4px] mr-[5px] inline size-3.5" />Characters you add can be
							claimed by players. You will not be able to edit these characters unless you are the
							GM of that character's campaign.
						</p>
					</div>
				{/if}

				<div class="flex flex-col gap-2">
					<Label.Root>Add Existing Character</Label.Root>
					<Select.Root
						type="single"
						value={selectedCharacterId || 'none'}
						onValueChange={(value) => {
							if (value === 'none') {
								selectedCharacterId = '';
								return;
							}

							if (value) {
								selectedCharacterId = value;
								handleAddExistingCharacter(value);
							}
						}}
					>
						<Select.Trigger class="w-full">
							<p class="truncate">
								{selectedCharacterId && selectedCharacterId !== 'none'
									? (isGM ? availableGmCharacters : availableCharacters).find(
											(character) => character.id === selectedCharacterId
										)?.name || 'Unnamed Character'
									: 'None'}
							</p>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="none">None</Select.Item>
							{#each isGM ? availableGmCharacters : availableCharacters as character}
								<Select.Item value={character.id}>{character.name}</Select.Item>
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
					<Button onclick={createAndAddCharacter} disabled={!canCreateCharacter}>
						Create New Character
					</Button>
				</div>
			</div>

			<Dialog.Footer class="flex gap-3">
				<div class="grow"></div>
				<Dialog.Close
					type="button"
					disabled={isAddingCharacter}
					class={cn(buttonVariants({ variant: 'link' }), 'text-muted-foreground')}
				>
					{#if isAddingCharacter}
						<Loader2 class="size-4 animate-spin" />
						Adding...
					{:else}
						Cancel
					{/if}
				</Dialog.Close>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={showUnassignDialog}>
		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Unassign Character</Dialog.Title>
				<Dialog.Description>
					Are you sure you want to unassign this character? If the character is claimed by another
					player in your campaign, you will no longer be able to edit that character unless you are
					the GM of that character's campaign.
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer class="flex gap-3">
				<Dialog.Close
					type="button"
					class={cn(buttonVariants({ variant: 'link' }), 'text-muted-foreground')}
				>
					Cancel
				</Dialog.Close>
				<Button variant="destructive" onclick={handleUnassignCharacter}>Unassign</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={showRemoveDialog}>
		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Remove Character</Dialog.Title>
				<Dialog.Description>
					Are you sure you want to remove this character from the campaign? This will remove the
					character from the campaign but will not delete the character.
				</Dialog.Description>
			</Dialog.Header>
			{#if playerToRemove}
				<label class="flex cursor-pointer items-start gap-2 text-sm">
					<Checkbox
						id="remove-player-access"
						class="mt-0.5"
						checked={removePlayerAccess}
						disabled={isRemovingCharacter}
						onCheckedChange={(checked) => (removePlayerAccess = checked === true)}
					/>
					<span>
						Also remove {playerToRemove.display_name.trim() || 'this player'}'s access to this
						campaign
					</span>
				</label>
			{/if}
			<Dialog.Footer class="flex gap-3">
				<Dialog.Close
					type="button"
					class={cn(buttonVariants({ variant: 'link' }), 'text-muted-foreground')}
				>
					Cancel
				</Dialog.Close>
				<Button
					variant="destructive"
					onclick={handleRemoveCharacter}
					disabled={isRemovingCharacter}
				>
					{#if isRemovingCharacter}
						<Loader2 class="size-4 animate-spin" />
						Removing...
					{:else}
						Remove
					{/if}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={showLeaveCampaignDialog}>
		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Leave Campaign</Dialog.Title>
				<Dialog.Description>
					Are you sure you want to leave <strong>{campaign.name}</strong>? This action cannot be
					undone.
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer class="flex gap-3">
				<Dialog.Close
					type="button"
					class={cn(buttonVariants({ variant: 'link' }), 'text-muted-foreground')}
				>
					Cancel
				</Dialog.Close>
				<Dialog.Close
					type="button"
					class={cn(buttonVariants({ variant: 'destructive' }))}
					onclick={handleLeaveCampaign}
				>
					Leave Campaign
				</Dialog.Close>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
