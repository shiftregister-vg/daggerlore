import type { Companion } from '@domain/schemas/characters';

type CompanionStress = Pick<Companion, 'marked_stress' | 'away'>;

/** True when the companion has marked its last Stress and can be sent out of the scene. */
export function canLeaveScene(companion: CompanionStress, maxStress: number): boolean {
	return !companion.away && maxStress > 0 && companion.marked_stress >= maxStress;
}

/** The companion leaves until the next long rest. The player or GM confirms this; it is never automatic. */
export function leaveScene<T extends CompanionStress>(companion: T): T {
	return { ...companion, away: true };
}

/** A long rest brings an absent companion back with 1 Stress cleared. */
export function returnAfterLongRest<T extends CompanionStress>(companion: T): T {
	if (!companion.away) return companion;
	return { ...companion, away: false, marked_stress: Math.max(0, companion.marked_stress - 1) };
}

/** Returns the companion early (the GM allows it), without clearing anything. */
export function returnEarly<T extends CompanionStress>(companion: T): T {
	return companion.away ? { ...companion, away: false } : companion;
}

/** Whether an owner's Stress-clearing downtime move can also clear the companion's Stress. */
export function canMirrorStressClear(companion: CompanionStress | undefined): boolean {
	return !!companion && !companion.away && companion.marked_stress > 0;
}

/** The companion clears as much Stress as its owner did. */
export function mirrorStressClear<T extends CompanionStress>(companion: T, cleared: number): T {
	if (!canMirrorStressClear(companion) || cleared <= 0) return companion;
	return { ...companion, marked_stress: Math.max(0, companion.marked_stress - cleared) };
}
