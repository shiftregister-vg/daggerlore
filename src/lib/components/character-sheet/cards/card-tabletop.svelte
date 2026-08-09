<script lang="ts">
	import {
		dragHandleZone,
		dragHandle,
		type DndEvent,
		SHADOW_PLACEHOLDER_ITEM_ID
	} from 'svelte-dnd-action';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Layers from '@lucide/svelte/icons/layers';
	import Lock from '@lucide/svelte/icons/lock';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Save from '@lucide/svelte/icons/save';
	import TableProperties from '@lucide/svelte/icons/table-properties';
	import Unlock from '@lucide/svelte/icons/unlock';
	import X from '@lucide/svelte/icons/x';
	import AncestryCardComponent from '$lib/components/compendium-items/cards/ancestry-card.svelte';
	import CardOptions from '$lib/components/compendium-items/cards/card-options.svelte';
	import CommunityCardComponent from '$lib/components/compendium-items/cards/community-card.svelte';
	import DomainCardComponent from '$lib/components/compendium-items/cards/domain-card.svelte';
	import SubclassCardComponent from '$lib/components/compendium-items/cards/subclass-card.svelte';
	import BardFeatures from '$lib/components/character-sheet/features/tabs/class-features/bard-features.svelte';
	import FeatureTokens from '$lib/components/character-sheet/features/tabs/class-features/feature-tokens.svelte';
	import GuardianFeatures from '$lib/components/character-sheet/features/tabs/class-features/guardian-features.svelte';
	import SeraphFeatures from '$lib/components/character-sheet/features/tabs/class-features/seraph-features.svelte';
	import WizardFeatures from '$lib/components/character-sheet/features/tabs/class-features/wizard-features.svelte';
	import SimpleContainer from '$lib/components/character-sheet/embelishments/simple-container.svelte';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Switch from '$lib/components/ui/switch/switch.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Stress from '$lib/components/character-sheet/standalone/stress.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { cn, renderMarkdown } from '$lib/utils';
	import type { Card, DomainCardId } from '@domain/schemas/rules';
	import type { CharacterCardLayout } from '@domain/schemas/characters';
	import type { DomainCard } from '@domain/schemas/compendium';

	type DisplayCard = Exclude<Card, { type: 'transformation' }>;

	type CardSpaceItem = DisplayCard & {
		key: string;
		sort: number;
		label: string;
		meta: string;
		source: 'character' | 'loadout';
	};

	type DndItem = {
		id: string;
	};

	type LegacyCardLayoutStack = {
		id: string;
		card_keys: string[];
	};

	let {
		openHeritageCardCatalog = () => {},
		openDomainCardCatalog = () => {}
	}: {
		openHeritageCardCatalog?: () => void;
		openDomainCardCatalog?: () => void;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derivedCharacter = $derived(characterCtx.derived_character_data);

	let viewMode = $state<'cards' | 'summary'>('cards');
	let arranging = $state(false);
	let restMode = $state(false);
	let dialogOpen = $state(false);
	let selectedDialogKey = $state<string | null>(null);
	let tabletopItems = $state<DndItem[]>([]);
	let looseItems = $state<DndItem[]>([]);
	let savedDraft = $state<CharacterCardLayout | undefined>(undefined);
	let viewBeforeArrange = $state<'cards' | 'summary'>('cards');

	const flipDurationMs = 140;
	const tabletopDndOptions: {
		items: DndItem[];
		flipDurationMs: number;
		type: string;
		dragDisabled: boolean;
		dropFromOthersDisabled: boolean;
		delayTouchStart: number;
		dropTargetClasses: string[];
		useCursorForDetection: boolean;
	} = $derived({
		items: tabletopItems,
		flipDurationMs,
		type: 'character-card-space',
		dragDisabled: !arranging,
		dropFromOthersDisabled: !arranging,
		delayTouchStart: 120,
		dropTargetClasses: ['card-drop-target'],
		useCursorForDetection: true
	});

	let characterCards: CardSpaceItem[] = $derived.by(() => {
		if (!derivedCharacter || !character) return [];

		const cards: CardSpaceItem[] = [];
		let sort = 0;
		const push = (card: DisplayCard, key: string, label: string, meta: string) => {
			cards.push({ ...card, key, sort: sort++, label, meta, source: 'character' });
		};

		if (derivedCharacter.ancestry_card && character.ancestry_card_id) {
			push(
				{ type: 'ancestry_card', card: derivedCharacter.ancestry_card, id: character.ancestry_card_id },
				`ancestry_card:${character.ancestry_card_id}`,
				derivedCharacter.ancestry_card.title,
				'Ancestry'
			);
		}

		Object.entries(derivedCharacter.additional_ancestry_cards).forEach(([id, card]) => {
			push({ type: 'ancestry_card', card, id }, `ancestry_card:${id}`, card.title, 'Ancestry');
		});

		if (derivedCharacter.community_card && character.community_card_id) {
			push(
				{ type: 'community_card', card: derivedCharacter.community_card, id: character.community_card_id },
				`community_card:${character.community_card_id}`,
				derivedCharacter.community_card.title,
				'Community'
			);
		}

		Object.entries(derivedCharacter.additional_community_cards).forEach(([id, card]) => {
			push({ type: 'community_card', card, id }, `community_card:${id}`, card.title, 'Community');
		});

		const pushSubclass = (
			side: 'primary' | 'secondary',
			level: number,
			phase: 'foundation' | 'specialization' | 'mastery'
		) => {
			const subclass =
				side === 'primary' ? derivedCharacter.primary_subclass : derivedCharacter.secondary_subclass;
			const subclassId =
				side === 'primary' ? character.primary_subclass_id : character.secondary_subclass_id;
			const masteryLevel =
				side === 'primary'
					? derivedCharacter.primary_class_mastery_level
					: derivedCharacter.secondary_class_mastery_level;
			if (!subclass || !subclassId || masteryLevel < level) return;
			const phaseCard =
				phase === 'foundation'
					? subclass.foundation_card
					: phase === 'specialization'
						? subclass.specialization_card
						: subclass.mastery_card;
			push(
				{
					type: 'subclass_card',
					card: {
						type: phase,
						...subclass,
						...phaseCard
					},
					id: subclassId
				},
				`subclass:${side}:${subclassId}:${phase}`,
				subclass.title,
				`${phase[0].toUpperCase()}${phase.slice(1)}`
			);
		};

		pushSubclass('primary', 1, 'foundation');
		pushSubclass('primary', 2, 'specialization');
		pushSubclass('primary', 3, 'mastery');
		pushSubclass('secondary', 1, 'foundation');
		pushSubclass('secondary', 2, 'specialization');
		pushSubclass('secondary', 3, 'mastery');

		return cards;
	});

	let loadoutCards: CardSpaceItem[] = $derived.by(() => {
		if (!derivedCharacter) return [];
		return derivedCharacter.domain_card_loadout
			.map(({ id, ...card }, index) => ({
				type: 'domain_card' as const,
				card,
				id,
				key: `domain_card:${card.domain_id || 'unknown'}:${id}`,
				sort: 1000 + index,
				label: card.title,
				meta: `${card.domain_id || 'Domain'} / Level ${card.level_requirement}`,
				source: 'loadout' as const
			}))
			.sort(
				(left, right) =>
					left.card.level_requirement - right.card.level_requirement ||
					(left.card.domain_id ?? '').localeCompare(right.card.domain_id ?? '') ||
					left.card.title.localeCompare(right.card.title)
			);
	});

	let allCards: CardSpaceItem[] = $derived([...characterCards, ...loadoutCards]);
	let allCardsByKey: Map<string, CardSpaceItem> = $derived(new Map(allCards.map((card) => [card.key, card])));
	let activeCardKeys: Set<string> = $derived(new Set(allCards.map((card) => card.key)));

	let vault: { type: 'domain_card'; id: string; card: DomainCard }[] = $derived(
		(derivedCharacter?.domain_card_vault ?? [])
			.filter(
				(vaultCard) =>
					!derivedCharacter?.domain_card_loadout.some((loadoutCard) => loadoutCard.id === vaultCard.id)
			)
			.map(({ id, ...card }) => ({ type: 'domain_card' as const, card, id }))
			.sort(
				(left, right) =>
					left.card.level_requirement - right.card.level_requirement ||
					(left.card.domain_id ?? '').localeCompare(right.card.domain_id ?? '') ||
					left.card.title.localeCompare(right.card.title)
			)
	);

	let remainingStress = $derived(
		character && derivedCharacter ? derivedCharacter.max_stress - character.marked_stress : 0
	);

	let visibleLooseCards: CardSpaceItem[] = $derived(
		looseItems
			.map((item) => allCardsByKey.get(item.id))
			.filter((card): card is CardSpaceItem => Boolean(card))
	);

	let orderedCardGroups = $derived.by(() => [
		{ group: 'Loose Cards', cards: visibleLooseCards }
	]);

	let summaryCardGroups = $derived.by(() => {
		const cardGroups: {
			group: string;
			card: CardSpaceItem;
			features: {
				title: string;
				text: string;
			}[];
		}[] = [];

		for (const group of orderedCardGroups) {
			for (const card of group.cards) {
				const features = card.card.features.length > 0 ? card.card.features : [null];
				cardGroups.push({
					group: group.group,
					card,
					features: features.map((feature) => ({
						title: feature?.title ?? '',
						text: feature?.description_html ?? ''
					}))
				});
			}
		}

		return cardGroups;
	});

	let featureSummaryGroups = $derived.by(() => {
		if (!character || !derivedCharacter) return [];

		const groups: {
			key: string;
			label: string;
			meta: string;
			features: {
				key: string;
				title: string;
				text: string;
				tokenKey?: string;
				tokenMax?: number;
			}[];
		}[] = [];

		const addClass = (
			side: 'primary' | 'secondary',
			classId: string | undefined,
			characterClass: typeof derivedCharacter.primary_class | undefined
		) => {
			if (!classId || !characterClass || characterClass.class_features.length === 0) return;
			groups.push({
				key: `class:${side}:${classId}`,
				label: characterClass.title,
				meta: side === 'primary' ? 'Primary Class' : 'Secondary Class',
				features: characterClass.class_features.map((feature, index) => ({
					key: `class:${side}:${classId}:${index}`,
					title: feature.title,
					text: feature.description_html,
					tokenKey: feature.tokens_enabled
						? `class_feature_tokens:${classId}:${index}`
						: undefined,
					tokenMax: feature.token_max ?? 0
				}))
			});
		};

		addClass('primary', character.primary_class_id, derivedCharacter.primary_class);
		addClass('secondary', character.secondary_class_id, derivedCharacter.secondary_class);

		const transformation = derivedCharacter.transformation_card;
		if (transformation && transformation.features.length > 0) {
			groups.push({
				key: `transformation:${character.transformation_card_id ?? transformation.title}`,
				label: transformation.title,
				meta: 'Transformation',
				features: transformation.features.map((feature, index) => ({
					key: `transformation:${character.transformation_card_id ?? transformation.title}:${index}`,
					title: feature.name,
					text: feature.description_html
				}))
			});
		}

		const primarySpellcastTrait =
			derivedCharacter.primary_subclass?.spellcast_trait ??
			derivedCharacter.primary_class?.spellcast_trait;
		const secondarySpellcastTrait =
			derivedCharacter.secondary_subclass?.spellcast_trait ??
			derivedCharacter.secondary_class?.spellcast_trait;
		const spellcastTraits = [titleCase(primarySpellcastTrait ?? ''), titleCase(secondarySpellcastTrait ?? '')]
			.filter((trait) => trait.trim().length > 0)
			.join(', ');
		if (spellcastTraits) {
			groups.push({
				key: 'spellcast-traits',
				label: 'Spellcast Trait',
				meta: 'Class',
				features: [
					{
						key: 'spellcast-traits:value',
						title: '',
						text: spellcastTraits
					}
				]
			});
		}

		return groups;
	});

	let hasFeatureSummary = $derived(
		Boolean(
			featureSummaryGroups.length ||
				derivedCharacter?.hasRallyClassFeature ||
				derivedCharacter?.hasUnstoppableClassFeature ||
				derivedCharacter?.hasPrayerDiceClassFeature ||
				derivedCharacter?.hasStrangePatternsClassFeature
		)
	);
	let hasTransformationSummary = $derived(
		Boolean(derivedCharacter?.transformation_card?.features.length)
	);
	let featureSummaryTitle = $derived(
		hasTransformationSummary ? 'Class & Transformation Features' : 'Class Features'
	);

	let summarySections = $derived.by(() => {
		const characterGroups = summaryCardGroups.filter((group) => group.card.type !== 'domain_card');
		const domainGroups = summaryCardGroups.filter((group) => group.card.type === 'domain_card');
		return [
			{ title: 'Character Cards', groups: characterGroups },
			{ title: 'Domain Abilities & Spells', groups: domainGroups }
		].filter((section) => section.groups.length > 0);
	});

	function titleCase(value: string) {
		return value
			.replace(/[_-]/g, ' ')
			.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
	}

	function stackIdFromItemId(itemId: string) {
		return itemId.startsWith('stack-group:') ? itemId.slice('stack-group:'.length) : null;
	}

	function cardTypeLabel(card: CardSpaceItem) {
		if (card.type === 'domain_card') return 'Domain Card';
		if (card.type === 'ancestry_card') return 'Ancestry';
		if (card.type === 'community_card') return 'Community';
		if (card.type === 'subclass_card') return `${card.meta} Subclass`;
		return 'Card';
	}

	function cardMetaLabel(card: CardSpaceItem) {
		if (card.type !== 'domain_card') return card.meta;
		return `${titleCase(card.card.domain_id || 'Domain')} / Level ${card.card.level_requirement}`;
	}

	function sanitizeLayout(layout: CharacterCardLayout | undefined): CharacterCardLayout {
		const used = new Set<string>();
		const legacyStacks = ((layout as CharacterCardLayout & { stacks?: LegacyCardLayoutStack[] } | undefined)
			?.stacks ?? []) as LegacyCardLayoutStack[];
		const savedStacksById = new Map(legacyStacks.map((stack) => [stack.id, stack.card_keys]));
		const candidateOrder = [
			...(layout?.tabletop_order ?? []).flatMap((id) => {
				const stackId = stackIdFromItemId(id);
				return stackId ? (savedStacksById.get(stackId) ?? []) : [id];
			}),
			...(layout?.loose_card_keys ?? []),
			...legacyStacks.flatMap((stack) => stack.card_keys)
		];

		const nextLoose = candidateOrder.filter((key) => {
			if (!activeCardKeys.has(key) || used.has(key)) return false;
			used.add(key);
			return true;
		});

		const missing = allCards
			.filter((card) => !used.has(card.key))
			.sort((left, right) => left.sort - right.sort || left.label.localeCompare(right.label))
			.map((card) => card.key);

		const nextTabletopOrder = [...nextLoose, ...missing];

		return {
			version: 1,
			loose_card_keys: [...nextLoose, ...missing],
			tabletop_order: nextTabletopOrder,
			view_mode: layout?.view_mode ?? 'cards'
		};
	}

	function applyLayout(layout: CharacterCardLayout | undefined) {
		const sanitized = sanitizeLayout(layout);
		looseItems = sanitized.loose_card_keys.map((id) => ({ id }));
		tabletopItems = (sanitized.tabletop_order ?? sanitized.loose_card_keys).map((id) => ({ id }));
		viewMode = sanitized.view_mode ?? 'cards';
	}

	function currentLayout(nextViewMode = viewMode): CharacterCardLayout {
		return {
			version: 1,
			loose_card_keys: looseItems
				.map((item) => item.id)
				.filter((key) => activeCardKeys.has(key)),
			tabletop_order: tabletopItems
				.map((item) => item.id)
				.filter((id) => activeCardKeys.has(id)),
			view_mode: nextViewMode
		};
	}

	function beginArrange() {
		if (!characterCtx.canEdit) return;
		savedDraft = currentLayout();
		viewBeforeArrange = viewMode;
		arranging = true;
		viewMode = 'cards';
	}

	function saveLayout() {
		if (!character) return;
		character.card_layout = currentLayout(viewBeforeArrange);
		arranging = false;
		viewMode = viewBeforeArrange;
		savedDraft = undefined;
	}

	function cancelLayout() {
		applyLayout(savedDraft);
		arranging = false;
		viewMode = viewBeforeArrange;
		savedDraft = undefined;
	}

	function resetLayout() {
		applyLayout(undefined);
	}

	function handleLooseConsider(event: CustomEvent<DndEvent>) {
		const nextItems = withoutShadowItems(event.detail.items as DndItem[]);
		tabletopItems = nextItems;
		looseItems = nextItems.filter((item) => activeCardKeys.has(item.id));
	}

	function handleLooseFinalize(event: CustomEvent<DndEvent>) {
		const nextItems = withoutShadowItems(event.detail.items as DndItem[]);
		tabletopItems = nextItems;
		looseItems = nextItems.filter((item) => activeCardKeys.has(item.id));
	}

	function withoutShadowItems(items: DndItem[]) {
		return items.filter((item) => item.id !== SHADOW_PLACEHOLDER_ITEM_ID);
	}

	function removeLoadoutCard(card: CardSpaceItem) {
		if (!character || card.type !== 'domain_card') return;
		character.loadout_domain_card_ids = character.loadout_domain_card_ids.filter(
			(id: DomainCardId) => id.card_id !== card.id || id.domain_id !== card.card.domain_id
		);
	}

	function addVaultCard(card: { id: string; card: DomainCard }, useStress: boolean) {
		if (!character || !derivedCharacter) return;
		if (character.loadout_domain_card_ids.length >= derivedCharacter.max_loadout) return;
		if (useStress && card.card.recall_cost > remainingStress) return;
		if (useStress) character.marked_stress += card.card.recall_cost;
		character.loadout_domain_card_ids = [
			...character.loadout_domain_card_ids,
			{ domain_id: card.card.domain_id, card_id: card.id }
		];
	}

	function openCardDialog(cardKey: string) {
		if (arranging) return;
		selectedDialogKey = cardKey;
		dialogOpen = true;
	}

	function onCardClick(event: MouseEvent, cardKey: string) {
		const target = event.target as HTMLElement;
		const interactiveTarget = target.closest('button, input, select, textarea, [role="button"]');
		if (interactiveTarget && interactiveTarget !== event.currentTarget) return;
		openCardDialog(cardKey);
	}

	function setViewMode(nextViewMode: 'cards' | 'summary') {
		if (arranging || !character) return;
		viewMode = nextViewMode;
		character.card_layout = currentLayout(nextViewMode);
	}

	$effect(() => {
		character?.card_layout;
		allCards.map((card: CardSpaceItem) => card.key).join('|');
		if (arranging) return;
		applyLayout(character?.card_layout);
	});
</script>

{#snippet renderCard(card: CardSpaceItem, compact = false, interactive = true, modal = false)}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class={cn(
			'character-card-readable mx-auto w-full min-w-[220px]',
			modal && 'character-card-readable-modal',
			compact && 'min-w-[170px] max-w-[210px]',
			interactive && 'cursor-zoom-in'
		)}
		onclick={(event) => interactive && onCardClick(event, card.key)}
		role={interactive ? 'button' : undefined}
		tabindex={interactive && !arranging ? 0 : undefined}
		onkeydown={(event) => {
			if (interactive && !arranging && (event.key === 'Enter' || event.key === ' ')) {
				event.preventDefault();
				openCardDialog(card.key);
			}
		}}
	>
		{#if card.type === 'domain_card'}
			<DomainCardComponent
				card={card.card}
				variant="card"
				compendium={characterCtx.character_compendium}
				disabled={arranging}
				enable_choices={!arranging}
				enable_tokens={!arranging}
				experiences={character?.experiences ?? []}
				bind:choices={character!.card_choices[card.id]}
				bind:tokens={character!.card_tokens[card.id]}
			/>
		{:else if card.type === 'ancestry_card'}
			<AncestryCardComponent
				card={card.card}
				variant="card"
				compendium={characterCtx.character_compendium}
				disabled={arranging}
				enable_choices={!arranging}
				enable_tokens={!arranging}
				enable_mixed_ancestry={!arranging}
				experiences={character?.experiences ?? []}
				bind:mixed_ancestry_choices={character!.mixed_ancestry_choices[card.id]}
				bind:choices={character!.card_choices[card.id]}
				bind:tokens={character!.card_tokens[card.id]}
			/>
		{:else if card.type === 'community_card'}
			<CommunityCardComponent
				card={card.card}
				variant="card"
				disabled={arranging}
				enable_choices={!arranging}
				enable_tokens={!arranging}
				experiences={character?.experiences ?? []}
				bind:choices={character!.card_choices[card.id]}
				bind:tokens={character!.card_tokens[card.id]}
			/>
		{:else if card.type === 'subclass_card'}
			<SubclassCardComponent
				card={card.card}
				variant="card"
				compendium={characterCtx.character_compendium}
				disabled={arranging}
				enable_choices={!arranging}
				enable_tokens={!arranging}
				experiences={character?.experiences ?? []}
				bind:choices={character!.card_choices[card.id]}
				bind:tokens={character!.card_tokens[card.id]}
			/>
		{/if}
	</div>
{/snippet}

{#snippet renderCardItem(card: CardSpaceItem, draggable = false)}
	{#if draggable}
		<div
			class="relative cursor-grab rounded-2xl transition-shadow active:cursor-grabbing"
			use:dragHandle
			data-card-key={card.key}
		>
			{@render renderCard(card)}
			{#if card.type === 'domain_card' && !card.card.forced_in_loadout}
				<Button
					size="sm"
					class="absolute right-3 bottom-3 z-20 rounded-full shadow-lg"
					onclick={() => removeLoadoutCard(card)}
				>
					Move to Vault
					<ArrowUpRight class="size-4" />
				</Button>
			{/if}
		</div>
	{:else}
		<div class="relative rounded-2xl transition-shadow" data-card-key={card.key}>
			{@render renderCard(card)}
		</div>
	{/if}
{/snippet}

{#snippet renderTabletopItems(draggable = false)}
	{#each tabletopItems as item (item.id)}
		{@const card = allCardsByKey.get(item.id)}
		{#if card}
			<div aria-label={card.label}>
				{@render renderCardItem(card, draggable)}
			</div>
		{/if}
	{/each}
	{#if allCards.length === 0}
		<div class="col-span-full grid min-h-52 place-items-center rounded-lg border border-dashed border-muted">
			<div class="text-center text-muted-foreground">
				<BookOpen class="mx-auto mb-2 size-8" />
				<p>No active cards yet.</p>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet renderFeatureSummary()}
	{#if hasFeatureSummary && derivedCharacter}
		<SimpleContainer
			class="mx-auto w-full max-w-6xl shadow-2xl"
			backgroundClass="fill-background/75 bg-background/75 backdrop-blur-sm"
		>
			<div class="p-4 md:p-5">
				<div class="mb-4 flex items-center gap-3">
					<h2 class="font-eveleth text-lg leading-none text-foreground uppercase">
						{featureSummaryTitle}
					</h2>
				</div>

				<div class="overflow-hidden rounded-lg border border-primary/40 bg-card">
					{#if derivedCharacter.hasRallyClassFeature ||
						derivedCharacter.hasUnstoppableClassFeature ||
						derivedCharacter.hasPrayerDiceClassFeature ||
						derivedCharacter.hasStrangePatternsClassFeature}
						<div
							class="grid gap-3 border-b border-primary/25 bg-background/35 px-4 py-3 text-sm lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,2.4fr)]"
						>
							<div class="min-w-0">
								<p class="font-bold text-foreground">Class Controls</p>
								<p class="text-xs leading-snug text-muted-foreground">Interactive class resources</p>
							</div>
							<div class="space-y-2 rounded-md border border-primary/30 bg-background/80 px-3 py-2">
								{#if derivedCharacter.hasRallyClassFeature}
									<BardFeatures />
								{/if}
								{#if derivedCharacter.hasUnstoppableClassFeature}
									<GuardianFeatures />
								{/if}
								{#if derivedCharacter.hasPrayerDiceClassFeature}
									<SeraphFeatures />
								{/if}
								{#if derivedCharacter.hasStrangePatternsClassFeature}
									<WizardFeatures />
								{/if}
							</div>
						</div>
					{/if}

					{#each featureSummaryGroups as group (group.key)}
						<div
							class="grid gap-3 border-b border-primary/20 px-4 py-3 text-sm last:border-b-0 lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,2.4fr)]"
						>
							<div class="min-w-0">
								<p class="font-bold text-foreground">{group.label}</p>
								<p class="text-xs leading-snug text-muted-foreground">{group.meta}</p>
							</div>
							<div class="divide-y divide-primary/20 rounded-md border border-primary/30 bg-background/80">
								{#each group.features as feature (feature.key)}
									<div class="grid gap-2 px-3 py-2 md:grid-cols-[minmax(120px,0.75fr)_minmax(0,2.4fr)]">
										<div class="min-w-0">
											<div class="font-bold leading-snug">{feature.title}</div>
											{#if feature.tokenKey && feature.tokenMax}
												<div class="mt-1">
													<FeatureTokens tokenKey={feature.tokenKey} max={feature.tokenMax} />
												</div>
											{/if}
										</div>
										<div class="prose prose-invert max-w-none text-sm leading-snug">
											{@html renderMarkdown(feature.text)}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</SimpleContainer>
	{/if}
{/snippet}

{#if character && derivedCharacter}
	{@render renderFeatureSummary()}

	<SimpleContainer
		class="mx-auto w-full max-w-6xl shadow-2xl"
		backgroundClass="fill-background/70 bg-background/70 backdrop-blur-sm"
	>
		<section class="flex flex-col gap-4 p-4 md:p-5">
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div class="flex items-center gap-3">
				<h2 class="font-eveleth text-lg text-foreground">Cards</h2>
				<span
					class="grid h-5 place-items-center rounded-full bg-accent px-2 text-xs font-bold text-background"
				>
					{allCards.length}
				</span>
				{#if characterCtx.canEdit}
					<Button variant="ghost" size="sm" class="h-8 px-2" onclick={openHeritageCardCatalog}>
						<Pencil class="size-4" />
						<span class="sr-only">Add heritage cards</span>
					</Button>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<div class="flex rounded-md border border-primary/40 bg-card p-1">
					<Button
						size="sm"
						variant={viewMode === 'cards' ? 'default' : 'ghost'}
						class="h-8"
						onclick={() => setViewMode('cards')}
					>
						<Layers class="size-4" />
						Cards
					</Button>
					<Button
						size="sm"
						variant={viewMode === 'summary' ? 'default' : 'ghost'}
						class="h-8"
						onclick={() => setViewMode('summary')}
					>
						<TableProperties class="size-4" />
						Summary
					</Button>
				</div>

				<Dialog.Root>
					<Dialog.Trigger class={cn(buttonVariants({ size: 'sm', variant: 'secondary' }), 'relative')}>
						Vault
						<span
							class="absolute top-0 right-0 grid h-4.5 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-background"
						>
							{vault.length}
						</span>
					</Dialog.Trigger>
					<Dialog.Content class="flex max-h-[90vh] min-w-[calc(100%-1rem)] flex-col md:min-w-5xl">
						<Dialog.Header>
							<Dialog.Title>Domain Vault</Dialog.Title>
						</Dialog.Header>
						{#if characterCtx.canEdit}
							<div class="flex flex-wrap items-center gap-3">
								<Stress
									class={cn('rounded-full px-4 py-2', restMode && 'opacity-30')}
									max={derivedCharacter.max_stress}
									bind:marked={character.marked_stress}
									disabled
								/>
								<Label
									class={cn(
										'flex h-10 w-min items-center rounded-full border px-3 text-nowrap text-primary-foreground hover:cursor-pointer',
										restMode ? 'bg-primary' : 'bg-card text-muted-foreground'
									)}
								>
									<Switch
										bind:checked={restMode}
										class="data-[state=checked]:bg-primary-muted/50 data-[state=unchecked]:bg-foreground/20"
									/>
									Rest Mode
								</Label>
								<Button size="sm" onclick={openDomainCardCatalog}>
									<Plus class="size-4" />
									Add Domain Cards
								</Button>
							</div>
						{/if}
						<div class="grid gap-5 overflow-y-auto py-2 sm:grid-cols-2 lg:grid-cols-3">
							{#each vault as vaultCard}
								<div class="relative mx-auto w-full max-w-[240px]">
									<DomainCardComponent
										card={vaultCard.card}
										variant="card"
										compendium={characterCtx.character_compendium}
										disabled={arranging}
										enable_choices
										enable_tokens
										experiences={character.experiences}
										bind:choices={character.card_choices[vaultCard.id]}
										bind:tokens={character.card_tokens[vaultCard.id]}
									/>
									{#if characterCtx.canEdit && !vaultCard.card.forced_in_vault}
										<Button
											size="sm"
											disabled={character.loadout_domain_card_ids.length >=
												derivedCharacter.max_loadout ||
												(!restMode && vaultCard.card.recall_cost > remainingStress)}
											class="absolute right-2 bottom-2 left-2 rounded-full shadow-lg"
											onclick={() => addVaultCard(vaultCard, !restMode)}
										>
											{#if character.loadout_domain_card_ids.length >= derivedCharacter.max_loadout}
												Loadout is full
											{:else if !restMode && vaultCard.card.recall_cost > remainingStress}
												Not enough stress
											{:else if restMode}
												<ArrowUp class="size-4" />
												Add to loadout
											{:else}
												<ArrowUp class="size-4" />
												Recall ({vaultCard.card.recall_cost} stress)
											{/if}
										</Button>
									{/if}
								</div>
							{/each}
							{#if vault.length === 0}
								<p class="col-span-full rounded-lg border border-dashed border-muted p-8 text-center text-muted-foreground">
									No cards in the vault.
								</p>
							{/if}
						</div>
					</Dialog.Content>
				</Dialog.Root>

				{#if characterCtx.canEdit}
					{#if arranging}
						<Button size="sm" variant="secondary" onclick={resetLayout}>
							<RotateCcw class="size-4" />
							Reset
						</Button>
						<Button size="sm" variant="ghost" onclick={cancelLayout}>
							<X class="size-4" />
							Cancel
						</Button>
						<Button size="sm" onclick={saveLayout}>
							<Save class="size-4" />
							Save Layout
						</Button>
					{:else}
						<Button size="sm" onclick={beginArrange}>
							<Lock class="size-4" />
							Arrange
						</Button>
					{/if}
				{/if}
			</div>
		</div>

		{#if arranging}
			<div class="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-muted-foreground">
				<div class="flex items-center gap-2 font-medium text-foreground">
					<Unlock class="size-4" />
					Layout unlocked
				</div>
				<p>Drag cards by their handles to reorder them.</p>
			</div>
		{/if}

		{#if viewMode === 'cards'}
			{#if arranging}
				<div
					class="tabletop-grid min-h-[520px] rounded-xl border border-dashed border-primary/30 bg-background/40 p-4"
					aria-label="Character card tabletop"
					use:dragHandleZone={tabletopDndOptions}
					onconsider={handleLooseConsider}
					onfinalize={handleLooseFinalize}
				>
					{@render renderTabletopItems(true)}
				</div>
			{:else}
				<div
					class="tabletop-grid min-h-[520px] rounded-xl border border-dashed border-primary/30 bg-background/40 p-4"
					aria-label="Character card tabletop"
				>
					{@render renderTabletopItems()}
				</div>
			{/if}
		{:else}
			<div class="overflow-hidden rounded-lg border border-primary/40 bg-card/80">
				<div class="grid grid-cols-[minmax(220px,0.9fr)_minmax(0,2.4fr)] gap-4 border-b border-primary/30 bg-primary/30 px-3 py-2 text-xs font-bold text-muted-foreground uppercase max-lg:hidden">
					<div>Card</div>
					<div>Features</div>
				</div>
				<div class="divide-y divide-primary/30">
					{#each summarySections as section (section.title)}
						<div>
							<div class="border-b border-primary/25 bg-primary/15 px-3 py-2 font-eveleth text-sm text-accent">
								{section.title}
							</div>
							<div class="divide-y divide-primary/20">
								{#each section.groups as group (group.card.key)}
									<div class="grid gap-3 px-3 py-2 text-sm lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,2.4fr)]">
										<div class="space-y-2">
											<button
												class="text-left font-bold text-foreground underline-offset-4 hover:underline"
												onclick={() => openCardDialog(group.card.key)}
											>
												{group.card.label}
											</button>
											<p class="text-xs leading-snug text-muted-foreground">
												{cardTypeLabel(group.card)} · {cardMetaLabel(group.card)}
												{#if group.group !== 'Loose Cards'}
													· {group.group}
												{/if}
											</p>
											{#if group.card.card.tokens_enabled || (group.card.card.options?.length ?? 0) > 0}
												<CardOptions
													card={group.card.card}
													disabled={!characterCtx.canEdit}
													enable_choices
													enable_tokens
													experiences={character.experiences}
													class="items-start"
													bind:choices={character.card_choices[group.card.id]}
													bind:tokens={character.card_tokens[group.card.id]}
												/>
											{/if}
										</div>
										<div class="divide-y divide-primary/15 rounded-md border border-primary/20 bg-background/25">
											{#each group.features as feature, featureIndex (`${group.card.key}:${feature.title}:${featureIndex}`)}
												<div class="grid gap-2 px-3 py-2 md:grid-cols-[minmax(120px,0.75fr)_minmax(0,2.4fr)]">
													<div class="font-bold leading-snug">{feature.title}</div>
													<div class="prose prose-invert max-w-none text-sm leading-snug">
														{#if feature.text}
															{@html renderMarkdown(feature.text)}
														{:else}
															<span class="text-muted-foreground">No feature text.</span>
														{/if}
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
					{#if summarySections.length === 0}
						<p class="p-8 text-center text-muted-foreground">No card features to summarize.</p>
					{/if}
				</div>
			</div>
		{/if}
		</section>
	</SimpleContainer>

	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Content
			class="w-fit max-w-[90vw] border-none bg-transparent p-0 shadow-none"
			closeClasses="-top-4 -right-4"
		>
			{#if selectedDialogKey && allCardsByKey.get(selectedDialogKey)}
				{@const selectedCard = allCardsByKey.get(selectedDialogKey)!}
				<div style="width: min(520px, 92vw);">
					{@render renderCard(selectedCard, false, false, true)}
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
{/if}

<style>
	.tabletop-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--sheet-card-max-width, 320px)), 1fr));
		gap: 1.5rem;
		align-items: start;
	}

	.character-card-readable {
		max-width: var(--sheet-card-max-width, 320px);
	}

	.character-card-readable-modal {
		max-width: var(--sheet-card-modal-max-width, 336px);
	}

	:global(.character-card-readable > div) {
		max-width: var(--sheet-card-max-width, 320px) !important;
	}

	:global(.character-card-readable-modal > div) {
		max-width: var(--sheet-card-modal-max-width, 336px) !important;
	}

	:global(.card-drop-target) {
		outline: 2px dashed hsl(var(--primary));
		outline-offset: 4px;
		background-color: hsl(var(--primary) / 0.14);
	}
</style>
