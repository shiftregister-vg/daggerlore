package contract

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"testing"
)

// Errors a fixture can expect, by the name used in the JSON.
var mappingErrors = map[string]error{
	"readonly":          ErrReadonly,
	"start_below_floor": ErrStartBelowFloor,
}

type rtEdit struct {
	Name        string              `json:"name"`
	Local       Doc                 `json:"local"`
	Expect      map[string]rtExpect `json:"expect"`
	ExpectError string              `json:"expect_error"`
	_           struct{}
}

type rtNewState struct {
	ItemIndex     int `json:"item_index"`
	InstanceIndex int `json:"instance_index"`
	Data          Doc `json:"data"`
}

type rtExpect struct {
	Set              map[string]any `json:"set"`
	Extensions       Doc            `json:"extensions"`
	NewInstanceState []rtNewState   `json:"new_instance_state"`
}

type rtCase struct {
	Name    string          `json:"name"`
	Mapping string          `json:"mapping"`
	Server  json.RawMessage `json:"server"`
	Desktop Doc             `json:"desktop"`
	Edits   []rtEdit        `json:"edits"`
	Create  *struct {
		Local      Doc `json:"local"`
		ExpectData Doc `json:"expect_data"`
	} `json:"create"`
}

func loadRoundTrips(t *testing.T) map[string]rtCase {
	t.Helper()
	files, err := filepath.Glob(filepath.Join(specDir, "fixtures", "roundtrip", "*.json"))
	if err != nil || len(files) == 0 {
		t.Fatalf("no round-trip fixtures: %v", err)
	}
	out := map[string]rtCase{}
	for _, f := range files {
		raw, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		var c rtCase
		if err := json.Unmarshal(raw, &c); err != nil {
			t.Fatalf("%s: %v", f, err)
		}
		out[strings.TrimSuffix(filepath.Base(f), ".json")] = c
	}
	return out
}

// applyPointers applies {"/a/b": v, "/list/1/x": v} to a deep copy of doc.
func applyPointers(t *testing.T, doc Doc, set map[string]any) Doc {
	t.Helper()
	out := cloneDoc(doc)
	for ptr, v := range set {
		parts := strings.Split(strings.TrimPrefix(ptr, "/"), "/")
		var cur any = out
		for i, p := range parts {
			last := i == len(parts)-1
			switch node := cur.(type) {
			case Doc:
				if last {
					node[p] = v
				} else {
					cur = node[p]
				}
			case []any:
				idx, err := strconv.Atoi(p)
				if err != nil || idx >= len(node) {
					t.Fatalf("bad pointer %s", ptr)
				}
				if last {
					node[idx] = v
				} else {
					cur = node[idx]
				}
			default:
				t.Fatalf("pointer %s leaves the document", ptr)
			}
		}
	}
	return out
}

