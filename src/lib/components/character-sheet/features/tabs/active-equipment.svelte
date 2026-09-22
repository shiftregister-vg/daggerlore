<script lang="ts">
	import { cn, level_to_tier } from '$lib/utils';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import RollButton from '$lib/components/dice/roll-button.svelte';
	import ArmorRow from './inventory/armor-row.svelte';
	import UnarmoredRow from './inventory/unarmored-row.svelte';
	import UnarmedAttackRow from './inventory/unarmed-attack-row.svelte';
	import PrimaryWeaponRow from './inventory/primary-weapon-row.svelte';
	import SecondaryWeaponRow from './inventory/secondary-weapon-row.svelte';
	let {
		class: className = '',
		onItemClick = () => {},
		onBeastformClick = () => {}
	}: {
		class?: string;
		onItemClick?: (
			options:
				| {
						type: 'primary_weapon' | 'secondary_weapon' | 'armor' | 'consumable' | 'loot';
						inventory_id: string;
				  }
				| {
						type: 'unarmed_attack' | 'unarmored';
				  }
		) => void;
		onBeastformClick?: () => void;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);

	const isTransformed = $derived(character?.chosen_beastform?.apply_beastform_bonuses === true);
	const derivedBeastform = $derived(derived_character_data?.derived_beastform);
	const showBeastformAttack = $derived(isTransformed && derivedBeastform);

	// Beastform attack calculations
	const beastformToHit = $derived.by(() => {
		if (!derivedBeastform || !derived_character_data?.traits) return 0;
		return (
			(derived_character_data.traits[derivedBeastform.attack.trait] ?? 0) +
			derived_character_data.no_mercy_bonus
		);
	});
</script>

