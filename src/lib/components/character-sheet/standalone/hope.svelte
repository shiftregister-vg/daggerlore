<script lang="ts">
	import { DialogOverlay } from '$lib/components/ui/dialog';
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		disabled = false,
		max,
		marked = $bindable(),
		scars = $bindable(),
		onScarClick
	}: {
		class?: string;
		disabled?: boolean;
		max: number;
		marked: number;
		scars: number;
		onScarClick?: () => void;
	} = $props();

	const totalSlots = $derived(max + scars);
</script>

<div class={cn('flex w-min items-center justify-center gap-6', className)}>
	<div
		//  {disabled}
		// onclick={() => {
		// 	onScarClick?.();
		// }}
		class="character-sheet-section-label -mb-[1px] text-sm font-medium text-hope"
	>
		HOPE
	</div>
	<div class="flex justify-center gap-4">
		{#each Array(totalSlots) as _, index}
			{@const isScarSlot = index >= max}
			<button
				{disabled}
				aria-label={isScarSlot ? 'scar-slot' : 'hope-slot'}
				class={cn(
					'relative aspect-square h-[18px] w-[18px] rotate-45 transform rounded-[2px] border-2 border-hope transition-all duration-300',
					!isScarSlot && index < marked
						? 'bg-hope shadow-[0_0_8px_rgba(253,212,113,0.4),0_0_16px_rgba(253,212,113,0.2)]'
						: 'bg-transparent',
					isScarSlot &&
						'border-muted-foreground opacity-50 after:absolute after:top-1/2 after:left-1/2 after:h-0.5 after:w-7 after:-translate-x-1/2 after:-translate-y-1/2 after:bg-muted-foreground'
				)}
				onclick={() => {
					if (isScarSlot) {
						onScarClick?.();
						return;
					}
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
