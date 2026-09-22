<script lang="ts">
	import type { CompendiumContent } from '@domain/schemas/compendium';
	import { cn } from '$lib/utils';
	import { onMount, tick } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import AncestryCardComponent from '$lib/components/compendium-items/cards/ancestry-card.svelte';
	import CommunityCardComponent from '$lib/components/compendium-items/cards/community-card.svelte';
	import DomainCardComponent from '$lib/components/compendium-items/cards/domain-card.svelte';
	import SubclassCardComponent from '$lib/components/compendium-items/cards/subclass-card.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { getLocalstorageContext } from '$lib/state/localstorage.svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronFirst from '@lucide/svelte/icons/chevron-first';
	import ChevronLast from '@lucide/svelte/icons/chevron-last';
	import type { CardChoices, Card } from '@domain/schemas/rules';

	const localstorageCtx = getLocalstorageContext();
	const isSmall = new MediaQuery('max-width: 639px');

	let {
		class: className = '',
		cards,
		tokens = $bindable({}),
		field_values = $bindable({}),
		choices = $bindable({}),
		enable_choices = false,
		enable_tokens = false,
		enable_fields = false,
		enable_mixed_ancestry = false,
		mixed_ancestry_choices = $bindable({}),
		experiences,
		compendium,
		cardWidth = 266,
		selectedIndex = $bindable(0),
		disabled_indices = new Set<number>(),
		highlighted_indices = new Set<number>(),
		storageKey,

		emptyMessage = '',
		disabled = false
	}: {
		cards: Card[];
		compendium: CompendiumContent;
		tokens?: Record<string, number>;
		field_values?: Record<string, string[]>;
		choices?: Record<string, CardChoices>;
		experiences?: string[];
		mixed_ancestry_choices?: Record<
			string,
			{
				top_ancestry_id?: string;
				bottom_ancestry_id?: string;
			}
		>;
		disabled?: boolean;
		enable_choices?: boolean;
		enable_tokens?: boolean;
		enable_fields?: boolean;
		enable_mixed_ancestry?: boolean;
		cardWidth?: number;
		selectedIndex?: number;
		disabled_indices?: Set<number>;
		highlighted_indices?: Set<number>;
		storageKey?: string;
		class?: string;
		emptyMessage?: string;
	} = $props();

	let scrollContainer: HTMLDivElement;
	let containerWidth: number = $state(null!);
	let isShiftPressed = $state(false);
	let isHovered = $state(false);
	let dialogOpen = $state(false);
	let hasRestoredPersistedScroll = $state(false);
	let isScrollPersistenceReady = $state(false);
	let isPointerDown = $state(false);
	let isAutoSnapping = false;
	let scrollSettleTimeout: ReturnType<typeof setTimeout> | null = null;

	function setFieldValues(cardId: string, values: string[]) {
		field_values = { ...field_values, [cardId]: values };
	}

	function getMaxScrollLeft() {
		return Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
	}

	function syncSelectedIndexFromScroll() {
		if (cards.length === 0) {
			selectedIndex = -1;
			return;
		}

		const i = Math.round(scrollContainer.scrollLeft / cardWidth);
		selectedIndex = Math.max(Math.min(i, cards.length - 1), 0);
	}

	function clearScrollSettleTimeout() {
		if (scrollSettleTimeout !== null) {
			clearTimeout(scrollSettleTimeout);
			scrollSettleTimeout = null;
		}
	}

	function snapToNearestCard(behavior: ScrollBehavior = 'smooth') {
		if (!scrollContainer || cards.length === 0 || isAutoSnapping) return;

		const targetIndex = Math.max(
			0,
			Math.min(Math.round(scrollContainer.scrollLeft / cardWidth), cards.length - 1)
		);
		const targetScrollLeft = Math.max(0, Math.min(targetIndex * cardWidth, getMaxScrollLeft()));

		if (Math.abs(scrollContainer.scrollLeft - targetScrollLeft) < 1) {
			selectedIndex = targetIndex;
			return;
		}

		isAutoSnapping = true;
		scrollToCard(targetIndex, behavior);
		selectedIndex = targetIndex;

		requestAnimationFrame(() => {
			isAutoSnapping = false;
		});
	}

	function scheduleSnapToNearestCard(delay = 120) {
		if (!scrollContainer || cards.length <= 1 || isPointerDown || dialogOpen) return;

		clearScrollSettleTimeout();
		scrollSettleTimeout = setTimeout(() => {
			scrollSettleTimeout = null;
			snapToNearestCard();
		}, delay);
	}

	function handleScroll() {
		syncSelectedIndexFromScroll();

		if (storageKey && isScrollPersistenceReady) {
			localstorageCtx.app_preferences.card_carousel_scroll_position[storageKey] =
				scrollContainer.scrollLeft;
			localstorageCtx.app_preferences.card_carousel_selected_index[storageKey] = selectedIndex;
		}

		scheduleSnapToNearestCard();
	}

	function handlePointerDown() {
		isPointerDown = true;
		clearScrollSettleTimeout();
	}

	function handlePointerRelease() {
		isPointerDown = false;
		scheduleSnapToNearestCard(80);
	}

	function scrollElementIntoCarousel(
		targetButton: HTMLButtonElement,
		behavior: ScrollBehavior = 'smooth'
	) {
		if (!scrollContainer) return;

		const targetLeft =
			targetButton.offsetLeft - (scrollContainer.clientWidth - targetButton.offsetWidth) / 2;

		scrollContainer.scrollTo({
			left: Math.max(0, Math.min(targetLeft, getMaxScrollLeft())),
			behavior
		});
	}

	function scrollToCard(index: number, behavior: ScrollBehavior = 'smooth') {
		if (index < 0 || index >= cards.length || !scrollContainer) return;
		// Find the card button at the target index and scroll the carousel horizontally to center it.
		const cardButtons = scrollContainer.querySelectorAll('button.snap-center');
		const targetButton = cardButtons[index] as HTMLButtonElement | undefined;

		if (targetButton) {
			scrollElementIntoCarousel(targetButton, behavior);
		}
	}

	function navigate(direction: 'next' | 'previous', useShift: boolean = false) {
		if (useShift) {
			scrollToCard(direction === 'next' ? cards.length - 1 : 0);
		} else {
			const targetIndex = direction === 'next' ? selectedIndex + 1 : selectedIndex - 1;
			if (targetIndex >= 0 && targetIndex < cards.length) {
				scrollToCard(targetIndex);
			}
		}
	}

	function scrollToPrevious(event?: MouseEvent) {
		navigate('previous', event?.shiftKey ?? false);
	}

	function scrollToNext(event?: MouseEvent) {
		navigate('next', event?.shiftKey ?? false);
	}

	let canScrollLeft = $derived(cards.length > 1 && selectedIndex > 0);
	let canScrollRight = $derived(cards.length > 1 && selectedIndex < cards.length - 1);

	function handleKeyDown(event: KeyboardEvent) {
		if (event.shiftKey) {
			isShiftPressed = true;
		}

		if (!isHovered) return;

		const isArrowRight = event.key === 'ArrowRight';
		const isArrowLeft = event.key === 'ArrowLeft';

		if (isArrowRight || isArrowLeft) {
			event.preventDefault();
			event.stopPropagation();
			navigate(isArrowRight ? 'next' : 'previous', event.shiftKey);
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (event.key === 'Shift' || !event.shiftKey) {
			isShiftPressed = false;
		}
	}

	function handleCardClick(event: MouseEvent, index: number) {
		const target = event.target as HTMLElement;
		const closestButton = target?.closest('button');

		// If there's an interactive button that's not the card button itself, ignore it
		if (closestButton && closestButton !== event.currentTarget) {
			return;
		}

		if (index === selectedIndex) {
			dialogOpen = true;
			return;
		}
		const el = event.currentTarget as HTMLButtonElement;
		if (isSmall.current) {
			el.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
				inline: 'center'
			});
			return;
		}

		scrollElementIntoCarousel(el);
	}

	$effect(() => {
		storageKey;
		hasRestoredPersistedScroll = false;
		isScrollPersistenceReady = !storageKey;
	});

	$effect(() => {
		storageKey;
		cards.length;
		containerWidth;

		if (!storageKey) return;
		if (hasRestoredPersistedScroll || !scrollContainer || cards.length === 0) return;

		const restoreScroll = async () => {
			await tick();
			requestAnimationFrame(() => {
				if (!scrollContainer) return;

				const savedSelectedIndex =
					localstorageCtx.app_preferences.card_carousel_selected_index[storageKey];
				const savedScrollLeft =
					localstorageCtx.app_preferences.card_carousel_scroll_position[storageKey];

				if (
					savedSelectedIndex !== undefined &&
					savedSelectedIndex >= 0 &&
					savedSelectedIndex < cards.length
				) {
					scrollToCard(savedSelectedIndex, 'auto');
				} else if (savedScrollLeft !== undefined) {
					scrollContainer.scrollLeft = Math.max(0, Math.min(savedScrollLeft, getMaxScrollLeft()));
				}

				syncSelectedIndexFromScroll();
				hasRestoredPersistedScroll = true;
				isScrollPersistenceReady = true;
			});
		};

		void restoreScroll();
	});

	onMount(() => {
		scrollContainer?.addEventListener('scroll', handleScroll);
		scrollContainer?.addEventListener('pointerdown', handlePointerDown);
		scrollContainer?.addEventListener('pointerup', handlePointerRelease);
		scrollContainer?.addEventListener('pointercancel', handlePointerRelease);
		scrollContainer?.addEventListener('touchstart', handlePointerDown);
		scrollContainer?.addEventListener('touchend', handlePointerRelease);
		scrollContainer?.addEventListener('touchcancel', handlePointerRelease);
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			clearScrollSettleTimeout();
			scrollContainer?.removeEventListener('scroll', handleScroll);
			scrollContainer?.removeEventListener('pointerdown', handlePointerDown);
			scrollContainer?.removeEventListener('pointerup', handlePointerRelease);
			scrollContainer?.removeEventListener('pointercancel', handlePointerRelease);
			scrollContainer?.removeEventListener('touchstart', handlePointerDown);
			scrollContainer?.removeEventListener('touchend', handlePointerRelease);
			scrollContainer?.removeEventListener('touchcancel', handlePointerRelease);
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	});
</script>

