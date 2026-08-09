<script lang="ts">
	import { cn, level_to_tier } from '$lib/utils';
	import Shield from '@lucide/svelte/icons/shield';
	import { getCharacterContext } from '$lib/state/character.svelte';

	let {
		inventory_id,
		showEquipButton = false,
		class: className = '',
		onclick
	}: {
		inventory_id: string;
		showEquipButton?: boolean;
		class?: string;
		onclick?: () => void;
	} = $props();

	const characterCtx = getCharacterContext();
	const derived_character_data = $derived(characterCtx.derived_character_data);

	// Look up the armor from inventory
	const armor = $derived(
		(derived_character_data?.inventory_armor ?? []).find((a) => a.inventory_id === inventory_id)
	);

	// Check if this armor is currently equipped
	const isEquipped = $derived(derived_character_data?.derived_armor?.inventory_id === inventory_id);

	// Toggle equip/unequip
	function toggleEquip(e: MouseEvent) {
		e.stopPropagation();
		if (!armor || !characterCtx.canEditInventory) return;
		if (isEquipped) {
			characterCtx.unequipItem('armor');
		} else {
			characterCtx.equipItem('armor', inventory_id);
		}
	}
</script>

{#if armor}
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
				{#if showEquipButton && characterCtx.canEditInventory}
					<button
						class="group -my-2 -ml-4 self-stretch pr-1 pl-4"
						onclick={toggleEquip}
						title={isEquipped ? 'Unequip' : 'Equip'}
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
					<p>{armor.title}</p>
					<p class="text-[10px] text-muted-foreground">
						Tier {level_to_tier(armor.level_requirement)}
					</p>
				</div>
			</div>
		</td>
		<td class="py-2 pr-4 whitespace-nowrap">
			<div class="mx-auto flex w-min items-center gap-1 rounded-full text-xs leading-none">
				{armor.max_armor}<Shield class="size-3.5" />
			</div>
		</td>
		<td class="py-2 pr-4 text-right whitespace-nowrap @lg:text-center">
			<div class="ml-auto w-min rounded-full text-xs @lg:mx-auto">
				{armor.damage_thresholds.major} / {armor.damage_thresholds.severe}
			</div>
		</td>
		<td class="hidden py-2 pr-4 text-right text-xs @lg:table-cell">
			<div class="ml-auto w-min text-right">
				{armor.features.map((f) => f.title).join(', ') || '—'}
			</div>
		</td>
	</tr>
{/if}
