import type { DiceType, Roll, RollInput } from '@domain/schemas/dice';
import { rollDescription, rollTotal } from './roll-math';
import { getContext, setContext } from 'svelte';
import DiceBox, { type DieResult, type RollGroup } from '@3d-dice/dice-box';

const DICE_CONFIG: Record<DiceType, { sides: number; themeColor: string }> = {
	d4: { sides: 4, themeColor: '#2a2045' },
	d6: { sides: 6, themeColor: '#2a2045' },
	d8: { sides: 8, themeColor: '#2a2045' },
	d10: { sides: 10, themeColor: '#2a2045' },
	d12: { sides: 12, themeColor: '#2a2045' },
	d20: { sides: 20, themeColor: '#2a2045' },
	hope: { sides: 12, themeColor: '#fde07d' },
	hope_d20: { sides: 20, themeColor: '#fde07d' },
	fear: { sides: 12, themeColor: '#6341b2' },
	advantage: { sides: 6, themeColor: '#009966' },
	disadvantage: { sides: 6, themeColor: '#a50036' }
};

// What a roll carries besides its dice: what it is for and what features added before it.
type RollMeta = Pick<Roll, 'context' | 'adjustments' | 'applied'>;

function diceContext() {
	const DEFAULT_DICE_LAYER_Z_INDEX = '40';
	const AUTO_CLEAR_DELAY_MS = 2400;
	const DICE_FADE_DURATION_MS = 200;

	let history = $state<Roll[]>([]);
	let lastRoll = $state<Roll | null>(null);
	let isRolling = $state(false);
	let diceOnScreen = $state(false);
	let layerZIndexOverride = $state<string | null>(null);

	// Internal state
	let Box: DiceBox | null = null;
	let diceBox: HTMLDivElement | null = null;
	let currentRollOrder: Array<{ type: string; themeColor: string; sides: number }> = [];
	let rollingRollId: string | null = null;
	let rollingRollData: { name: string; modifier: number; meta: RollMeta } | null = null;
	let pendingMergedReroll: {
		sourceRoll: Roll;
		dieIndices: number[];
		/** Extra dice were appended to the roll rather than rerolled; this is the roll without them. */
		original?: Roll;
	} | null = null;
	let autoClearTimeout: ReturnType<typeof setTimeout> | null = null;
	let fadeClearTimeout: ReturnType<typeof setTimeout> | null = null;
	const rollCompleteCallbacks = new Set<(roll: Roll) => void>();
	const beforeRollStartCallbacks = new Set<() => void>();
	const pickerOpenCallbacks = new Set<(input: RollInput) => void>();

	// --- Helper functions ---
	function resetRollingState() {
		isRolling = false;
		currentRollOrder = [];
		rollingRollId = null;
		rollingRollData = null;
		pendingMergedReroll = null;
	}

	function resetPosition() {
		if (!diceBox) return;
		diceBox.style.top = `calc(var(--navbar-height) + ${window.scrollY}px)`;
	}

	function applyLayerZIndex() {
		if (!diceBox) return;
		diceBox.style.zIndex = layerZIndexOverride ?? DEFAULT_DICE_LAYER_Z_INDEX;
	}

	function clearAutoClearTimers() {
		if (autoClearTimeout !== null) {
			clearTimeout(autoClearTimeout);
			autoClearTimeout = null;
		}

		if (fadeClearTimeout !== null) {
			clearTimeout(fadeClearTimeout);
			fadeClearTimeout = null;
		}
	}

	function showDiceBox() {
		if (!diceBox) return;
		diceBox.style.opacity = '1';
	}

	function hideDiceBox() {
		if (!diceBox) return;
		diceBox.style.opacity = '0';
	}

	function clearDisplayedDice() {
		diceOnScreen = false;
		hideDiceBox();
		if (Box) {
			Box.clear();
		}
	}

	function replaceHistoryRoll(targetRollId: string, nextRoll: Roll): boolean {
		const rollIndex = history.findIndex((roll) => roll.id === targetRollId);
		if (rollIndex === -1) return false;
		history[rollIndex] = nextRoll;
		history = [...history];
		return true;
	}

	function scheduleAutoClear() {
		clearAutoClearTimers();
		autoClearTimeout = setTimeout(() => {
			autoClearTimeout = null;
			hideDiceBox();
			fadeClearTimeout = setTimeout(() => {
				fadeClearTimeout = null;
				clearDisplayedDice();
			}, DICE_FADE_DURATION_MS);
		}, AUTO_CLEAR_DELAY_MS);
	}

	function fadeDisplayedDiceNow() {
		clearAutoClearTimers();
		if (!diceOnScreen) return;
		hideDiceBox();
		fadeClearTimeout = setTimeout(() => {
			fadeClearTimeout = null;
			clearDisplayedDice();
		}, DICE_FADE_DURATION_MS);
	}

	// --- Roll pipeline functions ---
	type DiceRollObject = {
		qty: number;
		sides: number;
		theme: 'default';
		themeColor: string;
	};

	function groupDiceByTypeAndColor(
		dice: Roll['dice']
	): Map<string, { type: string; sides: number; themeColor: string; count: number }> {
		const diceGroups = new Map<
			string,
			{ type: string; sides: number; themeColor: string; count: number }
		>();

		for (const die of dice) {
			const config = DICE_CONFIG[die.type];
			if (!config) {
				console.warn(`Unknown dice type: ${die.type}`);
				continue;
			}

			const key = `${config.sides}-${config.themeColor}`;
			const existing = diceGroups.get(key);
			if (existing) {
				existing.count++;
			} else {
				diceGroups.set(key, {
					type: die.type,
					sides: config.sides,
					themeColor: config.themeColor,
					count: 1
				});
			}
		}

		return diceGroups;
	}

	function prepareRollObjects(dice: Roll['dice']): {
		rollObjects: DiceRollObject[];
		rollOrder: Array<{ type: string; themeColor: string; sides: number }>;
	} {
		const diceGroups = groupDiceByTypeAndColor(dice);
		const rollObjects: DiceRollObject[] = [];
		const rollOrder: Array<{ type: string; themeColor: string; sides: number }> = [];

		for (const [key, group] of diceGroups.entries()) {
			rollObjects.push({
				qty: group.count,
				sides: group.sides,
				theme: 'default',
				themeColor: group.themeColor
			});

			// Track order for mapping results back
			for (let i = 0; i < group.count; i++) {
				rollOrder.push({
					type: group.type,
					themeColor: group.themeColor,
					sides: group.sides
				});
			}
		}

		return { rollObjects, rollOrder };
	}

	function onBeforeRoll() {
		clearAutoClearTimers();
		diceOnScreen = true;
		showDiceBox();

		// Notify all before-roll subscribers
		for (const cb of beforeRollStartCallbacks) {
			cb();
		}
	}

	function finalizeRoll(
		rollGroups: RollGroup[],
		rollName: string,
		rollModifier: number,
		rollMeta: RollMeta = {}
	) {
		try {
			if (!rollGroups || rollGroups.length === 0) {
				console.warn('No roll results received');
				resetRollingState();
				return;
			}

			if (currentRollOrder.length === 0) {
				console.error('No roll order tracked - cannot map results');
				resetRollingState();
				return;
			}

			const diceResults: Roll['dice'] = [];
			let orderIndex = 0;

			for (const group of rollGroups) {
				if (!group.rolls || !Array.isArray(group.rolls)) {
					console.warn('Invalid roll group structure:', group);
					continue;
				}

				for (const dieResult of group.rolls) {
					const originalDiceInfo = currentRollOrder[orderIndex];
					if (originalDiceInfo) {
						diceResults.push({
							type: originalDiceInfo.type as Roll['dice'][0]['type'],
							result: dieResult.value
						});
					} else {
						console.warn(`No original dice info for order index ${orderIndex}`);
					}
					orderIndex++;
				}
			}

			if (diceResults.length !== currentRollOrder.length) {
				console.warn(
					`Result count mismatch: expected ${currentRollOrder.length}, got ${diceResults.length}`
				);
			}

			const timestamp = Date.now();
			const activeRollingRollId = rollingRollId;
			const activeMergedReroll = pendingMergedReroll;

			let finalRoll: Roll;

			if (activeMergedReroll) {
				if (
					diceResults.length !== activeMergedReroll.dieIndices.length ||
					diceResults.some((die) => die.result === undefined)
				) {
					console.warn('Merged reroll did not produce a die result');
					resetRollingState();
					return;
				}

				const rerolledResultByIndex = new Map(
					activeMergedReroll.dieIndices.map((dieIndex, resultIndex) => [
						dieIndex,
						diceResults[resultIndex].result
					])
				);

				const mergedDice = activeMergedReroll.sourceRoll.dice.map((die, index) => {
					const nextResult = rerolledResultByIndex.get(index);
					return nextResult !== undefined ? { ...die, result: nextResult } : { ...die };
				});

				finalRoll = {
					...activeMergedReroll.sourceRoll,
					isReroll: !activeMergedReroll.original,
					rerollingDieIndices: undefined,
					dice: mergedDice,
					status: 'complete'
				};

				if (!replaceHistoryRoll(activeMergedReroll.sourceRoll.id, finalRoll)) {
					history = [...history, finalRoll];
				}
			} else if (activeRollingRollId !== null) {
				finalRoll = {
					id: activeRollingRollId,
					name: rollName,
					isReroll: false,
					dice: diceResults,
					modifier: rollModifier,
					status: 'complete',
					timestamp,
					...rollMeta
				};

				replaceHistoryRoll(activeRollingRollId, finalRoll);
			} else {
				finalRoll = {
					id: crypto.randomUUID(),
					name: rollName,
					isReroll: false,
					dice: diceResults,
					modifier: rollModifier,
					status: 'complete',
					timestamp,
					...rollMeta
				};

				history = [...history, finalRoll];
			}

			// Cap history at 20
			if (history.length > 20) {
				history = history.slice(-20);
			}

			lastRoll = finalRoll;
			resetRollingState();

			// Notify all registered callbacks (used for broadcasting to campaign)
			for (const cb of rollCompleteCallbacks) {
				cb(finalRoll);
			}

			scheduleAutoClear();
		} catch (error) {
			console.error('Error finalizing roll:', error);
			resetRollingState();
			resetPosition();
		}
	}

	async function handleRoll(
		dice: Roll['dice'],
		rollName: string,
		rollModifier: number,
		rollMeta: RollMeta = {}
	): Promise<DieResult[]> {
		if (!Box) {
			console.error('DiceBox is not initialized');
			return [];
		}

		if (dice.length === 0) return [];

		cancelActiveRoll();

		const rollId = crypto.randomUUID();
		const rollingRoll: Roll = {
			id: rollId,
			name: rollName,
			isReroll: false,
			rerollingDieIndices: undefined,
			dice: dice.map((d) => ({ ...d })),
			modifier: rollModifier,
			status: 'rolling',
			timestamp: Date.now(),
			...rollMeta
		};
		history = [...history, rollingRoll];
		rollingRollId = rollId;
		rollingRollData = { name: rollName, modifier: rollModifier, meta: rollMeta };

		try {
			isRolling = true;
			resetPosition();
			Box.clear();

			const { rollObjects, rollOrder } = prepareRollObjects(dice);
			currentRollOrder = rollOrder;

			if (rollObjects.length === 0) {
				console.error('No valid dice to roll');
				resetRollingState();
				return [];
			}

			lastRoll = rollingRoll;
			return await Box.roll(rollObjects);
		} catch (error) {
			console.error('Error rolling dice:', error);
			resetRollingState();
			resetPosition();
			return [];
		}
	}

	async function rerollDie(sourceRoll: Roll, dieIndexOrIndices: number | number[]): Promise<void> {
		if (!Box) {
			console.error('DiceBox is not initialized');
			return;
		}

		if (sourceRoll.status !== 'complete') return;

		const dieIndices = Array.from(new Set([dieIndexOrIndices].flat())).filter((dieIndex) => {
			const sourceDie = sourceRoll.dice[dieIndex];
			return sourceDie && sourceDie.result !== undefined;
		});
		if (dieIndices.length === 0) return;

		cancelActiveRoll();

		const rollingRoll: Roll = {
			...sourceRoll,
			isReroll: true,
			rerollingDieIndices: dieIndices,
			dice: sourceRoll.dice.map((die) => ({ ...die })),
			modifier: sourceRoll.modifier,
			status: 'rolling',
			timestamp: sourceRoll.timestamp,
			rollerName: sourceRoll.rollerName
		};

		replaceHistoryRoll(sourceRoll.id, rollingRoll);
		rollingRollId = sourceRoll.id;
		rollingRollData = { name: sourceRoll.name, modifier: sourceRoll.modifier, meta: {} };
		pendingMergedReroll = {
			sourceRoll: {
				...sourceRoll,
				dice: sourceRoll.dice.map((die) => ({ ...die }))
			},
			dieIndices
		};

		try {
			isRolling = true;
			resetPosition();
			Box.clear();

			const rerollDice = dieIndices.map((dieIndex) => ({ type: sourceRoll.dice[dieIndex].type }));
			const { rollObjects, rollOrder } = prepareRollObjects(rerollDice);
			currentRollOrder = rollOrder;

			if (rollObjects.length === 0) {
				console.error('No valid die to reroll');
				replaceHistoryRoll(sourceRoll.id, sourceRoll);
				resetRollingState();
				return;
			}

			lastRoll = rollingRoll;
			await Box.roll(rollObjects);
		} catch (error) {
			console.error('Error rerolling die:', error);
			replaceHistoryRoll(sourceRoll.id, sourceRoll);
			resetRollingState();
			resetPosition();
		}
	}

	function cancelActiveRoll() {
		clearAutoClearTimers();

		if (pendingMergedReroll) {
			const restore = pendingMergedReroll.original ?? pendingMergedReroll.sourceRoll;
			replaceHistoryRoll(restore.id, restore);
			lastRoll = { ...restore };
		} else if (lastRoll) {
			lastRoll.status = 'complete';
			lastRoll = { ...lastRoll }; // Trigger reactivity
		}

		clearDisplayedDice();

		if (rollingRollId !== null) {
			const rollIndex = history.findIndex((r) => r.id === rollingRollId);
			if (rollIndex !== -1 && history[rollIndex].status === 'rolling') {
				history = history.filter((r) => r.id !== rollingRollId);
			}
		}

		resetRollingState();
	}

	/** Rolls extra dice and merges them into a finished roll (e.g. a bonus die spent after the roll). */
	async function rollExtra(sourceRoll: Roll, extraDice: Roll['dice']): Promise<void> {
		if (!Box) {
			console.error('DiceBox is not initialized');
			return;
		}
		if (sourceRoll.status !== 'complete' || extraDice.length === 0) return;

		cancelActiveRoll();

		const firstNew = sourceRoll.dice.length;
		const withExtra: Roll = {
			...sourceRoll,
			dice: [
				...sourceRoll.dice.map((die) => ({ ...die })),
				...extraDice.map((d) => ({ type: d.type }))
			]
		};
		const dieIndices = extraDice.map((_, index) => firstNew + index);
		const rollingRoll: Roll = { ...withExtra, status: 'rolling', rerollingDieIndices: dieIndices };

		replaceHistoryRoll(sourceRoll.id, rollingRoll);
		rollingRollId = sourceRoll.id;
		rollingRollData = { name: sourceRoll.name, modifier: sourceRoll.modifier, meta: {} };
		pendingMergedReroll = { sourceRoll: withExtra, dieIndices, original: sourceRoll };

		try {
			isRolling = true;
			resetPosition();
			Box.clear();

			const { rollObjects, rollOrder } = prepareRollObjects(
				extraDice.map((d) => ({ type: d.type }))
			);
			currentRollOrder = rollOrder;

			if (rollObjects.length === 0) {
				replaceHistoryRoll(sourceRoll.id, sourceRoll);
				resetRollingState();
				return;
			}

			lastRoll = rollingRoll;
			await Box.roll(rollObjects);
		} catch (error) {
			console.error('Error rolling extra dice:', error);
			replaceHistoryRoll(sourceRoll.id, sourceRoll);
			resetRollingState();
			resetPosition();
		}
	}

	/** Replaces a finished roll in the history and last-roll slot, e.g. after a spent adjustment. */
	function updateRoll(next: Roll) {
		if (!replaceHistoryRoll(next.id, next)) history = [...history, next];
		lastRoll = next;
		for (const cb of rollCompleteCallbacks) cb(next);
	}

	// --- Roll calculations ---
	function getTotal(roll: Roll): number {
		return rollTotal(roll);
	}

	function getDescription(roll: Roll): string {
		return rollDescription(roll);
	}

	// --- Public API ---
	const init = () => {
		// Remove any existing dice box
		const existingDiceBox = document.getElementById('dice-box');
		if (existingDiceBox) {
			existingDiceBox.remove();
		}

		diceBox = document.body.appendChild(document.createElement('div'));
		diceBox.id = 'dice-box';
		applyLayerZIndex();
		diceBox.style.pointerEvents = 'none';
		diceBox.style.position = 'absolute';
		diceBox.style.width = 'calc(100%)';
		diceBox.style.height = 'calc(100% - var(--navbar-height))';
		diceBox.style.opacity = '0';
		diceBox.style.transition = `opacity ${DICE_FADE_DURATION_MS}ms ease`;

		resetPosition();

		Box = new DiceBox({
			container: '#dice-box',
			assetPath: '/dice-box/',
			scale: 5,
			gravity: 5,
			mass: 2,
			angularDamping: 0.5,
			linearDamping: 0.5,
			theme: 'default',
			settleTimeout: 3000,
			onRollComplete: (results) => {
				const name = rollingRollData?.name ?? 'Roll';
				const modifier = rollingRollData?.modifier ?? 0;
				finalizeRoll(results, name, modifier, rollingRollData?.meta);
			},
			onBeforeRoll
		});

		Box.init();
	};

	const destroy = () => {
		// Unsubscribe all roll-complete and before-roll listeners
		cancelActiveRoll();
		rollCompleteCallbacks.clear();
		beforeRollStartCallbacks.clear();
	};

	const roll = async (input: RollInput): Promise<DieResult[]> => {
		// Validate input
		if (!input.dice || input.dice.length === 0) {
			console.warn('Cannot roll: dice array is empty');
			return [];
		}

		// Execute the roll
		const rollName = input.name ?? 'Roll';
		const rollModifier = input.modifier ?? 0;
		const diceToRoll = input.dice.map((d) => ({ type: d.type }));

		return await handleRoll(diceToRoll, rollName, rollModifier, {
			context: input.context,
			adjustments: input.adjustments,
			applied: input.applied
		});
	};

	const openPicker = (input: RollInput) => {
		for (const cb of pickerOpenCallbacks) {
			cb(input);
		}
	};

	/** Register a callback invoked when a local roll completes (for broadcasting).
	 * Returns an unsubscribe function. */
	const onRollEnd = (callback: (roll: Roll) => void) => {
		rollCompleteCallbacks.add(callback);
		return () => {
			rollCompleteCallbacks.delete(callback);
		};
	};

	/** Register a callback invoked at the beginning of a roll. Returns an unsubscribe function. */
	const onRollStart = (callback: () => void) => {
		beforeRollStartCallbacks.add(callback);
		return () => {
			beforeRollStartCallbacks.delete(callback);
		};
	};

	const onPickerOpen = (callback: (input: RollInput) => void) => {
		pickerOpenCallbacks.add(callback);
		return () => {
			pickerOpenCallbacks.delete(callback);
		};
	};

	/** Add a remote roll directly to history (no 3D animation) */
	const addToHistory = (roll: Roll) => {
		// Skip if a roll with the same ID already exists (deduplication)
		if (history.some((r) => r.id === roll.id)) return;

		// Add to history
		history = [...history, roll];

		// Cap history at 20
		if (history.length > 20) {
			history = history.slice(-20);
		}
	};

	const setLayerZIndexOverride = (value: string | null) => {
		layerZIndexOverride = value;
		applyLayerZIndex();
	};

	return {
		get history() {
			return history;
		},
		set history(value: Roll[]) {
			history = value;
		},
		get lastRoll() {
			return lastRoll;
		},
		get isRolling() {
			return isRolling;
		},
		get diceOnScreen() {
			return diceOnScreen;
		},
		get layerZIndexOverride() {
			return layerZIndexOverride;
		},
		init,
		destroy,
		roll,
		openPicker,
		rerollDie,
		rollExtra,
		updateRoll,
		cancelActiveRoll,
		getTotal,
		getDescription,
		onRollEnd,
		onRollStart,
		onPickerOpen,
		addToHistory,
		setLayerZIndexOverride,
		fadeDisplayedDiceNow
	};
}

const DICE_CONTEXT_KEY = Symbol('DiceContext');

export const setDiceContext = () => {
	const newDiceContext = diceContext();
	return setContext(DICE_CONTEXT_KEY, newDiceContext);
};

export const getDiceContext = (): ReturnType<typeof setDiceContext> => {
	return getContext(DICE_CONTEXT_KEY) as ReturnType<typeof setDiceContext>;
};
