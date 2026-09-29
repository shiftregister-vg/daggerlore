<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { getDiceContext } from '$lib/state/dice.svelte';
	import { preRoll } from '$lib/state/pre-roll.svelte';
	import {
		applyBeforeRoll,
		availablePoolDice,
		needsDieChoice,
		needsTokenChoice,
		optionBlocker,
		optionCostCaption,
		optionLabel,
		optionsFor,
		tokenRange,
		type OptionChoice
	} from '$lib/state/roll-options';
	import { resourcesOf, snapshot, spendOptions, undoToast } from './roll-actions';

	const characterCtx = getCharacterContext();
	const diceCtx = getDiceContext();

	const input = $derived(preRoll.pending);
	const character = $derived(characterCtx?.character);
	const derivedChar = $derived(characterCtx?.derived_character_data);
	const maxStress = $derived(derivedChar?.max_stress ?? 0);
	const open = $derived(input !== null);

	const trackers = $derived(
		input?.context && derivedChar
			? optionsFor(derivedChar.roll_option_trackers, { kind: input.context.kind, timing: 'before' })
			: []
	);
	const resources = $derived(character ? resourcesOf(character, maxStress) : undefined);

	let picks = $state<Record<string, { on: boolean } & OptionChoice>>({});
	$effect(() => {
		if (input) picks = {};
	});

	const chosen = $derived(trackers.filter((tracker) => picks[tracker.key]?.on));
	const problems = $derived(
		chosen.map((tracker) => {
			if (!resources) return 'Unavailable';
			const choice = picks[tracker.key];
			if (needsDieChoice(tracker) && choice.die_index === undefined) return 'Choose a die';
			return optionBlocker(resources, tracker, choice);
		})
	);
	const canRoll = $derived(problems.every((problem) => problem === undefined));

	function roll() {
		if (!character || !input || !canRoll) return;
		const previous = snapshot(character);
		const picksToSpend = chosen.map((tracker) => ({
			tracker,
			choice: {
				die_index: picks[tracker.key].die_index,
				tokens: picks[tracker.key].tokens
			}
		}));
		const applications = picksToSpend.length
			? spendOptions(character, maxStress, picksToSpend)
			: [];
		if (!applications) return;
		const next = applyBeforeRoll(
			input,
			chosen.map((tracker, index) => ({ tracker, application: applications[index] }))
		);
		preRoll.clear();
		if (chosen.length > 0) {
			undoToast(
				`Rolling with ${chosen.map(optionLabel).join(', ')}.`,
				() => characterCtx?.character,
				previous
			);
		}
		diceCtx.roll(next);
	}

	function setPick(key: string, patch: Partial<{ on: boolean } & OptionChoice>) {
		const current = picks[key] ?? { on: false };
		picks = { ...picks, [key]: { ...current, ...patch } };
	}
</script>

<Dialog.Root
	{open}
	onOpenChange={(next) => {
		if (!next) preRoll.clear();
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Roll {input?.name ?? ''}</Dialog.Title>
			<Dialog.Description>Choose anything to use with this roll, then roll.</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-3 text-sm">
			{#each trackers as tracker (tracker.key)}
				{@const pick = picks[tracker.key]}
				{@const blocker = resources ? optionBlocker(resources, tracker, pick ?? {}) : 'Unavailable'}
				{@const cost = optionCostCaption(tracker)}
				{@const disabled = !!blocker && blocker !== 'Choose a die that is still available'}
				<div class="flex flex-col gap-2 rounded-md border p-2">
					<label class="flex items-start gap-2" for={`pre-${tracker.key}`}>
						<Checkbox
							id={`pre-${tracker.key}`}
							checked={pick?.on === true}
							{disabled}
							onCheckedChange={(checked) => setPick(tracker.key, { on: checked === true })}
						/>
						<span class="flex flex-col">
							<span class="font-medium">{optionLabel(tracker)}</span>
							<span class="text-xs text-muted-foreground">
								{tracker.source_title}{cost ? ` · ${cost}` : ''}
							</span>
							{#if blocker}
								<span class="text-xs text-destructive">{blocker}</span>
							{/if}
						</span>
					</label>

					{#if pick?.on && resources && needsDieChoice(tracker)}
						<div class="flex flex-wrap gap-1.5 pl-6" role="group" aria-label="Choose a die">
							{#each availablePoolDice(resources, tracker) as die (die.index)}
								<Button
									type="button"
									size="sm"
									variant={pick.die_index === die.index ? 'default' : 'outline'}
									onclick={() => setPick(tracker.key, { die_index: die.index })}
								>
									{die.value}
								</Button>
							{/each}
						</div>
					{/if}

					{#if pick?.on && resources && needsTokenChoice(tracker)}
						{@const range = tokenRange(resources, tracker)}
						<div class="flex items-center gap-2 pl-6">
							<label class="text-xs text-muted-foreground" for={`pre-${tracker.key}-tokens`}>
								Tokens to spend
							</label>
							<input
								id={`pre-${tracker.key}-tokens`}
								type="number"
								min={range.min}
								max={range.max}
								class="h-8 w-20 rounded-md border border-input bg-transparent px-2"
								value={pick.tokens ?? range.min}
								onchange={(event) =>
									setPick(tracker.key, { tokens: Number(event.currentTarget.value) })}
							/>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<Dialog.Footer class="gap-2">
			<Button type="button" variant="outline" onclick={() => preRoll.clear()}>Cancel</Button>
			<Button type="button" disabled={!canRoll} onclick={roll}>Roll</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
