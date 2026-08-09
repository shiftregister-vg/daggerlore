<script lang="ts">
	import { cn, level_to_tier } from '$lib/utils';
	import type { DamageType, TraitId, Traits } from '@domain/schemas/rules';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import RollButton from '$lib/components/dice/roll-button.svelte';
	import Hand from '@lucide/svelte/icons/hand';

	let {
		inventory_id,
		class: className = '',
		onclick
	}: {
		inventory_id: string;
		class?: string;
		onclick?: () => void;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);
	const traits = $derived(derived_character_data?.traits);

	// Check if this weapon is currently equipped.
	const isEquipped = $derived(
		derived_character_data?.derived_primary_weapon?.inventory_id === inventory_id
	);

	// Prefer the derived equipped weapon so visible rolls match active feature effects.
	const weapon = $derived(
		(isEquipped ? derived_character_data?.derived_primary_weapon : undefined) ??
			(derived_character_data?.inventory_primary_weapons ?? []).find(
				(w) => w.inventory_id === inventory_id
			)
	);

	const inventoryItem = $derived(
		(character?.inventory.primary_weapons ?? []).find((w) => w.inventory_id === inventory_id)
	);

	// Toggle equip/unequip
	function toggleEquip(e: MouseEvent) {
		e.stopPropagation();
		if (!weapon || !characterCtx.canEditInventory) return;

		if (isEquipped) {
			characterCtx.unequipItem('primary_weapon');
		} else {
			characterCtx.equipItem('primary_weapon', inventory_id);
		}
	}

	// Get current damage type and trait values from inventory choices
	const currentDamageType = $derived.by(() => {
		if (!weapon || !inventoryItem) return undefined;
		const choices = inventoryItem.choices['damage_type'];
		if (choices && choices.length > 0) {
			return choices[0] as DamageType;
		}
		return weapon.available_damage_types[0];
	});

	const currentTrait = $derived.by(() => {
		if (!weapon || !inventoryItem) return undefined;
		const choices = inventoryItem.choices['trait'];
		if (choices && choices.length > 0) {
			return choices[0] as TraitId;
		}
		return weapon.available_traits[0];
	});

	// Calculate to hit: weapon attack_roll_bonus + character trait value
	const toHit = $derived.by(() => {
		if (!weapon) return 0;
		if (!currentTrait || !traits) return weapon.attack_roll_bonus;
		const traitValue = traits[currentTrait] ?? 0;
		return weapon.attack_roll_bonus + traitValue;
	});

	const willUnequipSecondaryWeapon = $derived.by(() => {
		if (isEquipped || !weapon || !derived_character_data) return false;
		if (derived_character_data.hasCompatTrainingClassFeature) return false;
		if (!derived_character_data.derived_secondary_weapon) return false;

		const secondaryBurden = derived_character_data.derived_secondary_weapon?.burden ?? 0;
		return secondaryBurden + weapon.burden > derived_character_data.max_burden;
	});

	const equipTitle = $derived.by(() => {
		if (isEquipped) return 'Unequip';
		if (willUnequipSecondaryWeapon) return 'Equip (unequips secondary weapon)';
		return 'Equip';
	});
</script>

{#if weapon && derived_character_data}
	<tr
		class={cn('@container cursor-pointer text-xs', className)}
		onclick={(e) => {
			// Don't trigger onclick if clicking on interactive elements (but allow the row itself)
			const target = e.target as HTMLElement;
			const interactive = target.closest('button, select, input');
			if (interactive && interactive !== e.currentTarget) {
				return;
			}
			onclick?.();
		}}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onclick?.();
			}
		}}
	>
		<td class="px-4 py-2">
			<div class="flex items-center gap-1">
				{#if characterCtx.canEditInventory}
					<button
						class="group -my-2 -ml-4 self-stretch pr-1 pl-4"
						onclick={toggleEquip}
						title={equipTitle}
					>
						<div
							class="flex size-[16px] items-center justify-center rounded-full border-2 border-muted-foreground transition-colors group-hover:border-foreground"
						>
							{#if isEquipped}
								<div class="size-[8px] rounded-full bg-muted-foreground"></div>
							{/if}
						</div>
					</button>
				{/if}
				<div class="-mb-1">
					<p>{weapon.title}</p>
					<p class="flex items-center gap-1.5 text-[10px] text-muted-foreground">
						{#if weapon.burden !== 0}
							<span class="inline-flex items-center gap-0.5">
								{weapon.burden}<Hand class="size-3" />
							</span>
						{/if}
						<span>Tier {level_to_tier(weapon.level_requirement)} primary</span>
					</p>
				</div>
			</div>
		</td>
		<td class="py-2 pr-4 text-center whitespace-nowrap">{weapon.range}</td>
		<td class="py-2 pr-4 whitespace-nowrap">
			<RollButton
				type="duality"
				modifier={toHit}
				traitId={currentTrait}
				name={weapon.title}
				class="mx-auto"
			/>
		</td>
		<td class="py-2 pr-4 text-right whitespace-nowrap @lg:text-center">
			<RollButton
				name="Damage"
				class="ml-auto @lg:mx-auto"
				proficiency={derived_character_data.proficiency}
				type="base"
				diceString={weapon.damage_dice}
				modifier={weapon.damage_bonus}
				damageType={currentDamageType}
			/>
		</td>
		<td class="hidden py-2 pr-4 text-right text-xs @lg:table-cell">
			<div class="ml-auto w-min text-right">
				{weapon.features.map((f) => f.title).join(', ') || '—'}
			</div>
		</td>
	</tr>
{/if}
