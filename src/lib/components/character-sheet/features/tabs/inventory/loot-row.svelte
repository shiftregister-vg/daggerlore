<script lang="ts">
	import InventoryRemoveButton from './inventory-remove-button.svelte';
	import { cn } from '$lib/utils';
	import { renderMarkdown } from '$lib/utils';
	import { getCharacterContext } from '$lib/state/character.svelte';

	let {
		inventory_id,
		class: className = '',
		onclick,
		onRemove
	}: {
		inventory_id: string;
		class?: string;
		onclick?: () => void;
		onRemove?: () => void;
	} = $props();

	const characterCtx = getCharacterContext();
	const derived_character_data = $derived(characterCtx.derived_character_data);

	// Look up the loot from inventory
	const loot = $derived(
		(derived_character_data?.inventory_loot ?? []).find((l) => l.inventory_id === inventory_id)
	);
</script>

{#if loot}
	<tr
		class={cn('cursor-pointer text-xs', className)}
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
			{loot.title}
			<InventoryRemoveButton itemName={loot.title} {onRemove} />
		</td>
		<td class="py-2 pr-4 text-right">
			{#if loot.description_html}
				<div class="line-clamp-1 text-muted-foreground">
					{@html renderMarkdown(loot.description_html)}
				</div>
			{:else}
				<span class="text-muted-foreground">—</span>
			{/if}
		</td>
	</tr>
{/if}
