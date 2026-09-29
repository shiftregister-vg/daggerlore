<script lang="ts">
	import { cn, compareAlpha, renderMarkdown } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import * as Select from '$lib/components/ui/select/';
	import type { CompendiumContent, AncestryCard } from '@domain/schemas/compendium';
	import type { CardChoices } from '@domain/schemas/rules';
	import CardOptions from './card-options.svelte';
	import UsageTracker from '$lib/components/character-sheet/features/usage-tracker.svelte';
	import PoolTracker from '$lib/components/character-sheet/features/pool-tracker.svelte';
	import { usageKey } from '$lib/state/feature-usage';

	let {
		card,
		compendium,
		choices = $bindable(),
		tokens = $bindable(),
		enable_choices = false,
		enable_tokens = false,
		usage_item_id,
		enable_mixed_ancestry = false,
		mixed_ancestry_choices = $bindable(),
		experiences = [],
		disabled = false,
		class: className = '',
		variant = 'responsive',
		children
	}: {
		card: AncestryCard;
		compendium: CompendiumContent;
		choices?: CardChoices;
		tokens?: number;
		enable_choices?: boolean;
		enable_tokens?: boolean;
		/** Id of the owning item on the character's sheet; enables usage trackers. */
		usage_item_id?: string;
		enable_mixed_ancestry?: boolean;
		mixed_ancestry_choices?: {
			top_ancestry_id?: string;
			bottom_ancestry_id?: string;
		};
		disabled?: boolean;
		experiences?: string[];
		variant?: 'responsive' | 'card';
		class?: string;
		children?: Snippet;
	} = $props();

	let clientWidth = $state(360);

	let mixedAncestryOptions = $derived(
		Object.entries(compendium.ancestry_cards)
			.filter(([, ancestryCard]) => !ancestryCard.is_mixed_ancestry)
			.map(([id, ancestryCard]) => ({
				value: id,
				label: ancestryCard.title
			}))
			.sort((left, right) => compareAlpha(left.label, right.label))
	);

	let selectedTopAncestryId = $derived(mixed_ancestry_choices?.top_ancestry_id);

	let selectedBottomAncestryId = $derived(mixed_ancestry_choices?.bottom_ancestry_id);

	let selectedTopAncestry = $derived(
		selectedTopAncestryId ? compendium.ancestry_cards[selectedTopAncestryId] : undefined
	);

	let selectedBottomAncestry = $derived(
		selectedBottomAncestryId ? compendium.ancestry_cards[selectedBottomAncestryId] : undefined
	);

	let selectedTopAncestryLabel = $derived(
		selectedTopAncestryId
			? mixedAncestryOptions.find((o) => o.value === selectedTopAncestryId)?.label
			: undefined
	);

	let selectedBottomAncestryLabel = $derived(
		selectedBottomAncestryId
			? mixedAncestryOptions.find((o) => o.value === selectedBottomAncestryId)?.label
			: undefined
	);

	function updateMixedAncestryChoice(position: 'top' | 'bottom', value: string) {
		const nextChoices = mixed_ancestry_choices ? { ...mixed_ancestry_choices } : {};
		const nextValue = value === '' ? undefined : value;

		if (position === 'top') {
			nextChoices.top_ancestry_id = nextValue;
		} else {
			nextChoices.bottom_ancestry_id = nextValue;
		}

		if (!nextChoices.top_ancestry_id && !nextChoices.bottom_ancestry_id) {
			mixed_ancestry_choices = undefined;
			return;
		}

		mixed_ancestry_choices = nextChoices;
	}
</script>

