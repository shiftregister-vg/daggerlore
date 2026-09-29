<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { getDiceContext } from '$lib/state/dice.svelte';
	import {
		EFFECT_EVENT_LABELS,
		effectLabel,
		endInstances,
		endableInstances
	} from '$lib/state/feature-effects';
	import {
		availablePoolDice,
		damageReduction,
		needsDieChoice,
		needsTokenChoice,
		optionBlocker,
		optionCostCaption,
		optionLabel,
		optionsFor,
		resolveDamage,
		tokenRange,
		type OptionChoice
	} from '$lib/state/roll-options';
	import {
		resourcesOf,
		snapshot,
		spendOptions,
		undoToast
	} from '$lib/components/dice/roll-actions';
	import type { EffectEndEvent } from '@domain/schemas/rules';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const characterCtx = getCharacterContext();
	const diceCtx = getDiceContext();
	const character = $derived(characterCtx?.character);
	const derivedChar = $derived(characterCtx?.derived_character_data);
	const maxStress = $derived(derivedChar?.max_stress ?? 0);

	let incoming = $state('');
	let armorSlot = $state(false);
	let fromAttack = $state(true);
	let picks = $state<Record<string, { on: boolean } & OptionChoice>>({});
	let rolled = $state<Record<string, number>>({});
	let skippedEnds = $state<Record<string, boolean>>({});

	$effect(() => {
		if (open) {
			incoming = '';
			armorSlot = false;
			fromAttack = true;
			picks = {};
			rolled = {};
			skippedEnds = {};
		}
	});

	const resources = $derived(character ? resourcesOf(character, maxStress) : undefined);
	const defenseOptions = $derived(
		derivedChar ? optionsFor(derivedChar.roll_option_trackers, { timing: 'defense' }) : []
	);
	const chosen = $derived(defenseOptions.filter((tracker) => picks[tracker.key]?.on));
	const armorAvailable = $derived(
		!!character && !!derivedChar && character.marked_armor < derivedChar.max_armor
	);

	// A fixed-die reduction (e.g. "reduce by 1d8") is rolled by the player; a pool die is spent.
	function needsRoll(tracker: (typeof defenseOptions)[number]): boolean {
		const { effect } = tracker.option;
		return (
			effect.type === 'reduce_damage' &&
			typeof effect.amount === 'string' &&
			effect.amount !== 'pool'
		);
	}

	function chosenReduction(tracker: (typeof defenseOptions)[number]): number | undefined {
		const { effect } = tracker.option;
		if (effect.type !== 'reduce_damage') return 0;
		if (needsRoll(tracker)) return rolled[tracker.key];
		if (effect.amount === 'pool') {
			const index = picks[tracker.key]?.die_index;
			if (index === undefined || !resources) return undefined;
			return availablePoolDice(resources, tracker).find((die) => die.index === index)?.value;
		}
		return typeof effect.amount === 'number' ? effect.amount : 0;
	}

	const reductions = $derived(chosen.map(chosenReduction));
	const reductionsReady = $derived(reductions.every((value) => value !== undefined));
	const totalReduction = $derived(reductions.reduce<number>((sum, value) => sum + (value ?? 0), 0));

	const amount = $derived(Math.max(0, Math.trunc(Number(incoming) || 0)));
	const result = $derived(
		derivedChar
			? resolveDamage(amount, derivedChar.damage_thresholds, {
					reduction: totalReduction,
					armor_slot: armorSlot,
					massive: character?.settings.massive_damage
				})
			: undefined
	);

	const events = $derived.by((): EffectEndEvent[] => {
		const list: EffectEndEvent[] = [];
		if (fromAttack && amount > 0) list.push('attacked_successfully');
		if ((result?.hp ?? 0) > 0) list.push('hp_marked');
		return list;
	});
	const endCandidates = $derived(
		endableInstances(character?.active_effects ?? {}, derivedChar?.effect_trackers ?? [], events)
	);
	const endKey = (entry: (typeof endCandidates)[number]) =>
		entry.tracker.key + entry.event + entry.instance.id;

	function setPick(key: string, patch: Partial<{ on: boolean } & OptionChoice>) {
		const current = picks[key] ?? { on: false };
		picks = { ...picks, [key]: { ...current, ...patch } };
	}

	async function rollReduction(tracker: (typeof defenseOptions)[number]) {
		const { effect } = tracker.option;
		if (effect.type !== 'reduce_damage' || typeof effect.amount !== 'string') return;
		const results = await diceCtx.roll({
			name: optionLabel(tracker),
			dice: [{ type: effect.amount as 'd4' }]
		});
		if (results[0]) rolled = { ...rolled, [tracker.key]: results[0].value };
	}

	const problems = $derived(
		chosen.map((tracker) => {
			if (!resources) return 'Unavailable';
			const pick = picks[tracker.key];
			if (needsDieChoice(tracker) && pick.die_index === undefined) return 'Choose a die';
			if (needsRoll(tracker) && rolled[tracker.key] === undefined) return 'Roll the die';
			return optionBlocker(resources, tracker, pick);
		})
	);
	const canConfirm = $derived(
		!!character &&
			amount > 0 &&
			reductionsReady &&
			problems.every((problem) => problem === undefined) &&
			(!armorSlot || armorAvailable)
	);

	function confirm() {
		if (!character || !derivedChar || !result || !canConfirm) return;
		// Spending a die changes the state the preview reads, so capture what was previewed first.
		const toMark = result.hp;
		const confirmedEnds = endCandidates.filter((entry) => !skippedEnds[endKey(entry)]);
		const previous = snapshot(character);
		const applications = chosen.length
			? spendOptions(
					character,
					maxStress,
					chosen.map((tracker) => ({
						tracker,
						choice: { die_index: picks[tracker.key].die_index, tokens: picks[tracker.key].tokens }
					}))
				)
			: [];
		if (!applications) return;
		character.marked_hp = Math.min(derivedChar.max_hp, character.marked_hp + toMark);
		if (armorSlot) character.marked_armor += 1;
		character.active_effects = endInstances(character.active_effects ?? {}, confirmedEnds);
		const endedTrackers = [...new Set(confirmedEnds.map((entry) => entry.tracker))];
		const parts = [
			toMark > 0
				? `Marked ${toMark} Hit Point${toMark === 1 ? '' : 's'}.`
				: 'No Hit Points marked.',
			endedTrackers.length > 0 ? `Ended ${endedTrackers.map(effectLabel).join(', ')}.` : ''
		].filter(Boolean);
		undoToast('Took damage', () => characterCtx?.character, previous, parts.join(' '));
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Take damage</Dialog.Title>
			<Dialog.Description>
				Enter the damage; the thresholds decide how many Hit Points are marked.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-3 text-sm">
			<div class="flex flex-col gap-1">
				<label for="take-damage-amount" class="text-xs font-medium text-muted-foreground">
					Incoming damage
				</label>
				<Input
					id="take-damage-amount"
					type="number"
					min={0}
					bind:value={incoming}
					placeholder="0"
					autocomplete="off"
				/>
				{#if derivedChar}
					<p class="text-xs text-muted-foreground">
						Major {derivedChar.damage_thresholds.major} · Severe {derivedChar.damage_thresholds
							.severe}
					</p>
				{/if}
			</div>

			{#each defenseOptions as tracker (tracker.key)}
				{@const pick = picks[tracker.key]}
				{@const blocker = resources ? optionBlocker(resources, tracker, pick ?? {}) : 'Unavailable'}
				{@const cost = optionCostCaption(tracker)}
				<div class="flex flex-col gap-2 rounded-md border p-2">
					<label class="flex items-start gap-2" for={`dmg-${tracker.key}`}>
						<Checkbox
							id={`dmg-${tracker.key}`}
							checked={pick?.on === true}
							disabled={!!blocker && blocker !== 'Choose a die that is still available'}
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
						<input
							type="number"
							min={range.min}
							max={range.max}
							aria-label="Tokens to spend"
							class="ml-6 h-8 w-20 rounded-md border border-input bg-transparent px-2"
							value={pick.tokens ?? range.min}
							onchange={(event) =>
								setPick(tracker.key, { tokens: Number(event.currentTarget.value) })}
						/>
					{/if}
					{#if pick?.on && needsRoll(tracker)}
						<div class="flex items-center gap-2 pl-6">
							<Button
								type="button"
								size="sm"
								variant="outline"
								onclick={() => rollReduction(tracker)}
							>
								Roll
							</Button>
							{#if rolled[tracker.key] !== undefined}
								<span class="text-xs">Reduces damage by {rolled[tracker.key]}</span>
							{/if}
						</div>
					{/if}
				</div>
			{/each}

			<label class="flex items-center gap-2" for="take-damage-armor">
				<Checkbox
					id="take-damage-armor"
					checked={armorSlot}
					disabled={!armorAvailable}
					onCheckedChange={(checked) => (armorSlot = checked === true)}
				/>
				<span>
					Mark an Armor Slot to lower the result by one step
					{#if !armorAvailable}<span class="text-xs text-muted-foreground"> (none free)</span>{/if}
				</span>
			</label>
			<label class="flex items-center gap-2" for="take-damage-attack">
				<Checkbox
					id="take-damage-attack"
					checked={fromAttack}
					onCheckedChange={(checked) => (fromAttack = checked === true)}
				/>
				<span>This damage came from an attack that succeeded against you</span>
			</label>

			{#if result && amount > 0}
				<p class="rounded-md bg-muted p-2">
					{result.damage} damage after reductions →
					<span class="font-semibold">
						{result.severity === 'none' ? 'no damage' : `${result.severity} damage`}
					</span>
					· mark
					<span class="font-semibold">{result.hp} Hit Point{result.hp === 1 ? '' : 's'}</span>
				</p>
			{/if}

			{#each endCandidates as entry (endKey(entry))}
				<label class="flex items-center gap-2 text-xs" for={`end-${endKey(entry)}`}>
					<Checkbox
						id={`end-${endKey(entry)}`}
						checked={!skippedEnds[endKey(entry)]}
						onCheckedChange={(checked) =>
							(skippedEnds = { ...skippedEnds, [endKey(entry)]: checked !== true })}
					/>
					<span>
						{EFFECT_EVENT_LABELS[entry.event]}: end
						<span class="font-medium">
							{effectLabel(entry.tracker)}{entry.instance.target
								? ` against ${entry.instance.target}`
								: ''}
						</span>
					</span>
				</label>
			{/each}
		</div>

		<Dialog.Footer class="gap-2">
			<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button type="button" disabled={!canConfirm} onclick={confirm}>Take damage</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
