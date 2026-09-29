<script lang="ts">
	import { cn, level_to_tier } from '$lib/utils';
	import type { DamageType, TraitId, Traits } from '@domain/schemas/rules';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import RollButton from '$lib/components/dice/roll-button.svelte';
	import { derived } from 'svelte/store';

	let {
		class: className = '',
		onclick
	}: {
		class?: string;
		onclick?: () => void;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);
	const traits = $derived(derived_character_data?.traits);

	// Look up the weapon from inventory or derived weapons (for equipped weapons with modifiers)
	const derived_unarmed = $derived(derived_character_data?.derived_unarmed_attack);

	// Get current damage type and trait values from inventory choices
	const currentDamageType = $derived.by(() => {
		if (!derived_unarmed || !character) return undefined;
		const choices = character.unarmed_attack_choices['damage_type'];
		if (choices && choices.length > 0) {
			return choices[0] as DamageType;
		}
		return derived_unarmed.available_damage_types[0];
	});

	const currentTrait = $derived.by(() => {
		if (!derived_unarmed || !character) return undefined;
		const choices = character.unarmed_attack_choices['trait'];
		if (choices && choices.length > 0) {
			return choices[0] as TraitId;
		}
		return derived_unarmed.available_traits[0];
	});

	// Calculate to hit: weapon attack_roll_bonus + character trait value
	const toHit = $derived.by(() => {
		if (!derived_unarmed) return 0;
		if (!currentTrait || !traits) return derived_unarmed.attack_roll_bonus;
		const traitValue = traits[currentTrait] ?? 0;
		return derived_unarmed.attack_roll_bonus + traitValue;
	});
</script>

{#if derived_character_data && derived_unarmed}
	<tr
		class={cn('@container cursor-pointer text-xs', className)}
		onclick={(e) => {
			// Don't trigger onclick if clicking on interactive elements (but allow the row itself)
			const target = e.target as HTMLElement;
			const interactive = target.closest('button, select, input');
			if (interactive && interactive !== e.currentTarget) {
				return;
			}
			onclick?.();
		}}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onclick?.();
			}
		}}
	>
		<td class="px-4 py-2">
			{derived_unarmed.title}
		</td>
		<td class="py-2 pr-4 text-center whitespace-nowrap">{derived_unarmed.range}</td>
		<td class="py-2 pr-4 whitespace-nowrap">
			<RollButton
				type="duality"
				modifier={toHit}
				traitId={currentTrait}
				context={{ kind: 'attack', trait: currentTrait }}
				name={derived_unarmed.title}
				class="mx-auto"
			/>
		</td>
		<td class="py-2 pr-4 text-right whitespace-nowrap @lg:text-center">
			<RollButton
				name="Damage"
				class="ml-auto @lg:mx-auto"
				proficiency={derived_character_data.proficiency}
				type="base"
				diceString={derived_unarmed.damage_dice}
				modifier={derived_unarmed.damage_bonus}
				damageType={currentDamageType}
				context={{ kind: 'damage', damage_type: currentDamageType }}
			/>
		</td>
		<td class="hidden py-2 pr-4 text-right text-xs @lg:table-cell">
			<div class="ml-auto w-min text-right">
				{derived_unarmed.features.map((f) => f.title).join(', ') || '—'}
			</div>
		</td>
	</tr>
{/if}
