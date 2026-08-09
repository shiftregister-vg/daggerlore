<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import type {
		PrimaryWeapon,
		SecondaryWeapon,
		Armor,
		Consumable,
		Loot,
		AdventuringGear
	} from '@domain/schemas/compendium';
	import WeaponRow from './inventory/secondary-weapon-row.svelte';
	import ArmorRow from './inventory/armor-row.svelte';
	import ConsumableRow from './inventory/consumable-row.svelte';
	import type { AdventuringGearInventoryItem } from '$lib/domain/schemas/characters';
	import LootRow from './inventory/loot-row.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { cn } from '$lib/utils';
	import Search from '@lucide/svelte/icons/search';
	import { Button } from '$lib/components/ui/button';
	import Gold from '$lib/components/character-sheet/standalone/gold.svelte';
	import PrimaryWeaponRow from './inventory/primary-weapon-row.svelte';
	import SecondaryWeaponRow from './inventory/secondary-weapon-row.svelte';
	import UnarmedAttackRow from './inventory/unarmed-attack-row.svelte';

	let {
		class: className = '',
		onAddItems = () => {},
		onItemClick = () => {},
		onAdventuringGearClick = () => {}
	}: {
		class?: string;
		onAddItems?: () => void;
		onItemClick?: (
			options:
				| {
						type: 'primary_weapon' | 'secondary_weapon' | 'armor' | 'consumable' | 'loot';
						inventory_id: string;
				  }
				| {
						type: 'unarmed_attack' | 'unarmored';
				  }
		) => void;
		onAdventuringGearClick?: () => void;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);

	let searchQuery = $state('');

	// Helper function to check if item matches search
	function matchesSearch(
		item: PrimaryWeapon | SecondaryWeapon | Armor | Consumable | Loot | AdventuringGear,
		query: string
	): boolean {
		if (!query.trim()) return true;
		const searchLower = query.toLowerCase();
		if (typeof item === 'string') {
			return item.toLowerCase().includes(searchLower);
		} else {
			return item.title.toLowerCase().includes(searchLower);
		}
	}

	function gearTitle(gear: AdventuringGearInventoryItem) {
		return typeof gear === 'string' ? gear : gear.title;
	}

	function gearQuantity(gear: AdventuringGearInventoryItem) {
		return typeof gear === 'string' ? 1 : (gear.quantity ?? 1);
	}

	// Filtered weapons and armor
	const filteredPrimaryWeapons = $derived(
		(derived_character_data?.inventory_primary_weapons ?? []).filter((weapon) =>
			matchesSearch(weapon, searchQuery)
		)
	);

	const filteredSecondaryWeapons = $derived(
		(derived_character_data?.inventory_secondary_weapons ?? []).filter((weapon) =>
			matchesSearch(weapon, searchQuery)
		)
	);

	const filteredArmor = $derived(
		(derived_character_data?.inventory_armor ?? []).filter((armor) =>
			matchesSearch(armor, searchQuery)
		)
	);

	// Filtered consumables
	const filteredConsumables = $derived(
		(derived_character_data?.inventory_consumables ?? []).filter((consumable) =>
			matchesSearch(consumable, searchQuery)
		)
	);

	// Filtered loot
	const filteredLoot = $derived(
		(derived_character_data?.inventory_loot ?? []).filter((loot) =>
			matchesSearch(loot, searchQuery)
		)
	);

	// Filtered adventuring gear (with original index)
	const filteredAdventuringGear = $derived.by(() => {
		if (!character) return [];
		return character.inventory.adventuring_gear
			.map((gear, index) => ({ gear, originalIndex: index }))
			.filter(({ gear }) => matchesSearch(gearTitle(gear), searchQuery));
	});

	const hasItems = $derived(
		(derived_character_data?.inventory_armor &&
			derived_character_data.inventory_armor.length > 0) ||
			(derived_character_data?.inventory_consumables &&
				derived_character_data.inventory_consumables.length > 0) ||
			(derived_character_data?.inventory_loot &&
				derived_character_data.inventory_loot.length > 0) ||
			(derived_character_data?.inventory_primary_weapons &&
				derived_character_data.inventory_primary_weapons.length > 0) ||
			(derived_character_data?.inventory_secondary_weapons &&
				derived_character_data.inventory_secondary_weapons.length > 0) ||
			(character?.inventory.adventuring_gear && character.inventory.adventuring_gear.length > 0)
	);
</script>

