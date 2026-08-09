<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { cn, level_to_tier, tier_to_min_level } from '$lib/utils';
	import { renderMarkdown } from '$lib/utils';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Shield from '@lucide/svelte/icons/shield';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import ArmorRules from '$lib/components/rule-snippets/armor-rules.svelte';
	import { z } from 'zod';
	import HomebrewBadge from '$lib/components/decorations/badges/homebrew-badge.svelte';
	import CampaignBadge from '$lib/components/decorations/badges/campaign-badge.svelte';

	let { armor_inventory_id }: { armor_inventory_id: string } = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);

	let whatIsArmorOpen = $state(false);
	let customizeOpen = $state(false);

	// Get armor from inventory
	let armor = $derived(
		derived_character_data?.inventory_armor.find((a) => a.inventory_id === armor_inventory_id)
	);

	// Get the inventory item
	let inventoryItem = $derived(
		character?.inventory.armor.find((a) => a.inventory_id === armor_inventory_id)
	);

	// Validation schema for tier
	const tierSchema = z.enum(['1', '2', '3', '4']);
	let tierError = $state<string | undefined>(undefined);

	// Form state - initialized from inventory item
	let customName = $state('');
	let customTier = $state('');
	let customMaxArmor = $state('');
	let customMajorThreshold = $state('');
	let customSevereThreshold = $state('');

	// Derived value for is save button disabled (if customizations match the existing armor)
	let isSaveDisabled = $derived.by(() => {
		if (!armor || !inventoryItem) return false;

		const formName = customName.trim();
		const savedName = (inventoryItem.custom_title ?? '').trim();
		const namesMatch = formName === savedName;

		// Normalize form tier: empty becomes empty string, valid numbers become string
		let formTier = '';
		if (customTier) {
			const tierNum = Number(customTier);
			if (!isNaN(tierNum) && tierNum >= 1 && tierNum <= 4) {
				formTier = String(tierNum);
			} else {
				formTier = String(customTier).trim();
			}
		}

		// Determine the effective saved tier
		const baseArmorTier = String(level_to_tier(armor.level_requirement));
		const hasCustomTier = inventoryItem.custom_level_requirement !== undefined;
		const savedCustomTier = inventoryItem.custom_level_requirement
			? String(level_to_tier(inventoryItem.custom_level_requirement))
			: undefined;

		// Compare tiers:
		// - Empty form tier means "no custom tier" - matches when saved also has no custom tier
		// - Non-empty form tier matches when it equals the effective tier (custom tier if exists, otherwise base tier)
		let tiersMatch = false;
		if (formTier === '') {
			// Empty form tier means "no custom tier" - matches when saved also has no custom tier
			tiersMatch = !hasCustomTier;
		} else {
			// Non-empty form tier - compare to effective tier (custom tier if exists, otherwise base tier)
			const effectiveTier = savedCustomTier ?? baseArmorTier;
			tiersMatch = formTier === effectiveTier;
		}

		// Compare max armor
		const maxArmorStr = String(customMaxArmor ?? '').trim();
		const formMaxArmor =
			maxArmorStr === '' ? undefined : isNaN(Number(maxArmorStr)) ? undefined : Number(maxArmorStr);
		const savedMaxArmor = inventoryItem.custom_max_armor;
		const maxArmorMatch =
			(formMaxArmor === undefined && savedMaxArmor === undefined) ||
			(formMaxArmor !== undefined && savedMaxArmor !== undefined && formMaxArmor === savedMaxArmor);

		// Compare damage thresholds
		const majorStr = String(customMajorThreshold ?? '').trim();
		const severeStr = String(customSevereThreshold ?? '').trim();
		const formMajor =
			majorStr === '' ? undefined : isNaN(Number(majorStr)) ? undefined : Number(majorStr);
		const formSevere =
			severeStr === '' ? undefined : isNaN(Number(severeStr)) ? undefined : Number(severeStr);
		const savedMajor = inventoryItem.custom_damage_thresholds?.major;
		const savedSevere = inventoryItem.custom_damage_thresholds?.severe;
		const thresholdsMatch =
			(formMajor === undefined &&
				savedMajor === undefined &&
				formSevere === undefined &&
				savedSevere === undefined) ||
			(formMajor !== undefined &&
				savedMajor !== undefined &&
				formMajor === savedMajor &&
				formSevere !== undefined &&
				savedSevere !== undefined &&
				formSevere === savedSevere);

		return namesMatch && tiersMatch && maxArmorMatch && thresholdsMatch;
	});

	// Check if there are any customizations on the inventory item
	let hasCustomizations = $derived.by(() => {
		if (!inventoryItem) return false;
		return (
			inventoryItem.custom_title !== undefined ||
			inventoryItem.custom_level_requirement !== undefined ||
			inventoryItem.custom_max_armor !== undefined ||
			inventoryItem.custom_damage_thresholds?.major !== undefined ||
			inventoryItem.custom_damage_thresholds?.severe !== undefined
		);
	});

	// Update form when inventory item changes
	$effect(() => {
		if (inventoryItem && armor) {
			customName = inventoryItem.custom_title === undefined ? '' : inventoryItem.custom_title;
			// Convert level requirement to tier if it exists
			if (inventoryItem.custom_level_requirement !== undefined) {
				customTier = level_to_tier(inventoryItem.custom_level_requirement).toString();
			} else {
				// Use the armor's current tier
				customTier = '';
			}
			customMaxArmor =
				inventoryItem.custom_max_armor !== undefined ? String(inventoryItem.custom_max_armor) : '';
			customMajorThreshold =
				inventoryItem.custom_damage_thresholds?.major !== undefined
					? String(inventoryItem.custom_damage_thresholds?.major)
					: '';
			customSevereThreshold =
				inventoryItem.custom_damage_thresholds?.severe !== undefined
					? String(inventoryItem.custom_damage_thresholds.severe)
					: '';
		} else {
			customName = '';
			customTier = '';
			customMaxArmor = '';
			customMajorThreshold = '';
			customSevereThreshold = '';
		}
	});

	function handleSave() {
		if (!character || !inventoryItem || !armor_inventory_id) return;

		tierError = undefined;

		// Validate tier first (if provided)
		let tierStr: string | undefined = undefined;
		if (customTier) {
			// Convert to string for validation (number inputs can return numbers)
			tierStr = String(customTier).trim();
			const validation = tierSchema.safeParse(tierStr);
			if (!validation.success) {
				tierError = 'Tier must be 1, 2, 3, or 4';
				return; // Don't save anything if validation fails
			}
		}

		// All validations passed - update the item
		// Update name (always valid - empty becomes undefined)
		const trimmedName = customName.trim();
		inventoryItem.custom_title = trimmedName || undefined;

		// Update tier
		if (tierStr) {
			inventoryItem.custom_level_requirement = tier_to_min_level(Number(tierStr));
		} else {
			// Empty tier means no custom level requirement
			inventoryItem.custom_level_requirement = undefined;
		}

		// Update max armor
		const trimmedMaxArmor = String(customMaxArmor ?? '').trim();
		if (trimmedMaxArmor) {
			const maxArmorNum = Number(trimmedMaxArmor);
			if (!isNaN(maxArmorNum) && maxArmorNum > 0) {
				inventoryItem.custom_max_armor = maxArmorNum;
			} else {
				inventoryItem.custom_max_armor = undefined;
			}
		} else {
			inventoryItem.custom_max_armor = undefined;
		}

		// Update damage thresholds
		const trimmedMajor = String(customMajorThreshold ?? '').trim();
		const trimmedSevere = String(customSevereThreshold ?? '').trim();
		if (trimmedMajor) {
			const majorNum = Number(trimmedMajor);
			if (!isNaN(majorNum) && majorNum > 0) {
				if (inventoryItem.custom_damage_thresholds === undefined)
					inventoryItem.custom_damage_thresholds = { major: majorNum };
				else inventoryItem.custom_damage_thresholds.major = majorNum;
			} else {
				if (inventoryItem.custom_damage_thresholds)
					inventoryItem.custom_damage_thresholds.major = undefined;
			}
		} else {
			if (inventoryItem.custom_damage_thresholds)
				inventoryItem.custom_damage_thresholds.major = undefined;
		}
		if (trimmedSevere) {
			const severeNum = Number(trimmedSevere);
			if (!isNaN(severeNum) && severeNum > 0) {
				if (inventoryItem.custom_damage_thresholds)
					inventoryItem.custom_damage_thresholds.severe = severeNum;
				else inventoryItem.custom_damage_thresholds = { severe: severeNum };
			} else {
				if (inventoryItem.custom_damage_thresholds)
					inventoryItem.custom_damage_thresholds.severe = undefined;
			}
		} else {
			if (inventoryItem.custom_damage_thresholds)
				inventoryItem.custom_damage_thresholds.severe = undefined;
		}

		if (!trimmedMajor && !trimmedSevere) {
			inventoryItem.custom_damage_thresholds = undefined;
		}
	}

	function handleClear() {
		customName = '';
		customTier = '';
		customMaxArmor = '';
		customMajorThreshold = '';
		customSevereThreshold = '';
		tierError = undefined;
		handleSave();
	}
