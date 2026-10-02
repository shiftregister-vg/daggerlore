// Package contract loads the GM API contract in docs/api/gm-v1 and checks fixtures against it.
//
// It exists to make the contract executable: the OpenAPI document and the schemas generated from the zod domain
// types are compiled as JSON Schema 2020-12, and every fixture is validated against the operation it claims to
// exercise. mapping.go holds the reference Daggerlore ⇄ Daggerdash mapper that the round-trip fixtures run through.
package contract

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v6"
	"go.yaml.in/yaml/v3"
)

const baseURL = "https://daggerlore.app/api/gm-v1/"

// Spec is the compiled contract.
type Spec struct {
	Dir      string
	Doc      map[string]any
	compiler *jsonschema.Compiler
	cache    map[string]*jsonschema.Schema
	inline   int
}

// Operation is one OpenAPI operation with its path.
type Operation struct {
	ID     string
	Method string
	Path   string
	Item   map[string]any // the path item (for shared parameters)
	Op     map[string]any
}

// LoadSpec reads openapi.yaml and the generated schema file from dir (docs/api/gm-v1).
func LoadSpec(dir string) (*Spec, error) {
	raw, err := os.ReadFile(filepath.Join(dir, "openapi.yaml"))
	if err != nil {
		return nil, err
	}
	var doc map[string]any
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		return nil, fmt.Errorf("openapi.yaml: %w", err)
	}
	docJSON, err := json.Marshal(doc)
	if err != nil {
		return nil, err
	}
	docAny, err := jsonschema.UnmarshalJSON(bytes.NewReader(docJSON))
	if err != nil {
		return nil, err
	}
	domainRaw, err := os.ReadFile(filepath.Join(dir, "schemas", "domain.generated.json"))
	if err != nil {
		return nil, err
	}
	domainAny, err := jsonschema.UnmarshalJSON(bytes.NewReader(domainRaw))
	if err != nil {
		return nil, err
	}

	c := jsonschema.NewCompiler()
	c.DefaultDraft(jsonschema.Draft2020)
	c.AssertFormat()
	if err := c.AddResource(baseURL+"openapi.json", docAny); err != nil {
		return nil, err
	}
	if err := c.AddResource(baseURL+"schemas/domain.generated.json", domainAny); err != nil {
		return nil, err
	}
	return &Spec{Dir: dir, Doc: doc, compiler: c, cache: map[string]*jsonschema.Schema{}}, nil
}

// Component compiles #/components/schemas/<name>.
func (s *Spec) Component(name string) (*jsonschema.Schema, error) {
	return s.compile(baseURL + "openapi.json#/components/schemas/" + name)
}

// Domain compiles a generated domain schema ($defs/<name>).
func (s *Spec) Domain(name string) (*jsonschema.Schema, error) {
	return s.compile(baseURL + "schemas/domain.generated.json#/$defs/" + name)
}

func (s *Spec) compile(loc string) (*jsonschema.Schema, error) {
	if sc, ok := s.cache[loc]; ok {
		return sc, nil
	}
	sc, err := s.compiler.Compile(loc)
	if err != nil {
		return nil, err
	}
	s.cache[loc] = sc
	return sc, nil
}

// ComponentNames lists every schema under components.
func (s *Spec) ComponentNames() []string {
	var names []string
	for k := range s.componentMap("schemas") {
		names = append(names, k)
	}
	sort.Strings(names)
	return names
}

func (s *Spec) componentMap(section string) map[string]any {
	comps, _ := s.Doc["components"].(map[string]any)
	m, _ := comps[section].(map[string]any)
	return m
}

// Operations indexes every operation by operationId.
func (s *Spec) Operations() (map[string]Operation, error) {
	ops := map[string]Operation{}
	paths, _ := s.Doc["paths"].(map[string]any)
	for path, v := range paths {
		item := v.(map[string]any)
		for method, o := range item {
			switch method {
			case "get", "put", "post", "delete", "patch":
			default:
				continue
			}
			op := o.(map[string]any)
			id, _ := op["operationId"].(string)
			if id == "" {
				return nil, fmt.Errorf("%s %s has no operationId", method, path)
			}
			if _, dup := ops[id]; dup {
				return nil, fmt.Errorf("duplicate operationId %s", id)
			}
			ops[id] = Operation{ID: id, Method: strings.ToUpper(method), Path: path, Item: item, Op: op}
		}
	}
	return ops, nil
}

