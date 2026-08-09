<script lang="ts">
	import { cn } from '$lib/utils';
	import Shield from '@lucide/svelte/icons/shield';

	let {
		class: className = '',
		disabled = false,
		max,
		marked = $bindable()
	}: { class?: string; disabled?: boolean; max: number; marked: number } = $props();
</script>

<div class={cn('flex h-min gap-3 rounded-md  text-center', className)}>
	<div class="relative">
		<svg
			class="size-20 text-primary"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 51.575 55.426"
		>
			<g transform="matrix(1, 0, 0, 1, -109.896004, -123.573997)">
				<path
					d="M 117.388 139.531 L 153.979 139.531 C 154.719 140.485 155.133 141.02 155.872 141.974 L 160.813 148.699 L 157.839 160.777 C 157.099 161.731 153.736 162.266 152.996 163.22 L 118.371 163.22 C 117.631 162.266 114.268 161.731 113.528 160.777 L 110.554 148.699 L 115.494 141.974 C 116.234 141.02 116.648 140.485 117.388 139.531"
					fill="currentColor"
					style="stroke-width: 0.1;"
				/>
				<path
					d="M 133.306 177.296 L 128.501 174.973 C 121.995 170.85 117.036 163.728 115.187 155.894 L 111.594 140.698 L 123.222 124.325 L 123.748 124.812 C 126.907 127.637 131.104 129.196 135.559 129.196 C 140.014 129.196 144.21 127.637 147.374 124.807 L 147.896 124.327 L 159.523 140.698 L 155.929 155.894 C 154.079 163.729 149.12 170.85 142.664 174.946 L 137.801 177.3 L 135.532 178.441"
					fill="var(--background)"
					style="stroke-width: 0.1;"
				/>
				<path
					d="M 123.142 123.574 L 122.485 124.5 L 111.318 140.224 L 111.056 140.593 L 111.16 141.033 L 114.7 156.008 C 116.579 163.968 121.62 171.204 128.184 175.368 L 128.233 175.399 L 128.284 175.424 L 133.099 177.752 L 135.078 178.768 L 135.528 179 L 135.983 178.772 L 138.031 177.745 L 142.833 175.424 L 142.883 175.399 L 142.933 175.368 C 149.496 171.204 154.537 163.968 156.415 156.008 L 159.956 141.033 L 160.06 140.593 L 159.799 140.224 L 148.633 124.5 L 147.976 123.575 L 147.14 124.343 L 147.031 124.443 C 143.967 127.183 139.89 128.696 135.558 128.696 C 131.226 128.696 127.149 127.183 124.076 124.434 L 123.977 124.343 L 123.142 123.574 Z M 147.817 125.079 L 158.983 140.804 L 155.442 155.779 C 153.751 162.943 149.096 170.274 142.396 174.523 L 137.583 176.852 L 135.535 177.879 L 133.535 176.852 L 128.72 174.523 C 122.021 170.274 117.365 162.943 115.673 155.779 L 112.133 140.804 L 123.3 125.079 L 123.409 125.179 C 126.774 128.189 131.169 129.696 135.558 129.696 C 139.947 129.696 144.342 128.189 147.708 125.179"
					fill="currentColor"
					style="stroke-width: 0.1;"
				/>
				<path
					stroke-width="5"
					stroke-linecap="butt"
					stroke-miterlimit="10"
					stroke-linejoin="miter"
					fill="none"
					stroke="currentColor"
					d="M 130.24 171.131 C 124.149 167.268 119.956 161.585 118.433 155.128 L 115.186 141.399 L 123.906 129.12 C 126.365 131.95 132.719 133.197 132.719 133.197 L 135.613 131.621 L 138.643 133.164 C 138.643 133.164 144.719 131.668 147.212 129.123 L 155.929 141.399 L 152.684 155.127 C 151.16 161.585 146.968 167.268 140.879 171.131 L 135.558 174.509 L 130.24 171.131 Z"
					style="stroke-width: 0.5;"
				/>
				<path
					d="M 111.506 163 L 159.861 163 C 160.489 163.629 160.842 163.981 161.471 164.611 L 161.471 171.026 C 160.842 171.654 160.489 172.007 159.861 172.636 L 111.506 172.636 C 110.878 172.007 110.525 171.654 109.896 171.026 L 109.896 164.611 C 110.525 163.981 110.878 163.629 111.506 163"
					fill="currentColor"
					style="stroke-width: ;"
				/>
			</g>
		</svg>
		<p class="absolute top-5 left-1/2 -translate-x-1/2 text-2xl font-bold">
			{max}
		</p>
		<p
			class="character-sheet-section-label absolute bottom-[10px] left-1/2 -translate-x-1/2 text-[11px] leading-none font-medium text-primary-foreground"
		>
			ARMOR
		</p>
	</div>

	<div
		class={cn(
			'my-auto grid grid-cols-4 place-items-center gap-x-1.5 gap-y-1.5',
			max === 0 && 'hidden',
			max < 7 && 'grid-cols-3',
			max < 3 && 'grid-cols-2',
			max < 2 && 'grid-cols-1'
		)}
	>
		{#each Array(max) as _, index}
			<button
				{disabled}
				aria-label="armor-slot"
				class="size-min rounded outline-offset-2"
				onclick={() => {
					if (index >= marked) {
						marked = Math.min(max, index + 1);
					} else {
						marked = index;
					}
				}}
				type="button"
			>
				<Shield
					class="size-5.5 stroke-2 text-muted-foreground transition-all {index < marked
						? 'fill-muted-foreground'
						: 'fill-transparent'}"
				/>
			</button>
		{/each}
	</div>
</div>
