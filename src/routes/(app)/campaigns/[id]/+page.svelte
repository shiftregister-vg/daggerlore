<script lang="ts">
	import { goto } from '$app/navigation';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import SafeDelete from '$lib/components/shared/safe-delete.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import Switch from '$lib/components/ui/switch/switch.svelte';
	import CampaignCharacters from '$lib/components/campaigns/campaign-characters.svelte';
	import CampaignHeader from '$lib/components/campaigns/campaign-header.svelte';
	import CampaignInviteLink from '$lib/components/campaigns/campaign-invite-link.svelte';
	import CampaignPrivateNotes from '$lib/components/campaigns/campaign-private-notes.svelte';
	import CampaignPublicNotes from '$lib/components/campaigns/campaign-public-notes.svelte';
	import CampaignVault from '$lib/components/campaigns/campaign-vault.svelte';
	import CampaignFiles from '$lib/components/campaigns/campaign-files.svelte';
	import StreamSettingsDialog from '$lib/components/campaigns/stream-settings-dialog.svelte';
	import Footer from '$lib/components/navigation/footer.svelte';
	import { getCampaignContext } from '$lib/state/campaign.svelte';
	import { getSourcesContext } from '$lib/state/sources.svelte';
	import { cn } from '$lib/utils';
	import type { SourceKey } from '@domain/schemas/rules';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { toast } from 'svelte-sonner';
	import { deleteApi, patchApi } from '$lib/api/client';

	const campaignCtx = getCampaignContext();
	const sourcesCtx = getSourcesContext();
	const isGM = $derived(campaignCtx.isGm);
	const officialSources = $derived(
		sourcesCtx.sources.filter((source) => source.source_key !== 'Homebrew' && source.source_key !== 'Campaign')
	);

	let showSettingsDialog = $state(false);
	let showPlayerSettingsDialog = $state(false);
	let showStreamSettingsDialog = $state(false);
	let showLeaveConfirmation = $state(false);
	let campaignName = $state('');
	let displayName = $state('');
	let fearVisibleToPlayers = $state(false);
	let campaignSourceKeys = $state<SourceKey[]>([]);
	let isLeaving = $state(false);
	let isSaving = $state(false);

	$effect(() => {
		if (showSettingsDialog && campaignCtx.campaign) {
			campaignName = campaignCtx.campaign.name;
			displayName = campaignCtx.userMembership?.display_name ?? '';
			fearVisibleToPlayers = !!campaignCtx.campaign.fear_visible_to_players;
			campaignSourceKeys = campaignCtx.campaign.enabled_source_keys ?? defaultCampaignSourceKeys();
		}

		if (showPlayerSettingsDialog) {
			displayName = campaignCtx.userMembership?.display_name ?? '';
		}
	});

	const hasSettingsChanges = $derived(
		!!campaignCtx.campaign &&
			(campaignName.trim() !== campaignCtx.campaign.name ||
				displayName.trim() !== (campaignCtx.userMembership?.display_name ?? '') ||
				fearVisibleToPlayers !== !!campaignCtx.campaign.fear_visible_to_players ||
				campaignSourceKeys.join('|') !==
					(campaignCtx.campaign.enabled_source_keys ?? defaultCampaignSourceKeys()).join('|'))
	);

	const hasPlayerChanges = $derived(
		displayName.trim() !== (campaignCtx.userMembership?.display_name ?? '')
	);

	async function saveGmSettings() {
		if (!campaignCtx.campaign || !campaignCtx.id || !campaignName.trim()) return;

		isSaving = true;
		try {
			campaignCtx.campaign.name = campaignName.trim();
			campaignCtx.campaign.fear_visible_to_players = fearVisibleToPlayers;
			campaignCtx.campaign.enabled_source_keys = campaignSourceKeys;

			if (displayName.trim() !== (campaignCtx.userMembership?.display_name ?? '')) {
				await patchApi<void>(`/campaigns/${campaignCtx.id}/display-name`, {
					display_name: displayName.trim()
				});
			}

			showSettingsDialog = false;
		} catch (error) {
			console.error('Failed to save settings', error);
			toast.error('Failed to save settings');
		} finally {
			isSaving = false;
		}
	}

	async function savePlayerSettings() {
		if (!campaignCtx.id) return;

		isSaving = true;
		try {
			await patchApi<void>(`/campaigns/${campaignCtx.id}/display-name`, {
				display_name: displayName.trim()
			});
			showPlayerSettingsDialog = false;
		} catch (error) {
			console.error('Failed to save player settings', error);
			toast.error('Failed to save settings');
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete() {
		if (!campaignCtx.id) return;

		try {
			await deleteApi<void>(`/campaigns/${campaignCtx.id}`);
			goto('/campaigns');
		} catch (error) {
			console.error('Failed to delete campaign', error);
			toast.error('Failed to delete campaign');
			throw error;
		}
	}

	async function handleLeaveCampaign() {
		if (!campaignCtx.id) return;

		isLeaving = true;
		try {
			await patchApi<void>(`/campaigns/${campaignCtx.id}/leave`, {});
			goto('/campaigns');
		} catch (error) {
			console.error('Failed to leave campaign', error);
			toast.error('Failed to leave campaign');
			isLeaving = false;
		}
	}

	function sourceSelected(sourceKey: SourceKey) {
		return campaignSourceKeys.includes(sourceKey);
	}

	function defaultCampaignSourceKeys() {
		return officialSources.map((source) => source.source_key);
	}

	function toggleSource(sourceKey: SourceKey, checked: boolean) {
		const nextKeys = new Set(campaignSourceKeys);
		if (checked) nextKeys.add(sourceKey);
		else nextKeys.delete(sourceKey);
		campaignSourceKeys = [...nextKeys];
	}
</script>

<div class=" min-h-[calc(100dvh-var(--navbar-height,3.5rem))]">
	{#if campaignCtx.campaign && campaignCtx.id}
		<CampaignHeader
			campaignId={campaignCtx.id}
			{isGM}
			onStreamSettingsClick={() => (showStreamSettingsDialog = true)}
			onSettingsClick={() => (showSettingsDialog = true)}
			onPlayerSettingsClick={() => (showPlayerSettingsDialog = true)}
		/>

		<div
			class={cn(
				'relative z-10 flex h-full w-full flex-col items-center justify-start',
				'pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]'
			)}
		>
			<div class="w-full max-w-6xl px-4 pt-4 pb-8">
				<div class="flex flex-col">
					<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-end">
						<CampaignInviteLink {isGM} class="grow" />
					</div>

					<CampaignCharacters class="mt-6" />

					<CampaignFiles class="mt-6" />

					{#if isGM}
						<CampaignVault class="mt-10" />
					{/if}

					<div class={cn(isGM && 'gap-4 md:grid md:grid-cols-2')}>
						<CampaignPublicNotes {isGM} class="mt-6" />
						{#if isGM}
							<CampaignPrivateNotes class="mt-6" />
						{/if}
					</div>

					<div class="h-8"></div>
				</div>
			</div>
		</div>
	{/if}
</div>
<Footer />

{#if campaignCtx.id}
	<StreamSettingsDialog bind:open={showStreamSettingsDialog} campaignId={campaignCtx.id} />
{/if}

<Dialog.Root bind:open={showSettingsDialog}>
	<Dialog.Content class="flex max-h-[90%] flex-col">
		<Dialog.Header>
			<Dialog.Title>Campaign Settings</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col gap-6 overflow-y-auto py-4">
			<form
				class="flex flex-col gap-6"
				onsubmit={(event) => {
					event.preventDefault();
					saveGmSettings();
				}}
			>
				<div class="flex flex-col gap-2">
					<label for="campaign-settings-name" class="text-sm font-medium">Campaign Name</label>
					<Input
						id="campaign-settings-name"
						bind:value={campaignName}
						placeholder="Campaign name"
						required
					/>
				</div>

				<div class="flex flex-col gap-2">
					<label for="campaign-settings-display-name" class="text-sm font-medium"
						>Your Display Name (GM)</label
					>
					<Input
						id="campaign-settings-display-name"
						bind:value={displayName}
						placeholder="Enter your display name"
					/>
				</div>

				<div class="flex items-center gap-3">
					<Switch
						id="fear-visibility-toggle"
						checked={fearVisibleToPlayers}
						onCheckedChange={(checked) => (fearVisibleToPlayers = checked ?? false)}
					/>
					<label for="fear-visibility-toggle" class="cursor-pointer space-y-1">
						<p>Fear Visible to Players</p>
						<p class="text-xs font-normal text-muted-foreground">
							If enabled, players can see the Fear tracker on their character sheets.
						</p>
					</label>
				</div>

				<div class="flex flex-col gap-3">
					<p class="text-sm font-medium">Official Sources</p>
					<div class="grid gap-3">
						{#each officialSources as source}
							<label class="flex cursor-pointer items-start gap-3 rounded-md border border-border/70 bg-card/40 p-3">
								<input
									type="checkbox"
									checked={sourceSelected(source.source_key)}
									onchange={(event) => toggleSource(source.source_key, event.currentTarget.checked)}
								/>
								<span class="grid gap-1">
									<span>{source.short_title}</span>
									<span class="text-xs text-muted-foreground">{source.name}</span>
								</span>
							</label>
						{/each}
					</div>
				</div>
			</form>

			<SafeDelete
				open={showSettingsDialog}
				itemName={campaignCtx.campaign?.name || ''}
				itemLabel="Campaign"
				deleteLabel="Delete Campaign"
				onDelete={handleDelete}
			/>
		</div>

		<Dialog.Footer class="flex gap-3">
			<div class="grow"></div>
			<Dialog.Close class={cn(buttonVariants({ variant: 'link' }), 'text-muted-foreground')}>
				Cancel
			</Dialog.Close>
			<Button
				onclick={saveGmSettings}
				disabled={!hasSettingsChanges || !campaignName.trim() || isSaving}
			>
				Save
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showPlayerSettingsDialog}>
	<Dialog.Content class="flex max-h-[90%] flex-col">
		<Dialog.Header>
			<Dialog.Title>Player Settings</Dialog.Title>
		</Dialog.Header>

		<form
			class="flex flex-col gap-6 overflow-y-auto py-4"
			onsubmit={(event) => {
				event.preventDefault();
				savePlayerSettings();
			}}
		>
			<div class="flex flex-col gap-2">
				<label for="campaign-player-display-name" class="text-sm font-medium">Display Name</label>
				<Input
					id="campaign-player-display-name"
					bind:value={displayName}
					placeholder="Enter your display name"
				/>
			</div>

			<Button
				type="button"
				variant="destructive"
				class="w-min"
				size="sm"
				onclick={() => (showLeaveConfirmation = true)}
			>
				Leave Campaign
			</Button>
		</form>

		<Dialog.Footer class="flex gap-3">
			<div class="grow"></div>
			<Dialog.Close class={cn(buttonVariants({ variant: 'link' }), 'text-muted-foreground')}>
				Cancel
			</Dialog.Close>
			<Button onclick={savePlayerSettings} disabled={!hasPlayerChanges || isSaving}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showLeaveConfirmation}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Leave Campaign</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to leave <strong
					>{campaignCtx.campaign?.name || 'this campaign'}</strong
				>?
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex gap-3">
			<Dialog.Close class={cn(buttonVariants({ variant: 'link' }), 'text-muted-foreground')}>
				Cancel
			</Dialog.Close>
			<Button variant="destructive" disabled={isLeaving} onclick={handleLeaveCampaign}>
				{#if isLeaving}
					<Loader2 class="size-4 animate-spin" />
					Leaving...
				{:else}
					Leave Campaign
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
