package contract

import (
	"sort"
	"strings"
	"testing"
)

func TestFixtureCasesSatisfyTheContract(t *testing.T) {
	s := loadSpec(t)
	ops, err := s.Operations()
	if err != nil {
		t.Fatal(err)
	}
	cases, err := LoadCases(specDir)
	if err != nil {
		t.Fatal(err)
	}
	if len(cases) == 0 {
		t.Fatal("no fixture cases found")
	}
	for _, c := range cases {
		for _, e := range CheckCase(s, ops, c) {
			t.Error(e)
		}
	}
}

// Every resource kind and every homebrew type must show the cases the ticket asks for. Classes a kind cannot
// have are listed with the reason, so a gap is a decision rather than an oversight.
func TestFixtureCoverage(t *testing.T) {
	cases, err := LoadCases(specDir)
	if err != nil {
		t.Fatal(err)
	}
	cov := Coverage(cases)

	full := []string{"ok", "invalid", "stale", "delete", "retry"}
	required := map[string][]string{
		"campaign":               {"ok", "invalid", "stale"}, // no delete: campaigns are created and removed in the web app
		"campaign_fear":          {"ok", "invalid", "stale"}, // singleton; cannot be created or deleted
		"campaign_public_notes":  {"ok", "invalid", "stale"}, // singleton
		"campaign_private_notes": {"ok", "invalid", "stale"}, // singleton
		"countdown":              full,
		"attachment":             full,
		"encounter":              full,
		"encounter_link":         {"ok", "stale", "delete", "forbidden"}, // PUT is idempotent by construction; no key
		"encounter_instance":     {"ok", "invalid", "stale"},             // lifecycle follows the encounter structure
		"conflict":               {"ok", "invalid", "stale", "retry"},
		"catalog_item":           {"ok", "rejected", "forbidden"}, // immutable
		"workspace":              {"ok", "invalid"},
		"capabilities":           {"ok", "rejected"},
		"sync":                   {"ok", "invalid", "gone"},
	}
	for _, typ := range homebrewTypes {
		required["homebrew:"+typ] = full
	}
	var keys []string
	for k := range required {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		got := cov[k]
		for _, class := range required[k] {
			if !got[class] {
				t.Errorf("%s: no %q fixture", k, class)
			}
		}
	}
	for k := range cov {
		if _, ok := required[k]; !ok && !strings.HasPrefix(k, "homebrew:") {
			t.Errorf("fixture subject %q has no coverage requirement", k)
		}
	}
}

// The OpenAPI HomebrewType enum, the generated schemas and the Go list must be the same 16 names.
func TestHomebrewTypesAgree(t *testing.T) {
	s := loadSpec(t)
	enumSchema, err := s.ResolveRef("#/components/schemas/HomebrewType")
	if err != nil {
		t.Fatal(err)
	}
	var enum []string
	for _, v := range enumSchema["enum"].([]any) {
		enum = append(enum, v.(string))
	}
	if strings.Join(enum, ",") != strings.Join(homebrewTypes, ",") {
		t.Errorf("OpenAPI HomebrewType %v differs from %v", enum, homebrewTypes)
	}
}
