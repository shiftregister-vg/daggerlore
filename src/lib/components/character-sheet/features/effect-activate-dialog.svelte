<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import {
		activationBlocker,
		effectCostCaption,
		effectEndCaption,
		effectInstances,
		effectLabel,
		type EffectTracker
	} from '$lib/state/feature-effects';
	import { activateWithUndo } from './effect-actions';

	let {
		open = $bindable(false),
		tracker
	}: {
		open: boolean;
		tracker: EffectTracker;
	} = $props();

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx?.character);
	const maxStress = $derived(characterCtx?.derived_character_data?.max_stress ?? 0);

	let target = $state('');
	$effect(() => {
		if (open) target = '';
	});

	const definition = $derived(tracker.effect);
	const cost = $derived(effectCostCaption(definition));
	const ending = $derived(effectEndCaption(definition));
	const current = $derived(
		character && (definition.instances ?? 'single') === 'replace'
			? effectInstances(character.active_effects ?? {}, tracker)[0]
			: undefined
	);
	const blocker = $derived(
		character
			? activationBlocker(
					{
						hope: character.marked_hope,
						stress: character.marked_stress,
						max_stress: maxStress,
						feature_uses: character.feature_uses ?? {},
						active_effects: character.active_effects ?? {}
					},
					tracker,
					definition.target ? target : undefined
				)
			: 'Unavailable'
	);

	function activate(succeeded?: boolean) {
		if (!character || blocker) return;
		const done = activateWithUndo(() => characterCtx?.character, maxStress, tracker, {
			target: definition.target ? target : undefined,
			succeeded
		});
		if (done) open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Activate {effectLabel(tracker)}</Dialog.Title>
			<Dialog.Description>
				{tracker.feature_title && tracker.feature_title !== effectLabel(tracker)
					? `${tracker.feature_title} · `
					: ''}{tracker.source_title}
			</Dialog.Description>
		</Dialog.Header>

		<form
			class="flex flex-col gap-3 text-sm"
			onsubmit={(event) => {
				event.preventDefault();
				if (!definition.requires_success) activate();
			}}
		>
			{#if cost}
				<p><span class="font-semibold">Cost:</span> {cost}</p>
			{/if}
			{#if ending}
				<p class="text-muted-foreground">{ending}.</p>
			{/if}
			{#if definition.target}
				<div class="flex flex-col gap-1">
					<label for={`${tracker.key}-target`} class="text-xs font-medium text-muted-foreground">
						{definition.target.label}
					</label>
					<Input
						id={`${tracker.key}-target`}
						bind:value={target}
						placeholder="Name or description"
						autocomplete="off"
					/>
					{#if current?.target}
						<p class="text-xs text-muted-foreground">
							Replaces your current {definition.target.label.toLocaleLowerCase()}: {current.target}.
						</p>
					{/if}
				</div>
			{/if}
			{#if definition.requires_success}
				<p>Did it succeed? The cost is paid either way; the effect only starts on a success.</p>
			{/if}
			{#if blocker && !(definition.target && !target.trim())}
				<p class="text-xs text-destructive">{blocker}</p>
			{/if}

			<Dialog.Footer class="gap-2">
				{#if definition.requires_success}
					<Button
						type="button"
						variant="outline"
						disabled={!!blocker}
						onclick={() => activate(false)}
					>
						Failed
					</Button>
					<Button type="button" disabled={!!blocker} onclick={() => activate(true)}>
						Succeeded
					</Button>
				{:else}
					<Button type="submit" disabled={!!blocker}>
						Activate{cost ? ` · ${cost}` : ''}
					</Button>
				{/if}
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
