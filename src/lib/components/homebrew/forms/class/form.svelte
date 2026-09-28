<script lang="ts">
	import { CharacterClassSchema, type CharacterClass } from '@domain/schemas/compendium';
	import type { TraitId } from '@domain/schemas/rules';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Select from '$lib/components/ui/select';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import UserImageUploader from '$lib/components/utility/user-image-uploader.svelte';
	import HomebrewBadge from '$lib/components/decorations/badges/homebrew-badge.svelte';
	import FeaturesForm from '../shared/features/form.svelte';
	import { cn, capitalize, merge_compendium_content } from '$lib/utils';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import { getHomebrewContext } from '$lib/state/homebrew.svelte';
	import { getSourcesContext } from '$lib/state/sources.svelte';
	import { TRAIT_OPTIONS } from '@domain/constants/rules';
	import { superForm, intProxy, stringProxy } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { get } from 'svelte/store';
	import { tick } from 'svelte';
	import {
		homebrewHasErrorsBelow,
		summarizeSuperformErrors
	} from '$lib/components/homebrew/forms/helpers';
	import {
		characterClassFormDataToItem,
		characterClassToFormData,
		normalizeCharacterClass
	} from './normalize';
	import { summarizeClassFormErrors } from './errors';

	type LootOrConsumableOption =
		CharacterClass['starting_inventory']['loot_or_consumable_options'][number];

	const traitIds: TraitId[] = [
		'agility',
		'strength',
		'finesse',
		'instinct',
		'presence',
		'knowledge'
	];

	let {
		itemId,
		formId,
		item = $bindable(),
		hasChanges = $bindable(false),
		hasErrors = $bindable(false),
		unsavedItem = $bindable<CharacterClass | null>(null),
		saving = $bindable(false),
		onSaveSuccess,
		onSaveError
	}: {
		itemId: string;
		formId: string;
		item: CharacterClass;
		hasChanges?: boolean;
		hasErrors?: boolean;
		unsavedItem?: CharacterClass | null;
		saving?: boolean;
		onSaveSuccess?: () => void;
		onSaveError?: () => void;
	} = $props();

	const homebrew = getHomebrewContext();
	const sources = getSourcesContext();
	const fullCompendium = $derived(
		merge_compendium_content(sources.compendium, homebrew.compendium ?? merge_compendium_content())
	);

	const domainIds = $derived(
		Object.entries(fullCompendium.domains)
			.sort((a, b) => a[1].title.localeCompare(b[1].title))
			.map(([id]) => id)
	);
	const primaryWeaponIds = $derived(
		Object.entries(fullCompendium.primary_weapons)
			.sort((a, b) => a[1].title.localeCompare(b[1].title))
			.map(([id]) => id)
	);
	const secondaryWeaponIds = $derived(
		Object.entries(fullCompendium.secondary_weapons)
			.sort((a, b) => a[1].title.localeCompare(b[1].title))
			.map(([id]) => id)
	);
	const armorIds = $derived(
		Object.entries(fullCompendium.armor)
			.sort((a, b) => a[1].title.localeCompare(b[1].title))
			.map(([id]) => id)
	);
	const subclassEntries = $derived(
		Object.entries(fullCompendium.subclasses).sort((a, b) => a[1].title.localeCompare(b[1].title))
	);
	const lootIds = $derived(
		Object.entries(fullCompendium.loot)
			.sort((a, b) => a[1].title.localeCompare(b[1].title))
			.map(([id]) => id)
	);
	const consumableIds = $derived(
		Object.entries(fullCompendium.consumables)
			.sort((a, b) => a[1].title.localeCompare(b[1].title))
			.map(([id]) => id)
	);

	let imageInput: {
		upload: () => Promise<void>;
		clear: () => Promise<void>;
	} | null = $state(null);

	let hasPendingImageFile = $state(false);
	let uploadedImageUrl: string | undefined = $state(undefined);
	let imagePreviewUrl = $state(item.image_url ?? '');
	let lastSavedImageUrl: string | null = $state(null);

	let suggestedTraitsOpen = $state(false);
	let suggestedEquipmentOpen = $state(false);
	let startingInventoryOpen = $state(false);
	let backgroundQuestionsOpen = $state(false);
	let connectionQuestionsOpen = $state(false);
	let characterDescriptionOpen = $state(false);

	const characterClassForm = superForm<CharacterClass>(characterClassToFormData(item), {
		SPA: true,
		dataType: 'json',
		validators: zod4Client(CharacterClassSchema),
		async onUpdate({ form: validatedForm }) {
			if (!validatedForm.valid) return;
			await saveCharacterClass();
		},
		resetForm: false,
		taintedMessage: false
	});

	const { form, errors, allErrors, tainted, enhance } = characterClassForm;
	const startingEvasion = intProxy(characterClassForm, 'starting_evasion', { empty: 'zero' });
	const startingMaxHp = intProxy(characterClassForm, 'starting_max_hp', { empty: 'zero' });
	const primaryDomainId = stringProxy(characterClassForm, 'primary_domain_id', {
		empty: 'undefined'
	});
	const secondaryDomainId = stringProxy(characterClassForm, 'secondary_domain_id', {
		empty: 'undefined'
	});
	const suggestedPrimaryWeaponId = stringProxy(characterClassForm, 'suggested_primary_weapon_id', {
		empty: 'undefined'
	});
	const suggestedSecondaryWeaponId = stringProxy(
		characterClassForm,
		'suggested_secondary_weapon_id',
		{ empty: 'undefined' }
	);
	const suggestedArmorId = stringProxy(characterClassForm, 'suggested_armor_id', {
		empty: 'undefined'
	});
	const goldCoins = intProxy(characterClassForm, 'starting_inventory.gold_coins', {
		empty: 'zero'
	});
	const spellbookPrompt = stringProxy(characterClassForm, 'starting_inventory.spellbook_prompt', {
		empty: 'undefined'
	});

	function isHomebrewItem(item: { source_key?: string } | undefined) {
		return item?.source_key === 'Homebrew';
	}

	function getDomain(domainId: string | undefined) {
		return domainId ? fullCompendium.domains[domainId] : undefined;
	}

	function getDomainTitle(domainId: string) {
		return fullCompendium.domains[domainId]?.title ?? 'Unknown domain';
	}

	function getSubclass(subclassId: string | undefined) {
		return subclassId ? fullCompendium.subclasses[subclassId] : undefined;
	}

	function getSubclassTitle(subclassId: string) {
		return fullCompendium.subclasses[subclassId]?.title ?? 'Unknown subclass';
	}

	function getClass(classId: string | undefined) {
		return classId ? fullCompendium.classes[classId] : undefined;
	}

	function getSubclassClassTitle(subclassId: string) {
		const classId = fullCompendium.subclasses[subclassId]?.class_id;
		return classId ? (fullCompendium.classes[classId]?.title ?? 'Unknown class') : 'Unknown class';
	}

	function getWeapon(table: 'primary' | 'secondary', itemId: string | undefined) {
		if (!itemId) return undefined;
		return table === 'primary'
			? fullCompendium.primary_weapons[itemId]
			: fullCompendium.secondary_weapons[itemId];
	}

	function getWeaponTitle(table: 'primary' | 'secondary', itemId: string) {
		if (table === 'primary')
			return fullCompendium.primary_weapons[itemId]?.title ?? 'Unknown weapon';
		return fullCompendium.secondary_weapons[itemId]?.title ?? 'Unknown weapon';
	}

	function getArmor(armorId: string | undefined) {
		return armorId ? fullCompendium.armor[armorId] : undefined;
	}

	function getArmorTitle(armorId: string) {
		return fullCompendium.armor[armorId]?.title ?? 'Unknown armor';
	}

	function getLootOrConsumable(option: LootOrConsumableOption | undefined) {
		if (!option) return undefined;
		return option.type === 'loot'
			? fullCompendium.loot[option.id]
			: fullCompendium.consumables[option.id];
	}

	function getLootOrConsumableTitle(option: LootOrConsumableOption) {
		return option.type === 'loot'
			? (fullCompendium.loot[option.id]?.title ?? 'Unknown loot')
			: (fullCompendium.consumables[option.id]?.title ?? 'Unknown consumable');
	}

	const traitIndices = $derived.by(() => {
		const indices: Partial<Record<TraitId, number>> = {};
		const usedIndices = new Set<number>();

		for (const trait of traitIds) {
			const value = $form.suggested_traits[trait];
			if (value === undefined) continue;
			const index = TRAIT_OPTIONS.findIndex(
				(option, current) => option === value && !usedIndices.has(current)
			);
			if (index >= 0) {
				indices[trait] = index;
				usedIndices.add(index);
			}
		}

		return indices;
	});

	function isTraitOptionDisabled(currentTrait: TraitId, optionIndex: number) {
		return Object.entries(traitIndices).some(
			([trait, index]) => trait !== currentTrait && index === optionIndex
		);
	}

	function resetSuggestedTraits() {
		form.update((formData) => ({ ...formData, suggested_traits: {} }));
	}

	function updateSuggestedTrait(trait: TraitId, value: string) {
		if (value === '') {
			form.update((formData) => ({
				...formData,
				suggested_traits: { ...formData.suggested_traits, [trait]: undefined }
			}));
			return;
		}

		const nextIndex = Number(value);
		form.update((formData) => ({
			...formData,
			suggested_traits: { ...formData.suggested_traits, [trait]: TRAIT_OPTIONS[nextIndex] }
		}));
	}

	function addSubclass(subclassId: string) {
		if (subclassId === '' || $form.subclass_ids.includes(subclassId)) return;
		form.update((formData) => ({
			...formData,
			subclass_ids: [...formData.subclass_ids, subclassId]
		}));
	}

	function removeSubclass(subclassId: string) {
		form.update((formData) => ({
			...formData,
			subclass_ids: formData.subclass_ids.filter((id) => id !== subclassId)
		}));
	}

	function addFreeGear() {
		form.update((formData) => ({
			...formData,
			starting_inventory: {
				...formData.starting_inventory,
				free_gear: [...formData.starting_inventory.free_gear, '']
			}
		}));
	}

	function updateFreeGear(index: number, value: string) {
		form.update((formData) => ({
			...formData,
			starting_inventory: {
				...formData.starting_inventory,
				free_gear: formData.starting_inventory.free_gear.map((entry, current) =>
					current === index ? value : entry
				)
			}
		}));
	}

	function removeFreeGear(index: number) {
		form.update((formData) => ({
			...formData,
			starting_inventory: {
				...formData.starting_inventory,
				free_gear: formData.starting_inventory.free_gear.filter((_, current) => current !== index)
			}
		}));
	}

	function addLootOrConsumableOption() {
		form.update((formData) => ({
			...formData,
			starting_inventory: {
				...formData.starting_inventory,
				loot_or_consumable_options: [
					...formData.starting_inventory.loot_or_consumable_options,
					{ type: 'loot', id: '' }
				]
			}
		}));
	}

	function updateLootOrConsumableOptionType(index: number, type: 'loot' | 'consumable') {
		form.update((formData) => ({
			...formData,
			starting_inventory: {
				...formData.starting_inventory,
				loot_or_consumable_options: formData.starting_inventory.loot_or_consumable_options.map(
					(option, current) => (current === index ? { type, id: '' } : option)
				)
			}
		}));
	}

	function updateLootOrConsumableOptionId(index: number, id: string) {
		form.update((formData) => ({
			...formData,
			starting_inventory: {
				...formData.starting_inventory,
				loot_or_consumable_options: formData.starting_inventory.loot_or_consumable_options.map(
					(option, current) => (current === index ? { ...option, id } : option)
				)
			}
		}));
	}

	function removeLootOrConsumableOption(index: number) {
		form.update((formData) => ({
			...formData,
			starting_inventory: {
				...formData.starting_inventory,
				loot_or_consumable_options: formData.starting_inventory.loot_or_consumable_options.filter(
					(_, current) => current !== index
				)
			}
		}));
	}

	function addClassGearOption() {
		form.update((formData) => ({
			...formData,
			starting_inventory: {
				...formData.starting_inventory,
				class_gear_options: [...formData.starting_inventory.class_gear_options, '']
			}
		}));
	}

	function updateClassGearOption(index: number, value: string) {
		form.update((formData) => ({
			...formData,
			starting_inventory: {
				...formData.starting_inventory,
				class_gear_options: formData.starting_inventory.class_gear_options.map((entry, current) =>
					current === index ? value : entry
				)
			}
		}));
	}

	function removeClassGearOption(index: number) {
		form.update((formData) => ({
			...formData,
			starting_inventory: {
				...formData.starting_inventory,
				class_gear_options: formData.starting_inventory.class_gear_options.filter(
					(_, current) => current !== index
				)
			}
		}));
	}

	function addBackgroundQuestion() {
		form.update((formData) => ({
			...formData,
			background_questions: [...formData.background_questions, '']
		}));
	}

	function updateBackgroundQuestion(index: number, value: string) {
		form.update((formData) => ({
			...formData,
			background_questions: formData.background_questions.map((entry, current) =>
				current === index ? value : entry
			)
		}));
	}

	function removeBackgroundQuestion(index: number) {
		form.update((formData) => ({
			...formData,
			background_questions: formData.background_questions.filter((_, current) => current !== index)
		}));
	}

	function addConnectionQuestion() {
		form.update((formData) => ({
			...formData,
			connection_questions: [...formData.connection_questions, '']
		}));
	}

	function updateConnectionQuestion(index: number, value: string) {
		form.update((formData) => ({
			...formData,
			connection_questions: formData.connection_questions.map((entry, current) =>
				current === index ? value : entry
			)
		}));
	}

	function removeConnectionQuestion(index: number) {
		form.update((formData) => ({
			...formData,
			connection_questions: formData.connection_questions.filter((_, current) => current !== index)
		}));
	}

	function buildFormData(formData = get(form)): CharacterClass {
		return characterClassFormDataToItem(formData);
	}

	const errorSummary = $derived(summarizeSuperformErrors($allErrors));
	const errorSummaryMessages = $derived(summarizeClassFormErrors(errorSummary));
	const hopeFeatureErrorSummary = $derived({
		messages: errorSummary.messages,
		fieldErrors: errorSummary.fieldErrors.map((error) =>
			error.path[0] === 'hope_feature'
				? { ...error, path: ['hope_feature', 0, ...error.path.slice(1)] }
				: error
		)
	});
	const formHasChanges = $derived(Boolean($tainted) || hasPendingImageFile);
	const titleError = $derived($errors.title?.[0]);
	const startingEvasionError = $derived($errors.starting_evasion?.[0]);
	const startingMaxHpError = $derived($errors.starting_max_hp?.[0]);
	const primaryDomainError = $derived($errors.primary_domain_id?.[0]);
	const secondaryDomainError = $derived($errors.secondary_domain_id?.[0]);
	const startingInventoryHasErrors = $derived(
		homebrewHasErrorsBelow(errorSummary, ['starting_inventory'])
	);
	const suggestedTraitsHasErrors = $derived(
		homebrewHasErrorsBelow(errorSummary, ['suggested_traits'])
	);
	const suggestedEquipmentHasErrors = $derived(
		homebrewHasErrorsBelow(errorSummary, ['suggested_primary_weapon_id']) ||
			homebrewHasErrorsBelow(errorSummary, ['suggested_secondary_weapon_id']) ||
			homebrewHasErrorsBelow(errorSummary, ['suggested_armor_id'])
	);
	const backgroundQuestionsHasErrors = $derived(
		homebrewHasErrorsBelow(errorSummary, ['background_questions'])
	);
	const connectionQuestionsHasErrors = $derived(
		homebrewHasErrorsBelow(errorSummary, ['connection_questions'])
	);

	$effect(() => {
		if (
			lastSavedImageUrl !== null &&
			item.image_url !== lastSavedImageUrl &&
			$form.image_url === lastSavedImageUrl
		) {
			return;
		}
		if (lastSavedImageUrl !== null && item.image_url === lastSavedImageUrl) {
			lastSavedImageUrl = null;
		}
		characterClassForm.reset({ data: characterClassToFormData(item) });
		form.update((formData) => formData, { taint: 'untaint-all' });
		hasPendingImageFile = false;
		imagePreviewUrl = item.image_url ?? '';
		void imageInput?.clear();
	});

	$effect(() => {
		hasChanges = formHasChanges;
	});

	$effect(() => {
		hasErrors = $allErrors.length > 0;
	});

	$effect(() => {
		unsavedItem = buildFormData($form);
	});

	async function saveCharacterClass() {
		saving = true;
		try {
			if (hasPendingImageFile && imageInput) {
				await imageInput.upload();
			}
			const nextData = buildFormData(
				uploadedImageUrl ? { ...get(form), image_url: uploadedImageUrl } : undefined
			);

			const nextItem = normalizeCharacterClass(nextData);
			await homebrew.updateItem({
				type: 'classes',
				id: itemId as never,
				item: nextItem
			});
			item = nextItem;
			characterClassForm.reset({ data: characterClassToFormData(nextItem) });
			form.update((formData) => formData, { taint: 'untaint-all' });
			hasPendingImageFile = false;
			imagePreviewUrl = nextItem.image_url ?? '';
			lastSavedImageUrl = nextItem.image_url ?? '';
			uploadedImageUrl = undefined;
			await imageInput?.clear();
			await tick();
			onSaveSuccess?.();
		} catch (error) {
			onSaveError?.();
			throw error;
		} finally {
			saving = false;
		}
	}

	function handleReset(event?: Event) {
		event?.preventDefault();
		characterClassForm.reset({ data: characterClassToFormData(item) });
		form.update((formData) => formData, { taint: 'untaint-all' });
		hasPendingImageFile = false;
		imagePreviewUrl = item.image_url ?? '';
		uploadedImageUrl = undefined;
		void imageInput?.clear();
	}
