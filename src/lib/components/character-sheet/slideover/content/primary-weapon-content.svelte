<script lang="ts">
	import type { DamageType, Range } from '@domain/schemas/rules';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Select from '$lib/components/ui/select';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { cn, capitalize, level_to_tier, tier_to_min_level } from '$lib/utils';
	import { renderMarkdown } from '$lib/utils';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Hand from '@lucide/svelte/icons/hand';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import HomebrewBadge from '$lib/components/decorations/badges/homebrew-badge.svelte';
	import WeaponsRules from '$lib/components/rule-snippets/weapons-rules.svelte';
	import DicePicker from '$lib/components/dice/dice-picker.svelte';
	import { z } from 'zod';
	import CampaignBadge from '$lib/components/decorations/badges/campaign-badge.svelte';

	let { weapon_inventory_id }: { weapon_inventory_id: string } = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);

	let whatIsWeaponsOpen = $state(false);
	let customizeOpen = $state(false);

	// Get weapon from inventory
	let weapon = $derived(
		derived_character_data?.inventory_primary_weapons.find(
			(w) => w.inventory_id === weapon_inventory_id
		)
	);

	// Get the inventory item
	let inventoryItem = $derived(
		character?.inventory.primary_weapons.find((w) => w.inventory_id === weapon_inventory_id)
	);

	const damageTypeMap: Record<DamageType, string> = {
		phy: 'Physical',
		mag: 'Magical'
	};

	// Validation schema for tier
	const tierSchema = z.enum(['1', '2', '3', '4']);
	let tierError: string | undefined = $state();

	// Form state - initialized from inventory item
	let customName = $state('');
	let customTier = $state('');
	let customRange = $state<string>('');
	let customDamageTypes = $state<DamageType[]>([]);
	let customBurden = $state<string>('');
	let customDamageDice = $state('');
	let customDamageBonus = $state('');
	let customAttackRollBonus = $state('');

	const rangeOptions: Range[] = ['Melee', 'Very Close', 'Close', 'Far', 'Very Far'];
	const damageTypeOptions: DamageType[] = ['phy', 'mag'];

	// Derived value for is save button disabled (if customizations match the existing weapon)
	let isSaveDisabled = $derived.by(() => {
		if (!weapon || !inventoryItem) return false;

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
		const baseWeaponTier = String(level_to_tier(weapon.level_requirement));
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
			const effectiveTier = savedCustomTier ?? baseWeaponTier;
			tiersMatch = formTier === effectiveTier;
		}

		// Compare range
		const formRange = customRange === '' ? undefined : (customRange as Range);
		const savedRange = inventoryItem.custom_range;
		const rangeMatch =
			(formRange === undefined && savedRange === undefined) ||
			(formRange !== undefined && savedRange !== undefined && formRange === savedRange);

		// Compare damage types
		const formDamageTypes =
			customDamageTypes.length === 0 ? undefined : [...customDamageTypes].sort();
		const savedDamageTypes =
			inventoryItem.custom_available_damage_types === undefined
				? undefined
				: [...(inventoryItem.custom_available_damage_types ?? [])].sort();
		const damageTypesMatch =
			(formDamageTypes === undefined && savedDamageTypes === undefined) ||
			(formDamageTypes !== undefined &&
				savedDamageTypes !== undefined &&
				JSON.stringify(formDamageTypes) === JSON.stringify(savedDamageTypes));

		// Compare burden
		const formBurden = customBurden === '' ? undefined : Number(customBurden);
		const savedBurden = inventoryItem.custom_burden;
		const burdenMatch =
			(formBurden === undefined && savedBurden === undefined) ||
			(formBurden !== undefined && savedBurden !== undefined && formBurden === savedBurden);

		// Compare damage dice
		const formDamageDice = customDamageDice === '' ? undefined : customDamageDice.trim();
		const savedDamageDice = inventoryItem.custom_damage_dice;
		const damageDiceMatch =
			(formDamageDice === undefined && savedDamageDice === undefined) ||
			(formDamageDice !== undefined &&
				savedDamageDice !== undefined &&
				formDamageDice === savedDamageDice);

		// Compare damage bonus
		const formDamageBonus = customDamageBonus === '' ? undefined : Number(customDamageBonus);
		const savedDamageBonus = inventoryItem.custom_damage_bonus;
		const damageBonusMatch =
			(formDamageBonus === undefined && savedDamageBonus === undefined) ||
			(formDamageBonus !== undefined &&
				savedDamageBonus !== undefined &&
				formDamageBonus === savedDamageBonus);

		// Compare attack roll bonus
		const formAttackRollBonus =
			customAttackRollBonus === '' ? undefined : Number(customAttackRollBonus);
		const savedAttackRollBonus = inventoryItem.custom_attack_roll_bonus;
		const attackRollBonusMatch =
			(formAttackRollBonus === undefined && savedAttackRollBonus === undefined) ||
			(formAttackRollBonus !== undefined &&
				savedAttackRollBonus !== undefined &&
				formAttackRollBonus === savedAttackRollBonus);

		return (
			namesMatch &&
			tiersMatch &&
			rangeMatch &&
			damageTypesMatch &&
			burdenMatch &&
			damageDiceMatch &&
			damageBonusMatch &&
			attackRollBonusMatch
		);
	});

	// Check if there are any customizations on the inventory item
	let hasCustomizations = $derived.by(() => {
		if (!inventoryItem) return false;
		return (
			inventoryItem.custom_title !== undefined ||
			inventoryItem.custom_level_requirement !== undefined ||
			inventoryItem.custom_range !== undefined ||
			inventoryItem.custom_available_damage_types !== undefined ||
			inventoryItem.custom_burden !== undefined ||
			inventoryItem.custom_damage_dice !== undefined ||
			inventoryItem.custom_damage_bonus !== undefined ||
			inventoryItem.custom_attack_roll_bonus !== undefined
		);
	});

	// Update form when inventory item changes
	$effect(() => {
		if (inventoryItem && weapon) {
			customName = inventoryItem.custom_title ?? '';
			// Convert level requirement to tier if it exists
			if (inventoryItem.custom_level_requirement !== undefined) {
				customTier = level_to_tier(inventoryItem.custom_level_requirement ?? 0).toString();
			} else {
				// Use the weapon's current tier
				customTier = '';
			}
			customRange = inventoryItem.custom_range ?? '';
			customDamageTypes =
				inventoryItem.custom_available_damage_types === undefined
					? []
					: [...(inventoryItem.custom_available_damage_types ?? [])];
			customBurden = inventoryItem.custom_burden ? String(inventoryItem.custom_burden) : '';
			customDamageDice = inventoryItem.custom_damage_dice ?? '';
			customDamageBonus = inventoryItem.custom_damage_bonus
				? String(inventoryItem.custom_damage_bonus)
				: '';
			customAttackRollBonus = inventoryItem.custom_attack_roll_bonus
				? String(inventoryItem.custom_attack_roll_bonus)
				: '';
		} else {
			customName = '';
			customTier = '';
			customRange = '';
			customDamageTypes = [];
			customBurden = '';
			customDamageDice = '';
			customDamageBonus = '';
			customAttackRollBonus = '';
		}
	});

	function handleSave() {
		if (!character || !inventoryItem || !weapon_inventory_id) return;

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

		// Update range
		inventoryItem.custom_range = customRange === '' ? undefined : (customRange as Range);

		// Update damage types
		inventoryItem.custom_available_damage_types =
			customDamageTypes.length === 0 ? undefined : [...customDamageTypes];

		// Update burden
		if (customBurden === '') {
			inventoryItem.custom_burden = undefined;
		} else {
			const burdenNum = Number(customBurden);
			if (!isNaN(burdenNum) && (burdenNum === 0 || burdenNum === 1 || burdenNum === 2)) {
				inventoryItem.custom_burden = burdenNum as 0 | 1 | 2;
			} else {
				inventoryItem.custom_burden = undefined;
			}
		}

		// Update damage dice
		inventoryItem.custom_damage_dice =
			customDamageDice.trim() === '' ? undefined : customDamageDice.trim();

		// Update damage bonus
		if (customDamageBonus === '') {
			inventoryItem.custom_damage_bonus = undefined;
		} else {
			const damageBonusNum = Number(customDamageBonus);
			if (!isNaN(damageBonusNum)) {
				inventoryItem.custom_damage_bonus = damageBonusNum;
			} else {
				inventoryItem.custom_damage_bonus = undefined;
			}
		}

		// Update attack roll bonus
		if (customAttackRollBonus === '') {
			inventoryItem.custom_attack_roll_bonus = undefined;
		} else {
			const attackRollBonusNum = Number(customAttackRollBonus);
			if (!isNaN(attackRollBonusNum)) {
				inventoryItem.custom_attack_roll_bonus = attackRollBonusNum;
			} else {
				inventoryItem.custom_attack_roll_bonus = undefined;
			}
		}
	}

	function handleClear() {
		customName = '';
		customTier = '';
		customRange = '';
		customDamageTypes = [];
		customBurden = '';
		customDamageDice = '';
		customDamageBonus = '';
		customAttackRollBonus = '';
		tierError = undefined;
		handleSave();
	}

	function toggleDamageType(type: DamageType) {
		if (customDamageTypes.includes(type)) {
			customDamageTypes = customDamageTypes.filter((t) => t !== type);
		} else {
			customDamageTypes = [...customDamageTypes, type];
		}
	}
