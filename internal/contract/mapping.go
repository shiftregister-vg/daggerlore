package contract

import (
	"fmt"
	"html"
	"reflect"
	"regexp"
	"strings"
)

// This file is the reference implementation of docs/api/gm-v1/field-mapping.md. It is the executable form of the
// mapping rules the desktop implements in Rust: the golden fixtures in fixtures/roundtrip run through it, and the
// same fixtures are the acceptance tests for the Rust implementation.
//
// The one rule that makes the mapping lossless: the desktop keeps the last-synced server resource verbatim and
// builds every write by patching that copy with only the fields whose desktop value differs from the projection of
// that same copy. Anything the desktop does not model (images, attribution, privacy flags, unknown homebrew types,
// unknown fields, disabled conditions, interleaving of items) therefore survives by construction.

// Doc is a decoded JSON object.
type Doc = map[string]any

// Converter turns sanitized HTML into the desktop's Markdown-ish text and back. Implementations must keep
// elements Markdown cannot express as raw inline HTML so that a text edit never silently drops formatting.
type Converter interface {
	HTMLToText(html string) string
	TextToHTML(text string) string
}

// Write is one resource write the desktop must send (an If-Match PUT).
type Write struct {
	Data       Doc
	Extensions Doc // nil = leave extensions unchanged
	// NewInstanceState is the live state of instances this write creates, addressed by position because the server
	// assigns their ids (EncounterWrite.new_instance_state).
	NewInstanceState []NewInstanceState
}

// NewInstanceState is one entry of `new_instance_state`.
type NewInstanceState struct {
	ItemIndex     int
	InstanceIndex int
	Data          Doc
}

// Writes are keyed by role: "resource", "campaign", "fear", "public_notes", "private_notes", "encounter",
// "instance:<instance_id>".
type Writes map[string]Write

// Options carries the converter. The desktop never invents ids: new items and instances are sent without ids and
// the server assigns them (the response carries them and the desktop records the mapping).
type Options struct {
	Conv Converter
}

// ---------------------------------------------------------------------------------------------------------------
// path helpers

func getPath(m Doc, path string) any {
	var cur any = m
	for _, p := range strings.Split(path, "/") {
		mm, ok := cur.(Doc)
		if !ok {
			return nil
		}
		cur = mm[p]
	}
	return cur
}

func setPath(m Doc, path string, v any) {
	parts := strings.Split(path, "/")
	cur := m
	for _, p := range parts[:len(parts)-1] {
		next, ok := cur[p].(Doc)
		if !ok {
			next = Doc{}
			cur[p] = next
		}
		cur = next
	}
	cur[parts[len(parts)-1]] = v
}

func clone(v any) any {
	switch x := v.(type) {
	case Doc:
		out := Doc{}
		for k, c := range x {
			out[k] = clone(c)
		}
		return out
	case []any:
		out := make([]any, len(x))
		for i, c := range x {
			out[i] = clone(c)
		}
		return out
	default:
		return v
	}
}

func cloneDoc(d Doc) Doc {
	if d == nil {
		return nil
	}
	return clone(d).(Doc)
}

func eq(a, b any) bool { return reflect.DeepEqual(a, b) }

func asDoc(v any) Doc {
	d, _ := v.(Doc)
	return d
}

func asList(v any) []any {
	l, _ := v.([]any)
	return l
}

func str(v any) string {
	s, _ := v.(string)
	return s
}

func num(v any) float64 {
	f, _ := v.(float64)
	return f
}

type scalar struct{ local, remote string }

var adversaryScalars = []scalar{
	{"name", "title"}, {"tier", "tier"}, {"kind", "type"}, {"source", "source_key"}, {"difficulty", "difficulty"},
	{"hp", "max_hp"}, {"stress", "max_stress"}, {"threshold_major", "thresholds/major"},
	{"threshold_severe", "thresholds/severe"}, {"attack_modifier", "attack_modifier"},
	{"attack_name", "standard_attack/name"}, {"attack_range", "standard_attack/range"},
	{"damage_dice", "standard_attack/damage_dice"}, {"damage_bonus", "standard_attack/damage_bonus"},
	{"damage_type", "standard_attack/damage_type"}, {"motives", "motives_tactics"}, {"description", "description"},
}

