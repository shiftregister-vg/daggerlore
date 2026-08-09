<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Dialog from '$lib/components/ui/dialog';
	import CircleMinus from '@lucide/svelte/icons/circle-minus';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';

	const context = getCharacterContext();
	let character = $derived(context.character);
	let adventuringGear = $derived(character?.inventory.adventuring_gear || []);

	let newGearTitle = $state('');
	let removeLastGear = $state<{ index: number; title: string } | null>(null);

	function gearTitle(gear: (typeof adventuringGear)[number]) {
		return typeof gear === 'string' ? gear : gear.title;
	}

	function gearQuantity(gear: (typeof adventuringGear)[number]) {
		return typeof gear === 'string' ? 1 : (gear.quantity ?? 1);
	}

	function decrementQuantity(index: number, gear: (typeof adventuringGear)[number]) {
		const quantity = gearQuantity(gear);
		if (quantity > 1) {
			context.setAdventuringGearQuantity(index, quantity - 1);
			return;
		}

		removeLastGear = { index, title: gearTitle(gear) };
	}

	function removeLastAdventuringGear() {
		if (!removeLastGear) return;

		context.removeAdventuringGear(removeLastGear.index);
		removeLastGear = null;
	}
</script>

<Sheet.Header>
	<Sheet.Title>Adventuring Gear</Sheet.Title>
</Sheet.Header>

<div class="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
	<!-- Add New Gear Section -->
	{#if context.canEditInventory}
		<div class="flex items-center gap-2">
			<Input
				bind:value={newGearTitle}
				placeholder="Enter gear name..."
				class="flex-1"
				onkeydown={(e) => {
					if (e.key === 'Enter' && newGearTitle.trim()) {
						context.addToInventory({ type: 'adventuring_gear', title: newGearTitle.trim() });
						newGearTitle = '';
					}
				}}
			/>
			<Button
				size="sm"
				disabled={!newGearTitle.trim()}
				onclick={() => {
					if (newGearTitle.trim()) {
						context.addToInventory({ type: 'adventuring_gear', title: newGearTitle.trim() });
						newGearTitle = '';
					}
				}}
			>
				Add
			</Button>
		</div>
	{/if}

	{#if adventuringGear.length > 0}
		<table class="w-full border-collapse text-sm">
			<tbody>
				{#each adventuringGear as gear, index}
					<tr class="border-b">
						<td class="py-2 pr-2 text-left text-muted-foreground">
							{#if context.canEditInventory}
								<Input
									value={gearTitle(gear)}
									aria-label="Adventuring gear name"
									oninput={(event) =>
										context.updateAdventuringGear(index, event.currentTarget.value)}
								/>
							{:else}
								{gearTitle(gear)}
							{/if}
						</td>
						<td class="w-28 py-2 pr-2">
							<div class="flex items-center justify-end gap-2">
								{#if context.canEditInventory}
									<Button
										type="button"
										variant="outline"
										size="icon"
										aria-label={`Decrease ${gearTitle(gear)} quantity`}
										onclick={() => decrementQuantity(index, gear)}
									>
										<Minus class="size-4" />
									</Button>
								{/if}
								<span class="min-w-8 text-center font-semibold">{gearQuantity(gear)}</span>
								{#if context.canEditInventory}
									<Button
										type="button"
										variant="outline"
										size="icon"
										aria-label={`Increase ${gearTitle(gear)} quantity`}
										onclick={() => context.setAdventuringGearQuantity(index, gearQuantity(gear) + 1)}
									>
										<Plus class="size-4" />
									</Button>
								{/if}
							</div>
						</td>
						<td class="py-2 text-right">
							{#if context.canEditInventory}
								<Button
									variant="ghost"
									size="sm"
									class="h-auto"
									onclick={() => context.removeAdventuringGear(index)}
								>
									<CircleMinus class="size-3.5" />
								</Button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p class="py-4 text-center text-sm text-muted-foreground italic">No adventuring gear</p>
	{/if}
</div>

{#if removeLastGear}
	<Dialog.Root
		open={removeLastGear !== null}
		onOpenChange={(open) => {
			if (!open) removeLastGear = null;
		}}
	>
		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Remove Adventuring Gear?</Dialog.Title>
				<Dialog.Description>
					Reducing {removeLastGear.title} to zero will remove it from your inventory.
				</Dialog.Description>
			</Dialog.Header>

			<Dialog.Footer class="flex gap-3">
				<Button type="button" variant="outline" onclick={() => (removeLastGear = null)}>
					Cancel
				</Button>
				<Button type="button" variant="destructive" onclick={removeLastAdventuringGear}>
					Remove
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
