<script lang="ts">
	import type { CharacterModifier, WeaponModifier } from '@domain/schemas/rules';
	import Button from '$lib/components/ui/button/button.svelte';
	import CharacterModifierForm from '$lib/components/homebrew/forms/shared/character-modifier/form.svelte';
	import WeaponModifierForm from '$lib/components/homebrew/forms/shared/weapon-modifier/form.svelte';
	import {
		emptyCharacterModifier,
		emptyWeaponModifier
	} from '$lib/components/homebrew/forms/shared/features/defaults';
	import type { HomebrewErrorSummary } from '$lib/components/homebrew/forms/helpers';

	type ModifierItem = {
		character_modifiers?: CharacterModifier[];
		weapon_modifiers?: WeaponModifier[];
	};

	let { item = $bindable(), idPrefix }: { item: ModifierItem; idPrefix: string } = $props();
	const errorSummary: HomebrewErrorSummary = { fieldErrors: [], messages: [] };
	const characterModifiers = $derived(item.character_modifiers ?? []);
	const weaponModifiers = $derived(item.weapon_modifiers ?? []);

	function updateCharacter(index: number, modifier: CharacterModifier) {
		item = {
			...item,
			character_modifiers: characterModifiers.map((current, i) =>
				i === index ? modifier : current
			)
		};
	}
	function updateWeapon(index: number, modifier: WeaponModifier) {
		item = {
			...item,
			weapon_modifiers: weaponModifiers.map((current, i) => (i === index ? modifier : current))
		};
	}
</script>

<div class="mt-4 grid gap-4">
	<section aria-label="Character modifiers" class="grid gap-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h3 class="text-sm font-medium">Character Modifiers</h3>
			<Button
				type="button"
				size="sm"
				variant="outline"
				onclick={() => {
					item = {
						...item,
						character_modifiers: [...characterModifiers, emptyCharacterModifier()]
					};
				}}>Add Character Modifier</Button
			>
		</div>
		<p class="text-xs text-muted-foreground">
			Automatic character stat changes, such as Armor Score or damage thresholds. Feature text alone
			does not apply a bonus.
		</p>
		{#each characterModifiers as modifier, index (index)}
			<fieldset aria-label={`Character modifier ${index + 1}`} class="min-w-0">
				<legend class="sr-only">Character modifier {index + 1}</legend>
				<CharacterModifierForm
					bind:modifier={() => modifier, (value) => updateCharacter(index, value)}
					idPrefix={`${idPrefix}-character-${index}`}
					{errorSummary}
					path={['character_modifiers', index]}
					onRemove={() => {
						item = {
							...item,
							character_modifiers: characterModifiers.filter((_, i) => i !== index)
						};
					}}
				/>
			</fieldset>
		{:else}
			<p class="text-xs text-muted-foreground">No character modifiers.</p>
		{/each}
	</section>
	<section aria-label="Weapon modifiers" class="grid gap-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h3 class="text-sm font-medium">Weapon Modifiers</h3>
			<Button
				type="button"
				size="sm"
				variant="outline"
				onclick={() => {
					item = { ...item, weapon_modifiers: [...weaponModifiers, emptyWeaponModifier()] };
				}}>Add Weapon Modifier</Button
			>
		</div>
		<p class="text-xs text-muted-foreground">
			Automatic changes to attacks, damage, weapon traits or range.
		</p>
		{#each weaponModifiers as modifier, index (index)}
			<fieldset aria-label={`Weapon modifier ${index + 1}`} class="min-w-0">
				<legend class="sr-only">Weapon modifier {index + 1}</legend>
				<WeaponModifierForm
					bind:modifier={() => modifier, (value) => updateWeapon(index, value)}
					idPrefix={`${idPrefix}-weapon-${index}`}
					{errorSummary}
					path={['weapon_modifiers', index]}
					onRemove={() => {
						item = { ...item, weapon_modifiers: weaponModifiers.filter((_, i) => i !== index) };
					}}
				/>
			</fieldset>
		{:else}
			<p class="text-xs text-muted-foreground">No weapon modifiers.</p>
		{/each}
	</section>
</div>