var environmentScalars = []scalar{
	{"name", "title"}, {"tier", "tier"}, {"kind", "type"}, {"source", "source_key"}, {"difficulty", "difficulty"},
	{"impulses", "impulses"}, {"potential_adversaries", "potential_adversaries"}, {"description", "description"},
}

// ---------------------------------------------------------------------------------------------------------------
// adversary

// AdversaryToLocal projects homebrew `adversaries` data (and the desktop-only extension) to the desktop shape.
func AdversaryToLocal(data, ext Doc, c Converter) Doc {
	out := Doc{}
	for _, s := range adversaryScalars {
		out[s.local] = clone(getPath(data, s.remote))
	}
	names, mods := asList(data["experiences"]), asList(data["experience_modifiers"])
	exps := []any{}
	for i, n := range names {
		m := any(float64(0))
		if i < len(mods) {
			m = mods[i]
		}
		exps = append(exps, Doc{"name": n, "modifier": m})
	}
	out["experiences"] = exps
	questions := featureQuestions(ext)
	feats := []any{}
	for _, f := range asList(data["features"]) {
		fd := asDoc(f)
		q, ok := questions[str(fd["name"])]
		if !ok {
			q = ""
		}
		feats = append(feats, Doc{
			"name": fd["name"], "kind": strings.ToLower(str(fd["type"])), "max_uses": fd["max_uses"],
			"text": c.HTMLToText(str(fd["description_html"])), "questions": q,
		})
	}
	out["features"] = feats
	return out
}

func featureQuestions(ext Doc) map[string]any {
	out := map[string]any{}
	for _, q := range asList(getPath(ext, "daggerdash/feature_questions")) {
		qd := asDoc(q)
		out[str(qd["name"])] = qd["questions"]
	}
	if len(out) == 0 {
		return map[string]any{}
	}
	return out
}

func defaultAdversary() Doc {
	return Doc{
		"source_key": "Homebrew", "title": "", "tier": 1.0, "type": "Standard", "image_url": "", "artist_name": "",
		"description": "", "motives_tactics": "", "difficulty": 0.0, "thresholds": Doc{"major": 0.0, "severe": 0.0},
		"max_hp": 0.0, "max_stress": 0.0, "attack_modifier": 0.0,
		"standard_attack": Doc{"name": "", "range": "Melee", "damage_dice": "", "damage_bonus": 0.0, "damage_type": "phy"},
		"experiences":     []any{}, "experience_modifiers": []any{}, "features": []any{},
	}
}

// AdversaryApplyLocal returns the data (and extension) to write after the desktop changed `local`. base may be
// nil for an adversary the desktop created. changed reports whether anything differs.
func AdversaryApplyLocal(base, baseExt, local Doc, c Converter) (data, ext Doc, changed bool) {
	if base == nil {
		base = defaultAdversary()
	}
	proj := AdversaryToLocal(base, baseExt, c)
	data, ext = cloneDoc(base), cloneDoc(baseExt)
	for _, s := range adversaryScalars {
		if v, ok := local[s.local]; ok && !eq(v, proj[s.local]) {
			setPath(data, s.remote, v)
		}
	}
	if v, ok := local["experiences"]; ok && !eq(v, proj["experiences"]) {
		names, mods := []any{}, []any{}
		for _, e := range asList(v) {
			ed := asDoc(e)
			names, mods = append(names, ed["name"]), append(mods, ed["modifier"])
		}
		data["experiences"], data["experience_modifiers"] = names, mods
	}
	if v, ok := local["features"]; ok && !eq(v, proj["features"]) {
		baseFeatures := asList(base["features"])
		used := map[int]bool{}
		var feats []any
		var questions []any
		for _, lf := range asList(v) {
			ld := asDoc(lf)
			var bf Doc
			for j, b := range baseFeatures { // match by name, first unused
				if !used[j] && str(asDoc(b)["name"]) == str(ld["name"]) {
					used[j], bf = true, cloneDoc(asDoc(b))
					break
				}
			}
			if bf == nil {
				bf = Doc{"type": "Passive", "name": ld["name"], "max_uses": nil, "description_html": ""}
			}
			bf["type"] = capitalize(str(ld["kind"]))
			bf["max_uses"] = ld["max_uses"]
			if baseText := c.HTMLToText(str(bf["description_html"])); str(ld["text"]) != baseText {
				bf["description_html"] = c.TextToHTML(str(ld["text"]))
			}
			feats = append(feats, bf)
			if q := str(ld["questions"]); q != "" {
				questions = append(questions, Doc{"name": ld["name"], "questions": q})
			}
		}
		data["features"] = feats
		if !eq(questions, asList(getPath(baseExt, "daggerdash/feature_questions"))) && (len(questions) > 0 || len(asList(getPath(baseExt, "daggerdash/feature_questions"))) > 0) {
			ext = ensureDD(ext)
			asDoc(ext["daggerdash"])["feature_questions"] = questions
		}
	}
	changed = !eq(data, base) || !eq(ext, baseExt)
	return
}

