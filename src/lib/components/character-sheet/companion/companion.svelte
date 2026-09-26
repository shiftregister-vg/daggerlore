<script lang="ts">
	import { cn } from '$lib/utils';
	import { getCompanionCommandRoll } from '$lib/state/companion-rolls';
	import type { Snippet } from 'svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select/';
	import { COMPANION_LEVEL_UP_OPTION_MAXES } from '@domain/constants/rules';
	import type { CompanionLevelUpOptionId } from '@domain/schemas/rules';
	import CompanionEvasion from './companion-evasion.svelte';
	import CompanionStress from './companion-stress.svelte';
	import CompanionHope from './companion-hope.svelte';
	import Square from '@lucide/svelte/icons/square';
	import SquareCheck from '@lucide/svelte/icons/square-check';
	import RollButton from '$lib/components/dice/roll-button.svelte';
	import ImageUploader from '$lib/components/utility/user-image-uploader.svelte';

	let {
		class: className = '',
		children
	}: {
		class?: string;
		children?: Snippet;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);
	const companion = $derived(character?.companion); // companion that can be updated (including choices)
	const derived_companion = $derived(derived_character_data?.derived_companion); // used to show final stats and is updated automatically based on companion choices

	const commandRoll = $derived(
		derived_character_data ? getCompanionCommandRoll(derived_character_data) : undefined
	);
	const eligibleExperiences = $derived(derived_companion?.experiences ?? []);

	let edit_mode = $state(false);
	let select_open = $state(false);
	let width: number = $state(300);

	// Companion level up options with display names and descriptions
	const COMPANION_OPTIONS: Record<CompanionLevelUpOptionId, { name: string; description: string }> =
		{
			intelligent: {
				name: 'Intelligent',
				description:
					'Your companion gains a permanent +1 bonus to a Companion Experience of your choice.'
			},
			'light-in-the-dark': {
				name: 'Light in the Dark',
				description: 'Use this as an additional Hope slot your character can mark.'
			},
			'creature-comfort': {
				name: 'Creature Comfort',
				description:
					'Once per rest, when you take time during a quiet moment to give your companion love and attention, you can gain a Hope or you can both clear a Stress.'
			},
			armored: {
				name: 'Armored',
				description:
					'When your companion takes damage, you can mark one of your Armor Slots instead of marking one of their Stress.'
			},
			vicious: {
				name: 'Vicious',
				description:
					"Increase your companion's damage dice or range by one step (d6 to d8, Close to Far, etc.)."
			},
			resilient: {
				name: 'Resilient',
				description: 'Your companion gains an additional Stress slot.'
			},
			bonded: {
				name: 'Bonded',
				description:
					'When you mark your last Hit Point, your companion rushes to your side to comfort you. Roll a number of d6s equal to the unmarked Stress slots they have and mark them. If any roll a 6, your companion helps you up. Clear your last Hit Point and return to the scene.'
			},
			aware: {
				name: 'Aware',
				description: 'Your companion gains a permanent +2 bonus to their Evasion.'
			}
		};

	// Get available level up choices count (character.level - 1)
	const max_level_up_choices = $derived.by(() => {
		if (!character) return 0;
		let max = Math.max(0, character.level - 1);

		if (derived_character_data?.hasCompanionExpertTrainingSubclassFeature) {
			max += 1;
		}
		if (derived_character_data?.hasCompanionAdvancedTrainingSubclassFeature) {
			max += 2;
		}
		return max;
	});

	// Current level up choices
	const level_up_choices = $derived(companion?.level_up_choices || []);

	// Intelligent choices (experience indices)
	const intelligent_choices = $derived(companion?.choices?.['intelligent'] || []);

	// Vicious choices (damage_dice or range)
	const vicious_choices = $derived(companion?.choices?.['vicious'] || []);

	function handleOptionClick(optionId: CompanionLevelUpOptionId) {
		if (!companion) return;
		const usageCount = getOptionUsageCount(optionId);
		const max = COMPANION_LEVEL_UP_OPTION_MAXES[optionId];

		// If we can add more of this option and haven't reached total max
		if (usageCount < max && level_up_choices.length < max_level_up_choices) {
			companion.level_up_choices = [...level_up_choices, optionId];

			// Initialize choices object if it doesn't exist
			if (!companion.choices) {
				companion.choices = {};
			}

			// If this is "Intelligent", add an empty entry to the choices array
			if (optionId === 'intelligent') {
				if (!companion.choices['intelligent']) {
					companion.choices['intelligent'] = [];
				}
				// Add an empty string for the new selection (user will select the experience)
				companion.choices['intelligent'] = [...companion.choices['intelligent'], ''];
			}

			// If this is "Vicious", add an empty entry to the choices array
			if (optionId === 'vicious') {
				if (!companion.choices['vicious']) {
					companion.choices['vicious'] = [];
				}
				// Add an empty string for the new selection (user will select damage_dice or range)
				companion.choices['vicious'] = [...companion.choices['vicious'], ''];
			}
		}
	}

	function handleOptionRightClick(optionId: CompanionLevelUpOptionId, event: MouseEvent) {
		event.preventDefault();
		if (!companion) return;
		const usageCount = getOptionUsageCount(optionId);

		// If there are any instances of this option, remove one
		if (usageCount > 0) {
			const index = level_up_choices.findIndex((id) => id === optionId);
			if (index !== -1) {
				companion.level_up_choices = level_up_choices.filter((_, i) => i !== index);

				// If this is "Intelligent", also remove the corresponding choice entry
				if (optionId === 'intelligent' && companion.choices?.['intelligent']) {
					// Find the index in the intelligent choices array that corresponds to this selection
					// Count how many "intelligent" choices appear before this index
					let intelligentCount = 0;
					for (let i = 0; i < index; i++) {
						if (level_up_choices[i] === 'intelligent') {
							intelligentCount++;
						}
					}
					// Remove the entry at that position
					if (intelligentCount < companion.choices['intelligent'].length) {
						companion.choices['intelligent'] = companion.choices['intelligent'].filter(
							(_, i) => i !== intelligentCount
						);
					}
				}

				// If this is "Vicious", also remove the corresponding choice entry
				if (optionId === 'vicious' && companion.choices?.['vicious']) {
					// Find the index in the vicious choices array that corresponds to this selection
					// Count how many "vicious" choices appear before this index
					let viciousCount = 0;
					for (let i = 0; i < index; i++) {
						if (level_up_choices[i] === 'vicious') {
							viciousCount++;
						}
					}
					// Remove the entry at that position
					if (viciousCount < companion.choices['vicious'].length) {
						companion.choices['vicious'] = companion.choices['vicious'].filter(
							(_, i) => i !== viciousCount
						);
					}
				}
			}
		}
	}

	function getOptionUsageCount(optionId: CompanionLevelUpOptionId): number {
		return level_up_choices.filter((id) => id === optionId).length;
	}

	function isOptionDisabled(optionId: CompanionLevelUpOptionId): boolean {
		const usageCount = getOptionUsageCount(optionId);
		const max = COMPANION_LEVEL_UP_OPTION_MAXES[optionId];
		return usageCount >= max || level_up_choices.length >= max_level_up_choices;
	}
