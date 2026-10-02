package contract

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

const specDir = "../../docs/api/gm-v1"

func loadSpec(t *testing.T) *Spec {
	t.Helper()
	s, err := LoadSpec(specDir)
	if err != nil {
		t.Fatalf("load spec: %v", err)
	}
	return s
}

// Operations that are idempotent by construction and carry no revision to match.
var ifMatchExempt = map[string]bool{
	"putAttachmentContent": true, // idempotent upload keyed by Idempotency-Key and SHA-256
	"putEncounterLink":     true, // idempotent link creation
	"deselectCampaign":     true, // narrows the grant; not a revisioned resource
}

func TestEveryComponentSchemaCompiles(t *testing.T) {
	s := loadSpec(t)
	for _, name := range s.ComponentNames() {
		if _, err := s.Component(name); err != nil {
			t.Errorf("components/schemas/%s: %v", name, err)
		}
	}
}

func TestEveryDomainSchemaCompiles(t *testing.T) {
	s := loadSpec(t)
	for _, name := range append(homebrewTypes, "countdown", "fear", "condition") {
		if _, err := s.Domain(name); err != nil {
			t.Errorf("$defs/%s: %v", name, err)
		}
	}
}

// Every local $ref must resolve, and every path parameter must be declared.
func TestReferencesAndParametersResolve(t *testing.T) {
	s := loadSpec(t)
	var walk func(path string, v any)
	walk = func(path string, v any) {
		switch x := v.(type) {
		case map[string]any:
			if ref, ok := x["$ref"].(string); ok && strings.HasPrefix(ref, "#/") {
				if _, err := s.ResolveRef(ref); err != nil {
					// Schema refs may point at non-object nodes only if malformed.
					t.Errorf("%s: %v", path, err)
				}
			}
			for k, c := range x {
				walk(path+"/"+k, c)
			}
		case []any:
			for i, c := range x {
				walk(path+"/"+string(rune('0'+i%10)), c)
			}
		}
	}
	walk("#", s.Doc)

	ops, err := s.Operations()
	if err != nil {
		t.Fatal(err)
	}
	braces := regexp.MustCompile(`\{([^}]+)\}`)
	for id, op := range ops {
		declared, err := s.Params(op, "path")
		if err != nil {
			t.Fatalf("%s: %v", id, err)
		}
		for _, m := range braces.FindAllStringSubmatch(op.Path, -1) {
			if _, ok := declared[m[1]]; !ok {
				t.Errorf("%s: path parameter %s is not declared", id, m[1])
			}
		}
		if len(declared) != len(braces.FindAllString(op.Path, -1)) {
			t.Errorf("%s: declares %d path parameters for %s", id, len(declared), op.Path)
		}
		// Mutations must demand If-Match (or an Idempotency-Key for creates).
		headers, err := s.Params(op, "header")
		if err != nil {
			t.Fatalf("%s: %v", id, err)
		}
		switch op.Method {
		case "PUT", "DELETE":
			if ifMatchExempt[id] {
				continue
			}
			if _, ok := headers["If-Match"]; !ok {
				t.Errorf("%s: %s %s must require If-Match", id, op.Method, op.Path)
			}
		case "POST":
			if _, ok := headers["Idempotency-Key"]; !ok {
				t.Errorf("%s: POST %s must require Idempotency-Key", id, op.Path)
			}
		}
	}
}

// Unknown keys must not be storable in `data` for any homebrew type (they belong in `extensions`), including the
// types zod builds with intersections.
func TestHomebrewDataIsStrict(t *testing.T) {
	s := loadSpec(t)
	for _, typ := range homebrewTypes {
		raw, err := os.ReadFile(filepath.Join(specDir, "examples", "homebrew", typ+".json"))
		if err != nil {
			t.Fatal(err)
		}
		sc, err := s.Domain(typ)
		if err != nil {
			t.Fatal(err)
		}
		var doc map[string]any
		if err := json.Unmarshal(raw, &doc); err != nil {
			t.Fatal(err)
		}
		if err := sc.Validate(toJSONValue(t, doc)); err != nil {
			t.Errorf("%s: the example does not satisfy its own schema: %v", typ, err)
		}
		doc["x_unknown_field"] = true
		if err := sc.Validate(toJSONValue(t, doc)); err == nil {
			t.Errorf("%s: an unknown key in data must be rejected", typ)
		}
	}
}
