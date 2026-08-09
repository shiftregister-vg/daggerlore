<script lang="ts">
	import { CHARACTER_SHEET_BACKGROUNDS, THEMES } from '$lib/constants/themes';
	import type { SheetBackground, Theme } from '$lib/schemas/themes';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import Dropdown from '$lib/components/utility/dropdown.svelte';
	import ImageUploader from '$lib/components/utility/user-image-uploader.svelte';
	import ReviveButton from '$lib/components/character-sheet/standalone/revive-button.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { cn } from '$lib/utils';
	import Download from '@lucide/svelte/icons/download';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Settings from '@lucide/svelte/icons/settings';
	import Flame from '@lucide/svelte/icons/flame';
	import Sword from '@lucide/svelte/icons/sword';
	import Activity from '@lucide/svelte/icons/activity';
	import Sprout from '@lucide/svelte/icons/sprout';
	import { exportOfficialCharacterSheetPdf } from '$lib/pdf/character-sheet-export';
	import { toast } from 'svelte-sonner';

	let { onRevive }: { onRevive?: () => void } = $props();

	const characterCtx = getCharacterContext();
	const character_id = $derived(characterCtx.id);
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);
	let imageUploader = $state<{ clear: () => Promise<void> } | null>(null);

	const canEdit = $derived(characterCtx.canEdit);
	const themeEntries = Object.entries(THEMES) as Array<[string, Theme]>;
	const backgroundEntries = Object.entries(CHARACTER_SHEET_BACKGROUNDS) as Array<
		[string, SheetBackground]
	>;
	const textSizeOptions = [
		{
			value: 'normal',
			title: 'Normal',
			description: 'Default text sizing for the character sheet.'
		},
		{
			value: 'large',
			title: 'Large',
			description: 'Increases sheet body text for easier reading.'
		},
		{
			value: 'extra_large',
			title: 'Extra Large',
			description: 'Largest sheet body text for higher readability.'
		}
	] as const;
	type SheetTextSize = (typeof textSizeOptions)[number]['value'];
	let isExportingPdf = $state(false);

	async function downloadOfficialPdf() {
		if (!character || !derived_character_data || isExportingPdf) return;

		isExportingPdf = true;
		try {
			await exportOfficialCharacterSheetPdf({
				character,
				derived: derived_character_data
			});
		} catch (error) {
			console.error('Failed to export PDF', error);
			toast.error('Failed to export PDF');
		} finally {
			isExportingPdf = false;
		}
	}

	function setSheetAppearance(next: {
		theme_id?: string;
		background_id?: string;
		text_size?: SheetTextSize;
	}) {
		if (!character) return;

		const sheet_appearance = Object.fromEntries(
			Object.entries(next).filter(([, value]) => Boolean(value) && value !== 'normal')
		);

		character.sheet_appearance = Object.keys(sheet_appearance).length ? sheet_appearance : undefined;
	}

	function setTheme(themeId?: string) {
		setSheetAppearance({
			...character?.sheet_appearance,
			theme_id: themeId
		});
	}

	function getThemePreviewStyle(theme: Theme) {
		return [
			`--background: ${theme.background}`,
			`--foreground: ${theme.foreground}`,
			`--card: ${theme.card}`,
			`--card-foreground: ${theme.card_foreground}`,
			`--primary: ${theme.primary}`,
			`--primary-foreground: ${theme.primary_foreground}`,
			`--primary-muted: ${theme.primary_muted}`,
			`--secondary: ${theme.secondary}`,
			`--secondary-foreground: ${theme.secondary_foreground}`,
			`--muted: ${theme.muted}`,
			`--muted-foreground: ${theme.muted_foreground}`,
			`--accent: ${theme.accent}`,
			`--accent-foreground: ${theme.accent_foreground}`,
			`--accent-muted: ${theme.accent_muted}`,
			`--destructive: ${theme.destructive}`,
			`--destructive-foreground: ${theme.destructive_foreground}`,
			`--border: ${theme.primary_muted}`
		].join('; ');
	}

	function getThemeBadgeLabel(title: string) {
		return title.toUpperCase();
	}

	function getSelectedThemeTitle() {
		if (!character?.sheet_appearance?.theme_id) return 'Default';
		return (
			themeEntries.find(([id]) => id === character.sheet_appearance?.theme_id)?.[1].title ??
			character.sheet_appearance.theme_id
		);
	}

	function setTextSize(textSize: SheetTextSize) {
		setSheetAppearance({
			...character?.sheet_appearance,
			text_size: textSize
		});
	}

	function getSelectedTextSize() {
		return character?.sheet_appearance?.text_size ?? 'normal';
	}

	function getSelectedTextSizeTitle() {
		const selectedTextSize = getSelectedTextSize();
		return (
			textSizeOptions.find((option) => option.value === selectedTextSize)?.title ?? selectedTextSize
		);
	}

	function setBackground(backgroundId?: string) {
		setSheetAppearance({
			...character?.sheet_appearance,
			background_id: backgroundId
		});
	}

	function getSelectedBackgroundTitle() {
		if (!character?.sheet_appearance?.background_id) return 'None';
		return (
			backgroundEntries.find(([id]) => id === character.sheet_appearance?.background_id)?.[1]
				.title ?? character.sheet_appearance.background_id
		);
	}
