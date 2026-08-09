<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		marked = $bindable(),
		max,
		disabled = false
	}: { class?: string; marked: number; max: number; disabled?: boolean } = $props();
</script>

<div class={cn('relative flex items-center gap-4', className)}>
	<div
		// {disabled}
		// onclick={() => {
		// 	marked = 0;
		// }}
		class="character-sheet-section-label text-sm font-medium"
	>
		HP
	</div>
	<div class="flex flex-wrap gap-2">
		{#each Array(max) as _, index}
			<button
				{disabled}
				aria-label="hp-slot"
				class="h-3.5 w-6.5 rounded-md border-2 border-muted-foreground {index < marked
					? 'bg-muted-foreground'
					: 'bg-transparent'} transition-colors"
				onclick={() => {
					if (index >= marked) {
						marked = Math.min(max, index + 1);
					} else {
						marked = index;
					}
				}}
				type="button"
			></button>
		{/each}
	</div>
</div>
