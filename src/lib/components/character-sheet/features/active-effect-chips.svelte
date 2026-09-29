<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { effectInstances, effectLabel } from '$lib/state/feature-effects';
	import { cn } from '$lib/utils';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import EffectDetails from './effect-details.svelte';

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx?.character);
	const active = $derived(
		(characterCtx?.derived_character_data?.effect_trackers ?? []).flatMap((tracker) => {
			const instances = character ? effectInstances(character.active_effects ?? {}, tracker) : [];
			return instances.length > 0 ? [{ tracker, instances }] : [];
		})
	);
</script>

{#each active as { tracker, instances } (tracker.key)}
	{@const targets = instances.flatMap((instance) => (instance.target ? [instance.target] : []))}
	<Popover.Root>
		<Popover.Trigger
			class={cn(
				'relative z-40 flex min-h-6 items-center gap-1.5 rounded-full border border-hope/60 bg-hope/15 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-hope/30',
				!tracker.eligible && 'opacity-60'
			)}
			title={tracker.eligible ? undefined : tracker.ineligible_reason}
		>
			<Sparkles class="size-3 shrink-0 text-hope" />
			<span class="leading-none">
				{effectLabel(tracker)}{targets.length > 0 ? `: ${targets.join(', ')}` : ''}
			</span>
		</Popover.Trigger>
		<Popover.Content class="w-80">
			<EffectDetails tracker_key={tracker.key} />
		</Popover.Content>
	</Popover.Root>
{/each}
