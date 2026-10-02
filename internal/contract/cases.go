package contract

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

// Case is one fixture file: an ordered conversation against one resource kind.
type Case struct {
	Name  string `json:"name"`
	Kind  string `json:"kind"`           // a ResourceKind, or "workspace" / "sync" for non-resource cases
	Type  string `json:"type,omitempty"` // homebrew type for kind=homebrew
	Steps []Step `json:"steps"`
	File  string `json:"-"`
}

// Step is one request/response pair.
type Step struct {
	Label      string `json:"label"`
	Class      string `json:"class"` // ok | invalid | stale | delete | retry | conflict | forbidden | gone | rejected
	Operation  string `json:"operation,omitempty"`
	Replays    *int   `json:"replays,omitempty"`    // retry: index of the step this repeats
	Validation string `json:"validation,omitempty"` // invalid: "schema" or "server_rule"
	Raw        *struct {
		Method string `json:"method"`
		Path   string `json:"path"`
	} `json:"raw,omitempty"` // for requests that match no declared operation (for example writes to the catalog)
	Request struct {
		Path    map[string]string `json:"path,omitempty"`
		Query   map[string]any    `json:"query,omitempty"`
		Headers map[string]string `json:"headers,omitempty"`
		Body    json.RawMessage   `json:"body,omitempty"`
	} `json:"request"`
	Response struct {
		Status  int               `json:"status"`
		Headers map[string]string `json:"headers,omitempty"`
		Body    json.RawMessage   `json:"body,omitempty"`
	} `json:"response"`
}

// LoadCases reads every *.json file under dir/fixtures/cases.
func LoadCases(dir string) ([]Case, error) {
	var cases []Case
	err := filepath.Walk(filepath.Join(dir, "fixtures", "cases"), func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".json") {
			return err
		}
		raw, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		var c Case
		if err := json.Unmarshal(raw, &c); err != nil {
			return fmt.Errorf("%s: %w", path, err)
		}
		c.File = path
		cases = append(cases, c)
		return nil
	})
	sort.Slice(cases, func(i, j int) bool { return cases[i].File < cases[j].File })
	return cases, err
}

var etagPattern = regexp.MustCompile(`^"([0-9]+)"$`)

// CheckCase validates every step of a case and the cross-step rules for its classes.
func CheckCase(s *Spec, ops map[string]Operation, c Case) []error {
	var errs []error
	fail := func(i int, format string, args ...any) {
		label := ""
		if i >= 0 && i < len(c.Steps) {
			label = c.Steps[i].Label
		}
		errs = append(errs, fmt.Errorf("%s step %d (%s): %s", filepath.Base(c.File), i, label, fmt.Sprintf(format, args...)))
	}
	for i, st := range c.Steps {
		if st.Raw != nil {
			checkRaw(st, func(f string, a ...any) { fail(i, f, a...) })
			continue
		}
		op, ok := ops[st.Operation]
		if !ok {
			fail(i, "unknown operation %q", st.Operation)
			continue
		}
		checkStep(s, op, st, func(f string, a ...any) { fail(i, f, a...) })
		checkClass(s, c, i, st, func(f string, a ...any) { fail(i, f, a...) })
	}
	return errs
}

func checkRaw(st Step, fail func(string, ...any)) {
	// The only undeclared requests are writes to read-only catalog paths, which must answer 405 official_immutable.
	if !strings.HasPrefix(st.Raw.Path, "/catalog/") || st.Raw.Method == "GET" {
		fail("raw steps are only for non-GET requests under /catalog/")
	}
	body, err := Decode(st.Response.Body)
	if st.Response.Status != 405 || err != nil {
		fail("catalog writes must answer 405 with a problem body")
		return
	}
	if m, _ := body.(map[string]any); m == nil || m["code"] != "official_immutable" {
		fail("catalog writes must answer code official_immutable")
	}
}