func ensureDD(ext Doc) Doc {
	if ext == nil {
		ext = Doc{}
	}
	if _, ok := ext["daggerdash"].(Doc); !ok {
		ext["daggerdash"] = Doc{}
	}
	return ext
}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

// ---------------------------------------------------------------------------------------------------------------
// environment

func EnvironmentToLocal(data Doc, c Converter) Doc {
	out := Doc{}
	for _, s := range environmentScalars {
		out[s.local] = clone(getPath(data, s.remote))
	}
	feats := []any{}
	for _, f := range asList(data["features"]) {
		fd := asDoc(f)
		feats = append(feats, Doc{"name": fd["name"], "kind": strings.ToLower(str(fd["type"])),
			"text": c.HTMLToText(str(fd["description_html"])), "questions": fd["questions"]})
	}
	out["features"] = feats
	return out
}

func defaultEnvironment() Doc {
	return Doc{
		"source_key": "Homebrew", "title": "", "description": "", "tier": 1.0, "image_url": "", "artist_name": "",
		"type": "Exploration", "impulses": "", "difficulty": 0.0, "potential_adversaries": "",
		"potential_adversaries_ids": []any{}, "features": []any{},
	}
}

func EnvironmentApplyLocal(base, local Doc, c Converter) (Doc, bool) {
	if base == nil {
		base = defaultEnvironment()
	}
	proj := EnvironmentToLocal(base, c)
	data := cloneDoc(base)
	for _, s := range environmentScalars {
		if v, ok := local[s.local]; ok && !eq(v, proj[s.local]) {
			setPath(data, s.remote, v)
		}
	}
	if v, ok := local["features"]; ok && !eq(v, proj["features"]) {
		baseFeatures := asList(base["features"])
		used := map[int]bool{}
		var feats []any
		for _, lf := range asList(v) {
			ld := asDoc(lf)
			var bf Doc
			for j, b := range baseFeatures {
				if !used[j] && str(asDoc(b)["name"]) == str(ld["name"]) {
					used[j], bf = true, cloneDoc(asDoc(b))
					break
				}
			}
			if bf == nil {
				bf = Doc{"type": "Passive", "name": ld["name"], "description_html": "", "questions": ""}
			}
			bf["type"] = capitalize(str(ld["kind"]))
			bf["questions"] = ld["questions"]
			if str(ld["text"]) != c.HTMLToText(str(bf["description_html"])) {
				bf["description_html"] = c.TextToHTML(str(ld["text"]))
			}
			feats = append(feats, bf)
		}
		data["features"] = feats
	}
	return data, !eq(data, base)
}

// ---------------------------------------------------------------------------------------------------------------
// opaque and read-only resources

// ErrReadonly is returned for any write to a resource the envelope marks `readonly` (official content, and
// homebrew owned by another user).
var ErrReadonly = fmt.Errorf("resource is read-only")

// GuardWritable must be called before building a write from a cached envelope.
func GuardWritable(env Doc) error {
	if b, _ := env["readonly"].(bool); b {
		return ErrReadonly
	}
	return nil
}

// OpaqueToLocal is all the desktop sees of homebrew types it does not model (classes, domain cards, ...): enough
// to list the item. The cached envelope is kept verbatim and never rewritten, so the item survives round trips.
func OpaqueToLocal(env Doc) Doc {
	return Doc{"opaque": true, "type": env["type"], "title": getPath(env, "data/title"), "readonly": env["readonly"]}
}

// ---------------------------------------------------------------------------------------------------------------
// countdown

// CountdownToLocal: Daggerdash `start` is the reset baseline (`reset_to`); `floor` has no desktop field and is kept
// in the cached envelope. With no recorded baseline the desktop derives one and remembers that it did.
func CountdownToLocal(data Doc) Doc {
	start := data["reset_to"]
	if start == nil {
		start = maxf(1, num(data["floor"]), num(data["current"]))
	}
	return Doc{"name": data["name"], "start": start, "current": data["current"]}
}

