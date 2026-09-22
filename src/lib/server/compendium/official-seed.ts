import {
	AdversarySchema,
	AncestryCardSchema,
	ArmorSchema,
	BeastformSchema,
	CharacterSheetAddonSchema,
	CharacterClassSchema,
	CommunityCardSchema,
	ConsumableSchema,
	DomainCardSchema,
	DomainSchema,
	EnvironmentSchema,
	LootSchema,
	PrimaryWeaponSchema,
	SecondaryWeaponSchema,
	SubclassSchema,
	TransformationSchema,
	type CompendiumContent
} from '@domain/schemas/compendium';
import type { SourceKey } from '@domain/schemas/rules';
import type { SourceMetadata } from '@domain/schemas/sources';
import type { HomebrewItem, HomebrewTable } from '@domain/permissions';
import { SRD_COMPENDIUM, SRD_SOURCE_METADATA } from '../../../compendium/SRD';
import { databaseDialect, execute, jsonParam, queryOne } from '$lib/server/db/client';

export const OFFICIAL_COMPENDIUM_TABLES = [
	'primary_weapons',
	'secondary_weapons',
	'armor',
	'loot',
	'consumables',
	'beastforms',
	'classes',
	'subclasses',
	'domains',
	'domain_cards',
	'ancestry_cards',
	'community_cards',
	'transformations',
	'character_sheet_addons',
	'adversaries',
	'environments'
] as const satisfies HomebrewTable[];

const OFFICIAL_SEED_SOURCES = [
	{
		metadata: SRD_SOURCE_METADATA,
		compendium: SRD_COMPENDIUM
	}
] as const satisfies { metadata: SourceMetadata; compendium: CompendiumContent }[];

const SEED_VERSION = 1;

const SEED_ITEM_RELEASES: Record<
	string,
	{ version: number; label: string; changelog: string }
> = {
	'SRD:subclasses:warrior_call_of_the_slayer': {
		version: 2,
		label: 'Slayer Dice Tracking',
		changelog: 'Adds a Slayer Dice tracker with a maximum tied to Proficiency.'
	},
	'SRD:domain_cards:a_soldiers_bond': {
		version: 2,
		label: "A Soldier's Bond Tracking",
		changelog: 'Adds a once-per-long-rest use tracker.'
	},
	'SRD:community_cards:orderborne': {
		version: 2,
		label: 'Orderborne Sayings or Values',
		changelog: 'Adds three fields for recording the character’s sayings or values.'
	}
};

const ITEM_SCHEMAS = {
	primary_weapons: PrimaryWeaponSchema,
	secondary_weapons: SecondaryWeaponSchema,
	armor: ArmorSchema,
	loot: LootSchema,
	consumables: ConsumableSchema,
	beastforms: BeastformSchema,
	classes: CharacterClassSchema,
	subclasses: SubclassSchema,
	domains: DomainSchema,
	domain_cards: DomainCardSchema,
	ancestry_cards: AncestryCardSchema,
	community_cards: CommunityCardSchema,
	transformations: TransformationSchema,
	character_sheet_addons: CharacterSheetAddonSchema,
	adversaries: AdversarySchema,
	environments: EnvironmentSchema
} as const;

type SeedItem = {
	itemType: HomebrewTable;
	itemId: string;
	sourceKey: SourceKey;
	itemVersion: number;
	item: HomebrewItem<HomebrewTable>;
	label: string;
	changelog: string;
};

function nowIso() {
	return new Date().toISOString();
}

export function validateOfficialCompendiumItem(itemType: HomebrewTable, item: unknown) {
	return ITEM_SCHEMAS[itemType].parse(item) as HomebrewItem<HomebrewTable>;
}

export function getOfficialSeedSources(): SourceMetadata[] {
	return OFFICIAL_SEED_SOURCES.map((source) => source.metadata);
}

export function getOfficialSeedItems(): SeedItem[] {
	return OFFICIAL_SEED_SOURCES.flatMap(({ metadata, compendium }) =>
		OFFICIAL_COMPENDIUM_TABLES.flatMap((itemType) =>
			Object.entries(compendium[itemType]).map(([itemId, item]) => {
				const release = SEED_ITEM_RELEASES[`${metadata.source_key}:${itemType}:${itemId}`];
				return {
					itemType,
					itemId,
					sourceKey: metadata.source_key,
					itemVersion: release?.version ?? SEED_VERSION,
					item: validateOfficialCompendiumItem(itemType, item),
					label: release?.label ?? 'Initial Import',
					changelog: release?.changelog ?? 'Seeded from source data.'
				};
			})
		)
	);
}

async function publishSeedItem(seedItem: SeedItem, timestamp: string) {
	await execute(
		[
			'insert into official_compendium_items',
			'(item_type, item_id, source_key, current_version, created_at, updated_at)',
			'values (?, ?, ?, ?, ?, ?)',
			'on conflict (source_key, item_type, item_id) do update set',
			'current_version = excluded.current_version,',
			'updated_at = excluded.updated_at'
		].join(' '),
		[
			seedItem.itemType,
			seedItem.itemId,
			seedItem.sourceKey,
			seedItem.itemVersion,
			timestamp,
			timestamp
		]
	);
	await execute(
		[
			'insert into official_compendium_item_versions',
			'(item_type, item_id, source_key, item_version, label, changelog, item, created_at, published_at)',
			'values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
			'on conflict (source_key, item_type, item_id, item_version) do update set',
			'item = excluded.item,',
			'label = excluded.label,',
			'changelog = excluded.changelog'
		].join(' '),
		[
			seedItem.itemType,
			seedItem.itemId,
			seedItem.sourceKey,
			seedItem.itemVersion,
			seedItem.label,
			seedItem.changelog,
			jsonParam(seedItem.item),
			timestamp,
			timestamp
		]
	);
}

export async function refreshOfficialCompendiumSeed() {
	const timestamp = nowIso();
	const sources = getOfficialSeedSources();
	const items = getOfficialSeedItems();
	const enabledParam = databaseDialect === 'sqlite' ? 1 : true;

	for (const source of sources) {
		await execute(
			[
				'insert into official_sources (source_key, metadata, enabled, created_at, updated_at)',
				'values (?, ?, ?, ?, ?)',
				'on conflict (source_key) do update set',
				'metadata = excluded.metadata,',
				'updated_at = excluded.updated_at'
			].join(' '),
			[source.source_key, jsonParam(source), enabledParam, timestamp, timestamp]
		);
	}

	for (const seedItem of items) {
		await publishSeedItem(seedItem, timestamp);
	}

	return {
		source_count: sources.length,
		item_count: items.length
	};
}

export async function ensureOfficialCompendiumSeeded() {
	const row = await queryOne<{ count: string | number }>(
		'select count(*) as count from official_compendium_items'
	);
	if (Number(row?.count ?? 0) === 0) {
		await refreshOfficialCompendiumSeed();
		return;
	}

	const timestamp = nowIso();
	for (const seedItem of getOfficialSeedItems().filter((item) => item.itemVersion > SEED_VERSION)) {
		const current = await queryOne<{ current_version: string | number }>(
			'select current_version from official_compendium_items where source_key = ? and item_type = ? and item_id = ?',
			[seedItem.sourceKey, seedItem.itemType, seedItem.itemId]
		);
		if (Number(current?.current_version ?? 0) >= seedItem.itemVersion) continue;
		await publishSeedItem(seedItem, timestamp);
	}
}