func checkStep(s *Spec, op Operation, st Step, fail func(string, ...any)) {
	// Path parameters.
	pathParams, err := s.Params(op, "path")
	if err != nil {
		fail("%v", err)
		return
	}
	for name, p := range pathParams {
		val, ok := st.Request.Path[name]
		if !ok {
			fail("missing path parameter %s", name)
			continue
		}
		validateScalar(s, p, val, fail, "path "+name)
	}
	for name := range st.Request.Path {
		if _, ok := pathParams[name]; !ok {
			fail("undeclared path parameter %s", name)
		}
	}

	// Query parameters: declared names only, required ones present.
	queryParams, _ := s.Params(op, "query")
	for name := range st.Request.Query {
		if _, ok := queryParams[name]; !ok {
			fail("undeclared query parameter %s", name)
		}
	}
	for name, p := range queryParams {
		if req, _ := p["required"].(bool); req {
			if _, ok := st.Request.Query[name]; !ok {
				fail("missing required query parameter %s", name)
			}
		}
	}

	// Headers: required ones present (If-Match is deliberately absent in 428 cases), values match their schema.
	headerParams, _ := s.Params(op, "header")
	for name, p := range headerParams {
		val, present := st.Request.Headers[name]
		if req, _ := p["required"].(bool); req && !present {
			if !(name == "If-Match" && st.Response.Status == 428) {
				fail("missing required header %s", name)
			}
		}
		if present {
			validateScalar(s, p, val, fail, "header "+name)
		}
	}
	if st.Response.Status == 428 {
		if _, has := st.Request.Headers["If-Match"]; has {
			fail("428 steps must omit If-Match")
		}
	}

	// Request body.
	reqSchema, err := s.RequestSchema(op)
	if err != nil {
		fail("%v", err)
		return
	}
	var reqFailures []string
	if reqSchema != nil {
		if len(st.Request.Body) == 0 {
			fail("operation requires a JSON request body")
		} else {
			body, derr := Decode(st.Request.Body)
			if derr != nil {
				fail("request body is not JSON: %v", derr)
			} else if verr := reqSchema.Validate(body); verr != nil {
				reqFailures = locations(verr)
			}
		}
	} else if len(st.Request.Body) != 0 {
		if _, hasBinary := op.Op["requestBody"]; !hasBinary {
			fail("operation has no request body")
		}
	}
	switch {
	case st.Class == "invalid" && st.Validation == "schema":
		if len(reqFailures) == 0 && reqSchema != nil {
			fail("class invalid/schema but the request body validates")
		}
		for _, p := range fieldErrorPointers(st.Response.Body) {
			if !anyRelated(p, reqFailures) {
				fail("field error pointer %q matches no schema failure %v", p, reqFailures)
			}
		}
	case st.Class == "invalid" && st.Validation == "server_rule":
		if len(reqFailures) != 0 {
			fail("class invalid/server_rule must pass the schema, but fails at %v", reqFailures)
		}
	case st.Class == "invalid":
		fail("invalid steps must set validation to schema or server_rule")
	default:
		if len(reqFailures) != 0 {
			fail("request body does not satisfy the schema at %v", reqFailures)
		}
	}

	// Response.
	rs, err := s.Response(op, st.Response.Status)
	if err != nil {
		fail("%v", err)
		return
	}
	if rs.Schema != nil {
		if len(st.Response.Body) == 0 {
			fail("response requires a body")
		} else if body, derr := Decode(st.Response.Body); derr != nil {
			fail("response body is not JSON: %v", derr)
		} else if verr := rs.Schema.Validate(body); verr != nil {
			fail("response body does not satisfy the schema at %v", locations(verr))
		}
	}
	for name := range rs.Required {
		if name != "ETag" && st.Response.Headers[name] == "" {
			fail("response must carry the required header %s", name)
		}
	}
	// A declared ETag must be present and equal the body revision.
	if rs.Headers["ETag"] {
		etag := st.Response.Headers["ETag"]
		m := etagPattern.FindStringSubmatch(etag)
		if m == nil {
			fail("response must carry a quoted ETag, got %q", etag)
		} else if rev, ok := bodyRevision(st.Response.Body); ok && strconv.FormatInt(rev, 10) != m[1] {
			fail("ETag %s does not match body revision %d", etag, rev)
		}
	}
	// Errors must be consistent problems.
	if st.Response.Status >= 400 {
		if body, _ := Decode(st.Response.Body); body != nil {
			if m, _ := body.(map[string]any); m != nil {
				if n, _ := m["status"].(json.Number); n.String() != strconv.Itoa(st.Response.Status) {
					fail("problem status %v does not match HTTP status %d", m["status"], st.Response.Status)
				}
			}
		}
	}
}