// ErrStartBelowFloor is returned when a desktop reset baseline would fall under the server's floor.
var ErrStartBelowFloor = fmt.Errorf("countdown start is below the floor")

func CountdownApplyLocal(base, local Doc) (Doc, bool, error) {
	proj := CountdownToLocal(base)
	data := cloneDoc(base)
	if v, ok := local["name"]; ok && !eq(v, proj["name"]) {
		data["name"] = v
	}
	if v, ok := local["current"]; ok && !eq(v, proj["current"]) {
		data["current"] = v
	}
	if v, ok := local["start"]; ok && !eq(v, proj["start"]) {
		if num(v) < num(base["floor"]) {
			return nil, false, ErrStartBelowFloor
		}
		data["reset_to"] = v
	}
	return data, !eq(data, base), nil
}

func maxf(vals ...float64) float64 {
	m := vals[0]
	for _, v := range vals[1:] {
		if v > m {
			m = v
		}
	}
	return m
}

// ---------------------------------------------------------------------------------------------------------------
// campaign (settings + fear + public/private notes are four server resources for one desktop campaign)

// CampaignBundle holds the four resource data documents; any role may be nil (not synced yet).
type CampaignBundle struct{ Campaign, Fear, PublicNotes, PrivateNotes Doc }

// CampaignToLocal: the desktop's single `description` maps to private notes, never to public ones, so nothing a
// GM wrote for themselves becomes player-visible by syncing.
func CampaignToLocal(b CampaignBundle) Doc {
	out := Doc{"name": b.Campaign["name"], "description": "", "public_notes": "", "fear": float64(0)}
	if b.PrivateNotes != nil {
		out["description"] = b.PrivateNotes["markdown"]
	}
	if b.PublicNotes != nil {
		out["public_notes"] = b.PublicNotes["markdown"]
	}
	if b.Fear != nil {
		out["fear"] = b.Fear["value"]
	}
	return out
}

func CampaignApplyLocal(b CampaignBundle, local Doc) Writes {
	proj := CampaignToLocal(b)
	w := Writes{}
	patch := func(role string, base Doc, key string, v any) {
		d := cloneDoc(base)
		if d == nil {
			d = Doc{}
		}
		d[key] = v
		w[role] = Write{Data: d}
	}
	if v, ok := local["name"]; ok && !eq(v, proj["name"]) {
		patch("campaign", b.Campaign, "name", v)
	}
	if v, ok := local["description"]; ok && !eq(v, proj["description"]) {
		patch("private_notes", b.PrivateNotes, "markdown", v)
	}
	if v, ok := local["public_notes"]; ok && !eq(v, proj["public_notes"]) {
		patch("public_notes", b.PublicNotes, "markdown", v)
	}
	if v, ok := local["fear"]; ok && !eq(v, proj["fear"]) {
		patch("fear", b.Fear, "value", v)
	}
	return w
}

// ---------------------------------------------------------------------------------------------------------------
// conditions

// ConditionsToLocal lists the names of enabled conditions in order; disabled ones have no desktop representation.
func ConditionsToLocal(conditions []any) []any {
	out := []any{}
	for _, c := range conditions {
		cd := asDoc(c)
		if b, _ := cd["enabled"].(bool); b {
			out = append(out, cd["name"])
		}
	}
	return out
}

// ConditionsApplyLocal toggles instead of deleting, like the web app: a condition the desktop cleared stays as
// {enabled:false}, and a name the desktop added is appended as {enabled:true}. Custom names are preserved.
func ConditionsApplyLocal(base []any, local []any) []any {
	want := map[string]bool{}
	for _, n := range local {
		want[str(n)] = true
	}
	out := []any{}
	seen := map[string]bool{}
	for _, c := range base {
		cd := cloneDoc(asDoc(c))
		cd["enabled"] = want[str(cd["name"])]
		seen[str(cd["name"])] = true
		out = append(out, cd)
	}
	for _, n := range local {
		if !seen[str(n)] {
			out = append(out, Doc{"name": n, "enabled": true})
			seen[str(n)] = true
		}
	}
	return out
}

