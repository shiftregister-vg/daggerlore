<script lang="ts">
	import { cn } from '$lib/utils';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import RollButton from '$lib/components/dice/roll-button.svelte';

	let {
		onExperienceClick = () => {}
	}: {
		onExperienceClick?: () => void;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);
</script>

{#if character && derived_character_data}
	<table class="@container w-full border-collapse">
		<colgroup>
			<col class="w-14" />
			<col />
		</colgroup>
		<thead>
			<tr class="">
				<th colspan={2} class="relative px-4">
					<svg
						class="h-8 w-full text-primary"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="147.266 157.441 198.221 17.244"
					>
						<!-- <path
					d="M 290.341 174.685 L 202.412 174.685 L 199.344 171.617 L 199.344 160.509 L 202.412 157.441 L 290.341 157.441 L 293.409 160.509 L 293.409 171.617"
					fill="currentColor"
					style="stroke-width: 0.1;"
				/> -->
						<path
							d="M 342.377 170.443 L 150.376 170.443 C 149.161 169.229 148.48 168.548 147.266 167.333 L 147.266 164.793 C 148.48 163.579 149.161 162.898 150.376 161.684 L 342.377 161.684 C 343.591 162.898 344.272 163.579 345.487 164.793 L 345.487 167.333 C 344.272 168.548 343.591 169.229 342.377 170.443"
							fill="currentColor"
							style="stroke-width: 0.1;"
						/>

						<path
							d="M 159.417 173.116 L 152.363 166.064 L 159.417 159.01 L 333.337 159.01 L 340.39 166.064 L 333.337 173.116"
							class="fill-background"
							style="stroke-width: 0.1;"
						/>
						<path
							d="M 333.544 158.51 L 159.209 158.51 L 158.917 158.803 L 152.363 165.356 L 151.656 166.063 L 152.363 166.77 L 158.917 173.323 L 159.209 173.616 L 159.624 173.616 L 333.13 173.616 L 333.544 173.616 L 333.837 173.323 L 335.413 171.747 L 340.39 166.77 L 341.098 166.063 L 340.39 165.356 L 335.413 160.379 L 333.837 158.803 L 333.544 158.51 Z M 333.13 159.51 C 335.689 162.069 337.124 163.504 339.683 166.063 C 337.124 168.622 335.689 170.057 333.13 172.616 L 159.624 172.616 C 157.065 170.057 155.63 168.622 153.07 166.063 C 155.63 163.504 157.065 162.069 159.624 159.51"
							fill="currentColor"
							style="stroke-width: 0.1;"
						/>
					</svg>
					<p
						class="character-sheet-section-label absolute top-[10px] left-1/2 -translate-x-1/2 text-[12px] leading-none font-bold text-muted-foreground"
					>
						EXPERIENCES
					</p>
				</th>
			</tr>
		</thead>
		<tbody>
			{#each character.experiences as experience, i}
				<tr
					class="cursor-pointer text-xs"
					onclick={(e) => {
						// Don't trigger onclick if clicking on interactive elements (but allow the row itself)
						const target = e.target as HTMLElement;
						const interactive = target.closest('button, select, input');
						if (interactive && interactive !== e.currentTarget) {
							return;
						}
						onExperienceClick();
					}}
					role="button"
					tabindex="0"
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onExperienceClick();
						}
					}}
				>
					<td class="px-4 py-2">
						<RollButton
							class="ml-auto @lg:mx-auto"
							name="Experience"
							type="duality"
							modifier={derived_character_data.experience_modifiers[i]}
						/>
					</td>
					<td class="py-2 pr-4">
						<p class="text-sm text-muted-foreground italic">
							{experience.trim() === '' ? 'Unnamed Experience' : experience}
						</p>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
