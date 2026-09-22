<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';

	let {
		label,
		count,
		values = [],
		onchange = () => {},
		disabled = false,
		compact = false
	}: {
		label: string;
		count: number;
		values?: string[];
		onchange?: (values: string[]) => void;
		disabled?: boolean;
		compact?: boolean;
	} = $props();

	function setValue(index: number, value: string) {
		const nextValues = [...values];
		nextValues[index] = value;
		onchange(nextValues);
	}
</script>

<fieldset class="flex flex-col gap-1" aria-label={label}>
	<legend class={compact ? 'text-[10px] font-bold text-black' : 'text-xs font-bold text-black'}>
		{label}
	</legend>
	{#each Array(count) as _, index (index)}
		<Input
			value={values[index] ?? ''}
			{disabled}
			aria-label={`${label} ${index + 1}`}
			class={compact
				? 'h-6 border-black/30 bg-white px-2 py-0 text-[10px] text-black disabled:opacity-100'
				: 'h-8 border-black/30 bg-white text-sm text-black disabled:opacity-100'}
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
			oninput={(event) => setValue(index, event.currentTarget.value)}
		/>
	{/each}
</fieldset>
