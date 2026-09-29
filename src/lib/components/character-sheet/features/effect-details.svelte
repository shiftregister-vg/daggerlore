<script lang="ts">
	import { getCharacterContext } from '$lib/state/character.svelte';
	import {
		EFFECT_EVENT_LABELS,
		describeEffectModifiers,
		effectEndCaption,
		effectInstances,
		effectLabel,
		isDowntimeEffectEvent
	} from '$lib/state/feature-effects';
	import Button from '$lib/components/ui/button/button.svelte';
	import { cn } from '$lib/utils';
	import EffectControl from './effect-control.svelte';
	import { endWithUndo } from './effect-actions';

	let {
		tracker_key,
		class: className = ''
	}: {
		tracker_key: string;
		class?: string;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx?.character);
	const tracker = $derived(
		characterCtx?.derived_character_data?.effect_trackers.find((entry) => entry.key === tracker_key)
	);
	const canEdit = $derived(!!characterCtx?.canEdit);
	const instances = $derived(
		character && tracker ? effectInstances(character.active_effects ?? {}, tracker) : []
	);
	const modifiers = $derived(tracker ? describeEffectModifiers(tracker.effect) : []);
	const ending = $derived(tracker ? effectEndCaption(tracker.effect) : '');
	const againstTarget = $derived(tracker?.effect.scope === 'against_target');
	// Downtime ends rest, scene and session effects, so only combat events get buttons here.
	const eventEnds = $derived(
		(tracker?.effect.ends_on ?? []).filter((event) => !isDowntimeEffectEvent(event))
	);
</script>

{#if tracker}
	<section class={cn('flex flex-col gap-2 text-sm', className)} aria-label={effectLabel(tracker)}>
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<p class="font-semibold">{effectLabel(tracker)}</p>
			<p class="text-xs text-muted-foreground">{tracker.source_title}</p>
		</div>
		{#if !tracker.eligible && tracker.ineligible_reason}
			<p class="text-xs text-destructive">{tracker.ineligible_reason}.</p>
		{/if}
		{#if modifiers.length > 0}
			<p>
				{modifiers.join(', ')}{againstTarget
					? ` against the ${tracker.effect.target?.label.toLocaleLowerCase() ?? 'target'}`
					: ''}
			</p>
		{/if}
		{#if tracker.effect.notes}
			<p class="text-muted-foreground">{tracker.effect.notes}</p>
		{/if}
		{#if ending}
			<p class="text-xs text-muted-foreground">{ending}. You can also end it at any time.</p>
		{/if}

		{#each instances as instance (instance.id)}
			<div class="flex flex-col gap-2 rounded-md border border-hope/50 bg-hope/5 p-2">
				<p class="font-medium">
					Active{instance.target ? ` against ${instance.target}` : ''}
					{#if againstTarget && modifiers.length > 0}
						<span class="font-normal text-muted-foreground">
							· {modifiers.join(', ')} against {instance.target}
						</span>
					{/if}
				</p>
				{#if canEdit}
					<div class="flex flex-wrap gap-1.5">
						{#each eventEnds as event (event)}
							<Button
								size="sm"
								variant="outline"
								onclick={() =>
									endWithUndo(
										() => characterCtx?.character,
										tracker,
										instance.id,
										EFFECT_EVENT_LABELS[event]
									)}
							>
								{EFFECT_EVENT_LABELS[event]}{instance.target && event === 'attack_succeeded'
									? ` against ${instance.target}`
									: ''}
							</Button>
						{/each}
						{#each tracker.effect.ends_when ?? [] as reason (reason)}
							<Button
								size="sm"
								variant="outline"
								onclick={() =>
									endWithUndo(() => characterCtx?.character, tracker, instance.id, reason)}
							>
								{reason}
							</Button>
						{/each}
						<Button
							size="sm"
							variant="ghost"
							class="text-destructive"
							onclick={() => endWithUndo(() => characterCtx?.character, tracker, instance.id)}
						>
							End
						</Button>
					</div>
				{/if}
			</div>
		{/each}

		<EffectControl
			effect={tracker.effect}
			tracker_key={tracker.key}
			tone="sheet"
			show_active={false}
		/>
	</section>
{/if}