<div
	class="relative"
	role="region"
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
>
	<div
		bind:this={scrollContainer}
		bind:clientWidth={containerWidth}
		class={cn(
			'snap-x-mandatory relative flex snap-x items-center overflow-x-auto overflow-y-hidden py-2',
			className
		)}
		style="scrollbar-width:none;"
	>
		<div
			class="h-2 shrink-0 snap-align-none"
			style="width: {(containerWidth - cardWidth) / 2}px;"
		></div>

		{#each cards as card, index}
			<button
				class={cn(
					'transition-scale relative scale-95 snap-center [scroll-snap-stop:always] rounded-2xl duration-200',
					selectedIndex === index && 'scale-100',
					disabled_indices.has(index) && 'opacity-50'
				)}
				style="width: {cardWidth}px;"
				onclick={(e) => handleCardClick(e, index)}
			>
				<span
					class="absolute inset-0 rounded-2xl"
					style={cn(
						`width: ${cardWidth}px;`,
						highlighted_indices.has(index) &&
							'outline-offset: 2px; outline-width: 4px; outline-color: var(--primary); outline-style: solid;'
					)}
				></span>
				{#if card.type === 'domain_card'}
					<DomainCardComponent
						card={card.card}
						variant="card"
						{compendium}
						{disabled}
						{experiences}
						{enable_choices}
						{enable_tokens}
						bind:choices={choices[card.id]}
						bind:tokens={tokens[card.id]}
					/>
				{:else if card.type === 'ancestry_card'}
					<AncestryCardComponent
						card={card.card}
						variant="card"
						{compendium}
						{disabled}
						{experiences}
						{enable_choices}
						{enable_tokens}
						{enable_mixed_ancestry}
						bind:mixed_ancestry_choices={mixed_ancestry_choices[card.id]}
						bind:choices={choices[card.id]}
						bind:tokens={tokens[card.id]}
					/>
				{:else if card.type === 'community_card'}
					<CommunityCardComponent
						card={card.card}
						variant="card"
						{disabled}
						{experiences}
						{enable_choices}
						{enable_tokens}
						{enable_fields}
						bind:choices={choices[card.id]}
						bind:tokens={tokens[card.id]}
						field_values={field_values[card.id] ?? []}
						on_field_values_change={(values) => setFieldValues(card.id, values)}
					/>
				{:else if card.type === 'subclass_card'}
					<SubclassCardComponent
						card={card.card}
						variant="card"
						{compendium}
						{disabled}
						{experiences}
						{enable_choices}
						{enable_tokens}
						bind:choices={choices[card.id]}
						bind:tokens={tokens[card.id]}
					/>
				{/if}
			</button>
		{/each}

		{#if cards.length === 0}
			<div
				class="relative flex snap-center snap-always items-center justify-center rounded-2xl border-4 border-dotted border-muted"
				style="width: {cardWidth}px; height: {(cardWidth * 503) / 360}px;"
			>
				<p class="text-center font-eveleth text-lg text-muted">{emptyMessage}</p>
			</div>
		{/if}

		<div
			class="h-2 shrink-0 snap-align-none"
			style="width: {(containerWidth - cardWidth) / 2}px;"
		></div>
	</div>

	<div
		class="pointer-events-none absolute top-1/2 right-0 left-0 flex -translate-y-1/2 justify-center"
	>
		<div class="flex max-w-4xl grow items-center justify-between px-4 sm:px-8">
			<Button
				class="pointer-events-auto mr-auto size-10 rounded-full"
				hidden={!canScrollLeft}
				onclick={(e) => scrollToPrevious(e)}
			>
				{#if isShiftPressed}
					<ChevronFirst class="-ml-[1px] size-6" />
				{:else}
					<ChevronLeft class="-ml-[1px] size-6" />
				{/if}
			</Button>
			<Button
				class="pointer-events-auto ml-auto size-10 rounded-full"
				hidden={!canScrollRight}
				onclick={(e) => scrollToNext(e)}
			>
				{#if isShiftPressed}
					<ChevronLast class="-mr-[1px] size-6" />
				{:else}
					<ChevronRight class="-mr-[1px] size-6" />
				{/if}
			</Button>
		</div>
	</div>
</div>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content
		class="w-fit max-w-[90vw] border-none bg-transparent p-0 shadow-none"
		closeClasses="-top-4 -right-4"
	>
		{#if cards[selectedIndex]}
			{@const card = cards[selectedIndex]}
			<div style="width: min(360px, 80vw);">
				{#if card.type === 'domain_card'}
					<DomainCardComponent
						card={card.card}
						variant="card"
						{compendium}
						{disabled}
						{enable_choices}
						{enable_tokens}
						{experiences}
						bind:choices={choices[card.id]}
						bind:tokens={tokens[card.id]}
					/>
				{:else if card.type === 'ancestry_card'}
					<AncestryCardComponent
						card={card.card}
						variant="card"
						{compendium}
						{disabled}
						{experiences}
						{enable_choices}
						{enable_mixed_ancestry}
						{enable_tokens}
						bind:mixed_ancestry_choices={mixed_ancestry_choices[card.id]}
						bind:choices={choices[card.id]}
						bind:tokens={tokens[card.id]}
					/>
				{:else if card.type === 'community_card'}
					<CommunityCardComponent
						card={card.card}
						variant="card"
						{disabled}
						{experiences}
						{enable_choices}
						{enable_tokens}
						{enable_fields}
						bind:choices={choices[card.id]}
						bind:tokens={tokens[card.id]}
						field_values={field_values[card.id] ?? []}
						on_field_values_change={(values) => setFieldValues(card.id, values)}
					/>
				{:else if card.type === 'subclass_card'}
					<SubclassCardComponent
						card={card.card}
						variant="card"
						{compendium}
						{disabled}
						{experiences}
						{enable_choices}
						{enable_tokens}
						bind:choices={choices[card.id]}
						bind:tokens={tokens[card.id]}
					/>
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
