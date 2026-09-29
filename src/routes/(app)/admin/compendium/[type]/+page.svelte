<script lang="ts">
	import Database from '@lucide/svelte/icons/database';
	import Eye from '@lucide/svelte/icons/eye';
	import ListTree from '@lucide/svelte/icons/list-tree';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { goto } from '$app/navigation';
	import { onMount, tick, untrack } from 'svelte';
	import { deleteApi, getApi, patchApi, postApi } from '$lib/api/client';
	import Footer from '$lib/components/navigation/footer.svelte';
	import { Button } from '$lib/components/ui/button';
	import DomainCardEditor from './domain-card-editor.svelte';
	import MarkdownTextarea from './markdown-textarea.svelte';
	import FeatureUsageEditor from './feature-usage-editor.svelte';
	import FeaturePoolsForm from '$lib/components/homebrew/forms/shared/features/feature-pools-form.svelte';
	import FeatureRecordsForm from '$lib/components/homebrew/forms/shared/features/feature-records-form.svelte';
	import FeatureEffectsForm from '$lib/components/homebrew/forms/shared/features/feature-effects-form.svelte';
	import FeatureRollOptionsForm from '$lib/components/homebrew/forms/shared/features/feature-roll-options-form.svelte';
	import type { HomebrewTable } from '@domain/permissions';
	import type { SourceKey } from '@domain/schemas/rules';
	import type { SourceMetadata } from '@domain/schemas/sources';

	type Dashboard = {
		sources: (SourceMetadata & { enabled: boolean })[];
		versions: [];
		item_types: HomebrewTable[];
		counts: { source_key: SourceKey; item_type: HomebrewTable; count: number }[];
	};

	type AdminCompendiumItem = {
		item_type: HomebrewTable;
		item_id: string;
		source_key: SourceKey;
		version: number;
		current_version: number;
		label: string;
		changelog: string;
		title: string;
		item: Record<string, unknown>;
		updated_at: string | number;
	};

	type MutableItem = Record<string, any>;
	type FilterKey = 'sources' | 'domains' | 'classes' | 'categories' | 'tiers' | 'types' | 'levels';
	type FilterDefinition = {
		key: FilterKey;
		label: string;
		fields: string[];
		prefix?: string;
	};
	type RelatedGroup = {
		label: string;
		items: AdminCompendiumItem[];
	};

	let { data }: { data: any } = $props();

	const TRAITS = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];
	const RANGES = ['Melee', 'Very Close', 'Close', 'Far', 'Very Far'];
	const DAMAGE_TYPES = ['phy', 'mag'];
	const WEAPON_TYPES = ['Physical', 'Magical'];
	const ADVERSARY_TYPES = [
		'Bruiser',
		'Horde',
		'Leader',
		'Minion',
		'Ranged',
		'Skulk',
		'Social',
		'Solo',
		'Standard',
		'Support'
	];
	const ENVIRONMENT_TYPES = ['Exploration', 'Social', 'Traversal', 'Event'];
	const FILTER_DEFINITIONS: FilterDefinition[] = [
		{ key: 'sources', label: 'Source', fields: ['source_key'] },
		{ key: 'domains', label: 'Domain', fields: ['domain_id', 'primary_domain_id', 'secondary_domain_id'] },
		{ key: 'classes', label: 'Class', fields: ['class_id'] },
		{ key: 'categories', label: 'Category', fields: ['category'] },
		{ key: 'tiers', label: 'Tier', fields: ['tier'], prefix: 'Tier' },
		{ key: 'types', label: 'Type', fields: ['type'] },
		{ key: 'levels', label: 'Level', fields: ['level_requirement'], prefix: 'Level' }
	];
	const FILTER_STORAGE_PREFIX = 'daggerlore:admin-compendium:filters:';
	const ADMIN_COMPENDIUM_TYPES = [
		'primary_weapons',
		'secondary_weapons',
		'armor',
		'loot',
		'consumables',
		'beastforms',
		'classes',
		'subclasses',
		'domains',
		'domain_cards',
		'ancestry_cards',
		'community_cards',
		'transformations',
		'character_sheet_addons',
		'adversaries',
		'environments'
	] as const satisfies HomebrewTable[];

	let dashboard = $state<Dashboard | null>(null);
	let items = $state<AdminCompendiumItem[]>([]);
	let referenceItems = $state<AdminCompendiumItem[]>([]);
	let selectedItemType = $state<HomebrewTable | ''>('');
	let selectedItemKey = $state('');
	let sectionsExpanded = $state(false);
	let filtersExpanded = $state(false);
	let relatedExpanded = $state(false);
	let filtersReady = $state(false);
	let listFilters = $state<Record<FilterKey, string[]>>(emptyFilters());
	let editorItem = $state<MutableItem | null>(null);
	let createMode = $state(false);
	let loadError = $state('');
	let saveError = $state('');
	let isLoading = $state(false);
	let isSaving = $state(false);
	let routeStateKey = $state('');
	let previewOpen = $state(false);
	let baselineEditorChecksum = $state('');
	let editorHeaderElement = $state<HTMLDivElement | null>(null);
	let editorContentElement = $state<HTMLDivElement | null>(null);
	let titleInputElement = $state<HTMLInputElement | null>(null);

	const selectedItem = $derived(
		items.find((item) => itemKey(item) === selectedItemKey) ?? null
	);
	const totalItems = $derived(
		dashboard?.counts.reduce((total: number, count) => total + count.count, 0) ?? 0
	);
	const entityTypes = $derived(
		[...new Set([...(dashboard?.item_types ?? []), ...ADMIN_COMPENDIUM_TYPES])].sort((a, b) =>
			itemTypeLabel(a).localeCompare(itemTypeLabel(b))
		)
	);
	const selectedTypeCount = $derived(selectedItemType ? countFor(selectedItemType) : totalItems);
	const filteredItems = $derived(
		items
			.filter((item) => !selectedItemType || item.item_type === selectedItemType)
			.filter((item) => matchesListFilters(item))
			.sort(compareListItems)
	);
	const sourceFilterOptions = $derived(
		[...new Set(items.map((item) => item.source_key))]
			.sort((a, b) => sourceLabel(a).localeCompare(sourceLabel(b)))
			.map((sourceKey) => ({ value: sourceKey, label: sourceLabel(sourceKey) }))
	);
	const domainFilterOptions = $derived(
		optionItems('domains').map((item) => ({ value: item.item_id, label: referenceLabel(item) }))
	);
	const classFilterOptions = $derived(
		optionItems('classes').map((item) => ({ value: item.item_id, label: referenceLabel(item) }))
	);
	const categoryFilterOptions = $derived(uniqueItemValues('category'));
	const tierFilterOptions = $derived(uniqueItemValues('tier'));
	const typeFilterOptions = $derived(uniqueItemValues('type'));
	const levelFilterOptions = $derived(uniqueItemValues('level_requirement'));
	const activeFilterDefinitions = $derived(
		FILTER_DEFINITIONS.filter((definition) => filterDefinitionAvailable(definition))
	);
	const activeFilterCount = $derived(
		Object.values(listFilters).reduce((total, values) => total + values.length, 0)
	);
	const relatedGroups = $derived(buildRelatedGroups());
	const currentEditorChecksum = $derived(buildEditorChecksum());
	const hasEditorChanges = $derived(
		Boolean(editorItem && selectedItemType && currentEditorChecksum !== baselineEditorChecksum)
	);

	function itemKey(item: AdminCompendiumItem) {
		return `${item.source_key}:${item.item_type}:${item.item_id}`;
	}

	function slugId(value: unknown) {
		if (typeof value !== 'string') return '';
		return value
			.trim()
			.toLowerCase()
			.replace(/['"]/g, '')
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '');
	}

	function itemTypeLabel(itemType: string) {
		return itemType
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}

	function countFor(itemType: HomebrewTable) {
		return (
			dashboard?.counts
				.filter((count) => count.item_type === itemType)
				.reduce((total, count) => total + count.count, 0) ?? 0
		);
	}

	function cloneItem(item: unknown): MutableItem {
		return JSON.parse(JSON.stringify(item ?? {})) as MutableItem;
	}

	function stableStringify(value: unknown): string {
		return JSON.stringify(value, (_key, currentValue) => {
			if (!currentValue || typeof currentValue !== 'object' || Array.isArray(currentValue)) {
				return currentValue;
			}
			return Object.fromEntries(
				Object.entries(currentValue as Record<string, unknown>).sort(([left], [right]) =>
					left.localeCompare(right)
				)
			);
		});
	}

	function buildEditorChecksum() {
		if (!editorItem || !selectedItemType) return '';
		const sourceKey = editorItem.source_key as SourceKey | undefined;
		const itemId = createMode ? slugId(editorItem.title) : selectedItem?.item_id;
		return stableStringify({
			item_type: selectedItemType,
			item_id: itemId ?? '',
			source_key: sourceKey ?? '',
			item: { ...itemForSave(editorItem, selectedItemType), source_key: sourceKey }
		});
	}

	function captureEditorBaseline() {
		baselineEditorChecksum = buildEditorChecksum();
	}

	function optionItems(itemType: HomebrewTable) {
		return [...items, ...referenceItems]
			.filter((item) => item.item_type === itemType)
			.sort((a, b) => a.title.localeCompare(b.title) || a.item_id.localeCompare(b.item_id));
	}

	function uniqueItems(items: AdminCompendiumItem[]) {
		const seen = new Set<string>();
		return items.filter((item) => {
			const key = itemKey(item);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	function itemMatchesAny(item: AdminCompendiumItem, fields: string[], ids: string[]) {
		const allowed = new Set(ids.filter(Boolean));
		if (allowed.size === 0) return false;
		return fields.some((field) => {
			const value = item.item?.[field];
			return typeof value === 'string' && allowed.has(value);
		});
	}

	function relatedByIds(itemType: HomebrewTable, ids: string[]) {
		const allowed = new Set(ids.filter(Boolean));
		if (allowed.size === 0) return [];
		return optionItems(itemType).filter((item) => allowed.has(item.item_id));
	}

	function relatedByFields(itemType: HomebrewTable, fields: string[], ids: string[]) {
		return optionItems(itemType).filter((item) => itemMatchesAny(item, fields, ids));
	}

	function addRelatedGroup(groups: RelatedGroup[], label: string, items: AdminCompendiumItem[]) {
		const relatedItems = uniqueItems(items).filter((item) => itemKey(item) !== selectedItemKey);
		if (relatedItems.length > 0) groups.push({ label, items: relatedItems });
	}

	function buildRelatedGroups(): RelatedGroup[] {
		if (!selectedItem || !editorItem || createMode) return [];
		const currentEditorItem = editorItem;
		const groups: RelatedGroup[] = [];
		const currentId = selectedItem.item_id;

		if (selectedItemType === 'classes') {
			const domainIds = [currentEditorItem.primary_domain_id, currentEditorItem.secondary_domain_id].filter(
				(value): value is string => typeof value === 'string' && value.length > 0
			);
			const subclassIds = Array.isArray(currentEditorItem.subclass_ids) ? currentEditorItem.subclass_ids : [];
			addRelatedGroup(groups, 'Domains', relatedByIds('domains', domainIds));
			addRelatedGroup(groups, 'Subclasses', [
				...relatedByIds('subclasses', subclassIds),
				...relatedByFields('subclasses', ['class_id'], [currentId])
			]);
			addRelatedGroup(groups, 'Domain Cards', relatedByFields('domain_cards', ['domain_id'], domainIds));
			addRelatedGroup(groups, 'Suggested Equipment', [
				...relatedByIds('primary_weapons', [currentEditorItem.suggested_primary_weapon_id]),
				...relatedByIds('secondary_weapons', [currentEditorItem.suggested_secondary_weapon_id]),
				...relatedByIds('armor', [currentEditorItem.suggested_armor_id])
			]);
		} else if (selectedItemType === 'domains') {
			addRelatedGroup(
				groups,
				'Classes',
				relatedByFields('classes', ['primary_domain_id', 'secondary_domain_id'], [currentId])
			);
			addRelatedGroup(groups, 'Domain Cards', relatedByFields('domain_cards', ['domain_id'], [currentId]));
		} else if (selectedItemType === 'subclasses') {
			const parentClass = optionItems('classes').find((item) => item.item_id === currentEditorItem.class_id);
			addRelatedGroup(groups, 'Class', parentClass ? [parentClass] : []);
			if (parentClass) {
				const domainIds = [parentClass.item?.primary_domain_id, parentClass.item?.secondary_domain_id].filter(
					(value): value is string => typeof value === 'string' && value.length > 0
				);
				addRelatedGroup(groups, 'Class Domain Cards', relatedByFields('domain_cards', ['domain_id'], domainIds));
			}
			addRelatedGroup(groups, 'Suggested Equipment', [
				...relatedByIds('primary_weapons', [currentEditorItem.suggested_primary_weapon_id]),
				...relatedByIds('secondary_weapons', [currentEditorItem.suggested_secondary_weapon_id]),
				...relatedByIds('armor', [currentEditorItem.suggested_armor_id])
			]);
			const sheetAddonIds = Array.isArray(currentEditorItem.sheet_addon_ids)
				? currentEditorItem.sheet_addon_ids
				: [];
			addRelatedGroup(groups, 'Sheet Add-ons', relatedByIds('character_sheet_addons', sheetAddonIds));
		} else if (selectedItemType === 'character_sheet_addons') {
			addRelatedGroup(
				groups,
				'Used By Subclasses',
				optionItems('subclasses').filter(
					(item) =>
						Array.isArray(item.item?.sheet_addon_ids) &&
						item.item.sheet_addon_ids.includes(currentId)
				)
			);
		} else if (selectedItemType === 'domain_cards') {
			addRelatedGroup(groups, 'Domain', relatedByIds('domains', [currentEditorItem.domain_id]));
			addRelatedGroup(
				groups,
				'Classes',
				relatedByFields('classes', ['primary_domain_id', 'secondary_domain_id'], [currentEditorItem.domain_id])
			);
		} else if (selectedItemType === 'primary_weapons') {
			addRelatedGroup(groups, 'Suggested For Classes', relatedByFields('classes', ['suggested_primary_weapon_id'], [currentId]));
			addRelatedGroup(groups, 'Suggested For Subclasses', relatedByFields('subclasses', ['suggested_primary_weapon_id'], [currentId]));
		} else if (selectedItemType === 'secondary_weapons') {
			addRelatedGroup(groups, 'Suggested For Classes', relatedByFields('classes', ['suggested_secondary_weapon_id'], [currentId]));
			addRelatedGroup(groups, 'Suggested For Subclasses', relatedByFields('subclasses', ['suggested_secondary_weapon_id'], [currentId]));
		} else if (selectedItemType === 'armor') {
			addRelatedGroup(groups, 'Suggested For Classes', relatedByFields('classes', ['suggested_armor_id'], [currentId]));
			addRelatedGroup(groups, 'Suggested For Subclasses', relatedByFields('subclasses', ['suggested_armor_id'], [currentId]));
		} else if (selectedItemType === 'adversaries') {
			addRelatedGroup(
				groups,
				'Environments',
				optionItems('environments').filter((item) =>
					Array.isArray(item.item?.potential_adversaries_ids) &&
					item.item.potential_adversaries_ids.includes(currentId)
				)
			);
		} else if (selectedItemType === 'environments') {
			const adversaryIds = Array.isArray(currentEditorItem.potential_adversaries_ids)
				? currentEditorItem.potential_adversaries_ids
				: [];
			addRelatedGroup(groups, 'Potential Adversaries', relatedByIds('adversaries', adversaryIds));
		}

		return groups;
	}

	function sourceLabel(sourceKey: SourceKey | string | undefined) {
		return (
			dashboard?.sources.find((source) => source.source_key === sourceKey)?.name ??
			sourceKey ??
			'Source'
		);
	}

	function referenceLabel(item: AdminCompendiumItem) {
		const currentSourceKey = editorItem?.source_key as SourceKey | undefined;
		if (!currentSourceKey || item.source_key === currentSourceKey) return item.title;
		return `${item.title} (${sourceLabel(item.source_key)})`;
	}

	function referenceTitle(itemType: HomebrewTable, itemId: unknown) {
		if (typeof itemId !== 'string' || !itemId) return '';
		return optionItems(itemType).find((item) => item.item_id === itemId)?.title ?? itemId;
	}

	function compareText(left: unknown, right: unknown) {
		return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
			numeric: true,
			sensitivity: 'base'
		});
	}

	function compareListItems(left: AdminCompendiumItem, right: AdminCompendiumItem) {
		if (left.item_type === 'domain_cards' && right.item_type === 'domain_cards') {
			return (
				compareText(referenceTitle('domains', left.item?.domain_id), referenceTitle('domains', right.item?.domain_id)) ||
				compareText(left.item?.level_requirement, right.item?.level_requirement) ||
				compareText(left.title, right.title) ||
				compareText(left.item_id, right.item_id)
			);
		}
		return compareText(left.title, right.title) || compareText(left.item_id, right.item_id);
	}

	function listSummary(item: AdminCompendiumItem) {
		const parts = [sourceLabel(item.source_key)];
		const value = (field: string) => item.item?.[field];
		const add = (label: string, candidate: unknown) => {
			if (candidate == null || candidate === '') return;
			parts.push(label ? `${label} ${candidate}` : String(candidate));
		};

		add('', referenceTitle('domains', value('domain_id')));
		const primaryDomain = referenceTitle('domains', value('primary_domain_id'));
		const secondaryDomain = referenceTitle('domains', value('secondary_domain_id'));
		if (primaryDomain || secondaryDomain) {
			parts.push([primaryDomain, secondaryDomain].filter(Boolean).join(' / '));
		}
		add('', referenceTitle('classes', value('class_id')));
		add('Level', value('level_requirement'));
		add('Tier', value('tier'));
		add('', value('category'));
		add('', value('type'));
		add('', value('range'));

		return [...new Set(parts.filter(Boolean))].join(' / ');
	}

	function uniqueItemValues(field: string) {
		return [...new Set(items.map((item) => item.item?.[field]).filter((value) => value != null && value !== ''))]
			.map((value) => String(value))
			.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
			.map((value) => ({ value, label: value }));
	}

	function fieldValues(item: AdminCompendiumItem, fields: string[]) {
		return fields
			.map((field) => (field === 'source_key' ? item.source_key : item.item?.[field]))
			.filter((value) => value != null && value !== '')
			.map((value) => String(value));
	}

	function matchesFilterDefinition(item: AdminCompendiumItem, definition: FilterDefinition) {
		const selectedValues = listFilters[definition.key];
		if (selectedValues.length === 0) return true;
		return fieldValues(item, definition.fields).some((value) => selectedValues.includes(value));
	}

	function matchesListFilters(item: AdminCompendiumItem) {
		return FILTER_DEFINITIONS.every((definition) => matchesFilterDefinition(item, definition));
	}

	function filterOptions(definition: FilterDefinition) {
		if (definition.key === 'sources') return sourceFilterOptions;
		if (definition.key === 'domains') return domainFilterOptions;
		if (definition.key === 'classes') return classFilterOptions;
		if (definition.key === 'categories') return categoryFilterOptions;
		if (definition.key === 'tiers') return tierFilterOptions;
		if (definition.key === 'types') return typeFilterOptions;
		if (definition.key === 'levels') return levelFilterOptions;
		return [];
	}

	function filterDefinitionAvailable(definition: FilterDefinition) {
		if (filterOptions(definition).length === 0) return false;
		if (definition.key === 'sources') return true;
		return items.some((item) => fieldValues(item, definition.fields).length > 0);
	}

	function filterOptionLabel(definition: FilterDefinition, label: string) {
		return definition.prefix ? `${definition.prefix} ${label}` : label;
	}

	function emptyFilters(): Record<FilterKey, string[]> {
		return {
			sources: [],
			domains: [],
			classes: [],
			categories: [],
			tiers: [],
			types: [],
			levels: []
		};
	}

	function filterStorageKey(itemType: HomebrewTable | '') {
		return itemType ? `${FILTER_STORAGE_PREFIX}${itemType}` : '';
	}

	function storedFilters(itemType: HomebrewTable | '') {
		const storageKey = filterStorageKey(itemType);
		if (!storageKey || typeof localStorage === 'undefined') return emptyFilters();
		try {
			const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Partial<Record<FilterKey, unknown>>;
			const next = emptyFilters();
			for (const definition of FILTER_DEFINITIONS) {
				const values = parsed[definition.key];
				next[definition.key] = Array.isArray(values)
					? values.filter((value): value is string => typeof value === 'string')
					: [];
			}
			return next;
		} catch {
			return emptyFilters();
		}
	}

	function persistFilters() {
		const storageKey = filterStorageKey(selectedItemType);
		if (!filtersReady || !storageKey || typeof localStorage === 'undefined') return;
		localStorage.setItem(storageKey, JSON.stringify(listFilters));
	}

	function setFilter(key: FilterKey, values: string[]) {
		listFilters = { ...listFilters, [key]: values };
	}

	function selectValues(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		return [...select.selectedOptions].map((option) => option.value);
	}

	function toggleArrayValue(target: MutableItem, key: string, value: string, checked: boolean) {
		const current = Array.isArray(target[key]) ? target[key] : [];
		target[key] = checked
			? [...new Set([...current, value])]
			: current.filter((entry: string) => entry !== value);
	}

	function clearFilters() {
		listFilters = emptyFilters();
	}

	function toggleFilters() {
		filtersExpanded = !filtersExpanded;
	}

	function referenceTypesFor(itemType: HomebrewTable | ''): HomebrewTable[] {
		if (itemType === 'classes') {
			return [
				'domains',
				'subclasses',
				'domain_cards',
				'primary_weapons',
				'secondary_weapons',
				'armor',
				'loot',
				'consumables'
			];
		}
		if (itemType === 'subclasses') {
			return [
				'classes',
				'domain_cards',
				'primary_weapons',
				'secondary_weapons',
				'armor',
				'character_sheet_addons'
			];
		}
		if (itemType === 'character_sheet_addons') return ['subclasses'];
		if (itemType === 'domains') return ['classes', 'domain_cards'];
		if (itemType === 'domain_cards') return ['domains', 'classes'];
		if (itemType === 'primary_weapons' || itemType === 'secondary_weapons' || itemType === 'armor') {
			return ['classes', 'subclasses'];
		}
		if (itemType === 'adversaries') return ['environments'];
		if (itemType === 'environments') return ['adversaries'];
		return [];
	}

	function itemQuery() {
		const params = new URLSearchParams();
		if (selectedItemType) params.set('item_type', selectedItemType);
		const query = params.toString();
		return query ? `?${query}` : '';
	}

	function editorHref(itemType: HomebrewTable) {
		return `/admin/compendium/${itemType}`;
	}

	function entityHref(item: AdminCompendiumItem) {
		return `/admin/compendium/${item.item_type}/${encodeURIComponent(item.item_id)}`;
	}

	function routeItemId() {
		return data.itemId ? String(data.itemId) : '';
	}

	function clearSelection() {
		selectedItemKey = '';
		editorItem = null;
		createMode = false;
		saveError = '';
		baselineEditorChecksum = '';
	}

	function scrollEditorToTop() {
		tick().then(() => {
			if (!editorContentElement) return;
			const headerHeight = editorHeaderElement?.offsetHeight ?? 0;
			const targetTop =
				editorContentElement.getBoundingClientRect().top + window.scrollY - headerHeight;
			window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
		});
	}

	function focusTitleInput() {
		tick().then(() => {
			titleInputElement?.focus();
			titleInputElement?.select();
		});
	}

	async function navigateToType(itemType: HomebrewTable) {
		await goto(editorHref(itemType), { noScroll: true });
	}

	async function navigateToItem(item: AdminCompendiumItem) {
		await goto(entityHref(item), { noScroll: true });
	}

	async function loadDashboard() {
		loadError = '';
		try {
			dashboard = await getApi<Dashboard>('/admin/compendium');
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Unable to load admin dashboard';
		}
	}

	async function loadItems() {
		loadError = '';
		isLoading = true;
		try {
			items = await getApi<AdminCompendiumItem[]>(`/admin/compendium/items${itemQuery()}`);
			applyRouteSelection();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Unable to load compendium items';
		} finally {
			isLoading = false;
		}
	}

	async function loadReferences() {
		const referenceTypes = referenceTypesFor(selectedItemType);
		if (referenceTypes.length === 0) {
			referenceItems = [];
			return;
		}
		try {
			const batches = await Promise.all(
				referenceTypes.map((itemType) =>
					getApi<AdminCompendiumItem[]>(`/admin/compendium/items?item_type=${itemType}`)
				)
			);
			referenceItems = batches.flat();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Unable to load reference data';
		}
	}

	function selectItemForEdit(item: AdminCompendiumItem) {
		const nextItemKey = itemKey(item);
		const shouldScroll = createMode || selectedItemKey !== nextItemKey;
		createMode = false;
		selectedItemKey = nextItemKey;
		editorItem = { ...cloneItem(item.item), source_key: item.source_key };
		saveError = '';
		captureEditorBaseline();
		if (shouldScroll) scrollEditorToTop();
	}

	function applyRouteSelection() {
		const itemId = routeItemId();
		if (!itemId) {
			if (!createMode) clearSelection();
			return;
		}
		const item = items.find((candidate) => candidate.item_type === selectedItemType && candidate.item_id === itemId);
		if (item) {
			selectItemForEdit(item);
		} else if (!isLoading) {
			clearSelection();
		}
	}

	function startCreate(itemType: HomebrewTable) {
		const sourceKey = dashboard?.sources[0]?.source_key ?? '';
		createMode = true;
		selectedItemType = itemType;
		selectedItemKey = '';
		editorItem = defaultItem(itemType, sourceKey as SourceKey);
		saveError = '';
		captureEditorBaseline();
		scrollEditorToTop();
		focusTitleInput();
	}

	function removeEmptyOptionalFields(item: MutableItem, keys: string[]) {
		const next = { ...item };
		for (const key of keys) {
			if (next[key] === '') delete next[key];
		}
		return next;
	}

	function itemForSave(item: MutableItem, itemType: HomebrewTable) {
		if (itemType === 'classes') {
			return removeEmptyOptionalFields(item, [
				'primary_domain_id',
				'secondary_domain_id',
				'spellcast_trait',
				'suggested_primary_weapon_id',
				'suggested_secondary_weapon_id',
				'suggested_armor_id'
			]);
		}
		if (itemType === 'subclasses') {
			return removeEmptyOptionalFields(item, ['class_id', 'spellcast_trait']);
		}
		if (itemType === 'beastforms') {
			return removeEmptyOptionalFields(item, ['special_case']);
		}
		return item;
	}

	async function saveItem() {
		if (!editorItem || !selectedItemType || !hasEditorChanges) return;
		saveError = '';
		isSaving = true;
		try {
			const sourceKey = editorItem.source_key as SourceKey | undefined;
			if (!sourceKey) throw new Error('Source is required');
			const itemId = createMode ? slugId(editorItem.title) : selectedItem?.item_id;
			if (createMode && !itemId) throw new Error('Title is required to derive an item ID');
			const item = itemForSave(editorItem, selectedItemType);
			const payload = {
				item_type: selectedItemType,
				item_id: itemId,
				source_key: sourceKey,
				original_source_key: selectedItem?.source_key,
				item: { ...item, source_key: sourceKey }
			};
			if (!payload.item_id) throw new Error('Item ID is required');
			if (createMode) await postApi<void>('/admin/compendium/items', payload);
			else await patchApi<void>('/admin/compendium/items', payload);
			const savedItemKey = `${payload.source_key}:${payload.item_type}:${payload.item_id}`;
			selectedItemKey = savedItemKey;
			createMode = false;
			captureEditorBaseline();
			await loadDashboard();
			await loadItems();
			const savedItem = items.find((item) => itemKey(item) === savedItemKey);
			if (savedItem) await navigateToItem(savedItem);
			scrollEditorToTop();
		} catch (error) {
			saveError = error instanceof Error ? error.message : 'Unable to save compendium item';
		} finally {
			isSaving = false;
		}
	}

	async function deleteItem() {
		if (!selectedItem || !confirm(`Delete ${selectedItem.title}?`)) return;
		const deletedType = selectedItem.item_type;
		saveError = '';
		isSaving = true;
		try {
			await deleteApi<void>('/admin/compendium/items', {
				item_type: selectedItem.item_type,
				item_id: selectedItem.item_id,
				source_key: selectedItem.source_key
			});
			selectedItemKey = '';
			editorItem = null;
			await loadDashboard();
			await loadItems();
			await goto(editorHref(deletedType), { noScroll: true });
		} catch (error) {
			saveError = error instanceof Error ? error.message : 'Unable to delete compendium item';
		} finally {
			isSaving = false;
		}
	}

	function defaultFeature() {
		return { title: '', description_html: '', character_modifiers: [], weapon_modifiers: [] };
	}

	function defaultBaseCard(sourceKey: SourceKey) {
		return {
			source_key: sourceKey,
			title: '',
			description_html: '',
			image_url: '',
			artist_name: '',
			features: [defaultFeature()]
		};
	}

	function defaultDomainCard(sourceKey: SourceKey) {
		return {
			source_key: sourceKey,
			title: '',
			image_url: '',
			artist_name: '',
			features: [defaultFeature()],
			level_requirement: 1,
			recall_cost: 0,
			category: 'ability'
		};
	}

	function defaultWeapon(sourceKey: SourceKey) {
		return {
			source_key: sourceKey,
			title: '',
			description_html: '',
			level_requirement: 1,
			type: 'Physical',
			available_traits: ['agility'],
			range: 'Melee',
			features: [],
			attack_roll_bonus: 0,
			damage_bonus: 0,
			damage_dice: 'd6',
			available_damage_types: ['phy'],
			burden: 0
		};
	}

	function defaultItem(itemType: HomebrewTable, sourceKey: SourceKey): MutableItem {
		if (itemType === 'primary_weapons' || itemType === 'secondary_weapons') return defaultWeapon(sourceKey);
		if (itemType === 'armor') {
			return {
				source_key: sourceKey,
				level_requirement: 1,
				title: '',
				description_html: '',
				max_armor: 0,
				damage_thresholds: { major: 0, severe: 0 },
				features: []
			};
		}
		if (itemType === 'loot') {
			return {
				source_key: sourceKey,
				rarity_roll: 1,
				title: '',
				description_html: '',
				character_modifiers: [],
				weapon_modifiers: []
			};
		}
		if (itemType === 'consumables') {
			return { source_key: sourceKey, rarity_roll: 1, title: '', description_html: '' };
		}
		if (itemType === 'beastforms') {
			return {
				source_key: sourceKey,
				level_requirement: 1,
				title: '',
				category: '',
				character_trait: { trait: 'agility', bonus: 0 },
				attack: { range: 'Melee', trait: 'agility', damage_dice: 'd6', damage_bonus: 0, damage_type: 'phy' },
				advantages: [],
				evasion_bonus: 0,
				features: [],
				special_case: undefined
			};
		}
		if (itemType === 'classes') {
			return {
				source_key: sourceKey,
				title: '',
				image_url: '',
				artist_name: '',
				description_html: '',
				starting_evasion: 10,
				starting_max_hp: 6,
				hope_feature: defaultFeature(),
				class_features: [],
				subclass_ids: [],
				suggested_traits: {},
				starting_inventory: {
					gold_coins: 0,
					free_gear: [],
					loot_or_consumable_options: [],
					class_gear_options: []
				},
				background_questions: [],
				connection_questions: [],
				character_description_suggestions: {
					clothes: '',
					eyes: '',
					body: '',
					skin: '',
					attitude: ''
				}
			};
		}
		if (itemType === 'subclasses') {
			return {
				source_key: sourceKey,
				title: '',
				description_html: '',
				image_url: '',
				artist_name: '',
				sheet_addon_ids: [],
				foundation_card: { ...defaultBaseCard(sourceKey), level_up_options: [] },
				specialization_card: { ...defaultBaseCard(sourceKey), level_up_options: [] },
				mastery_card: { ...defaultBaseCard(sourceKey), level_up_options: [] }
			};
		}
		if (itemType === 'character_sheet_addons') {
			return {
				source_key: sourceKey,
				title: '',
				description_html: '',
				resource: { title: '', description_html: '', max: 0 },
				sections: []
			};
		}
		if (itemType === 'domains') {
			return {
				source_key: sourceKey,
				title: '',
				description_html: '',
				color: '#6d46d9',
				foreground_color: '#ffffff',
				image_url: '',
				artist_name: ''
			};
		}
		if (itemType === 'domain_cards') {
			return defaultDomainCard(sourceKey);
		}
		if (itemType === 'ancestry_cards' || itemType === 'community_cards') {
			return defaultBaseCard(sourceKey);
		}
		if (itemType === 'transformations') {
			return {
				source_key: sourceKey,
				title: '',
				description_html: '',
				features: [],
				questions: []
			};
		}
		if (itemType === 'adversaries') {
			return {
				source_key: sourceKey,
				title: '',
				tier: 1,
				type: 'Standard',
				image_url: '',
				artist_name: '',
				description: '',
				motives_tactics: '',
				difficulty: 10,
				thresholds: { major: 0, severe: 0 },
				max_hp: 1,
				max_stress: 1,
				attack_modifier: 0,
				standard_attack: { name: '', range: 'Melee', damage_dice: 'd6', damage_bonus: 0, damage_type: 'phy' },
				experiences: [],
				experience_modifiers: [],
				features: []
			};
		}
		return {
			source_key: sourceKey,
			title: '',
			description: '',
			tier: 1,
			image_url: '',
			artist_name: '',
			type: 'Exploration',
			impulses: '',
			relative_strength: undefined,
			difficulty: 10,
			potential_adversaries: '',
			potential_adversaries_ids: [],
			features: []
		};
	}

	function addFeature(target: MutableItem, key = 'features') {
		target[key] = [...(target[key] ?? []), defaultFeature()];
	}

	function addClassFeature(target: MutableItem) {
		target.class_features = [
			...(target.class_features ?? []),
			{ ...defaultFeature(), tokens_enabled: false, token_max: 6 }
		];
	}

	function ensureSubclassCard(target: MutableItem, key: string) {
		target[key] ??= { features: [], options: [] };
		target[key].features ??= [];
	}

	function addSubclassCardFeature(target: MutableItem, key: string) {
		ensureSubclassCard(target, key);
		addFeature(target[key]);
	}

	function removeSubclassCardFeature(target: MutableItem, key: string, index: number) {
		ensureSubclassCard(target, key);
		removeArrayItem(target[key], 'features', index);
	}

	function addSheetAddonSection(target: MutableItem) {
		target.sections = [
			...(target.sections ?? []),
			{ title: '', description_html: '', tier: undefined, options: [] }
		];
	}

	function addSheetAddonOption(section: MutableItem) {
		section.options = [
			...(section.options ?? []),
			{
				option_id: `option_${(section.options ?? []).length + 1}`,
				title: '',
				description_html: ''
			}
		];
	}

	function addSubclassCardChoice(target: MutableItem, key: string, type: 'arbitrary' | 'experience') {
		ensureSubclassCard(target, key);
		target[key].options ??= [];
		const nextChoice =
			type === 'arbitrary'
				? {
						type,
						choice_id: `choice_${target[key].options.length + 1}`,
						max: 1,
						conditional_choice: null,
						options: [{ selection_id: 'option_1', title: '', short_title: '' }]
					}
				: {
						type,
						choice_id: `choice_${target[key].options.length + 1}`,
						max: 1,
						conditional_choice: null
					};
		target[key].options = [...target[key].options, nextChoice];
	}

	function updateCardChoiceType(choice: MutableItem, type: string) {
		choice.type = type;
		if (type === 'arbitrary') {
			choice.options = choice.options?.length
				? choice.options
				: [{ selection_id: 'option_1', title: '', short_title: '' }];
		} else {
			delete choice.options;
		}
	}

	function addCardChoiceSelection(choice: MutableItem) {
		choice.options = [
			...(choice.options ?? []),
			{ selection_id: `option_${(choice.options ?? []).length + 1}`, title: '', short_title: '' }
		];
	}

	function removeCardChoiceSelection(choice: MutableItem, index: number) {
		choice.options = (choice.options ?? []).filter(
			(_: unknown, itemIndex: number) => itemIndex !== index
		);
	}

	function addSubclassLevelUpOption(target: MutableItem, key: string) {
		ensureSubclassCard(target, key);
		target[key].level_up_options = [
			...(target[key].level_up_options ?? []),
			{
				type: 'domain_card',
				option_id: `domain_card_${(target[key].level_up_options ?? []).length + 1}`,
				title: '',
				short_title: '',
				max: 1
			}
		];
	}

	function addAdversaryFeature(target: MutableItem) {
		target.features = [
			...(target.features ?? []),
			{ type: 'Passive', name: '', max_uses: null, description_html: '' }
		];
	}

	function addEnvironmentFeature(target: MutableItem) {
		target.features = [
			...(target.features ?? []),
			{ type: 'Passive', name: '', description_html: '', questions: '' }
		];
	}

	function addTransformationFeature(target: MutableItem) {
		target.features = [...(target.features ?? []), { name: '', description_html: '' }];
	}

	function removeArrayItem(target: MutableItem, key: string, index: number) {
		target[key] = (target[key] ?? []).filter((_: unknown, itemIndex: number) => itemIndex !== index);
	}

	function addString(target: MutableItem, key: string) {
		target[key] = [...(target[key] ?? []), ''];
	}

	function updateString(target: MutableItem, key: string, index: number, value: string) {
		const next = [...(target[key] ?? [])];
		next[index] = value;
		target[key] = next;
	}

	function updateNumberArray(target: MutableItem, key: string, index: number, value: string) {
		const next = [...(target[key] ?? [])];
		next[index] = Number(value);
		target[key] = next;
	}

	function ensureCharacterDescriptionSuggestions(target: MutableItem) {
		target.character_description_suggestions ??= {};
		for (const key of ['clothes', 'eyes', 'body', 'skin', 'attitude']) {
			target.character_description_suggestions[key] ??= '';
		}
	}

	function ensureStartingInventory(target: MutableItem) {
		target.starting_inventory ??= {};
		target.starting_inventory.gold_coins ??= 0;
		target.starting_inventory.free_gear ??= [];
		target.starting_inventory.loot_or_consumable_options ??= [];
		target.starting_inventory.class_gear_options ??= [];
	}

	function addStartingInventoryString(target: MutableItem, key: 'free_gear' | 'class_gear_options') {
		ensureStartingInventory(target);
		target.starting_inventory[key] = [...target.starting_inventory[key], ''];
	}

	function updateStartingInventoryString(
		target: MutableItem,
		key: 'free_gear' | 'class_gear_options',
		index: number,
		value: string
	) {
		ensureStartingInventory(target);
		const next = [...target.starting_inventory[key]];
		next[index] = value;
		target.starting_inventory[key] = next;
	}

	function removeStartingInventoryString(
		target: MutableItem,
		key: 'free_gear' | 'class_gear_options',
		index: number
	) {
		ensureStartingInventory(target);
		target.starting_inventory[key] = target.starting_inventory[key].filter(
			(_: unknown, itemIndex: number) => itemIndex !== index
		);
	}

	function addStartingInventoryChoice(target: MutableItem) {
		ensureStartingInventory(target);
		target.starting_inventory.loot_or_consumable_options = [
			...target.starting_inventory.loot_or_consumable_options,
			{ type: 'consumable', id: '' }
		];
	}

	function updateStartingInventoryChoiceType(
		target: MutableItem,
		index: number,
		value: 'loot' | 'consumable'
	) {
		ensureStartingInventory(target);
		const next = [...target.starting_inventory.loot_or_consumable_options];
		next[index] = { type: value, id: '' };
		target.starting_inventory.loot_or_consumable_options = next;
	}

	function updateStartingInventoryChoiceId(target: MutableItem, index: number, value: string) {
		ensureStartingInventory(target);
		const next = [...target.starting_inventory.loot_or_consumable_options];
		next[index] = { ...next[index], id: value };
		target.starting_inventory.loot_or_consumable_options = next;
	}

	function removeStartingInventoryChoice(target: MutableItem, index: number) {
		ensureStartingInventory(target);
		target.starting_inventory.loot_or_consumable_options =
			target.starting_inventory.loot_or_consumable_options.filter(
				(_: unknown, itemIndex: number) => itemIndex !== index
			);
	}

	function traitValue(target: MutableItem | null, key: string, trait: string) {
		const value = target?.[key]?.[trait];
		return typeof value === 'number' ? String(value) : '';
	}

	function updateTraitValue(target: MutableItem, key: string, trait: string, value: string) {
		const next = { ...(target[key] ?? {}) };
		if (value === '') {
			delete next[trait];
		} else {
			next[trait] = Number(value);
		}
		target[key] = next;
	}

	function clearTraitValues(target: MutableItem, key: string) {
		target[key] = {};
	}

	function subclassOverrideValue(target: MutableItem | null, key: string) {
		if (!target || !(key in target)) return '__inherit';
		return target[key] ?? '';
	}

	function updateSubclassOverride(target: MutableItem, key: string, value: string) {
		if (value === '__inherit') {
			delete target[key];
			return;
		}
		target[key] = value === '' ? null : value;
	}

	onMount(() => {
		void loadDashboard();
	});

	$effect(() => {
		const type = data.type;
		const nextRouteStateKey = type;
		if (routeStateKey === nextRouteStateKey) return;
		untrack(() => {
			filtersReady = false;
			routeStateKey = nextRouteStateKey;
			selectedItemType = type;
			selectedItemKey = '';
			editorItem = null;
			createMode = false;
			relatedExpanded = false;
			listFilters = storedFilters(type);
			filtersReady = true;
			filtersExpanded = false;
		});
	});

	$effect(() => {
		selectedItemType;
		listFilters;
		untrack(() => persistFilters());
	});

	$effect(() => {
		data.itemId;
		items;
		untrack(() => applyRouteSelection());
	});

	$effect(() => {
		selectedItemType;
		untrack(() => void loadItems());
	});

	$effect(() => {
		selectedItemType;
		untrack(() => void loadReferences());
	});

	$effect(() => {
		if (selectedItemType !== 'domain_cards' && previewOpen) previewOpen = false;
	});
</script>

<svelte:head>
	<title>Compendium Manager | Daggerlore</title>
	<meta
		name="description"
		content="Daggerlore administrative tools for managing source and community data."
	/>
</svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col px-6 py-8">
	<section class="border-border/60 flex flex-col gap-5 border-b pb-6 md:flex-row md:items-end md:justify-between">
		<div>
			<div class="flex items-center gap-3 text-accent">
				<ShieldCheck class="size-6" />
				<p class="text-sm font-semibold tracking-wide uppercase">Admin</p>
			</div>
			<h1 class="mt-3 text-3xl font-bold text-foreground">
				{itemTypeLabel(selectedItemType)} Manager
			</h1>
		</div>
	</section>

	{#if loadError}
		<p class="border-destructive/50 bg-destructive/10 mt-6 rounded-md border p-3 text-sm text-destructive">
			{loadError}
		</p>
	{/if}

	<section class="grid gap-4 py-6 md:grid-cols-3">
		<div class="border-border/70 bg-card/50 rounded-lg border p-4">
			<Database class="size-5 text-accent" />
			<p class="mt-3 text-2xl font-semibold text-foreground">{totalItems}</p>
			<p class="text-sm text-muted-foreground">Official items</p>
		</div>
		<div class="border-border/70 bg-card/50 rounded-lg border p-4">
			<p class="text-2xl font-semibold text-foreground">{dashboard?.sources.length ?? 0}</p>
			<p class="text-sm text-muted-foreground">Sources</p>
		</div>
		<div class="border-border/70 bg-card/50 rounded-lg border p-4">
			<p class="text-2xl font-semibold text-foreground">{selectedTypeCount}</p>
			<p class="text-sm text-muted-foreground">
				{selectedItemType ? itemTypeLabel(selectedItemType) : 'Selected type'} items
			</p>
		</div>
	</section>

	<section class="mb-5 rounded-lg border border-border/70 bg-card/40 p-4 text-sm text-muted-foreground">
		Editing saves a new version for the selected item. Choose the entity source in the identity
		section before saving.
	</section>

	<section class="editor-layout {sectionsExpanded ? 'sections-open' : 'sections-closed'}">
		{#if sectionsExpanded}
			<aside class="sections-panel border-border/70 bg-card/40 flex min-h-0 flex-col rounded-lg border">
				<div class="border-border/70 flex items-start justify-between gap-3 border-b p-4">
					<div>
						<p class="font-semibold text-foreground">Entity Sections</p>
						<p class="text-sm text-muted-foreground">Manage each data type independently.</p>
					</div>
					<Button
						size="sm"
						variant="ghost"
						class="h-8 px-2 text-xs"
						onclick={() => (sectionsExpanded = false)}
					>
						Hide
					</Button>
				</div>
				<div class="sections-list p-2">
					{#each entityTypes as itemType}
						<a
							href={editorHref(itemType)}
							class="hover:bg-muted/70 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors {selectedItemType ===
							itemType
								? 'bg-muted text-foreground'
								: 'text-muted-foreground'}"
							onclick={(event) => {
								event.preventDefault();
								void navigateToType(itemType);
							}}
						>
							<span>{itemTypeLabel(itemType)}</span>
							<span class="text-xs">{countFor(itemType)}</span>
						</a>
					{/each}
				</div>
			</aside>
		{:else}
			<aside class="sections-rail">
				<Button
					variant="outline"
					class="h-9 w-9 p-0"
					title="Show entity sections"
					aria-label="Show entity sections"
					onclick={() => (sectionsExpanded = true)}
				>
					<ListTree class="size-4" />
				</Button>
				<span>Sections</span>
			</aside>
		{/if}

		<aside class="items-panel border-border/70 bg-card/40 flex min-h-0 flex-col rounded-lg border">
			<div class="border-border/70 flex items-center justify-between border-b p-4">
				<div>
					<p class="font-semibold text-foreground">
						{selectedItemType ? itemTypeLabel(selectedItemType) : 'Items'}
					</p>
					<p class="text-sm text-muted-foreground">{filteredItems.length} items</p>
				</div>
				{#if selectedItemType}
					<div class="flex gap-2">
						<Button size="sm" variant="outline" class="gap-2" onclick={toggleFilters}>
							Filters{#if activeFilterCount > 0} ({activeFilterCount}){/if}
						</Button>
						<Button size="sm" variant="outline" class="gap-2" onclick={() => startCreate(selectedItemType as HomebrewTable)}>
							<Plus class="size-4" />
							New
						</Button>
					</div>
				{/if}
			</div>
			{#if selectedItemType && filtersExpanded}
				<div class="border-border/70 grid gap-3 border-b p-3">
					<div class="flex items-center justify-between gap-3">
						<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Filters</p>
						<div class="flex gap-2">
							<Button
								size="sm"
								variant="ghost"
								class="h-7 px-2 text-xs"
								onclick={clearFilters}
								disabled={activeFilterCount === 0}
							>
								Clear
							</Button>
							<Button
								size="sm"
								variant="ghost"
								class="h-7 px-2 text-xs"
								onclick={() => (filtersExpanded = false)}
							>
								Hide
							</Button>
						</div>
					</div>
					<div class="grid gap-2 md:grid-cols-2">
						{#each activeFilterDefinitions as definition}
							{@const options = filterOptions(definition)}
							<label class="filter-field">
								<span>{definition.label}</span>
								<select
									multiple
									size={Math.min(Math.max(options.length, 2), 5)}
									value={listFilters[definition.key]}
									onchange={(event) => setFilter(definition.key, selectValues(event))}
								>
									{#each options as option}
										<option value={option.value} selected={listFilters[definition.key].includes(option.value)}>
											{filterOptionLabel(definition, option.label)}
										</option>
									{/each}
								</select>
							</label>
						{/each}
					</div>
				</div>
			{/if}
			<div class="p-2">
				{#if isLoading}
					<p class="p-3 text-sm text-muted-foreground">Loading...</p>
				{:else if filteredItems.length === 0}
					<p class="p-3 text-sm text-muted-foreground">No items found.</p>
				{:else}
					{#each filteredItems as item}
						<button
							type="button"
							class="hover:bg-muted/70 w-full rounded-md px-3 py-2 text-left text-sm transition-colors {selectedItemKey ===
							itemKey(item)
								? 'bg-muted text-foreground'
								: 'text-muted-foreground'}"
							onclick={() => navigateToItem(item)}
					>
						<span class="block truncate font-medium">{item.title}</span>
						<span class="block truncate text-xs">{listSummary(item)}</span>
						</button>
					{/each}
				{/if}
			</div>
		</aside>

		<section class="border-border/70 bg-card/40 flex min-h-0 flex-col rounded-lg border">
			<div
				bind:this={editorHeaderElement}
				class="editor-actions-header border-border/70 bg-card/95 sticky z-10 flex flex-col gap-3 border-b p-4 backdrop-blur md:flex-row md:items-center md:justify-between"
			>
				<div class="min-w-0">
					<p class="truncate text-lg font-semibold text-foreground">
						{createMode ? `New ${selectedItemType ? itemTypeLabel(selectedItemType) : 'Item'}` : (selectedItem?.title ?? 'Select an item')}
					</p>
					<p class="truncate text-sm text-muted-foreground">
						{sourceLabel((editorItem?.source_key ?? selectedItem?.source_key) as SourceKey | undefined)}
						{#if selectedItemType} / {itemTypeLabel(selectedItemType)}{/if}
						{#if selectedItem && !createMode} / current v{selectedItem.current_version}{/if}
					</p>
				</div>
				<div class="flex gap-2">
					{#if selectedItemType === 'domain_cards' && editorItem}
						<Button
							variant="outline"
							class="w-fit gap-2"
							onclick={() => (previewOpen = true)}
						>
							<Eye class="size-4" />
							Preview
						</Button>
					{/if}
					<Button
						class="w-fit gap-2"
						onclick={saveItem}
						disabled={!editorItem || isSaving || !hasEditorChanges}
					>
						<Save class="size-4" />
						Save
					</Button>
					<Button
						variant="destructive"
						class="w-fit gap-2"
						onclick={deleteItem}
						disabled={!selectedItem || createMode || isSaving}
					>
						<Trash2 class="size-4" />
						Delete
					</Button>
				</div>
			</div>

			{#if saveError}
				<p class="border-destructive/50 bg-destructive/10 m-4 rounded-md border p-3 text-sm text-destructive">
					{saveError}
				</p>
			{/if}

			<div bind:this={editorContentElement} class="p-4">
				{#if !editorItem || !selectedItemType}
					<p class="text-sm text-muted-foreground">Select an item or create one from an entity section.</p>
				{:else}
					{#if selectedItemType === 'domain_cards'}
						<DomainCardEditor
							bind:item={editorItem}
							bind:previewOpen
							sources={dashboard?.sources ?? []}
							domains={optionItems('domains')}
							{sourceLabel}
						/>
					{:else}
						<div class="grid gap-6">
						<section class="admin-panel">
							<h2>Identity</h2>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="admin-field">
									<span>Source</span>
									<select class="admin-input" bind:value={editorItem.source_key} required>
										{#each dashboard?.sources ?? [] as source}
											<option value={source.source_key}>{source.name}</option>
										{/each}
									</select>
								</label>
								<label class="admin-field">
									<span>Title</span>
									<input
										bind:this={titleInputElement}
										class="admin-input"
										bind:value={editorItem.title}
									/>
								</label>
								{#if 'image_url' in editorItem}
									<label class="admin-field">
										<span>Image URL</span>
										<input class="admin-input" bind:value={editorItem.image_url} />
									</label>
								{/if}
								{#if 'artist_name' in editorItem}
									<label class="admin-field">
										<span>Artist</span>
										<input class="admin-input" bind:value={editorItem.artist_name} />
									</label>
								{/if}
							</div>
							{#if 'description_html' in editorItem && selectedItemType !== 'primary_weapons' && selectedItemType !== 'secondary_weapons'}
								<label class="admin-field">
									<span>Description</span>
									<MarkdownTextarea bind:value={editorItem.description_html} />
								</label>
							{/if}
							{#if 'description' in editorItem}
								<label class="admin-field">
									<span>Description</span>
									<MarkdownTextarea bind:value={editorItem.description} />
								</label>
							{/if}
						</section>

						{#if selectedItemType === 'domains'}
							<section class="admin-panel">
								<h2>Domain Display</h2>
								<div class="grid gap-4 md:grid-cols-3">
									<label class="admin-field">
										<span>Color</span>
										<input class="admin-input h-12" type="color" bind:value={editorItem.color} />
									</label>
									<label class="admin-field">
										<span>Foreground</span>
										<input class="admin-input h-12" type="color" bind:value={editorItem.foreground_color} />
									</label>
								</div>
							</section>
						{/if}

						{#if selectedItemType === 'character_sheet_addons'}
							<section class="admin-panel">
								<div class="flex items-center justify-between gap-3">
									<div>
										<h2>Sheet Add-on</h2>
										<p class="text-sm text-muted-foreground">
											Define optional sheet pages and selectable choices for subclasses.
										</p>
									</div>
									<Button size="sm" variant="outline" onclick={() => addSheetAddonSection(editorItem!)}>
										Add Section
									</Button>
								</div>
								<div class="rounded-md border border-border/70 bg-background/60 p-3">
									<div class="mb-3 grid gap-3 md:grid-cols-[1fr_8rem]">
										<label class="admin-field">
											<span>Resource Name</span>
											<input
												class="admin-input"
												value={editorItem.resource?.title ?? ''}
												placeholder="Focus"
												onchange={(event) => {
													editorItem!.resource ??= { title: '', description_html: '', max: 0 };
													editorItem!.resource.title = event.currentTarget.value;
												}}
											/>
										</label>
										<label class="admin-field">
											<span>Maximum</span>
											<input
												class="admin-input"
												type="number"
												min="0"
												value={editorItem.resource?.max ?? 0}
												onchange={(event) => {
													editorItem!.resource ??= { title: '', description_html: '', max: 0 };
													editorItem!.resource.max = Number(event.currentTarget.value);
												}}
											/>
										</label>
									</div>
									<label class="admin-field">
										<span>Resource Text</span>
										<MarkdownTextarea
											value={editorItem.resource?.description_html ?? ''}
											placeholder="Explain how this sheet resource works."
											onchangeValue={(value) => {
												editorItem!.resource ??= { title: '', description_html: '', max: 0 };
												editorItem!.resource.description_html = value;
											}}
										/>
									</label>
								</div>
								<div class="grid gap-3">
									{#each editorItem.sections ?? [] as section, sectionIndex}
										<div class="rounded-md border border-border/70 bg-background/60 p-3">
											<div class="mb-3 flex items-start justify-between gap-3">
												<div class="grid flex-1 gap-3 md:grid-cols-[1fr_8rem]">
													<label class="admin-field">
														<span>Section Title</span>
														<input class="admin-input" bind:value={section.title} placeholder="Tier 1" />
													</label>
													<label class="admin-field">
														<span>Tier</span>
														<select
															class="admin-input"
															value={section.tier ?? ''}
															onchange={(event) => {
																section.tier =
																	event.currentTarget.value === ''
																		? undefined
																		: Number(event.currentTarget.value);
															}}
														>
															<option value="">None</option>
															{#each [1, 2, 3, 4] as tier}
																<option value={tier}>Tier {tier}</option>
															{/each}
														</select>
													</label>
												</div>
												<Button
													size="sm"
													variant="outline"
													onclick={() => removeArrayItem(editorItem!, 'sections', sectionIndex)}
												>
													Remove
												</Button>
											</div>
											<label class="admin-field">
												<span>Section Text</span>
												<MarkdownTextarea
													placeholder="Optional section instructions"
													bind:value={section.description_html}
												/>
											</label>
											<div class="mt-4 grid gap-3 border-t border-border/70 pt-4">
												<div class="flex items-center justify-between gap-3">
													<p class="text-sm font-medium text-foreground">Options</p>
													<Button size="sm" variant="outline" onclick={() => addSheetAddonOption(section)}>
														Add Option
													</Button>
												</div>
												{#each section.options ?? [] as option, optionIndex}
													<div class="rounded-md border border-border/70 bg-card/60 p-3">
														<div class="mb-3 grid gap-3 md:grid-cols-[12rem_1fr_auto]">
															<input class="admin-input" placeholder="option_id" bind:value={option.option_id} />
															<input class="admin-input" placeholder="Option title" bind:value={option.title} />
															<Button
																size="sm"
																variant="outline"
																onclick={() => removeArrayItem(section, 'options', optionIndex)}
															>
																Remove
															</Button>
														</div>
														<MarkdownTextarea placeholder="Option text" bind:value={option.description_html} />
													</div>
												{/each}
											</div>
										</div>
									{/each}
								</div>
							</section>
						{/if}

						{#if selectedItemType === 'ancestry_cards'}
							<section class="admin-panel">
								<h2>Ancestry Settings</h2>
								<label class="check-field">
									<input type="checkbox" bind:checked={editorItem.is_mixed_ancestry} />
									<span>Mixed ancestry</span>
								</label>
							</section>
						{/if}

						{#if selectedItemType === 'ancestry_cards' || selectedItemType === 'community_cards'}
							<section class="admin-panel">
								<h2>Card Settings</h2>
								<label class="check-field">
									<input type="checkbox" bind:checked={editorItem.tokens_enabled} />
									<span>Enable tokens</span>
								</label>
							</section>
						{/if}

						{#if selectedItemType === 'classes'}
							<section class="admin-panel">
								<h2>Class Setup</h2>
								<div class="grid gap-4 md:grid-cols-2">
									<label class="admin-field">
										<span>Primary Domain</span>
										<select class="admin-input" bind:value={editorItem.primary_domain_id}>
											<option value="">None</option>
											{#each optionItems('domains') as domain}
												<option value={domain.item_id}>{referenceLabel(domain)}</option>
											{/each}
										</select>
									</label>
									<label class="admin-field">
										<span>Secondary Domain</span>
										<select class="admin-input" bind:value={editorItem.secondary_domain_id}>
											<option value="">None</option>
											{#each optionItems('domains') as domain}
												<option value={domain.item_id}>{referenceLabel(domain)}</option>
											{/each}
										</select>
									</label>
									<label class="admin-field">
										<span>Starting Evasion</span>
										<input class="admin-input" type="number" bind:value={editorItem.starting_evasion} />
									</label>
									<label class="admin-field">
										<span>Starting HP</span>
										<input class="admin-input" type="number" bind:value={editorItem.starting_max_hp} />
									</label>
									<label class="admin-field">
										<span>Default Spellcast Trait</span>
										<select class="admin-input" bind:value={editorItem.spellcast_trait}>
											<option value="">None</option>
											{#each TRAITS as trait}
												<option value={trait}>{trait}</option>
											{/each}
										</select>
									</label>
								</div>
								<div class="grid gap-3">
									<p class="text-sm font-medium text-foreground">Suggested Stats</p>
									<div class="grid gap-3 md:grid-cols-3">
										{#each TRAITS as trait}
											<label class="admin-field">
												<span>{trait}</span>
												<input
													class="admin-input"
													type="number"
													value={traitValue(editorItem, 'suggested_traits', trait)}
													onchange={(event) =>
														updateTraitValue(editorItem!, 'suggested_traits', trait, event.currentTarget.value)}
												/>
											</label>
										{/each}
									</div>
								</div>
								<div class="grid gap-3">
									<p class="text-sm font-medium text-foreground">Suggested Equipment</p>
									<div class="grid gap-4 md:grid-cols-3">
										<label class="admin-field">
											<span>Primary Weapon</span>
											<select class="admin-input" bind:value={editorItem.suggested_primary_weapon_id}>
												<option value="">None</option>
												{#each optionItems('primary_weapons') as weapon}
													<option value={weapon.item_id}>{referenceLabel(weapon)}</option>
												{/each}
											</select>
										</label>
										<label class="admin-field">
											<span>Secondary Weapon</span>
											<select class="admin-input" bind:value={editorItem.suggested_secondary_weapon_id}>
												<option value="">None</option>
												{#each optionItems('secondary_weapons') as weapon}
													<option value={weapon.item_id}>{referenceLabel(weapon)}</option>
												{/each}
											</select>
										</label>
										<label class="admin-field">
											<span>Armor</span>
											<select class="admin-input" bind:value={editorItem.suggested_armor_id}>
												<option value="">None</option>
												{#each optionItems('armor') as armor}
													<option value={armor.item_id}>{referenceLabel(armor)}</option>
												{/each}
											</select>
										</label>
									</div>
								</div>
								<div class="grid gap-4">
									<div>
										<p class="text-sm font-medium text-foreground">Starting Inventory</p>
										<p class="text-xs text-muted-foreground">
											Items offered during character creation for this class.
										</p>
									</div>
									<label class="admin-field md:w-48">
										<span>Gold Coins</span>
										<input
											class="admin-input"
											type="number"
											value={editorItem.starting_inventory?.gold_coins ?? 0}
											onchange={(event) => {
												ensureStartingInventory(editorItem!);
												editorItem!.starting_inventory.gold_coins = Number(event.currentTarget.value);
											}}
										/>
									</label>
									<div class="grid gap-3">
										<div class="flex items-center justify-between gap-3">
											<p class="text-sm font-medium text-foreground">Free Gear</p>
											<Button size="sm" variant="outline" onclick={() => addStartingInventoryString(editorItem!, 'free_gear')}>Add</Button>
										</div>
										{#if (editorItem.starting_inventory?.free_gear ?? []).length === 0}
											<p class="text-sm text-muted-foreground">No free gear configured.</p>
										{:else}
											{#each editorItem.starting_inventory?.free_gear ?? [] as entry, index}
												<div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
													<input
														class="admin-input"
														value={entry}
														placeholder="Free gear item"
														onchange={(event) =>
															updateStartingInventoryString(
																editorItem!,
																'free_gear',
																index,
																event.currentTarget.value
															)}
													/>
													<Button size="sm" variant="outline" onclick={() => removeStartingInventoryString(editorItem!, 'free_gear', index)}>Remove</Button>
												</div>
											{/each}
										{/if}
									</div>
									<div class="grid gap-3">
										<div class="flex items-center justify-between gap-3">
											<p class="text-sm font-medium text-foreground">Loot or Consumable Choices</p>
											<Button size="sm" variant="outline" onclick={() => addStartingInventoryChoice(editorItem!)}>Add</Button>
										</div>
										{#if (editorItem.starting_inventory?.loot_or_consumable_options ?? []).length === 0}
											<p class="text-sm text-muted-foreground">No loot or consumable choices configured.</p>
										{:else}
											{#each editorItem.starting_inventory?.loot_or_consumable_options ?? [] as option, index}
												<div class="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)_auto]">
													<select
														class="admin-input"
														value={option.type}
														onchange={(event) =>
															updateStartingInventoryChoiceType(
																editorItem!,
																index,
																event.currentTarget.value as 'loot' | 'consumable'
															)}
													>
														<option value="consumable">Consumable</option>
														<option value="loot">Loot</option>
													</select>
													<select
														class="admin-input"
														value={option.id}
														onchange={(event) =>
															updateStartingInventoryChoiceId(editorItem!, index, event.currentTarget.value)}
													>
														<option value="">Select item</option>
														{#each optionItems(option.type === 'loot' ? 'loot' : 'consumables') as item}
															<option value={item.item_id}>{referenceLabel(item)}</option>
														{/each}
													</select>
													<Button size="sm" variant="outline" onclick={() => removeStartingInventoryChoice(editorItem!, index)}>Remove</Button>
												</div>
											{/each}
										{/if}
									</div>
									<div class="grid gap-3">
										<div class="flex items-center justify-between gap-3">
											<p class="text-sm font-medium text-foreground">Class Gear Choices</p>
											<Button size="sm" variant="outline" onclick={() => addStartingInventoryString(editorItem!, 'class_gear_options')}>Add</Button>
										</div>
										{#if (editorItem.starting_inventory?.class_gear_options ?? []).length === 0}
											<p class="text-sm text-muted-foreground">No class gear choices configured.</p>
										{:else}
											{#each editorItem.starting_inventory?.class_gear_options ?? [] as entry, index}
												<div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
													<input
														class="admin-input"
														value={entry}
														placeholder="Class gear choice"
														onchange={(event) =>
															updateStartingInventoryString(
																editorItem!,
																'class_gear_options',
																index,
																event.currentTarget.value
															)}
													/>
													<Button size="sm" variant="outline" onclick={() => removeStartingInventoryString(editorItem!, 'class_gear_options', index)}>Remove</Button>
												</div>
											{/each}
										{/if}
									</div>
									<label class="admin-field">
										<span>Spellbook Prompt</span>
										<input
											class="admin-input"
											value={editorItem.starting_inventory?.spellbook_prompt ?? ''}
											placeholder="Optional prompt for spellbook-style items"
											onchange={(event) => {
												ensureStartingInventory(editorItem!);
												editorItem!.starting_inventory.spellbook_prompt =
													event.currentTarget.value || undefined;
											}}
										/>
									</label>
								</div>
								<div class="grid gap-3">
									<div class="flex items-center justify-between">
										<p class="text-sm font-medium text-foreground">Subclasses</p>
										<Button size="sm" variant="outline" onclick={() => addString(editorItem!, 'subclass_ids')}>Add</Button>
									</div>
									{#each editorItem.subclass_ids ?? [] as subclassId, index}
										<div class="flex gap-2">
											<select
												class="admin-input"
												value={subclassId}
												onchange={(event) => updateString(editorItem!, 'subclass_ids', index, event.currentTarget.value)}
											>
												<option value="">Select subclass</option>
												{#each optionItems('subclasses') as subclass}
													<option value={subclass.item_id}>{referenceLabel(subclass)}</option>
												{/each}
											</select>
											<Button size="sm" variant="outline" onclick={() => removeArrayItem(editorItem!, 'subclass_ids', index)}>Remove</Button>
										</div>
									{/each}
								</div>
							</section>
						{/if}

						{#if selectedItemType === 'subclasses'}
							<section class="admin-panel">
								<h2>Subclass Setup</h2>
								<div class="grid gap-4 md:grid-cols-2">
									<label class="admin-field">
										<span>Class</span>
										<select class="admin-input" bind:value={editorItem.class_id}>
											<option value="">None</option>
											{#each optionItems('classes') as characterClass}
												<option value={characterClass.item_id}>{referenceLabel(characterClass)}</option>
											{/each}
										</select>
									</label>
									<label class="admin-field">
										<span>Spellcast Trait Override</span>
										<select class="admin-input" bind:value={editorItem.spellcast_trait}>
											<option value="">None</option>
											{#each TRAITS as trait}
												<option value={trait}>{trait}</option>
											{/each}
										</select>
									</label>
								</div>
								<div class="grid gap-3">
									<div class="flex items-center justify-between gap-3">
										<div>
											<p class="text-sm font-medium text-foreground">Suggested Stats Override</p>
											<p class="text-xs text-muted-foreground">
												Leave blank to use the selected class suggestions.
											</p>
										</div>
										<Button size="sm" variant="outline" onclick={() => clearTraitValues(editorItem!, 'suggested_traits')}>Clear</Button>
									</div>
									<div class="grid gap-3 md:grid-cols-3">
										{#each TRAITS as trait}
											<label class="admin-field">
												<span>{trait}</span>
												<input
													class="admin-input"
													type="number"
													value={traitValue(editorItem, 'suggested_traits', trait)}
													onchange={(event) =>
														updateTraitValue(editorItem!, 'suggested_traits', trait, event.currentTarget.value)}
												/>
											</label>
										{/each}
									</div>
								</div>
								<div class="grid gap-3">
									<p class="text-sm font-medium text-foreground">Suggested Equipment Overrides</p>
									<div class="grid gap-4 md:grid-cols-3">
										<label class="admin-field">
											<span>Primary Weapon</span>
											<select
												class="admin-input"
												value={subclassOverrideValue(editorItem, 'suggested_primary_weapon_id')}
												onchange={(event) =>
													updateSubclassOverride(
														editorItem!,
														'suggested_primary_weapon_id',
														event.currentTarget.value
													)}
											>
												<option value="__inherit">Use class default</option>
												<option value="">None</option>
												{#each optionItems('primary_weapons') as weapon}
													<option value={weapon.item_id}>{referenceLabel(weapon)}</option>
												{/each}
											</select>
										</label>
										<label class="admin-field">
											<span>Secondary Weapon</span>
											<select
												class="admin-input"
												value={subclassOverrideValue(editorItem, 'suggested_secondary_weapon_id')}
												onchange={(event) =>
													updateSubclassOverride(
														editorItem!,
														'suggested_secondary_weapon_id',
														event.currentTarget.value
													)}
											>
												<option value="__inherit">Use class default</option>
												<option value="">None</option>
												{#each optionItems('secondary_weapons') as weapon}
													<option value={weapon.item_id}>{referenceLabel(weapon)}</option>
												{/each}
											</select>
										</label>
										<label class="admin-field">
											<span>Armor</span>
											<select
												class="admin-input"
												value={subclassOverrideValue(editorItem, 'suggested_armor_id')}
												onchange={(event) =>
													updateSubclassOverride(editorItem!, 'suggested_armor_id', event.currentTarget.value)}
											>
												<option value="__inherit">Use class default</option>
												<option value="">None</option>
												{#each optionItems('armor') as armor}
													<option value={armor.item_id}>{referenceLabel(armor)}</option>
												{/each}
											</select>
										</label>
									</div>
								</div>
								<div class="grid gap-3">
									<div>
										<p class="text-sm font-medium text-foreground">Optional Sheet Add-ons</p>
										<p class="text-xs text-muted-foreground">
											Additional character sheet pages unlocked by this subclass.
										</p>
									</div>
									<select
										class="admin-input min-h-32"
										multiple
										value={editorItem.sheet_addon_ids ?? []}
										onchange={(event) => (editorItem!.sheet_addon_ids = selectValues(event))}
									>
										{#each optionItems('character_sheet_addons') as addon}
											<option value={addon.item_id} selected={(editorItem.sheet_addon_ids ?? []).includes(addon.item_id)}>
												{referenceLabel(addon)}
											</option>
										{/each}
									</select>
								</div>
								<div class="grid gap-4">
									{#each [
										{ key: 'foundation_card', label: 'Foundation' },
										{ key: 'specialization_card', label: 'Specialization' },
										{ key: 'mastery_card', label: 'Mastery' }
									] as card}
										<div class="rounded-md border border-border/70 bg-background/50 p-3">
											<div class="mb-3 flex items-center justify-between gap-3">
												<div>
													<p class="text-sm font-medium text-foreground">{card.label} Features</p>
													<p class="text-xs text-muted-foreground">
														Shown on the {card.label.toLowerCase()} subclass card.
													</p>
												</div>
												<Button
													size="sm"
													variant="outline"
													onclick={() => addSubclassCardFeature(editorItem!, card.key)}
												>
													Add Feature
												</Button>
											</div>
											<div class="grid gap-3">
												<label class="check-field">
													<input type="checkbox" bind:checked={editorItem[card.key].tokens_enabled} />
													<span>Enable tokens</span>
												</label>
												{#if (editorItem[card.key]?.features ?? []).length === 0}
													<p class="text-sm text-muted-foreground">No features configured.</p>
												{:else}
													{#each editorItem[card.key]?.features ?? [] as feature, index}
														<div class="rounded-md border border-border/70 bg-card/60 p-3">
															<div class="mb-3 flex items-center justify-between gap-3">
																<input
																	class="admin-input"
																	placeholder="Feature title"
																	bind:value={feature.title}
																/>
																<Button
																	size="sm"
																	variant="outline"
																	onclick={() =>
																		removeSubclassCardFeature(editorItem!, card.key, index)}
																>
																	Remove
																</Button>
															</div>
															<MarkdownTextarea
																placeholder="Feature text"
																bind:value={feature.description_html}
															/>
															<FeatureUsageEditor
																bind:feature={editorItem[card.key].features[index]}
																siblings={editorItem[card.key].features}
																fallbackId={`${card.key}_use_${index + 1}`}
															/>
															<div class="mt-3">
																<FeaturePoolsForm
																	bind:pools={editorItem[card.key].features[index].pools}
																	featureTitle={editorItem[card.key].features[index].title ?? ''}
																	idPrefix={`admin-${card.key}_use_${index + 1}`}
																/>
															</div>
															<div class="mt-3">
																<FeatureRecordsForm
																	bind:records={editorItem[card.key].features[index].records}
																	featureTitle={editorItem[card.key].features[index].title ?? ''}
																	idPrefix={`admin-${card.key}_use_${index + 1}`}
																/>
																<FeatureEffectsForm
																	bind:effects={editorItem[card.key].features[index].effects}
																	featureTitle={editorItem[card.key].features[index].title ?? ''}
																	hasUsage={!!editorItem[card.key].features[index].usage}
																	class="mt-3"
																	idPrefix={`admin-${card.key}_use_${index + 1}`}
																/>
																<FeatureRollOptionsForm
																	bind:options={editorItem[card.key].features[index].roll_options}
																	feature={editorItem[card.key].features[index]}
																	class="mt-3"
																	idPrefix={`admin-${card.key}_use_${index + 1}`}
																/>
															</div>
														</div>
													{/each}
												{/if}
											</div>
											<div class="mt-4 grid gap-3 border-t border-border/70 pt-4">
												<div class="flex items-center justify-between gap-3">
													<p class="text-sm font-medium text-foreground">{card.label} Choices</p>
													<div class="flex gap-2">
														<Button
															size="sm"
															variant="outline"
															onclick={() => addSubclassCardChoice(editorItem!, card.key, 'arbitrary')}
														>
															Choice
														</Button>
														<Button
															size="sm"
															variant="outline"
															onclick={() => addSubclassCardChoice(editorItem!, card.key, 'experience')}
														>
															Experience
														</Button>
													</div>
												</div>
												{#if (editorItem[card.key]?.options ?? []).length === 0}
													<p class="text-sm text-muted-foreground">No choices configured.</p>
												{:else}
													{#each editorItem[card.key]?.options ?? [] as choice, choiceIndex}
														<div class="rounded-md border border-border/70 bg-card/60 p-3">
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
																		onchange={(event) => updateCardChoiceType(choice, event.currentTarget.value)}
																	>
																		<option value="arbitrary">arbitrary</option>
																		<option value="experience">experience</option>
																	</select>
																</label>
																<label class="admin-field">
																	<span>Max</span>
																	<input class="admin-input" type="number" min="1" bind:value={choice.max} />
																</label>
																<Button
																	size="sm"
																	variant="outline"
																	onclick={() => removeArrayItem(editorItem![card.key], 'options', choiceIndex)}
																>
																	Remove
																</Button>
															</div>
															{#if choice.type === 'arbitrary'}
																<div class="mt-3 grid gap-2">
																	<div class="flex items-center justify-between">
																		<p class="text-sm font-medium text-foreground">Selections</p>
																		<Button size="sm" variant="outline" onclick={() => addCardChoiceSelection(choice)}>Add</Button>
																	</div>
																	{#each choice.options ?? [] as selection, selectionIndex}
																		<div class="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
																			<input class="admin-input" placeholder="selection_id" bind:value={selection.selection_id} />
																			<input class="admin-input" placeholder="Title" bind:value={selection.title} />
																			<input class="admin-input" placeholder="Short title" bind:value={selection.short_title} />
																			<Button
																				size="sm"
																				variant="outline"
																				onclick={() => removeCardChoiceSelection(choice, selectionIndex)}
																			>
																				Remove
																			</Button>
																		</div>
																	{/each}
																</div>
															{/if}
														</div>
													{/each}
												{/if}
											</div>
											<div class="mt-4 grid gap-3 border-t border-border/70 pt-4">
												<div class="flex items-center justify-between gap-3">
													<p class="text-sm font-medium text-foreground">{card.label} Level-Up Options</p>
													<Button
														size="sm"
														variant="outline"
														onclick={() => addSubclassLevelUpOption(editorItem!, card.key)}
													>
														Add
													</Button>
												</div>
												{#if (editorItem[card.key]?.level_up_options ?? []).length === 0}
													<p class="text-sm text-muted-foreground">No level-up options configured.</p>
												{:else}
													{#each editorItem[card.key]?.level_up_options ?? [] as option, optionIndex}
														<div class="grid gap-2 rounded-md border border-border/70 bg-card/60 p-3 md:grid-cols-[1fr_1fr_1fr_5rem_auto]">
															<input class="admin-input" placeholder="option_id" bind:value={option.option_id} />
															<input class="admin-input" placeholder="Title" bind:value={option.title} />
															<input class="admin-input" placeholder="Short title" bind:value={option.short_title} />
															<input class="admin-input" type="number" min="1" bind:value={option.max} />
															<Button
																size="sm"
																variant="outline"
																onclick={() => removeArrayItem(editorItem![card.key], 'level_up_options', optionIndex)}
															>
																Remove
															</Button>
														</div>
													{/each}
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</section>
						{/if}

						{#if selectedItemType === 'primary_weapons' || selectedItemType === 'secondary_weapons'}
							<section class="admin-panel">
								<h2>Weapon Stats</h2>
								<div class="grid gap-4 md:grid-cols-3">
									<label class="admin-field">
										<span>Level</span>
										<input class="admin-input" type="number" bind:value={editorItem.level_requirement} />
									</label>
									<label class="admin-field">
										<span>Type</span>
										<select class="admin-input" bind:value={editorItem.type}>
											{#each WEAPON_TYPES as type}
												<option value={type}>{type}</option>
											{/each}
										</select>
									</label>
									<label class="admin-field">
										<span>Range</span>
										<select class="admin-input" bind:value={editorItem.range}>
											{#each RANGES as range}
												<option value={range}>{range}</option>
											{/each}
										</select>
									</label>
									<label class="admin-field">
										<span>Attack Bonus</span>
										<input class="admin-input" type="number" bind:value={editorItem.attack_roll_bonus} />
									</label>
									<label class="admin-field">
										<span>Damage Dice</span>
										<input class="admin-input" bind:value={editorItem.damage_dice} />
									</label>
									<label class="admin-field">
										<span>Damage Bonus</span>
										<input class="admin-input" type="number" bind:value={editorItem.damage_bonus} />
									</label>
									<label class="admin-field">
										<span>Burden</span>
										<select class="admin-input" bind:value={editorItem.burden}>
											<option value={0}>0</option>
											<option value={1}>1</option>
											<option value={2}>2</option>
										</select>
									</label>
								</div>
								<div class="grid gap-3 md:grid-cols-2">
									<div class="grid gap-2">
										<p class="text-sm font-medium text-foreground">Available Traits</p>
										<div class="grid gap-2 md:grid-cols-2">
											{#each TRAITS as trait}
												<label class="check-field">
													<input
														type="checkbox"
														checked={(editorItem.available_traits ?? []).includes(trait)}
														onchange={(event) =>
															toggleArrayValue(editorItem!, 'available_traits', trait, event.currentTarget.checked)}
													/>
													<span>{trait}</span>
												</label>
											{/each}
										</div>
									</div>
									<div class="grid gap-2">
										<p class="text-sm font-medium text-foreground">Damage Types</p>
										<div class="grid gap-2">
											{#each DAMAGE_TYPES as damageType}
												<label class="check-field">
													<input
														type="checkbox"
														checked={(editorItem.available_damage_types ?? []).includes(damageType)}
														onchange={(event) =>
															toggleArrayValue(
																editorItem!,
																'available_damage_types',
																damageType,
																event.currentTarget.checked
															)}
													/>
													<span>{damageType}</span>
												</label>
											{/each}
										</div>
									</div>
								</div>
							</section>
						{/if}

						{#if selectedItemType === 'armor'}
							<section class="admin-panel">
								<h2>Armor Stats</h2>
								<div class="grid gap-4 md:grid-cols-4">
									<label class="admin-field">
										<span>Level</span>
										<input class="admin-input" type="number" bind:value={editorItem.level_requirement} />
									</label>
									<label class="admin-field">
										<span>Max Armor</span>
										<input class="admin-input" type="number" bind:value={editorItem.max_armor} />
									</label>
									<label class="admin-field">
										<span>Major</span>
										<input class="admin-input" type="number" bind:value={editorItem.damage_thresholds.major} />
									</label>
									<label class="admin-field">
										<span>Severe</span>
										<input class="admin-input" type="number" bind:value={editorItem.damage_thresholds.severe} />
									</label>
								</div>
							</section>
						{/if}

						{#if selectedItemType === 'adversaries'}
							<section class="admin-panel">
								<h2>Adversary Stats</h2>
								<div class="grid gap-4 md:grid-cols-3">
									<label class="admin-field">
										<span>Tier</span>
										<input class="admin-input" type="number" min="1" max="4" bind:value={editorItem.tier} />
									</label>
									<label class="admin-field">
										<span>Type</span>
										<select class="admin-input" bind:value={editorItem.type}>
											{#each ADVERSARY_TYPES as type}
												<option value={type}>{type}</option>
											{/each}
										</select>
									</label>
									<label class="admin-field">
										<span>Difficulty</span>
										<input class="admin-input" type="number" bind:value={editorItem.difficulty} />
									</label>
									<label class="admin-field">
										<span>HP</span>
										<input class="admin-input" type="number" bind:value={editorItem.max_hp} />
									</label>
									<label class="admin-field">
										<span>Stress</span>
										<input class="admin-input" type="number" bind:value={editorItem.max_stress} />
									</label>
									<label class="admin-field">
										<span>Attack Modifier</span>
										<input class="admin-input" type="number" bind:value={editorItem.attack_modifier} />
									</label>
									<label class="admin-field">
										<span>Major Threshold</span>
										<input class="admin-input" type="number" bind:value={editorItem.thresholds.major} />
									</label>
									<label class="admin-field">
										<span>Severe Threshold</span>
										<input class="admin-input" type="number" bind:value={editorItem.thresholds.severe} />
									</label>
								</div>
								<label class="admin-field">
									<span>Motives & Tactics</span>
									<MarkdownTextarea bind:value={editorItem.motives_tactics} />
								</label>
								<div class="grid gap-3">
									<p class="text-sm font-medium text-foreground">Standard Attack</p>
									<div class="grid gap-4 md:grid-cols-3">
										<label class="admin-field">
											<span>Name</span>
											<input class="admin-input" bind:value={editorItem.standard_attack.name} />
										</label>
										<label class="admin-field">
											<span>Range</span>
											<select class="admin-input" bind:value={editorItem.standard_attack.range}>
												{#each RANGES as range}
													<option value={range}>{range}</option>
												{/each}
											</select>
										</label>
										<label class="admin-field">
											<span>Damage Dice</span>
											<input class="admin-input" bind:value={editorItem.standard_attack.damage_dice} />
										</label>
										<label class="admin-field">
											<span>Damage Bonus</span>
											<input class="admin-input" type="number" bind:value={editorItem.standard_attack.damage_bonus} />
										</label>
										<label class="admin-field">
											<span>Damage Type</span>
											<select class="admin-input" bind:value={editorItem.standard_attack.damage_type}>
												{#each DAMAGE_TYPES as damageType}
													<option value={damageType}>{damageType}</option>
												{/each}
											</select>
										</label>
									</div>
								</div>
							</section>
						{/if}

						{#if selectedItemType === 'environments'}
							<section class="admin-panel">
								<h2>Environment Setup</h2>
								<div class="grid gap-4 md:grid-cols-3">
									<label class="admin-field">
										<span>Tier</span>
										<input class="admin-input" type="number" min="1" max="4" bind:value={editorItem.tier} />
									</label>
									<label class="admin-field">
										<span>Type</span>
										<select class="admin-input" bind:value={editorItem.type}>
											{#each ENVIRONMENT_TYPES as type}
												<option value={type}>{type}</option>
											{/each}
										</select>
									</label>
									<label class="admin-field">
										<span>Difficulty</span>
										<input class="admin-input" type="number" bind:value={editorItem.difficulty} />
									</label>
								</div>
								<label class="check-field">
									<input type="checkbox" bind:checked={editorItem.relative_strength} />
									<span>Uses relative strength</span>
								</label>
								<label class="admin-field">
									<span>Impulses</span>
									<MarkdownTextarea bind:value={editorItem.impulses} />
								</label>
								<label class="admin-field">
									<span>Potential Adversaries</span>
									<MarkdownTextarea bind:value={editorItem.potential_adversaries} />
								</label>
								<label class="admin-field">
									<span>Linked Potential Adversaries</span>
									<select
										class="admin-input min-h-32"
										multiple
										value={editorItem?.potential_adversaries_ids ?? []}
										onchange={(event) => (editorItem!.potential_adversaries_ids = selectValues(event))}
									>
										{#each optionItems('adversaries') as adversary}
											<option
												value={adversary.item_id}
												selected={(editorItem.potential_adversaries_ids ?? []).includes(adversary.item_id)}
											>
												{referenceLabel(adversary)}
											</option>
										{/each}
									</select>
								</label>
							</section>
						{/if}

						{#if selectedItemType === 'beastforms'}
							<section class="admin-panel">
								<h2>Beastform Stats</h2>
								<div class="grid gap-4 md:grid-cols-3">
									<label class="admin-field">
										<span>Level</span>
										<input class="admin-input" type="number" bind:value={editorItem.level_requirement} />
									</label>
									<label class="admin-field">
										<span>Category</span>
										<input class="admin-input" bind:value={editorItem.category} />
									</label>
									<label class="admin-field">
										<span>Evasion Bonus</span>
										<input class="admin-input" type="number" bind:value={editorItem.evasion_bonus} />
									</label>
									<label class="admin-field">
										<span>Special Case</span>
										<select class="admin-input" bind:value={editorItem.special_case}>
											<option value="">None</option>
											<option value="legendary_beast">Legendary Beast</option>
											<option value="legendary_hybrid">Legendary Hybrid</option>
											<option value="mythic_beast">Mythic Beast</option>
											<option value="mythic_hybrid">Mythic Hybrid</option>
										</select>
									</label>
								</div>
								<div class="grid gap-4 md:grid-cols-2">
									<div class="grid gap-3">
										<p class="text-sm font-medium text-foreground">Character Trait</p>
										<div class="grid gap-3 md:grid-cols-2">
											<label class="admin-field">
												<span>Trait</span>
												<select class="admin-input" bind:value={editorItem.character_trait.trait}>
													{#each TRAITS as trait}
														<option value={trait}>{trait}</option>
													{/each}
												</select>
											</label>
											<label class="admin-field">
												<span>Bonus</span>
												<input class="admin-input" type="number" bind:value={editorItem.character_trait.bonus} />
											</label>
										</div>
									</div>
									<div class="grid gap-3">
										<p class="text-sm font-medium text-foreground">Attack</p>
										<div class="grid gap-3 md:grid-cols-2">
											<label class="admin-field">
												<span>Range</span>
												<select class="admin-input" bind:value={editorItem.attack.range}>
													{#each RANGES as range}
														<option value={range}>{range}</option>
													{/each}
												</select>
											</label>
											<label class="admin-field">
												<span>Trait</span>
												<select class="admin-input" bind:value={editorItem.attack.trait}>
													{#each TRAITS as trait}
														<option value={trait}>{trait}</option>
													{/each}
												</select>
											</label>
											<label class="admin-field">
												<span>Damage Dice</span>
												<input class="admin-input" bind:value={editorItem.attack.damage_dice} />
											</label>
											<label class="admin-field">
												<span>Damage Bonus</span>
												<input class="admin-input" type="number" bind:value={editorItem.attack.damage_bonus} />
											</label>
											<label class="admin-field">
												<span>Damage Type</span>
												<select class="admin-input" bind:value={editorItem.attack.damage_type}>
													{#each DAMAGE_TYPES as damageType}
														<option value={damageType}>{damageType}</option>
													{/each}
												</select>
											</label>
										</div>
									</div>
								</div>
								<div class="grid gap-3">
									<div class="flex items-center justify-between">
										<p class="text-sm font-medium text-foreground">Advantages</p>
										<Button size="sm" variant="outline" onclick={() => addString(editorItem!, 'advantages')}>Add</Button>
									</div>
									{#each editorItem.advantages ?? [] as advantage, index}
										<div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
											<input class="admin-input" value={advantage} onchange={(event) => updateString(editorItem!, 'advantages', index, event.currentTarget.value)} />
											<Button size="sm" variant="outline" onclick={() => removeArrayItem(editorItem!, 'advantages', index)}>Remove</Button>
										</div>
									{/each}
								</div>
							</section>
						{/if}

						{#if 'rarity_roll' in editorItem}
							<section class="admin-panel">
								<h2>Availability</h2>
								<label class="admin-field md:w-48">
									<span>Rarity Roll</span>
									<input class="admin-input" type="number" bind:value={editorItem.rarity_roll} />
								</label>
							</section>
						{/if}

						{#if selectedItemType === 'transformations'}
							<section class="admin-panel">
								<div class="flex items-center justify-between">
									<div>
										<h2>Transformation Features</h2>
										<p class="text-sm text-muted-foreground">
											Add the named features granted by this transformation.
										</p>
									</div>
									<Button size="sm" variant="outline" onclick={() => addTransformationFeature(editorItem!)}>
										Add Feature
									</Button>
								</div>
								<div class="grid gap-3">
									{#each editorItem.features ?? [] as feature, index}
										<div class="rounded-md border border-border/70 bg-background/60 p-3">
											<div class="mb-3 flex items-center justify-between gap-3">
												<input class="admin-input" placeholder="Feature name" bind:value={feature.name} />
												<Button size="sm" variant="outline" onclick={() => removeArrayItem(editorItem!, 'features', index)}>Remove</Button>
											</div>
											<MarkdownTextarea placeholder="Feature text" bind:value={feature.description_html} />
										</div>
									{/each}
								</div>
							</section>

							<section class="admin-panel">
								<div class="flex items-center justify-between">
									<div>
										<h2>Transformation Questions</h2>
										<p class="text-sm text-muted-foreground">
											Add prompts players can answer when choosing this transformation.
										</p>
									</div>
									<Button size="sm" variant="outline" onclick={() => addString(editorItem!, 'questions')}>Add Question</Button>
								</div>
								<div class="grid gap-3">
									{#each editorItem.questions ?? [] as question, index}
										<div class="question-row">
											<MarkdownTextarea
												class="question-input"
												value={question}
												ariaLabel="Transformation question"
												onchangeValue={(value) => updateString(editorItem!, 'questions', index, value)}
											/>
											<Button size="sm" variant="outline" onclick={() => removeArrayItem(editorItem!, 'questions', index)}>Remove</Button>
										</div>
									{/each}
								</div>
							</section>
						{/if}

						{#if 'features' in editorItem && selectedItemType !== 'adversaries' && selectedItemType !== 'environments' && selectedItemType !== 'transformations'}
							<section class="admin-panel">
								<div class="flex items-center justify-between">
									<h2>Features</h2>
									<Button size="sm" variant="outline" onclick={() => addFeature(editorItem!)}>Add Feature</Button>
								</div>
								<div class="grid gap-3">
									{#each editorItem.features ?? [] as feature, index}
										<div class="rounded-md border border-border/70 bg-background/60 p-3">
											<div class="mb-3 flex items-center justify-between gap-3">
												<input class="admin-input" placeholder="Feature title" bind:value={feature.title} />
												<Button size="sm" variant="outline" onclick={() => removeArrayItem(editorItem!, 'features', index)}>Remove</Button>
											</div>
											<MarkdownTextarea placeholder="Feature text" bind:value={feature.description_html} />
											{#if selectedItemType === 'ancestry_cards' || selectedItemType === 'community_cards'}
												<FeatureUsageEditor
													bind:feature={editorItem.features[index]}
													siblings={editorItem.features}
													fallbackId={`use_${index + 1}`}
												/>
												<div class="mt-3">
													<FeaturePoolsForm
														bind:pools={editorItem.features[index].pools}
														featureTitle={editorItem.features[index].title ?? ''}
														idPrefix={`admin-use_${index + 1}`}
													/>
												</div>
												<div class="mt-3">
													<FeatureRecordsForm
														bind:records={editorItem.features[index].records}
														featureTitle={editorItem.features[index].title ?? ''}
														idPrefix={`admin-use_${index + 1}`}
													/>
													<FeatureEffectsForm
														bind:effects={editorItem.features[index].effects}
														featureTitle={editorItem.features[index].title ?? ''}
														hasUsage={!!editorItem.features[index].usage}
														class="mt-3"
														idPrefix={`admin-use_${index + 1}`}
													/>
													<FeatureRollOptionsForm
														bind:options={editorItem.features[index].roll_options}
														feature={editorItem.features[index]}
														class="mt-3"
														idPrefix={`admin-use_${index + 1}`}
													/>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</section>
						{/if}

						{#if selectedItemType === 'adversaries'}
							<section class="admin-panel">
								<div class="flex items-center justify-between">
									<h2>Adversary Features</h2>
									<Button size="sm" variant="outline" onclick={() => addAdversaryFeature(editorItem!)}>Add Feature</Button>
								</div>
								<div class="grid gap-3">
									{#each editorItem.features ?? [] as feature, index}
										<div class="rounded-md border border-border/70 bg-background/60 p-3">
											<div class="mb-3 grid gap-3 md:grid-cols-[1fr_10rem_8rem_auto]">
												<input class="admin-input" placeholder="Feature name" bind:value={feature.name} />
												<select class="admin-input" bind:value={feature.type}>
													<option value="Action">Action</option>
													<option value="Reaction">Reaction</option>
													<option value="Passive">Passive</option>
													<option value="Evolution">Evolution</option>
												</select>
												<input
													class="admin-input"
													type="number"
													placeholder="Uses"
													value={feature.max_uses ?? ''}
													onchange={(event) => {
														const value = event.currentTarget.value;
														feature.max_uses = value === '' ? null : Number(value);
													}}
												/>
												<Button size="sm" variant="outline" onclick={() => removeArrayItem(editorItem!, 'features', index)}>Remove</Button>
											</div>
											<MarkdownTextarea placeholder="Feature text" bind:value={feature.description_html} />
										</div>
									{/each}
								</div>
							</section>
						{/if}

						{#if selectedItemType === 'environments'}
							<section class="admin-panel">
								<div class="flex items-center justify-between">
									<h2>Environment Features</h2>
									<Button size="sm" variant="outline" onclick={() => addEnvironmentFeature(editorItem!)}>Add Feature</Button>
								</div>
								<div class="grid gap-3">
									{#each editorItem.features ?? [] as feature, index}
										<div class="rounded-md border border-border/70 bg-background/60 p-3">
											<div class="mb-3 grid gap-3 md:grid-cols-[1fr_10rem_auto]">
												<input class="admin-input" placeholder="Feature name" bind:value={feature.name} />
												<select class="admin-input" bind:value={feature.type}>
													<option value="Action">Action</option>
													<option value="Reaction">Reaction</option>
													<option value="Passive">Passive</option>
												</select>
												<Button size="sm" variant="outline" onclick={() => removeArrayItem(editorItem!, 'features', index)}>Remove</Button>
											</div>
											<MarkdownTextarea placeholder="Feature text" bind:value={feature.description_html} />
											<MarkdownTextarea class="mt-3" placeholder="Questions" bind:value={feature.questions} />
										</div>
									{/each}
								</div>
							</section>
						{/if}

						{#if (selectedItemType === 'primary_weapons' || selectedItemType === 'secondary_weapons') && 'description_html' in editorItem}
							<section class="admin-panel">
								<h2>Description</h2>
								<MarkdownTextarea bind:value={editorItem.description_html} />
							</section>
						{/if}

						{#if selectedItemType === 'classes'}
							<section class="admin-panel">
								<h2>Class Text</h2>
								<label class="admin-field">
									<span>Hope Feature Title</span>
									<input class="admin-input" bind:value={editorItem.hope_feature.title} />
								</label>
								<label class="admin-field">
									<span>Hope Feature Text</span>
									<MarkdownTextarea bind:value={editorItem.hope_feature.description_html} />
								</label>
								<FeatureUsageEditor bind:feature={editorItem.hope_feature} fallbackId="hope_feature" />
								<div class="mt-3">
									<FeaturePoolsForm
										bind:pools={editorItem.hope_feature.pools}
										featureTitle={editorItem.hope_feature.title ?? ''}
										idPrefix="admin-hope_feature"
									/>
								</div>
								<div class="mt-3">
									<FeatureRecordsForm
										bind:records={editorItem.hope_feature.records}
										featureTitle={editorItem.hope_feature.title ?? ''}
										idPrefix="admin-hope_feature"
									/>
									<FeatureEffectsForm
										bind:effects={editorItem.hope_feature.effects}
										featureTitle={editorItem.hope_feature.title ?? ''}
										hasUsage={!!editorItem.hope_feature.usage}
										class="mt-3"
										idPrefix="admin-hope_feature"
									/>
									<FeatureRollOptionsForm
										bind:options={editorItem.hope_feature.roll_options}
										feature={editorItem.hope_feature}
										class="mt-3"
										idPrefix="admin-hope_feature"
									/>
								</div>
								<div class="grid gap-3">
									<div class="flex items-center justify-between">
										<p class="text-sm font-medium text-foreground">Class Features</p>
										<Button size="sm" variant="outline" onclick={() => addClassFeature(editorItem!)}>Add Feature</Button>
									</div>
									{#if (editorItem.class_features ?? []).length === 0}
										<p class="text-sm text-muted-foreground">No class features configured.</p>
									{:else}
										{#each editorItem.class_features ?? [] as feature, index}
											<div class="rounded-md border border-border/70 bg-background/60 p-3">
												<div class="mb-3 flex items-center justify-between gap-3">
													<input class="admin-input" placeholder="Feature title" bind:value={feature.title} />
													<Button size="sm" variant="outline" onclick={() => removeArrayItem(editorItem!, 'class_features', index)}>Remove</Button>
												</div>
												<div class="mb-3 grid gap-3 md:grid-cols-[1fr_8rem]">
													<label class="flex items-center gap-2 text-sm text-muted-foreground">
														<input
															type="checkbox"
															bind:checked={feature.tokens_enabled}
															onchange={() => {
																if (feature.tokens_enabled && !feature.token_max) feature.token_max = 6;
															}}
														/>
														Enable token tracker
													</label>
													{#if feature.tokens_enabled}
														<label class="admin-field">
															<span>Max Tokens</span>
															<input
																class="admin-input"
																type="number"
																min="0"
																bind:value={feature.token_max}
															/>
														</label>
													{/if}
												</div>
												<MarkdownTextarea placeholder="Feature text" bind:value={feature.description_html} />
												<FeatureUsageEditor
													bind:feature={editorItem.class_features[index]}
													siblings={editorItem.class_features}
													fallbackId={`use_${index + 1}`}
												/>
												<div class="mt-3">
													<FeaturePoolsForm
														bind:pools={editorItem.class_features[index].pools}
														featureTitle={editorItem.class_features[index].title ?? ''}
														idPrefix={`admin-use_${index + 1}`}
													/>
												</div>
												<div class="mt-3">
													<FeatureRecordsForm
														bind:records={editorItem.class_features[index].records}
														featureTitle={editorItem.class_features[index].title ?? ''}
														idPrefix={`admin-use_${index + 1}`}
													/>
													<FeatureEffectsForm
														bind:effects={editorItem.class_features[index].effects}
														featureTitle={editorItem.class_features[index].title ?? ''}
														hasUsage={!!editorItem.class_features[index].usage}
														class="mt-3"
														idPrefix={`admin-use_${index + 1}`}
													/>
													<FeatureRollOptionsForm
														bind:options={editorItem.class_features[index].roll_options}
														feature={editorItem.class_features[index]}
														class="mt-3"
														idPrefix={`admin-use_${index + 1}`}
													/>
												</div>
											</div>
										{/each}
									{/if}
								</div>
								<div class="grid gap-6">
									<div class="question-group">
										<div class="flex items-center justify-between">
											<p class="text-sm font-medium text-foreground">Background Questions</p>
											<Button size="sm" variant="outline" onclick={() => addString(editorItem!, 'background_questions')}>Add</Button>
										</div>
										{#each editorItem.background_questions ?? [] as question, index}
											<div class="question-row">
												<MarkdownTextarea
													class="question-input"
													value={question}
													ariaLabel="Background question"
													onchangeValue={(value) => updateString(editorItem!, 'background_questions', index, value)}
												/>
												<Button size="sm" variant="outline" onclick={() => removeArrayItem(editorItem!, 'background_questions', index)}>Remove</Button>
											</div>
										{/each}
									</div>
									<div class="question-group">
										<div class="flex items-center justify-between">
											<p class="text-sm font-medium text-foreground">Connection Questions</p>
											<Button size="sm" variant="outline" onclick={() => addString(editorItem!, 'connection_questions')}>Add</Button>
										</div>
										{#each editorItem.connection_questions ?? [] as question, index}
											<div class="question-row">
												<MarkdownTextarea
													class="question-input"
													value={question}
													ariaLabel="Connection question"
													onchangeValue={(value) => updateString(editorItem!, 'connection_questions', index, value)}
												/>
												<Button size="sm" variant="outline" onclick={() => removeArrayItem(editorItem!, 'connection_questions', index)}>Remove</Button>
											</div>
										{/each}
									</div>
									<div class="grid gap-3">
										<p class="text-sm font-medium text-foreground">Character Description Suggestions</p>
										<div class="grid gap-4 md:grid-cols-2">
											{#each ['clothes', 'eyes', 'body', 'skin', 'attitude'] as suggestionKey}
												<label class="admin-field">
													<span>{suggestionKey}</span>
													<MarkdownTextarea
														class="question-input"
														value={editorItem.character_description_suggestions?.[suggestionKey] ?? ''}
														ariaLabel={`${suggestionKey} suggestion`}
														onchangeValue={(value) => {
															ensureCharacterDescriptionSuggestions(editorItem!);
															editorItem!.character_description_suggestions[suggestionKey] = value;
														}}
													/>
												</label>
											{/each}
										</div>
									</div>
								</div>
							</section>
						{/if}

						{#if selectedItemType === 'adversaries'}
							<section class="admin-panel">
								<h2>Experiences</h2>
								<div class="grid gap-3">
									{#each editorItem.experiences ?? [] as experience, index}
										<div class="grid gap-2 md:grid-cols-[1fr_6rem_auto]">
											<input class="admin-input" value={experience} onchange={(event) => updateString(editorItem!, 'experiences', index, event.currentTarget.value)} />
											<input class="admin-input" type="number" value={editorItem.experience_modifiers?.[index] ?? 0} onchange={(event) => updateNumberArray(editorItem!, 'experience_modifiers', index, event.currentTarget.value)} />
											<Button size="sm" variant="outline" onclick={() => {
												removeArrayItem(editorItem!, 'experiences', index);
												removeArrayItem(editorItem!, 'experience_modifiers', index);
											}}>Remove</Button>
										</div>
									{/each}
									<Button size="sm" variant="outline" class="w-fit" onclick={() => {
										addString(editorItem!, 'experiences');
										editorItem!.experience_modifiers = [...(editorItem!.experience_modifiers ?? []), 0];
									}}>Add Experience</Button>
								</div>
							</section>
						{/if}
						</div>
					{/if}
					{/if}
				</div>
			{#if editorItem && selectedItemType && relatedGroups.length > 0}
				<section class="related-panel">
					<button
						type="button"
						class="related-toggle"
						aria-expanded={relatedExpanded}
						onclick={() => (relatedExpanded = !relatedExpanded)}
					>
						<span>
							<strong>Related</strong>
							<small>{relatedGroups.reduce((total, group) => total + group.items.length, 0)} links</small>
						</span>
						<span>{relatedExpanded ? 'Hide' : 'Show'}</span>
					</button>
					{#if relatedExpanded}
						<div class="related-groups">
							{#each relatedGroups as group}
								<div class="related-group">
									<p>{group.label}</p>
									<div class="related-links">
										{#each group.items as item}
											<a
												href={entityHref(item)}
												onclick={(event) => {
													event.preventDefault();
													void navigateToItem(item);
												}}
											>
												<span>{item.title}</span>
												<small>{sourceLabel(item.source_key)} / {itemTypeLabel(item.item_type)}</small>
											</a>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</section>
			{/if}
			</section>
		</section>
	</main>

<Footer />

<style>
	.editor-layout {
		display: grid;
		align-items: start;
		gap: 1.25rem;
		overflow: visible;
	}

	.editor-layout.sections-closed {
		grid-template-columns: 3.25rem minmax(17rem, 20rem) minmax(0, 1fr);
	}

	.editor-layout.sections-open {
		grid-template-columns: 18rem minmax(16rem, 20rem) minmax(0, 1fr);
	}

	.sections-rail {
		display: flex;
		min-height: 0;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--border) / 0.7);
		background: hsl(var(--card) / 0.4);
		padding: 0.75rem 0.5rem;
		position: sticky;
		top: 1rem;
	}

	.sections-panel {
		max-height: calc(100vh - 2rem);
		overflow: hidden;
		position: sticky;
		top: 1rem;
	}

	.items-panel {
		max-height: calc(100vh - 2rem);
		overflow: hidden;
		position: sticky;
		top: 1rem;
	}

	.items-panel > div:last-child {
		min-height: 0;
		overflow-y: auto;
		scrollbar-gutter: stable;
	}

	.sections-list {
		min-height: 0;
		flex: 1;
		overflow-y: auto;
		padding-bottom: 1.5rem;
		scrollbar-gutter: stable;
	}

	.editor-actions-header {
		top: 0;
		z-index: 30;
	}

	.sections-rail span {
		color: hsl(var(--muted-foreground));
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0;
		writing-mode: vertical-rl;
	}

	.admin-input {
		height: 2.5rem;
		border-radius: 0.375rem;
		border: 1px solid #5a4b78;
		background: #16121f;
		box-shadow:
			inset 0 0 0 1px rgb(255 255 255 / 0.04),
			0 1px 0 rgb(255 255 255 / 0.03);
		padding: 0 0.75rem;
		color: #f4f0ff;
		font-size: 0.875rem;
		width: 100%;
	}

	.admin-input:hover {
		border-color: #8f74c7;
	}

	.admin-input:focus {
		border-color: #bca4ff;
		box-shadow:
			0 0 0 2px rgb(188 164 255 / 0.28),
			inset 0 0 0 1px rgb(255 255 255 / 0.06);
		outline: none;
	}

	.admin-input:disabled {
		border-style: solid;
		border-color: #3e344f;
		background: #211b2a;
		color: #cfc7dd;
		opacity: 1;
	}

	.admin-input::placeholder {
		color: hsl(var(--muted-foreground) / 0.75);
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

	.filter-field {
		display: grid;
		gap: 0.25rem;
		font-size: 0.75rem;
	}

	.filter-field span {
		font-weight: 600;
		color: hsl(var(--muted-foreground));
	}

	.filter-field select {
		width: 100%;
		border-radius: 0.375rem;
		border: 1px solid #4c3f63;
		background: #16121f;
		color: #f4f0ff;
		font-size: 0.8125rem;
		padding: 0.25rem;
	}

	.filter-field option {
		padding: 0.2rem 0.35rem;
	}

	.filter-field select:focus {
		border-color: #bca4ff;
		box-shadow: 0 0 0 2px rgb(188 164 255 / 0.22);
		outline: none;
	}

	.related-panel {
		display: grid;
		gap: 0;
		border-top: 1px solid hsl(var(--border) / 0.7);
		background: hsl(var(--card) / 0.55);
	}

	.related-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
		text-align: left;
	}

	.related-toggle span:first-child {
		display: grid;
		gap: 0.125rem;
	}

	.related-toggle strong {
		color: hsl(var(--foreground));
		font-size: 0.9rem;
		font-weight: 800;
	}

	.related-toggle small,
	.related-toggle > span:last-child {
		color: hsl(var(--muted-foreground));
		font-size: 0.8rem;
	}

	.related-toggle:hover {
		background: hsl(var(--muted) / 0.45);
	}

	.related-groups {
		display: grid;
		gap: 0.875rem;
		max-height: 14rem;
		overflow: auto;
		border-top: 1px solid hsl(var(--border) / 0.55);
		padding: 1rem;
	}

	.related-group {
		display: grid;
		gap: 0.5rem;
	}

	.related-group > p {
		color: hsl(var(--foreground));
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	.related-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.related-links a {
		display: grid;
		max-width: 16rem;
		border-radius: 0.375rem;
		border: 1px solid hsl(var(--border) / 0.7);
		background: hsl(var(--background) / 0.45);
		padding: 0.5rem 0.625rem;
		text-decoration: none;
		transition:
			background-color 120ms ease,
			border-color 120ms ease;
	}

	.related-links a:hover {
		border-color: hsl(var(--primary) / 0.75);
		background: hsl(var(--primary) / 0.18);
	}

	.related-links span,
	.related-links small {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.related-links span {
		color: hsl(var(--foreground));
		font-size: 0.85rem;
		font-weight: 700;
	}

	.related-links small {
		color: hsl(var(--muted-foreground));
		font-size: 0.72rem;
	}

	.check-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
	}

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

	.question-group {
		display: grid;
		gap: 0.75rem;
		min-width: 0;
	}

	.question-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.75rem;
		align-items: start;
	}

	@media (max-width: 900px) {
		.question-row {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 1023px) {
		.editor-layout.sections-closed,
		.editor-layout.sections-open {
			grid-template-columns: 1fr;
		}

		.sections-rail,
		.sections-panel,
		.items-panel {
			position: static;
			max-height: none;
		}

		.items-panel > div:last-child {
			overflow: visible;
		}
	}
</style>
