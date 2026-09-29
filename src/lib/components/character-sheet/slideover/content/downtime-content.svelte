<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import Button from '$lib/components/ui/button/button.svelte';
	import RollButton from '$lib/components/dice/roll-button.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { getDiceContext } from '$lib/state/dice.svelte';
	import DowntimeRules from '$lib/components/rule-snippets/downtime-rules.svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Heart from '@lucide/svelte/icons/heart';
	import Shield from '@lucide/svelte/icons/shield';
	import { cn, level_to_tier } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import { applyUsageResetEvent, type UsageResetEvent } from '$lib/state/feature-usage';
	import { applyPoolEvent, setPoolDice, type PoolTracker } from '$lib/state/feature-pools';
	import { applyRecordEvent } from '$lib/state/feature-records';
	import { applyEffectEvent, effectLabel, isDowntimeEffectEvent } from '$lib/state/feature-effects';
	import { restoreDowntime, snapshotDowntime } from '$lib/state/downtime-snapshot';
	import {
		allowanceBreakdown,
		applyMoves,
		clearRestMoves,
		describeMove,
		moveWarning,
		recordMove,
		summarizeRest,
		undoMove,
		type AllowanceSummary,
		type MoveEntry,
		type RestKind
	} from '$lib/state/downtime-moves';
	import {
		canMirrorStressClear,
		mirrorStressClear,
		returnAfterLongRest
	} from '$lib/state/companion-recovery';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import X from '@lucide/svelte/icons/x';
	import type { PoolEvent } from '@domain/schemas/rules';

	let { open = false }: { open?: boolean } = $props();

	type ShortDiceMove = 'tendToWounds' | 'clearStress' | 'repairArmor';
	type ActionIcon = 'heart' | 'shield' | 'lightning';
	type HopeCount = 1 | 2;
	type InlineAction = {
		label: string;
		onclick: () => void;
		icon?: ActionIcon;
		hopeCount?: HopeCount;
	};
	type RestRow = {
		category: RestKind;
		title: string;
		description: string;
		actions: InlineAction[];
		roll?: {
			name: string;
			moveId: ShortDiceMove;
			diceString: string;
			icon?: ActionIcon;
		};
	};

	const characterCtx = getCharacterContext();
	const diceCtx = getDiceContext();
	const character = $derived(characterCtx.character);
	const derived_character_data = $derived(characterCtx.derived_character_data);

	const shortDiceMoveLabels: Record<ShortDiceMove, string> = {
		tendToWounds: 'Tend to Wounds',
		clearStress: 'Clear Stress',
		repairArmor: 'Repair Armor'
	};
	const shortDiceMoveActions: Record<ShortDiceMove, MoveEntry['action']> = {
		tendToWounds: 'tend_to_wounds',
		clearStress: 'clear_stress',
		repairArmor: 'repair_armor'
	};
	const DOWNTIME_DICE_Z_INDEX = '60';
	let moreInfoOpen = $state(false);
	let rollingShortMove = $state<ShortDiceMove | null>(null);
	let rollingShortRest = $state<RestKind>('short');
	let mirrorCompanionStress = $state(true);
	let hasDowntimeDiceLayerOverride = $state(false);

	let tier = $derived.by(() => {
		if (!character) return 1;
		return level_to_tier(character.level);
	});

	const noAllowances = { short: [], long: [] };
	let allowances = $derived(derived_character_data?.downtime_allowances ?? noAllowances);
	let shortSummary = $derived(summarizeRest('short', allowances, character?.rest_moves ?? []));
	let longSummary = $derived(summarizeRest('long', allowances, character?.rest_moves ?? []));
	let companionCanMirror = $derived(canMirrorStressClear(character?.companion));
	let maxHope = $derived(derived_character_data?.max_hope ?? 0);
	let hasSlayerDice = $derived(
		character?.primary_subclass_id === 'warrior_call_of_the_slayer' ||
			character?.secondary_subclass_id === 'warrior_call_of_the_slayer'
	);
	const SLAYER_CARD_ID = 'warrior_call_of_the_slayer';
	// Manual "Used" tokens that long rests still clear: A Soldier's Bond before v3 (characters pinned
	// to v2 until they adopt the usage tracker) and power_through_pain until #16 resolves it.
	const LEGACY_LONG_REST_TOKEN_CARD_IDS = ['a_soldiers_bond', 'power_through_pain'] as const;

	$effect(() => {
		if (diceCtx.diceOnScreen) return;
		if (!hasDowntimeDiceLayerOverride) return;

		diceCtx.setLayerZIndexOverride(null);
		hasDowntimeDiceLayerOverride = false;
	});

	$effect(() => {
		if (open) return;
		if (!hasDowntimeDiceLayerOverride) return;

		diceCtx.setLayerZIndexOverride(null);
		hasDowntimeDiceLayerOverride = false;
		if (diceCtx.isRolling) {
			diceCtx.cancelActiveRoll();
			return;
		}
		diceCtx.fadeDisplayedDiceNow();
	});

	$effect(() => {
		const unsubscribe = diceCtx.onRollEnd((roll) => {
			if (rollingShortMove === null) return;

			const rolledDie = roll.dice.find((die) => die.type === 'd4' && die.result !== undefined);
			const moveId = rollingShortMove;
			const rest = rollingShortRest;
			rollingShortMove = null;

			if (!rolledDie?.result) return;

			const resolvedAmount = rolledDie.result + tier;
			chooseRolledMove(moveId, resolvedAmount, rest);
		});

		return unsubscribe;
	});

	$effect(() => {
		if (diceCtx.isRolling) return;
		if (diceCtx.diceOnScreen) return;
		if (rollingShortMove === null) return;

		rollingShortMove = null;
	});

	/**
	 * Runs one confirmed change and offers a single Undo that restores everything downtime can touch
	 * (resources, feature state, moves taken, companion), so no handler tracks its own "previous" values.
	 */
	function commitWithUndo(
		message: string,
		apply: () => string | undefined | void,
		onUndo?: () => void
	) {
		const live = characterCtx.character;
		if (!live) return;
		const before = snapshotDowntime(live);
		const description = apply() || undefined;
		toast.success(message, {
			description,
			action: {
				label: 'Undo',
				onClick: () => {
					const current = characterCtx.character;
					if (current) restoreDowntime(current, before);
					onUndo?.();
				}
			}
		});
	}

	function joinDescription(...parts: (string | undefined)[]) {
		return parts.filter(Boolean).join(' ');
	}

	/**
	 * Chooses a move for the rest. Nothing on the sheet changes until that rest is completed, so a move
	 * chosen by mistake is removed without any effect. Exceeding the allowances warns; it never blocks.
	 */
	function chooseMove(
		rest: RestKind,
		category: RestKind,
		title: string,
		action: MoveEntry['action'],
		amount?: number
	) {
		if (!character || !characterCtx.canEdit) return;
		const moves = character.rest_moves ?? [];
		const warning = moveWarning(summarizeRest(rest, allowances, moves), category);
		character.rest_moves = recordMove(moves, { move: title, action, amount, rest, category });
		if (warning) toast.warning(warning);
	}

	function removeChosenMove(id: string) {
		if (!character || !characterCtx.canEdit) return;
		character.rest_moves = undoMove(character.rest_moves ?? [], id);
	}

	/** A companion clears the same Stress its owner did, when the player confirms it. */
	function clearCompanionStress(cleared: number): string | undefined {
		if (!character?.companion || !mirrorCompanionStress || cleared <= 0) return undefined;
		const before = character.companion.marked_stress;
		const next = mirrorStressClear(character.companion, cleared);
		if (next.marked_stress === before) return undefined;
		character.companion = next;
		return `Companion cleared ${before - next.marked_stress} Stress.`;
	}

	function prepareShortRoll(moveId: ShortDiceMove, rest: RestKind) {
		if (!character || !characterCtx.canEdit) return;
		if (rollingShortMove !== null) return;

		rollingShortMove = moveId;
		rollingShortRest = rest;
		if (!hasDowntimeDiceLayerOverride) {
			diceCtx.setLayerZIndexOverride(DOWNTIME_DICE_Z_INDEX);
			hasDowntimeDiceLayerOverride = true;
		}
	}

	/** The roll is kept with the chosen move; it applies when the rest is completed. */
	function chooseRolledMove(moveId: ShortDiceMove, amount: number, rest: RestKind) {
		chooseMove(rest, 'short', shortDiceMoveLabels[moveId], shortDiceMoveActions[moveId], amount);
	}

	/**
	 * Applies the moves chosen for a rest, in the order they were chosen. Call it inside
	 * `commitWithUndo` so the completion is one undo.
	 */
	function applyChosenMoves(rest: RestKind): string | undefined {
		if (!character) return undefined;
		const chosen = (character.rest_moves ?? []).filter((move) => move.rest === rest);
		if (chosen.length === 0) return undefined;
		const result = applyMoves(character, chosen, maxHope);
		character.marked_hp = result.resources.marked_hp;
		character.marked_stress = result.resources.marked_stress;
		character.marked_hope = result.resources.marked_hope;
		character.marked_armor = result.resources.marked_armor;
		return joinDescription(
			`Took ${chosen.map((move) => move.move).join(', ')}.`,
			clearCompanionStress(result.stressCleared)
		);
	}

	type RefreshedFeature = { feature_title: string; source_title: string; label?: string };

	function featureNames(features: RefreshedFeature[]): string {
		return [
			...new Set(
				features.map((tracker) => tracker.label || tracker.feature_title || tracker.source_title)
			)
		].join(', ');
	}

	function refreshedDescription(
		refreshed: RefreshedFeature[],
		cleared: RefreshedFeature[] = [],
		ended: RefreshedFeature[] = [],
		converted = ''
	) {
		const parts = [
			refreshed.length > 0 ? `Refreshed ${featureNames(refreshed)}.` : '',
			cleared.length > 0 ? `Cleared ${featureNames(cleared)}.` : '',
			ended.length > 0 ? `Ended ${featureNames(ended)}.` : '',
			converted
		].filter(Boolean);
		return parts.length > 0 ? parts.join(' ') : 'No features to refresh.';
	}

	/**
	 * Applies one confirmed event to usage trackers, resource pools, records and effects. Call it inside
	 * `commitWithUndo`. Dice pools that refill are emptied here and listed in `diceToRoll`.
	 */
	function resetFeatures(usageEvent: UsageResetEvent | null, poolEvent: PoolEvent) {
		if (!character) {
			return { description: '', diceToRoll: [] as { tracker: PoolTracker; count: number }[] };
		}
		const previousUses = character.feature_uses ?? {};
		const previousTokens = character.feature_pool_tokens ?? {};
		const previousDice = character.feature_pool_dice ?? {};
		const previousRecords = character.feature_records ?? {};
		const previousEffects = character.active_effects ?? {};

		const usage = usageEvent
			? applyUsageResetEvent(previousUses, derived_character_data?.usage_trackers ?? [], usageEvent)
			: { next: previousUses, refreshed: [] };
		const pools = applyPoolEvent(
			{ tokens: previousTokens, dice: previousDice },
			derived_character_data?.pool_trackers ?? [],
			poolEvent
		);
		character.feature_uses = usage.next;
		character.feature_pool_tokens = pools.tokens;
		character.feature_pool_dice = pools.dice;
		const records = applyRecordEvent(
			previousRecords,
			derived_character_data?.record_trackers ?? [],
			poolEvent
		);
		character.feature_records = records.next;
		const effects = isDowntimeEffectEvent(poolEvent)
			? applyEffectEvent(previousEffects, derived_character_data?.effect_trackers ?? [], poolEvent)
			: { next: previousEffects, ended: [] };
		character.active_effects = effects.next;

		// Tokens a clearing pool turns into Hope, up to the character's maximum.
		const hopePools = pools.converted.filter(({ tracker }) => tracker.clear_gain === 'hope');
		let converted = '';
		if (hopePools.length > 0) {
			const previousHope = character.marked_hope;
			const amount = hopePools.reduce((sum, { amount }) => sum + amount, 0);
			character.marked_hope = Math.min(maxHope, previousHope + amount);
			converted = `Turned ${featureNames(hopePools.map(({ tracker }) => tracker))} into ${character.marked_hope - previousHope} Hope.`;
		}

		// A pool the event emptied without refilling was cleared rather than refreshed.
		const wasConverted = (tracker: PoolTracker) =>
			hopePools.some((entry) => entry.tracker.key === tracker.key);
		const wasCleared = (tracker: PoolTracker) =>
			!tracker.refill_on.includes(poolEvent) &&
			!diceRequested(tracker) &&
			(pools.tokens[tracker.key] ?? 0) === 0;
		const diceRequested = (tracker: PoolTracker) =>
			pools.diceToRoll.some((request) => request.tracker.key === tracker.key);
		return {
			description: refreshedDescription(
				[...usage.refreshed, ...pools.refreshed.filter((tracker) => !wasCleared(tracker))],
				[
					...pools.refreshed.filter((tracker) => wasCleared(tracker) && !wasConverted(tracker)),
					...records.cleared
				],
				effects.ended.map((tracker) => ({ ...tracker, label: effectLabel(tracker) })),
				converted
			),
			diceToRoll: pools.diceToRoll
		};
	}

	async function rollPoolDice(
		requests: { tracker: PoolTracker; count: number }[],
		isCurrent: () => boolean
	) {
		if (requests.length === 0) return;
		if (!hasDowntimeDiceLayerOverride) {
			diceCtx.setLayerZIndexOverride(DOWNTIME_DICE_Z_INDEX);
			hasDowntimeDiceLayerOverride = true;
		}
		for (const { tracker, count } of requests) {
			const results = await diceCtx.roll({
				name: tracker.label || tracker.feature_title || tracker.source_title,
				dice: Array.from({ length: count }, () => ({ type: tracker.die ?? 'd6' }))
			});
			if (!character || !isCurrent() || results.length === 0) continue;
			character.feature_pool_dice = setPoolDice(
				character.feature_pool_dice ?? {},
				tracker,
				results.map((result) => result.value)
			);
		}
	}

	function completeShortRest() {
		if (!character || !characterCtx.canEdit) return;

		commitWithUndo('Completed short rest', () => {
			endNoMercy();
			const moves = applyChosenMoves('short');
			const features = resetFeatures('short_rest', 'short_rest');
			character.rest_moves = clearRestMoves(character.rest_moves ?? [], 'short');
			return joinDescription(moves, features.description);
		});
	}

	function completeLongRest() {
		if (!character || !characterCtx.canEdit) return;

		commitWithUndo('Completed long rest', () => {
			endNoMercy();
			const moves = applyChosenMoves('long');
			const features = resetFeatures('long_rest', 'long_rest');
			character.card_tokens = {
				...character.card_tokens,
				...Object.fromEntries(
					LEGACY_LONG_REST_TOKEN_CARD_IDS.filter(
						(cardId) => character.card_tokens[cardId] !== undefined
					).map((cardId) => [cardId, 0])
				)
			};
			character.rest_moves = clearRestMoves(character.rest_moves ?? [], 'long');
			let companion: string | undefined;
			if (character.companion?.away) {
				const before = character.companion.marked_stress;
				character.companion = returnAfterLongRest(character.companion);
				companion = `Companion returned with ${before - character.companion.marked_stress} Stress cleared.`;
			}
			return joinDescription(moves, features.description, companion);
		});
	}

	function endScene() {
		if (!character || !characterCtx.canEdit) return;

		commitWithUndo('Ended scene', () => resetFeatures('scene', 'scene').description);
	}

	async function startSession() {
		if (!character || !characterCtx.canEdit) return;

		let undone = false;
		let diceToRoll: { tracker: PoolTracker; count: number }[] = [];
		commitWithUndo(
			'Started a new session',
			() => {
				const features = resetFeatures(null, 'session_start');
				diceToRoll = features.diceToRoll;
				return features.description;
			},
			() => {
				undone = true;
			}
		);
		await rollPoolDice(diceToRoll, () => !undone);
	}

	function endSession() {
		if (!character || !characterCtx.canEdit) return;

		commitWithUndo('Ended session', () => {
			const descriptions = [resetFeatures('session', 'session_end').description];
			// Rally is once per session; its manual toggle has no tracker to refresh.
			if (character.feature_choices.given_out_this_session?.[0] === 'yes') {
				character.feature_choices.given_out_this_session = ['no'];
				descriptions.push('Rally is available again.');
			}
			if (hasSlayerDice) {
				const previousHope = character.marked_hope;
				const previousSlayerDice = character.card_tokens[SLAYER_CARD_ID] ?? 0;
				character.marked_hope = Math.min(maxHope, previousHope + previousSlayerDice);
				character.card_tokens = { ...character.card_tokens, [SLAYER_CARD_ID]: 0 };
				const gainedHope = character.marked_hope - previousHope;
				descriptions.push(
					previousSlayerDice > 0
						? `Cleared ${previousSlayerDice} Slayer Dice and gained ${gainedHope} Hope.`
						: 'No Slayer Dice were carried over.'
				);
			}
			return descriptions.join(' ');
		});
	}

	function endNoMercy() {
		if (!character || !derived_character_data?.hasNoMercyHopeFeature) return;
		character.feature_choices.no_mercy_bonus = ['0'];
	}

	/** The moves a rest offers: its own kind, or the other kind where an allowance substitutes it. */
	function rowsFor(category: RestKind, rest: RestKind): RestRow[] {
		const prepare = (amount: number) => () =>
			chooseMove(rest, category, 'Prepare', 'prepare', amount);
		const hopeActions: InlineAction[] = [
			{ label: 'Gain 1 Hope', onclick: prepare(1), hopeCount: 1 },
			{ label: 'Gain 2 Hope', onclick: prepare(2), hopeCount: 2 }
		];
		if (category === 'short') {
			const dice = (
				moveId: ShortDiceMove,
				title: string,
				description: string,
				icon: ActionIcon
			): RestRow => ({
				category,
				title,
				description,
				actions: [],
				roll: {
					name: shortDiceMoveLabels[moveId],
					moveId,
					diceString: `1d4 + ${tier}`,
					icon
				}
			});
			return [
				dice('tendToWounds', 'Tend to Wounds', 'Clear 1d4 + Tier HP', 'heart'),
				dice('clearStress', 'Clear Stress', 'Clear 1d4 + Tier Stress', 'lightning'),
				dice('repairArmor', 'Repair Armor', 'Clear 1d4 + Tier Armor Slots', 'shield'),
				{
					category,
					title: 'Prepare',
					description: 'Gain 1 Hope solo or 2 Hope with party',
					actions: hopeActions
				}
			];
		}
		const clearAll = (
			title: string,
			description: string,
			action: MoveEntry['action'],
			icon: ActionIcon
		): RestRow => ({
			category,
			title,
			description,
			actions: [
				{
					label: title,
					onclick: () => chooseMove(rest, category, title, action),
					icon
				}
			]
		});
		return [
			clearAll('Tend to All Wounds', 'Clear all HP', 'clear_all_hp', 'heart'),
			clearAll('Clear All Stress', 'Clear all Stress', 'clear_all_stress', 'lightning'),
			clearAll('Repair All Armor', 'Clear all Armor Slots', 'clear_all_armor', 'shield'),
			{
				category,
				title: 'Prepare',
				description: 'Gain 1 Hope solo or 2 Hope with party',
				actions: hopeActions
			},
			{
				category,
				title: 'Work on a Project',
				description: 'Advance a long-term project',
				actions: [
					{
						label: 'Choose',
						onclick: () => chooseMove(rest, category, 'Work on a Project', 'project')
					}
				]
			}
		];
	}

	let shortRows = $derived(rowsFor('short', 'short'));
	let shortAlternateRows = $derived(
		shortSummary.alternate_allowed > 0 ? rowsFor('long', 'short') : []
	);
	let longRows = $derived(rowsFor('long', 'long'));
	let longAlternateRows = $derived(
		longSummary.alternate_allowed > 0 ? rowsFor('short', 'long') : []
	);
