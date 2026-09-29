import type {
	CharacterModifier,
	EffectEndEvent,
	FeatureEffect,
	WeaponModifier
} from '@domain/schemas/rules';
import { TRAITS } from '@domain/constants/rules';
import {
	ownedFeatureKeyFilter,
	spentUses,
	usageKey,
	type UsageItemType,
	type UsageSource,
	type UsageTracker
} from './feature-usage';

export type EffectInstance = { id: string; target?: string; started_at: string };
export type EffectState = Record<string, EffectInstance[]>;

export type EffectTracker = {
	key: string;
	item_type: UsageItemType;
	item_id: string;
	source_title: string;
	feature_title: string;
	effect: FeatureEffect;
	/** The feature's usage tracker, spent by a `usage` cost. */
	usage?: UsageTracker;
	/** False while the source can't apply, e.g. a domain card in the vault; modifiers are suspended. */
	eligible: boolean;
	ineligible_reason?: string;
};

export type EffectEligibility = (source: UsageSource) => { eligible: boolean; reason?: string };

/** The resources an activation reads and spends. */
export type EffectResources = {
	hope: number;
	stress: number;
	max_stress: number;
	feature_uses: Record<string, number>;
	active_effects: EffectState;
};

export const DOWNTIME_EFFECT_EVENTS = ['short_rest', 'long_rest', 'scene', 'session_end'] as const;
export type DowntimeEffectEvent = (typeof DOWNTIME_EFFECT_EVENTS)[number];

// What each event reads as after "Until …".
const UNTIL_TEXT: Record<EffectEndEvent, string> = {
	short_rest: 'your next short rest',
	long_rest: 'your next long rest',
	scene: 'the scene ends',
	session_end: 'the session ends',
	attack_made: 'your next attack',
	attack_succeeded: 'your next successful attack',
	damage_rolled: 'your next damage roll',
	damage_dealt: 'you deal damage',
	hp_marked: 'you mark a Hit Point',
	attacked_successfully: 'an attack succeeds against you'
};

// Labels for the buttons that end an effect on a player-confirmed event.
export const EFFECT_EVENT_LABELS: Record<EffectEndEvent, string> = {
	short_rest: 'Short rest',
	long_rest: 'Long rest',
	scene: 'End of scene',
	session_end: 'End of session',
	attack_made: 'You made an attack',
	attack_succeeded: 'Your attack succeeded',
	damage_rolled: 'You rolled damage',
	damage_dealt: 'You dealt damage',
	hp_marked: 'You marked a Hit Point',
	attacked_successfully: 'An attack succeeded against you'
};

export function isDowntimeEffectEvent(event: string): event is DowntimeEffectEvent {
	return (DOWNTIME_EFFECT_EVENTS as readonly string[]).includes(event);
}

export function collectEffectTrackers(
	sources: UsageSource[],
	usageTrackers: UsageTracker[],
	eligibility: EffectEligibility
): EffectTracker[] {
	const trackers = new Map<string, EffectTracker>();
	for (const source of sources) {
		const { eligible, reason } = eligibility(source);
		for (const feature of source.features) {
			const usage = feature.usage
				? usageTrackers.find(
						(tracker) =>
							tracker.key === usageKey(source.item_type, source.item_id, feature.usage!.id)
					)
				: undefined;
			for (const effect of feature.effects ?? []) {
				const key = usageKey(source.item_type, source.item_id, effect.id);
				if (trackers.has(key)) continue;
				trackers.set(key, {
					key,
					item_type: source.item_type,
					item_id: source.item_id,
					source_title: source.title,
					feature_title: feature.title,
					effect,
					usage,
					eligible,
					ineligible_reason: eligible ? undefined : reason
				});
			}
		}
	}
	return [...trackers.values()];
}

export function effectInstances(active: EffectState, tracker: EffectTracker): EffectInstance[] {
	return active[tracker.key] ?? [];
}

export function effectLabel(tracker: EffectTracker): string {
	return tracker.effect.label ?? (tracker.feature_title || tracker.source_title);
}

function normalizeTarget(target: string | undefined): string {
	return (target ?? '').trim().toLocaleLowerCase();
}

