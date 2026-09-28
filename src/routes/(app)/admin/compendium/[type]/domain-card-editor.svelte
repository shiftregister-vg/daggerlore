<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import DomainCardComponent from '$lib/components/compendium-items/cards/domain-card.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import MarkdownTextarea from './markdown-textarea.svelte';
	import FeatureUsageEditor from './feature-usage-editor.svelte';
	import type { CompendiumContent, Domain, DomainCard } from '@domain/schemas/compendium';
	import type { SourceMetadata } from '@domain/schemas/sources';
	import type { SourceKey } from '@domain/schemas/rules';

	type ReferenceItem = {
		item_id: string;
		source_key: SourceKey;
		title: string;
		item?: Record<string, unknown>;
	};

	type MutableItem = Record<string, any>;

	let {
		item = $bindable(),
		previewOpen = $bindable(false),
		sources,
		domains,
		sourceLabel
	}: {
		item: MutableItem;
		previewOpen?: boolean;
		sources: (SourceMetadata & { enabled: boolean })[];
		domains: ReferenceItem[];
		sourceLabel: (sourceKey: SourceKey | string | undefined) => string;
	} = $props();

	const CARD_CATEGORIES = ['ability', 'spell', 'grimoire'];
	let previewChoices = $state({});
	let previewTokens = $state(0);
	const previewExperiences = ['Example experience 1', 'Example experience 2'];

	const previewCard = $derived(buildPreviewCard(item));
	const previewCompendium = $derived(buildPreviewCompendium(previewCard));

	function toInt(value: unknown, fallback: number) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
	}

	function cardCategory(value: unknown): DomainCard['category'] {
		if (value === 'spell' || value === 'grimoire') return value;
		return 'ability';
	}

	function buildPreviewCard(value: MutableItem): DomainCard {
		const features =
			Array.isArray(value.features) && value.features.length > 0
				? value.features.map((feature: MutableItem) => ({
						title: feature.title ?? '',
						description_html: feature.description_html ?? '',
						character_modifiers: Array.isArray(feature.character_modifiers)
							? feature.character_modifiers
							: [],
						weapon_modifiers: Array.isArray(feature.weapon_modifiers)
							? feature.weapon_modifiers
							: [],
						usage: feature.usage
					}))
				: [{ title: '', description_html: '', character_modifiers: [], weapon_modifiers: [] }];

		return {
			source_key: value.source_key ?? '',
			domain_id: value.domain_id || undefined,
			title: value.title || 'Untitled Domain Card',
			image_url: value.image_url ?? '',
			artist_name: value.artist_name ?? '',
			level_requirement: toInt(value.level_requirement, 1),
			recall_cost: toInt(value.recall_cost, 0),
			category: cardCategory(value.category),
			applies_in_vault: value.applies_in_vault || undefined,
			forced_in_loadout: value.forced_in_loadout || undefined,
			forced_in_vault: value.forced_in_vault || undefined,
			options: Array.isArray(value.options) ? value.options : [],
			tokens_enabled: value.tokens_enabled || undefined,
			features
		};
	}

	function buildPreviewDomain(domain: ReferenceItem): Domain {
		return {
			source_key: domain.source_key,
			title: domain.title,
			description_html: '',
			color: '#6d46d9',
			foreground_color: '#ffffff',
			image_url: '',
			artist_name: '',
			...(domain.item ?? {})
		} as Domain;
	}

	function buildPreviewCompendium(card: DomainCard): CompendiumContent {
		return {
			primary_weapons: {},
			secondary_weapons: {},
			armor: {},
			loot: {},
			consumables: {},
			beastforms: {},
			classes: {},
			subclasses: {},
			domain_cards: { preview: card },
			ancestry_cards: {},
			community_cards: {},
			transformations: {},
			character_sheet_addons: {},
			domains: Object.fromEntries(
				domains.map((domain) => [domain.item_id, buildPreviewDomain(domain)])
			),
			adversaries: {},
			environments: {}
		};
	}

	function ensureArray(key: string) {
		if (!Array.isArray(item[key])) item[key] = [];
	}

	function addFeature() {
		ensureArray('features');
		item.features = [
			...item.features,
			{ title: '', description_html: '', character_modifiers: [], weapon_modifiers: [] }
		];
	}

	function removeFeature(index: number) {
		item.features = (item.features ?? []).filter((_: unknown, current: number) => current !== index);
	}

	function addChoice(type: 'arbitrary' | 'experience') {
		ensureArray('options');
		const nextChoice =
			type === 'arbitrary'
				? {
						type,
						choice_id: `choice_${item.options.length + 1}`,
						max: 1,
						conditional_choice: null,
						options: [{ selection_id: 'option_1', title: '', short_title: '' }]
					}
				: {
						type,
						choice_id: `choice_${item.options.length + 1}`,
						max: 1,
						conditional_choice: null
					};
		item.options = [...item.options, nextChoice];
	}

	function removeChoice(index: number) {
		item.options = (item.options ?? []).filter((_: unknown, current: number) => current !== index);
	}

	function addChoiceSelection(choice: MutableItem) {
		choice.options = [
			...(choice.options ?? []),
			{ selection_id: `option_${(choice.options ?? []).length + 1}`, title: '', short_title: '' }
		];
	}

	function removeChoiceSelection(choice: MutableItem, index: number) {
		choice.options = (choice.options ?? []).filter(
			(_: unknown, current: number) => current !== index
		);
	}

	function updateChoiceType(choice: MutableItem, type: string) {
		choice.type = type;
		if (type === 'arbitrary') {
			choice.options = choice.options?.length
				? choice.options
				: [{ selection_id: 'option_1', title: '', short_title: '' }];
		} else {
			delete choice.options;
		}
	}
