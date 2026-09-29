<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { getApi, postApi } from '$lib/api/client';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { usageLimitCaption } from '$lib/state/feature-usage';
	import { UsageResetSchema } from '@domain/schemas/rules';

	type CompendiumUpdate = {
		key: string;
		source_key: string;
		item_type: string;
		item_id: string;
		title: string;
		pinned_version: number;
		latest_version: number;
		current_label: string;
		latest_label: string;
		changelog: string;
		current_item: unknown;
		latest_item: unknown;
	};

	type UpdateResponse = {
		muted_until: string | null;
		updates: CompendiumUpdate[];
	};

	type DiffToken = {
		text: string;
		kind: 'same' | 'added' | 'removed';
	};

	type FeatureDiff = {
		key: string;
		beforeTitle: string;
		afterTitle: string;
		beforeText: string;
		afterText: string;
		beforeTokens: DiffToken[];
		afterTokens: DiffToken[];
		beforeUsage: string;
		afterUsage: string;
		status: 'changed' | 'added' | 'removed';
	};

	const characterCtx = getCharacterContext();

	let open = $state(false);
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let updates = $state<CompendiumUpdate[]>([]);
	let selectedKey = $state<string | null>(null);
	let selectedBulkKeys = $state<Set<string>>(new Set());
	let loadedForCharacterId = $state<string | undefined>();

	const characterId = $derived(characterCtx.id as string | undefined);
	const canEdit = $derived(characterCtx.canEdit);
	const selectedUpdate = $derived(
		updates.find((update) => update.key === selectedKey) ?? updates[0] ?? null
	);
	const selectedChanges = $derived(
		selectedUpdate
			? changedFieldDetails(selectedUpdate.current_item, selectedUpdate.latest_item)
			: []
	);
	const selectedBulkCount = $derived(selectedBulkKeys.size);

	function formatItemType(itemType: string) {
		return itemType
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}

	function isRecord(value: unknown): value is Record<string, unknown> {
		return !!value && typeof value === 'object' && !Array.isArray(value);
	}

	function asFeatureList(value: unknown) {
		if (!Array.isArray(value)) return null;
		const features = value.filter(isRecord);
		if (features.length !== value.length) return null;
		if (!features.every((feature) => 'description_html' in feature || 'title' in feature)) return null;
		return features;
	}

	function asStringList(value: unknown) {
		if (!Array.isArray(value)) return null;
		if (!value.every((item) => typeof item === 'string')) return null;
		return value as string[];
	}

	function removedListItems(before: string[], after: string[]) {
		const afterSet = new Set(after);
		return before.map((item) => ({ item, removed: !afterSet.has(item) }));
	}

	function addedListItems(before: string[], after: string[]) {
		const beforeSet = new Set(before);
		return after.map((item) => ({ item, added: !beforeSet.has(item) }));
	}

	function normalizeDiffText(value: unknown) {
		return typeof value === 'string' ? value : formatValue(value);
	}

	function tokenize(value: string) {
		return value.match(/\S+|\s+/g) ?? [];
	}

	function diffTokens(left: string, right: string) {
		const leftTokens = tokenize(left);
		const rightTokens = tokenize(right);
		const rows = leftTokens.length + 1;
		const cols = rightTokens.length + 1;
		const lengths = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

		for (let i = leftTokens.length - 1; i >= 0; i -= 1) {
			for (let j = rightTokens.length - 1; j >= 0; j -= 1) {
				if (leftTokens[i] === rightTokens[j]) {
					lengths[i][j] = lengths[i + 1][j + 1] + 1;
				} else {
					lengths[i][j] = Math.max(lengths[i + 1][j], lengths[i][j + 1]);
				}
			}
		}

		const before: DiffToken[] = [];
		const after: DiffToken[] = [];
		let i = 0;
		let j = 0;
		while (i < leftTokens.length || j < rightTokens.length) {
			if (i < leftTokens.length && j < rightTokens.length && leftTokens[i] === rightTokens[j]) {
				before.push({ text: leftTokens[i], kind: 'same' });
				after.push({ text: rightTokens[j], kind: 'same' });
				i += 1;
				j += 1;
			} else if (j < rightTokens.length && (i === leftTokens.length || lengths[i][j + 1] >= lengths[i + 1][j])) {
				after.push({ text: rightTokens[j], kind: 'added' });
				j += 1;
			} else if (i < leftTokens.length) {
				before.push({ text: leftTokens[i], kind: 'removed' });
				i += 1;
			}
		}

		return { before, after };
	}

	function featureText(feature: Record<string, unknown>) {
		return typeof feature.description_html === 'string' ? feature.description_html : '';
	}

	function featureUsage(feature: Record<string, unknown> | undefined) {
		const usage = feature?.usage;
		if (!isRecord(usage)) return '';
		const reset = UsageResetSchema.safeParse(usage.reset);
		const maxUses = typeof usage.max_uses === 'number' ? usage.max_uses : 1;
		const caption = usageLimitCaption({
			max_uses: maxUses,
			reset: reset.success ? reset.data : 'rest'
		});
		const label = typeof usage.label === 'string' && usage.label ? ` (${usage.label})` : '';
		return `Usage tracker${label}: ${caption}`;
	}

	function featurePools(feature: Record<string, unknown> | undefined) {
		const pools = Array.isArray(feature?.pools) ? feature.pools.filter(isRecord) : [];
		return pools
			.map((pool) => {
				const kind = pool.kind === 'dice' ? `${String(pool.die ?? '')} dice pool` : 'Token pool';
				const label = typeof pool.label === 'string' && pool.label ? ` (${pool.label})` : '';
				const refill = isRecord(pool.refill) ? `, refill ${quantityText(pool.refill)}` : '';
				const cap = isRecord(pool.capacity) ? `, max ${quantityText(pool.capacity)}` : '';
				const refillOn = Array.isArray(pool.refill_on) && pool.refill_on.length
					? ` on ${pool.refill_on.join(', ').replaceAll('_', ' ')}`
					: '';
				const clearOn = Array.isArray(pool.clear_on) && pool.clear_on.length
					? `, clears on ${pool.clear_on.join(', ').replaceAll('_', ' ')}`
					: '';
				return `${kind}${label}${refill}${refillOn}${cap}${clearOn}`;
			})
			.join('; ');
	}

	function quantityText(quantity: Record<string, unknown>) {
		const minimum = typeof quantity.minimum === 'number' ? ` (min ${quantity.minimum})` : '';
		if (quantity.source === 'fixed') return `${String(quantity.value ?? 0)}`;
		if (quantity.source === 'trait') return `${String(quantity.trait ?? 'trait')}${minimum}`;
		return `${String(quantity.source).replaceAll('_', ' ')}${minimum}`;
	}

	function featureTitle(feature: Record<string, unknown>, index: number) {
		return typeof feature.title === 'string' && feature.title.trim()
			? feature.title
			: `Feature ${index + 1}`;
	}

	function featureDiffs(before: Record<string, unknown>[], after: Record<string, unknown>[]) {
		const length = Math.max(before.length, after.length);
		const diffs: FeatureDiff[] = [];
		for (let index = 0; index < length; index += 1) {
			const beforeFeature = before[index];
			const afterFeature = after[index];
			const beforeTitle = beforeFeature ? featureTitle(beforeFeature, index) : '';
			const afterTitle = afterFeature ? featureTitle(afterFeature, index) : '';
			const beforeText = beforeFeature ? featureText(beforeFeature) : '';
			const afterText = afterFeature ? featureText(afterFeature) : '';
			const tokens = diffTokens(beforeText, afterText);
			diffs.push({
				key: `${index}:${beforeTitle}:${afterTitle}`,
				beforeTitle,
				afterTitle,
				beforeText,
				afterText,
				beforeTokens: tokens.before,
				afterTokens: tokens.after,
				beforeUsage: [featureUsage(beforeFeature), featurePools(beforeFeature)]
					.filter(Boolean)
					.join('; '),
				afterUsage: [featureUsage(afterFeature), featurePools(afterFeature)]
					.filter(Boolean)
					.join('; '),
				status: !beforeFeature ? 'added' : !afterFeature ? 'removed' : 'changed'
			});
		}
		return diffs;
	}

	function formatValue(value: unknown) {
		if (value === undefined) return 'Not set';
		if (value === null) return 'None';
		if (typeof value === 'string') return value || 'Empty';
		if (typeof value === 'number' || typeof value === 'boolean') return String(value);
		if (Array.isArray(value)) {
			if (value.length === 0) return 'Empty list';
			return JSON.stringify(value, null, 2);
		}
		return JSON.stringify(value, null, 2);
	}

	function fieldLabel(field: string) {
		return field
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}

	function tokenClass(kind: DiffToken['kind']) {
		if (kind === 'added') return 'rounded bg-emerald-500/20 text-emerald-100';
		if (kind === 'removed') return 'rounded bg-red-500/20 text-red-100 line-through decoration-red-200/70';
		return '';
	}

	function listItemClass(changed: boolean, kind: 'added' | 'removed') {
		if (!changed) return '';
		if (kind === 'added') return 'rounded bg-emerald-500/15 px-1 text-emerald-100';
		return 'rounded bg-red-500/15 px-1 text-red-100 line-through decoration-red-200/70';
	}

	function changedFieldDetails(left: unknown, right: unknown) {
		if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return [];

		const leftRecord = left as Record<string, unknown>;
		const rightRecord = right as Record<string, unknown>;
		const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
		return [...keys]
			.filter((key) => JSON.stringify(leftRecord[key]) !== JSON.stringify(rightRecord[key]))
			.sort((leftKey, rightKey) => leftKey.localeCompare(rightKey))
			.map((field) => ({
				field,
				before: leftRecord[field],
				after: rightRecord[field]
			}));
	}

	function toggleBulkKey(key: string) {
		const next = new Set(selectedBulkKeys);
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		selectedBulkKeys = next;
	}

	function selectAllUpdates() {
		selectedBulkKeys = new Set(updates.map((update) => update.key));
	}

	function clearSelectedUpdates() {
		selectedBulkKeys = new Set();
	}

	async function loadUpdates() {
		if (!characterId || !canEdit || loading || loadedForCharacterId === characterId) return;

		loading = true;
		error = null;
		try {
			const response = await getApi<UpdateResponse>(
				`/characters/${characterId}/compendium-updates`
			);
			updates = response?.updates ?? [];
			selectedKey = updates[0]?.key ?? null;
			selectedBulkKeys = new Set(updates.map((update) => update.key));
			open = updates.length > 0;
			loadedForCharacterId = characterId;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Failed to check compendium updates';
		} finally {
			loading = false;
		}
	}

	async function apply(action: 'update' | 'mute', keys?: string[]) {
		if (!characterId || saving) return;

		saving = true;
		error = null;
		try {
			const response = await postApi<UpdateResponse>(
				`/characters/${characterId}/compendium-updates`,
				action === 'mute' ? { action, mute_days: 7 } : { action, keys }
			);
			updates = response?.updates ?? [];
			selectedKey = updates[0]?.key ?? null;
			selectedBulkKeys = new Set(updates.map((update) => update.key));
			open = updates.length > 0;
			await characterCtx.refreshCompendiumState();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Failed to update compendium versions';
		} finally {
			saving = false;
		}
	}

	$effect(() => {
		if (characterCtx.isLoading || !characterId || !canEdit) return;
		void loadUpdates();
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="flex max-h-[92dvh] w-[min(92rem,calc(100vw-2rem))] max-w-none flex-col overflow-hidden p-0 sm:max-w-none"
	>
		<div class="border-b border-border px-5 py-4">
			<Dialog.Header>
				<Dialog.Title>Compendium Updates Available</Dialog.Title>
				<Dialog.Description>
					This character is pinned to older versions of {updates.length}
					{updates.length === 1 ? ' item' : ' items'}. Review the changes before updating.
				</Dialog.Description>
			</Dialog.Header>
		</div>

		<!-- Flex column (not h-full) so the panels get a bounded height and scroll; the dialog only has a max-height. -->
		<div class="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4">
			{#if error}
				<div class="mb-4 shrink-0 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{error}
				</div>
			{/if}

			<div
				class="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 xl:grid-cols-[19rem_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)]"
			>
				<aside
					class="flex max-h-48 min-h-0 flex-col overflow-hidden rounded border border-border bg-card xl:max-h-none"
				>
					<div class="border-b border-border p-3">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="font-semibold">Pending Items</p>
								<p class="text-sm text-muted-foreground">
									{selectedBulkCount} selected for update
								</p>
							</div>
							<div class="flex gap-2 text-xs">
								<button type="button" class="text-muted-foreground hover:text-foreground" onclick={selectAllUpdates}>
									All
								</button>
								<button type="button" class="text-muted-foreground hover:text-foreground" onclick={clearSelectedUpdates}>
									None
								</button>
							</div>
						</div>
					</div>

					<div class="min-h-0 flex-1 overflow-y-auto">
						{#each updates as update}
							<button
								type="button"
								class="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-border px-3 py-3 text-left hover:bg-muted/60 {selectedUpdate?.key === update.key ? 'bg-muted' : ''}"
								onclick={() => (selectedKey = update.key)}
							>
								<input
									type="checkbox"
									class="mt-1"
									checked={selectedBulkKeys.has(update.key)}
									aria-label="Select {update.title} for update"
									onclick={(event) => {
										event.stopPropagation();
										toggleBulkKey(update.key);
									}}
								/>
								<span class="min-w-0">
									<span class="block truncate font-semibold">{update.title}</span>
									<span class="block truncate text-sm text-muted-foreground">
										{formatItemType(update.item_type)} / {update.source_key}
									</span>
									<span class="mt-1 inline-flex rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
										v{update.pinned_version} to v{update.latest_version}
									</span>
								</span>
							</button>
						{/each}
					</div>
				</aside>

				{#if selectedUpdate}
					<section class="min-h-0 overflow-y-auto rounded border border-border bg-card">
						<div class="sticky top-0 z-10 border-b border-border bg-card p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div>
									<h3 class="text-xl font-semibold">{selectedUpdate.title}</h3>
									<p class="text-sm text-muted-foreground">
										{formatItemType(selectedUpdate.item_type)} / {selectedUpdate.source_key} / v{selectedUpdate.pinned_version} to v{selectedUpdate.latest_version}
									</p>
								</div>
								<Button disabled={saving} onclick={() => apply('update', [selectedUpdate.key])}>
									Update This Item
								</Button>
							</div>
						</div>

						<div class="space-y-4 p-4">
							<div class="rounded border border-border bg-background">
								<div class="border-b border-border px-3 py-2">
									<p class="text-sm font-semibold">Changed Fields</p>
									<p class="text-xs text-muted-foreground">
										{selectedChanges.length}
										{selectedChanges.length === 1 ? ' field changed' : ' fields changed'}
									</p>
								</div>

								{#if selectedChanges.length}
									<div class="divide-y divide-border">
										{#each selectedChanges as change}
											{@const beforeFeatures = asFeatureList(change.before)}
											{@const afterFeatures = asFeatureList(change.after)}
											{@const beforeStrings = asStringList(change.before)}
											{@const afterStrings = asStringList(change.after)}
											{@const simpleDiff = diffTokens(
												normalizeDiffText(change.before),
												normalizeDiffText(change.after)
											)}
											<div class="p-4">
												<p class="font-semibold">{fieldLabel(change.field)}</p>
												<div class="mt-2 grid gap-3 lg:grid-cols-2">
													<div class="min-w-0 rounded border border-border/70 bg-card p-3">
														<p class="mb-2 text-xs font-semibold uppercase text-muted-foreground">
															Current
														</p>
														{#if beforeFeatures || afterFeatures}
															<div class="space-y-3">
																{#each featureDiffs(beforeFeatures ?? [], afterFeatures ?? []) as featureDiff (featureDiff.key)}
																	<div class="rounded border border-border/70 bg-background p-3 {featureDiff.status === 'removed' ? 'border-red-500/40 bg-red-500/5' : ''}">
																		{#if featureDiff.beforeTitle}
																			<p class="font-semibold">{featureDiff.beforeTitle}</p>
																		{/if}
																		{#if featureDiff.status === 'added'}
																			<p class="text-sm text-muted-foreground">Added in latest version.</p>
																		{:else if featureDiff.beforeText}
																			<p class="mt-1 whitespace-pre-wrap break-words text-sm">
																				{#each featureDiff.beforeTokens as token}
																					<span class={tokenClass(token.kind)}>{token.text}</span>
																				{/each}
																			</p>
																		{:else}
																			<p class="text-sm text-muted-foreground">No feature text.</p>
																		{/if}
																		{#if featureDiff.status !== 'added' && featureDiff.beforeUsage}
																			<p class="mt-2 text-xs">
																				<span class={tokenClass(featureDiff.beforeUsage === featureDiff.afterUsage ? 'same' : 'removed')}>{featureDiff.beforeUsage}</span>
																			</p>
																		{/if}
																	</div>
																{/each}
															</div>
														{:else if beforeStrings || afterStrings}
															<ul class="list-disc space-y-1 pl-5 text-sm">
																{#each removedListItems(beforeStrings ?? [], afterStrings ?? []) as entry}
																	<li>
																		<span class={listItemClass(entry.removed, 'removed')}>{entry.item}</span>
																	</li>
																{/each}
															</ul>
														{:else if typeof change.before === 'string' && change.field.endsWith('_html')}
															<p class="whitespace-pre-wrap break-words text-sm">
																{#each simpleDiff.before as token}
																	<span class={tokenClass(token.kind)}>{token.text}</span>
																{/each}
															</p>
														{:else}
															<p class="whitespace-pre-wrap break-words text-sm">
																{#each simpleDiff.before as token}
																	<span class={tokenClass(token.kind)}>{token.text}</span>
																{/each}
															</p>
														{/if}
													</div>
													<div class="min-w-0 rounded border border-primary/40 bg-primary/5 p-3">
														<p class="mb-2 text-xs font-semibold uppercase text-muted-foreground">
															Latest
														</p>
														{#if beforeFeatures || afterFeatures}
															<div class="space-y-3">
																{#each featureDiffs(beforeFeatures ?? [], afterFeatures ?? []) as featureDiff (featureDiff.key)}
																	<div class="rounded border border-primary/30 bg-background/70 p-3 {featureDiff.status === 'added' ? 'border-emerald-500/40 bg-emerald-500/5' : ''}">
																		{#if featureDiff.afterTitle}
																			<p class="font-semibold">{featureDiff.afterTitle}</p>
																		{/if}
																		{#if featureDiff.status === 'removed'}
																			<p class="text-sm text-muted-foreground">Removed from latest version.</p>
																		{:else if featureDiff.afterText}
																			<p class="mt-1 whitespace-pre-wrap break-words text-sm">
																				{#each featureDiff.afterTokens as token}
																					<span class={tokenClass(token.kind)}>{token.text}</span>
																				{/each}
																			</p>
																		{:else}
																			<p class="text-sm text-muted-foreground">No feature text.</p>
																		{/if}
																		{#if featureDiff.status !== 'removed' && featureDiff.afterUsage}
																			<p class="mt-2 text-xs">
																				<span class={tokenClass(featureDiff.beforeUsage === featureDiff.afterUsage ? 'same' : 'added')}>{featureDiff.afterUsage}</span>
																			</p>
																		{/if}
																	</div>
																{/each}
															</div>
														{:else if beforeStrings || afterStrings}
															<ul class="list-disc space-y-1 pl-5 text-sm">
																{#each addedListItems(beforeStrings ?? [], afterStrings ?? []) as entry}
																	<li>
																		<span class={listItemClass(entry.added, 'added')}>{entry.item}</span>
																	</li>
																{/each}
															</ul>
														{:else if typeof change.after === 'string' && change.field.endsWith('_html')}
															<p class="whitespace-pre-wrap break-words text-sm">
																{#each simpleDiff.after as token}
																	<span class={tokenClass(token.kind)}>{token.text}</span>
																{/each}
															</p>
														{:else}
															<p class="whitespace-pre-wrap break-words text-sm">
																{#each simpleDiff.after as token}
																	<span class={tokenClass(token.kind)}>{token.text}</span>
																{/each}
															</p>
														{/if}
													</div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<p class="p-3 text-sm text-muted-foreground">
										No field-level changes detected.
									</p>
								{/if}
							</div>
						</div>
					</section>
				{/if}
			</div>
		</div>

		<Dialog.Footer class="border-t border-border px-5 py-4">
			<Button variant="outline" disabled={saving} onclick={() => (open = false)}>Not Now</Button>
			<Button variant="secondary" disabled={saving} onclick={() => apply('mute')}>
				Mute for 1 Week
			</Button>
			<Button
				variant="secondary"
				disabled={saving || selectedBulkCount === 0}
				onclick={() => apply('update', [...selectedBulkKeys])}
			>
				Update Selected
			</Button>
			<Button disabled={saving || updates.length === 0} onclick={() => apply('update')}>
				Update All
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