</script>

{#if weapon}
	<Sheet.Header>
		<Sheet.Title>{weapon.title}</Sheet.Title>
		<p class="flex items-center gap-1.5 text-xs text-muted-foreground italic">
			{#if weapon.source_key === 'Homebrew'}
				<HomebrewBadge class="-mt-0.5 size-4" />
			{:else if weapon.source_key === 'Campaign'}
				<CampaignBadge class="-mt-0.5 size-4" />
			{/if}
			Tier {level_to_tier(weapon.level_requirement)}
			Primary Weapon
		</p>
	</Sheet.Header>

	<div class="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
		{#if weapon.description_html.trim().length > 0}
			<p class="py-4 text-sm">{@html renderMarkdown(weapon.description_html)}</p>
		{/if}

		<!-- Stats Table -->
		<table class="w-full border-collapse text-sm">
			<tbody>
				<tr class="border-b">
					<th class="py-2 pr-4 text-left font-normal text-muted-foreground">Range</th>
					<td class="py-2 text-right">{weapon.range}</td>
				</tr>
				<tr class="border-b">
					<th class="py-2 pr-4 text-left font-normal text-muted-foreground">Trait</th>
					<td class="py-2 text-right">{weapon.available_traits.map(capitalize).join(' / ')}</td>
				</tr>

				<tr class="border-b">
					<th class="py-2 pr-4 text-left font-normal text-muted-foreground">Damage</th>
					<td class="py-2 text-right"
						>{weapon.damage_dice}{#if weapon.damage_bonus > 0}+{weapon.damage_bonus}{/if}</td
					>
				</tr>
				<tr class="border-b">
					<th class="py-2 pr-4 text-left font-normal text-muted-foreground">Damage Type</th>
					<td class="py-2 text-right"
						>{weapon.available_damage_types.map((t) => damageTypeMap[t]).join(' / ')}</td
					>
				</tr>
				<tr>
					<th class="py-2 pr-4 text-left font-normal text-muted-foreground">Burden</th>
					<td class="py-2 text-right">
						{weapon.burden}
						<Hand class="-mt-0.5 ml-0.5 inline-block size-3.5" />
					</td>
				</tr>
			</tbody>
		</table>

		<!-- Features -->
		{#if weapon.features.length > 0}
			<div class="rounded-lg border bg-primary/5 px-4 py-3">
				<div class="flex items-center justify-between">
					<p class="text-sm">Features</p>
				</div>
				<div class="mt-3 space-y-3">
					{#each weapon.features as feature}
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
						<label for="custom-range" class="text-xs font-medium text-muted-foreground">Range</label
						>
						<Select.Root type="single" bind:value={customRange}>
							<Select.Trigger id="custom-range" class="w-full">
								<p class="truncate">{customRange || 'Select a range'}</p>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="">None (use default)</Select.Item>
								{#each rangeOptions as range}
									<Select.Item value={range}>{range}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="flex flex-col gap-2">
						<p class="text-xs font-medium text-muted-foreground">Damage Types</p>
						<div class="flex gap-4">
							{#each damageTypeOptions as type}
								<label class="flex items-center gap-2 text-xs">
									<input
										type="checkbox"
										checked={customDamageTypes.includes(type)}
										onchange={() => toggleDamageType(type)}
									/>
									{damageTypeMap[type]}
								</label>
							{/each}
						</div>
					</div>
					<div class="flex flex-col gap-1">
						<label for="custom-burden" class="text-xs font-medium text-muted-foreground"
							>Burden</label
						>
						<Select.Root type="single" bind:value={customBurden}>
							<Select.Trigger id="custom-burden" class="w-full">
								<p class="truncate">{customBurden || 'Select a burden'}</p>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="">None (use default)</Select.Item>
								<Select.Item value="0">0</Select.Item>
								<Select.Item value="1">1</Select.Item>
								<Select.Item value="2">2</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2 truncate">
								<label
									for="custom-damage-dice"
									class="text-xs font-medium text-nowrap text-muted-foreground">Damage Dice</label
								>
								{#if customDamageDice}
									<span class="truncate text-xs text-muted-foreground">({customDamageDice})</span>
								{/if}
							</div>
							<button
								type="button"
								disabled={customDamageDice === ''}
								class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:hidden"
								onclick={() => (customDamageDice = '')}
								title="Reset damage dice"
							>
								Reset
								<RotateCcw class="size-3.5" />
							</button>
						</div>
						<DicePicker value={customDamageDice} onChange={(v) => (customDamageDice = v)} />
					</div>
					<div class="flex flex-col gap-1">
						<label for="custom-damage-bonus" class="text-xs font-medium text-muted-foreground"
							>Damage Bonus</label
						>
						<Input
							id="custom-damage-bonus"
							type="number"
							inputmode="numeric"
							bind:value={customDamageBonus}
							placeholder="0"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="custom-attack-roll-bonus" class="text-xs font-medium text-muted-foreground"
							>Attack Roll Bonus</label
						>
						<Input
							id="custom-attack-roll-bonus"
							type="number"
							inputmode="numeric"
							bind:value={customAttackRollBonus}
							placeholder="0"
						/>
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

		<Collapsible.Root bind:open={whatIsWeaponsOpen} class="pt-2">
			<Collapsible.Trigger class="flex items-center gap-1">
				<ChevronRight class={cn('size-4 transition-transform', whatIsWeaponsOpen && 'rotate-90')} />
				<p class="text-sm font-medium">More info</p>
			</Collapsible.Trigger>
			<Collapsible.Content>
				<WeaponsRules class="pt-2 pl-5" />
			</Collapsible.Content>
		</Collapsible.Root>
	</div>

	{#if inventoryItem && characterCtx.canEditInventory}
		<Sheet.Footer>
			<Sheet.Close
				class={cn(buttonVariants({ size: 'sm', variant: 'link' }), 'text-destructive')}
				onclick={() => {
					if (!character) return;
					// Determine weapon type based on which inventory it's in
					characterCtx.removeFromInventory('primary_weapon', weapon_inventory_id);
				}}
			>
				Remove
			</Sheet.Close>
		</Sheet.Footer>
	{/if}
{/if}
