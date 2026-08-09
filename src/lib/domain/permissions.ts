import type { Id } from './ids';
import type { Campaign, CampaignCharacter, CampaignMember } from './schemas/campaigns';
import type { Character } from './schemas/characters';
import type { Encounter } from './schemas/encounters';
import type {
	Adversary,
	AncestryCard,
	Armor,
	Beastform,
	CharacterSheetAddon,
	CharacterClass,
	CommunityCard,
	Consumable,
	Domain,
	DomainCard,
	Environment,
	Loot,
	PrimaryWeapon,
	SecondaryWeapon,
	Subclass,
	Transformation
} from './schemas/compendium';

export type CampaignAccess = {
	campaign_id: Id<'campaigns'>;
	invite_code: string;
	campaign: Campaign;
	members: CampaignMember[];
	characters: CampaignCharacter[];
	isOwner: boolean;
};

export type CharacterAccess = {
	character: Character;
	canEdit: boolean;
	canEditInventory: boolean;
	isOwner: boolean;
};

export type HomebrewTable =
	| 'primary_weapons'
	| 'secondary_weapons'
	| 'armor'
	| 'loot'
	| 'consumables'
	| 'beastforms'
	| 'classes'
	| 'subclasses'
	| 'domains'
	| 'domain_cards'
	| 'ancestry_cards'
	| 'community_cards'
	| 'transformations'
	| 'character_sheet_addons'
	| 'adversaries'
	| 'environments';

export type HomebrewItem<T extends HomebrewTable> = T extends 'primary_weapons'
	? PrimaryWeapon
	: T extends 'secondary_weapons'
		? SecondaryWeapon
		: T extends 'armor'
			? Armor
			: T extends 'loot'
				? Loot
				: T extends 'consumables'
					? Consumable
					: T extends 'beastforms'
						? Beastform
						: T extends 'classes'
							? CharacterClass
							: T extends 'subclasses'
								? Subclass
								: T extends 'domains'
									? Domain
									: T extends 'domain_cards'
										? DomainCard
										: T extends 'ancestry_cards'
											? AncestryCard
											: T extends 'community_cards'
												? CommunityCard
												: T extends 'transformations'
													? Transformation
													: T extends 'character_sheet_addons'
														? CharacterSheetAddon
														: T extends 'adversaries'
															? Adversary
															: T extends 'environments'
																? Environment
																: never;

export type HomebrewAccess<T extends HomebrewTable> = {
	item: HomebrewItem<T>;
	canEdit: boolean;
	isOwner: boolean;
};

export type EncounterAccess = {
	encounter: Encounter;
	isOwner: boolean;
};
