<script lang="ts">
	import {
		SubclassSchema,
		type Subclass,
		type SubclassLevelUpOption
	} from '@domain/schemas/compendium';
	import type { TraitId } from '@domain/schemas/rules';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import Dropdown from '$lib/components/utility/dropdown.svelte';
	import UserImageUploader from '$lib/components/utility/user-image-uploader.svelte';
	import HomebrewBadge from '$lib/components/decorations/badges/homebrew-badge.svelte';
	import CardChoicesForm from '../shared/card-choices/form.svelte';
	import FeaturesForm from '../shared/features/form.svelte';
	import { cn, capitalize, merge_compendium_content } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import { getHomebrewContext } from '$lib/state/homebrew.svelte';
	import { getSourcesContext } from '$lib/state/sources.svelte';
	import { superForm, stringProxy } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { get } from 'svelte/store';
	import { tick } from 'svelte';
	import {
		homebrewHasErrorsBelow,
		summarizeSuperformErrors
	} from '$lib/components/homebrew/forms/helpers';
	import { normalizeSubclass, subclassFormDataToItem, subclassToFormData } from './normalize';
	import { summarizeSubclassFormErrors } from './errors';

	type SubclassCardTab = 'foundation' | 'specialization' | 'mastery';
	type SubclassCardKey = 'foundation_card' | 'specialization_card' | 'mastery_card';

	let {
		itemId,
		formId,
		item = $bindable(),
		hasChanges = $bindable(false),
		hasErrors = $bindable(false),
		unsavedItem = $bindable<Subclass | null>(null),
		saving = $bindable(false),
		formTab = $bindable<SubclassCardTab>('foundation'),
		onSaveSuccess,
		onSaveError
	}: {
		itemId: string;
		formId: string;
		item: Subclass;
		hasChanges?: boolean;
		hasErrors?: boolean;
		unsavedItem?: Subclass | null;
		saving?: boolean;
		formTab?: SubclassCardTab;
		onSaveSuccess?: () => void;
		onSaveError?: () => void;
	} = $props();

	const homebrew = getHomebrewContext();
	const sources = getSourcesContext();
	const fullCompendium = $derived(
		merge_compendium_content(sources.compendium, homebrew.compendium ?? merge_compendium_content())
	);
	const classIds = $derived(Object.keys(fullCompendium.classes));
	const traitOptions: TraitId[] = [
		'agility',
		'strength',
		'finesse',
		'instinct',
		'presence',
		'knowledge'
	];
	const tabCardKeys: Record<SubclassCardTab, SubclassCardKey> = {
		foundation: 'foundation_card',
		specialization: 'specialization_card',
		mastery: 'mastery_card'
	};

	let imageInput: {
		upload: () => Promise<void>;
		clear: () => Promise<void>;
	} | null = $state(null);
	let hasPendingImageFile = $state(false);
	let uploadedImageUrl: string | undefined = $state(undefined);
	let imagePreviewUrl = $state(item.image_url ?? '');
	let lastSavedImageUrl: string | null = $state(null);

	const subclassForm = superForm<Subclass>(subclassToFormData(item), {
		SPA: true,
		dataType: 'json',
		validators: zod4Client(SubclassSchema),
		async onUpdate({ form: validatedForm }) {
			if (!validatedForm.valid) return;
			await saveSubclass();
		},
		resetForm: false,
		taintedMessage: false
	});

	const { form, errors, allErrors, tainted, enhance } = subclassForm;
	const classId = stringProxy(subclassForm, 'class_id', { empty: 'undefined' });
	const spellcastTrait = stringProxy(subclassForm, 'spellcast_trait', { empty: 'undefined' });

	function isHomebrewItem(item: { source_key?: string } | undefined) {
		return item?.source_key === 'Homebrew';
	}
	function getCharacterClass(classId: string | undefined) {
		return classId ? fullCompendium.classes[classId] : undefined;
	}
	function cardKey(tab: SubclassCardTab): SubclassCardKey {
		return tabCardKeys[tab];
	}
	function getLevelUpOptionLabel(option: SubclassLevelUpOption) {
		return option?.short_title.trim() || option?.title.trim() || 'Unnamed Level Up Option';
	}
	function updateCard(
		tab: SubclassCardTab,
		updater: (card: Subclass[SubclassCardKey]) => Subclass[SubclassCardKey]
	) {
		const key = cardKey(tab);
		form.update((formData) => ({ ...formData, [key]: updater(formData[key]) }));
	}
	function addLevelUpOption(tab: SubclassCardTab) {
		updateCard(tab, (card) => ({
			...card,
			level_up_options: [
				...(card.level_up_options ?? []),
				{ type: 'domain_card', option_id: crypto.randomUUID(), title: '', short_title: '', max: 1 }
			]
		}));
	}
	function updateLevelUpOption(
		tab: SubclassCardTab,
		index: number,
		updater: (option: SubclassLevelUpOption) => SubclassLevelUpOption
	) {
		updateCard(tab, (card) => ({
			...card,
			level_up_options: (card.level_up_options ?? []).map((option, currentIndex) =>
				currentIndex === index ? updater(option) : option
			)
		}));
	}
	function removeLevelUpOption(tab: SubclassCardTab, index: number) {
		updateCard(tab, (card) => ({
			...card,
			level_up_options: (card.level_up_options ?? []).filter(
				(_, currentIndex) => currentIndex !== index
			)
		}));
	}
	function buildFormData(formData = get(form)): Subclass {
		return subclassFormDataToItem(formData);
	}

	const errorSummary = $derived(summarizeSuperformErrors($allErrors));
	const errorSummaryMessages = $derived(summarizeSubclassFormErrors(errorSummary));
	const formHasChanges = $derived(Boolean($tainted) || hasPendingImageFile);
	const titleError = $derived($errors.title?.[0]);
	const classIdError = $derived($errors.class_id?.[0]);

	function levelUpOptionHasErrors(tab: SubclassCardTab, index: number): boolean {
		return homebrewHasErrorsBelow(errorSummary, [cardKey(tab), 'level_up_options', index]);
	}
	function levelUpOptionMessages(tab: SubclassCardTab, index: number): string[] {
		return errorSummary.fieldErrors
			.filter((error) =>
				homebrewHasErrorsBelow({ fieldErrors: [error], messages: [] }, [
					cardKey(tab),
					'level_up_options',
					index
				])
			)
			.map((error) => error.message);
	}

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
		subclassForm.reset({ data: subclassToFormData(item) });
		form.update((formData) => formData, { taint: 'untaint-all' });
		hasPendingImageFile = false;
		imagePreviewUrl = item.image_url ?? '';
		void imageInput?.clear();
	});
	$effect(() => {
		hasChanges = formHasChanges;
	});
	$effect(() => {
		hasErrors = errorSummary.fieldErrors.length > 0;
	});
	$effect(() => {
		unsavedItem = buildFormData($form);
	});

	async function saveSubclass() {
		saving = true;
		try {
			if (hasPendingImageFile && imageInput) {
				await imageInput.upload();
			}
			const nextData = buildFormData(
				uploadedImageUrl ? { ...get(form), image_url: uploadedImageUrl } : undefined
			);
			const nextItem = normalizeSubclass(nextData);
			await homebrew.updateItem({ type: 'subclasses', id: itemId as never, item: nextItem });
			item = nextItem;
			subclassForm.reset({ data: subclassToFormData(nextItem) });
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
		subclassForm.reset({ data: subclassToFormData(item) });
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
			for="subclass-name">Name</label
		>
		<Input
			id="subclass-name"
			bind:value={$form.title}
			placeholder="Subclass name"
			aria-invalid={Boolean(titleError)}
		/>
		<!-- {#if titleError}
			<p class="text-xs text-destructive">{titleError}</p>
		{/if} -->
	</div>

	<div class="flex flex-col gap-1">
		<label class="text-xs font-medium text-muted-foreground" for="subclass-description"
			>Description</label
		>
		<Textarea
			id="subclass-description"
			bind:value={$form.description_html}
			placeholder="Subclass description"
			rows={3}
		/>
	</div>

	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
		<div class="flex flex-col gap-1">
			<label
				class={cn('text-xs font-medium text-muted-foreground', classIdError && 'text-destructive')}
				for="subclass-class">Class</label
			>
			<Select.Root type="single" bind:value={$classId}>
				<Select.Trigger
					id="subclass-class"
					class={cn('w-full', classIdError && 'border-destructive')}
				>
					{#if $classId}
						{@const characterClass = getCharacterClass($classId)}
						<div class="flex min-w-0 items-center gap-1.5">
							<p class="truncate">{characterClass?.title ?? $classId}</p>
							{#if isHomebrewItem(characterClass)}
								<HomebrewBadge />
							{/if}
						</div>
					{:else}
						<p class="truncate">Select class</p>
					{/if}
				</Select.Trigger>
				<Select.Content>
					{#each classIds as classId}
						{@const characterClass = getCharacterClass(classId)}
						<Select.Item value={classId}>
							<div class="flex items-center gap-1.5">
								<span>{characterClass?.title ?? classId}</span>
								{#if isHomebrewItem(characterClass)}
									<HomebrewBadge />
								{/if}
							</div>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<!-- {#if classIdError}
				<p class="text-xs text-destructive">{classIdError}</p>
			{/if} -->
		</div>

		<div class="flex flex-col gap-1">
			<label class="text-xs font-medium text-muted-foreground" for="subclass-spellcast-trait"
				>Spellcast Trait</label
			>
			<Select.Root type="single" bind:value={$spellcastTrait}>
				<Select.Trigger id="subclass-spellcast-trait" class="w-full">
					<p class="truncate">
						{$spellcastTrait ? capitalize($spellcastTrait as TraitId) : 'None'}
					</p>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="">None</Select.Item>
					{#each traitOptions as trait}
						<Select.Item value={trait}>{capitalize(trait)}</Select.Item>
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
				alt="Subclass artwork"
				class="w-26"
			/>
		</div>

		<div class="flex grow flex-col gap-1">
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium text-muted-foreground" for="subclass-artist">Artist</label
				>
				<Input id="subclass-artist" bind:value={$form.artist_name} placeholder="Name" />
			</div>
			<Button
				type="button"
				class="w-min px-1 text-muted-foreground"
				size="sm"
				variant="link"
				disabled={$form.image_url === '' && !hasPendingImageFile}
				onclick={() => {
					form.update((formData) => ({ ...formData, image_url: '' }));
					hasPendingImageFile = false;
					imagePreviewUrl = '';
					void imageInput?.clear();
				}}
			>
				Remove image
			</Button>
		</div>
	</div>

	<Tabs.Root bind:value={formTab} class="flex flex-col gap-4">
		<Tabs.List class="mx-auto">
			<Tabs.Trigger value="foundation">Foundation</Tabs.Trigger>
			<Tabs.Trigger value="specialization">Specialization</Tabs.Trigger>
			<Tabs.Trigger value="mastery">Mastery</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="foundation" class="flex flex-col gap-4">
			<label
				class="flex items-center gap-2 text-xs text-muted-foreground"
				for="subclass-foundation-tokens"
			>
				<Checkbox
					id="subclass-foundation-tokens"
					bind:checked={$form.foundation_card.tokens_enabled}
				/>
				Enable tokens on foundation card
			</label>
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between gap-2">
					<p class="text-xs font-medium text-muted-foreground">Level Up Options</p>

					<Button
						type="button"
						size="sm"
						variant="outline"
						onclick={() => addLevelUpOption('foundation')}
					>
						<Plus class="size-3.5" />
						Add Level Up Option
					</Button>
				</div>

				<div class="flex flex-col gap-2">
					{#each $form.foundation_card.level_up_options ?? [] as option, index (index)}
						{@const optionErrors = levelUpOptionMessages('foundation', index)}
						<Dropdown
							title={getLevelUpOptionLabel(option)}
							class={levelUpOptionHasErrors('foundation', index)
								? 'data-[open=false]:border data-[open=false]:border-destructive'
								: ''}
						>
							<div class="flex flex-col gap-4">
								<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<div class="flex flex-col gap-1">
										<p class="text-xs font-medium text-muted-foreground">Type</p>
										<Select.Root
											type="single"
											value={option.type}
											onValueChange={() => {
												updateLevelUpOption('foundation', index, (current) => ({
													...current,
													type: 'domain_card'
												}));
											}}
										>
											<Select.Trigger class="w-full">
												<p class="truncate">Extra Domain Cards</p>
											</Select.Trigger>
											<Select.Content>
												<Select.Item value="domain_card">Extra Domain Cards</Select.Item>
											</Select.Content>
										</Select.Root>
									</div>

									<div class="flex flex-col gap-1">
										<p class="text-xs font-medium text-muted-foreground">Max</p>
										<Input
											type="number"
											min="1"
											value={String(option.max)}
											oninput={(event) => {
												const target = event.currentTarget as HTMLInputElement;
												updateLevelUpOption('foundation', index, (current) => ({
													...current,
													max: Math.max(1, Number.parseInt(target.value || '1', 10) || 1)
												}));
											}}
										/>
									</div>

									<div class="flex flex-col gap-1 sm:col-span-2">
										<p class="text-xs font-medium text-muted-foreground">Name</p>
										<Input
											value={option.short_title}
											oninput={(event) => {
												const target = event.currentTarget as HTMLInputElement;
												updateLevelUpOption('foundation', index, (current) => ({
													...current,
													short_title: target.value
												}));
											}}
											placeholder="Level up option name"
										/>
									</div>
								</div>

								<div class="flex flex-col gap-1">
									<p class="text-xs font-medium text-muted-foreground">Description</p>
									<Textarea
										value={option.title}
										oninput={(event) => {
											const target = event.currentTarget as HTMLTextAreaElement;
											updateLevelUpOption('foundation', index, (current) => ({
												...current,
												title: target.value
											}));
										}}
										rows={2}
										placeholder="Level up option description"
									/>
								</div>

								<div class="flex items-center justify-between gap-2">
									{#if optionErrors.length > 0}
										<p class="text-xs text-destructive">{optionErrors.join(', ')}</p>
									{:else}
										<span></span>
									{/if}
									<Button
										type="button"
										size="sm"
										variant="link"
										class="text-destructive"
										onclick={() => removeLevelUpOption('foundation', index)}
									>
										Delete Level Up Option
									</Button>
								</div>
							</div>
						</Dropdown>
					{:else}
						<p class="text-xs italic text-muted-foreground">No level-up options added</p>
					{/each}
				</div>
			</div>
			<CardChoicesForm
				bind:options={
					() => $form.foundation_card.options, (value) => ($form.foundation_card.options = value)
				}
				path={['foundation_card', 'options']}
				{errorSummary}
			/>
			<FeaturesForm
				bind:features={$form.foundation_card.features}
				bind:choiceOptions={
					() => $form.foundation_card.options, (value) => ($form.foundation_card.options = value)
				}
				choiceSourceId={itemId}
				allowChoiceConditions={true}
				allowExperienceTargets={true}
				allowUsage
				allowAddRemove
				featureLabel="Feature"
				path={['foundation_card', 'features']}
				{errorSummary}
			/>
		</Tabs.Content>

		<Tabs.Content value="specialization" class="flex flex-col gap-4">
			<label
				class="flex items-center gap-2 text-xs text-muted-foreground"
				for="subclass-specialization-tokens"
			>
				<Checkbox
					id="subclass-specialization-tokens"
					bind:checked={$form.specialization_card.tokens_enabled}
				/>
				Enable tokens on specialization card
			</label>
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between gap-2">
					<p class="text-xs font-medium text-muted-foreground">Level Up Options</p>

					<Button
						type="button"
						size="sm"
						variant="outline"
						onclick={() => addLevelUpOption('specialization')}
					>
						<Plus class="size-3.5" />
						Add Level Up Option
					</Button>
				</div>

				<div class="flex flex-col gap-2">
					{#each $form.specialization_card.level_up_options ?? [] as option, index (index)}
						{@const optionErrors = levelUpOptionMessages('specialization', index)}
						<Dropdown
							title={getLevelUpOptionLabel(option)}
							class={levelUpOptionHasErrors('specialization', index)
								? 'data-[open=false]:border data-[open=false]:border-destructive'
								: ''}
						>
							<div class="flex flex-col gap-4">
								<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<div class="flex flex-col gap-1">
										<p class="text-xs font-medium text-muted-foreground">Type</p>
										<Select.Root
											type="single"
											value={option.type}
											onValueChange={() => {
												updateLevelUpOption('specialization', index, (current) => ({
													...current,
													type: 'domain_card'
												}));
											}}
										>
											<Select.Trigger class="w-full">
												<p class="truncate">Extra Domain Cards</p>
											</Select.Trigger>
											<Select.Content>
												<Select.Item value="domain_card">Extra Domain Cards</Select.Item>
											</Select.Content>
										</Select.Root>
									</div>

									<div class="flex flex-col gap-1">
										<p class="text-xs font-medium text-muted-foreground">Max</p>
										<Input
											type="number"
											min="1"
											value={String(option.max)}
											oninput={(event) => {
												const target = event.currentTarget as HTMLInputElement;
												updateLevelUpOption('specialization', index, (current) => ({
													...current,
													max: Math.max(1, Number.parseInt(target.value || '1', 10) || 1)
												}));
											}}
										/>
									</div>

									<div class="flex flex-col gap-1 sm:col-span-2">
										<p class="text-xs font-medium text-muted-foreground">Name</p>
										<Input
											value={option.short_title}
											oninput={(event) => {
												const target = event.currentTarget as HTMLInputElement;
												updateLevelUpOption('specialization', index, (current) => ({
													...current,
													short_title: target.value
												}));
											}}
											placeholder="Level up option name"
										/>
									</div>
								</div>

								<div class="flex flex-col gap-1">
									<p class="text-xs font-medium text-muted-foreground">Description</p>
									<Textarea
										value={option.title}
										oninput={(event) => {
											const target = event.currentTarget as HTMLTextAreaElement;
											updateLevelUpOption('specialization', index, (current) => ({
												...current,
												title: target.value
											}));
										}}
										rows={2}
										placeholder="Level up option description"
									/>
								</div>

								<div class="flex items-center justify-between gap-2">
									{#if optionErrors.length > 0}
										<p class="text-xs text-destructive">{optionErrors.join(', ')}</p>
									{:else}
										<span></span>
									{/if}
									<Button
										type="button"
										size="sm"
										variant="link"
										class="text-destructive"
										onclick={() => removeLevelUpOption('specialization', index)}
									>
										Delete Level Up Option
									</Button>
								</div>
							</div>
						</Dropdown>
					{:else}
						<p class="text-xs italic text-muted-foreground">No level-up options added</p>
					{/each}
				</div>
			</div>
			<CardChoicesForm
				bind:options={
					() => $form.specialization_card.options,
					(value) => ($form.specialization_card.options = value)
				}
				path={['specialization_card', 'options']}
				{errorSummary}
			/>
			<FeaturesForm
				bind:features={$form.specialization_card.features}
				bind:choiceOptions={
					() => $form.specialization_card.options,
					(value) => ($form.specialization_card.options = value)
				}
				choiceSourceId={itemId}
				allowChoiceConditions={true}
				allowExperienceTargets={true}
				allowUsage
				allowAddRemove
				featureLabel="Feature"
				path={['specialization_card', 'features']}
				{errorSummary}
			/>
		</Tabs.Content>

		<Tabs.Content value="mastery" class="flex flex-col gap-4">
			<label
				class="flex items-center gap-2 text-xs text-muted-foreground"
				for="subclass-mastery-tokens"
			>
				<Checkbox id="subclass-mastery-tokens" bind:checked={$form.mastery_card.tokens_enabled} />
				Enable tokens on mastery card
			</label>
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between gap-2">
					<p class="text-xs font-medium text-muted-foreground">Level Up Options</p>

					<Button
						type="button"
						size="sm"
						variant="outline"
						onclick={() => addLevelUpOption('mastery')}
					>
						<Plus class="size-3.5" />
						Add Level Up Option
					</Button>
				</div>

				<div class="flex flex-col gap-2">
					{#each $form.mastery_card.level_up_options ?? [] as option, index (index)}
						{@const optionErrors = levelUpOptionMessages('mastery', index)}
						<Dropdown
							title={getLevelUpOptionLabel(option)}
							class={levelUpOptionHasErrors('mastery', index)
								? 'data-[open=false]:border data-[open=false]:border-destructive'
								: ''}
						>
							<div class="flex flex-col gap-4">
								<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<div class="flex flex-col gap-1">
										<p class="text-xs font-medium text-muted-foreground">Type</p>
										<Select.Root
											type="single"
											value={option.type}
											onValueChange={() => {
												updateLevelUpOption('mastery', index, (current) => ({
													...current,
													type: 'domain_card'
												}));
											}}
										>
											<Select.Trigger class="w-full">
												<p class="truncate">Extra Domain Cards</p>
											</Select.Trigger>
											<Select.Content>
												<Select.Item value="domain_card">Extra Domain Cards</Select.Item>
											</Select.Content>
										</Select.Root>
									</div>

									<div class="flex flex-col gap-1">
										<p class="text-xs font-medium text-muted-foreground">Max</p>
										<Input
											type="number"
											min="1"
											value={String(option.max)}
											oninput={(event) => {
												const target = event.currentTarget as HTMLInputElement;
												updateLevelUpOption('mastery', index, (current) => ({
													...current,
													max: Math.max(1, Number.parseInt(target.value || '1', 10) || 1)
												}));
											}}
										/>
									</div>

									<div class="flex flex-col gap-1 sm:col-span-2">
										<p class="text-xs font-medium text-muted-foreground">Name</p>
										<Input
											value={option.short_title}
											oninput={(event) => {
												const target = event.currentTarget as HTMLInputElement;
												updateLevelUpOption('mastery', index, (current) => ({
													...current,
													short_title: target.value
												}));
											}}
											placeholder="Level up option name"
										/>
									</div>
								</div>

								<div class="flex flex-col gap-1">
									<p class="text-xs font-medium text-muted-foreground">Description</p>
									<Textarea
										value={option.title}
										oninput={(event) => {
											const target = event.currentTarget as HTMLTextAreaElement;
											updateLevelUpOption('mastery', index, (current) => ({
												...current,
												title: target.value
											}));
										}}
										rows={2}
										placeholder="Level up option description"
									/>
								</div>

								<div class="flex items-center justify-between gap-2">
									{#if optionErrors.length > 0}
										<p class="text-xs text-destructive">{optionErrors.join(', ')}</p>
									{:else}
										<span></span>
									{/if}
									<Button
										type="button"
										size="sm"
										variant="link"
										class="text-destructive"
										onclick={() => removeLevelUpOption('mastery', index)}
									>
										Delete Level Up Option
									</Button>
								</div>
							</div>
						</Dropdown>
					{:else}
						<p class="text-xs italic text-muted-foreground">No level-up options added</p>
					{/each}
				</div>
			</div>
			<CardChoicesForm
				bind:options={
					() => $form.mastery_card.options, (value) => ($form.mastery_card.options = value)
				}
				path={['mastery_card', 'options']}
				{errorSummary}
			/>
			<FeaturesForm
				bind:features={$form.mastery_card.features}
				bind:choiceOptions={
					() => $form.mastery_card.options, (value) => ($form.mastery_card.options = value)
				}
				choiceSourceId={itemId}
				allowChoiceConditions={true}
				allowExperienceTargets={true}
				allowUsage
				allowAddRemove
				featureLabel="Feature"
				path={['mastery_card', 'features']}
				{errorSummary}
			/>
		</Tabs.Content>
	</Tabs.Root>

	{#if errorSummaryMessages.length > 0}
		<ul class="list-inside list-disc space-y-1 pt-2">
			{#each errorSummaryMessages as error}
				<li class="text-xs text-destructive">{error}</li>
			{/each}
		</ul>
	{/if}
</form>
