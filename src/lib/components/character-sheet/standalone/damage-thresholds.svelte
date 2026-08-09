<script lang="ts">
	import { cn } from '$lib/utils';
	import type { DamageThresholds } from '@domain/schemas/rules';

	let {
		class: className = '',
		thresholds,
		massive_damage = false
	}: { class?: string; thresholds: DamageThresholds; massive_damage?: boolean } = $props();
</script>

<div class={cn('@container relative w-full max-w-[360px] text-muted-foreground', className)}>
	{#if massive_damage}
		<div
			class="absolute -bottom-[32px] left-1/2 w-[42%] min-w-[132px] -translate-x-1/2 text-primary"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60.472 903.307 879.245 226.772">
				<g>
					<path
						d="M 0.250000,1122.519685 A 0.250000,0.250000 0.000000 0, 0 -0.250000,1122.519685 A 0.250000,0.250000 0.000000 0, 0 0.250000,1122.519685 z"
						style="fill:none;stroke:#000000"
					/>
					<path
						d="M 278.589734,995.849882 L 278.589734,1075.331220 L 318.330403,1035.590551 L 278.589734,995.849882 z"
						style="fill: currentcolor;"
					/>
					<path
						d="M -60.472 903.307 L 818.773 903.307 L 750.742 971.338 L 750.742 1092.283 L 758.301 1099.842 L 758.301 1130.078 L 728.065 1130.078 L 720.506 1122.519 L 37.796 1122.519 L 30.237 1130.078 L 0.001 1130.078 L 0.001 1099.842 L 7.56 1092.283 L 7.56 971.338 Z M 22.677 963.78 L 22.677 1107.402 L 278.59 1107.402 L 350.401 1035.591 L 278.59 963.78 Z"
						style="fill: currentcolor;"
					/>
				</g>
			</svg>
			<div
				class="absolute top-[30%] right-[13%] text-center text-[clamp(0.55rem,3.3cqw,0.75rem)] leading-none font-bold text-foreground"
			>
				<p>MASSIVE</p>
			</div>
			<div
				class="absolute top-[23%] left-[16%] text-[clamp(0.75rem,4.4cqw,1rem)] font-bold text-foreground"
			>
				<p>{thresholds.severe * 2}</p>
			</div>
		</div>
	{/if}

	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 416.79 47.33" class="relative w-full">
		<path
			style="fill: currentcolor;"
			d="M 0 0 L 0 9.466 L 3.057 12.239 L 2.956 35.293 L 0 37.864 L 0 47.33 L 9.262 47.33 L 12.018 44.578 L 89.967 44.476 L 92.62 47.33 L 101.882 47.33 L 101.882 37.864 L 99.232 35.798 L 98.926 11.833 L 101.882 9.466 L 101.882 0 M 101.882 0 L 92.62 0 L 89.942 3.465 L 11.305 2.854 L 9.262 0 L 0 0"
		/>
		<path
			style="stroke-width: 1; fill: currentcolor;"
			d="M 157.454 0 L 157.454 9.466 L 173.182 23.707 L 157.454 37.864 L 157.454 47.33 L 166.716 47.33 L 169.472 44.578 L 247.421 44.476 L 250.074 47.33 L 259.336 47.33 L 259.336 37.864 L 256.686 35.798 L 256.38 11.833 L 259.336 9.466 L 259.336 0 M 259.336 0 L 250.074 0 L 247.396 3.465 L 168.759 2.854 L 166.716 0 L 157.454 0"
		/>
		<path
			style="stroke-width: 1; fill: currentcolor;"
			d="M 314.908 0 L 314.908 9.466 L 330.636 23.707 L 314.908 37.864 L 314.908 47.33 L 324.17 47.33 L 326.926 44.578 L 404.875 44.476 L 407.528 47.33 L 416.79 47.33 L 416.79 37.864 L 414.14 35.798 L 413.834 11.833 L 416.79 9.466 L 416.79 0 M 416.79 0 L 407.528 0 L 404.85 3.465 L 326.213 2.854 L 324.17 0 L 314.908 0"
		/>
		<rect
			x="95.648"
			y="8.145"
			width="237.784"
			height="31.133"
			style="fill: none; stroke: currentcolor; stroke-width: 2px;"
		/>
		<path
			d="M 240.995 20.365 L 248.976 29.107 L 233.014 29.107 L 240.995 20.365 Z"
			style="fill: currentcolor; transform-box: fill-box; transform-origin: 50% 50%;"
			transform="matrix(0, 1, -1, 0, -78.650029, -1.41727)"
		/>
		<path
			d="M 240.995 20.365 L 248.976 29.107 L 233.014 29.107 L 240.995 20.365 Z"
			style="fill: currentcolor; stroke-width: 1; transform-origin: 240.995px 24.736px;"
			transform="matrix(0, 1, -1, 0, 78.284009, -1.179897)"
		/>
	</svg>

	<div
		class="absolute top-[17%] left-[12.25%] -translate-x-1/2 text-center text-[clamp(0.55rem,3.3cqw,0.75rem)] leading-none font-bold text-background"
	>
		<p class="mb-[2px]">MINOR</p>
		<p>DAMAGE</p>
	</div>

	<div
		class="absolute top-[17%] left-1/2 -translate-x-1/2 text-center text-[clamp(0.55rem,3.3cqw,0.75rem)] leading-none font-bold text-background"
	>
		<p class="mb-[2px]">MAJOR</p>
		<p>DAMAGE</p>
	</div>
	<div
		class="absolute top-[17%] left-[87.75%] -translate-x-1/2 text-center text-[clamp(0.55rem,3.3cqw,0.75rem)] leading-none font-bold text-background"
	>
		<p class="mb-[2px]">SEVERE</p>
		<p>DAMAGE</p>
	</div>

	<div
		class="absolute top-[17%] left-[31.1%] -translate-x-1/2 text-[clamp(0.75rem,4.4cqw,1rem)] font-bold text-foreground"
	>
		<p>{thresholds.major}</p>
	</div>
	<div
		class="absolute top-[17%] left-[68.9%] -translate-x-1/2 text-[clamp(0.75rem,4.4cqw,1rem)] font-bold text-foreground"
	>
		<p>{thresholds.severe}</p>
	</div>
</div>
