<script lang="ts">
	import { goto } from '$app/navigation';
	import { flip } from 'svelte/animate';
	import { onMount, type Snippet } from 'svelte';
	import type { Adversary, Environment } from '@domain/schemas/compendium';
	import type { AdversaryInstance, Encounter } from '@domain/schemas/encounters';
	import { artEncounters } from '$lib/assets/images';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import SafeDelete from '$lib/components/shared/safe-delete.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import AdversaryCard from '$lib/components/compendium-items/adversary/adversary.svelte';
	import AdversaryConditionsSheet from '$lib/components/compendium-items/adversary/adversary-conditions-sheet.svelte';
	import EnvironmentCard from '$lib/components/compendium-items/environment.svelte';
	import HomebrewAdversaryForm from '$lib/components/homebrew/forms/adversary/form.svelte';
	import HomebrewEnvironmentForm from '$lib/components/homebrew/forms/environment/form.svelte';
	import AdversarySelectorSheet from './adversary-selector-sheet.svelte';
	import EncounterBattlePoints from './encounter-battle-points.svelte';
	import EncounterNotes from './encounter-notes.svelte';
	import EnvironmentSelectorSheet from './environment-selector-sheet.svelte';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import Trash from '@lucide/svelte/icons/trash';
	import { getEncounterContext } from '$lib/state/encounters.svelte';
	import { getLocalstorageContext } from '$lib/state/localstorage.svelte';
	import { cn } from '$lib/utils';
	import SimpleContainer from '../character-sheet/embelishments/simple-container.svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Settings from '@lucide/svelte/icons/settings';
	import { toast } from 'svelte-sonner';

	let {
		children,
		class: className = '',
		hideDesktopNotesColumn = false,
		onBeforeDelete
	}: {
		children?: Snippet;
		class?: string;
		hideDesktopNotesColumn?: boolean;
		onBeforeDelete?: (encounterId: string) => void | Promise<void>;
	} = $props();

	const encounterCtx = getEncounterContext();
	const localstorageCtx = getLocalstorageContext();

	const encounter: Encounter | undefined = $derived(encounterCtx.encounter);
	const compendium = $derived(encounterCtx.encounter_compendium);
	const isOwner = $derived(encounterCtx.isOwner);
	function createEncounterCollapsiblePreferences(): {
		adversaryCards: Record<
			string,
			{ movesOpen: boolean; featuresOpen: boolean; instanceOpenStates: boolean[] }
		>;
		environmentCards: Record<string, { detailsOpen: boolean; featuresOpen: boolean }>;
	} {
		return {
			adversaryCards: {},
			environmentCards: {}
		};
	}

	let encounterCollapsiblePreferences = $state(createEncounterCollapsiblePreferences());

	const disabledAdversaryIds = $derived.by(
		() =>
			encounter?.items
				.filter((item) => item.type === 'adversary')
				.map((item) => item.base_adversary_id) ?? []
	);
	const disabledEnvironmentIds = $derived.by(
		() =>
			encounter?.items
				.filter((item) => item.type === 'environment')
				.map((item) => item.base_environment_id) ?? []
	);

	function removeItem(index: number) {
		if (!encounter) return;
		encounter.items = encounter.items.filter((_, itemIndex) => itemIndex !== index);
	}

	async function swapItems(fromIndex: number, toIndex: number) {
		if (!encounter) return;
		if (fromIndex < 0 || toIndex < 0) return;
		if (fromIndex >= encounter.items.length || toIndex >= encounter.items.length) return;
		if (fromIndex === toIndex) return;

		const currentItem = encounter.items[fromIndex];
		const previousItem = encounter.items[toIndex];
		const currentScrollTop = itemViewports.get(currentItem)?.scrollTop ?? 0;
		const previousScrollTop = itemViewports.get(previousItem)?.scrollTop ?? 0;

		const items = [...encounter.items];
		[items[toIndex], items[fromIndex]] = [items[fromIndex], items[toIndex]];
		encounter.items = items;

		requestAnimationFrame(() => {
			const currentViewport = itemViewports.get(currentItem);
			if (currentViewport) {
				currentViewport.scrollTop = currentScrollTop;
			}

			const previousViewport = itemViewports.get(previousItem);
			if (previousViewport) {
				previousViewport.scrollTop = previousScrollTop;
			}
		});
	}

	function swapItemWithPrevious(index: number) {
		return swapItems(index, index - 1);
	}

	function swapItemWithNext(index: number) {
		return swapItems(index, index + 1);
	}

	type EncounterItem = Encounter['items'][number];

	const itemViewports = new WeakMap<EncounterItem, HTMLElement>();

	function registerViewport(node: HTMLElement, item: EncounterItem) {
		let currentItem = item;
		let viewport: HTMLElement | null = null;

		function syncViewport() {
			const nextViewport = node.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
			if (!nextViewport) return;

			if (viewport !== nextViewport) {
				viewport = nextViewport;
			}

			itemViewports.set(currentItem, viewport);
		}

		syncViewport();

		return {
			update(nextItem: EncounterItem) {
				currentItem = nextItem;
				syncViewport();
			},
			destroy() {
				if (viewport && itemViewports.get(currentItem) === viewport) {
					itemViewports.delete(currentItem);
				}
			}
		};
	}

	let adversarySheetOpen = $state(false);
	let environmentSheetOpen = $state(false);
	let adversaryConditionsSheetOpen = $state(false);
	let selectedAdversaryInstance = $state<AdversaryInstance | null>(null);
	let settingsDialogOpen = $state(false);
	let encounterName = $state('');
	let enableMassiveDamage = $state(false);

	onMount(() => {
		function openAdversarySelector() {
			adversarySheetOpen = true;
		}

		function openEnvironmentSelector() {
			environmentSheetOpen = true;
		}

		function openEncounterSettings() {
			settingsDialogOpen = true;
		}

		window.addEventListener('daggerlore:encounter-open-adversary-selector', openAdversarySelector);
		window.addEventListener(
			'daggerlore:encounter-open-environment-selector',
			openEnvironmentSelector
		);
		window.addEventListener('daggerlore:encounter-open-settings', openEncounterSettings);

		return () => {
			window.removeEventListener(
				'daggerlore:encounter-open-adversary-selector',
				openAdversarySelector
			);
			window.removeEventListener(
				'daggerlore:encounter-open-environment-selector',
				openEnvironmentSelector
			);
			window.removeEventListener('daggerlore:encounter-open-settings', openEncounterSettings);
		};
	});

	const encounterAdversaryInstances = $derived.by(
		() =>
			encounter?.items.flatMap((item) => (item.type === 'adversary' ? item.instances : [])) ?? []
	);

	function addAdversary(adversaryId: string) {
		if (!encounter) return;

		const adversary = compendium.adversaries[adversaryId];
		const minionCount = adversary?.type === 'Minion' ? Math.max(1, encounter.number_of_players) : 1;
		const instances = Array.from({ length: minionCount }, () => ({
			name: '',
			conditions: [],
			marked_hp: 0,
			marked_stress: 0
		}));

		encounter.items = [
			...encounter.items,
			{
				type: 'adversary',
				base_adversary_id: adversaryId,
				edited_adversary: undefined,
				instances
			}
		];
	}

	function addEnvironment(environmentId: string) {
		if (!encounter) return;

		encounter.items = [
			...encounter.items,
			{
				type: 'environment',
				base_environment_id: environmentId,
				edited_environment: undefined
			}
		];
	}

	function openAdversaryConditions(
		adversary: Adversary,
		instances: AdversaryInstance[],
		instanceIndex: number
	) {
		const instance = instances[instanceIndex];
		if (!instance) return;

		selectedAdversaryInstance = instance;

		adversaryConditionsSheetOpen = true;
	}

	function deepClone<T>(value: T): T {
		return JSON.parse(JSON.stringify(value)) as T;
	}

	let editDialogOpen = $state(false);
	let editingItemIndex = $state<number | null>(null);
	const editingItem = $derived.by(() =>
		editingItemIndex !== null && encounter ? encounter.items[editingItemIndex] : null
	);
	let editingType = $state<'adversary' | 'environment' | null>(null);
	let editingAdversary = $state<Adversary | null>(null);
	let editingEnvironment = $state<Environment | null>(null);
	let adversaryFormRef = $state<{ handleSubmit: () => Promise<void> } | null>(null);
	let environmentFormRef = $state<{ handleSubmit: () => Promise<void> } | null>(null);
	let adversaryFormHasChanges = $state(false);
	let environmentFormHasChanges = $state(false);
	let adversaryFormHasErrors = $state(false);
	let environmentFormHasErrors = $state(false);

	function openItemEditor(index: number) {
		if (!encounter) return;

		const item = encounter.items[index];
		if (!item) return;

		if (item.type === 'adversary') {
			const baseAdversary = item.edited_adversary ?? compendium.adversaries[item.base_adversary_id];
			if (!baseAdversary) return;
			editingType = 'adversary';
			editingAdversary = deepClone(baseAdversary);
			editingEnvironment = null;
		} else {
			const baseEnvironment =
				item.edited_environment ?? compendium.environments[item.base_environment_id];
			if (!baseEnvironment) return;
			editingType = 'environment';
			editingEnvironment = deepClone(baseEnvironment);
			editingAdversary = null;
		}

		editingItemIndex = index;
		editDialogOpen = true;
	}

	function closeEditorDialog() {
		editDialogOpen = false;
		editingItemIndex = null;
		editingType = null;
		editingAdversary = null;
		editingEnvironment = null;
		adversaryFormRef = null;
		environmentFormRef = null;
		adversaryFormHasChanges = false;
		environmentFormHasChanges = false;
		adversaryFormHasErrors = false;
		environmentFormHasErrors = false;
	}

	function saveAdversaryEdit() {
		if (!encounter || editingItemIndex === null || !editingAdversary) return;
		const item = encounter.items[editingItemIndex];
		if (!item || item.type !== 'adversary') return;
		item.edited_adversary = deepClone(editingAdversary);
		closeEditorDialog();
	}

	function saveEnvironmentEdit() {
		if (!encounter || editingItemIndex === null || !editingEnvironment) return;
		const item = encounter.items[editingItemIndex];
		if (!item || item.type !== 'environment') return;
		item.edited_environment = deepClone(editingEnvironment);
		closeEditorDialog();
	}

	async function saveDialogEdits() {
		if (editingType === 'adversary') {
			await adversaryFormRef?.handleSubmit();
			if (adversaryFormHasErrors || !editingAdversary) return;
			saveAdversaryEdit();
			return;
		}

		if (editingType === 'environment') {
			await environmentFormRef?.handleSubmit();
			if (environmentFormHasErrors || !editingEnvironment) return;
			saveEnvironmentEdit();
		}
	}

	let clientHeight = $state(0);
	let scrollContainer = $state<HTMLDivElement | null>(null);

	const hasSettingsChanges = $derived.by(
		() =>
			!!encounter &&
			(encounterName.trim() !== encounter.name ||
				enableMassiveDamage !== !!encounter.enable_massive_damage)
	);

	$effect(() => {
		if (!adversaryConditionsSheetOpen) {
			selectedAdversaryInstance = null;
		}
	});

	$effect(() => {
		if (encounter && !encounter.condition_list) {
			encounter.condition_list = [];
		}
	});

	$effect(() => {
		if (encounter && encounter.enable_massive_damage === undefined) {
			encounter.enable_massive_damage = false;
		}
	});

	$effect(() => {
		if (settingsDialogOpen && encounter) {
			encounterName = encounter.name;
			enableMassiveDamage = !!encounter.enable_massive_damage;
		}
	});

	$effect(() => {
		if (!encounterCtx.id) {
			encounterCollapsiblePreferences = createEncounterCollapsiblePreferences();
			return;
		}

		const storedPreferences =
			localstorageCtx.app_preferences.encounter_collapsible_preferences[encounterCtx.id];

		if (storedPreferences) {
			encounterCollapsiblePreferences = storedPreferences;
		} else {
			localstorageCtx.app_preferences.encounter_collapsible_preferences[encounterCtx.id] =
				encounterCollapsiblePreferences;
		}
	});

	$effect(() => {
		if (!encounter) return;

		for (const item of encounter.items) {
			if (item.type === 'adversary') {
				const state =
					encounterCollapsiblePreferences.adversaryCards[item.base_adversary_id] ??
					(encounterCollapsiblePreferences.adversaryCards[item.base_adversary_id] = {
						movesOpen: true,
						featuresOpen: true,
						instanceOpenStates: item.instances.map(() => true)
					});

				if (state.instanceOpenStates.length !== item.instances.length) {
					state.instanceOpenStates = item.instances.map(
						(_, index) => state.instanceOpenStates[index] ?? true
					);
				}
			} else {
				encounterCollapsiblePreferences.environmentCards[item.base_environment_id] ??= {
					detailsOpen: true,
					featuresOpen: true
				};
			}
		}
	});

	$effect(() => {
		if (encounterCtx.id) {
			localstorageCtx.app_preferences.encounter_collapsible_preferences[encounterCtx.id] =
				encounterCollapsiblePreferences;
		}
	});

	function getEncounterColumns() {
		return Array.from(
			scrollContainer?.querySelectorAll<HTMLElement>('[data-encounter-column]') ?? []
		);
	}

	function getClosestColumnIndex() {
		const columns = getEncounterColumns();
		if (!scrollContainer || columns.length === 0) return -1;

		const viewportCenter = scrollContainer.scrollLeft + scrollContainer.clientWidth / 2;
		let closestIndex = 0;
		let closestDistance = Number.POSITIVE_INFINITY;

		for (const [index, column] of columns.entries()) {
			const columnCenter = column.offsetLeft + column.offsetWidth / 2;
			const distance = Math.abs(columnCenter - viewportCenter);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestIndex = index;
			}
		}

		return closestIndex;
	}

	function scrollToColumn(index: number) {
		const columns = getEncounterColumns();
		const target = columns[index];
		if (!scrollContainer || !target) return;

		const targetLeft = target.offsetLeft - (scrollContainer.clientWidth - target.offsetWidth) / 2;
		const maxScrollLeft = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);

		scrollContainer.scrollTo({
			left: Math.max(0, Math.min(targetLeft, maxScrollLeft)),
			behavior: 'smooth'
		});
	}

	function scrollColumns(direction: 'previous' | 'next') {
		const columns = getEncounterColumns();
		const closestIndex = getClosestColumnIndex();
		if (closestIndex === -1) return;

		const nextIndex = direction === 'next' ? closestIndex + 1 : closestIndex - 1;
		if (nextIndex < 0 || nextIndex >= columns.length) return;

		scrollToColumn(nextIndex);
	}

	function saveEncounterSettings() {
		if (!encounter) return;
		encounter.name = encounterName.trim();
		encounter.enable_massive_damage = enableMassiveDamage;
		settingsDialogOpen = false;
	}

	async function handleDeleteEncounter() {
		const encounterId = encounterCtx.id;
		if (!encounterId) return;

		try {
			await onBeforeDelete?.(encounterId);

			await encounterCtx.remove(encounterId);
			settingsDialogOpen = false;

			if (window.location.pathname.startsWith('/encounters/')) {
				await goto('/encounters');
			}
		} catch (error) {
			console.error('Failed to delete encounter', error);
			toast.error('Failed to delete encounter');
			throw error;
		}
	}
