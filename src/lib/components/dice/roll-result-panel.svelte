<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import X from '@lucide/svelte/icons/x';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { getDiceContext } from '$lib/state/dice.svelte';
	import {
		EFFECT_EVENT_LABELS,
		effectLabel,
		endInstances,
		endableInstances,
		type EndableInstance
	} from '$lib/state/feature-effects';
	import {
		applyOption,
		availablePoolDice,
		needsDieChoice,
		needsTokenChoice,
		optionBlocker,
		optionCostCaption,
		optionLabel,
		optionsFor,
		planAfterRoll,
		tokenRange,
		type RollOptionTracker
	} from '$lib/state/roll-options';
	import { rollArithmetic, rollDescription } from '$lib/state/roll-math';
	import type { EffectEndEvent } from '@domain/schemas/rules';
	import type { Roll } from '@domain/schemas/dice';
	import { commit, resourcesOf, snapshot, undoToast } from './roll-actions';

	const characterCtx = getCharacterContext();
	const diceCtx = getDiceContext();

	const OUTCOME_KINDS = ['trait', 'attack', 'spellcast', 'experience'];

	const character = $derived(characterCtx?.character);
	const derivedChar = $derived(characterCtx?.derived_character_data);
	const canEdit = $derived(!!characterCtx?.canEdit);
	const maxStress = $derived(derivedChar?.max_stress ?? 0);

	let dismissedId = $state<string | null>(null);
	let outcomes = $state<Record<string, 'success' | 'failure'>>({});
	let tokenChoice = $state<Record<string, number>>({});

	const roll = $derived.by(() => {
		const last = diceCtx.lastRoll;
		if (!last || last.status !== 'complete' || !last.context || last.id === dismissedId) return;
		return last;
	});
	const kind = $derived(roll?.context?.kind);
	const outcome = $derived(roll ? outcomes[roll.id] : undefined);
	const resources = $derived(character ? resourcesOf(character, maxStress) : undefined);

	const trackers = $derived(derivedChar?.roll_option_trackers ?? []);
	const afterOptions = $derived(
		kind && outcome !== undefined
			? optionsFor(trackers, { kind, timing: 'after', outcome })
			: kind
				? optionsFor(trackers, { kind, timing: 'after' })
				: []
	);
	const waitingOnOutcome = $derived(
		kind
			? trackers.some(
					(tracker) =>
						tracker.option.requires_outcome !== undefined &&
						tracker.option.timing === 'after' &&
						(tracker.option.applies_to ?? []).includes(kind) &&
						tracker.option.requires_outcome !== outcome
				)
			: false
	);

	const events = $derived.by((): EffectEndEvent[] => {
		if (!kind) return [];
		if (kind === 'attack') {
			return outcome === 'success' ? ['attack_made', 'attack_succeeded'] : ['attack_made'];
		}
		if (kind === 'damage') return ['damage_rolled', 'damage_dealt'];
		return [];
	});
	const endable = $derived(
		endableInstances(character?.active_effects ?? {}, derivedChar?.effect_trackers ?? [], events)
	);

	// Attacks and spellcasts often need a confirmed success before an option or an effect end applies.
	const listensForSuccess = $derived(
		kind === 'attack' &&
			(derivedChar?.effect_trackers ?? []).some((tracker) =>
				tracker.effect.ends_on.includes('attack_succeeded')
			)
	);
	const askOutcome = $derived(
		!!kind &&
			OUTCOME_KINDS.includes(kind) &&
			(waitingOnOutcome || listensForSuccess || outcome !== undefined)
	);
	const visible = $derived(
		!!roll && canEdit && (afterOptions.length > 0 || endable.length > 0 || askOutcome)
	);

	function optionChoice(tracker: RollOptionTracker, dieIndex?: number) {
		if (needsDieChoice(tracker)) return { die_index: dieIndex };
		if (needsTokenChoice(tracker)) {
			const range = resources ? tokenRange(resources, tracker) : { min: 1, max: 1 };
			return { tokens: tokenChoice[tracker.key] ?? range.min };
		}
		return {};
	}

	function blockerFor(tracker: RollOptionTracker, dieIndex?: number): string | undefined {
		if (!resources) return 'Unavailable';
		return optionBlocker(resources, tracker, optionChoice(tracker, dieIndex));
	}

	async function useOption(tracker: RollOptionTracker, dieIndex?: number) {
		if (!character || !roll || !resources) return;
		const application = applyOption(resources, tracker, optionChoice(tracker, dieIndex));
		if (!application) return;
		const plan = planAfterRoll(roll, tracker, application);
		if (!plan) return;
		const previous = snapshot(character);
		const previousRoll: Roll = roll;
		commit(character, application.resources);
		undoToast(
			`${optionLabel(tracker)}.`,
			() => characterCtx?.character,
			previous,
			undefined,
			() => diceCtx.updateRoll(previousRoll)
		);
		if (plan.type === 'update') {
			diceCtx.updateRoll(plan.roll);
		} else if (plan.type === 'reroll') {
			delete outcomes[roll.id];
			await diceCtx.rerollDie(roll, plan.indices);
		} else if (plan.type === 'extra_die') {
			await diceCtx.rollExtra(roll, [{ type: plan.die as Roll['dice'][number]['type'] }]);
		} else if (plan.type === 'damage') {
			await diceCtx.roll({
				name: optionLabel(tracker),
				dice: Array.from({ length: plan.count }, () => ({
					type: plan.die as Roll['dice'][number]['type']
				})),
				context: { kind: 'damage', damage_type: 'mag' }
			});
		}
	}

	function endEffect(entry: EndableInstance) {
		if (!character) return;
		const previous = snapshot(character);
		character.active_effects = endInstances(character.active_effects ?? {}, [entry]);
		undoToast(
			`Ended ${effectLabel(entry.tracker)}${entry.instance.target ? ` against ${entry.instance.target}` : ''}.`,
			() => characterCtx?.character,
			previous
		);
	}

	const OUTCOME_LABELS: Record<string, [string, string]> = {
		attack: ['Hit', 'Miss'],
		spellcast: ['Success', 'Failure'],
		trait: ['Success', 'Failure'],
		experience: ['Success', 'Failure']
	};
