<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import type {
		PrimaryWeapon,
		SecondaryWeapon,
		Armor,
		Consumable,
		AdventuringGear,
		Loot
	} from '@domain/schemas/compendium';
	import Dropdown from '$lib/components/utility/dropdown.svelte';
	import type { AdventuringGearInventoryItem } from '$lib/domain/schemas/characters';
	import ArmorDetails from '$lib/components/compendium-items/equipment/armor-details.svelte';
	import ConsumableDetails from '$lib/components/compendium-items/equipment/consumable-details.svelte';
	import LootDetails from '$lib/components/compendium-items/equipment/loot-details.svelte';
	import PrimaryWeaponDetails from '$lib/components/compendium-items/equipment/primary-weapon-details.svelte';
	import SecondaryWeaponDetails from '$lib/components/compendium-items/equipment/secondary-weapon-details.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { cn, level_to_tier } from '$lib/utils';
	import CircleMinus from '@lucide/svelte/icons/circle-minus';
	import Search from '@lucide/svelte/icons/search';

	const characterCtx = getCharacterContext();
	const compendium = $derived(characterCtx.character_compendium);
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);

	let searchQuery = $state('');

	// Helper function to check if item matches search
	function matchesSearch(
		item: PrimaryWeapon | SecondaryWeapon | Armor | Consumable | Loot | string,
		query: string
	): boolean {
		if (!query) return true;
		const searchLower = query.toLowerCase();

		if (typeof item === 'string') {
			return item.toLowerCase().includes(searchLower);
		}

		const titleMatch = item.title.toLowerCase().includes(searchLower);
		const descMatch = item.description_html.toLowerCase().includes(searchLower);
		return titleMatch || descMatch;
	}

	function gearTitle(gear: AdventuringGearInventoryItem) {
		return typeof gear === 'string' ? gear : gear.title;
	}

	function gearQuantity(gear: AdventuringGearInventoryItem) {
		return typeof gear === 'string' ? 1 : (gear.quantity ?? 1);
	}

	// Filtered weapons and armor
	const filteredWeapons = $derived([
		...(derived_character_data?.inventory_primary_weapons ?? [])
			.filter((weapon) => matchesSearch(weapon, searchQuery))
			.map((w) => ({
				type: 'primary_weapon' as const,
				weapon: w
			})),
		...(derived_character_data?.inventory_secondary_weapons ?? [])
			.filter((weapon) => matchesSearch(weapon, searchQuery))
			.map((w) => ({
				type: 'secondary_weapon' as const,
				weapon: w
			}))
	]);

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

	// Filtered adventuring gear
	const filteredAdventuringGear = $derived(
		character?.inventory.adventuring_gear
			.map((gear, index) => ({ gear, index }))
			.filter(({ gear }) => matchesSearch(gearTitle(gear), searchQuery)) || []
	);

	const hasItems = $derived(
		!derived_character_data ||
			!character ||
			derived_character_data.inventory_primary_weapons.length > 0 ||
			derived_character_data.inventory_secondary_weapons.length > 0 ||
			derived_character_data.inventory_armor.length > 0 ||
			character.inventory.consumables.length > 0 ||
			character.inventory.adventuring_gear.length > 0
	);
</script>