{#if character && derived_character_data}
	<div class={cn('@container flex flex-col gap-6 pt-1', className)}>
		<Gold
			bind:gold_coins={character.inventory.gold_coins}
			class="mx-4 justify-center"
			isCoinMode={!!character?.settings.use_gold_coins}
			canEdit={characterCtx.canEditInventory}
		/>

		<div class="mx-4 flex items-center gap-2">
			<!-- Search Box -->
			<div class="relative grow">
				<Search
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input bind:value={searchQuery} placeholder="Search inventory..." class="pl-9" />
			</div>
			{#if characterCtx.canEditInventory}
				<Button class="mx-4" variant="outline" onclick={onAddItems}>Add Items</Button>
			{/if}
		</div>

		{#if !hasItems}
			<p class="py-2 text-center text-sm text-muted-foreground">Your inventory is empty</p>
		{:else}
			<!-- Armor Table -->
			{#if filteredArmor.length > 0}
				<div class="flex flex-col gap-1">
					<table class="w-full border-collapse">
						<colgroup>
							<col />
							<col class="w-12" />
							<col class="w-29" />
							<col class="hidden w-20 @lg:table-column" />
						</colgroup>
						<thead>
							<tr class="border-b bg-primary-muted text-xs text-primary-foreground">
								<th class="px-4 py-2 text-left">Armor</th>
								<th class="py-2 pr-4 text-center">Slots</th>
								<th class="py-2 pr-4 text-right @lg:text-center">Base Thresholds</th>
								<th class="hidden py-2 pr-4 text-right @lg:table-cell">Features</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredArmor as armor (armor.inventory_id)}
								<ArmorRow
									inventory_id={armor.inventory_id}
									showEquipButton={true}
									onclick={() => onItemClick({ type: 'armor', inventory_id: armor.inventory_id })}
								/>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- Weapons Table -->
			{#if filteredPrimaryWeapons.length > 0 || filteredSecondaryWeapons.length > 0}
				<div class="flex flex-col gap-1">
					<table class="w-full border-collapse">
						<colgroup>
							<col />
							<col class="w-16" />
							<col class="w-18" />
							<col class="w-18" />
							<col class="hidden w-20 @lg:table-column" />
						</colgroup>
						<thead>
							<tr class="border-b bg-primary-muted text-xs text-primary-foreground">
								<th class="px-4 py-2 text-left">Weapons</th>
								<th class="py-2 pr-4 text-center">Range</th>
								<th class="py-2 pr-4 text-center">To Hit</th>
								<th class="py-2 pr-4 text-right @lg:text-center">Damage</th>
								<th class="hidden py-2 pr-4 text-right @lg:table-cell">Features</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredPrimaryWeapons as weapon (weapon.inventory_id)}
								<PrimaryWeaponRow
									inventory_id={weapon.inventory_id}
									onclick={() =>
										onItemClick({ type: 'primary_weapon', inventory_id: weapon.inventory_id })}
								/>
							{/each}
							{#each filteredSecondaryWeapons as weapon (weapon.inventory_id)}
								<SecondaryWeaponRow
									inventory_id={weapon.inventory_id}
									onclick={() =>
										onItemClick({ type: 'secondary_weapon', inventory_id: weapon.inventory_id })}
								/>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- Consumables Table -->
			{#if filteredConsumables.length > 0}
				<div class="flex flex-col gap-1">
					<table class="w-full border-collapse">
						<colgroup>
							<col class="w-[55%]" />
							<col class="w-14" />
							<col />
						</colgroup>
						<thead>
							<tr class="border-b bg-primary-muted text-xs text-primary-foreground">
								<th class="px-4 py-2 text-left">Consumables</th>
								<th class="py-2 pr-4 text-center">Qty</th>
								<th class="py-2 pr-4 text-right">Description</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredConsumables as consumable (consumable.inventory_id)}
								<ConsumableRow
									inventory_id={consumable.inventory_id}
									onclick={() =>
										onItemClick({ type: 'consumable', inventory_id: consumable.inventory_id })}
								/>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- Loot Table -->
			{#if filteredLoot.length > 0}
				<div class="flex flex-col gap-1">
					<table class="w-full border-collapse">
						<colgroup>
							<col />
							<col />
						</colgroup>
						<thead>
							<tr class="border-b bg-primary-muted text-xs text-primary-foreground">
								<th class="px-4 py-2 text-left">Loot</th>
								<th class="py-2 pr-4 text-right">Description</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredLoot as loot (loot.inventory_id)}
								<LootRow
									inventory_id={loot.inventory_id}
									onclick={() => onItemClick({ type: 'loot', inventory_id: loot.inventory_id })}
								/>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- Adventuring Gear -->
			{#if filteredAdventuringGear.length > 0}
				<div class="flex flex-col gap-1">
					<table class="w-full border-collapse">
						<colgroup>
							<col class="w-[55%]" />
							<col class="w-14" />
							<col />
						</colgroup>
						<thead>
							<tr class="border-b bg-primary-muted text-xs text-primary-foreground">
								<th class="px-4 py-2 text-left">Adventuring Gear</th>
								<th class="py-2 pr-4 text-center">Qty</th>
								<th class="py-2 pr-4"></th>
							</tr>
						</thead>
						<tbody>
							{#each filteredAdventuringGear as { gear, originalIndex } (originalIndex)}
								<tr
									class="cursor-pointer text-xs"
									onclick={() => onAdventuringGearClick()}
									role="button"
									tabindex="0"
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											onAdventuringGearClick();
										}
									}}
								>
									<td class="px-4 py-2">{gearTitle(gear)}</td>
									<td class="py-2 pr-4 text-center font-medium text-foreground">
										{gearQuantity(gear)}
									</td>
									<td class="py-2 pr-4"></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			{#if searchQuery.trim() && filteredPrimaryWeapons.length === 0 && filteredSecondaryWeapons.length === 0 && filteredArmor.length === 0 && filteredConsumables.length === 0 && filteredLoot.length === 0 && filteredAdventuringGear.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground">No results</p>
			{/if}
		{/if}
	</div>
{/if}
