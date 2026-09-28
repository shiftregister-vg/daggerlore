import type { CompendiumContent } from '@domain/schemas/compendium';
import { getContext, setContext, untrack } from 'svelte';
import { getUserContext } from './user.svelte';
import type { SourceKey } from '@domain/schemas/rules';
import type { SourceMetadata } from '@domain/schemas/sources';
import { createApiResource } from './api-resource.svelte';
import { getApi } from '$lib/api/client';
import { merge_compendium_content } from '$lib/utils';

function sourceQuery(sourceKeys: SourceKey[]) {
	const params = new URLSearchParams();
	for (const sourceKey of sourceKeys) params.append('source_key', sourceKey);
	const query = params.toString();
	return query ? `?${query}` : '';
}

function sameSourceKeys(left: SourceKey[], right: SourceKey[]) {
	return left.length === right.length && left.every((sourceKey, index) => sourceKey === right[index]);
}

function createSources() {
	const userContext = getUserContext();
	const userInviteAccepted = $derived(userContext.user?.invite_accepted === true);

	const sourceResource = createApiResource<SourceKey[]>(async () => {
		if (!userContext.user?.invite_accepted) return [];
		return await getApi<SourceKey[]>('/sources');
	});
	const sourceKeys: SourceKey[] = $derived(sourceResource.data ?? []);
	const sourceKeySignature = $derived(sourceKeys.join('|'));
	const sourceMetadataResource = createApiResource<SourceMetadata[]>(async () => {
		if (!userContext.user?.invite_accepted || sourceKeys.length === 0) return [];
		return await getApi<SourceMetadata[]>(`/official-sources${sourceQuery(sourceKeys)}`);
	});
	const compendiumResource = createApiResource<CompendiumContent>(async () => {
		if (!userContext.user?.invite_accepted || sourceKeys.length === 0) return merge_compendium_content();
		return await getApi<CompendiumContent>(`/official-compendium${sourceQuery(sourceKeys)}`);
	}, { immediate: false });
	const sources = $derived(sourceMetadataResource.data ?? []);
	const isLoading = $derived(
		userContext.isLoading ||
			sourceResource.isLoading ||
			sourceMetadataResource.isLoading ||
			compendiumResource.isLoading
	);
	const error = $derived(
		sourceResource.error ?? sourceMetadataResource.error ?? compendiumResource.error
	);

	const compendium: CompendiumContent = $derived(
		compendiumResource.data ?? merge_compendium_content()
	);

	function getCompendiumFromSourceKeys(...source_keys: SourceKey[]): CompendiumContent {
		if (sameSourceKeys(source_keys, sourceKeys)) return compendium;
		return merge_compendium_content();
	}

	// The official compendium is large, so it loads only once a page asks for it.
	let compendiumRequested = false;

	function loadCompendium() {
		compendiumRequested = true;
		return compendiumResource.refresh();
	}

	/** Loads the official compendium unless it is already loaded or loading. */
	function ensureCompendium() {
		if (compendiumRequested) return;
		void loadCompendium();
	}

	$effect(() => {
		userInviteAccepted;
		untrack(() => void sourceResource.refresh());
	});

	$effect(() => {
		sourceKeySignature;
		untrack(() => void sourceMetadataResource.refresh());
	});

	// A request made before the source keys arrived resolves to an empty compendium, so reload it
	// whenever the keys change after it was requested.
	$effect(() => {
		sourceKeySignature;
		if (!compendiumRequested) return;
		untrack(() => void compendiumResource.refresh());
	});

	return {
		get isLoading() {
			return isLoading;
		},
		get error() {
			return error;
		},
		get compendium() {
			return compendium;
		},
		get sources() {
			return sources;
		},

		getCompendiumFromSourceKeys,
		loadCompendium,
		ensureCompendium
	};
}

const SOURCES_KEY = Symbol('Sources');

export const setSourcesContext = () => {
	const newSources = createSources();
	return setContext(SOURCES_KEY, newSources);
};

export const getSourcesContext = (): ReturnType<typeof setSourcesContext> => {
	return getContext(SOURCES_KEY);
};
