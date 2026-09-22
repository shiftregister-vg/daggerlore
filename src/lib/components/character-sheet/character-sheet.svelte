<script lang="ts">
	import type { TraitId } from '@domain/schemas/rules';
	import { cn } from '$lib/utils';
	import { getCharacterContext } from '$lib/state/character.svelte';

	// character sheet components
	import CardTabletop from './cards/card-tabletop.svelte';
	import CharacterFeatures from './features/character-features.svelte';
	import HopeFeature from './features/hope-feature.svelte';
	import Slideover, { type SlideoverContent } from './slideover/slideover-sheet.svelte';

	// standalone ui componeents
	import ArmorSlots from './standalone/armor-slots.svelte';
	import DamageThresholds from './standalone/damage-thresholds.svelte';
	import Evasion from './standalone/evasion.svelte';
	import Hope from './standalone/hope.svelte';
	import Hp from './standalone/hp.svelte';
	import Stress from './standalone/stress.svelte';
	import Traits from './standalone/traits.svelte';

	// ui components & icons
	import ConditionChip from '$lib/components/conditions/condition-chip.svelte';
	import ClassBanner from '$lib/components/decorations/class-banner.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import CharacterPortrait from './standalone/character-portrait.svelte';
	import HeartCrack from '@lucide/svelte/icons/heart-crack';
	import Skull from '@lucide/svelte/icons/skull';
	import SimpleContainer from './embelishments/simple-container.svelte';
	import Experiences from './standalone/experiences.svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Sprout from '@lucide/svelte/icons/sprout';
	import ReviveButton from './standalone/revive-button.svelte';
	import TransformationStatus from './transformation-status.svelte';

	const isSmall = new MediaQuery('max-width: 639px');

	let sheetOpen = $state(false);
	let sheetContent = $state<SlideoverContent>(null);

	function openItemSheet(
		options:
			| {
					type: 'primary_weapon' | 'secondary_weapon' | 'armor' | 'consumable' | 'loot';
					inventory_id: string;
			  }
			| {
					type: 'unarmed_attack' | 'unarmored';
			  }
	) {
		sheetContent = options;
		sheetOpen = true;
	}

	function openAdventuringGearSheet() {
		sheetContent = { type: 'adventuring_gear' };
		sheetOpen = true;
	}

	function openExperienceSheet() {
		sheetContent = { type: 'experience' };
		sheetOpen = true;
	}

	function openCatalogSheet() {
		sheetContent = { type: 'catalog' };
		sheetOpen = true;
	}

	function openSheetCustomization() {
		if (!canEdit) return;

		sheetContent = { type: 'sheet-customization' };
		sheetOpen = true;
	}

	function openConditionsSheet() {
		sheetContent = { type: 'conditions' };
		sheetOpen = true;
	}

	function openDeathMoveSheet(isDead: boolean) {
		sheetContent = { type: 'death-move', isDead };
		sheetOpen = true;
	}

	function openDowntimeSheet() {
		sheetContent = { type: 'downtime' };
		sheetOpen = true;
	}

	function openScarsSheet() {
		sheetContent = { type: 'scars-content' };
		sheetOpen = true;
	}

	function openDomainCardCatalog() {
		sheetContent = { type: 'domain-card-catalog' };
		sheetOpen = true;
	}

	function openHeritageCardCatalog() {
		sheetContent = { type: 'heritage-card-catalog' };
		sheetOpen = true;
	}

	function openBeastformCatalog() {
		sheetContent = { type: 'beastform-catalog' };
		sheetOpen = true;
	}

	let { class: className = '' }: { class?: string } = $props();

	const characterCtx = getCharacterContext();
	const canEdit = $derived(characterCtx.canEdit);
	const character_id = $derived(characterCtx.id);
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);
	const compendium = $derived(characterCtx.character_compendium);
	const sheetTextSize = $derived(character?.sheet_appearance?.text_size ?? 'normal');
	const activeConditions = $derived(
		(character?.conditions ?? []).filter((condition) => condition.enabled)
	);

	const hasConditions = $derived(activeConditions.length > 0);

	function disableCondition(conditionName: string) {
		if (!character) return;

		character.conditions = (character.conditions ?? []).map((condition) =>
			condition.name === conditionName ? { ...condition, enabled: false } : condition
		);
	}

	const trait_highlights: Record<TraitId, boolean> = $derived.by(() => {
		const apply_beastform_bonus = character?.chosen_beastform?.apply_beastform_bonuses ?? false;
		const evolution_trait = character?.feature_choices['evolution_trait']?.[0];

		return {
			agility:
				apply_beastform_bonus &&
				(evolution_trait === 'agility' ||
					derived_character_data?.derived_beastform?.character_trait?.trait === 'agility'),
			strength:
				apply_beastform_bonus &&
				(evolution_trait === 'strength' ||
					derived_character_data?.derived_beastform?.character_trait?.trait === 'strength'),
			finesse:
				apply_beastform_bonus &&
				(evolution_trait === 'finesse' ||
					derived_character_data?.derived_beastform?.character_trait?.trait === 'finesse'),
			instinct:
				apply_beastform_bonus &&
				(evolution_trait === 'instinct' ||
					derived_character_data?.derived_beastform?.character_trait?.trait === 'instinct'),
			presence:
				apply_beastform_bonus &&
				(evolution_trait === 'presence' ||
					derived_character_data?.derived_beastform?.character_trait?.trait === 'presence'),
			knowledge:
				apply_beastform_bonus &&
				(evolution_trait === 'knowledge' ||
					derived_character_data?.derived_beastform?.character_trait?.trait === 'knowledge')
		};
	});

	const spellcast_trait_highlights: Partial<Record<TraitId, boolean>> = $derived.by(() => {
		const primary_spellcast_trait =
			derived_character_data?.primary_subclass?.spellcast_trait ??
			derived_character_data?.primary_class?.spellcast_trait;
		const secondary_spellcast_trait =
			derived_character_data?.secondary_subclass?.spellcast_trait ??
			derived_character_data?.secondary_class?.spellcast_trait;

		return {
			agility: primary_spellcast_trait === 'agility' || secondary_spellcast_trait === 'agility',
			strength: primary_spellcast_trait === 'strength' || secondary_spellcast_trait === 'strength',
			finesse: primary_spellcast_trait === 'finesse' || secondary_spellcast_trait === 'finesse',
			instinct: primary_spellcast_trait === 'instinct' || secondary_spellcast_trait === 'instinct',
			presence: primary_spellcast_trait === 'presence' || secondary_spellcast_trait === 'presence',
			knowledge: primary_spellcast_trait === 'knowledge' || secondary_spellcast_trait === 'knowledge'
		};
	});

	const evasion_highlighted = $derived(
		derived_character_data &&
			derived_character_data.derived_beastform &&
			derived_character_data.derived_beastform.evasion_bonus > 0 &&
			character?.chosen_beastform?.apply_beastform_bonuses
	);

	let experiencesHeight = $state(0);
