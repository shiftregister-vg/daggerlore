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
	const DOWNTIME_DICE_Z_INDEX = '60';
	let moreInfoOpen = $state(false);
	let rollingShortMove = $state<ShortDiceMove | null>(null);
	let hasDowntimeDiceLayerOverride = $state(false);

	let tier = $derived.by(() => {
		if (!character) return 1;
		return level_to_tier(character.level);
	});

	let maxShortActions = $derived(derived_character_data?.max_short_rest_actions ?? 0);
	let maxLongActions = $derived(derived_character_data?.max_long_rest_actions ?? 0);
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
			rollingShortMove = null;

			if (!rolledDie?.result) return;

			const resolvedAmount = rolledDie.result + tier;
			applyShortRoll(moveId, resolvedAmount);
		});

		return unsubscribe;
	});

	$effect(() => {
		if (diceCtx.isRolling) return;
		if (diceCtx.diceOnScreen) return;
		if (rollingShortMove === null) return;

		rollingShortMove = null;
	});

	function createUndoToast(message: string, undo: () => void, description?: string) {
		toast.success(message, {
			description,
			action: {
				label: 'Undo',
				onClick: () => undo()
			}
		});
	}

	function prepareShortRoll(moveId: ShortDiceMove) {
		if (!character || !characterCtx.canEdit) return;
		if (rollingShortMove !== null) return;

		rollingShortMove = moveId;
		if (!hasDowntimeDiceLayerOverride) {
			diceCtx.setLayerZIndexOverride(DOWNTIME_DICE_Z_INDEX);
			hasDowntimeDiceLayerOverride = true;
		}
	}

	function applyShortRoll(moveId: ShortDiceMove, amount: number) {
		if (!character) return;
		const previousNoMercyBonus = endNoMercy();

		if (moveId === 'tendToWounds') {
			const previous = character.marked_hp;
			const next = Math.max(0, previous - amount);
			character.marked_hp = next;
			createUndoToast(`${amount} HP cleared`, () => {
				character.marked_hp = previous;
				restoreNoMercy(previousNoMercyBonus);
			});
			return;
		}

		if (moveId === 'clearStress') {
			const previous = character.marked_stress;
			const next = Math.max(0, previous - amount);
			character.marked_stress = next;
			createUndoToast(`${amount} Stress cleared`, () => {
				character.marked_stress = previous;
				restoreNoMercy(previousNoMercyBonus);
			});
			return;
		}

		const previous = character.marked_armor;
		const next = Math.max(0, previous - amount);
		character.marked_armor = next;
		createUndoToast(`${amount} Armor Slots cleared`, () => {
			character.marked_armor = previous;
			restoreNoMercy(previousNoMercyBonus);
		});
	}

	function applyHope(amount: number) {
		if (!character) return;
		const previousNoMercyBonus = endNoMercy();

		const previous = character.marked_hope;
		const next = Math.min(maxHope, previous + amount);
		character.marked_hope = next;

		createUndoToast(`Gained ${amount} Hope`, () => {
			character.marked_hope = previous;
			restoreNoMercy(previousNoMercyBonus);
		});
	}

	function clearAllHp() {
		if (!character) return;
		const previousNoMercyBonus = endNoMercy();

		const previous = character.marked_hp;
		character.marked_hp = 0;
		createUndoToast('Cleared all HP', () => {
			character.marked_hp = previous;
			restoreNoMercy(previousNoMercyBonus);
		});
	}

	function clearAllStress() {
		if (!character) return;
		const previousNoMercyBonus = endNoMercy();

		const previous = character.marked_stress;
		character.marked_stress = 0;
		createUndoToast('Cleared all Stress', () => {
			character.marked_stress = previous;
			restoreNoMercy(previousNoMercyBonus);
		});
	}

	function clearAllArmor() {
		if (!character) return;
		const previousNoMercyBonus = endNoMercy();

		const previous = character.marked_armor;
		character.marked_armor = 0;
		createUndoToast('Cleared all Armor Slots', () => {
			character.marked_armor = previous;
			restoreNoMercy(previousNoMercyBonus);
		});
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
		ended: RefreshedFeature[] = []
	) {
		const parts = [
			refreshed.length > 0 ? `Refreshed ${featureNames(refreshed)}.` : '',
			cleared.length > 0 ? `Cleared ${featureNames(cleared)}.` : '',
			ended.length > 0 ? `Ended ${featureNames(ended)}.` : ''
		].filter(Boolean);
		return parts.length > 0 ? parts.join(' ') : 'No features to refresh.';
	}

	/**
	 * Applies one confirmed event to usage trackers and resource pools and returns an undo callback.
	 * Dice pools that refill are emptied here and listed in `diceToRoll`.
	 */
	function resetFeatures(usageEvent: UsageResetEvent | null, poolEvent: PoolEvent) {
		if (!character) {
			return { refreshed: [], cleared: [], ended: [], diceToRoll: [], undo: () => {} };
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
			? applyEffectEvent(
					previousEffects,
					derived_character_data?.effect_trackers ?? [],
					poolEvent
				)
			: { next: previousEffects, ended: [] };
		character.active_effects = effects.next;

		// A pool the event emptied without refilling was cleared rather than refreshed.
		const wasCleared = (tracker: PoolTracker) =>
			!tracker.refill_on.includes(poolEvent) &&
			!diceRequested(tracker) &&
			(pools.tokens[tracker.key] ?? 0) === 0;
		const diceRequested = (tracker: PoolTracker) =>
			pools.diceToRoll.some((request) => request.tracker.key === tracker.key);
		return {
			refreshed: [
				...usage.refreshed,
				...pools.refreshed.filter((tracker) => !wasCleared(tracker))
			] as RefreshedFeature[],
			cleared: [...pools.refreshed.filter(wasCleared), ...records.cleared] as RefreshedFeature[],
			ended: effects.ended.map((tracker) => ({ ...tracker, label: effectLabel(tracker) })),
			diceToRoll: pools.diceToRoll,
			undo: () => {
				if (!character) return;
				character.feature_uses = previousUses;
				character.feature_pool_tokens = previousTokens;
				character.feature_pool_dice = previousDice;
				character.feature_records = previousRecords;
				character.active_effects = previousEffects;
			}
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

		const previousNoMercyBonus = endNoMercy();
		const usage = resetFeatures('short_rest', 'short_rest');

		createUndoToast(
			'Completed short rest',
			() => {
				usage.undo();
				restoreNoMercy(previousNoMercyBonus);
			},
			refreshedDescription(usage.refreshed, usage.cleared, usage.ended)
		);
	}

	function completeLongRest() {
		if (!character || !characterCtx.canEdit) return;

		const previousLegacyTokens = Object.fromEntries(
			LEGACY_LONG_REST_TOKEN_CARD_IDS.flatMap((cardId) =>
				character.card_tokens[cardId] === undefined ? [] : [[cardId, character.card_tokens[cardId]]]
			)
		);
		const previousNoMercyBonus = endNoMercy();
		const usage = resetFeatures('long_rest', 'long_rest');
		character.card_tokens = {
			...character.card_tokens,
			...Object.fromEntries(Object.keys(previousLegacyTokens).map((cardId) => [cardId, 0]))
		};

		createUndoToast(
			'Completed long rest',
			() => {
				if (!character) return;
				usage.undo();
				character.card_tokens = { ...character.card_tokens, ...previousLegacyTokens };
				restoreNoMercy(previousNoMercyBonus);
			},
			refreshedDescription(usage.refreshed, usage.cleared, usage.ended)
		);
	}

	function endScene() {
		if (!character || !characterCtx.canEdit) return;

		const usage = resetFeatures('scene', 'scene');
		createUndoToast(
			'Ended scene',
			usage.undo,
			refreshedDescription(usage.refreshed, usage.cleared, usage.ended)
		);
	}

	async function startSession() {
		if (!character || !characterCtx.canEdit) return;

		const features = resetFeatures(null, 'session_start');
		let undone = false;
		createUndoToast(
			'Started a new session',
			() => {
				undone = true;
				features.undo();
			},
			refreshedDescription(features.refreshed, features.cleared, features.ended)
		);
		await rollPoolDice(features.diceToRoll, () => !undone);
	}

	function endSession() {
		if (!character || !characterCtx.canEdit) return;

		const usage = resetFeatures('session', 'session_end');
		const descriptions = [refreshedDescription(usage.refreshed, usage.cleared, usage.ended)];
		const previousHope = character.marked_hope;
		const previousSlayerDice = character.card_tokens[SLAYER_CARD_ID] ?? 0;
		if (hasSlayerDice) {
			character.marked_hope = Math.min(maxHope, previousHope + previousSlayerDice);
			character.card_tokens = { ...character.card_tokens, [SLAYER_CARD_ID]: 0 };
			const gainedHope = character.marked_hope - previousHope;
			descriptions.push(
				previousSlayerDice > 0
					? `Cleared ${previousSlayerDice} Slayer Dice and gained ${gainedHope} Hope.`
					: 'No Slayer Dice were carried over.'
			);
		}

		createUndoToast(
			'Ended session',
			() => {
				if (!character) return;
				usage.undo();
				if (hasSlayerDice) {
					character.marked_hope = previousHope;
					character.card_tokens = {
						...character.card_tokens,
						[SLAYER_CARD_ID]: previousSlayerDice
					};
				}
			},
			descriptions.join(' ')
		);
	}

	function endNoMercy(): string | undefined {
		if (!character || !derived_character_data?.hasNoMercyHopeFeature) return undefined;
		const previous = character.feature_choices.no_mercy_bonus?.[0] ?? '0';
		character.feature_choices.no_mercy_bonus = ['0'];
		return previous;
	}

	function restoreNoMercy(previous: string | undefined) {
		if (!character || previous === undefined) return;
		character.feature_choices.no_mercy_bonus = [previous];
	}

	let shortRestRows = $derived.by<RestRow[]>(() => [
		{
			title: 'Tend to Wounds',
			description: 'Clear 1d4 + Tier HP',
			actions: [],
			roll: {
				name: shortDiceMoveLabels.tendToWounds,
				moveId: 'tendToWounds',
				diceString: `1d4 + ${tier}`,
				icon: 'heart'
			}
		},
		{
			title: 'Clear Stress',
			description: 'Clear 1d4 + Tier Stress',
			actions: [],
			roll: {
				name: shortDiceMoveLabels.clearStress,
				moveId: 'clearStress',
				diceString: `1d4 + ${tier}`,
				icon: 'lightning'
			}
		},
		{
			title: 'Repair Armor',
			description: 'Clear 1d4 + Tier Armor Slots',
			actions: [],
			roll: {
				name: shortDiceMoveLabels.repairArmor,
				moveId: 'repairArmor',
				diceString: `1d4 + ${tier}`,
				icon: 'shield'
			}
		},
		{
			title: 'Prepare',
			description: 'Gain 1 Hope solo or 2 Hope with party',
			actions: [
				{ label: 'Gain 1 Hope', onclick: () => applyHope(1), hopeCount: 1 },
				{ label: 'Gain 2 Hope', onclick: () => applyHope(2), hopeCount: 2 }
			]
		}
	]);

	const longRestRows: RestRow[] = [
		{
			title: 'Tend to All Wounds',
			description: 'Clear all HP',
			actions: [{ label: 'Clear HP', onclick: clearAllHp, icon: 'heart' }]
		},
		{
			title: 'Clear All Stress',
			description: 'Clear all Stress',
			actions: [{ label: 'Clear Stress', onclick: clearAllStress, icon: 'lightning' }]
		},
		{
			title: 'Repair All Armor',
			description: 'Clear all Armor Slots',
			actions: [{ label: 'Clear Armor', onclick: clearAllArmor, icon: 'shield' }]
		},
		{
			title: 'Prepare',
			description: 'Gain 1 Hope solo or 2 Hope with party',
			actions: [
				{ label: 'Gain 1 Hope', onclick: () => applyHope(1), hopeCount: 1 },
				{ label: 'Gain 2 Hope', onclick: () => applyHope(2), hopeCount: 2 }
			]
		},
		{
			title: 'Work on a Project',
			description: 'Advance a long-term project',
			actions: []
		}
	];
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

	<div class="mb-2 flex items-center justify-between gap-3 border-b pb-2">
		<p class="font-bold">
			Short Rest
			<span class="ml-1 text-xs text-muted-foreground">({maxShortActions} available)</span>
		</p>
		<Button
			variant="outline"
			size="sm"
			disabled={!characterCtx.canEdit}
			onclick={completeShortRest}
		>
			Complete Short Rest
		</Button>
	</div>

	<div class="gap- flex flex-col text-xs text-muted-foreground">
		{#each shortRestRows as row (row.title)}
			<p class="flex min-h-10 items-center justify-between gap-3">
				<span
					><span class="font-semibold text-foreground">{row.title}:</span> {row.description}</span
				>
				{#if row.roll}
					<RollButton
						type="base"
						name={row.roll.name}
						diceString={row.roll.diceString}
						disabled={rollingShortMove !== null || !characterCtx.canEdit}
						beforeRoll={() => {
							if (!row.roll) return;
							prepareShortRoll(row.roll.moveId);
						}}
					>
						{#if row.roll.icon}
							{@render resourceIcon(row.roll.icon)}
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
						{:else}
							{action.label}
						{/if}
					</Button>
				{/each}
			</p>
		{/each}
	</div>

	<div class="mt-10 mb-2 flex items-center justify-between gap-3 border-b pb-2">
		<p class="font-bold">
			Long Rest
			<span class="ml-1 text-xs text-muted-foreground">({maxLongActions} available)</span>
		</p>
		<Button
			variant="outline"
			size="sm"
			disabled={!characterCtx.canEdit}
			onclick={completeLongRest}
		>
			Complete Long Rest
		</Button>
	</div>

	<div class="gap- flex flex-col text-xs text-muted-foreground">
		{#each longRestRows as row (row.title)}
			<p class="py- flex min-h-10 items-center justify-between gap-3">
				<span
					><span class="font-semibold text-foreground">{row.title}:</span> {row.description}</span
				>
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
							Clear
							{@render resourceIcon(action.icon)}
						{:else}
							{action.label}
						{/if}
					</Button>
				{/each}
			</p>
		{/each}
	</div>

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