// ResolveRef follows a local "#/components/..." reference to its raw object.
func (s *Spec) ResolveRef(ref string) (map[string]any, error) {
	if !strings.HasPrefix(ref, "#/") {
		return nil, fmt.Errorf("unsupported ref %q", ref)
	}
	var cur any = s.Doc
	for _, part := range strings.Split(strings.TrimPrefix(ref, "#/"), "/") {
		part = strings.ReplaceAll(strings.ReplaceAll(part, "~1", "/"), "~0", "~")
		m, ok := cur.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("ref %q: %q is not an object", ref, part)
		}
		cur, ok = m[part]
		if !ok {
			return nil, fmt.Errorf("ref %q: missing %q", ref, part)
		}
	}
	m, ok := cur.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("ref %q is not an object", ref)
	}
	return m, nil
}

// deref resolves {"$ref": ...} once, returning the object it points to.
func (s *Spec) deref(obj map[string]any) (map[string]any, error) {
	if ref, ok := obj["$ref"].(string); ok {
		return s.ResolveRef(ref)
	}
	return obj, nil
}

// SchemaOf compiles an OpenAPI schema object that is either a $ref or inline.
func (s *Spec) SchemaOf(schema map[string]any) (*jsonschema.Schema, error) {
	if ref, ok := schema["$ref"].(string); ok && len(schema) == 1 {
		if strings.HasPrefix(ref, "#/") {
			return s.compile(baseURL + "openapi.json" + ref)
		}
		return s.compile(baseURL + ref)
	}
	b, err := json.Marshal(schema)
	if err != nil {
		return nil, err
	}
	b = bytes.ReplaceAll(b, []byte(`"$ref":"#/`), []byte(`"$ref":"`+baseURL+`openapi.json#/`))
	b = bytes.ReplaceAll(b, []byte(`"$ref":"schemas/`), []byte(`"$ref":"`+baseURL+`schemas/`))
	any_, err := jsonschema.UnmarshalJSON(bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	s.inline++
	loc := fmt.Sprintf("%sinline/%d.json", baseURL, s.inline)
	if err := s.compiler.AddResource(loc, any_); err != nil {
		return nil, err
	}
	return s.compile(loc)
}

// RequestSchema returns the JSON request body schema of an operation (nil when it has none).
func (s *Spec) RequestSchema(op Operation) (*jsonschema.Schema, error) {
	rb, ok := op.Op["requestBody"].(map[string]any)
	if !ok {
		return nil, nil
	}
	content, _ := rb["content"].(map[string]any)
	mt, ok := content["application/json"].(map[string]any)
	if !ok {
		return nil, nil
	}
	return s.SchemaOf(mt["schema"].(map[string]any))
}

// ResponseSpec describes a declared response.
type ResponseSpec struct {
	Schema   *jsonschema.Schema // nil when the response has no JSON body
	Headers  map[string]bool    // declared response headers
	Required map[string]bool    // declared response headers that are required
}

// Response returns the declared response for status, or an error if the operation does not declare it.
func (s *Spec) Response(op Operation, status int) (*ResponseSpec, error) {
	responses, _ := op.Op["responses"].(map[string]any)
	raw, ok := responses[fmt.Sprint(status)]
	if !ok {
		return nil, fmt.Errorf("operation %s does not declare status %d", op.ID, status)
	}
	resp, err := s.deref(raw.(map[string]any))
	if err != nil {
		return nil, err
	}
	rs := &ResponseSpec{Headers: map[string]bool{}, Required: map[string]bool{}}
	if hs, ok := resp["headers"].(map[string]any); ok {
		for name, h := range hs {
			rs.Headers[name] = true
			hd, err := s.deref(h.(map[string]any))
			if err != nil {
				return nil, err
			}
			if req, _ := hd["required"].(bool); req {
				rs.Required[name] = true
			}
		}
	}
	content, _ := resp["content"].(map[string]any)
	for _, mt := range []string{"application/json", "application/problem+json"} {
		if m, ok := content[mt].(map[string]any); ok {
			sc, err := s.SchemaOf(m["schema"].(map[string]any))
			if err != nil {
				return nil, err
			}
			rs.Schema = sc
			break
		}
	}
	return rs, nil
}

// Params returns the names of the path parameters an operation requires (path-level and operation-level).
func (s *Spec) Params(op Operation, in string) (map[string]map[string]any, error) {
	out := map[string]map[string]any{}
	collect := func(list any) error {
		arr, _ := list.([]any)
		for _, p := range arr {
			pm, err := s.deref(p.(map[string]any))
			if err != nil {
				return err
			}
			if pm["in"] == in {
				out[pm["name"].(string)] = pm
			}
		}
		return nil
	}
	if err := collect(op.Item["parameters"]); err != nil {
		return nil, err
	}
	if err := collect(op.Op["parameters"]); err != nil {
		return nil, err
	}
	return out, nil
}

// Decode parses JSON into the representation jsonschema validates (numbers as json.Number).
func Decode(raw []byte) (any, error) {
	return jsonschema.UnmarshalJSON(bytes.NewReader(raw))
}
