<script lang="ts">
	import type { CompendiumContent, SubclassCard } from '@domain/schemas/compendium';
	import { cn } from '$lib/utils';
	import { renderMarkdown } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import ClassBanner from '$lib/components/decorations/class-banner.svelte';
	import HomebrewBadge from '$lib/components/decorations/badges/homebrew-badge.svelte';
	import type { CardChoices } from '@domain/schemas/rules';
	import CardOptions from './card-options.svelte';

	let {
		card,
		compendium,
		choices = $bindable(),
		tokens = $bindable(),
		enable_choices = false,
		enable_tokens = false,
		token_max,
		experiences = [],
		disabled = false,
		class: className = '',
		variant = 'responsive',
		children
	}: {
		card: SubclassCard;
		compendium: CompendiumContent;
		choices?: CardChoices;
		tokens?: number;
		enable_choices?: boolean;
		enable_tokens?: boolean;
		token_max?: number;
		disabled?: boolean;
		experiences?: string[];
		variant?: 'responsive' | 'card';
		class?: string;
		children?: Snippet;
	} = $props();

	let clientWidth = $state(360);

	const character_class = $derived(card.class_id ? compendium.classes[card.class_id] : undefined);

	const primaryDomain = $derived(
		character_class && character_class.primary_domain_id
			? compendium.domains[character_class.primary_domain_id]
			: undefined
	);
	const secondaryDomain = $derived(
		character_class && character_class.secondary_domain_id
			? compendium.domains[character_class.secondary_domain_id]
			: undefined
	);

	function isHomebrewItem(item: { source_key?: string } | undefined) {
		return item?.source_key === 'Homebrew';
	}
</script>

{#if variant === 'responsive'}
	<div
		class={cn(
			'flex overflow-hidden rounded-xl border-2 border-[#fde07d] bg-white text-black',
			className
		)}
	>
		<!-- image -->
		<div class="max-w-[180px] flex-1 border-r-2 border-[#fde07d]">
			<img
				src={card.image_url || '/images/art/placeholder-art.webp'}
				alt="art"
				class="h-full object-cover"
			/>
		</div>

		<!-- content -->
		<div class="flex flex-2 flex-col gap-2 px-3 py-2">
			<!-- title and type label -->
			<div class="relative flex flex-row-reverse flex-wrap gap-x-2 gap-y-3">
				<div class="mx-auto h-min rounded bg-[#fde07d] px-2 py-1 shadow-md">
					<p class="text-xs font-bold tracking-[2px] text-black uppercase">
						{card.type}
					</p>
				</div>

				<p class="grow font-eveleth uppercase">
					{card.title}
				</p>
			</div>

			<!-- spellcast trait -->
			{#if card.type === 'foundation' && card.spellcast_trait}
				<p class="text-center text-xs">
					<b><em>Spellcast Trait:</em></b>
					{card.spellcast_trait}
				</p>
			{/if}

			<!-- features -->
			{#each card.features as feature}
				<p class="text-xs">
					{@html renderMarkdown(`***${feature.title}:*** ` + feature.description_html)}
				</p>
			{/each}

			<!-- options & tokens -->
			<CardOptions
				{card}
				bind:choices
				bind:tokens
				{enable_choices}
				{enable_tokens}
				{token_max}
				{experiences}
				{disabled}
			/>

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
					src="/images/card/dividers/subclass-divider.png"
					alt="divider"
					class="absolute bottom-0 left-0 z-4 w-full object-cover"
				/>
				{#if character_class}
					<ClassBanner
						{compendium}
						{character_class}
						class="absolute -top-[2px] left-[14px] w-[75px]"
					/>
				{/if}

				<div
					style="background: linear-gradient(to right, {primaryDomain
						? primaryDomain.color
						: '#ffffff'}, {secondaryDomain ? secondaryDomain.color : '#ffffff'});"
					class="clip-card-type absolute bottom-[5px] left-[110px] h-[21px] w-[129px]"
				></div>
				<div
					class="absolute bottom-[9px] left-[175px] z-5 flex max-w-[120px] -translate-x-1/2 items-center gap-1.5 text-[12px] leading-none font-bold text-white uppercase"
				>
					<span class="truncate">{character_class ? character_class.title : 'Unknown'}</span>
					{#if isHomebrewItem(character_class)}
						<HomebrewBadge />
					{/if}
				</div>
			</div>

			<!-- content -->
			<div
				class="z-5 -mt-[2px] flex shrink-0 flex-col gap-[12px] bg-white px-[12px] pt-[16px] pb-[6px]"
			>
				<div class="flex flex-col gap-[4px]">
					<p class="text-center font-eveleth text-[20px] leading-none text-black uppercase">
						{card.title}
					</p>

					<p class="text-center text-[14px] text-black capitalize italic">
						{card.type}
					</p>

					{#if card.type === 'foundation' && card.spellcast_trait}
						<p class="text-center text-[14px] text-black uppercase">
							<b>Spellcast Trait:</b>
							{card.spellcast_trait}
						</p>
					{/if}
				</div>

				{#each card.features as feature}
					<p class="text-[12px] text-black">
						{@html renderMarkdown(`***${feature.title}:*** ` + feature.description_html)}
					</p>
				{/each}

				<!-- options & tokens -->
				<CardOptions
					{card}
					bind:choices
					bind:tokens
					{enable_choices}
					{enable_tokens}
					{token_max}
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