{#if derived_character_data}
	<div class={cn('@container', className)}>
		<div class="relative mx-auto w-[330px]">
			<svg
				class="w-full text-primary"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="147.266 157.441 198.221 17.244"
			>
				<path
					d="M 290.341 174.685 L 202.412 174.685 L 199.344 171.617 L 199.344 160.509 L 202.412 157.441 L 290.341 157.441 L 293.409 160.509 L 293.409 171.617"
					fill="currentColor"
					style="stroke-width: 0.1;"
				/>
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

			<div class="absolute top-1/2 left-10 flex -translate-y-1/2 items-center gap-5">
				<p class=" text-[12px] leading-none font-bold text-muted-foreground">PROFICIENCY</p>
				<div class="flex items-center gap-2.5">
					{#each [1, 2, 3, 4, 5, 6] as prof}
						<div
							class="flex size-[16px] items-center justify-center rounded-full border-2 border-muted-foreground transition-colors group-hover:border-foreground"
						>
							{#if prof <= derived_character_data.proficiency}
								<div class="size-[8px] rounded-full bg-muted-foreground"></div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
		<!-- Armor Slot -->
		<div class="grow pt-4">
			<table class="w-full border-collapse">
				<colgroup>
					<col />
					<col class="w-12" />
					<col class="w-29" />
					<col class="hidden w-20 @lg:table-column" />
				</colgroup>
				<thead>
					<tr class="border-b bg-primary-muted text-xs text-primary-foreground">
						<th class="px-4 py-2 text-left">Armor</th>
						<th class="py-2 pr-4 text-center">Slots</th>
						<th class="py-2 pr-4 text-right @lg:text-center">Base Thresholds</th>
						<th class="hidden py-2 pr-4 text-right @lg:table-cell">Features</th>
					</tr>
				</thead>
				<tbody>
					{#if derived_character_data.derived_armor}
						<ArmorRow
							inventory_id={derived_character_data.derived_armor.inventory_id}
							onclick={() => {
								if (derived_character_data.derived_armor)
									onItemClick({
										type: 'armor',
										inventory_id: derived_character_data.derived_armor.inventory_id
									});
							}}
						/>
					{:else}
						<UnarmoredRow
							onclick={() => {
								onItemClick({ type: 'unarmored' });
							}}
						/>
					{/if}
				</tbody>
			</table>
		</div>
		<!-- Active Weapons -->
		<div class="grow pt-4">
			<table class="w-full border-collapse">
				<colgroup>
					<col />
					<col class="w-16" />
					<col class="w-18" />
					<col class="w-18" />
					<col class="hidden w-20 @lg:table-column" />
				</colgroup>
				<thead>
					<tr class="border-b bg-primary-muted text-xs text-primary-foreground">
						<th class="px-4 py-2 text-left">Weapons</th>
						<th class="py-2 pr-4 text-center">Range</th>
						<th class="py-2 pr-4 text-center">Hit</th>
						<th class="py-2 pr-4 text-right @lg:text-center">Damage</th>
						<th class="hidden py-2 pr-4 text-right @lg:table-cell">Features</th>
					</tr>
				</thead>
				<tbody>
					{#if derived_character_data.derived_primary_weapon}
						<PrimaryWeaponRow
							inventory_id={derived_character_data.derived_primary_weapon.inventory_id}
							onclick={() => {
								if (derived_character_data.derived_primary_weapon)
									onItemClick({
										type: 'primary_weapon',
										inventory_id: derived_character_data.derived_primary_weapon.inventory_id
									});
							}}
						/>
					{/if}
					{#if derived_character_data.derived_secondary_weapon}
						<SecondaryWeaponRow
							inventory_id={derived_character_data.derived_secondary_weapon.inventory_id}
							onclick={() => {
								if (derived_character_data.derived_secondary_weapon)
									onItemClick({
										type: 'secondary_weapon',
										inventory_id: derived_character_data.derived_secondary_weapon.inventory_id
									});
							}}
						/>
					{/if}
					<UnarmedAttackRow
						onclick={() => {
							onItemClick({ type: 'unarmed_attack' });
						}}
					/>
					{#if showBeastformAttack && derivedBeastform}
						<tr
							class="cursor-pointer bg-accent/3 text-xs text-accent"
							onclick={(e) => {
								// Don't trigger onclick if clicking on interactive elements (but allow the row itself)
								const target = e.target as HTMLElement;
								const interactive = target.closest('button, select, input');
								if (interactive && interactive !== e.currentTarget) {
									return;
								}
								onBeastformClick?.();
							}}
							role="button"
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									onBeastformClick?.();
								}
							}}
						>
							<td class="px-4 py-2">
								<div class="flex items-center gap-1">
									<div class="-mb-1">
										<p>{derivedBeastform.title}</p>
										<p class="text-[10px] opacity-50">Beastform</p>
									</div>
								</div>
							</td>
							<td class="py-2 pr-4 text-center whitespace-nowrap"
								>{derivedBeastform.attack.range}</td
							>
							<td class="py-2 pr-4 whitespace-nowrap">
								<RollButton
									name="To Hit"
									class="mx-auto"
									type="duality"
									modifier={beastformToHit}
									traitId={derivedBeastform.attack.trait}
								/>
							</td>
							<td class="py-2 pr-4 text-right whitespace-nowrap @lg:text-center">
								<RollButton
									name="Damage"
									class="ml-auto @lg:mx-auto"
									proficiency={derived_character_data.proficiency}
									type="base"
									diceString={derivedBeastform.attack.damage_dice}
									modifier={derivedBeastform.attack.damage_bonus}
									damageType={derivedBeastform.attack.damage_type}
								/>
							</td>
							<td class="hidden py-2 pr-4 text-right text-xs @lg:table-cell">
								<div class="ml-auto w-min text-right">
									{derivedBeastform.features.map((f) => f.title).join(', ') || '—'}
								</div>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>

		{#if derived_character_data?.hasSneakAttackClassFeature}
			<div class="flex items-center gap-2 pt-1 pl-4">
				<RollButton
					name="Sneak Attack Damage"
					type="base"
					diceString={`${level_to_tier(characterCtx.character?.level ?? 0)}d6`}
				/>
				<p class="text-xs text-nowrap">Sneak Attack Damage</p>
				<p class="text-xs text-muted-foreground italic">
					While <em>Cloaked</em> or while an ally is within Melee range of your target
				</p>
			</div>
		{/if}
	</div>
{/if}