func checkClass(s *Spec, c Case, i int, st Step, fail func(string, ...any)) {
	body := mapBody(st.Response.Body)
	switch st.Class {
	case "ok", "invalid", "forbidden", "gone", "conflict", "stale", "delete", "retry", "rejected":
	default:
		fail("unknown class %q", st.Class)
		return
	}
	switch st.Class {
	case "invalid":
		if code, _ := body["code"].(string); code != "validation_failed" && code != "payload_too_large" && code != "unsupported_media_type" {
			fail("invalid steps answer validation_failed, payload_too_large or unsupported_media_type, got %v", body["code"])
		}
	case "forbidden":
		if st.Response.Status != 403 {
			fail("forbidden steps answer 403")
		}
	case "gone":
		if st.Response.Status != 410 || body["code"] != "cursor_expired" {
			fail("gone steps answer 410 cursor_expired")
		}
	case "stale":
		current := mapAny(body["current"])
		code, _ := body["code"].(string)
		switch {
		case st.Response.Status == 412 && code == "stale_revision":
		case st.Response.Status == 409 && code == "conflict" && body["conflict_id"] != nil:
		default:
			fail("stale steps answer 412 stale_revision, or 409 conflict with a conflict_id")
		}
		if current == nil {
			fail("stale responses carry the server version in `current`")
			return
		}
		curRev, _ := current["revision"].(json.Number)
		current_, _ := curRev.Int64()
		based, ok := basedOnRevision(st)
		if !ok || based >= current_ {
			fail("a stale step must be based on a revision older than current.revision (%s)", curRev)
		}
		if _, ok := current["data"]; !ok {
			fail("current must be a full resource or tombstone")
		}
		if sc, err := s.Component("AnyResource"); err == nil {
			if verr := sc.Validate(decodeMust(st.Response.Body)["current"]); verr != nil {
				fail("current does not satisfy AnyResource at %v", locations(verr))
			}
		}
	case "delete":
		if st.Response.Status != 200 || body["deleted_at"] == nil || body["data"] != nil {
			fail("delete steps answer 200 with a tombstone")
		}
		// The first delete moves the revision by exactly one; a repeat returns the same tombstone.
		if st.Request.Headers["If-Match"] != "" {
			m := etagPattern.FindStringSubmatch(st.Request.Headers["If-Match"])
			rev, _ := body["revision"].(json.Number)
			if prev := previousDelete(c, i); prev == nil {
				if m != nil {
					n, _ := strconv.ParseInt(m[1], 10, 64)
					if r, _ := rev.Int64(); r != n+1 {
						fail("first delete must bump revision from %d to %d, got %s", n, n+1, rev)
					}
				}
			} else if string(canonical(prev.Response.Body)) != string(canonical(st.Response.Body)) {
				fail("repeating a delete must return the identical tombstone")
			}
		}
	case "retry":
		if st.Replays == nil || *st.Replays < 0 || *st.Replays >= i {
			fail("retry steps must name an earlier step in `replays`")
			return
		}
		orig := c.Steps[*st.Replays]
		if orig.Operation != st.Operation ||
			orig.Request.Headers["Idempotency-Key"] != st.Request.Headers["Idempotency-Key"] ||
			st.Request.Headers["Idempotency-Key"] == "" ||
			string(canonical(orig.Request.Body)) != string(canonical(st.Request.Body)) {
			fail("a retry repeats the same operation, Idempotency-Key and body")
		}
		if string(canonical(orig.Response.Body)) != string(canonical(st.Response.Body)) {
			fail("a replay returns the original response body")
		}
		if st.Response.Headers["Idempotent-Replay"] != "true" {
			fail("a replay is marked Idempotent-Replay: true")
		}
	}
}

