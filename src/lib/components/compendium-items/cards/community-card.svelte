<script lang="ts">
	import type { CompendiumContent, CommunityCard } from '@domain/schemas/compendium';
	import { cn } from '$lib/utils';
	import { renderMarkdown } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { CardChoices } from '@domain/schemas/rules';
	import CardOptions from './card-options.svelte';
	import CommunityCardFields from './community-card-fields.svelte';

	let {
		card,
		choices = $bindable(),
		tokens = $bindable(),
		field_values = [],
		on_field_values_change = () => {},
		experiences = [],
		enable_choices = false,
		enable_tokens = false,
		enable_fields = false,
		// usually not needed:
		disabled = false,
		class: className = '',
		variant = 'responsive',
		children
	}: {
		card: CommunityCard;
		choices?: CardChoices;
		tokens?: number;
		field_values?: string[];
		on_field_values_change?: (values: string[]) => void;
		enable_choices?: boolean;
		enable_tokens?: boolean;
		enable_fields?: boolean;
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
					<p class=" text-xs font-bold tracking-[2px] text-black uppercase">Community</p>
				</div>
			</div>

			<!-- description -->
			<p class="text-xs italic">
				{@html renderMarkdown(card.description_html)}
			</p>

			<!-- features -->
			{#each card.features as feature}
				<p class="text-xs">
					<b><em>{feature.title}:</em></b>
					{@html renderMarkdown(feature.description_html)}
				</p>
			{/each}

			{#if enable_fields && card.field_group}
				<CommunityCardFields
					label={card.field_group.name}
					count={card.field_group.count}
					values={field_values}
					onchange={on_field_values_change}
					{disabled}
				/>
			{/if}

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
				class="relative max-h-[55%] shrink grow"
				style="background-image: url({card.image_url ||
					'/images/art/placeholder-art.webp'}); background-size: cover; background-position: center;"
			>
				<img
					src="/images/card/dividers/communities-divider.webp"
					alt="divider"
					class="absolute bottom-0 left-0 w-full object-cover"
				/>
				<p
					class="absolute right-[36px] bottom-[24px] text-[10px] leading-none font-medium tracking-[2px] text-black uppercase"
				>
					Community
				</p>
			</div>

			<!-- content -->
			<div class="flex shrink-0 flex-col gap-[6px] px-[12px] pt-[14px] pb-[6px]">
				<p class="z-5 font-eveleth text-[26px] leading-none text-black uppercase">{card.title}</p>
				<p class="text-[12px] text-black italic">
					{@html renderMarkdown(card.description_html)}
				</p>
				{#each card.features as feature}
					<p class="text-[12px] text-black">
						<b><em>{feature.title}:</em></b>
						{@html renderMarkdown(feature.description_html)}
					</p>
				{/each}

				{#if enable_fields && card.field_group}
					<CommunityCardFields
						label={card.field_group.name}
						count={card.field_group.count}
						values={field_values}
						onchange={on_field_values_change}
						{disabled}
						compact
					/>
				{/if}

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