</script>

<form id={formId} method="POST" use:enhance onreset={handleReset} class="flex flex-col gap-4">
	<div class="flex flex-col gap-1">
		<label
			class={cn('text-xs font-medium text-muted-foreground', titleError && 'text-destructive')}
			for="class-name">Name</label
		>
		<Input
			id="class-name"
			bind:value={$form.title}
			placeholder="Class name"
			aria-invalid={Boolean(titleError)}
		/>
		<!-- {#if titleError}
			<p class="text-xs text-destructive">{titleError}</p>
		{/if} -->
	</div>

	<div class="flex flex-col gap-1">
		<label class="text-xs font-medium text-muted-foreground" for="class-description"
			>Description</label
		>
		<Textarea
			id="class-description"
			bind:value={$form.description_html}
			placeholder="Class description"
			rows={3}
		/>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="flex flex-col gap-1">
			<label
				class={cn(
					'text-xs font-medium text-muted-foreground',
					startingEvasionError && 'text-destructive'
				)}
				for="class-starting-evasion">Starting Evasion</label
			>
			<Input
				id="class-starting-evasion"
				type="number"
				inputmode="numeric"
				bind:value={$startingEvasion}
				min="0"
				step="1"
				aria-invalid={Boolean(startingEvasionError)}
			/>
			<!-- {#if startingEvasionError}
				<p class="text-xs text-destructive">{startingEvasionError}</p>
			{/if} -->
		</div>

		<div class="flex flex-col gap-1">
			<label
				class={cn(
					'text-xs font-medium text-muted-foreground',
					startingMaxHpError && 'text-destructive'
				)}
				for="class-starting-max-hp">Starting HP</label
			>
			<Input
				id="class-starting-max-hp"
				type="number"
				inputmode="numeric"
				bind:value={$startingMaxHp}
				min="0"
				step="1"
				aria-invalid={Boolean(startingMaxHpError)}
			/>
			<!-- {#if startingMaxHpError}
				<p class="text-xs text-destructive">{startingMaxHpError}</p>
			{/if} -->
		</div>
	</div>

	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
		<div class="flex flex-col gap-1">
			<label
				class={cn(
					'text-xs font-medium text-muted-foreground',
					primaryDomainError && 'text-destructive'
				)}
				for="class-primary-domain">Primary Domain</label
			>
			<Select.Root type="single" bind:value={$primaryDomainId}>
				<Select.Trigger
					id="class-primary-domain"
					class={cn('w-full', primaryDomainError && 'border-destructive')}
				>
					{#if $primaryDomainId}
						{@const domain = getDomain($primaryDomainId)}
						<div class="flex min-w-0 items-center gap-1.5">
							<p class="truncate">{getDomainTitle($primaryDomainId)}</p>
							{#if isHomebrewItem(domain)}
								<HomebrewBadge />
							{/if}
						</div>
					{:else}
						<p class="truncate">None</p>
					{/if}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="">None</Select.Item>
					{#each domainIds as domainId}
						{@const domain = getDomain(domainId)}
						<Select.Item value={domainId}>
							<div class="flex items-center gap-1.5">
								<span>{getDomainTitle(domainId)}</span>
								{#if isHomebrewItem(domain)}
									<HomebrewBadge />
								{/if}
							</div>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="flex flex-col gap-1">
			<label
				class={cn(
					'text-xs font-medium text-muted-foreground',
					secondaryDomainError && 'text-destructive'
				)}
				for="class-secondary-domain">Secondary Domain</label
			>
			<Select.Root type="single" bind:value={$secondaryDomainId}>
				<Select.Trigger
					id="class-secondary-domain"
					class={cn('w-full', secondaryDomainError && 'border-destructive')}
				>
					{#if $secondaryDomainId}
						{@const domain = getDomain($secondaryDomainId)}
						<div class="flex min-w-0 items-center gap-1.5">
							<p class="truncate">{getDomainTitle($secondaryDomainId)}</p>
							{#if isHomebrewItem(domain)}
								<HomebrewBadge />
							{/if}
						</div>
					{:else}
						<p class="truncate">None</p>
					{/if}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="">None</Select.Item>
					{#each domainIds as domainId}
						{@const domain = getDomain(domainId)}
						<Select.Item value={domainId}>
							<div class="flex items-center gap-1.5">
								<span>{getDomainTitle(domainId)}</span>
								{#if isHomebrewItem(domain)}
									<HomebrewBadge />
								{/if}
							</div>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<div class="flex gap-2">
		<div class="flex flex-col gap-1">
			<p class="text-xs font-medium text-muted-foreground">Artwork</p>
			<UserImageUploader
				bind:this={imageInput}
				onSelect={() => (hasPendingImageFile = true)}
				onUpload={(url) => {
					uploadedImageUrl = url;
					imagePreviewUrl = url;
					form.update((formData) => ({ ...formData, image_url: url }));
				}}
				placeholderImage={imagePreviewUrl || '/images/art/placeholder-art.webp'}
				alt="Class artwork"
				class="w-26"
			/>
		</div>

		<div class="flex grow flex-col gap-1">
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium text-muted-foreground" for="class-artist">Artist</label>
				<Input id="class-artist" bind:value={$form.artist_name} placeholder="Name" />
			</div>
			<Button
				type="button"
				class="w-min px-1 text-muted-foreground"
				size="sm"
				variant="link"
				disabled={$form.image_url === '' && !hasPendingImageFile}
				onclick={() => {
					$form.image_url = '';
					hasPendingImageFile = false;
					imagePreviewUrl = '';
					void imageInput?.clear();
				}}
			>
				Remove image
			</Button>
		</div>
	</div>

	<FeaturesForm
		bind:features={
			() => [$form.hope_feature],
			(value) => {
				if (value[0]) $form.hope_feature = value[0];
			}
		}
		staticTitles={['Hope Feature']}
		allowUsage
		errorSummary={hopeFeatureErrorSummary}
		path={['hope_feature']}
	/>
	<FeaturesForm
		bind:features={$form.class_features}
		allowAddRemove
		allowUsage
		featureLabel="Feature"
		{errorSummary}
		path={['class_features']}
	/>

	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium text-muted-foreground">Subclasses</p>
		<Select.Root
			type="single"
			value=""
			onValueChange={(value) => {
				if (value) addSubclass(value);
			}}
		>
			<Select.Trigger class="w-full">
				<p class="truncate">Add subclass</p>
			</Select.Trigger>
			<Select.Content>
				{#each subclassEntries as [subclassId, subclass]}
					<Select.Item value={subclassId} disabled={$form.subclass_ids.includes(subclassId)}>
						<div class="flex items-center gap-1.5">
							<span>{subclass.title}</span>
							{#if isHomebrewItem(subclass)}
								<HomebrewBadge />
							{/if}
						</div>
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		{#if $form.subclass_ids.length > 0}
			<div class="flex flex-col gap-2">
				{#each $form.subclass_ids as subclassId (subclassId)}
					{@const subclass = getSubclass(subclassId)}
					{@const subclassClass = getClass(subclass?.class_id)}
					<div class="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2">
						<div class="min-w-0 flex-1">
							<div class="flex min-w-0 items-center gap-1.5">
								<p class="truncate text-sm font-medium">{getSubclassTitle(subclassId)}</p>
								{#if isHomebrewItem(subclass)}
									<HomebrewBadge />
								{/if}
							</div>
							<div class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
								<p class="truncate">{getSubclassClassTitle(subclassId)}</p>
								{#if isHomebrewItem(subclassClass)}
									<HomebrewBadge />
								{/if}
							</div>
						</div>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							class="size-8 p-0"
							onclick={() => removeSubclass(subclassId)}
						>
							<X class="size-4" />
						</Button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<Collapsible.Root bind:open={suggestedTraitsOpen} class="flex flex-col gap-2">
		<Collapsible.Trigger
			class={cn(
				'flex w-full items-center gap-1.5 text-left',
				suggestedTraitsHasErrors && 'text-destructive'
			)}
		>
			<ChevronRight
				class={cn('size-4 shrink-0 transition-transform', suggestedTraitsOpen && 'rotate-90')}
			/>
			<p class="text-xs font-medium text-muted-foreground">Suggested Traits</p>
		</Collapsible.Trigger>
		<Collapsible.Content class="flex flex-col gap-3">
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{#each traitIds as trait}
					<div class="flex flex-col gap-1">
						<label class="text-xs text-muted-foreground" for={`class-suggested-trait-${trait}`}
							>{capitalize(trait)}</label
						>
						<Select.Root
							type="single"
							value={(traitIndices[trait] ?? '').toString()}
							onValueChange={(value) => updateSuggestedTrait(trait, value)}
						>
							<Select.Trigger id={`class-suggested-trait-${trait}`} class="w-full">
								<p class="truncate">
									{#if $form.suggested_traits[trait] === undefined}
										Select
									{:else}
										{$form.suggested_traits[trait]! > 0
											? '+' + $form.suggested_traits[trait]!
											: $form.suggested_traits[trait]}
									{/if}
								</p>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="">None</Select.Item>
								{#each TRAIT_OPTIONS as option, index}
									<Select.Item
										value={index.toString()}
										disabled={isTraitOptionDisabled(trait, index)}
									>
										{option > 0 ? '+' + option : option}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/each}
			</div>

			<div class="flex justify-end">
				<Button type="button" size="sm" variant="link" class="h-7" onclick={resetSuggestedTraits}>
					<RotateCcw class="size-3.5" />
					Clear
				</Button>
			</div>
		</Collapsible.Content>
	</Collapsible.Root>

	<Collapsible.Root bind:open={suggestedEquipmentOpen} class="flex flex-col gap-2">
		<Collapsible.Trigger
			class={cn(
				'flex w-full items-center gap-1.5 text-left',
				suggestedEquipmentHasErrors && 'text-destructive'
			)}
		>
			<ChevronRight
				class={cn('size-4 shrink-0 transition-transform', suggestedEquipmentOpen && 'rotate-90')}
			/>
			<p class="text-xs font-medium text-muted-foreground">Suggested Equipment</p>
		</Collapsible.Trigger>
		<Collapsible.Content class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<div class="flex flex-col gap-1">
				<label class="text-xs text-muted-foreground" for="class-suggested-primary-weapon"
					>Primary Weapon</label
				>
				<Select.Root type="single" bind:value={$suggestedPrimaryWeaponId}>
					<Select.Trigger id="class-suggested-primary-weapon" class="w-full">
						{#if $suggestedPrimaryWeaponId}
							{@const weapon = getWeapon('primary', $suggestedPrimaryWeaponId)}
							<div class="flex min-w-0 items-center gap-1.5">
								<p class="truncate">{getWeaponTitle('primary', $suggestedPrimaryWeaponId)}</p>
								{#if isHomebrewItem(weapon)}
									<HomebrewBadge />
								{/if}
							</div>
						{:else}
							<p class="truncate">None</p>
						{/if}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">None</Select.Item>
						{#each primaryWeaponIds as weaponId}
							{@const weapon = getWeapon('primary', weaponId)}
							<Select.Item value={weaponId}>
								<div class="flex items-center gap-1.5">
									<span>{getWeaponTitle('primary', weaponId)}</span>
									{#if isHomebrewItem(weapon)}
										<HomebrewBadge />
									{/if}
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="flex flex-col gap-1">
				<label class="text-xs text-muted-foreground" for="class-suggested-secondary-weapon"
					>Secondary Weapon</label
				>
				<Select.Root type="single" bind:value={$suggestedSecondaryWeaponId}>
					<Select.Trigger id="class-suggested-secondary-weapon" class="w-full">
						{#if $suggestedSecondaryWeaponId}
							{@const weapon = getWeapon('secondary', $suggestedSecondaryWeaponId)}
							<div class="flex min-w-0 items-center gap-1.5">
								<p class="truncate">
									{getWeaponTitle('secondary', $suggestedSecondaryWeaponId)}
								</p>
								{#if isHomebrewItem(weapon)}
									<HomebrewBadge />
								{/if}
							</div>
						{:else}
							<p class="truncate">None</p>
						{/if}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">None</Select.Item>
						{#each secondaryWeaponIds as weaponId}
							{@const weapon = getWeapon('secondary', weaponId)}
							<Select.Item value={weaponId}>
								<div class="flex items-center gap-1.5">
									<span>{getWeaponTitle('secondary', weaponId)}</span>
									{#if isHomebrewItem(weapon)}
										<HomebrewBadge />
									{/if}
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="flex flex-col gap-1">
				<label class="text-xs text-muted-foreground" for="class-suggested-armor">Armor</label>
				<Select.Root type="single" bind:value={$suggestedArmorId}>
					<Select.Trigger id="class-suggested-armor" class="w-full">
						{#if $suggestedArmorId}
							{@const armor = getArmor($suggestedArmorId)}
							<div class="flex min-w-0 items-center gap-1.5">
								<p class="truncate">{getArmorTitle($suggestedArmorId)}</p>
								{#if isHomebrewItem(armor)}
									<HomebrewBadge />
								{/if}
							</div>
						{:else}
							<p class="truncate">None</p>
						{/if}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">None</Select.Item>
						{#each armorIds as armorId}
							{@const armor = getArmor(armorId)}
							<Select.Item value={armorId}>
								<div class="flex items-center gap-1.5">
									<span>{getArmorTitle(armorId)}</span>
									{#if isHomebrewItem(armor)}
										<HomebrewBadge />
									{/if}
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Collapsible.Content>
	</Collapsible.Root>

	<Collapsible.Root bind:open={startingInventoryOpen} class="flex flex-col gap-2">
		<Collapsible.Trigger
			class={cn(
				'flex w-full items-center gap-1.5 text-left',
				startingInventoryHasErrors && 'text-destructive'
			)}
		>
			<ChevronRight
				class={cn('size-4 shrink-0 transition-transform', startingInventoryOpen && 'rotate-90')}
			/>
			<p class="text-xs font-medium text-muted-foreground">Starting Inventory</p>
		</Collapsible.Trigger>
		<Collapsible.Content class="flex flex-col gap-4">
			<div class="flex flex-col gap-1">
				<label class="text-xs text-muted-foreground" for="class-starting-gold">Gold Coins</label>
				<Input
					id="class-starting-gold"
					type="number"
					inputmode="numeric"
					bind:value={$goldCoins}
					min="0"
					step="1"
				/>
			</div>

			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<p class="text-xs font-medium text-muted-foreground">Free Gear</p>
					<Button type="button" size="sm" variant="outline" onclick={addFreeGear}>
						<Plus class="size-3.5" />
						Add
					</Button>
				</div>
				{#each $form.starting_inventory.free_gear as entry, index (index)}
					<div class="flex items-center gap-2">
						<Input
							value={entry}
							placeholder="Gear name"
							oninput={(event) => updateFreeGear(index, event.currentTarget.value)}
						/>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							class="size-8 p-0"
							onclick={() => removeFreeGear(index)}
						>
							<X class="size-4" />
						</Button>
					</div>
				{:else}
					<p class="text-xs italic text-muted-foreground">No free gear added</p>
				{/each}
			</div>

			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<p class="text-xs font-medium text-muted-foreground">Loot or Consumable Options</p>
					<Button type="button" size="sm" variant="outline" onclick={addLootOrConsumableOption}>
						<Plus class="size-3.5" />
						Add
					</Button>
				</div>
				{#each $form.starting_inventory.loot_or_consumable_options as option, index (index)}
					<div class="grid grid-cols-[120px,1fr,auto] gap-2">
						<Select.Root
							type="single"
							value={option.type}
							onValueChange={(value) =>
								value && updateLootOrConsumableOptionType(index, value as 'loot' | 'consumable')}
						>
							<Select.Trigger class="w-full">
								<p class="truncate capitalize">{option.type}</p>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="loot">Loot</Select.Item>
								<Select.Item value="consumable">Consumable</Select.Item>
							</Select.Content>
						</Select.Root>

						<Select.Root
							type="single"
							value={option.id}
							onValueChange={(value) => updateLootOrConsumableOptionId(index, value)}
						>
							<Select.Trigger class="w-full">
								{#if option.id}
									{@const linkedItem = getLootOrConsumable(option)}
									<div class="flex min-w-0 items-center gap-1.5">
										<p class="truncate">{getLootOrConsumableTitle(option)}</p>
										{#if isHomebrewItem(linkedItem)}
											<HomebrewBadge />
										{/if}
									</div>
								{:else}
									<p class="truncate">Select item</p>
								{/if}
							</Select.Trigger>
							<Select.Content>
								{#if option.type === 'loot'}
									{#each lootIds as lootId}
										{@const loot = fullCompendium.loot[lootId]}
										<Select.Item value={lootId}>
											<div class="flex items-center gap-1.5">
												<span>{loot?.title ?? lootId}</span>
												{#if isHomebrewItem(loot)}
													<HomebrewBadge />
												{/if}
											</div>
										</Select.Item>
									{/each}
								{:else}
									{#each consumableIds as consumableId}
										{@const consumable = fullCompendium.consumables[consumableId]}
										<Select.Item value={consumableId}>
											<div class="flex items-center gap-1.5">
												<span>{consumable?.title ?? consumableId}</span>
												{#if isHomebrewItem(consumable)}
													<HomebrewBadge />
												{/if}
											</div>
										</Select.Item>
									{/each}
								{/if}
							</Select.Content>
						</Select.Root>

						<Button
							type="button"
							size="sm"
							variant="ghost"
							class="size-8 p-0"
							onclick={() => removeLootOrConsumableOption(index)}
						>
							<X class="size-4" />
						</Button>
					</div>
				{:else}
					<p class="text-xs italic text-muted-foreground">No loot or consumable options added</p>
				{/each}
			</div>
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<p class="text-xs font-medium text-muted-foreground">Class Gear Options</p>
					<Button type="button" size="sm" variant="outline" onclick={addClassGearOption}>
						<Plus class="size-3.5" />
						Add
					</Button>
				</div>
				{#each $form.starting_inventory.class_gear_options as entry, index (index)}
					<div class="flex items-center gap-2">
						<Input
							value={entry}
							placeholder="Gear option"
							oninput={(event) => updateClassGearOption(index, event.currentTarget.value)}
						/>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							class="size-8 p-0"
							onclick={() => removeClassGearOption(index)}
						>
							<X class="size-4" />
						</Button>
					</div>
				{:else}
					<p class="text-xs italic text-muted-foreground">No class gear options added</p>
				{/each}
			</div>

			<div class="flex flex-col gap-1">
				<label class="text-xs text-muted-foreground" for="class-spellbook-prompt"
					>Spellbook Prompt</label
				>
				<Input
					id="class-spellbook-prompt"
					bind:value={$spellbookPrompt}
					placeholder="Optional prompt"
				/>
			</div>
		</Collapsible.Content>
	</Collapsible.Root>

	<Collapsible.Root bind:open={backgroundQuestionsOpen} class="flex flex-col gap-2">
		<Collapsible.Trigger
			class={cn(
				'flex w-full items-center gap-1.5 text-left',
				backgroundQuestionsHasErrors && 'text-destructive'
			)}
		>
			<ChevronRight
				class={cn('size-4 shrink-0 transition-transform', backgroundQuestionsOpen && 'rotate-90')}
			/>
			<p class="text-xs font-medium text-muted-foreground">Background Questions</p>
		</Collapsible.Trigger>
		<Collapsible.Content class="flex flex-col gap-2">
			{#each $form.background_questions as question, index (index)}
				<div class="flex items-center gap-2">
					<Textarea
						value={question}
						rows={2}
						placeholder="Question"
						oninput={(event) => updateBackgroundQuestion(index, event.currentTarget.value)}
					/>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						class="size-8 p-0"
						onclick={() => removeBackgroundQuestion(index)}
					>
						<X class="size-4" />
					</Button>
				</div>
			{:else}
				<p class="text-xs italic text-muted-foreground">No background questions added</p>
			{/each}
			<div class="flex justify-start">
				<Button type="button" size="sm" variant="outline" onclick={addBackgroundQuestion}>
					<Plus class="size-3.5" />
					Add Question
				</Button>
			</div>
		</Collapsible.Content>
	</Collapsible.Root>

	<Collapsible.Root bind:open={connectionQuestionsOpen} class="flex flex-col gap-2">
		<Collapsible.Trigger
			class={cn(
				'flex w-full items-center gap-1.5 text-left',
				connectionQuestionsHasErrors && 'text-destructive'
			)}
		>
			<ChevronRight
				class={cn('size-4 shrink-0 transition-transform', connectionQuestionsOpen && 'rotate-90')}
			/>
			<p class="text-xs font-medium text-muted-foreground">Connection Questions</p>
		</Collapsible.Trigger>
		<Collapsible.Content class="flex flex-col gap-2">
			{#each $form.connection_questions as question, index (index)}
				<div class="flex items-center gap-2">
					<Textarea
						value={question}
						rows={2}
						placeholder="Question"
						oninput={(event) => updateConnectionQuestion(index, event.currentTarget.value)}
					/>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						class="size-8 p-0"
						onclick={() => removeConnectionQuestion(index)}
					>
						<X class="size-4" />
					</Button>
				</div>
			{:else}
				<p class="text-xs italic text-muted-foreground">No connection questions added</p>
			{/each}
			<div class="flex justify-start">
				<Button type="button" size="sm" variant="outline" onclick={addConnectionQuestion}>
					<Plus class="size-3.5" />
					Add Question
				</Button>
			</div>
		</Collapsible.Content>
	</Collapsible.Root>

	<Collapsible.Root bind:open={characterDescriptionOpen} class="flex flex-col gap-2">
		<Collapsible.Trigger class="flex w-full items-center gap-1.5 text-left">
			<ChevronRight
				class={cn('size-4 shrink-0 transition-transform', characterDescriptionOpen && 'rotate-90')}
			/>
			<p class="text-xs font-medium text-muted-foreground">Character Description Suggestions</p>
		</Collapsible.Trigger>
		<Collapsible.Content class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<div class="flex flex-col gap-1">
				<label class="text-xs text-muted-foreground" for="class-clothes">Clothes</label>
				<Input
					id="class-clothes"
					bind:value={$form.character_description_suggestions.clothes}
					placeholder="Clothes that are..."
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label class="text-xs text-muted-foreground" for="class-eyes">Eyes</label>
				<Input
					id="class-eyes"
					bind:value={$form.character_description_suggestions.eyes}
					placeholder="Eyes like..."
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label class="text-xs text-muted-foreground" for="class-body">Body</label>
				<Input
					id="class-body"
					bind:value={$form.character_description_suggestions.body}
					placeholder="Body that's..."
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label class="text-xs text-muted-foreground" for="class-skin">Skin</label>
				<Input
					id="class-skin"
					bind:value={$form.character_description_suggestions.skin}
					placeholder="Skin the color of..."
				/>
			</div>
			<div class="flex flex-col gap-1 sm:col-span-2">
				<label class="text-xs text-muted-foreground" for="class-attitude">Attitude</label>
				<Input
					id="class-attitude"
					bind:value={$form.character_description_suggestions.attitude}
					placeholder="Attitude like..."
				/>
			</div>
		</Collapsible.Content>
	</Collapsible.Root>

	{#if errorSummaryMessages.length > 0}
		<ul class="list-inside list-disc space-y-1 pt-2">
			{#each errorSummaryMessages as error}
				<li class="text-xs text-destructive">{error}</li>
			{/each}
		</ul>
	{/if}
</form>
