<script lang="ts">
	import type { Character } from '@domain/schemas/characters';
	import Button from '$lib/components/ui/button/button.svelte';
	import ArmorSlots from '$lib/components/character-sheet/standalone/armor-slots.svelte';
	import DamageThresholds from '$lib/components/character-sheet/standalone/damage-thresholds.svelte';
	import Evasion from '$lib/components/character-sheet/standalone/evasion.svelte';
	import Hope from '$lib/components/character-sheet/standalone/hope.svelte';
	import Hp from '$lib/components/character-sheet/standalone/hp.svelte';
	import Stress from '$lib/components/character-sheet/standalone/stress.svelte';
	import ClassBanner from '$lib/components/decorations/class-banner.svelte';
	import CharacterPortrait from '$lib/components/character-sheet/standalone/character-portrait.svelte';
	import ConditionChip from '$lib/components/conditions/condition-chip.svelte';
	import type { CampaignRosterEntry } from '$lib/state/campaign.svelte';
	import { cn } from '$lib/utils';
	import Pencil from '@lucide/svelte/icons/pencil';
	import { toast } from 'svelte-sonner';
	import { patchApi } from '$lib/api/client';

	const SYNC_DEBOUNCE_MS = 200;

	function cloneCharacter(character: Character): Character {
		return JSON.parse(JSON.stringify(character));
	}

	let {
		character,
		class: className = ''
	}: {
		character: CampaignRosterEntry;
		class?: string;
	} = $props();

	let editableMarkedArmor = $state<number | null>(null);

	const serverCharacter = $derived(character.character);
	const summary = $derived(serverCharacter.derived_descriptors);
	const activeConditions = $derived(
		(serverCharacter.conditions ?? []).filter((condition) => condition.enabled)
	);

	let appliedServerMarkedArmor: number | undefined;
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	function clearPendingSync() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = undefined;
		}
	}

	$effect(() => {
		if (editableMarkedArmor === null) {
			editableMarkedArmor = serverCharacter.marked_armor;
			appliedServerMarkedArmor = serverCharacter.marked_armor;
			return;
		}

		if (!character.canEdit) {
			clearPendingSync();
			editableMarkedArmor = serverCharacter.marked_armor;
			appliedServerMarkedArmor = serverCharacter.marked_armor;
			return;
		}

		const hasUnsavedLocalChanges =
			appliedServerMarkedArmor !== undefined &&
			editableMarkedArmor !== appliedServerMarkedArmor &&
			editableMarkedArmor !== serverCharacter.marked_armor;

		if (hasUnsavedLocalChanges) return;

		if (serverCharacter.marked_armor !== appliedServerMarkedArmor) {
			appliedServerMarkedArmor = serverCharacter.marked_armor;
		}

		if (editableMarkedArmor !== serverCharacter.marked_armor) {
			editableMarkedArmor = serverCharacter.marked_armor;
		}
	});

	$effect(() => {
		if (editableMarkedArmor === null || !character.canEdit) {
			clearPendingSync();
			return;
		}

		clearPendingSync();

		if (editableMarkedArmor === serverCharacter.marked_armor) return;

		const capturedCharacter = cloneCharacter(serverCharacter);
		capturedCharacter.marked_armor = editableMarkedArmor;

		debounceTimer = setTimeout(() => {
			debounceTimer = undefined;
			patchApi<void>(`/characters/${character.characterId}`, capturedCharacter).catch((error) => {
					console.error('Failed to update character', error);
					toast.error('Failed to update character');
				});
		}, SYNC_DEBOUNCE_MS);

		return () => {
			clearPendingSync();
		};
	});
</script>

