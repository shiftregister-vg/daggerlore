<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		disabled = false,
		slotClasses = '',
		max,
		marked = $bindable()
	}: {
		class?: string;
		disabled?: boolean;
		slotClasses?: string;
		max: number;
		marked: number;
	} = $props();
</script>

<div class={cn('flex items-center gap-4', disabled && 'pointer-events-none', className)}>
	<div
		// {disabled}
		// onclick={() => {
		// 	marked = 0;
		// }}
		class="character-sheet-section-label text-sm font-medium"
	>
		STRESS
	</div>
	<div class="flex flex-wrap gap-2">
		{#each Array(max) as _, index}
			<button
				{disabled}
				aria-label="character.stress-slot"
				class={cn(
					'h-3.5 w-6.5 rounded-md border-2 border-muted-foreground transition-colors',
					index < marked ? 'bg-muted-foreground' : 'bg-transparent',
					slotClasses
				)}
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
