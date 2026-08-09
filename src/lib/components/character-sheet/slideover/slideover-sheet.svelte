<script lang="ts" module>
	export type SlideoverContent =
		| {
				type: 'primary_weapon' | 'secondary_weapon' | 'armor' | 'consumable' | 'loot';
				inventory_id: string;
		  }
		| {
				type: 'death-move';
				isDead: boolean;
		  }
		| {
				type:
					| 'adventuring_gear'
					| 'experience'
					| 'scars-content'
					| 'sheet-customization'
					| 'catalog'
					| 'domain-card-catalog'
					| 'heritage-card-catalog'
					| 'beastform-catalog'
					| 'conditions'
					| 'downtime'
					| 'unarmored'
					| 'unarmed_attack';
		  }
		| null;
</script>

<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import PrimaryWeaponContent from './content/primary-weapon-content.svelte';
	import ArmorContent from './content/armor-content.svelte';
	import ConsumableContent from './content/consumable-content.svelte';
	import LootContent from './content/loot-content.svelte';
	import AdventuringGearContent from './content/adventuring-gear-content.svelte';
	import ExperienceContent from './content/experience-content.svelte';
	import ScarsContent from './content/scars-content.svelte';
	import ConditionsContent from './content/conditions-content.svelte';
	import CatalogContent from './content/equipment-catalog-content.svelte';
	import DomainCardContent from './content/domain-card-content.svelte';
	import HeritageCardContent from './content/heritage-card-content.svelte';
	import BeastformContent from './content/beastform-content.svelte';
	import DeathMoveContent from './content/death-move-content.svelte';
	import DowntimeContent from './content/downtime-content.svelte';
	import SheetCustomizationContent from './content/sheet-customization-content.svelte';
	import SecondaryWeaponContent from './content/secondary-weapon-content.svelte';
	import UnarmedAttackContent from './content/unarmed-attack-content.svelte';
	import UnarmoredContent from './content/unarmored-content.svelte';

	let {
		open = $bindable(false),
		content = null
	}: {
		open?: boolean;
		content?: SlideoverContent;
	} = $props();
</script>

<Sheet.Root bind:open>
	<Sheet.Content>
		{#if content?.type === 'primary_weapon'}
			<PrimaryWeaponContent weapon_inventory_id={content.inventory_id} />
		{:else if content?.type === 'secondary_weapon'}
			<SecondaryWeaponContent weapon_inventory_id={content.inventory_id} />
		{:else if content?.type === 'unarmed_attack'}
			<UnarmedAttackContent />
		{:else if content?.type === 'armor'}
			<ArmorContent armor_inventory_id={content.inventory_id} />
		{:else if content?.type === 'unarmored'}
			<UnarmoredContent />
		{:else if content?.type === 'consumable'}
			<ConsumableContent
				consumable_inventory_id={content.inventory_id}
				onRemove={() => {
					open = false;
				}}
			/>
		{:else if content?.type === 'loot'}
			<LootContent loot_inventory_id={content.inventory_id} />
		{:else if content?.type === 'adventuring_gear'}
			<AdventuringGearContent />
		{:else if content?.type === 'experience'}
			<ExperienceContent />
		{:else if content?.type === 'scars-content'}
			<ScarsContent />
		{:else if content?.type === 'sheet-customization'}
			<SheetCustomizationContent
				onRevive={() => {
					open = false;
				}}
			/>
		{:else if content?.type === 'conditions'}
			<ConditionsContent />
		{:else if content?.type === 'catalog'}
			<CatalogContent />
		{:else if content?.type === 'domain-card-catalog'}
			<DomainCardContent />
		{:else if content?.type === 'heritage-card-catalog'}
			<HeritageCardContent />
		{:else if content?.type === 'beastform-catalog'}
			<BeastformContent />
		{:else if content?.type === 'death-move'}
			<DeathMoveContent
				{open}
				isDead={content.isDead}
				onClear={() => {
					open = false;
				}}
			/>
		{:else if content?.type === 'downtime'}
			<DowntimeContent {open} />
		{/if}
	</Sheet.Content>
</Sheet.Root>