{#if serverCharacter}
	<div
		class={cn('flex min-w-[376px] flex-col rounded-lg border bg-background shadow-lg', className)}
	>
		<div class="mb-2 flex gap-4 px-2 pr-3">
			<div class="relative min-w-0 grow">
				<div
					class="mt-3 mb-2.5 flex h-9 max-w-[400px] min-w-0 items-center truncate overflow-hidden"
				>
					<a
						href={`/characters/${character.characterId}/class/`}
						class={cn(
							'group relative grid h-full min-w-[72px] place-items-center overflow-hidden rounded-l-full border-b border-accent/10 bg-accent/10 pr-3 pl-4 text-xs font-medium text-accent hover:bg-accent/20',
							!character.canEdit && 'pointer-events-none'
						)}
					>
						<span class="transition-transform duration-200 group-hover:-translate-y-[150%]">
							Level {serverCharacter.level}
						</span>
						<span
							class="absolute inset-0 grid translate-y-full place-items-center text-xs font-medium transition-transform duration-200 group-hover:translate-y-0"
						>
							Level up?
						</span>
					</a>
					<Button
						href={`/characters/${character.characterId}/edit/`}
						class={cn(
							'h-full justify-start gap-2 truncate rounded-l-none rounded-r-full border-0 border-b',
							!character.canEdit && 'pointer-events-none'
						)}
						variant="outline"
					>
						<p class="truncate text-left text-xs">
							{summary.primary_class_name || 'No class'}
							&ensp;&bull;&ensp;
							{summary.primary_subclass_name || 'No subclass'}
						</p>
						<div class="grow"></div>
						{#if character.canEdit}
							<Pencil class="mr-1 size-3 stroke-3" />
						{/if}
					</Button>
				</div>

				<div class="ml-1 flex min-w-0 gap-3">
					<div class="aspect-square h-[90px] w-[90px] shrink-0 overflow-hidden rounded-lg border-2">
						<CharacterPortrait
							src={serverCharacter.image_url || '/images/art/portrait-placeholder.webp'}
							alt={serverCharacter.name || 'Unnamed Character'}
							death_state={serverCharacter.death_state}
							class="h-full w-full rounded-md"
						/>
					</div>

					<div class="flex min-w-0 grow flex-col gap-1">
						<p class="truncate text-2xl font-bold">
							{serverCharacter.name || 'Unnamed Character'}
						</p>

						<div class="mt-1 flex flex-col gap-1">
							<p class="truncate text-xs text-muted-foreground">
								{summary.ancestry_name || 'No ancestry'}
							</p>
							<p class="truncate text-xs text-muted-foreground">
								{summary.community_name || 'No community'}
							</p>
						</div>
					</div>
				</div>
			</div>

			{#if summary.primary_class_banner}
				<ClassBanner banner={summary.primary_class_banner} class="shrink-0" />
			{/if}
		</div>

		{#if activeConditions.length > 0}
			<div class="mb-3 flex flex-wrap items-center justify-center gap-2 px-3">
				{#each activeConditions as condition}
					<ConditionChip {condition} />
				{/each}
			</div>
		{/if}

		<div class="mb-4 flex justify-center gap-4 px-2">
			<Evasion evasion={summary.evasion} />
			{#if editableMarkedArmor !== null}
				<ArmorSlots disabled max={summary.max_armor} bind:marked={editableMarkedArmor} />
			{/if}
		</div>

		<div class="mx-auto mb-4 w-[312px] max-w-[calc(100%-2rem)]">
			<DamageThresholds thresholds={summary.damage_thresholds} />
		</div>

		<div class="mb-4 flex flex-col items-center gap-4 px-3">
			<Hp disabled max={summary.max_hp} marked={serverCharacter.marked_hp} class="justify-center" />
			<Stress
				disabled
				max={summary.max_stress}
				marked={serverCharacter.marked_stress}
				class="justify-center"
			/>
			<Hope
				class="flex-row items-center gap-5"
				disabled
				max={summary.max_hope}
				marked={serverCharacter.marked_hope}
				scars={serverCharacter.scars}
			/>
		</div>

		<div class="flex gap-2 p-2">
			<Button
				variant="outline"
				size="sm"
				class="grow"
				href={`/characters/${character.characterId}/`}
			>
				View
			</Button>
			{#if character.canEdit}
				<Button
					variant="outline"
					class="grow"
					size="sm"
					href={`/characters/${character.characterId}/edit`}
				>
					Edit
				</Button>
			{/if}
		</div>
	</div>
{/if}
