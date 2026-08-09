<script lang="ts">
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { page } from '$app/state';
	import { cn, capitalize } from '$lib/utils';
	import Settings from '@lucide/svelte/icons/settings';
	import Button from '$lib/components/ui/button/button.svelte';
	import LoadError from '$lib/components/utility/load-error.svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { onMount } from 'svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { getUserContext } from '$lib/state/user.svelte';
	import { goto } from '$app/navigation';
	import Loader from '$lib/components/utility/loader.svelte';
	import ImageUploader from '$lib/components/utility/user-image-uploader.svelte';

	let { children } = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const characterId = $derived(page.params.id);
	const canEdit = $derived(characterCtx.canEdit);
	const userCtx = getUserContext();
	const loadError = $derived(characterCtx.error ?? userCtx.error);
	const checkingPermission = $derived(character ? false : characterCtx.isLoading);
	let imageUploader = $state<{ clear: () => Promise<void> } | null>(null);

	async function removeImage() {
		if (!character) return;
		await imageUploader?.clear();
		await characterCtx.updateImageUrl('');
	}

	$effect(() => {
		if (loadError) {
			console.error('Error loading character editor page', loadError);
		}
	});

	// Check both user loading and character context loading
	const isLoading = $derived(userCtx.isLoading || characterCtx.isLoading);

	// Redirect if character is loaded and user can't edit
	$effect(() => {
		if (canEdit === false && character && characterId) {
			goto(`/characters/${characterId}/`);
		}
	});

	const tabs = ['edit', 'heritage', 'class', 'traits', 'experiences', 'equipment'];
	let activeTab = $derived(
		page.url.pathname
			.split('/')
			.filter((t) => !!t)
			.pop() || 'edit'
	);

	function scrollToActiveTab(instant?: boolean) {
		const el = document.getElementById(activeTab);
		el?.scrollIntoView({
			behavior: instant ? 'instant' : 'smooth',
			inline: 'center',
			block: 'end'
		});
	}

	onMount(() => {
		scrollToActiveTab(true);
		// window.addEventListener("resize", scrollToActiveTab);

		// return () => {
		//   window.removeEventListener("resize", scrollToActiveTab);
		// };
	});
</script>

