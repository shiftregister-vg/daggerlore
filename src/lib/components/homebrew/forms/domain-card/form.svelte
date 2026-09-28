<script lang="ts">
	import { DomainCardSchema, type DomainCard } from '@domain/schemas/compendium';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import * as Select from '$lib/components/ui/select';
	import UserImageUploader from '$lib/components/utility/user-image-uploader.svelte';
	import HomebrewBadge from '$lib/components/decorations/badges/homebrew-badge.svelte';
	import CardChoicesForm from '../shared/card-choices/form.svelte';
	import FeaturesForm from '../shared/features/form.svelte';
	import { cn, merge_compendium_content } from '$lib/utils';
	import { getHomebrewContext } from '$lib/state/homebrew.svelte';
	import { getSourcesContext } from '$lib/state/sources.svelte';
	import { superForm, intProxy, stringProxy } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { get } from 'svelte/store';
	import { tick } from 'svelte';
	import { summarizeSuperformErrors } from '$lib/components/homebrew/forms/helpers';
	import { domainCardFormDataToItem, domainCardToFormData, normalizeDomainCard } from './normalize';
	import { summarizeDomainCardFormErrors } from './errors';

	let {
		itemId,
		formId,
		item = $bindable(),
		hasChanges = $bindable(false),
		hasErrors = $bindable(false),
		unsavedItem = $bindable<DomainCard | null>(null),
		saving = $bindable(false),
		onSaveSuccess,
		onSaveError
	}: {
		itemId: string;
		formId: string;
		item: DomainCard;
		hasChanges?: boolean;
		hasErrors?: boolean;
		unsavedItem?: DomainCard | null;
		saving?: boolean;
		onSaveSuccess?: () => void;
		onSaveError?: () => void;
	} = $props();

	const homebrew = getHomebrewContext();
	const sources = getSourcesContext();

	const fullCompendium = $derived(
		merge_compendium_content(sources.compendium, homebrew.compendium ?? merge_compendium_content())
	);
	const domainIds = $derived(Object.keys(fullCompendium.domains));
	const categoryOptions = ['ability', 'spell', 'grimoire'] as const;

	let imageInput: {
		upload: () => Promise<void>;
		clear: () => Promise<void>;
	} | null = $state(null);

	let hasPendingImageFile = $state(false);
	let uploadedImageUrl: string | undefined = $state(undefined);
	let imagePreviewUrl = $state(item.image_url ?? '');
	let lastSavedImageUrl: string | null = $state(null);

	const domainCardForm = superForm<DomainCard>(domainCardToFormData(item), {
		SPA: true,
		dataType: 'json',
		validators: zod4Client(DomainCardSchema),
		async onUpdate({ form: validatedForm }) {
			if (!validatedForm.valid) return;
			await saveDomainCard();
		},
		resetForm: false,
		taintedMessage: false
	});

	const { form, errors, allErrors, tainted, enhance } = domainCardForm;
	const domainId = stringProxy(domainCardForm, 'domain_id', { empty: 'undefined' });
	const levelRequirement = intProxy(domainCardForm, 'level_requirement', { empty: 'zero' });
	const recallCost = intProxy(domainCardForm, 'recall_cost', { empty: 'zero' });

	function buildFormData(formData = get(form)): DomainCard {
		return domainCardFormDataToItem(formData);
	}

	const errorSummary = $derived(summarizeSuperformErrors($allErrors));
	const errorSummaryMessages = $derived(summarizeDomainCardFormErrors(errorSummary));
	const formHasChanges = $derived(Boolean($tainted) || hasPendingImageFile);
	const titleError = $derived($errors.title?.[0]);
	const domainIdError = $derived($errors.domain_id?.[0]);
	const levelRequirementError = $derived($errors.level_requirement?.[0]);
	const recallCostError = $derived($errors.recall_cost?.[0]);

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
		domainCardForm.reset({ data: domainCardToFormData(item) });
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

	async function saveDomainCard() {
		saving = true;
		try {
			if (hasPendingImageFile && imageInput) {
				await imageInput.upload();
			}
			const nextData = buildFormData(
				uploadedImageUrl ? { ...get(form), image_url: uploadedImageUrl } : undefined
			);

			const nextItem = normalizeDomainCard(nextData);
			await homebrew.updateItem({ type: 'domain_cards', id: itemId as never, item: nextItem });
			item = nextItem;
			domainCardForm.reset({ data: domainCardToFormData(nextItem) });
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
		domainCardForm.reset({ data: domainCardToFormData(item) });
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
			for="domain-card-name">Name</label
		>
		<Input
			id="domain-card-name"
			bind:value={$form.title}
			placeholder="Domain card name"
			aria-invalid={Boolean(titleError)}
		/>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="flex flex-col gap-1">
			<label
				class={cn('text-xs font-medium text-muted-foreground', domainIdError && 'text-destructive')}
				for="domain-card-domain">Domain</label
			>
			<Select.Root type="single" bind:value={$domainId}>
				<Select.Trigger
					id="domain-card-domain"
					class={cn('w-full', domainIdError && 'border-destructive')}
				>
					{#if $domainId}
						{@const domain = $domainId ? fullCompendium.domains[$domainId] : undefined}
						<div class="flex min-w-0 items-center gap-1.5">
							<p class="truncate">{domain?.title ?? $domainId}</p>
							{#if domain && domain.source_key === 'Homebrew'}
								<HomebrewBadge />
							{/if}
						</div>
					{:else}
						<p class="truncate">Select domain</p>
					{/if}
				</Select.Trigger>
				<Select.Content>
					{#each domainIds as domainId}
						{@const domain = domainId ? fullCompendium.domains[domainId] : undefined}
						<Select.Item value={domainId}>
							<div class="flex items-center gap-1.5">
								<span>{domain?.title ?? domainId}</span>
								{#if domain && domain.source_key === 'Homebrew'}
									<HomebrewBadge />
								{/if}
							</div>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="flex flex-col gap-1">
			<label class="text-xs font-medium text-muted-foreground" for="domain-card-category"
				>Category</label
			>
			<Select.Root type="single" bind:value={$form.category}>
				<Select.Trigger id="domain-card-category" class="w-full">
					<p class="truncate capitalize">{$form.category}</p>
				</Select.Trigger>
				<Select.Content>
					{#each categoryOptions as category}
						<Select.Item value={category} class="capitalize">{category}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="flex flex-col gap-1">
			<label
				class={cn(
					'text-xs font-medium text-muted-foreground',
					levelRequirementError && 'text-destructive'
				)}
				for="domain-card-level">Level Requirement</label
			>
			<Input
				id="domain-card-level"
				type="number"
				inputmode="numeric"
				bind:value={$levelRequirement}
				min="1"
				max="10"
				step="1"
				aria-invalid={Boolean(levelRequirementError)}
			/>
		</div>

		<div class="flex flex-col gap-1">
			<label
				class={cn(
					'text-xs font-medium text-muted-foreground',
					recallCostError && 'text-destructive'
				)}
				for="domain-card-recall-cost">Recall Cost</label
			>
			<Input
				id="domain-card-recall-cost"
				type="number"
				inputmode="numeric"
				bind:value={$recallCost}
				min="0"
				step="1"
				aria-invalid={Boolean(recallCostError)}
			/>
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
				alt="Domain card image"
				class="w-26"
			/>
		</div>

		<div class="flex grow flex-col gap-1">
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium text-muted-foreground" for="domain-card-artist"
					>Artist</label
				>
				<Input id="domain-card-artist" bind:value={$form.artist_name} placeholder="Name" />
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

	<div class="flex flex-col gap-2">
		<label class="flex items-center gap-2 text-xs text-muted-foreground" for="domain-card-tokens">
			<Checkbox id="domain-card-tokens" bind:checked={$form.tokens_enabled} />
			Enable tokens
		</label>
		<label
			class="flex items-center gap-2 text-xs text-muted-foreground"
			for="domain-card-applies-in-vault"
		>
			<Checkbox id="domain-card-applies-in-vault" bind:checked={$form.applies_in_vault} />
			Apply while in vault
		</label>
		<label
			class="flex items-center gap-2 text-xs text-muted-foreground"
			for="domain-card-forced-in-loadout"
		>
			<Checkbox id="domain-card-forced-in-loadout" bind:checked={$form.forced_in_loadout} />
			Forced in loadout
		</label>
		<label
			class="flex items-center gap-2 text-xs text-muted-foreground"
			for="domain-card-forced-in-vault"
		>
			<Checkbox id="domain-card-forced-in-vault" bind:checked={$form.forced_in_vault} />
			Forced in vault
		</label>
	</div>

	<CardChoicesForm bind:options={$form.options} {errorSummary} />
	<FeaturesForm
		bind:features={$form.features}
		bind:choiceOptions={$form.options}
		choiceSourceId={itemId}
		allowChoiceConditions={true}
		allowExperienceTargets={true}
		allowUsage
		allowAddRemove
		featureLabel="Feature"
		{errorSummary}
	/>

	{#if errorSummaryMessages.length > 0}
		<ul class="list-inside list-disc space-y-1 pt-2">
			{#each errorSummaryMessages as error}
				<li class="text-xs text-destructive">{error}</li>
			{/each}
		</ul>
	{/if}
</form>
