<script lang="ts">
	import type {
		DomainCard,
		AncestryCard,
		SubclassCard,
		CommunityCard
	} from '@domain/schemas/compendium';
	import { cn } from '$lib/utils';
	import DomainBanner from '$lib/components/decorations/domain-banner.svelte';
	import ChoiceSelect from '$lib/components/utility/choice-select.svelte';
	import ExperienceSelect from '$lib/components/utility/experience-select.svelte';

	import type { CardChoices } from '@domain/schemas/rules';

	let {
		card,
		choices = $bindable(),
		tokens = $bindable(),
		experiences,
		disabled = false,
		enable_choices = false,
		enable_tokens = false,
		token_max,
		class: className = ''
	}: {
		card: DomainCard | AncestryCard | SubclassCard | CommunityCard;
		choices?: CardChoices;
		tokens?: number;
		disabled?: boolean;
		enable_choices?: boolean;
		enable_tokens?: boolean;
		token_max?: number;
		experiences?: string[];
		class?: string;
	} = $props();

	const maxTokens = $derived(Math.max(1, Math.min(99, token_max ?? card.token_max ?? 99)));
	const tokenLabel = $derived(card.token_label ?? 'Tokens');

	$effect(() => {
		if (!enable_choices || !(card.options && card.options.length > 0)) return;

		const nextChoices: CardChoices = choices ? { ...choices } : {};
		let changed = !choices;

		for (const option of card.options) {
			if (!nextChoices[option.choice_id]) {
				nextChoices[option.choice_id] = [];
				changed = true;
			}
		}

		if (changed) {
			choices = nextChoices;
		}
	});
</script>

<div class={cn('flex flex-col gap-2', className)}>
	<!-- options -->
	{#if enable_choices && choices && card.options && card.options.length > 0}
		{#each card.options as option}
			{@const conditional_choice_id = option.conditional_choice?.choice_id ?? null}
			{@const conditional_selection_id = option.conditional_choice?.selection_id ?? null}

			{#if choices[option.choice_id]}
				{@const conditionalMet =
					option.conditional_choice === null ||
					(conditional_choice_id &&
						conditional_selection_id &&
						choices[conditional_choice_id] &&
						choices[conditional_choice_id].includes(conditional_selection_id))}
				{@const modifierUnconditionalForThisChoice = card.features.some((f) =>
					f.character_modifiers.some(
						(m) =>
							m.target === 'experience_from_card_choice_selection' &&
							(m as { choice_id?: string }).choice_id === option.choice_id &&
							!(m.character_conditions || []).some((c) => c.type === 'card_choice')
					)
				)}
				{#if conditionalMet || modifierUnconditionalForThisChoice}
					{#if option.type === 'arbitrary'}
						{#if choices[option.choice_id]}
							<ChoiceSelect
								{disabled}
								class="w-full border-black/30 bg-white font-medium text-background hover:bg-black/10 data-[placeholder]:text-muted [&_svg:not([class*='text-'])]:text-muted"
								bind:selected_ids={choices[option.choice_id]}
								max={option.max}
								options={option.options}
							/>
						{/if}
					{:else if option.type === 'experience'}
						{#if choices[option.choice_id]}
							<!-- <ExperienceSelect
								{disabled}
								class="w-full border-black/30 bg-white font-medium text-background hover:bg-black/10 data-[placeholder]:text-muted [&_svg:not([class*='text-'])]:text-muted"
								bind:selected_experiences={choices[option.choice_id]}
								{experiences}
							/> -->
							<ChoiceSelect
								{disabled}
								class="w-full border-black/30 bg-white font-medium text-background hover:bg-black/10 data-[placeholder]:text-muted [&_svg:not([class*='text-'])]:text-muted"
								bind:selected_ids={choices[option.choice_id]}
								max={option.max}
								options={(experiences ?? []).map((exp, i) => {
									return {
										selection_id: i.toString(),
										title: exp,
										short_title: exp
									};
								})}
								term="Experience"
								term_plural="Experiences"
							/>
						{/if}
					{/if}
				{:else}
					<!-- conditional choice not met -->
				{/if}
			{/if}
		{/each}
	{/if}

	<!-- Tokens -->
	{#if enable_tokens && card.tokens_enabled}
		<div class="flex flex-wrap items-center justify-center gap-2" aria-label={tokenLabel}>
			<span class="w-full text-center text-xs font-bold text-black">{tokenLabel}</span>
			<!-- Minus Button -->
			{#if !disabled}
				<button
					type="button"
					onclick={(event) => {
						event.stopPropagation();
						const current = tokens ?? 0;
						tokens = Math.max(0, current - 1);
					}}
					disabled={(tokens ?? 0) === 0}
					class="flex size-7 items-center justify-center rounded-full bg-red-500 text-lg font-bold text-white shadow-md transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-300"
					aria-label="Decrease token count"
				>
					−
				</button>
			{/if}
			<!-- Coin Stack -->
			<div class="relative flex items-center justify-center">
				<!-- Stack of coins (background coins) -->
				<div class="relative h-12 w-12">
					<!-- Bottom coin -->
					<div
						class="absolute inset-0 rounded-full border-2 border-yellow-700 bg-gradient-to-b from-yellow-400 to-yellow-600"
						style="transform: translate(2px, 4px);"
					></div>
					<!-- Middle coin -->
					<div
						class="absolute inset-0 rounded-full border-2 border-yellow-700 bg-gradient-to-b from-yellow-400 to-yellow-600"
						style="transform: translate(1px, 2px);"
					></div>
					<!-- Top coin with number -->
					<div
						class="absolute inset-0 flex items-center justify-center rounded-full border-2 border-yellow-700 bg-gradient-to-b from-yellow-300 to-yellow-500 shadow-lg"
					>
						<span class="text-sm font-bold text-yellow-900 drop-shadow-sm">
							{tokens ?? 0}
						</span>
					</div>
				</div>
			</div>

			<!-- Plus Button -->
			{#if !disabled}
				<button
					type="button"
					onclick={(event) => {
						event.stopPropagation();
						const current = tokens ?? 0;
						tokens = Math.min(maxTokens, current + 1);
					}}
					disabled={(tokens ?? 0) >= maxTokens}
					class="flex size-7 items-center justify-center rounded-full bg-green-500 text-lg font-bold text-white shadow-md transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-300"
					aria-label="Increase token count"
				>
					+
				</button>
			{/if}
		</div>
	{/if}
</div>
