<script lang="ts">
	import { getCharacterContext, setCharacterContext } from '$lib/state/character.svelte';
	import { getCampaignContext, setCampaignContext } from '$lib/state/campaign.svelte';
	import { setDiceContext } from '$lib/state/dice.svelte';
	import { setRequestsContext } from '$lib/state/character-requests.svelte';
	import { page } from '$app/state';
	import LoadError from '$lib/components/utility/load-error.svelte';
	import Loader from '$lib/components/utility/loader.svelte';
	import { getUserContext } from '$lib/state/user.svelte';
	import type { Id } from '@domain/ids';
	import { onMount, onDestroy, untrack } from 'svelte';

	let { children } = $props();

	const diceCtx = setDiceContext();
	setCampaignContext();
	setCharacterContext();
	setRequestsContext();

	const characterCtx = getCharacterContext();
	const campaignCtx = getCampaignContext();
	const userCtx = getUserContext();
	const loadError = $derived(characterCtx.error ?? userCtx.error);

	let unsubscribeRoll: (() => void) | undefined;
	let lastCampaignId = $state<string | undefined>();
	const pendingSyncedRollIds = new Set<string>();

	$effect(() => {
		if (loadError) {
			console.error('Error loading character page', loadError);
		}
	});

	// load character
	$effect(() => {
		const characterId = page.params.id ?? null;
		characterCtx.id = characterId as Id<'characters'>;
	});

	$effect(() => {
		const campaignId = characterCtx.character?.campaign_id;
		const currentCampaignId = untrack(() => campaignCtx.id);
		if (campaignId !== currentCampaignId) {
			campaignCtx.id = campaignId;
		}
	});

	$effect(() => {
		if (campaignCtx.id !== lastCampaignId) {
			lastCampaignId = campaignCtx.id;
			pendingSyncedRollIds.clear();
			diceCtx.history = [];
		}
	});

	$effect(() => {
		const remoteRolls = campaignCtx.diceHistory?.rolls ?? [];
		const merged = new Map<string, (typeof remoteRolls)[number]>();

		for (const roll of diceCtx.history) {
			merged.set(roll.id, roll);
		}

		for (const roll of remoteRolls) {
			const localRoll = merged.get(roll.id);
			if (localRoll?.status === 'rolling') continue;
			if (localRoll && pendingSyncedRollIds.has(roll.id)) {
				if (JSON.stringify(localRoll) === JSON.stringify(roll)) {
					pendingSyncedRollIds.delete(roll.id);
				} else {
					continue;
				}
			}
			merged.set(roll.id, roll);
		}

		const nextHistory = Array.from(merged.values())
			.sort((left, right) => left.timestamp - right.timestamp)
			.slice(-20);

		if (JSON.stringify(nextHistory) !== JSON.stringify(diceCtx.history)) {
			diceCtx.history = nextHistory;
		}
	});

	onMount(() => {
		diceCtx.init();
		unsubscribeRoll = diceCtx.onRollEnd((roll) => {
			if (!campaignCtx.id) return;

			const syncedRoll = {
				...roll,
				rollerName: roll.rollerName ?? campaignCtx.userMembership?.display_name ?? undefined
			};
			pendingSyncedRollIds.add(syncedRoll.id);
			diceCtx.history = diceCtx.history.map((entry) =>
				entry.id === syncedRoll.id ? syncedRoll : entry
			);
			campaignCtx.addRollToHistory(syncedRoll);
		});
	});

	onDestroy(() => {
		unsubscribeRoll?.();
		diceCtx.destroy();
	});

	const isLoading = $derived(characterCtx.isLoading || userCtx.isLoading);
</script>

<div class="relative min-h-[calc(100dvh-var(--navbar-height,3.5rem))]">
	<Loader {isLoading} />
	{#if isLoading}
		<div></div>
	{:else if loadError || !characterCtx.character}
		<LoadError />
	{:else}
		{@render children?.()}
	{/if}
</div>