</script>

{#if character && characterCtx.canEdit}
	<Sheet.Header>
		<Sheet.Title>Customize Your Character Sheet</Sheet.Title>
	</Sheet.Header>

	<div class="flex flex-col gap-8 overflow-y-auto px-4 pb-6">
		<section>
			<main class="mx-auto flex max-w-2xl gap-3">
				<ImageUploader
					bind:this={imageUploader}
					autoUpload
					onUpload={(url) => void characterCtx.updateImageUrl(url)}
					placeholderImage={character.image_url || '/images/art/portrait-placeholder.webp'}
					alt={character.name}
					class="h-[90px] w-[90px] shrink-0"
				/>
				<div class="flex flex-col gap-1">
					<p class="text-sm font-medium">Character Name</p>
					<Input bind:value={character.name} class="w-[240px]" />
					<Button
						variant="link"
						size="sm"
						disabled={!character.image_url}
						class="h-6.5 w-min px-0 font-normal text-muted-foreground"
						onclick={async () => {
							if (!character) return;
							await imageUploader?.clear();
							await characterCtx.updateImageUrl('');
						}}
					>
						Remove image
					</Button>
				</div>
			</main>
		</section>

		{#if character.death_state?.is_dead}
			<div class=" relative rounded-lg bg-card/50 p-3 pr-4">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="flex items-center gap-1 text-sm font-medium">
							{#if character.death_state?.death_move === 'blaze_of_glory'}
								<Flame class="-mt-0.5 inline size-3.5 fill-current" />
							{:else if character.death_state?.death_move === 'risk_it_all'}
								<Sword class="inline size-3.5 fill-current" />
							{:else if character.death_state?.death_move === 'avoid_death'}
								<Activity class="inline size-3.5" />
							{/if}
							Dead
						</p>
						<p class="text-xs text-muted-foreground">
							{character.name}
							{#if character.death_state?.death_move === 'blaze_of_glory'}
								died in a blaze of glory
							{:else if character.death_state?.death_move === 'risk_it_all'}
								died risking it all
							{:else if character.death_state?.death_move === 'avoid_death'}
								died trying to avoid death
							{/if}
						</p>
					</div>
					{#if canEdit}
						<ReviveButton onAfterRevive={onRevive}><Sprout />Revive</ReviveButton>
					{/if}
				</div>
			</div>
		{/if}

		<div class="-mt-2 flex flex-wrap items-center justify-between gap-2">
			<Button href={`/characters/${character_id}/edit/`} class="w-min">
				<Settings /> Manage Character
			</Button>
			<Button
				variant="link"
				onclick={downloadOfficialPdf}
				disabled={isExportingPdf || !derived_character_data}
				class="w-min"
				title="Download official PDF"
			>
				{#if isExportingPdf}
					<Loader2 class="size-4 animate-spin" />
					Exporting
				{:else}
					<Download class="size-4" />
					Download PDF
				{/if}
			</Button>
		</div>

		<section class="flex flex-col gap-4">
			<Dropdown title="Readability" subtitle={`Text size: ${getSelectedTextSizeTitle()}`} class="border">
				<div class="grid gap-2">
					{#each textSizeOptions as option}
						<button
							type="button"
							class={cn(
								'flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-left ring-primary transition-colors hover:border-primary hover:ring-2',
								getSelectedTextSize() === option.value
									? 'border-primary bg-primary-muted/50 ring-2'
									: 'border-border'
							)}
							onclick={() => setTextSize(option.value)}
						>
							<div>
								<p class="text-sm font-semibold">{option.title}</p>
								<p class="text-xs text-muted-foreground">{option.description}</p>
							</div>
							<p
								class={cn(
									'rounded border border-border bg-card px-2 py-1 font-medium text-card-foreground',
									option.value === 'normal' && 'text-xs',
									option.value === 'large' && 'text-sm',
									option.value === 'extra_large' && 'text-base'
								)}
							>
								Aa
							</p>
						</button>
					{/each}
				</div>
			</Dropdown>
		</section>

		<section class="flex flex-col gap-4">
			<Dropdown title="Theme" subtitle={getSelectedThemeTitle()} class="border">
				<div class="grid grid-cols-3 gap-3">
					{#each themeEntries as [themeId, theme]}
						<button
							type="button"
							class={cn(
								'flex aspect-square flex-col items-center justify-center gap-3 rounded-lg border bg-background px-3 py-2 text-center ring-primary hover:border-primary hover:ring-2',
								character.sheet_appearance?.theme_id === themeId
									? 'bg-primary-muted/50 ring-2'
									: 'border-border'
							)}
							style={getThemePreviewStyle(theme)}
							onclick={() => setTheme(themeId)}
						>
							<div class="flex flex-1 items-center justify-center">
								<div class="relative">
									<svg
										class="size-20 text-primary"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 51.575 55.426"
									>
										<g transform="matrix(1, 0, 0, 1, -109.896004, -123.573997)">
											<path
												d="M 117.388 139.531 L 153.979 139.531 C 154.719 140.485 155.133 141.02 155.872 141.974 L 160.813 148.699 L 157.839 160.777 C 157.099 161.731 153.736 162.266 152.996 163.22 L 118.371 163.22 C 117.631 162.266 114.268 161.731 113.528 160.777 L 110.554 148.699 L 115.494 141.974 C 116.234 141.02 116.648 140.485 117.388 139.531"
												fill="currentColor"
												style="stroke-width: 0.1;"
											/>
											<path
												d="M 133.306 177.296 L 128.501 174.973 C 121.995 170.85 117.036 163.728 115.187 155.894 L 111.594 140.698 L 123.222 124.325 L 123.748 124.812 C 126.907 127.637 131.104 129.196 135.559 129.196 C 140.014 129.196 144.21 127.637 147.374 124.807 L 147.896 124.327 L 159.523 140.698 L 155.929 155.894 C 154.079 163.729 149.12 170.85 142.664 174.946 L 137.801 177.3 L 135.532 178.441"
												fill="var(--background)"
												style="stroke-width: 0.1;"
											/>
											<path
												d="M 123.142 123.574 L 122.485 124.5 L 111.318 140.224 L 111.056 140.593 L 111.16 141.033 L 114.7 156.008 C 116.579 163.968 121.62 171.204 128.184 175.368 L 128.233 175.399 L 128.284 175.424 L 133.099 177.752 L 135.078 178.768 L 135.528 179 L 135.983 178.772 L 138.031 177.745 L 142.833 175.424 L 142.883 175.399 L 142.933 175.368 C 149.496 171.204 154.537 163.968 156.415 156.008 L 159.956 141.033 L 160.06 140.593 L 159.799 140.224 L 148.633 124.5 L 147.976 123.575 L 147.14 124.343 L 147.031 124.443 C 143.967 127.183 139.89 128.696 135.558 128.696 C 131.226 128.696 127.149 127.183 124.076 124.434 L 123.977 124.343 L 123.142 123.574 Z M 147.817 125.079 L 158.983 140.804 L 155.442 155.779 C 153.751 162.943 149.096 170.274 142.396 174.523 L 137.583 176.852 L 135.535 177.879 L 133.535 176.852 L 128.72 174.523 C 122.021 170.274 117.365 162.943 115.673 155.779 L 112.133 140.804 L 123.3 125.079 L 123.409 125.179 C 126.774 128.189 131.169 129.696 135.558 129.696 C 139.947 129.696 144.342 128.189 147.708 125.179"
												fill="currentColor"
												style="stroke-width: 0.1;"
											/>
											<path
												stroke-width="5"
												stroke-linecap="butt"
												stroke-miterlimit="10"
												stroke-linejoin="miter"
												fill="none"
												stroke="currentColor"
												d="M 130.24 171.131 C 124.149 167.268 119.956 161.585 118.433 155.128 L 115.186 141.399 L 123.906 129.12 C 126.365 131.95 132.719 133.197 132.719 133.197 L 135.613 131.621 L 138.643 133.164 C 138.643 133.164 144.719 131.668 147.212 129.123 L 155.929 141.399 L 152.684 155.127 C 151.16 161.585 146.968 167.268 140.879 171.131 L 135.558 174.509 L 130.24 171.131 Z"
												style="stroke-width: 0.5;"
											/>
											<path
												d="M 111.506 163 L 159.861 163 C 160.489 163.629 160.842 163.981 161.471 164.611 L 161.471 171.026 C 160.842 171.654 160.489 172.007 159.861 172.636 L 111.506 172.636 C 110.878 172.007 110.525 171.654 109.896 171.026 L 109.896 164.611 C 110.525 163.981 110.878 163.629 111.506 163"
												fill="currentColor"
												style="stroke-width: ;"
											/>
										</g>
									</svg>
									<p class="absolute top-5 left-1/2 -translate-x-1/2 text-2xl font-bold">
										{derived_character_data?.max_armor ?? 0}
									</p>
									<p
										class="absolute bottom-[10px] left-1/2 -translate-x-1/2 text-[11px] leading-none font-medium text-primary-foreground"
									>
										{getThemeBadgeLabel(theme.title)}
									</p>
								</div>
							</div>
						</button>
					{/each}
				</div>
			</Dropdown>
		</section>

		<section class="flex flex-col gap-4">
			<Dropdown title="Background" subtitle={getSelectedBackgroundTitle()} class="border">
				<div class="grid grid-cols-3 gap-3">
					<button
						type="button"
						class={cn(
							'flex aspect-square overflow-hidden rounded-lg border-2 border-dotted border-primary/50 bg-background text-left ring-primary hover:ring-2',
							!character.sheet_appearance?.background_id && 'ring-2'
						)}
						onclick={() => setBackground()}
					>
						<div
							class="flex size-full items-center justify-center rounded-[inherit] bg-primary-muted/50"
						>
							<p class="px-2 text-center text-xs font-medium text-muted-foreground">
								No Background
							</p>
						</div>
					</button>

					{#each backgroundEntries as [backgroundId, background]}
						<button
							type="button"
							class={cn(
								'group relative flex aspect-square overflow-hidden rounded-lg border bg-background text-left ring-primary hover:border-primary hover:ring-2',
								character.sheet_appearance?.background_id === backgroundId
									? 'border-primary bg-primary-muted/50 ring-2'
									: 'border-border'
							)}
							onclick={() => setBackground(backgroundId)}
						>
							<img
								src={background.preview_image_url}
								alt={background.title}
								width="180"
								height="180"
								class="block h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-105"
							/>
							<div
								class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent p-2"
							>
								<p class="truncate text-sm font-medium text-white">{background.title}</p>
							</div>
						</button>
					{/each}
				</div>
			</Dropdown>
		</section>
	</div>
{/if}