</script>

{#snippet resourceIcon(icon: ActionIcon)}
	{#if icon === 'heart'}
		<Heart class="size-3 fill-current" />
	{:else if icon === 'shield'}
		<Shield class="size-3 fill-current" />
	{:else if icon === 'lightning'}
		<svg
			stroke="currentColor"
			fill="currentColor"
			stroke-width="0"
			viewBox="0 0 16 16"
			class="size-3"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"
			></path>
		</svg>
	{/if}
{/snippet}

{#snippet hopeDiamonds(count: HopeCount)}
	<span class="inline-flex items-center gap-2">
		<span class="text-sm leading-none">+</span>
		<span class="inline-flex items-center gap-1.5">
			{#each Array(count) as _, index (index)}
				<span
					class="aspect-square h-[10px] w-[10px] rotate-45 rounded-[2px] border border-hope bg-hope shadow-[0_0_8px_rgba(253,212,113,0.4),0_0_16px_rgba(253,212,113,0.2)]"
				></span>
			{/each}
		</span>
	</span>
{/snippet}

{#snippet allowanceCaption(summary: AllowanceSummary)}
	<span
		class={cn(
			'ml-1 text-xs',
			summary.over_total > 0 || summary.over_alternate > 0
				? 'text-destructive'
				: 'text-muted-foreground'
		)}
	>
		({summary.taken} of {summary.total}
		{summary.total === 1 ? 'move' : 'moves'} chosen)
	</span>
{/snippet}

{#snippet allowanceDetails(summary: AllowanceSummary)}
	{#if summary.slots.length > 1}
		<p class="mb-2 text-xs text-muted-foreground">{allowanceBreakdown(summary)}</p>
	{/if}
	{#if summary.over_total > 0 || summary.over_alternate > 0}
		<p class="mb-2 text-xs text-destructive">
			More moves than your allowances cover. Confirm with your GM.
		</p>
	{/if}
{/snippet}

{#snippet moveLog(rest: RestKind)}
	{@const moves = (character?.rest_moves ?? []).filter((move) => move.rest === rest)}
	<p class="mb-2 text-xs text-muted-foreground">
		Choose your moves below. They take effect when you complete the rest.
	</p>
	{#if moves.length > 0}
		<ul class="mb-2 flex flex-wrap gap-1.5" aria-label="Chosen moves">
			{#each moves as move (move.id)}
				<li
					class="inline-flex items-center gap-1 rounded-full border bg-muted/40 py-0.5 pr-1 pl-2 text-xs"
				>
					<span>
						{move.move}
						<span class="text-muted-foreground">· {describeMove(move)}</span>
					</span>
					<button
						type="button"
						class="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
						aria-label="Remove {move.move} from the chosen moves"
						disabled={!characterCtx.canEdit}
						onclick={() => removeChosenMove(move.id)}
					>
						<X class="size-3" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

{#snippet restRows(rows: RestRow[], rest: RestKind)}
	<div class="flex flex-col text-xs text-muted-foreground">
		{#each rows as row (row.title)}
			<p class="flex min-h-10 items-center justify-between gap-3">
				<span
					><span class="font-semibold text-foreground">{row.title}:</span> {row.description}</span
				>
				{#if row.roll}
					{@const roll = row.roll}
					<RollButton
						type="base"
						name={roll.name}
						diceString={roll.diceString}
						disabled={rollingShortMove !== null || !characterCtx.canEdit}
						beforeRoll={() => prepareShortRoll(roll.moveId, rest)}
					>
						{#if roll.icon}
							{@render resourceIcon(roll.icon)}
						{/if}
					</RollButton>
				{/if}
				{#each row.actions as action (action.label)}
					<Button
						variant="outline"
						size="sm"
						aria-label={action.label}
						disabled={!characterCtx.canEdit}
						onclick={action.onclick}
					>
						{#if action.hopeCount}
							{@render hopeDiamonds(action.hopeCount)}
						{:else if action.icon}
							Choose
							{@render resourceIcon(action.icon)}
						{:else}
							{action.label}
						{/if}
					</Button>
				{/each}
			</p>
		{/each}
	</div>
{/snippet}

<Sheet.Header>
	<Sheet.Title class="flex gap-2">Downtime</Sheet.Title>
</Sheet.Header>

<!-- <div class="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center pt-6">
	<div class="pointer-events-auto"> -->
<!-- <Toaster position="top-center" richColors offset={0} mobileOffset={0} class="" /> -->
<!-- </div>
</div> -->

<div class="flex flex-col overflow-y-auto px-4 pb-6">
	<div class="mb-6 flex flex-col gap-3 rounded-md border border-primary/40 bg-primary/10 p-3">
		<div class="flex items-center justify-between gap-3">
			<div>
				<p class="font-semibold text-foreground">Scene</p>
				<p class="text-xs text-muted-foreground">Refresh once-per-scene features.</p>
			</div>
			<Button variant="outline" size="sm" disabled={!characterCtx.canEdit} onclick={endScene}>
				End Scene
			</Button>
		</div>
		<div class="flex items-center justify-between gap-3">
			<div>
				<p class="font-semibold text-foreground">Session</p>
				<p class="text-xs text-muted-foreground">
					Start: refill and roll session resources. End: clear them and refresh once-per-session
					features{hasSlayerDice ? ', converting unspent Slayer Dice to Hope' : ''}.
				</p>
			</div>
			<div class="flex shrink-0 gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={!characterCtx.canEdit || diceCtx.isRolling}
					onclick={startSession}
				>
					Start
				</Button>
				<Button variant="outline" size="sm" disabled={!characterCtx.canEdit} onclick={endSession}>
					End
				</Button>
			</div>
		</div>
	</div>

	{#if character?.companion}
		<div class="mb-6 flex flex-col gap-1 rounded-md border p-3 text-xs">
			{#if character.companion.away}
				<p class="font-semibold text-foreground">Companion is away</p>
				<p class="text-muted-foreground">
					It returns after your next long rest with 1 Stress cleared.
				</p>
			{:else}
				<label class="flex items-center gap-2 text-foreground">
					<Checkbox bind:checked={mirrorCompanionStress} disabled={!companionCanMirror} />
					<span>Companion clears the same Stress when you clear Stress</span>
				</label>
				{#if !companionCanMirror}
					<p class="text-muted-foreground">Your companion has no Stress marked.</p>
				{/if}
			{/if}
		</div>
	{/if}

	<div class="mb-2 flex items-center justify-between gap-3 border-b pb-2">
		<p class="font-bold">
			Short Rest
			{@render allowanceCaption(shortSummary)}
		</p>
		<Button
			variant="outline"
			size="sm"
			disabled={!characterCtx.canEdit}
			onclick={completeShortRest}
		>
			Complete Short Rest{shortSummary.taken > 0 ? ` (${shortSummary.taken})` : ''}
		</Button>
	</div>
	{@render allowanceDetails(shortSummary)}
	{@render moveLog('short')}

	{@render restRows(shortRows, 'short')}
	{#if shortAlternateRows.length > 0}
		<p class="mt-3 mb-1 text-xs font-semibold text-foreground">
			Long rest moves you can take instead
		</p>
		{@render restRows(shortAlternateRows, 'short')}
	{/if}

	<div class="mt-10 mb-2 flex items-center justify-between gap-3 border-b pb-2">
		<p class="font-bold">
			Long Rest
			{@render allowanceCaption(longSummary)}
		</p>
		<Button
			variant="outline"
			size="sm"
			disabled={!characterCtx.canEdit}
			onclick={completeLongRest}
		>
			Complete Long Rest{longSummary.taken > 0 ? ` (${longSummary.taken})` : ''}
		</Button>
	</div>
	{@render allowanceDetails(longSummary)}
	{@render moveLog('long')}

	{@render restRows(longRows, 'long')}
	{#if longAlternateRows.length > 0}
		<p class="mt-3 mb-1 text-xs font-semibold text-foreground">
			Short rest moves you can take instead
		</p>
		{@render restRows(longAlternateRows, 'long')}
	{/if}

	<Collapsible.Root bind:open={moreInfoOpen} class="mt-8">
		<Collapsible.Trigger class="flex items-center gap-1">
			<ChevronRight class={cn('size-4 transition-transform', moreInfoOpen && 'rotate-90')} />
			<p class="text-sm font-medium">More info</p>
		</Collapsible.Trigger>
		<Collapsible.Content>
			<DowntimeRules class="pt-2 pl-5" />
		</Collapsible.Content>
	</Collapsible.Root>
</div>
