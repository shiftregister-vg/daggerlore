import { describe, expect, it } from 'vitest';
import {
	canLeaveScene,
	canMirrorStressClear,
	leaveScene,
	mirrorStressClear,
	returnAfterLongRest,
	returnEarly
} from './companion-recovery';

const companion = (marked_stress: number, away = false) => ({ marked_stress, away });

describe('canLeaveScene', () => {
	it('needs the last Stress marked and the companion present', () => {
		expect(canLeaveScene(companion(3), 3)).toBe(true);
		expect(canLeaveScene(companion(2), 3)).toBe(false);
		expect(canLeaveScene(companion(3, true), 3)).toBe(false);
		expect(canLeaveScene(companion(0), 0)).toBe(false);
	});
});

describe('leaving and returning', () => {
	it('sends the companion away without touching its Stress', () => {
		expect(leaveScene(companion(3))).toEqual({ marked_stress: 3, away: true });
	});

	it('returns after a long rest with 1 Stress cleared', () => {
		expect(returnAfterLongRest(companion(3, true))).toEqual({ marked_stress: 2, away: false });
		expect(returnAfterLongRest(companion(0, true))).toEqual({ marked_stress: 0, away: false });
	});

	it('leaves a present companion alone on a long rest', () => {
		const present = companion(2);
		expect(returnAfterLongRest(present)).toBe(present);
	});

	it('returns early without clearing anything', () => {
		expect(returnEarly(companion(3, true))).toEqual({ marked_stress: 3, away: false });
	});
});

describe('mirrorStressClear', () => {
	it('clears as much Stress as the owner did, down to zero', () => {
		expect(mirrorStressClear(companion(3), 2)).toEqual({ marked_stress: 1, away: false });
		expect(mirrorStressClear(companion(1), 4)).toEqual({ marked_stress: 0, away: false });
	});

	it('does nothing for an absent companion or nothing cleared', () => {
		const away = companion(3, true);
		expect(mirrorStressClear(away, 2)).toBe(away);
		const present = companion(3);
		expect(mirrorStressClear(present, 0)).toBe(present);
	});

	it('only applies when there is Stress to clear', () => {
		expect(canMirrorStressClear(undefined)).toBe(false);
		expect(canMirrorStressClear(companion(0))).toBe(false);
		expect(canMirrorStressClear(companion(1, true))).toBe(false);
		expect(canMirrorStressClear(companion(1))).toBe(true);
	});
});
