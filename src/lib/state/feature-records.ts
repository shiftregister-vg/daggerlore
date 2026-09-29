import type { FeatureRecord, PoolEvent, RecordField } from '@domain/schemas/rules';
import {
	ownedFeatureKeyFilter,
	usageKey,
	type UsageItemType,
	type UsageSource
} from './feature-usage';

export type RecordEntry = { id: string; values: Record<string, string> };
export type RecordState = Record<string, RecordEntry[]>;

export type RecordTracker = {
	key: string;
	item_type: UsageItemType;
	item_id: string;
	source_title: string;
	feature_title: string;
	label?: string;
	kind: FeatureRecord['kind'];
	fields: RecordField[];
	max_entries?: number;
	clear_on: PoolEvent[];
};

const RECORD_EVENT_TIMES: Record<PoolEvent, string> = {
	short_rest: 'after a short rest',
	long_rest: 'after a long rest',
	scene: 'at the end of a scene',
	session_start: 'at the start of a session',
	session_end: 'at the end of a session'
};

export function collectRecordTrackers(sources: UsageSource[]): RecordTracker[] {
	const trackers = new Map<string, RecordTracker>();
	for (const source of sources) {
		for (const feature of source.features) {
			for (const record of feature.records ?? []) {
				const key = usageKey(source.item_type, source.item_id, record.id);
				if (trackers.has(key)) continue;
				trackers.set(key, {
					key,
					item_type: source.item_type,
					item_id: source.item_id,
					source_title: source.title,
					feature_title: feature.title,
					label: record.label,
					kind: record.kind,
					fields: record.fields,
					max_entries: record.kind === 'ledger' ? record.max_entries : 1,
					clear_on: record.kind === 'ledger' ? (record.clear_on ?? []) : []
				});
			}
		}
	}
	return [...trackers.values()];
}

export function recordEntries(records: RecordState, tracker: RecordTracker): RecordEntry[] {
	const entries = records[tracker.key] ?? [];
	return tracker.kind === 'single' ? entries.slice(0, 1) : entries;
}

function withEntries(records: RecordState, tracker: RecordTracker, entries: RecordEntry[]) {
	const next = { ...records };
	const kept = entries.filter((entry) => Object.values(entry.values).some((value) => value !== ''));
	if (kept.length > 0) next[tracker.key] = kept;
	else delete next[tracker.key];
	return next;
}

/** Sets one field of a single record; `entryId` is only used when the record is first created. */
export function setSingleValue(
	records: RecordState,
	tracker: RecordTracker,
	fieldId: string,
	value: string,
	entryId: string
): RecordState {
	const [current] = recordEntries(records, tracker);
	const entry = current ?? { id: entryId, values: {} };
	return withEntries(records, tracker, [
		{ ...entry, values: { ...entry.values, [fieldId]: value } }
	]);
}

export function canAddLedgerEntry(records: RecordState, tracker: RecordTracker): boolean {
	return (
		tracker.max_entries === undefined ||
		recordEntries(records, tracker).length < tracker.max_entries
	);
}

/** Adds a ledger entry unless the ledger is full or the entry is empty. */
export function addLedgerEntry(
	records: RecordState,
	tracker: RecordTracker,
	entry: RecordEntry
): RecordState {
	if (!canAddLedgerEntry(records, tracker)) return records;
	return withEntries(records, tracker, [...recordEntries(records, tracker), entry]);
}

export function updateLedgerEntry(
	records: RecordState,
	tracker: RecordTracker,
	entryId: string,
	values: Record<string, string>
): RecordState {
	return withEntries(
		records,
		tracker,
		recordEntries(records, tracker).map((entry) =>
			entry.id === entryId ? { ...entry, values: { ...entry.values, ...values } } : entry
		)
	);
}

export function removeLedgerEntry(
	records: RecordState,
	tracker: RecordTracker,
	entryId: string
): RecordState {
	return withEntries(
		records,
		tracker,
		recordEntries(records, tracker).filter((entry) => entry.id !== entryId)
	);
}

/** Clears ledgers whose `clear_on` lists this confirmed event. Single records are never cleared. */
export function applyRecordEvent(
	records: RecordState,
	trackers: RecordTracker[],
	event: PoolEvent
): { next: RecordState; cleared: RecordTracker[] } {
	const next = { ...records };
	const cleared: RecordTracker[] = [];
	for (const tracker of trackers) {
		if (!tracker.clear_on.includes(event) || !next[tracker.key]?.length) continue;
		delete next[tracker.key];
		cleared.push(tracker);
	}
	return { next, cleared };
}

/** Drops records for items the character no longer possesses and empty entries. */
export function pruneRecords(
	records: RecordState,
	sources: Pick<UsageSource, 'item_type' | 'item_id'>[]
): RecordState {
	const isOwned = ownedFeatureKeyFilter(sources);
	return Object.fromEntries(
		Object.entries(records).flatMap(([key, entries]) => {
			if (!isOwned(key)) return [];
			const kept = entries.filter((entry) =>
				Object.values(entry.values).some((value) => value !== '')
			);
			return kept.length > 0 ? [[key, kept]] : [];
		})
	);
}

/** Turns a stored value into display text; references are resolved by the caller. */
export type RecordValueResolver = (field: RecordField, value: string) => string;

export function displayRecordValue(
	field: RecordField,
	value: string,
	resolve?: RecordValueResolver
): string {
	if (!value) return '';
	if (field.type === 'choice') {
		return field.options?.find((option) => option.id === value)?.label ?? value;
	}
	if (field.type === 'experience' || field.type === 'trait' || field.type === 'domain_card') {
		return resolve?.(field, value) ?? value;
	}
	return value;
}

export function recordLabel(tracker: RecordTracker): string {
	return (
		tracker.label ?? (tracker.kind === 'ledger' ? 'Entries' : tracker.feature_title || 'Record')
	);
}

/** One-line summary, e.g. "Thunder Kick" or "Dossier · 3 entries — Ironback Troll". */
export function recordSummary(
	tracker: RecordTracker,
	entries: RecordEntry[],
	resolve?: RecordValueResolver
): string {
	const firstValue = (entry: RecordEntry | undefined) => {
		if (!entry) return '';
		for (const field of tracker.fields) {
			const text = displayRecordValue(field, entry.values[field.id] ?? '', resolve);
			if (text) return text;
		}
		return '';
	};
	if (tracker.kind === 'single') return firstValue(entries[0]);
	const count = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
	const latest = firstValue(entries.at(-1));
	return `${recordLabel(tracker)} · ${count}${latest ? ` — ${latest}` : ''}`;
}

export function recordClearCaption(tracker: RecordTracker): string {
	if (tracker.clear_on.length === 0) return '';
	const times = tracker.clear_on.map((event) => RECORD_EVENT_TIMES[event]);
	const joined =
		times.length === 1 ? times[0] : `${times.slice(0, -1).join(', ')} or ${times.at(-1)}`;
	return `Clears ${joined}`;
}