/** Why the effect can't be activated now, or undefined when it can. */
export function activationBlocker(
	resources: EffectResources,
	tracker: EffectTracker,
	target?: string
): string | undefined {
	const { effect } = tracker;
	const instances = effectInstances(resources.active_effects, tracker);
	const instancesMode = effect.instances ?? 'single';
	if (instancesMode === 'single' && instances.length > 0) return 'Already active';
	if (effect.target && target !== undefined && !target.trim()) {
		return `Name the ${effect.target.label.toLocaleLowerCase()}`;
	}
	if (
		instancesMode === 'per_target' &&
		target !== undefined &&
		instances.some((instance) => normalizeTarget(instance.target) === normalizeTarget(target))
	) {
		return 'Already active against that target';
	}
	const cost = effect.cost;
	if (cost?.hope && resources.hope < cost.hope) return `Needs ${cost.hope} Hope`;
	if (cost?.stress && resources.stress + cost.stress > resources.max_stress) {
		return `Needs ${cost.stress} free Stress`;
	}
	if (cost?.usage) {
		if (!tracker.usage) return 'No uses configured';
		if (spentUses(resources.feature_uses, tracker.usage) >= tracker.usage.max_uses) {
			return 'No uses left';
		}
	}
	return undefined;
}

/**
 * Pays the cost and starts the effect. With `requires_success`, a failed attempt still pays Hope
 * and Stress (they're spent on the attempt) but neither starts the effect nor spends a use.
 * Returns undefined when the activation is blocked.
 */
export function activateEffect(
	resources: EffectResources,
	tracker: EffectTracker,
	options: { id: string; now: string; target?: string; succeeded?: boolean }
): (EffectResources & { started: boolean }) | undefined {
	const { effect } = tracker;
	const target = effect.target ? (options.target ?? '').trim() : undefined;
	if (activationBlocker(resources, tracker, target) !== undefined) return undefined;
	const started = !effect.requires_success || options.succeeded !== false;
	const cost = effect.cost ?? {};
	const next: EffectResources & { started: boolean } = {
		hope: resources.hope - (cost.hope ?? 0),
		stress: resources.stress + (cost.stress ?? 0),
		max_stress: resources.max_stress,
		feature_uses: resources.feature_uses,
		active_effects: resources.active_effects,
		started
	};
	if (!started) return next;
	if (cost.usage && tracker.usage) {
		next.feature_uses = {
			...resources.feature_uses,
			[tracker.usage.key]: spentUses(resources.feature_uses, tracker.usage) + 1
		};
	}
	const instance: EffectInstance = { id: options.id, started_at: options.now };
	if (target !== undefined) instance.target = target;
	const current = effectInstances(resources.active_effects, tracker);
	next.active_effects = {
		...resources.active_effects,
		[tracker.key]:
			(effect.instances ?? 'single') === 'per_target' ? [...current, instance] : [instance]
	};
	return next;
}

export function endEffectInstance(
	active: EffectState,
	tracker: EffectTracker,
	instanceId: string
): EffectState {
	const next = { ...active };
	const kept = effectInstances(active, tracker).filter((instance) => instance.id !== instanceId);
	if (kept.length > 0) next[tracker.key] = kept;
	else delete next[tracker.key];
	return next;
}

/** Ends every active effect that lists this confirmed event. */
export function applyEffectEvent(
	active: EffectState,
	trackers: EffectTracker[],
	event: EffectEndEvent
): { next: EffectState; ended: EffectTracker[] } {
	const next = { ...active };
	const ended: EffectTracker[] = [];
	for (const tracker of trackers) {
		if (!tracker.effect.ends_on.includes(event) || !next[tracker.key]?.length) continue;
		delete next[tracker.key];
		ended.push(tracker);
	}
	return { next, ended };
}

/** Drops effects for items the character no longer possesses. */
export function pruneEffects(
	active: EffectState,
	sources: Pick<UsageSource, 'item_type' | 'item_id'>[]
): EffectState {
	const isOwned = ownedFeatureKeyFilter(sources);
	return Object.fromEntries(
		Object.entries(active).filter(([key, instances]) => isOwned(key) && instances.length > 0)
	);
}

/** Modifiers of active, eligible effects that change the sheet. Each effect applies once. */
export function activeEffectModifiers(
	active: EffectState,
	trackers: EffectTracker[]
): { character_modifiers: CharacterModifier[]; weapon_modifiers: WeaponModifier[] } {
	const character_modifiers: CharacterModifier[] = [];
	const weapon_modifiers: WeaponModifier[] = [];
	for (const tracker of trackers) {
		if (!tracker.eligible || (tracker.effect.scope ?? 'self') !== 'self') continue;
		if (!active[tracker.key]?.length) continue;
		character_modifiers.push(...tracker.effect.character_modifiers);
		weapon_modifiers.push(...tracker.effect.weapon_modifiers);
	}
	return { character_modifiers, weapon_modifiers };
}

function lowerFirst(text: string): string {
	return text.charAt(0).toLocaleLowerCase() + text.slice(1);
}