</script>

{#if character_id && character && derived_character_data}
	<div
		class={cn(
			'character-sheet-text relative w-full overflow-hidden',
			`character-sheet-text-${sheetTextSize}`,
			className
		)}
	>
		<!-- character header -->
		<div class="border-b bg-background/70 shadow-lg">
			<div
				class={cn(
					'relative mx-auto flex max-w-6xl grow items-center gap-3 pt-3 pr-3 pb-3 pl-3 sm:gap-4 sm:pr-8 sm:pl-6',
					hasConditions && ''
				)}
			>
				<div class="relative flex grow gap-3 truncate pb-1">
					<!-- character image -->
					{#if canEdit}
						<button
							type="button"
							class="group relative h-[86px] w-[86px] shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-primary p-1 transition-colors hover:border-primary/70"
							onclick={openSheetCustomization}
							aria-label="Customize character sheet appearance"
						>
							<CharacterPortrait
								src={character.image_url || '/images/art/portrait-placeholder.webp'}
								alt="Character art"
								death_state={character.death_state}
								class="h-full w-full rounded-md"
							/>
						</button>
					{:else}
						<div class="h-[86px] w-[86px] shrink-0 overflow-hidden rounded-lg border-2 p-1">
							<CharacterPortrait
								src={character.image_url || '/images/art/portrait-placeholder.webp'}
								alt="Character art"
								death_state={character.death_state}
								class="h-full w-full rounded-md"
							/>
						</div>
					{/if}

					<!-- name and heritage -->
					<div class="flex grow flex-col gap-1.5 truncate">
						<div class="flex items-center gap-3">
							<p class="truncate text-2xl font-bold">
								{character.name}
							</p>

							<a
								href={`/characters/${character_id}/class/`}
								class={cn(
									'group relative hidden h-7 min-w-[72px] place-items-center overflow-hidden rounded-full border-b border-accent/10 bg-accent/10 px-3 text-xs font-medium text-accent hover:bg-accent/20 sm:grid',
									!canEdit && 'pointer-events-none'
								)}
							>
								<span class="transition-transform duration-200 group-hover:-translate-y-[150%]">
									Level {character.level}
								</span>
								<span
									class="absolute inset-0 grid translate-y-full place-items-center text-xs font-medium transition-transform duration-200 group-hover:translate-y-0"
								>
									Level up?
								</span>
							</a>
						</div>
						<p class="mt- truncate text-left text-xs text-muted-foreground">
							<span class="sm:hidden"
								>Lvl {character.level}
								&ensp;&middot;&ensp;</span
							>
							{derived_character_data.primary_class?.title || 'No class'}
							&ensp;&middot;&ensp;
							{derived_character_data.primary_subclass?.title || 'No subclass'}
						</p>
						<p class="truncate text-left text-xs text-muted-foreground">
							{derived_character_data.ancestry_card?.title || 'No ancestry'}
							&ensp;&middot;&ensp;
							{derived_character_data.community_card?.title || 'No community'}
						</p>
					</div>
				</div>

				<!-- downtime (Desktop) -->
				<div class="-mt-3 mr-2 hidden w-22 w-min flex-col items-end gap-2 md:flex">
					<Button size="sm" variant="outline" onclick={openDowntimeSheet} class="w-full">
						Downtime
					</Button>
					<Button variant="outline" size="sm" onclick={openConditionsSheet} class="w-full"
						>Conditions</Button
					>
				</div>

				<!-- class banner -->
				{#if derived_character_data.primary_class}
					<ClassBanner
						class="isolate z-11 -mt-[26px] -mb-8"
						{compendium}
						character_class={derived_character_data.primary_class}
					/>
				{/if}
			</div>
		</div>

		<!-- conditions -->
		<div
			class={cn(
				'mx-auto flex max-w-6xl flex-wrap items-center gap-2',
				'-translate-y-3.5 justify-center px-24 sm:px-28 md:justify-end md:px-32'
				// '-bottom-10 justify-center left-4 right-4'
			)}
		>
			{#each activeConditions as condition}
				<button
					disabled={!canEdit}
					class={cn(
						'group relative z-40 overflow-hidden rounded-full',
						!canEdit && 'cursor-default'
					)}
					onclick={() => disableCondition(condition.name)}
				>
					<ConditionChip {condition} class="hover:bg-primary/50" />
				</button>
			{/each}
		</div>

		<!-- downtime (mobile) -->
		<div
			class={cn(
				'flex items-center justify-center gap-6 md:hidden',
				hasConditions ? 'pt-1' : 'pt-7'
			)}
		>
			<Button variant="outline" onclick={openDowntimeSheet} class="w-min">Downtime</Button>
			<Button variant="outline" onclick={openConditionsSheet} class="w-min">Conditions</Button>
		</div>

		<TransformationStatus />

		<!-- layout grid -->
		<div
			class={cn(
				'layout-grid mx-auto grid max-w-6xl gap-4 pt-3 sm:max-w-[74rem] sm:px-4',
				hasConditions && 'md:-mt-6'
			)}
		>
			<!-- evasion -->
			<div
				style="grid-area: evasion"
				class={cn(
					'character-sheet-fixed-text flex flex-wrap items-center justify-center gap-x-10 gap-y-10 pt-6 pb-4 md:pb-6'
				)}
			>
				<div class="flex items-center justify-center gap-8">
					<Evasion evasion={derived_character_data.evasion} highlighted={evasion_highlighted} />
					<ArmorSlots
						disabled={!canEdit}
						max={derived_character_data.max_armor}
						bind:marked={character.marked_armor}
					/>
				</div>
				<DamageThresholds
					thresholds={derived_character_data.damage_thresholds}
					massive_damage={character.settings.massive_damage}
					class={cn(character.settings.massive_damage && 'mb-6')}
				/>
			</div>

			<!-- hp  -->
			<div
				style="grid-area: hp"
				class={cn(
					'character-sheet-fixed-text mx-6 mt-6 mb-8 flex flex-col items-center justify-evenly gap-x-8 gap-y-12 sm:flex-row sm:gap-y-10 md:mt-3 lg:mb-3'
				)}
			>
				<div class="relative">
					<Hp
						disabled={!canEdit || character.death_state?.is_dead}
						max={derived_character_data.max_hp}
						bind:marked={character.marked_hp}
						class={cn(' justify-start', character.death_state?.is_dead && 'opacity-50')}
					/>
					{#if derived_character_data.max_hp === character.marked_hp && !character.death_state?.is_dead}
						<Button
							onclick={() => openDeathMoveSheet(false)}
							size="sm"
							variant="ghost"
							class="absolute -bottom-9 left-1/2 -translate-x-1/2"
						>
							<Skull class="size-4" />
							Death move?
						</Button>
					{/if}
					{#if character.death_state?.is_dead}
						<ReviveButton
							size="sm"
							variant="ghost"
							class="absolute -bottom-9 left-1/2 -translate-x-1/2"
						>
							<Sprout class="size-4" />
							Revive
						</ReviveButton>
					{/if}
				</div>

				<div class="relative">
					<Stress
						max={derived_character_data.max_stress}
						bind:marked={character.marked_stress}
						disabled={!canEdit}
						class="justify-start"
					/>
					{#if derived_character_data.max_stress === character.marked_stress && canEdit}
						<Button
							onclick={() => {
								if (character.marked_hp < derived_character_data.max_hp) character.marked_hp++;
							}}
							size="sm"
							variant="ghost"
							class="absolute -bottom-9 left-1/2 -translate-x-1/2"
							disabled={character.marked_hp >= derived_character_data.max_hp}
						>
							<HeartCrack class="size-4" />
							Mark HP?
						</Button>
					{/if}
				</div>
			</div>

			<!-- traits -->
			<div style="grid-area: traits" class="character-sheet-fixed-text grow pt-4">
				<Traits
					traits={derived_character_data.traits}
					highlights={trait_highlights}
					spellcastTraits={spellcast_trait_highlights}
				/>
			</div>

			<!-- experiences -->
			<div
				style="grid-area: experiences"
				class="mx-auto w-full"
				bind:clientHeight={experiencesHeight}
			>
				<SimpleContainer hideSides={isSmall.current} class=" h-full">
					<div class="flex flex-col items-center gap-y-6 sm:flex-row min-[56rem]:flex-col">
						<div class="flex flex-1 flex-col gap-6">
							<Hope
								disabled={!canEdit}
								max={derived_character_data.max_hope}
								bind:marked={character.marked_hope}
								bind:scars={character.scars}
								onScarClick={canEdit ? openScarsSheet : undefined}
								class="mx-auto mt-2 flex-col gap-4"
							/>
							<HopeFeature />
						</div>

						<!-- experiences -->
						<div class="flex-1">
							<Experiences onExperienceClick={openExperienceSheet} />
						</div>
					</div>
				</SimpleContainer>
			</div>

			<!-- features -->
			<div style="grid-area: features">
				<SimpleContainer
					hideSides={isSmall.current}
					class={cn(
						'h-[420px] sm:h-[420px] min-[56rem]:h-[520px]',
						character.experiences.length >= 5
							? 'min-[56rem]:h-[490px] lg:h-[430px]'
							: 'min-[56rem]:h-[445px] lg:h-[420px]'
					)}
				>
					<CharacterFeatures
						onItemClick={openItemSheet}
						onAdventuringGearClick={openAdventuringGearSheet}
						onExperienceClick={openExperienceSheet}
						onAddItems={openCatalogSheet}
						onBeastformCatalogClick={openBeastformCatalog}
					/>
				</SimpleContainer>
			</div>
		</div>

		<!-- bottom section: cards -->
		<div class="flex flex-col gap-5 pt-5 pb-24 sm:px-4">
			<CardTabletop {openHeritageCardCatalog} {openDomainCardCatalog} />
		</div>
	</div>

	<!-- Item/Experience detail sheet -->
	<Slideover bind:open={sheetOpen} content={sheetContent} />
{/if}

<style>
	/* < medium */
	.layout-grid {
		grid-template-columns: 1fr;
		grid-template-areas:
			'traits'
			'evasion'
			'hp'
			'experiences'
			'features';
	}

	/* medium > large */
	@media (width >= 56rem) {
		.layout-grid {
			grid-template-columns: 384px auto;
			grid-template-areas:
				'traits traits'
				'evasion evasion'
				'hp hp'
				'experiences features';
		}
	}

	/* large */
	@media (width >= 64rem) {
		.layout-grid {
			grid-template-columns: 394px auto;
			grid-template-areas:
				'evasion traits'
				'evasion hp'
				'experiences hp'
				'experiences features';
		}
	}

	.character-sheet-text {
		--sheet-readable-text-scale: 1;
		--sheet-card-max-width: 335px;
		--sheet-card-modal-max-width: 352px;
	}

	.character-sheet-text-large {
		--sheet-readable-text-scale: 1.12;
		--sheet-card-max-width: 360px;
		--sheet-card-modal-max-width: 378px;
	}

	.character-sheet-text-extra_large {
		--sheet-readable-text-scale: 1.25;
		--sheet-card-max-width: 385px;
		--sheet-card-modal-max-width: 404px;
	}

	:global(.character-sheet-text .text-xs) {
		font-size: calc(0.75rem * var(--sheet-readable-text-scale)) !important;
		line-height: 1.45;
	}

	:global(.character-sheet-text .text-sm) {
		font-size: calc(0.875rem * var(--sheet-readable-text-scale)) !important;
		line-height: 1.45;
	}

	:global(.character-sheet-text .text-base) {
		font-size: calc(1rem * var(--sheet-readable-text-scale)) !important;
		line-height: 1.5;
	}

	:global(.character-sheet-text .prose) {
		font-size: calc(1rem * var(--sheet-readable-text-scale));
		line-height: 1.55;
	}

	:global(.character-sheet-text .character-sheet-fixed-text .text-xs) {
		font-size: 0.75rem !important;
		line-height: 1;
	}

	:global(.character-sheet-text .character-sheet-fixed-text .text-sm) {
		font-size: 0.875rem !important;
		line-height: 1.25rem;
	}

	:global(.character-sheet-text .character-sheet-fixed-text .text-base) {
		font-size: 1rem !important;
		line-height: 1.5rem;
	}
</style>
