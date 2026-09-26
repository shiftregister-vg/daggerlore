<script lang="ts">
	let { itemName, onRemove }: { itemName: string; onRemove?: () => void } = $props();
</script>

{#if onRemove}
	<button
		type="button"
		class="mt-1 block min-h-9 rounded px-2 text-xs text-destructive hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-ring"
		aria-label={`Remove ${itemName}`}
		onclick={(event) => {
			event.stopPropagation();
			onRemove?.();
		}}
		onkeydown={(event) => event.stopPropagation()}
	>
		Remove
	</button>
{/if}
