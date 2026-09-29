<script lang="ts">
	import type { CompendiumContent, DomainCard } from '@domain/schemas/compendium';
	import { cn } from '$lib/utils';
	import { renderMarkdown } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import DomainBanner from '$lib/components/decorations/domain-banner.svelte';
	import type { CardChoices } from '@domain/schemas/rules';
	import CardOptions from './card-options.svelte';
	import UsageTracker from '$lib/components/character-sheet/features/usage-tracker.svelte';
	import PoolTracker from '$lib/components/character-sheet/features/pool-tracker.svelte';
	import RecordSummary from '$lib/components/character-sheet/features/record-summary.svelte';
	import { usageKey } from '$lib/state/feature-usage';

	let {
		card,
		compendium,
		choices = $bindable(),
		tokens = $bindable(),
		enable_choices = false,
		enable_tokens = false,
		usage_item_id,
		experiences = [],
		disabled = false,
		class: className = '',
		variant = 'responsive',
		children
	}: {
		card: DomainCard;
		compendium: CompendiumContent;
		choices?: CardChoices;
		tokens?: number;
		enable_choices?: boolean;
		enable_tokens?: boolean;
		/** Id of the owning item on the character's sheet; enables usage trackers. */
		usage_item_id?: string;
		disabled?: boolean;
		experiences?: string[];
		variant?: 'responsive' | 'card';
		class?: string;
		children?: Snippet;
	} = $props();

	let clientWidth = $state(360);
</script>