// basedOnRevision is the revision a mutation claims to start from: If-Match, or expected_target_revision for
// conflict resolutions.
func basedOnRevision(st Step) (int64, bool) {
	if m := etagPattern.FindStringSubmatch(st.Request.Headers["If-Match"]); m != nil {
		n, _ := strconv.ParseInt(m[1], 10, 64)
		return n, true
	}
	if n, ok := mapBody(st.Request.Body)["expected_target_revision"].(json.Number); ok {
		v, _ := n.Int64()
		return v, true
	}
	return 0, false
}

func previousDelete(c Case, before int) *Step {
	for j := before - 1; j >= 0; j-- {
		if c.Steps[j].Class == "delete" && c.Steps[j].Operation == c.Steps[before].Operation &&
			fmt.Sprint(c.Steps[j].Request.Path) == fmt.Sprint(c.Steps[before].Request.Path) {
			return &c.Steps[j]
		}
	}
	return nil
}

func validateScalar(s *Spec, param map[string]any, val string, fail func(string, ...any), what string) {
	schema, _ := param["schema"].(map[string]any)
	if schema == nil {
		return
	}
	sc, err := s.SchemaOf(schema)
	if err != nil {
		fail("%s: %v", what, err)
		return
	}
	var v any = val
	if t, _ := schema["type"].(string); t == "integer" {
		n, err := strconv.ParseInt(val, 10, 64)
		if err != nil {
			fail("%s: %q is not an integer", what, val)
			return
		}
		v = json.Number(strconv.FormatInt(n, 10))
	}
	if verr := sc.Validate(v); verr != nil {
		fail("%s=%q: %v", what, val, verr)
	}
}

// locations lists the instance locations of every leaf validation failure.
func locations(err error) []string {
	verr, ok := err.(*jsonschema.ValidationError)
	if !ok {
		return []string{err.Error()}
	}
	var out []string
	var walk func(e *jsonschema.ValidationError)
	walk = func(e *jsonschema.ValidationError) {
		if len(e.Causes) == 0 {
			if len(e.InstanceLocation) == 0 {
				out = append(out, "")
			} else {
				out = append(out, "/"+strings.Join(e.InstanceLocation, "/"))
			}
			return
		}
		for _, c := range e.Causes {
			walk(c)
		}
	}
	walk(verr)
	return out
}

func anyRelated(pointer string, failures []string) bool {
	for _, f := range failures {
		if f == pointer || strings.HasPrefix(f, pointer+"/") || strings.HasPrefix(pointer, f+"/") {
			return true
		}
	}
	return false
}

func fieldErrorPointers(raw json.RawMessage) []string {
	var p struct {
		FieldErrors []struct {
			Pointer string `json:"pointer"`
		} `json:"field_errors"`
	}
	_ = json.Unmarshal(raw, &p)
	var out []string
	for _, f := range p.FieldErrors {
		out = append(out, f.Pointer)
	}
	return out
}

func bodyRevision(raw json.RawMessage) (int64, bool) {
	var b struct {
		Revision *int64 `json:"revision"`
	}
	if json.Unmarshal(raw, &b) != nil || b.Revision == nil {
		return 0, false
	}
	return *b.Revision, true
}

func mapBody(raw json.RawMessage) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	v, err := Decode(raw)
	if err != nil {
		return map[string]any{}
	}
	m, _ := v.(map[string]any)
	if m == nil {
		return map[string]any{}
	}
	return m
}

func mapAny(v any) map[string]any {
	m, _ := v.(map[string]any)
	return m
}

func decodeMust(raw json.RawMessage) map[string]any { return mapBody(raw) }

// canonical re-marshals JSON with sorted keys so byte-level formatting does not matter.
func canonical(raw json.RawMessage) []byte {
	var v any
	if json.Unmarshal(raw, &v) != nil {
		return raw
	}
	out, _ := json.Marshal(v)
	return out
}

// Coverage records, per fixture subject, which step classes the fixtures exercise.
func Coverage(cases []Case) map[string]map[string]bool {
	cov := map[string]map[string]bool{}
	for _, c := range cases {
		key := c.Kind
		if c.Type != "" {
			key += ":" + c.Type
		}
		if cov[key] == nil {
			cov[key] = map[string]bool{}
		}
		for _, st := range c.Steps {
			cov[key][st.Class] = true
		}
	}
	return cov
}