</script>

<AdversarySelectorSheet
	bind:open={adversarySheetOpen}
	onSelect={addAdversary}
	disabledIds={disabledAdversaryIds}
	{compendium}
	available_source_keys={encounterCtx.available_source_keys}
/>
{#if encounter}
	<AdversaryConditionsSheet
		bind:open={adversaryConditionsSheetOpen}
		instance={selectedAdversaryInstance}
		bind:condition_list={encounter.condition_list}
		encounter_adversary_instances={encounterAdversaryInstances}
	/>
{/if}
<EnvironmentSelectorSheet
	bind:open={environmentSheetOpen}
	onSelect={addEnvironment}
	disabledIds={disabledEnvironmentIds}
	{compendium}
	available_source_keys={encounterCtx.available_source_keys}
/>

<div class="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-30">
	<enhanced:img
		src={artEncounters}
		alt=""
		sizes="100vw"
		class="h-full max-h-[calc(100dvh-var(--navbar-height,3.5rem))] w-full object-cover object-center"
	/>
</div>

<div
	class={cn(
		'absolute inset-0 z-10 flex flex-col',
		'pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]'
	)}
>
	<div
		class="sticky top-[calc(var(--navbar-height,3.5rem)-1px)] z-20 w-full bg-background shadow-lg sm:top-0"
	>
		<div class="w-full bg-primary/50">
			<div
				class={cn('relative mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4', className)}
			>
				{@render children?.()}
				{#if encounter}
					<EncounterBattlePoints class="ml-auto" />
				{/if}
			</div>
		</div>
	</div>

	<div
		bind:this={scrollContainer}
		class={cn(
			'thin-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto sm:snap-none sm:gap-6',
			hideDesktopNotesColumn && 'lg:px-6'
		)}
		bind:clientHeight
	>
		<div
			class={cn(
				'min-w-19 grow',
				hideDesktopNotesColumn && 'lg:hidden'
			)}
		></div>
		{#if encounter}
			{#each encounter.items as item, i (item)}
			<div
				use:registerViewport={item}
				animate:flip={{ duration: 200 }}
				class="relative flex"
				data-encounter-column
			>
				<ScrollArea
					class="shrink-0 snap-center overflow-x-hidden overflow-y-auto"
					style="scrollbar-width: none;"
					scrollbarYClasses="pt-9 mr-[3px]"
					scrollbarYStyles={`padding-bottom: ${clientHeight / 2 + 60}px`}
				>
					{#if item.type === 'adversary'}
						{@const adversary =
							item.edited_adversary ?? compendium.adversaries[item.base_adversary_id]}
						{@const collapsibleState =
							encounterCollapsiblePreferences.adversaryCards[item.base_adversary_id]}
						{#if adversary && collapsibleState}
							<div
								class="flex flex-col items-center gap-2 pt-4"
								style={`margin-bottom: ${clientHeight / 2}px;`}
							>
								<SimpleContainer
									backgroundClass="fill-background/70 bg-background/70"
									edgeClass="fill-background/70  border-background/70"
								>
									<AdversaryCard
										{adversary}
										bind:instances={item.instances}
										addBonusDamage={encounter.bonus_damage}
										enableMassiveDamage={!!encounter.enable_massive_damage}
										bind:movesOpen={collapsibleState.movesOpen}
										bind:featuresOpen={collapsibleState.featuresOpen}
										bind:instanceOpenStates={collapsibleState.instanceOpenStates}
										onOpenConditions={(instanceIndex) =>
											openAdversaryConditions(adversary, item.instances, instanceIndex)}
										class="max-w-[calc(min(416px,100vw)-16px)] min-w-[calc(min(416px,100vw)-16px)] bg-transparent pt-0 pb-1"
									/>
								</SimpleContainer>
								<div class="sticky top-4 z-10 flex items-center justify-center gap-2">
									<div class="flex items-center">
										<Button
											variant="outline"
											size="sm"
											class="rounded-l-full rounded-r-none bg-background px-2 text-muted-foreground hover:bg-background hover:text-accent disabled:text-muted disabled:opacity-100"
											disabled={i === 0}
											onclick={() => swapItemWithPrevious(i)}
										>
											<ChevronLeft class="size-3.5" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											class="rounded-l-none rounded-r-full border-l-0 bg-background px-2 text-muted-foreground hover:bg-background hover:text-accent disabled:text-muted disabled:opacity-100"
											disabled={i === encounter.items.length - 1}
											onclick={() => swapItemWithNext(i)}
										>
											<ChevronRight class="size-3.5" />
										</Button>
									</div>

									<div
										class={cn(
											buttonVariants({ variant: 'outline', size: 'sm' }),
											'gap-0 rounded-full bg-background pr-0 text-muted-foreground hover:bg-background hover:text-muted-foreground'
										)}
									>
										<span class="ml-1 text-xs font-medium">Quantity</span>
										<Button
											variant="ghost"
											size="icon"
											class="h-full"
											onclick={() => {
												if (item.instances.length > 1) {
													item.instances.pop();
													collapsibleState.instanceOpenStates.pop();
												} else {
													removeItem(i);
												}
											}}
										>
											<Minus class="size-3.5 stroke-3" />
										</Button>
										<span class="w-3 text-center text-sm font-bold">{item.instances.length}</span>
										<Button
											variant="ghost"
											size="icon"
											class="h-full rounded-r-full"
											disabled={item.instances.length >= 8}
											onclick={() => {
												collapsibleState.instanceOpenStates.push(true);
												item.instances.push({
													name: '',
													conditions: [],
													marked_hp: 0,
													marked_stress: 0
												});
											}}
										>
											<Plus class="size-3.5 stroke-3" />
										</Button>
									</div>

									<Button
										variant="outline"
										size="sm"
										class="rounded-full bg-background text-muted-foreground hover:bg-background hover:text-accent"
										onclick={() => openItemEditor(i)}
									>
										<SquarePen class="size-3.5" />
										Edit
									</Button>
								</div>
							</div>
						{/if}
					{:else}
						{@const environment =
							item.edited_environment ?? compendium.environments[item.base_environment_id]}
						{@const collapsibleState =
							encounterCollapsiblePreferences.environmentCards[item.base_environment_id]}
						{#if environment && collapsibleState}
							<div
								class="flex flex-col items-center gap-2 pt-4"
								style={`margin-bottom: ${clientHeight / 2}px;`}
							>
								<SimpleContainer
									edgeClass="fill-primary border-primary"
									backgroundClass="fill-background/70 bg-background/70"
								>
									<EnvironmentCard
										{environment}
										bind:detailsOpen={collapsibleState.detailsOpen}
										bind:featuresOpen={collapsibleState.featuresOpen}
										class="max-w-[calc(min(416px,100vw)-16px)] min-w-[calc(min(416px,100vw)-16px)] bg-transparent  pt-0 pb-1"
									/>
								</SimpleContainer>
								<div class="flex items-center justify-center gap-2">
									<div class="flex items-center">
										<Button
											variant="outline"
											size="sm"
											class="rounded-l-full rounded-r-none bg-background px-2 text-muted-foreground hover:bg-background hover:text-accent disabled:text-muted disabled:opacity-100"
											disabled={i === 0}
											onclick={() => swapItemWithPrevious(i)}
										>
											<ChevronLeft class="size-3.5" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											class="rounded-l-none rounded-r-full border-l-0 bg-background px-2 text-muted-foreground hover:bg-background hover:text-accent disabled:text-muted disabled:opacity-100"
											disabled={i === encounter.items.length - 1}
											onclick={() => swapItemWithNext(i)}
										>
											<ChevronRight class="size-3.5" />
										</Button>
									</div>
									<Button
										variant="outline"
										size="sm"
										class="rounded-full bg-background text-muted-foreground hover:bg-background hover:text-accent"
										onclick={() => openItemEditor(i)}
									>
										<SquarePen class="size-3.5" />
										Edit
									</Button>

									<Button
										variant="outline"
										size="sm"
										class="rounded-full bg-background text-muted-foreground hover:bg-background hover:text-destructive"
										onclick={() => removeItem(i)}
									>
										<Trash class="size-3.5" />
										Delete
									</Button>
								</div>
							</div>
						{/if}
					{/if}
				</ScrollArea>
			</div>
			{/each}
			<div
				class={cn('flex', hideDesktopNotesColumn && 'lg:hidden')}
				data-encounter-column
			>
				<ScrollArea
					class="shrink-0 snap-center overflow-x-hidden overflow-y-auto"
					style="scrollbar-width: none;"
					scrollbarYClasses="pt-17.5 pb-6"
				>
					<div
						class="flex max-w-[calc(min(416px,100vw)-16px)] min-w-[calc(min(416px,100vw)-16px)] flex-col gap-2 py-4"
					>
						<div class="sticky top-4 flex items-center gap-2 px-1">
							<Button
								variant="outline"
								size="sm"
								onclick={() => (adversarySheetOpen = true)}
								class="rounded-full bg-background text-muted-foreground hover:bg-background hover:text-accent"
							>
								<Plus class="-ml-1 stroke-3" />
								Adversary
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={() => (environmentSheetOpen = true)}
								class="rounded-full bg-background text-muted-foreground hover:bg-background hover:text-accent"
							>
								<Plus class="-ml-1 stroke-3" />
								Environment
							</Button>
							{#if isOwner}
								<Button
									variant="outline"
									size="sm"
									onclick={() => (settingsDialogOpen = true)}
									class="ml-auto rounded-full bg-background text-muted-foreground hover:bg-background hover:text-accent"
								>
									<Settings class="size-4" />
									Settings
								</Button>
							{/if}
						</div>

						<EncounterNotes {encounter} />
					</div>
				</ScrollArea>
			</div>
		{/if}
		<div
			class={cn(
				'min-w-19 grow',
				hideDesktopNotesColumn && 'lg:hidden'
			)}
		></div>
	</div>

	<div
		class="@container pointer-events-none absolute top-1/2 right-0 left-0 z-10 flex -translate-y-1/2 justify-center"
	>
		<div class="flex w-full max-w-6xl items-center justify-between px-4 @min-[640px]:hidden">
			<Button
				class="pointer-events-auto mr-auto size-10 rounded-full"
				onclick={() => scrollColumns('previous')}
			>
				<ChevronLeft class="-ml-[1px] size-6" />
			</Button>
			<Button
				class="pointer-events-auto ml-auto size-10 rounded-full"
				onclick={() => scrollColumns('next')}
			>
				<ChevronRight class="-mr-[1px] size-6" />
			</Button>
		</div>
	</div>
</div>

<Dialog.Root bind:open={editDialogOpen}>
	<Dialog.Content class="flex max-h-[90%] flex-col sm:max-w-[760px]">
		<Dialog.Header>
			<Dialog.Title>
				{#if editingType === 'adversary'}
					Edit Adversary
				{:else if editingType === 'environment'}
					Edit Environment
				{/if}
			</Dialog.Title>
		</Dialog.Header>

		<div class="overflow-y-auto px-1 py-2">
			{#if editingType === 'adversary' && editingAdversary && editingItem?.type === 'adversary'}
				<HomebrewAdversaryForm
					bind:this={adversaryFormRef}
					itemId={editingItem.base_adversary_id}
					formId="encounter-adversary-form"
					bind:item={editingAdversary}
					bind:hasChanges={adversaryFormHasChanges}
					bind:hasErrors={adversaryFormHasErrors}
					onSubmit={() => {}}
				/>
			{:else if editingType === 'environment' && editingEnvironment && editingItem?.type === 'environment'}
				<HomebrewEnvironmentForm
					bind:this={environmentFormRef}
					itemId={editingItem.base_environment_id}
					formId="encounter-environment-form"
					bind:item={editingEnvironment}
					bind:hasChanges={environmentFormHasChanges}
					bind:hasErrors={environmentFormHasErrors}
					onSubmit={() => {}}
				/>
			{/if}
		</div>

		<Dialog.Footer class="flex gap-3">
			<Dialog.Close class={cn(buttonVariants({ variant: 'link' }), 'text-muted-foreground')}>
				Cancel
			</Dialog.Close>
			<Button
				type="button"
				size="sm"
				onclick={saveDialogEdits}
				disabled={(editingType === 'adversary' && !adversaryFormHasChanges) ||
					(editingType === 'environment' && !environmentFormHasChanges)}
			>
				Save
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={settingsDialogOpen}>
	<Dialog.Content class="flex max-h-[90%] flex-col">
		<Dialog.Header>
			<Dialog.Title>Encounter Settings</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col gap-6 overflow-y-auto py-4">
			<form
				class="flex flex-col gap-6"
				onsubmit={(event) => {
					event.preventDefault();
					saveEncounterSettings();
				}}
			>
				<div class="flex flex-col gap-2">
					<label for="encounter-settings-name" class="text-sm font-medium">Encounter Name</label>
					<Input
						id="encounter-settings-name"
						bind:value={encounterName}
						placeholder="Encounter name"
					/>
				</div>

				<Label class="cursor-pointer items-start">
					<Checkbox
						checked={enableMassiveDamage}
						onCheckedChange={(checked) => {
							enableMassiveDamage = checked ?? false;
						}}
					/>

					<div class="space-y-1">
						<p class="whitespace-nowrap">Massive Damage</p>
						<p class="text-xs font-normal text-muted-foreground">
							If a character ever takes damage equal to twice their Severe threshold, they mark 4 HP
							instead of 3.
						</p>
					</div>
				</Label>
			</form>

			<SafeDelete
				open={settingsDialogOpen}
				itemName={encounter?.name || ''}
				itemLabel="Encounter"
				deleteLabel="Delete Encounter"
				onDelete={handleDeleteEncounter}
			/>
		</div>

		<Dialog.Footer class="flex gap-3">
			<div class="grow"></div>
			<Dialog.Close class={cn(buttonVariants({ variant: 'link' }), 'text-muted-foreground')}>
				Cancel
			</Dialog.Close>
			<Button onclick={saveEncounterSettings} disabled={!hasSettingsChanges}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	@media (width < 40rem) {
		.thin-scrollbar {
			scrollbar-width: none;
		}
	}
</style>
