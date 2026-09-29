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
		version: 3,
		label: "A Soldier's Bond Usage Tracker",
		changelog:
			'Replaces the manual Used token with a once-per-long-rest usage tracker that refreshes when you complete a long rest.'
	},
	'SRD:domain_cards:scramble': {
		version: 2,
		label: 'Scramble Usage Tracker',
		changelog: 'Adds a once-per-rest usage tracker that refreshes on a short or long rest.'
	},
	'SRD:domain_cards:earthquake': {
		version: 2,
		label: 'Earthquake Usage Tracker',
		changelog:
			'Adds a once-per-rest usage tracker for a successful cast that refreshes on a short or long rest.'
	},
	'SRD:domain_cards:premonition': {
		version: 2,
		label: 'Premonition Usage Tracker',
		changelog:
			'Adds a once-per-long-rest usage tracker that refreshes when you complete a long rest.'
	},
	'SRD:domain_cards:inspirational_words': {
		version: 2,
		label: 'Inspirational Words Token Pool',
		changelog:
			'Replaces the generic tokens with a pool that refills to your Presence after a long rest.'
	},
	'SRD:domain_cards:restoration': {
		version: 2,
		label: 'Restoration Token Pool',
		changelog:
			'Replaces the generic tokens with a pool that refills to your Spellcast trait after a long rest.'
	},
	'SRD:domain_cards:unleash_chaos': {
		version: 2,
		label: 'Unleash Chaos Token Pool',
		changelog:
			'Replaces the generic tokens with a pool capped at your Spellcast trait that refills at the start of a session and clears at the end of one.'
	},
	'SRD:classes:seraph': {
		version: 2,
		label: 'Prayer Dice Pool',
		changelog:
			"Prayer Dice use your subclass's Spellcast trait, are rolled when you start a session and clear when it ends."
	},
	'SRD:classes:rogue': {
		version: 2,
		label: "Rogue's Dodge Effect",
		changelog:
			"Rogue's Dodge can be activated for 3 Hope: +2 Evasion until an attack succeeds against you or your next rest."
	},
	'SRD:classes:ranger': {
		version: 2,
		label: "Ranger's Focus Target",
		changelog:
			"Ranger's Focus spends a Hope on the attack and, on a success, tracks your Focus; a new Focus replaces the old one."
	},
	'SRD:subclasses:guardian_vengeance': {
		version: 2,
		label: 'Act of Reprisal Targets',
		changelog:
			'Act of Reprisal tracks each adversary you can retaliate against, with its +1 Proficiency for your next successful attack against them.'
	},
	'SRD:domain_cards:deadly_focus': {
		version: 2,
		label: 'Deadly Focus Effect',
		changelog:
			'Adds a once-per-rest use; activating Deadly Focus records your target and adds +1 Proficiency until you end it.'
	},
	'SRD:domain_cards:frenzy': {
		version: 2,
		label: 'Frenzy Effect',
		changelog:
			'Adds a once-per-long-rest use; while Frenzied you gain +10 damage and +8 to your Severe threshold.'
	},
	'SRD:community_cards:orderborne': {
		version: 3,
		label: 'Orderborne Sayings or Values Record',
		changelog:
			'Moves the three sayings or values into a record on the Dedicated feature; existing values carry over.'
	},
	'SRD:domain_cards:signature_move': {
		version: 2,
		label: 'Signature Move Record and Usage Tracker',
		changelog:
			'Adds a record for naming and describing your signature move and a once-per-rest usage tracker.'
	},
	'SRD:domain_cards:know_thy_enemy': {
		version: 2,
		label: 'Know Thy Enemy Dossier',
		changelog:
			'Adds a dossier for recording each target and the information the GM revealed about it.'
	},
	'SRD:domain_cards:healing_hands': {
		version: 2,
		label: 'Healing Hands Healed Targets',
		changelog:
			'Adds a list of targets you have healed, which clears when you complete a long rest.'
	},
	'SRD:ancestry_cards:drakona': {
		version: 2,
		label: 'Drakona Breath Element',
		changelog: 'Adds a field for recording the element of your Elemental Breath.'
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