func toJSONValue(t *testing.T, d any) any {
	t.Helper()
	b, err := json.Marshal(d)
	if err != nil {
		t.Fatal(err)
	}
	v, err := Decode(b)
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func mustValidate(t *testing.T, s *Spec, component string, v any, what string) {
	t.Helper()
	sc, err := s.Component(component)
	if err != nil {
		t.Fatalf("%s: %v", what, err)
	}
	if verr := sc.Validate(toJSONValue(t, v)); verr != nil {
		t.Errorf("%s does not satisfy %s at %v", what, component, locations(verr))
	}
}

func decodeRole(t *testing.T, raw json.RawMessage) (map[string]Doc, map[string][]Doc) {
	t.Helper()
	var generic map[string]json.RawMessage
	if err := json.Unmarshal(raw, &generic); err != nil {
		t.Fatal(err)
	}
	single := map[string]Doc{}
	multi := map[string][]Doc{}
	for k, v := range generic {
		var d Doc
		if json.Unmarshal(v, &d) == nil {
			single[k] = d
			continue
		}
		var l []Doc
		if err := json.Unmarshal(v, &l); err != nil {
			t.Fatalf("role %s: %v", k, err)
		}
		multi[k] = l
	}
	return single, multi
}

func TestRoundTripFixturesLoseNothing(t *testing.T) {
	spec := loadSpec(t)
	conv := SimpleConverter{}
	for name, c := range loadRoundTrips(t) {
		c := c
		t.Run(name, func(t *testing.T) {
			switch c.Mapping {
			case "adversary", "environment", "countdown", "opaque":
				runResource(t, spec, conv, c)
			case "campaign":
				runCampaign(t, spec, conv, c)
			case "encounter":
				runEncounter(t, spec, conv, c)
			default:
				t.Fatalf("unknown mapping %q", c.Mapping)
			}
		})
	}
}

func envelopeComponent(env Doc) string {
	switch env["kind"] {
	case "homebrew":
		return "Homebrew"
	case "catalog_item":
		return "CatalogItem"
	case "countdown":
		return "Countdown"
	case "campaign":
		return "Campaign"
	case "campaign_fear":
		return "CampaignFear"
	case "campaign_public_notes", "campaign_private_notes":
		return "CampaignNotes"
	case "encounter":
		return "Encounter"
	case "encounter_instance":
		return "EncounterInstance"
	}
	return ""
}

func checkExpect(t *testing.T, role string, base Doc, w Write, exp rtExpect) {
	t.Helper()
	want := applyPointers(t, base, exp.Set)
	if !reflect.DeepEqual(w.Data, want) {
		got, _ := json.MarshalIndent(w.Data, "", " ")
		wantJSON, _ := json.MarshalIndent(want, "", " ")
		t.Errorf("%s: data differs from the base plus the expected changes\n got: %s\nwant: %s", role, got, wantJSON)
	}
	var gotStates []rtNewState
	for _, n := range w.NewInstanceState {
		gotStates = append(gotStates, rtNewState{ItemIndex: n.ItemIndex, InstanceIndex: n.InstanceIndex, Data: n.Data})
	}
	if !reflect.DeepEqual(gotStates, exp.NewInstanceState) {
		t.Errorf("%s: new_instance_state differs: got %v want %v", role, gotStates, exp.NewInstanceState)
	}
	if exp.Extensions != nil {
		if !reflect.DeepEqual(w.Extensions, exp.Extensions) {
			t.Errorf("%s: extensions differ: got %v want %v", role, w.Extensions, exp.Extensions)
		}
	} else if w.Extensions != nil {
		t.Errorf("%s: wrote extensions %v but none were expected", role, w.Extensions)
	}
}

func runResource(t *testing.T, spec *Spec, conv Converter, c rtCase) {
	if c.Server == nil || string(c.Server) == "null" {
		runCreate(t, spec, conv, c)
		return
	}
	single, _ := decodeRole(t, c.Server)
	env := single["resource"]
	if comp := envelopeComponent(env); comp != "" {
		mustValidate(t, spec, comp, env, "server resource")
	}
	data, ext := asDoc(env["data"]), asDoc(env["extensions"])
	typ, _ := env["type"].(string)

	var local Doc
	switch c.Mapping {
	case "adversary":
		local = AdversaryToLocal(data, ext, conv)
	case "environment":
		local = EnvironmentToLocal(data, conv)
	case "countdown":
		local = CountdownToLocal(data)
	case "opaque":
		local = OpaqueToLocal(env)
	}
	if !reflect.DeepEqual(local, c.Desktop) {
		got, _ := json.MarshalIndent(local, "", " ")
		want, _ := json.MarshalIndent(c.Desktop, "", " ")
		t.Fatalf("projection differs\n got: %s\nwant: %s", got, want)
	}

	apply := func(local Doc) (Doc, Doc, bool, error) {
		if err := GuardWritable(env); err != nil {
			return nil, nil, false, err
		}
		switch c.Mapping {
		case "adversary":
			d, e, ch := AdversaryApplyLocal(data, ext, local, conv)
			return d, e, ch, nil
		case "environment":
			d, ch := EnvironmentApplyLocal(data, local, conv)
			return d, nil, ch, nil
		case "countdown":
			d, ch, err := CountdownApplyLocal(data, local)
			return d, nil, ch, err
		default:
			return nil, nil, false, ErrReadonly
		}
	}
	// An untouched projection pushes nothing.
	if env["readonly"] != true && c.Mapping != "opaque" {
		if _, _, changed, err := apply(local); err != nil || changed {
			t.Errorf("an unedited local copy must not produce a write (changed=%v err=%v)", changed, err)
		}
	}
	for _, e := range c.Edits {
		d, x, changed, err := apply(e.Local)
		if e.ExpectError != "" {
			if want := mappingErrors[e.ExpectError]; want == nil || !errors.Is(err, want) {
				t.Errorf("%s: want error %q, got %v", e.Name, e.ExpectError, err)
			}
			continue
		}
		if err != nil {
			t.Errorf("%s: %v", e.Name, err)
			continue
		}
		exp := e.Expect["resource"]
		w := Write{Data: d}
		if !reflect.DeepEqual(x, ext) {
			w.Extensions = x
		}
		if len(exp.Set) == 0 && exp.Extensions == nil && changed {
			t.Errorf("%s: unexpected change", e.Name)
		}
		checkExpect(t, e.Name, data, w, exp)
		// What the desktop would PUT must satisfy the write schema.
		body := Doc{"data": d, "extensions": firstDoc(x, ext)}
		switch c.Mapping {
		case "adversary", "environment":
			body["type"] = typ
			mustValidate(t, spec, "HomebrewWrite", body, e.Name+": write body")
		case "countdown":
			mustValidate(t, spec, "CountdownWrite", body, e.Name+": write body")
		}
	}
}

func firstDoc(a, b Doc) Doc {
	if a != nil {
		return a
	}
	if b != nil {
		return b
	}
	return Doc{}
}

func runCreate(t *testing.T, spec *Spec, conv Converter, c rtCase) {
	if c.Create == nil {
		t.Fatal("fixture without server needs a create block")
	}
	var d Doc
	switch c.Mapping {
	case "adversary":
		d, _, _ = AdversaryApplyLocal(nil, nil, c.Create.Local, conv)
	case "environment":
		d, _ = EnvironmentApplyLocal(nil, c.Create.Local, conv)
	default:
		t.Fatalf("create not supported for %s", c.Mapping)
	}
	if !reflect.DeepEqual(d, c.Create.ExpectData) {
		got, _ := json.MarshalIndent(d, "", " ")
		want, _ := json.MarshalIndent(c.Create.ExpectData, "", " ")
		t.Errorf("created data differs\n got: %s\nwant: %s", got, want)
	}
	typ := map[string]string{"adversary": "adversaries", "environment": "environments"}[c.Mapping]
	mustValidate(t, spec, "HomebrewCreate", Doc{"client_ref": "daggerdash:" + strings.Repeat("ab", 16), "type": typ, "data": d}, "create body")
	// And the projection of what we created comes back as the desktop wrote it.
	if c.Mapping == "adversary" {
		back := AdversaryToLocal(d, nil, conv)
		if !reflect.DeepEqual(back, c.Create.Local) {
			t.Errorf("created adversary does not project back to the local copy: %v", back)
		}
	}
}

func runCampaign(t *testing.T, spec *Spec, conv Converter, c rtCase) {
	single, _ := decodeRole(t, c.Server)
	for role, env := range single {
		mustValidate(t, spec, envelopeComponent(env), env, "server "+role)
	}
	b := CampaignBundle{
		Campaign: asDoc(single["campaign"]["data"]), Fear: asDoc(single["fear"]["data"]),
		PublicNotes: asDoc(single["public_notes"]["data"]), PrivateNotes: asDoc(single["private_notes"]["data"]),
	}
	if local := CampaignToLocal(b); !reflect.DeepEqual(local, c.Desktop) {
		t.Fatalf("projection differs: %v", local)
	}
	if w := CampaignApplyLocal(b, c.Desktop); len(w) != 0 {
		t.Errorf("an unedited local copy must not produce writes: %v", w)
	}
	bases := map[string]Doc{"campaign": b.Campaign, "fear": b.Fear, "public_notes": b.PublicNotes, "private_notes": b.PrivateNotes}
	for _, e := range c.Edits {
		w := CampaignApplyLocal(b, e.Local)
		assertSameRoles(t, e.Name, w, e.Expect)
		for role, exp := range e.Expect {
			checkExpect(t, e.Name+" "+role, bases[role], w[role], exp)
		}
	}
}

func assertSameRoles(t *testing.T, name string, w Writes, expect map[string]rtExpect) {
	t.Helper()
	for role := range w {
		if _, ok := expect[role]; !ok {
			t.Errorf("%s: unexpected write to %s", name, role)
		}
	}
	for role := range expect {
		if _, ok := w[role]; !ok {
			t.Errorf("%s: missing write to %s", name, role)
		}
	}
}

func runEncounter(t *testing.T, spec *Spec, conv Converter, c rtCase) {
	single, multi := decodeRole(t, c.Server)
	encEnv := single["encounter"]
	mustValidate(t, spec, "Encounter", encEnv, "server encounter")
	b := EncounterBundle{Encounter: asDoc(encEnv["data"]), Instances: map[string]Doc{}}
	for _, in := range multi["instances"] {
		mustValidate(t, spec, "EncounterInstance", in, "server instance")
		b.Instances[str(in["id"])] = asDoc(in["data"])
	}
	if local := EncounterToLocal(b, conv); !reflect.DeepEqual(local, c.Desktop) {
		got, _ := json.MarshalIndent(local, "", " ")
		want, _ := json.MarshalIndent(c.Desktop, "", " ")
		t.Fatalf("projection differs\n got: %s\nwant: %s", got, want)
	}
	opts := func() Options { return Options{Conv: conv} }
	if w, err := EncounterApplyLocal(b, c.Desktop, opts()); err != nil || len(w) != 0 {
		t.Errorf("an unedited local copy must not produce writes: %v %v", w, err)
	}
	for _, e := range c.Edits {
		w, err := EncounterApplyLocal(b, e.Local, opts())
		if err != nil {
			t.Errorf("%s: %v", e.Name, err)
			continue
		}
		assertSameRoles(t, e.Name, w, e.Expect)
		for role, exp := range e.Expect {
			base := b.Encounter
			if strings.HasPrefix(role, "instance:") {
				base = b.Instances[strings.TrimPrefix(role, "instance:")]
			}
			checkExpect(t, fmt.Sprintf("%s %s", e.Name, role), base, w[role], exp)
			if role == "encounter" {
				body := Doc{"data": w[role].Data}
				if len(w[role].NewInstanceState) > 0 {
					var states []any
					for _, n := range w[role].NewInstanceState {
						states = append(states, Doc{"item_index": float64(n.ItemIndex), "instance_index": float64(n.InstanceIndex), "data": n.Data})
					}
					body["new_instance_state"] = states
				}
				mustValidate(t, spec, "EncounterWrite", body, e.Name+": encounter write body")
			} else {
				mustValidate(t, spec, "EncounterInstanceWrite", Doc{"data": w[role].Data}, e.Name+": instance write body")
			}
		}
	}
}
