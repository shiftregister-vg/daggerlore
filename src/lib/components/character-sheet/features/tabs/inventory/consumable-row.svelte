<script lang="ts">
	import { cn } from '$lib/utils';
	import { renderMarkdown } from '$lib/utils';
	import { getCharacterContext } from '$lib/state/character.svelte';

	let {
		inventory_id,
		class: className = '',
		onclick
	}: { inventory_id: string; class?: string; onclick?: () => void } = $props();

	const characterCtx = getCharacterContext();
	const derived_character_data = $derived(characterCtx.derived_character_data);

	// Look up the consumable from inventory
	const consumable = $derived(
		(derived_character_data?.inventory_consumables ?? []).find(
			(c) => c.inventory_id === inventory_id
		)
	);

</script>

{#if consumable}
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
			{consumable.title}
		</td>
		<td class="py-2 pr-4 text-center font-medium text-foreground">
			{consumable.quantity}
		</td>
		<td class="py-2 pr-4 text-right">
			{#if consumable.description_html}
				<div class="line-clamp-1 text-muted-foreground">
					{@html renderMarkdown(consumable.description_html)}
				</div>
			{:else}
				<span class="text-muted-foreground">—</span>
			{/if}
		</td>
	</tr>
{/if}
