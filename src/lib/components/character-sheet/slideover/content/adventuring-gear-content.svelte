<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import CircleMinus from '@lucide/svelte/icons/circle-minus';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';

	const context = getCharacterContext();
	let character = $derived(context.character);
	let adventuringGear = $derived(character?.inventory.adventuring_gear || []);

	let newGearTitle = $state('');
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
									value={gear}
									aria-label="Adventuring gear name"
									oninput={(event) =>
										context.updateAdventuringGear(index, event.currentTarget.value)}
								/>
							{:else}
								{gear}
							{/if}
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