</script>

{#if visible && roll && kind}
	<div
		class="pointer-events-auto fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] left-1/2 z-46 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 rounded-2xl border-2 border-primary-muted bg-card p-3 text-sm shadow-xl"
		role="region"
		aria-label={`${roll.name} result`}
	>
		<div class="flex items-start justify-between gap-2">
			<div class="flex flex-col">
				<p class="font-semibold">
					{roll.name}{rollDescription(roll) ? ` · ${rollDescription(roll)}` : ''}
				</p>
				<p class="text-xs text-muted-foreground">{rollArithmetic(roll).join(' · ')}</p>
			</div>
			<button
				type="button"
				class="rounded-full p-1 hover:bg-muted"
				aria-label="Dismiss"
				onclick={() => (dismissedId = roll.id)}
			>
				<X class="size-4" />
			</button>
		</div>

		{#if askOutcome}
			{@const [yes, no] = OUTCOME_LABELS[kind] ?? ['Success', 'Failure']}
			<div class="flex items-center gap-2">
				<span class="text-xs text-muted-foreground">Did it land?</span>
				<Button
					size="sm"
					variant={outcome === 'success' ? 'default' : 'outline'}
					onclick={() => (outcomes[roll.id] = 'success')}
				>
					{yes}
				</Button>
				<Button
					size="sm"
					variant={outcome === 'failure' ? 'default' : 'outline'}
					onclick={() => (outcomes[roll.id] = 'failure')}
				>
					{no}
				</Button>
			</div>
		{/if}

		{#each afterOptions as tracker (tracker.key)}
			{@const cost = optionCostCaption(tracker)}
			{@const blocker = blockerFor(
				tracker,
				needsDieChoice(tracker) && resources
					? availablePoolDice(resources, tracker)[0]?.index
					: undefined
			)}
			<div class="flex flex-col gap-1 rounded-md border p-2">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-col">
						<span class="font-medium">{optionLabel(tracker)}</span>
						<span class="text-xs text-muted-foreground">
							{tracker.source_title}{cost ? ` · ${cost}` : ''}
						</span>
					</div>
					{#if needsDieChoice(tracker) && resources}
						<div class="flex flex-wrap gap-1" role="group" aria-label="Choose a die to spend">
							{#each availablePoolDice(resources, tracker) as die (die.index)}
								<Button size="sm" variant="outline" onclick={() => useOption(tracker, die.index)}>
									{die.value}
								</Button>
							{/each}
						</div>
					{:else if needsTokenChoice(tracker) && resources}
						{@const range = tokenRange(resources, tracker)}
						<div class="flex items-center gap-1">
							<input
								type="number"
								min={range.min}
								max={range.max}
								aria-label="Tokens to spend"
								class="h-8 w-16 rounded-md border border-input bg-transparent px-2"
								value={tokenChoice[tracker.key] ?? range.min}
								onchange={(event) => (tokenChoice[tracker.key] = Number(event.currentTarget.value))}
							/>
							<Button
								size="sm"
								variant="outline"
								disabled={!!blockerFor(tracker)}
								onclick={() => useOption(tracker)}
							>
								Use
							</Button>
						</div>
					{:else}
						<Button
							size="sm"
							variant="outline"
							disabled={!!blockerFor(tracker)}
							onclick={() => useOption(tracker)}
						>
							Use
						</Button>
					{/if}
				</div>
				{#if blocker}
					<span class="text-xs text-destructive">{blocker}</span>
				{/if}
			</div>
		{/each}

		{#each endable as entry (entry.tracker.key + entry.event + entry.instance.id)}
			<div
				class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-hope/50 p-2"
			>
				<span class="text-xs">
					{EFFECT_EVENT_LABELS[entry.event]}: end
					<span class="font-medium">
						{effectLabel(entry.tracker)}{entry.instance.target
							? ` against ${entry.instance.target}`
							: ''}
					</span>?
				</span>
				<Button size="sm" variant="outline" onclick={() => endEffect(entry)}>End</Button>
			</div>
		{/each}
	</div>
{/if}
