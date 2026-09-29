import { describe, expect, it } from 'vitest';
import type { Feature, FeatureRecord } from '@domain/schemas/rules';
import {
	addLedgerEntry,
	applyRecordEvent,
	canAddLedgerEntry,
	collectRecordTrackers,
	displayRecordValue,
	pruneRecords,
	recordClearCaption,
	recordEntries,
	recordSummary,
	removeLedgerEntry,
	setSingleValue,
	updateLedgerEntry
} from './feature-records';
import type { UsageSource } from './feature-usage';

function feature(records: FeatureRecord[]): Feature {
	return {
		title: '',
		description_html: '',
		character_modifiers: [],
		weapon_modifiers: [],
		records
	};
}

function source(itemId: string, records: FeatureRecord[]): UsageSource {
	return {
		item_type: 'domain_cards',
		item_id: itemId,
		title: itemId,
		features: [feature(records)]
	};
}

const [move, dossier, healed] = collectRecordTrackers([
	source('signature_move', [
		{
			id: 'signature_move',
			kind: 'single',
			fields: [
				{ id: 'name', label: 'Name', type: 'text' },
				{ id: 'description', label: 'Description', type: 'long_text' }
			]
		}
	]),
	source('know_thy_enemy', [
		{
			id: 'dossier',
			label: 'Dossier',
			kind: 'ledger',
			fields: [
				{ id: 'target', label: 'Target', type: 'text' },
				{
					id: 'information',
					label: 'Information',
					type: 'choice',
					options: [{ id: 'difficulty', label: 'Difficulty and damage thresholds' }]
				}
			]
		}
	]),
	source('healing_hands', [
		{
			id: 'healed',
			kind: 'ledger',
			max_entries: 2,
			clear_on: ['long_rest'],
			fields: [{ id: 'target', label: 'Target', type: 'text' }]
		}
	])
]);

const entry = (id: string, values: Record<string, string>) => ({ id, values });

describe('single records', () => {
	it('creates the record on first edit and keeps its id', () => {
		let records = setSingleValue({}, move, 'name', 'Thunder Kick', 'e1');
		records = setSingleValue(records, move, 'description', 'Spin, then drop-kick', 'e2');
		expect(records[move.key]).toEqual([
			entry('e1', { name: 'Thunder Kick', description: 'Spin, then drop-kick' })
		]);
	});

	it('removes the record once every field is empty', () => {
		const records = setSingleValue({}, move, 'name', 'Thunder Kick', 'e1');
		expect(setSingleValue(records, move, 'name', '', 'e1')).toEqual({});
	});

	it('only ever exposes one entry', () => {
		const records = { [move.key]: [entry('a', { name: 'A' }), entry('b', { name: 'B' })] };
		expect(recordEntries(records, move)).toEqual([entry('a', { name: 'A' })]);
	});
});

describe('ledgers', () => {
	it('adds, updates and removes entries', () => {
		let records = addLedgerEntry({}, dossier, entry('e1', { target: 'Troll' }));
		records = addLedgerEntry(records, dossier, entry('e2', { target: 'Hag' }));
		records = updateLedgerEntry(records, dossier, 'e1', { information: 'difficulty' });
		expect(records[dossier.key]).toEqual([
			entry('e1', { target: 'Troll', information: 'difficulty' }),
			entry('e2', { target: 'Hag' })
		]);
		records = removeLedgerEntry(records, dossier, 'e1');
		expect(records[dossier.key]).toEqual([entry('e2', { target: 'Hag' })]);
	});

	it('ignores empty entries and respects max entries', () => {
		expect(addLedgerEntry({}, healed, entry('e0', { target: '' }))).toEqual({});
		let records = addLedgerEntry({}, healed, entry('e1', { target: 'Ally A' }));
		records = addLedgerEntry(records, healed, entry('e2', { target: 'Ally B' }));
		expect(canAddLedgerEntry(records, healed)).toBe(false);
		expect(addLedgerEntry(records, healed, entry('e3', { target: 'Ally C' }))).toBe(records);
		expect(canAddLedgerEntry({}, dossier)).toBe(true);
	});

	it('clears only ledgers listening to the event', () => {
		const records = {
			[healed.key]: [entry('e1', { target: 'Ally A' })],
			[dossier.key]: [entry('e2', { target: 'Troll' })],
			[move.key]: [entry('e3', { name: 'Thunder Kick' })]
		};
		const { next, cleared } = applyRecordEvent(records, [move, dossier, healed], 'long_rest');
		expect(cleared).toEqual([healed]);
		expect(Object.keys(next).sort()).toEqual([dossier.key, move.key].sort());
		expect(applyRecordEvent(records, [move, dossier, healed], 'short_rest').cleared).toEqual([]);
	});
});

describe('display', () => {
	it('summarises single records and ledgers', () => {
		expect(recordSummary(move, [entry('e1', { name: 'Thunder Kick' })])).toBe('Thunder Kick');
		expect(
			recordSummary(dossier, [entry('e1', { target: 'Troll' }), entry('e2', { target: 'Hag' })])
		).toBe('Dossier · 2 entries — Hag');
		expect(recordSummary(healed, [])).toBe('Entries · 0 entries');
	});

	it('shows choice labels and resolves references through the caller', () => {
		expect(displayRecordValue(dossier.fields[1], 'difficulty')).toBe(
			'Difficulty and damage thresholds'
		);
		expect(
			displayRecordValue(
				{ id: 'exp', label: 'Experience', type: 'experience' },
				'1',
				() => 'Sailor'
			)
		).toBe('Sailor');
	});

	it('describes when a ledger clears', () => {
		expect(recordClearCaption(healed)).toBe('Clears after a long rest');
		expect(recordClearCaption(dossier)).toBe('');
	});
});

describe('pruneRecords', () => {
	it('keeps owned records and drops empty entries', () => {
		const pruned = pruneRecords(
			{
				[move.key]: [entry('e1', { name: 'Thunder Kick' })],
				[dossier.key]: [entry('e2', { target: '' })],
				'domain_cards:gone:record': [entry('e3', { name: 'x' })]
			},
			[
				{ item_type: 'domain_cards', item_id: 'signature_move' },
				{ item_type: 'domain_cards', item_id: 'know_thy_enemy' }
			]
		);
		expect(pruned).toEqual({ [move.key]: [entry('e1', { name: 'Thunder Kick' })] });
	});
});