<div class="relative min-h-[calc(100dvh-var(--navbar-height,3.5rem))]">
	<Loader isLoading={isLoading || checkingPermission} />

	{#if isLoading || checkingPermission}
		<div></div>
	{:else if loadError || !character}
		<LoadError />
	{:else if !canEdit}
		<div class="flex flex-col items-center justify-center gap-4 px-4 py-12">
			<p class="text-sm text-muted-foreground italic">
				You do not have permission to edit this character
			</p>
			<Button href={`/characters/${characterId}/`}>View Character</Button>
		</div>
	{:else}
		<!-- tabs -->
		<div
			class={cn(
				//"pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]",
				'@container grid grid-cols-[1fr_repeat(7,auto)_1fr] items-center',
				'snap-x snap-mandatory overflow-x-auto ',
				'mt-3 h-20'
			)}
			style="scrollbar-width: none;"
		>
			<div class="h-12 w-[50vw] shrink-0 snap-align-none border-y bg-card @3xl:w-0"></div>

			{#each tabs as tab, i}
				<Button
					id={tab}
					variant="ghost"
					class={cn(
						'focus-visible:ring-foreground',
						'h-12 border-y bg-card hover:bg-card',
						'relative snap-center rounded-none pr-3 pl-6.5 font-normal shadow-none transition-colors duration-100 hover:text-foreground',
						activeTab === tab &&
							'border-accent/10 bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent',
						i === 0 && '@3xl:rounded-l-full'
					)}
					onclick={() =>
						goto(`/characters/${characterCtx.id}/${tab}/`).then(() => scrollToActiveTab())}
				>
					{#if i === 0}
						<Settings class="size-4" />
						Home
					{:else}
						{i}. {capitalize(tab)}
					{/if}

					<span
						class={cn(
							'transition-discreet absolute left-0 transition-all duration-100 ',
							'size-0 border-y-24 border-l-12 border-y-transparent border-l-card',
							i === 0 && '@3xl:hidden'
						)}
					></span>
					<span
						style="z-index: {tabs.length - i}"
						class={cn(
							'absolute right-0 translate-x-full transition-colors duration-100',
							'size-0 border-y-24 border-l-12 border-y-transparent border-l-card',
							activeTab === tab && 'border-l-accent-muted'
						)}
					></span>
				</Button>
			{/each}

			<Button
				href={`/characters/${characterCtx.id}/`}
				variant="link"
				class="h-12 snap-center border-y bg-card pr-7 pl-7 font-normal focus-visible:ring-foreground @3xl:rounded-r-full"
			>
				Sheet
				<ExternalLink class="size-4" />
			</Button>

			<div class="h-12 w-[50vw] shrink-0 snap-align-none border-y bg-card @3xl:w-0"></div>
		</div>

		<!-- page -->
		<div class="@container">
			<div
				class="m-3 mx-auto max-w-3xl items-center gap-4 @3xl:grid @3xl:grid-cols-[auto_1fr_auto]"
			>
				<Button
					disabled={tabs.indexOf(activeTab) === 0}
					href={`/characters/${characterCtx.id}/${tabs[tabs.indexOf(activeTab) - 1]}`}
					variant="ghost"
					class="hidden size-12 justify-self-center rounded-full border-b-0 border-accent/10 bg-accent/10 p-0 text-accent hover:bg-accent/20 @3xl:flex @3xl:border-b"
				>
					<ChevronLeft class="-ml-[1px] size-6" />
				</Button>

				<!-- image and name -->
				<main class="mx-auto flex max-w-2xl gap-3 px-4 @3xl:mx-0 @3xl:px-0">
					<ImageUploader
						bind:this={imageUploader}
						autoUpload
						cropSquare
						hasImage={!!character.image_url}
						onUpload={(url) => void characterCtx.updateImageUrl(url)}
						placeholderImage={character.image_url || '/images/art/portrait-placeholder.webp'}
						alt={character.name}
						class="h-[90px] w-[90px] shrink-0"
					/>
					<div class="mt- flex flex-col gap-1">
						<p class="text-sm font-medium">Character Name</p>
						<Input bind:value={character.name} class="w-[240px]" />
						<Button
							variant="link"
							size="sm"
							disabled={!character.image_url}
							class="h-6.5 w-min px-0 font-normal text-muted-foreground"
							onclick={removeImage}
						>
							Remove image
						</Button>
					</div>
				</main>

				{#if tabs.indexOf(activeTab) < tabs.length - 1}
					<Button
						href={`/characters/${characterCtx.id}/${tabs[tabs.indexOf(activeTab) + 1]}`}
						variant="ghost"
						class="hidden size-12 justify-self-center rounded-full border-b border-accent/10 bg-accent/10 p-0 text-accent hover:bg-accent/20 @3xl:flex"
					>
						<ChevronRight class="-mr-[1px] size-6" />
					</Button>
				{:else}
					<Button
						href={`/characters/${characterCtx.id}/`}
						variant="ghost"
						class={cn(
							'hidden size-12 justify-self-center rounded-full border-b border-accent/10 bg-accent/10 p-0 text-accent hover:bg-accent/20 @3xl:flex'
						)}
					>
						<ExternalLink class="-mr-[1px] size-4" />
					</Button>
				{/if}
			</div>
		</div>

		{@render children?.()}

		<div class="h-20"></div>

		<div
			class="fixed right-0 bottom-0 left-0 z-40 grid h-14 auto-cols-fr grid-flow-col border-t-1 border-accent/10 bg-card md:hidden"
		>
			{#if tabs[tabs.indexOf(activeTab) - 1]}
				<Button
					class="h-full rounded-none border-r capitalize "
					href={`/characters/${characterCtx.id}/${tabs[tabs.indexOf(activeTab) - 1]}`}
					variant="ghost"
				>
					<ChevronLeft class="size-4" />
					{tabs[tabs.indexOf(activeTab) - 1]}
				</Button>
			{/if}

			{#if tabs[tabs.indexOf(activeTab) + 1]}
				<Button
					class="h-full rounded-none border-l capitalize "
					href={`/characters/${characterCtx.id}/${tabs[tabs.indexOf(activeTab) + 1]}`}
					variant="ghost"
				>
					{tabs[tabs.indexOf(activeTab) + 1]}
					<ChevronRight class="size-4" />
				</Button>
			{:else}
				<Button
					class="h-full rounded-none border-t border-l capitalize"
					href={`/characters/${characterCtx.id}/`}
					variant="ghost"
				>
					Sheet
					<ExternalLink class="size-4" />
				</Button>
			{/if}
		</div>
	{/if}
</div>