</script>

<div class="grid gap-6">
	<section class="admin-panel">
		<h2>Identity</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<label class="admin-field">
				<span>Source</span>
				<select class="admin-input" bind:value={item.source_key} required>
					{#each sources as source}
						<option value={source.source_key}>{source.short_title} - {source.name}</option>
					{/each}
				</select>
			</label>
			<label class="admin-field">
				<span>Title</span>
				<input class="admin-input" bind:value={item.title} />
			</label>
			<label class="admin-field">
				<span>Image URL</span>
				<input class="admin-input" bind:value={item.image_url} />
			</label>
			<label class="admin-field">
				<span>Artist</span>
				<input class="admin-input" bind:value={item.artist_name} />
			</label>
		</div>
	</section>

	<section class="admin-panel">
		<h2>Card Details</h2>
		<div class="grid gap-4 md:grid-cols-4">
			<label class="admin-field md:col-span-2">
				<span>Domain</span>
				<select class="admin-input" bind:value={item.domain_id}>
					<option value="">Select domain</option>
					{#each domains as domain}
						<option value={domain.item_id}>
							{domain.title}{#if domain.source_key !== item.source_key} ({sourceLabel(domain.source_key)}){/if}
						</option>
					{/each}
				</select>
			</label>
			<label class="admin-field">
				<span>Level</span>
				<input class="admin-input" type="number" min="1" max="10" bind:value={item.level_requirement} />
			</label>
			<label class="admin-field">
				<span>Recall Cost</span>
				<input class="admin-input" type="number" min="0" bind:value={item.recall_cost} />
			</label>
			<label class="admin-field">
				<span>Category</span>
				<select class="admin-input" bind:value={item.category}>
					{#each CARD_CATEGORIES as category}
						<option value={category}>{category}</option>
					{/each}
				</select>
			</label>
		</div>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="check-field">
				<input type="checkbox" bind:checked={item.tokens_enabled} />
				<span>Enable tokens</span>
			</label>
			<label class="check-field">
				<input type="checkbox" bind:checked={item.applies_in_vault} />
				<span>Applies while in vault</span>
			</label>
			<label class="check-field">
				<input type="checkbox" bind:checked={item.forced_in_loadout} />
				<span>Forced in loadout</span>
			</label>
			<label class="check-field">
				<input type="checkbox" bind:checked={item.forced_in_vault} />
				<span>Forced in vault</span>
			</label>
		</div>
	</section>

	<section class="admin-panel">
		<div class="flex items-center justify-between">
			<h2>Choices</h2>
			<div class="flex gap-2">
				<Button size="sm" variant="outline" class="gap-2" onclick={() => addChoice('arbitrary')}>
					<Plus class="size-4" />
					Choice
				</Button>
				<Button size="sm" variant="outline" class="gap-2" onclick={() => addChoice('experience')}>
					<Plus class="size-4" />
					Experience
				</Button>
			</div>
		</div>
		{#if (item.options ?? []).length === 0}
			<p class="text-sm text-muted-foreground">No choices configured.</p>
		{:else}
			<div class="grid gap-3">
				{#each item.options ?? [] as choice, choiceIndex}
					<div class="sub-panel">
						<div class="grid gap-3 md:grid-cols-[1fr_9rem_6rem_auto]">
							<label class="admin-field">
								<span>Choice ID</span>
								<input class="admin-input" bind:value={choice.choice_id} />
							</label>
							<label class="admin-field">
								<span>Type</span>
								<select
									class="admin-input"
									value={choice.type}
									onchange={(event) => updateChoiceType(choice, event.currentTarget.value)}
								>
									<option value="arbitrary">arbitrary</option>
									<option value="experience">experience</option>
								</select>
							</label>
							<label class="admin-field">
								<span>Max</span>
								<input class="admin-input" type="number" min="1" bind:value={choice.max} />
							</label>
							<Button size="sm" variant="outline" onclick={() => removeChoice(choiceIndex)}>
								<Trash2 class="size-4" />
							</Button>
						</div>
						{#if choice.type === 'arbitrary'}
							<div class="mt-3 grid gap-2">
								<div class="flex items-center justify-between">
									<p class="text-sm font-medium text-foreground">Selections</p>
									<Button size="sm" variant="outline" onclick={() => addChoiceSelection(choice)}>Add</Button>
								</div>
								{#each choice.options ?? [] as selection, selectionIndex}
									<div class="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
										<input class="admin-input" placeholder="selection_id" bind:value={selection.selection_id} />
										<input class="admin-input" placeholder="Title" bind:value={selection.title} />
										<input class="admin-input" placeholder="Short title" bind:value={selection.short_title} />
										<Button
											size="sm"
											variant="outline"
											onclick={() => removeChoiceSelection(choice, selectionIndex)}
											disabled={(choice.options ?? []).length <= 1}
										>
											Remove
										</Button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<section class="admin-panel">
		<div class="flex items-center justify-between">
			<h2>Card Text / Features</h2>
			<Button size="sm" variant="outline" onclick={addFeature}>Add Feature</Button>
		</div>
		<div class="grid gap-3">
			{#each item.features ?? [] as feature, index}
				<div class="sub-panel">
					<div class="mb-3 flex items-center justify-between gap-3">
						<input class="admin-input" placeholder="Feature title" bind:value={feature.title} />
						<Button size="sm" variant="outline" onclick={() => removeFeature(index)}>Remove</Button>
					</div>
					<MarkdownTextarea placeholder="Feature text" bind:value={feature.description_html} />
					<FeatureUsageEditor
						bind:feature={item.features[index]}
						siblings={item.features}
						fallbackId={`use_${index + 1}`}
					/>
				</div>
			{/each}
		</div>
	</section>
</div>

<Dialog.Root bind:open={previewOpen}>
	<Dialog.Content class="max-h-[90vh] overflow-auto sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>Domain Card Preview</Dialog.Title>
			<Dialog.Description>
				Preview uses the current editor values, including unsaved changes.
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex justify-center py-2">
			<DomainCardComponent
				enable_choices
				enable_tokens
				bind:choices={previewChoices}
				bind:tokens={previewTokens}
				card={previewCard}
				compendium={previewCompendium}
				experiences={previewExperiences}
				variant="card"
			/>
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
	.admin-panel {
		display: grid;
		gap: 1rem;
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--border) / 0.7);
		background: #201a29;
		padding: 1rem;
	}

	.admin-panel h2 {
		font-size: 1rem;
		font-weight: 700;
		color: hsl(var(--foreground));
	}

	.admin-field {
		display: grid;
		gap: 0.375rem;
		font-size: 0.875rem;
	}

	.admin-field span {
		font-weight: 500;
		color: hsl(var(--foreground));
	}

	.admin-input {
		width: 100%;
		border-radius: 0.375rem;
		border: 1px solid #5a4b78;
		background: #16121f;
		color: #f4f0ff;
		font-size: 0.875rem;
	}

	.admin-input {
		height: 2.5rem;
		padding: 0 0.75rem;
	}

	.check-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
	}

	.sub-panel {
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--border) / 0.7);
		background: hsl(var(--background) / 0.45);
		padding: 0.75rem;
	}
</style>