{#snippet mixed_ancestry_selectors(textSizeClass: string, gapClass: string)}
	{#if enable_mixed_ancestry && card.is_mixed_ancestry}
		<div class={cn('flex flex-col gap-1', gapClass)}>
			<Select.Root
				{disabled}
				type="single"
				value={mixed_ancestry_choices?.top_ancestry_id || ''}
				onValueChange={(value) => updateMixedAncestryChoice('top', value)}
			>
				<Select.Trigger
					highlighted={!mixed_ancestry_choices?.top_ancestry_id}
					class={cn(
						'w-full border-black/30 bg-white font-medium text-background hover:bg-black/10 data-[placeholder]:text-muted [&_svg:not([class*="text-"])]:text-muted',
						textSizeClass
					)}
				>
					<p class="truncate">
						{mixed_ancestry_choices?.top_ancestry_id
							? selectedTopAncestryLabel || 'Unknown'
							: 'Select top ancestry feature'}
					</p>
				</Select.Trigger>
				<Select.Content class="rounded-md" align="start">
					<div class="p-2">
						<Select.Item
							value=""
							class="justify-center font-bold text-destructive hover:cursor-pointer"
						>
							-- Clear selection --
						</Select.Item>
						{#each mixedAncestryOptions as option}
							<Select.Item value={option.value} class="hover:cursor-pointer">
								{option.label}
							</Select.Item>
						{/each}
					</div>
				</Select.Content>
			</Select.Root>

			<Select.Root
				{disabled}
				type="single"
				value={mixed_ancestry_choices?.bottom_ancestry_id || ''}
				onValueChange={(value) => updateMixedAncestryChoice('bottom', value)}
			>
				<Select.Trigger
					highlighted={!mixed_ancestry_choices?.bottom_ancestry_id}
					class={cn(
						'w-full border-black/30 bg-white font-medium text-background hover:bg-black/10 data-[placeholder]:text-muted [&_svg:not([class*="text-"])]:text-muted',
						textSizeClass
					)}
				>
					<p class="truncate">
						{mixed_ancestry_choices?.bottom_ancestry_id
							? selectedBottomAncestryLabel || 'Unknown'
							: 'Select bottom ancestry feature'}
					</p>
				</Select.Trigger>
				<Select.Content class="rounded-md" align="start">
					<div class="p-2">
						<Select.Item
							value=""
							class="justify-center font-bold text-destructive hover:cursor-pointer"
						>
							-- Clear selection --
						</Select.Item>
						{#each mixedAncestryOptions as option}
							<Select.Item value={option.value} class="hover:cursor-pointer">
								{option.label}
							</Select.Item>
						{/each}
					</div>
				</Select.Content>
			</Select.Root>
		</div>
	{/if}
{/snippet}

{#if variant === 'responsive'}
	<div
		class={cn(
			'flex overflow-hidden rounded-xl border-2 border-[#fde07d] bg-white text-black',
			className
		)}
	>
		<!-- image -->
		<div class="max-w-[180px] min-w-[60px] flex-1 border-r-2 border-[#fde07d]">
			<img
				src={card.image_url || '/images/art/placeholder-art.webp'}
				alt="art"
				class="h-full w-full object-cover"
			/>
		</div>

		<!-- content -->
		<div class="flex flex-2 flex-col gap-2 px-3 py-2">
			<!-- title and community label -->
			<div class="relative flex justify-between gap-2">
				<p class="font-eveleth uppercase">
					{card.title}
				</p>

				<div class="h-min rounded bg-[#fde07d] px-2 py-1 shadow-md">
					<p class=" text-xs font-bold tracking-[2px] text-black uppercase">Ancestry</p>
				</div>
			</div>

			<!-- description -->
			<p class="text-xs italic">
				{@html renderMarkdown(card.description_html)}
			</p>

			<!-- mixed ancestry selectors -->
			{@render mixed_ancestry_selectors('text-xs', 'gap-2')}

			<!-- features -->
			{#each card.features as feature}
				<p class="text-xs">
					<b><em>{feature.title}:</em></b>
					{@html renderMarkdown(feature.description_html)}
				</p>
				{#if feature.usage}
					<UsageTracker
						usage={feature.usage}
						{disabled}
						tracker_key={usage_item_id
							? usageKey('ancestry_cards', usage_item_id, feature.usage.id)
							: undefined}
					/>
				{/if}
				{#each feature.pools ?? [] as pool (pool.id)}
					<PoolTracker
						{pool}
						{disabled}
						tracker_key={usage_item_id
							? usageKey('ancestry_cards', usage_item_id, pool.id)
							: undefined}
					/>
				{/each}
			{/each}

			<!-- options & tokens -->
			<CardOptions
				{card}
				bind:choices
				bind:tokens
				{enable_choices}
				{enable_tokens}
				{experiences}
				{disabled}
			/>

			{@render children?.()}
		</div>
	</div>
{:else if variant === 'card'}
	<div
		class={cn('max-w-[360px] min-w-[140px] text-left', className)}
		style="height: {(clientWidth * 503) / 360}px;"
		bind:clientWidth
	>
		<div
			class="flex h-[503px] w-[360px] flex-col overflow-hidden rounded-[24px] border-[4px] border-[#fde07d] bg-white transition-none"
			style="transform: scale({clientWidth / 360}); transform-origin: top left;"
		>
			<!-- image and divider -->
			<div
				class="relative -mb-[30px] max-h-[55%] grow"
				style="background-image: url({card.image_url ||
					'/images/art/placeholder-art.webp'}); background-size: cover; background-position: center;"
			>
				<img
					src="/images/card/dividers/ancestry-divider.png"
					alt="divider"
					class="absolute bottom-0 left-0 w-full object-cover"
				/>
				<p
					class="absolute right-[15px] bottom-[5px] text-[12px] leading-none font-bold tracking-[2px] text-black uppercase"
				>
					Ancestry
				</p>
			</div>

			<!-- content -->
			<div class="flex shrink-0 flex-col gap-[6px] px-[12px] pt-[14px] pb-[6px]">
				<p class="z-5 max-w-[70%] font-eveleth text-[26px] leading-none text-black uppercase">
					{card.title}
				</p>
				<p class="text-[12px] text-black italic">
					{@html renderMarkdown(card.description_html)}
				</p>

				<!-- mixed ancestry selectors -->
				{@render mixed_ancestry_selectors('text-[12px]', 'gap-[6px]')}

				{#each card.features as feature}
					<p class="text-[12px] text-black">
						<b><em>{feature.title}:</em></b>
						{@html renderMarkdown(feature.description_html)}
					</p>
					{#if feature.usage}
						<UsageTracker
							usage={feature.usage}
							{disabled}
							tracker_key={usage_item_id
								? usageKey('ancestry_cards', usage_item_id, feature.usage.id)
								: undefined}
						/>
					{/if}
					{#each feature.pools ?? [] as pool (pool.id)}
						<PoolTracker
							{pool}
							{disabled}
							tracker_key={usage_item_id
								? usageKey('ancestry_cards', usage_item_id, pool.id)
								: undefined}
						/>
					{/each}
				{/each}

				<!-- options & tokens -->
				<CardOptions
					{card}
					bind:choices
					bind:tokens
					{enable_choices}
					{enable_tokens}
					{experiences}
					{disabled}
				/>
			</div>

			<!-- credits -->
			<div class="mt-auto flex shrink-0 items-end px-3 pb-2 leading-none">
				<img
					src="/images/card/quill-icon.png"
					alt="quill"
					class={cn('size-[14px]', card.artist_name.trim() === '' && 'hidden')}
				/>
				<p class="grow text-[9px] text-black italic">{card.artist_name}</p>
				<p class="px-[2px] text-[8px] text-black text-muted-foreground italic">
					Daggerheart™ Compatible. Terms at Daggerheart.com
				</p>
				<img src="/images/card/cgl-logo.svg" alt="CGL" class="size-[16px]" />
			</div>
		</div>
	</div>
{/if}
