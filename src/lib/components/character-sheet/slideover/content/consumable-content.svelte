<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { cn } from '$lib/utils';
	import { renderMarkdown } from '$lib/utils';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ConsumableRules from '$lib/components/rule-snippets/consumable-rules.svelte';
	import HomebrewBadge from '$lib/components/decorations/badges/homebrew-badge.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import CampaignBadge from '$lib/components/decorations/badges/campaign-badge.svelte';

	let { consumable_inventory_id }: { consumable_inventory_id: string } = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);

	let whatIsConsumablesOpen = $state(false);
	let customizeOpen = $state(false);

	// Get consumable from inventory
	let consumable = $derived(
		derived_character_data?.inventory_consumables.find(
			(c) => c.inventory_id === consumable_inventory_id
		)
	);

	// Get the inventory item
	let inventoryItem = $derived(
		character?.inventory.consumables.find((c) => c.inventory_id === consumable_inventory_id)
	);

	// Form state - initialized from inventory item
	let customName = $state('');
	let customDescription = $state('');

	// Derived value for is save button disabled (if customizations match the existing consumable)
	let isSaveDisabled = $derived.by(() => {
		if (!consumable || !inventoryItem) return false;

		const formName = customName.trim();
		const savedName = (inventoryItem.custom_title ?? '').trim();
		const formDescription = customDescription.trim();
		const savedDescription = (inventoryItem.custom_description ?? '').trim();
		return formName === savedName && formDescription === savedDescription;
	});

	// Check if there are any customizations on the inventory item
	let hasCustomizations = $derived.by(() => {
		if (!inventoryItem) return false;
		return (
			inventoryItem.custom_title !== undefined || inventoryItem.custom_description !== undefined
		);
	});

	// Update form when inventory item changes
	$effect(() => {
		if (inventoryItem) {
			customName = inventoryItem.custom_title ?? '';
			customDescription = inventoryItem.custom_description ?? '';
		} else {
			customName = '';
			customDescription = '';
		}
	});

	function handleSave() {
		if (!character || !inventoryItem || !consumable_inventory_id) return;

		// Update name (always valid - empty becomes undefined)
		const trimmedName = customName.trim();
		inventoryItem.custom_title = trimmedName || undefined;
		// Update description (always valid - empty becomes undefined)
		const trimmedDescription = customDescription.trim();
		inventoryItem.custom_description = trimmedDescription || undefined;
	}

	function handleClear() {
		customName = '';
		customDescription = '';
		handleSave();
	}
</script>

{#if consumable}
	<Sheet.Header>
		<Sheet.Title>{consumable.title}</Sheet.Title>
		<p class="flex items-center gap-1.5 text-xs text-muted-foreground italic">
			{#if consumable.source_key === 'Homebrew'}
				<HomebrewBadge class="-mt-0.5 size-4" />
			{:else if consumable.source_key === 'Campaign'}
				<CampaignBadge class="-mt-0.5 size-4" />
			{/if}
			Consumable
		</p>
	</Sheet.Header>

	<div class="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
		<!-- Description -->
		<div class="rounded-lg border bg-primary/5 px-4 py-3">
			<p class="text-sm">Description</p>
			{#if (consumable.description_html || '').trim().length > 0}
				<div class="mt-3">
					<div class="border-l-2 border-accent/30 pl-3">
						<p class="text-xs text-muted-foreground">
							{@html renderMarkdown(consumable.description_html)}
						</p>
					</div>
				</div>
			{:else}
				<p class="mt-2 text-right text-xs text-muted-foreground italic">None</p>
			{/if}
		</div>

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
						<Input id="custom-name" bind:value={customName} placeholder="Name" />
					</div>
					<div class="flex flex-col gap-1">
						<label for="custom-description" class="text-xs font-medium text-muted-foreground"
							>Description</label
						>
						<Textarea
							id="custom-description"
							bind:value={customDescription}
							placeholder="Description"
							class="min-h-24"
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

		<Collapsible.Root bind:open={whatIsConsumablesOpen} class="pt-2">
			<Collapsible.Trigger class="flex items-center gap-1">
				<ChevronRight
					class={cn('size-4 transition-transform', whatIsConsumablesOpen && 'rotate-90')}
				/>
				<p class="text-sm font-medium">More info</p>
			</Collapsible.Trigger>
			<Collapsible.Content>
				<ConsumableRules class="pt-2 pl-5" />
			</Collapsible.Content>
		</Collapsible.Root>
	</div>

	{#if characterCtx.canEditInventory}
		<Sheet.Footer>
			<Sheet.Close
				class={cn(buttonVariants({ size: 'sm', variant: 'link' }), 'text-destructive')}
				onclick={() => {
					characterCtx.removeFromInventory('consumable', consumable_inventory_id);
				}}
			>
				Remove
			</Sheet.Close>
		</Sheet.Footer>
	{/if}
{/if}
