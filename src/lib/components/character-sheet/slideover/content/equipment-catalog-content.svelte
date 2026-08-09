<script lang="ts">
	import EquipmentCatalog from '$lib/components/catalogs/equipment-catalog.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import { getCharacterContext } from '$lib/state/character.svelte';

	const characterCtx = getCharacterContext();
	const derived_character_data = $derived(characterCtx.derived_character_data);
</script>

{#if derived_character_data && characterCtx.canEditInventory}
	<Sheet.Header>
		<Sheet.Title>Add Items</Sheet.Title>
		<Sheet.Description>Browse and add items to your inventory</Sheet.Description>
	</Sheet.Header>

	<div class="overflow-y-auto px-4 pb-6">
		<EquipmentCatalog
			onSelect={characterCtx.addToInventory}
			compendium={characterCtx.character_compendium}
			available_source_keys={characterCtx.available_source_keys}
			sources={characterCtx.sources}
			disable_consumables={derived_character_data.consumable_count >=
				derived_character_data.max_consumables}
		/>
	</div>
{/if}