func instanceHasState(d Doc) bool {
	return str(d["name"]) != "" || num(d["marked_hp"]) > 0 || num(d["marked_stress"]) > 0 ||
		len(ConditionsToLocal(asList(d["conditions"]))) > 0
}

// ---------------------------------------------------------------------------------------------------------------
// encounter

// EncounterBundle: the structure plus the live state of each instance keyed by instance_id.
type EncounterBundle struct {
	Encounter Doc
	Instances map[string]Doc
}

// RefKey is the opaque string the desktop stores for a catalog reference; its mapping layer resolves it to a local
// adversary or environment row (and the reverse).
func RefKey(ref Doc) string {
	if str(ref["origin"]) == "homebrew" {
		return "homebrew:" + str(ref["homebrew_id"])
	}
	return fmt.Sprintf("official:%s/%s/%s", str(ref["source_key"]), str(ref["item_type"]), str(ref["item_id"]))
}

func refFromKey(key string, legacy any, base Doc) Doc {
	if strings.HasPrefix(key, "homebrew:") {
		r := Doc{"origin": "homebrew", "homebrew_id": strings.TrimPrefix(key, "homebrew:")}
		if legacy != nil {
			r["legacy_id"] = legacy
		}
		return r
	}
	parts := strings.SplitN(strings.TrimPrefix(key, "official:"), "/", 3)
	r := Doc{"origin": "official", "source_key": parts[0], "item_type": parts[1], "item_id": parts[2]}
	if base != nil && str(base["origin"]) == "official" && RefKey(base) == key {
		return cloneDoc(base) // keeps the pinned item_version and legacy_id
	}
	return r
}

func EncounterToLocal(b EncounterBundle, c Converter) Doc {
	d := b.Encounter
	out := Doc{
		"name": d["name"], "notes": c.HTMLToText(str(d["description_html"])), "massive_damage": d["enable_massive_damage"],
		"battle_points": Doc{"tier": d["encounter_tier"], "players": d["number_of_players"], "bonus_damage": d["bonus_damage"], "extra": d["extra_battle_points"]},
	}
	advs, envs := []any{}, []any{}
	for _, it := range asList(d["items"]) {
		item := asDoc(it)
		if str(item["type"]) == "environment" {
			e := Doc{"item": item["item_id"], "environment": RefKey(asDoc(item["ref"]))}
			if ed := asDoc(item["edited_environment"]); ed != nil {
				e["edit"] = EnvironmentToLocal(ed, c)
			}
			envs = append(envs, e)
			continue
		}
		insts := asList(item["instances"])
		a := Doc{"item": item["item_id"], "adversary": RefKey(asDoc(item["ref"])), "quantity": float64(len(insts))}
		if ed := asDoc(item["edited_adversary"]); ed != nil {
			a["edit"] = AdversaryToLocal(ed, nil, c)
		}
		sparse := []any{}
		for i, in := range insts {
			st := b.Instances[str(asDoc(in)["instance_id"])]
			if st == nil || !instanceHasState(st) {
				continue
			}
			sparse = append(sparse, Doc{"instance": float64(i), "name": st["name"], "hp_marked": st["marked_hp"],
				"stress_marked": st["marked_stress"], "conditions": ConditionsToLocal(asList(st["conditions"]))})
		}
		a["instances"] = sparse
		advs = append(advs, a)
	}
	out["adversaries"], out["environments"] = advs, envs
	return out
}

