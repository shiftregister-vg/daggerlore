<script lang="ts">
	import { CommunityCardSchema, type CommunityCard } from '@domain/schemas/compendium';
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
		communityCardFormDataToItem,
		communityCardToFormData,
		normalizeCommunityCard
	} from './normalize';
	import { summarizeCommunityCardFormErrors } from './errors';

	let {
		itemId,
		formId,
		item = $bindable(),
		hasChanges = $bindable(false),
		hasErrors = $bindable(false),
		unsavedItem = $bindable<CommunityCard | null>(null),
		saving = $bindable(false),
		onSaveSuccess,
		onSaveError
	}: {
		itemId: string;
		formId: string;
		item: CommunityCard;
		hasChanges?: boolean;
		hasErrors?: boolean;
		unsavedItem?: CommunityCard | null;
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

	const communityCardForm = superForm<CommunityCard>(communityCardToFormData(item), {
		SPA: true,
		dataType: 'json',
		validators: zod4Client(CommunityCardSchema),
		async onUpdate({ form: validatedForm }) {
			if (!validatedForm.valid) return;
			await saveCommunityCard();
		},
		resetForm: false,
		taintedMessage: false
	});

	const { form, errors, allErrors, tainted, enhance } = communityCardForm;

	function buildFormData(formData = get(form)): CommunityCard {
		return communityCardFormDataToItem(formData);
	}

	const errorSummary = $derived(summarizeSuperformErrors($allErrors));
	const errorSummaryMessages = $derived(summarizeCommunityCardFormErrors(errorSummary));
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
		communityCardForm.reset({ data: communityCardToFormData(item) });
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

	async function saveCommunityCard() {
		saving = true;
		try {
			if (hasPendingImageFile && imageInput) {
				await imageInput.upload();
			}
			const nextData = buildFormData(
				uploadedImageUrl ? { ...get(form), image_url: uploadedImageUrl } : undefined
			);

			const nextItem = normalizeCommunityCard(nextData);
			await homebrew.updateItem({ type: 'community_cards', id: itemId as never, item: nextItem });
			item = nextItem;
			communityCardForm.reset({ data: communityCardToFormData(nextItem) });
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
		communityCardForm.reset({ data: communityCardToFormData(item) });
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
			for="community-card-name">Name</label
		>
		<Input id="community-card-name" bind:value={$form.title} placeholder="Community card name" />
	</div>

	<div class="flex flex-col gap-1">
		<label class="text-xs font-medium text-muted-foreground" for="community-card-description"
			>Description</label
		>
		<Textarea
			id="community-card-description"
			bind:value={$form.description_html}
			placeholder="Community card description"
			rows={3}
		/>
	</div>

	<label class="flex items-center gap-2 text-xs text-muted-foreground" for="community-card-tokens">
		<Checkbox id="community-card-tokens" bind:checked={$form.tokens_enabled} />
		Enable tokens
	</label>

	<div class="rounded-md border border-border p-3">
		{#if $form.field_group}
			<div class="flex items-end gap-3">
				<div class="flex grow flex-col gap-1">
					<label
						class="text-xs font-medium text-muted-foreground"
						for="community-card-field-group-name">Character field group</label
					>
					<Input
						id="community-card-field-group-name"
						bind:value={$form.field_group.name}
						placeholder="Sayings or Values"
					/>
				</div>
				<div class="flex w-24 flex-col gap-1">
					<label class="text-xs font-medium text-muted-foreground" for="community-card-field-count"
						>Fields</label
					>
					<Input
						id="community-card-field-count"
						type="number"
						min="1"
						max="6"
						bind:value={$form.field_group.count}
					/>
				</div>
				<Button type="button" variant="ghost" onclick={() => ($form.field_group = undefined)}>
					Remove
				</Button>
			</div>
			<p class="mt-2 text-xs text-muted-foreground">
				Players can fill in these fields on their character's community card.
			</p>
		{:else}
			<Button
				type="button"
				variant="outline"
				onclick={() => ($form.field_group = { name: '', count: 1 })}
			>
				Add character fields
			</Button>
		{/if}
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
				alt="Community card image"
				class="w-26"
			/>
		</div>
		<div class="flex grow flex-col gap-1">
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium text-muted-foreground" for="community-card-artist"
					>Artist</label
				>
				<Input id="community-card-artist" bind:value={$form.artist_name} placeholder="Name" />
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
	<FeaturesForm
		bind:features={$form.features}
		bind:choiceOptions={$form.options}
		choiceSourceId={itemId}
		allowChoiceConditions={true}
		allowExperienceTargets={true}
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