function joinOr(parts: string[]): string {
	if (parts.length <= 1) return parts[0] ?? '';
	return `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}`;
}

/** e.g. "Until an attack succeeds against you or your next rest". Empty when only manual. */
export function effectEndCaption(effect: FeatureEffect): string {
	const events = effect.ends_on;
	const parts: string[] = [];
	const bothRests = events.includes('short_rest') && events.includes('long_rest');
	for (const event of events) {
		if (bothRests && event === 'long_rest') continue;
		parts.push(bothRests && event === 'short_rest' ? 'your next rest' : UNTIL_TEXT[event]);
	}
	parts.push(...(effect.ends_when ?? []).map(lowerFirst));
	// Rests read best last, e.g. "Until an attack succeeds against you or your next rest".
	parts.sort((a, b) => Number(a.includes(' rest')) - Number(b.includes(' rest')));
	return parts.length > 0 ? `Until ${joinOr(parts)}` : '';
}

/** e.g. "3 Hope", "1 use" or "1 Hope · 1 Stress"; empty when free. */
export function effectCostCaption(effect: FeatureEffect): string {
	const parts: string[] = [];
	if (effect.cost?.hope) parts.push(`${effect.cost.hope} Hope`);
	if (effect.cost?.stress) parts.push(`${effect.cost.stress} Stress`);
	if (effect.cost?.usage) parts.push('1 use');
	return parts.join(' · ');
}

const CHARACTER_TARGET_LABELS: Record<string, string> = {
	evasion: 'Evasion',
	max_hp: 'Hit Points',
	max_stress: 'Stress slots',
	max_experiences: 'Experiences',
	major_damage_threshold: 'Major threshold',
	severe_damage_threshold: 'Severe threshold',
	primary_class_mastery_level: 'class mastery',
	secondary_class_mastery_level: 'secondary class mastery',
	max_loadout: 'loadout slots',
	max_hope: 'Hope slots',
	proficiency: 'Proficiency',
	max_armor: 'Armor Score',
	max_burden: 'burden',
	spellcast_roll_bonus: 'Spellcast rolls',
	max_short_rest_actions: 'short rest moves',
	max_long_rest_actions: 'long rest moves'
};

function signed(value: number): string {
	return value >= 0 ? `+${value}` : String(value);
}

function traitName(trait: string): string {
	return TRAITS[trait as keyof typeof TRAITS]?.name ?? trait;
}

function amountText(modifier: {
	type: string;
	value?: number;
	multiplier?: number;
	trait?: string;
}): string {
	const times = (multiplier: number | undefined) =>
		multiplier === undefined || multiplier === 1 ? '' : `${multiplier}× `;
	if (modifier.type === 'flat') return signed(modifier.value ?? 0);
	if (modifier.type === 'derived_from_trait') {
		return `+${times(modifier.multiplier)}${traitName(modifier.trait ?? '')}`;
	}
	if (modifier.type === 'derived_from_proficiency')
		return `+${times(modifier.multiplier)}Proficiency`;
	if (modifier.type === 'derived_from_level') return `+${times(modifier.multiplier)}level`;
	return '';
}

/** Short text for each modifier, e.g. "+2 Evasion" or "+10 damage". */
export function describeEffectModifiers(effect: FeatureEffect): string[] {
	const lines: string[] = [];
	for (const modifier of effect.character_modifiers) {
		const target =
			modifier.target === 'trait'
				? traitName(modifier.trait)
				: modifier.target === 'experience_from_card_choice_selection'
					? 'chosen Experience'
					: (CHARACTER_TARGET_LABELS[modifier.target] ?? modifier.target);
		const amount = amountText(modifier);
		lines.push(
			modifier.behaviour === 'bonus'
				? `${amount} ${target}`
				: `${target} becomes ${amount.replace(/^\+/, '')}`
		);
	}
	for (const modifier of effect.weapon_modifiers) {
		if (modifier.target_stat === 'attack_roll' || modifier.target_stat === 'damage_bonus') {
			const stat = modifier.target_stat === 'attack_roll' ? 'to attack rolls' : 'damage';
			lines.push(`${amountText(modifier)} ${stat}`);
		} else if (modifier.target_stat === 'damage_dice') {
			lines.push(`Damage dice ${modifier.dice}`);
		} else if (modifier.target_stat === 'damage_type') {
			lines.push(modifier.damage_type === 'mag' ? 'Magic damage' : 'Physical damage');
		} else if (modifier.target_stat === 'range') {
			lines.push(`Range ${modifier.range}`);
		} else if (modifier.target_stat === 'trait') {
			lines.push(`Attacks use ${traitName(modifier.trait)}`);
		}
	}
	return lines;
}