{#if character && derived_character_data}
	<div class="flex flex-col gap-4">
		{#if !hasItems}
			<p class="py-4 text-center text-sm text-muted-foreground">Your inventory is empty</p>
		{:else}
			<!-- Search Box -->
			<div class="relative mb-2">
				<Search
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input bind:value={searchQuery} placeholder="Search inventory..." class="pl-9" />
			</div>

			{#if filteredWeapons.length > 0}
				<div class="flex flex-col gap-1">
					<p class="ml-2 font-medium">Weapons</p>

					{#each filteredWeapons as { type, weapon } (weapon.inventory_id)}
						{@const equipped =
							character.active_primary_weapon_inventory_id === weapon.inventory_id ||
							character.active_secondary_weapon_inventory_id === weapon.inventory_id}
						{#snippet subtitle_snippet()}
							<div class="flex items-center gap-2">
								{#if equipped}
									<span class="text-xs text-muted-foreground italic">Equipped</span>
								{:else}
									{@const canEquipItem = character.level >= weapon.level_requirement}
									<Button
										size="sm"
										onclick={(e) => {
											e.stopPropagation();
											if (canEquipItem) characterCtx.equipItem(type, weapon.inventory_id);
										}}
										title={canEquipItem ? undefined : 'Level requirement not met'}
										class={cn(!canEquipItem && 'cursor-not-allowed opacity-50 hover:bg-primary')}
									>
										Equip
									</Button>
								{/if}
							</div>
						{/snippet}

						{#snippet title_snippet()}
							<div class="gap-4 text-left">
								<p class="text-md font-medium">
									{weapon.title}
								</p>
								<p class="truncate text-[10px] leading-none text-muted-foreground italic">
									Tier {level_to_tier(weapon.level_requirement)}
									{type === 'primary_weapon' ? 'Primary' : 'Secondary'} Weapon
								</p>
							</div>
						{/snippet}

						<Dropdown {title_snippet} {subtitle_snippet} class="border-2">
							{#if type === 'primary_weapon'}
								<PrimaryWeaponDetails {weapon} />
							{:else}
								<SecondaryWeaponDetails {weapon} />
							{/if}
							<div class="mt-1 -mb-2 flex justify-center sm:justify-end">
								{#if equipped}
									<Button
										variant="outline"
										size="sm"
										onclick={() => characterCtx.unequipItem(type)}
									>
										Unequip
									</Button>
								{/if}
								<Button
									variant="link"
									class="text-destructive"
									onclick={() => characterCtx.removeFromInventory(type, weapon.inventory_id)}
								>
									Remove
								</Button>
							</div>
						</Dropdown>
					{/each}
				</div>
			{/if}

			{#if filteredArmor.length > 0}
				<div class="flex flex-col gap-1">
					<p class="ml-2 font-medium">Armor</p>

					{#each filteredArmor as armor (armor.inventory_id)}
						{@const equipped = character.active_armor_inventory_id === armor.inventory_id}

						{#snippet subtitle_snippet()}
							<div class="flex items-center gap-2">
								{#if equipped}
									<span class="text-xs text-muted-foreground italic">Equipped</span>
								{:else}
									{@const canEquipItem = character.level >= armor.level_requirement}
									<Button
										size="sm"
										onclick={(e) => {
											e.stopPropagation();
											if (canEquipItem) characterCtx.equipItem('armor', armor.inventory_id);
										}}
										disabled={!canEquipItem}
										title={canEquipItem ? undefined : 'Level requirement not met'}
									>
										Equip
									</Button>
								{/if}
							</div>
						{/snippet}

						{#snippet title_snippet()}
							<div class="gap-4 text-left">
								<p class="text-md font-medium">
									{armor.title}
								</p>
								<p class="truncate text-[10px] leading-none text-muted-foreground italic">
									Tier {level_to_tier(armor.level_requirement)} Armor
								</p>
							</div>
						{/snippet}

						<Dropdown {title_snippet} {subtitle_snippet} class="border-2">
							<ArmorDetails {armor} />
							<div class="mt-1 -mb-2 flex justify-center sm:justify-end">
								{#if equipped}
									<Button
										variant="outline"
										size="sm"
										onclick={() => characterCtx.unequipItem('armor')}
									>
										Unequip
									</Button>
								{/if}
								<Button
									variant="link"
									class="text-destructive"
									onclick={() => characterCtx.removeFromInventory('armor', armor.inventory_id)}
								>
									Remove
								</Button>
							</div>
						</Dropdown>
					{/each}
				</div>
			{/if}

			{#if filteredConsumables.length > 0}
				<div class="flex flex-col gap-1">
					<p class="ml-2 font-medium">Consumables</p>

					{#each filteredConsumables as consumable (consumable.inventory_id)}
						{#snippet title_snippet()}
							<div class="gap-4 text-left">
								<p class="text-md flex items-center gap-2 font-medium">
									<span>{consumable.title}</span>
									{#if consumable.quantity > 1}
										<span class="text-xs text-muted-foreground">x{consumable.quantity}</span>
									{/if}
								</p>
							</div>
						{/snippet}

						<Dropdown {title_snippet} class="border-2">
							<ConsumableDetails {consumable} />
							<div class="mt-1 -mb-2 flex justify-center sm:justify-end">
								<Button
									variant="link"
									class="text-destructive"
									onclick={() =>
										characterCtx.removeFromInventory('consumable', consumable.inventory_id)}
								>
									Remove
								</Button>
							</div>
						</Dropdown>
					{/each}
				</div>
			{/if}

			{#if filteredAdventuringGear.length > 0}
				<div class="flex flex-col gap-1">
					<p class="ml-2 font-medium">Adventuring Gear</p>

					<ul class="">
						{#each filteredAdventuringGear as { gear, index } (index)}
							<li class="flex items-center text-sm text-muted-foreground">
								<span class="mr-3 ml-4">•</span>
								<span>{gearTitle(gear)}</span>
								{#if gearQuantity(gear) > 1}
									<span class="ml-2 text-xs font-medium text-foreground">x{gearQuantity(gear)}</span>
								{/if}
								<Button
									variant="link"
									class="ml-auto h-auto py-1 text-foreground"
									onclick={() => characterCtx.removeAdventuringGear(index)}
								>
									<CircleMinus class="size-4" />
								</Button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if searchQuery.trim() && filteredWeapons.length === 0 && filteredArmor.length === 0 && filteredConsumables.length === 0 && filteredAdventuringGear.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground">No results</p>
			{/if}
		{/if}
	</div>
{/if}
