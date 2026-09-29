import type { RollInput } from '@domain/schemas/dice';

// The roll waiting on the pre-roll dialog. Roll buttons set it; one dialog on the sheet reads it.
let pending = $state<RollInput | null>(null);

export const preRoll = {
	get pending() {
		return pending;
	},
	request(input: RollInput) {
		pending = input;
	},
	clear() {
		pending = null;
	}
};