// EncounterApplyLocal builds the writes for an edited desktop encounter. Existing items are matched by `item`
// (the remote item_id the desktop cached); items without one are new. The type pattern of the existing `items`
// array (for example adversary, environment, adversary, environment) is kept as a template that the desktop's two
// per-type lists fill in order, so interleaving survives edits; surplus new items append at the end.
func EncounterApplyLocal(b EncounterBundle, local Doc, o Options) (Writes, error) {
	c := o.Conv
	proj := EncounterToLocal(b, c)
	base := b.Encounter
	data := cloneDoc(base)
	w := Writes{}

	if v, ok := local["name"]; ok && !eq(v, proj["name"]) {
		data["name"] = v
	}
	if v, ok := local["notes"]; ok && !eq(v, proj["notes"]) {
		data["description_html"] = c.TextToHTML(str(v))
	}
	if v, ok := local["massive_damage"]; ok && !eq(v, proj["massive_damage"]) {
		data["enable_massive_damage"] = v
	}
	if lbp := asDoc(local["battle_points"]); lbp != nil {
		pbp := asDoc(proj["battle_points"])
		for lk, rk := range map[string]string{"tier": "encounter_tier", "players": "number_of_players", "bonus_damage": "bonus_damage", "extra": "extra_battle_points"} {
			if v, ok := lbp[lk]; ok && !eq(v, pbp[lk]) {
				data[rk] = v
			}
		}
	}

	baseItems := map[string]Doc{}
	for _, it := range asList(base["items"]) {
		baseItems[str(asDoc(it)["item_id"])] = asDoc(it)
	}
	var newAdv, newEnv []Doc
	newState := map[string]Doc{} // desired live state of existing instances by instance_id
	type pending struct {
		item     Doc
		instance int
		data     Doc
	}
	var created []pending // desired live state of instances the server has not assigned ids to yet

	for _, la := range asList(local["adversaries"]) {
		ld := asDoc(la)
		var item Doc
		if bi := baseItems[str(ld["item"])]; bi != nil && str(bi["type"]) == "adversary" {
			item = cloneDoc(bi)
			if key := str(ld["adversary"]); key != RefKey(asDoc(bi["ref"])) {
				item["ref"] = refFromKey(key, nil, nil)
			}
		} else {
			item = Doc{"type": "adversary", "ref": refFromKey(str(ld["adversary"]), nil, nil), "instances": []any{}}
		}
		if edit, ok := ld["edit"]; ok {
			var baseEdited Doc
			if v := asDoc(item["edited_adversary"]); v != nil {
				baseEdited = v
			}
			ed, _, _ := AdversaryApplyLocal(baseEdited, nil, asDoc(edit), c)
			item["edited_adversary"] = ed
		} else {
			delete(item, "edited_adversary")
		}
		// quantity: shrink from the end, grow with fresh instance ids
		insts := asList(item["instances"])
		want := int(num(ld["quantity"]))
		for len(insts) > want {
			insts = insts[:len(insts)-1]
		}
		for len(insts) < want {
			insts = append(insts, Doc{})
		}
		item["instances"] = insts
		sparse := map[int]Doc{}
		for _, s := range asList(ld["instances"]) {
			sd := asDoc(s)
			sparse[int(num(sd["instance"]))] = sd
		}
		for i, in := range insts {
			id := str(asDoc(in)["instance_id"])
			baseState := b.Instances[id]
			var baseConds []any
			if baseState != nil {
				baseConds = asList(baseState["conditions"])
			}
			want := Doc{"name": "", "marked_hp": 0.0, "marked_stress": 0.0, "conditions": ConditionsApplyLocal(baseConds, nil)}
			if sd, ok := sparse[i]; ok {
				want = Doc{"name": sd["name"], "marked_hp": sd["hp_marked"], "marked_stress": sd["stress_marked"],
					"conditions": ConditionsApplyLocal(baseConds, asList(sd["conditions"]))}
			}
			if id == "" {
				if instanceHasState(want) {
					created = append(created, pending{item: item, instance: i, data: want})
				}
				continue
			}
			newState[id] = want
		}
		newAdv = append(newAdv, item)
	}
	for _, le := range asList(local["environments"]) {
		ld := asDoc(le)
		var item Doc
		if bi := baseItems[str(ld["item"])]; bi != nil && str(bi["type"]) == "environment" {
			item = cloneDoc(bi)
			if key := str(ld["environment"]); key != RefKey(asDoc(bi["ref"])) {
				item["ref"] = refFromKey(key, nil, nil)
			}
		} else {
			item = Doc{"type": "environment", "ref": refFromKey(str(ld["environment"]), nil, nil)}
		}
		if edit, ok := ld["edit"]; ok {
			baseEdited := asDoc(item["edited_environment"])
			ed, _ := EnvironmentApplyLocal(baseEdited, asDoc(edit), c)
			item["edited_environment"] = ed
		} else {
			delete(item, "edited_environment")
		}
		newEnv = append(newEnv, item)
	}

	// Refill the type template.
	var items []any
	ai, ei := 0, 0
	for _, it := range asList(base["items"]) {
		if str(asDoc(it)["type"]) == "environment" {
			if ei < len(newEnv) {
				items, ei = append(items, newEnv[ei]), ei+1
			}
		} else if ai < len(newAdv) {
			items, ai = append(items, newAdv[ai]), ai+1
		}
	}
	for ; ai < len(newAdv); ai++ {
		items = append(items, newAdv[ai])
	}
	for ; ei < len(newEnv); ei++ {
		items = append(items, newEnv[ei])
	}
	if items == nil {
		items = []any{}
	}
	data["items"] = items

	// Item or instance changes are real changes; a template refill of identical items is not.
	var states []NewInstanceState
	for _, c := range created {
		for idx, it := range items {
			if reflect.ValueOf(asDoc(it)).Pointer() == reflect.ValueOf(c.item).Pointer() {
				states = append(states, NewInstanceState{ItemIndex: idx, InstanceIndex: c.instance, Data: c.data})
			}
		}
	}
	if !eq(data, base) || len(states) > 0 {
		w["encounter"] = Write{Data: data, NewInstanceState: states}
	}
	for id, st := range newState {
		baseState := b.Instances[id]
		if baseState == nil {
			continue
		}
		merged := cloneDoc(baseState)
		for k, v := range st {
			merged[k] = v
		}
		if !eq(merged, baseState) {
			w["instance:"+id] = Write{Data: merged}
		}
	}
	return w, nil
}