</script>

{#if character && companion}
	<div class={cn('flex max-w-[calc(min(100%,400px))] flex-col rounded bg-card/50 p-3', className)}>
		{#if edit_mode}
			<!-- Edit Mode -->
			<div class="flex flex-col gap-4">
				<Button size="sm" onclick={() => (edit_mode = false)} class="-mb-2 h-6">Done</Button>
				<div class="flex gap-2">
					<!-- Image Upload -->
					<div class="flex flex-col gap-1">
						<ImageUploader
							autoUpload
							onUpload={(url) => (companion.image_url = url)}
							placeholderImage={companion.image_url}
							alt={companion.name || 'Companion'}
							disabled={!characterCtx.canEdit}
							class="h-[90px] w-[90px] shrink-0"
						/>
					</div>
					<!-- Name -->
					<div class="flex grow flex-col gap-1">
						<!-- Save Button -->

						<label for="companion-name" class="text-xs font-medium text-muted-foreground"
							>Name</label
						>
						<Input
							disabled={!characterCtx.canEdit}
							id="companion-name"
							bind:value={companion.name}
							placeholder="Companion name"
						/>
					</div>
				</div>

				<!-- Experiences -->
				<div class="flex flex-col gap-1">
					<table class="w-full border-collapse">
						<colgroup>
							<col class="w-14" />
							<col />
						</colgroup>
						<thead>
							<tr class="border-b bg-primary-muted text-xs text-muted-foreground">
								<th class="px-4 py-2 text-left">Mod.</th>
								<th class="py-2 pr-4 text-left">Experience</th>
							</tr>
						</thead>
						<tbody>
							{#each eligibleExperiences as experience, i}
								<tr class="text-xs">
									<td class={cn('px-4 py-1', i === 0 && 'pt-1.5')}>
										<RollButton
											class="ml-auto sm:mx-auto"
											type="duality"
											modifier={derived_companion?.experience_modifiers[i] ?? 0}
										/>
									</td>
									<td class={cn('py-1 pr-4', i === 0 && 'pt-1.5')}>
										<Input
											disabled={!characterCtx.canEdit}
											bind:value={companion.experiences[i]}
											placeholder="Unnamed Experience"
											class="text-xs"
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Attack Name -->
				{#if companion.attack}
					<div class="flex flex-col gap-1">
						<label for="companion-attack-name" class="text-xs font-medium text-muted-foreground"
							>Attack Name</label
						>
						<Input
							disabled={!characterCtx.canEdit}
							id="companion-attack-name"
							bind:value={companion.attack.name}
							placeholder="Attack name"
						/>
					</div>
				{/if}

				<!-- Level Up Choices -->
				{#if character.level > 1}
					<div class="flex flex-col gap-1" bind:clientWidth={width}>
						<div class="text-xs font-medium text-muted-foreground">
							Level Up Choices ({level_up_choices.length}/{max_level_up_choices})
						</div>
						<Select.Root disabled={!characterCtx.canEdit} type="single" bind:open={select_open}>
							<Select.Trigger
								highlighted={level_up_choices.length < max_level_up_choices}
								class="w-full truncate bg-muted/80 hover:bg-muted/50"
							>
								<p class="truncate">
									{level_up_choices.length === 0
										? `Select ${max_level_up_choices} level up option${max_level_up_choices !== 1 ? 's' : ''}`
										: level_up_choices
												.map((id) => COMPANION_OPTIONS[id as CompanionLevelUpOptionId]?.name || id)
												.join(', ')}
									{#if level_up_choices.length < max_level_up_choices}
										<span class="text-muted-foreground">
											({max_level_up_choices - level_up_choices.length} more)
										</span>
									{/if}
								</p>
							</Select.Trigger>
							<Select.Content class="rounded-md" align="start">
								<div style="max-width: {width}px;" class="p-2">
									<button
										disabled={level_up_choices.length === 0}
										class="mb-2 flex w-full items-center justify-center gap-2 rounded-sm px-2 py-1.5 text-sm font-bold text-destructive select-none hover:cursor-pointer hover:bg-muted disabled:pointer-events-none disabled:cursor-default disabled:opacity-50"
										onclick={() => {
											if (companion) {
												companion.level_up_choices = [];
												// Also clear intelligent and vicious choices
												if (companion.choices?.['intelligent']) {
													companion.choices['intelligent'] = [];
												}
												if (companion.choices?.['vicious']) {
													companion.choices['vicious'] = [];
												}
											}
										}}
									>
										-- Clear selection --
									</button>
									<div class="flex flex-col gap-1">
										{#each Object.entries(COMPANION_OPTIONS) as [optionId, option]}
											{@const usageCount = getOptionUsageCount(
												optionId as CompanionLevelUpOptionId
											)}
											{@const max =
												COMPANION_LEVEL_UP_OPTION_MAXES[optionId as CompanionLevelUpOptionId]}
											{@const disabled = isOptionDisabled(optionId as CompanionLevelUpOptionId)}
											<button
												{disabled}
												class="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm select-none hover:cursor-pointer hover:bg-muted disabled:pointer-events-none disabled:cursor-default disabled:opacity-50"
												onclick={() => handleOptionClick(optionId as CompanionLevelUpOptionId)}
												oncontextmenu={(e) =>
													handleOptionRightClick(optionId as CompanionLevelUpOptionId, e)}
											>
												<div class="flex w-14 shrink-0 justify-end pt-0.5">
													<div class="flex w-min gap-1">
														{#each Array(max) as _, i}
															{@const Icon = i < usageCount ? SquareCheck : Square}
															<Icon class="size-4" />
														{/each}
													</div>
												</div>
												<div class="flex grow flex-col gap-0.5">
													<p class="font-medium">{option.name}</p>
													<p class="text-xs text-muted-foreground">{option.description}</p>
												</div>
											</button>
										{/each}
									</div>
								</div>
							</Select.Content>
						</Select.Root>
					</div>

					<!-- Intelligent Experience Selections -->
					{#if getOptionUsageCount('intelligent') > 0}
						<div class="flex flex-col gap-2">
							<div class="text-xs font-medium text-muted-foreground">
								Select an Experience to upgrade
							</div>
							{#each Array(getOptionUsageCount('intelligent')) as _, i}
								{@const currentChoice = intelligent_choices[i] || ''}
								{@const selectId = `intelligent-${i}`}
								<div class="flex flex-col gap-1">
									<Select.Root
										disabled={!characterCtx.canEdit}
										type="single"
										value={currentChoice}
										onValueChange={(value: string) => {
											if (!companion) return;
											if (!companion.choices) {
												companion.choices = {};
											}
											if (!companion.choices['intelligent']) {
												companion.choices['intelligent'] = [];
											}
											// Ensure array is long enough
											while (companion.choices['intelligent'].length <= i) {
												companion.choices['intelligent'].push('');
											}
											companion.choices['intelligent'][i] = value || '';
										}}
									>
										<Select.Trigger id={selectId} class="w-full">
											<p class="truncate">
												{currentChoice
													? (() => {
															const idx = parseInt(currentChoice, 10);
															if (!isNaN(idx) && idx >= 0 && idx < eligibleExperiences.length) {
																return companion.experiences[idx] || `Experience ${idx + 1}`;
															}
															return 'Invalid';
														})()
													: 'Select experience'}
											</p>
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="" class="justify-center text-muted-foreground"
												>-- Select none --</Select.Item
											>
											{#each eligibleExperiences as experience, expIdx}
												<Select.Item value={expIdx.toString()}>
													{experience.trim() || 'Unnamed Experience'}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Vicious Upgrade Selections -->
					{#if getOptionUsageCount('vicious') > 0}
						<div class="flex flex-col gap-2">
							<div class="text-xs font-medium text-muted-foreground">
								Select Damage Dice or Range upgrade
							</div>
							{#each Array(getOptionUsageCount('vicious')) as _, i}
								{@const currentChoice = vicious_choices[i] || ''}
								{@const selectId = `vicious-${i}`}
								<div class="flex flex-col gap-1">
									<Select.Root
										disabled={!characterCtx.canEdit}
										type="single"
										value={currentChoice}
										onValueChange={(value: string) => {
											if (!companion) return;
											if (!companion.choices) {
												companion.choices = {};
											}
											if (!companion.choices['vicious']) {
												companion.choices['vicious'] = [];
											}
											// Ensure array is long enough
											while (companion.choices['vicious'].length <= i) {
												companion.choices['vicious'].push('');
											}
											companion.choices['vicious'][i] = value || '';
										}}
									>
										<Select.Trigger id={selectId} class="w-full">
											<p class="truncate">
												{currentChoice === 'damage_dice'
													? 'Damage Dice Upgrade'
													: currentChoice === 'range'
														? 'Range Upgrade'
														: 'Select upgrade type'}
											</p>
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="" class="justify-center text-muted-foreground"
												>-- Select none --</Select.Item
											>
											<Select.Item value="damage_dice">Damage Dice Upgrade</Select.Item>
											<Select.Item value="range">Range Upgrade</Select.Item>
										</Select.Content>
									</Select.Root>
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		{:else}
			<!-- Display Mode -->
			{#if derived_companion}
				<div class="flex flex-col gap-3">
					<!-- Top Section: Image, Name, and Attack -->
					<div class="flex items-start gap-3">
						<!-- Image -->
						<ImageUploader
							autoUpload
							onUpload={(url) => (companion.image_url = url)}
							placeholderImage={derived_companion.image_url ||
								companion.image_url ||
								'/images/art/companion-placeholder.webp'}
							alt={derived_companion.name || companion.name || 'Companion'}
							disabled={!characterCtx.canEdit}
							class="h-[90px] w-[90px] shrink-0"
						/>

						<!-- Name and Attack Info -->
						<div class="flex min-w-0 flex-1 flex-col gap-2">
							<!-- Name -->
							<div class="flex items-center justify-between gap-1">
								<p class="truncate text-sm font-medium text-foreground">
									{derived_companion.name || companion.name}
								</p>
								{#if characterCtx.canEdit}
									<Button
										variant="ghost"
										class="h-auto px-2 py-0"
										onclick={() => (edit_mode = true)}
									>
										<Pencil class="size-3.5" />
									</Button>
								{/if}
							</div>

							<!-- Attack -->
							{#if derived_companion.attack}
								<div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
									<span>{derived_companion.attack.name || 'Attack'}</span>
									<span>{derived_companion.attack.range}</span>

									{#if commandRoll}
										<div class="flex items-center gap-1">
											<span>Command</span>
											<RollButton
												type="duality"
												name={`${derived_companion.name || 'Companion'} Command / Attack`}
												traitId={commandRoll.traitId}
												modifier={commandRoll.modifier}
											/>
										</div>
									{/if}
									<RollButton
										type="base"
										name={`${derived_companion.name || 'Companion'} Damage`}
										proficiency={derived_character_data?.proficiency}
										diceString={derived_companion.attack.damage_dice}
										modifier={derived_companion.attack.damage_bonus}
										damageType={derived_companion.attack.damage_type}
									/>
								</div>
							{/if}
						</div>
					</div>

					<!-- Stats Section: Evasion, Stress, and Hope -->
					<div class="flex items-center gap-4">
						<!-- Evasion (prominent, on the left) -->
						<CompanionEvasion evasion={derived_companion.evasion} />

						<!-- Stress and Hope (stacked on the right) -->
						<div class="mr-2 flex flex-1 flex-wrap items-center justify-around gap-4">
							<CompanionStress max_stress={derived_companion.max_stress} />

							<!-- Hope (only if max_hope > 0) -->
							{#if derived_companion.max_hope > 0}
								<CompanionHope />
							{/if}
						</div>
					</div>

					<!-- Features from 'creature-comfort', 'armored', and 'bonded' level up choices -->
					{#if derived_companion.level_up_choices.some( (id) => ['creature-comfort', 'armored', 'bonded'].includes(id) )}
						{@const feature_options = ['creature-comfort', 'armored', 'bonded'] as const}
						{@const active_features = feature_options.filter((optionId) =>
							derived_companion.level_up_choices.includes(optionId)
						)}
						{#each active_features as optionId}
							{@const option = COMPANION_OPTIONS[optionId]}
							<p class="text-xs text-muted-foreground">
								<span class="font-medium text-foreground">{option.name}:</span>
								{option.description}
							</p>
						{/each}
					{/if}

					<!-- Experiences Table -->
					{#if derived_companion.experiences.length > 0}
						<div class="w-full">
							<table class="w-full border-collapse">
								<colgroup>
									<col class="w-14" />
									<col />
								</colgroup>
								<thead>
									<tr class="border-b bg-primary-muted text-xs text-muted-foreground">
										<th class="px-4 py-2 text-left">Mod.</th>
										<th class="py-2 pr-4 text-left">Experience</th>
									</tr>
								</thead>
								<tbody>
									{#each derived_companion.experiences as experience, i}
										<tr class="text-xs">
											<td class={cn('px-4 py-1', i === 0 && 'pt-1.5')}>
												<RollButton
													class="ml-auto sm:mx-auto"
													type="duality"
													modifier={derived_companion.experience_modifiers[i] ?? 0}
												/>
											</td>
											<td class={cn('py-1 pr-4', i === 0 && 'pt-1.5')}>
												<p class="text-xs text-muted-foreground italic">
													{experience.trim() === '' ? 'Unnamed Experience' : experience}
												</p>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/if}
		{/if}

		{@render children?.()}
	</div>
{/if}
