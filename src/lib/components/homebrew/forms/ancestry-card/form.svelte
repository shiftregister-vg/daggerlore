<script lang="ts">
	import { AncestryCardSchema, type AncestryCard } from '@domain/schemas/compendium';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import UserImageUploader from '$lib/components/utility/user-image-uploader.svelte';
	import CardChoicesForm from '../shared/card-choices/form.svelte';
	import FeaturesForm from '../shared/features/form.svelte';
	import { cn } from '$lib/utils';
	import { getHomebrewContext } from '$lib/state/homebrew.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { get } from 'svelte/store';
	import { tick } from 'svelte';
	import { summarizeSuperformErrors } from '$lib/components/homebrew/forms/helpers';
	import {
		ancestryCardFormDataToItem,
		ancestryCardToFormData,
		normalizeAncestryCard,
		pruneAncestryCardOptions
	} from './normalize';
	import { summarizeAncestryCardFormErrors } from './errors';

	let {
		itemId,
		formId,
		item = $bindable(),
		hasChanges = $bindable(false),
		hasErrors = $bindable(false),
		unsavedItem = $bindable<AncestryCard | null>(null),
		saving = $bindable(false),
		onSaveSuccess,
		onSaveError
	}: {
		itemId: string;
		formId: string;
		item: AncestryCard;
		hasChanges?: boolean;
		hasErrors?: boolean;
		unsavedItem?: AncestryCard | null;
		saving?: boolean;
		onSaveSuccess?: () => void;
		onSaveError?: () => void;
	} = $props();

	const homebrew = getHomebrewContext();
	let imageInput: {
		upload: () => Promise<void>;
		clear: () => Promise<void>;
	} | null = $state(null);
	let hasPendingImageFile = $state(false);
	let uploadedImageUrl: string | undefined = $state(undefined);
	let imagePreviewUrl = $state(item.image_url ?? '');
	let lastSavedImageUrl: string | null = $state(null);

	const ancestryCardForm = superForm<AncestryCard>(ancestryCardToFormData(item), {
		SPA: true,
		dataType: 'json',
		validators: zod4Client(AncestryCardSchema),
		async onUpdate({ form: validatedForm }) {
			if (!validatedForm.valid) return;
			await saveAncestryCard();
		},
		resetForm: false,
		taintedMessage: false
	});

	const { form, errors, allErrors, tainted, enhance } = ancestryCardForm;

	function buildFormData(formData = get(form)): AncestryCard {
		return ancestryCardFormDataToItem(formData);
	}

	const errorSummary = $derived(summarizeSuperformErrors($allErrors));
	const errorSummaryMessages = $derived(summarizeAncestryCardFormErrors(errorSummary));
	const formHasChanges = $derived(Boolean($tainted) || hasPendingImageFile);
	const titleError = $derived($errors.title?.[0]);

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
		ancestryCardForm.reset({ data: ancestryCardToFormData(item) });
		form.update((formData) => formData, { taint: 'untaint-all' });
		hasPendingImageFile = false;
		imagePreviewUrl = item.image_url ?? '';
		void imageInput?.clear();
	});

	$effect(() => {
		if ($form.is_mixed_ancestry && $form.features.length > 0) {
			form.update((formData) => ({ ...formData, features: [] }));
		}
	});

	$effect(() => {
		const nextOptions = pruneAncestryCardOptions(
			$form.options,
			$form.features,
			Boolean($form.is_mixed_ancestry)
		);
		if (nextOptions.length !== ($form.options ?? []).length) {
			form.update((formData) => ({ ...formData, options: nextOptions }));
		}
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

	async function saveAncestryCard() {
		saving = true;
		try {
			if (hasPendingImageFile && imageInput) {
				await imageInput.upload();
			}
			const nextData = buildFormData(
				uploadedImageUrl ? { ...get(form), image_url: uploadedImageUrl } : undefined
			);

			const nextItem = normalizeAncestryCard(nextData);
			await homebrew.updateItem({ type: 'ancestry_cards', id: itemId as never, item: nextItem });
			item = nextItem;
			ancestryCardForm.reset({ data: ancestryCardToFormData(nextItem) });
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
		ancestryCardForm.reset({ data: ancestryCardToFormData(item) });
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
			for="ancestry-card-name">Name</label
		>
		<Input id="ancestry-card-name" bind:value={$form.title} placeholder="Ancestry card name" />
	</div>

	<div class="flex flex-col gap-1">
		<label class="text-xs font-medium text-muted-foreground" for="ancestry-card-description"
			>Description</label
		>
		<Textarea
			id="ancestry-card-description"
			bind:value={$form.description_html}
			placeholder="Ancestry card description"
			rows={3}
		/>
	</div>

	<div class="flex flex-col gap-2">
		<label class="flex items-center gap-2 text-xs text-muted-foreground" for="ancestry-card-tokens">
			<Checkbox id="ancestry-card-tokens" bind:checked={$form.tokens_enabled} />
			Enable tokens
		</label>
		<label class="flex items-center gap-2 text-xs text-muted-foreground" for="ancestry-card-mixed">
			<Checkbox id="ancestry-card-mixed" bind:checked={$form.is_mixed_ancestry} />
			Mixed ancestry
		</label>
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
				alt="Ancestry card image"
				class="w-26"
			/>
		</div>
		<div class="flex grow flex-col gap-1">
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium text-muted-foreground" for="ancestry-card-artist"
					>Artist</label
				>
				<Input id="ancestry-card-artist" bind:value={$form.artist_name} placeholder="Name" />
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

	<CardChoicesForm bind:options={$form.options} {errorSummary} />
	{#if !$form.is_mixed_ancestry}
		<FeaturesForm
			bind:features={$form.features}
			bind:choiceOptions={$form.options}
			choiceSourceId={itemId}
			allowChoiceConditions={true}
			allowExperienceTargets={true}
			allowUsage
			{errorSummary}
		/>
	{/if}

	{#if errorSummaryMessages.length > 0}
		<ul class="list-inside list-disc space-y-1 pt-2">
			{#each errorSummaryMessages as error}
				<li class="text-xs text-destructive">{error}</li>
			{/each}
		</ul>
	{/if}
</form>