// ---------------------------------------------------------------------------------------------------------------
// reference converter

// SimpleConverter is the reference HTML ⇄ text converter used by the fixtures. Dialect: paragraphs separated by a
// blank line, **bold**, _italic_, "- " lists, a hard line break as "\n". Anything else (for example <u>, <a>) stays
// as raw inline HTML in the text so that it comes back untouched.
type SimpleConverter struct{}

var tokenRE = regexp.MustCompile(`<[^>]+>|[^<]+`)

func (SimpleConverter) HTMLToText(h string) string {
	var out strings.Builder
	blocks, items := 0, 0
	for _, tok := range tokenRE.FindAllString(h, -1) {
		switch strings.ToLower(tok) {
		case "<p>", "<ul>":
			if blocks > 0 {
				out.WriteString("\n\n")
			}
			blocks++
			items = 0
		case "</p>", "</ul>", "</li>":
		case "<strong>", "</strong>":
			out.WriteString("**")
		case "<em>", "</em>":
			out.WriteString("_")
		case "<br>", "<br/>", "<br />":
			out.WriteString("\n")
		case "<li>":
			if items > 0 {
				out.WriteString("\n")
			}
			out.WriteString("- ")
			items++
		default:
			if strings.HasPrefix(tok, "<") {
				out.WriteString(tok) // raw inline HTML that Markdown cannot express
			} else {
				out.WriteString(html.UnescapeString(tok))
			}
		}
	}
	return out.String()
}

var (
	rawTagRE = regexp.MustCompile(`^</?(u|s|sub|sup|code|kbd|a( [^>]*)?)>`)
	boldRE   = regexp.MustCompile(`\*\*(.+?)\*\*`)
	italicRE = regexp.MustCompile(`(^|[^\w])_(.+?)_([^\w]|$)`)
)

func inlineHTML(s string) string {
	var out strings.Builder
	for i := 0; i < len(s); {
		if s[i] == '<' {
			if m := rawTagRE.FindString(s[i:]); m != "" {
				out.WriteString(m)
				i += len(m)
				continue
			}
		}
		switch s[i] {
		case '<':
			out.WriteString("&lt;")
		case '>':
			out.WriteString("&gt;")
		case '&':
			out.WriteString("&amp;")
		default:
			out.WriteByte(s[i])
		}
		i++
	}
	r := out.String()
	r = boldRE.ReplaceAllString(r, "<strong>$1</strong>")
	r = italicRE.ReplaceAllString(r, "$1<em>$2</em>$3")
	return strings.ReplaceAll(r, "\n", "<br>")
}

func (SimpleConverter) TextToHTML(t string) string {
	if strings.TrimSpace(t) == "" {
		return ""
	}
	var out strings.Builder
	for _, block := range strings.Split(strings.TrimSpace(t), "\n\n") {
		lines := strings.Split(block, "\n")
		if strings.HasPrefix(lines[0], "- ") {
			out.WriteString("<ul>")
			for _, l := range lines {
				out.WriteString("<li>" + inlineHTML(strings.TrimPrefix(l, "- ")) + "</li>")
			}
			out.WriteString("</ul>")
			continue
		}
		out.WriteString("<p>" + inlineHTML(block) + "</p>")
	}
	return out.String()
}