</script>

{#if armor}
	<Sheet.Header>
		<Sheet.Title>{armor.title}</Sheet.Title>
		<p class="flex items-center gap-1.5 text-xs text-muted-foreground italic">
			{#if armor.source_key === 'Homebrew'}
				<HomebrewBadge class="-mt-0.5 size-4" />
			{:else if armor.source_key === 'Campaign'}
				<CampaignBadge class="-mt-0.5 size-4" />
			{/if}
			Tier {level_to_tier(armor.level_requirement)}
		</p>
	</Sheet.Header>

	<div class="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
		{#if armor.description_html}
			<p class="py-4 text-sm">{@html renderMarkdown(armor.description_html)}</p>
		{/if}

		<!-- Stats Table -->
		<table class="w-full border-collapse text-sm">
			<tbody>
				<tr class="border-b">
					<th class="py-2 pr-4 text-left font-normal text-muted-foreground">Base Armor Score</th>
					<td class="py-2 text-right">
						{armor.max_armor}
						<Shield class="-mt-0.5 ml-0.5 inline-block size-3.5" />
					</td>
				</tr>
				<tr>
					<th class="py-2 pr-4 text-left font-normal text-muted-foreground"
						>Base Damage Thresholds</th
					>
					<td class="py-2 text-right"
						>{armor.damage_thresholds.major} / {armor.damage_thresholds.severe}</td
					>
				</tr>
			</tbody>
		</table>

		<!-- Features -->
		{#if armor.features.length > 0}
			<div class="rounded-lg border bg-primary/5 px-4 py-3">
				<div class="flex items-center justify-between">
					<p class="text-sm">Features</p>
				</div>
				<div class="mt-3 space-y-3">
					{#each armor.features as feature}
						<div class="border-l-2 border-accent/30 pl-3">
							<p class="text-sm font-medium text-muted-foreground">{feature.title}</p>
							<p class="mt-0.5 text-xs text-muted-foreground">
								{@html renderMarkdown(feature.description_html)}
							</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if inventoryItem && characterCtx.canEditInventory}
			<Collapsible.Root bind:open={customizeOpen}>
				<Collapsible.Trigger
					class={cn(
						'flex w-full items-center justify-between rounded-md border bg-card px-3 py-2 text-sm',
						customizeOpen && 'rounded-b-none'
					)}
				>
					<span>Customize</span>
					<ChevronLeft class={cn('size-4 transition-transform', customizeOpen && '-rotate-90')} />
				</Collapsible.Trigger>
				<Collapsible.Content class="flex flex-col gap-3 rounded-b-md border bg-card/50 p-2">
					<div class="flex flex-col gap-1">
						<label for="custom-name" class="text-xs font-medium text-muted-foreground">Name</label>
						<Input id="custom-name" bind:value={customName} />
					</div>
					<div class="flex flex-col gap-1">
						<label for="custom-tier" class="text-xs font-medium text-muted-foreground">Tier</label>
						<Input
							id="custom-tier"
							type="number"
							inputmode="numeric"
							bind:value={customTier}
							placeholder="Tier (1-4)"
							min="1"
							max="4"
							step="1"
						/>
						{#if tierError}
							<p class="text-xs text-destructive">{tierError}</p>
						{/if}
					</div>
					<div class="flex flex-col gap-1">
						<label for="custom-max-armor" class="text-xs font-medium text-muted-foreground"
							>Base Armor Score</label
						>
						<Input
							id="custom-max-armor"
							type="number"
							inputmode="numeric"
							bind:value={customMaxArmor}
							min="0"
							step="1"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<div class="flex gap-2">
							<div class="flex flex-1 flex-col gap-1">
								<label for="custom-major-threshold" class="text-xs text-muted-foreground"
									>Major Threshold</label
								>
								<Input
									id="custom-major-threshold"
									type="number"
									inputmode="numeric"
									bind:value={customMajorThreshold}
									min="0"
									step="1"
								/>
							</div>
							<div class="flex flex-1 flex-col gap-1">
								<label for="custom-severe-threshold" class="text-xs text-muted-foreground"
									>Severe Threshold</label
								>
								<Input
									id="custom-severe-threshold"
									type="number"
									inputmode="numeric"
									bind:value={customSevereThreshold}
									min="0"
									step="1"
								/>
							</div>
						</div>
					</div>
					<div class="flex gap-2">
						<Button size="sm" onclick={handleSave} hidden={isSaveDisabled}>Save</Button>
						{#if hasCustomizations}
							<Button
								size="sm"
								variant="link"
								class="ml-auto text-destructive"
								onclick={handleClear}>Clear</Button
							>
						{/if}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		{/if}

		<Collapsible.Root bind:open={whatIsArmorOpen} class="pt-2">
			<Collapsible.Trigger class="flex items-center gap-1">
				<ChevronRight class={cn('size-4 transition-transform', whatIsArmorOpen && 'rotate-90')} />
				<p class="text-sm font-medium">More info</p>
			</Collapsible.Trigger>
			<Collapsible.Content>
				<ArmorRules class="pt-2 pl-5" />
			</Collapsible.Content>
		</Collapsible.Root>
	</div>

	{#if inventoryItem && characterCtx.canEditInventory}
		<Sheet.Footer>
			<Sheet.Close
				class={cn(buttonVariants({ size: 'sm', variant: 'link' }), 'text-destructive')}
				onclick={() => {
					characterCtx.removeFromInventory('armor', armor_inventory_id);
				}}
			>
				Remove
			</Sheet.Close>
		</Sheet.Footer>
	{/if}
{/if}
