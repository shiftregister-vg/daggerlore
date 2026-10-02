package contract

// homebrewTypes are the HomebrewTable names in src/lib/domain/permissions.ts, which are also the keys of the
// generated domain schemas. A test pins this list against the OpenAPI HomebrewType enum.
var homebrewTypes = []string{
	"primary_weapons",
	"secondary_weapons",
	"armor",
	"loot",
	"consumables",
	"beastforms",
	"classes",
	"subclasses",
	"domains",
	"domain_cards",
	"ancestry_cards",
	"community_cards",
	"transformations",
	"character_sheet_addons",
	"adversaries",
	"environments",
}

// HomebrewTypes returns a copy of the homebrew type list.
func HomebrewTypes() []string { return append([]string(nil), homebrewTypes...) }