{#if variant === 'responsive'}
	<div
		class={cn(
			'flex overflow-hidden rounded-xl border-2 border-[#fde07d] bg-white text-left text-black',
			className
		)}
	>
		<!-- image -->
		<div class="relative max-w-[180px] min-w-[60px] flex-1 border-r-2 border-[#fde07d]">
			<!-- banner -->
			{#if card.domain_id}
				<div class="absolute left-1 shrink-0">
					<DomainBanner
						{compendium}
						domain_id={card.domain_id}
						level_requirement={card.level_requirement}
						style="zoom: 0.75"
					/>
				</div>
			{/if}

			<img
				src={card.image_url || '/images/art/placeholder-art.webp'}
				alt="art"
				class="h-full object-cover"
			/>
		</div>

		<!-- content -->
		<div class="flex flex-2 flex-col gap-2 px-3 py-2">
			<!-- title and community label -->
			<div class="relative flex flex-row-reverse flex-wrap justify-between gap-2">
				<div class="mr-auto">
					<div class="mr-8 h-min rounded bg-[#fde07d] px-2 py-1 shadow-md">
						<p class="text-xs font-bold tracking-[2px] text-black uppercase">{card.category}</p>
					</div>
				</div>

				<div
					class={cn(
						'absolute -top-2 -right-3  size-9.5 scale-90 rounded-full border-2 border-[#fde07d] bg-gray-800 text-white shadow-lg',
						card.recall_cost > 9 && 'size-12'
					)}
				>
					<div
						class="flex size-full items-center justify-center rounded-full border border-gray-500 pb-0.5"
					>
						<p class="pt-1 pl-1 text-right text-lg font-medium">{card.recall_cost}</p>
						<svg
							stroke="currentColor"
							fill="currentColor"
							stroke-width="0"
							viewBox="0 0 16 16"
							class="size-3 shrink-0"
							height="1em"
							width="1em"
							xmlns="http://www.w3.org/2000/svg"
							><path
								d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"
							></path></svg
						>
					</div>
				</div>

				<p class="grow font-eveleth text-wrap uppercase">
					{card.title}
				</p>
			</div>

			<!-- features -->
			{#each card.features as feature}
				<div class="flex flex-col gap-2 text-xs">
					{@html renderMarkdown(feature.description_html)}
				</div>
				{#if feature.usage}
					<UsageTracker
						usage={feature.usage}
						{disabled}
						tracker_key={usage_item_id
							? usageKey('domain_cards', usage_item_id, feature.usage.id)
							: undefined}
					/>
				{/if}
				{#each feature.pools ?? [] as pool (pool.id)}
					<PoolTracker
						{pool}
						{disabled}
						tracker_key={usage_item_id
							? usageKey('domain_cards', usage_item_id, pool.id)
							: undefined}
					/>
				{/each}
				{#each feature.records ?? [] as record (record.id)}
					<RecordSummary
						{record}
						tracker_key={usage_item_id
							? usageKey('domain_cards', usage_item_id, record.id)
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

			<!-- optional children -->
			{@render children?.()}
		</div>
	</div>
{:else if variant === 'card'}
	<div
		class={cn('max-w-[360px] min-w-[140px]', className)}
		style="height: {(clientWidth * 503) / 360}px;"
		bind:clientWidth
	>
		<div
			class="flex h-[503px] w-[360px] flex-col overflow-hidden rounded-[24px] border-[4px] border-[#fde07d] bg-white text-left transition-none"
			style="transform: scale({clientWidth / 360}); transform-origin: top left;"
		>
			<!-- image and divider -->
			<div
				class="relative max-h-[55%] grow"
				style="background-image: url({card.image_url ||
					'/images/art/placeholder-art.webp'}); background-size: cover; background-position: center;"
			>
				<img
					src="/images/card/dividers/domain-divider.png"
					alt="divider"
					class="absolute bottom-0 left-0 z-4 w-full object-cover"
				/>
				{#if card.domain_id}
					<DomainBanner
						{compendium}
						domain_id={card.domain_id}
						level_requirement={card.level_requirement}
						class="absolute -top-[9px] left-[14px] w-[75px]"
					/>
				{/if}
				<div
					class={cn(
						'absolute top-[16px]  right-[16px] size-[38px] scale-90 rounded-full border-2 border-[#fde07d] bg-gray-800 text-white',
						card.recall_cost > 9 && 'size-[48px]'
					)}
				>
					<div
						class="flex size-full items-center justify-center rounded-full border border-gray-500 pb-[2px]"
					>
						<p class="pt-[4px] pl-[4px] text-right text-[18px] font-medium">{card.recall_cost}</p>
						<svg
							stroke="currentColor"
							fill="currentColor"
							stroke-width="0"
							viewBox="0 0 16 16"
							class="size-[12px] shrink-0"
							xmlns="http://www.w3.org/2000/svg"
							><path
								d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"
							></path></svg
						>
					</div>
				</div>
				{#if card.domain_id && compendium.domains[card.domain_id]}
					{@const domain = compendium.domains[card.domain_id]}
					<div
						style="background: {domain.color};"
						class="clip-card-type absolute bottom-[3px] left-[111px] h-[23px] w-[135px]"
					></div>
					<p
						style="color: {domain.foreground_color};"
						class="absolute bottom-[8px] left-[180px] z-5 -translate-x-1/2 text-[12px] leading-none font-bold uppercase"
					>
						{card.category}
					</p>
				{/if}
			</div>

			<!-- content -->
			<div
				class="z-5 -mt-[2px] flex shrink-0 flex-col gap-[12px] bg-white px-[12px] pt-[16px] pb-[6px]"
			>
				<p class="text-center font-eveleth text-[20px] leading-none text-black uppercase">
					{card.title}
				</p>

				{#each card.features as feature}
					<div class="flex flex-col gap-[12px] text-[12px] text-black">
						{@html renderMarkdown(feature.description_html)}
					</div>
					{#if feature.usage}
						<UsageTracker
							usage={feature.usage}
							{disabled}
							tracker_key={usage_item_id
								? usageKey('domain_cards', usage_item_id, feature.usage.id)
								: undefined}
						/>
					{/if}
					{#each feature.pools ?? [] as pool (pool.id)}
						<PoolTracker
							{pool}
							{disabled}
							tracker_key={usage_item_id
								? usageKey('domain_cards', usage_item_id, pool.id)
								: undefined}
						/>
					{/each}
					{#each feature.records ?? [] as record (record.id)}
						<RecordSummary
							{record}
							tracker_key={usage_item_id
								? usageKey('domain_cards', usage_item_id, record.id)
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

	<style>
		.clip-card-type {
			clip-path: polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%);
		}
	</style>
{/if}
