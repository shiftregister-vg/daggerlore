# GM API v1 contract

Contract gate for `daggerlore-fqc.1`: the external Go/Fiber API (`/api/rest/v1`) that lets Daggerdash sync GM
preparation and live state with Daggerlore. Decision record: [`docs/decisions/0001-gm-api-go-boundary.md`](../../decisions/0001-gm-api-go-boundary.md).

| Path | What it is |
|---|---|
| `openapi.yaml` | OpenAPI 3.1 contract (paths, envelopes, errors, sync, grants). Hand-written. |
| `schemas/domain.generated.json` | JSON Schemas for every homebrew type, countdown, fear and condition, **generated** from the zod types in `src/lib/domain/schemas`. Do not edit. |
| `examples/homebrew/*.json` | One minimal valid `data` per homebrew type. Each is parsed with its zod schema by the generator. |
| `field-mapping.md` | Daggerlore ⇄ Daggerdash mapping rules (normative). |
| `fixtures/cases/**` | Request/response conversations per resource kind and per homebrew type: successful, invalid, stale, delete (and repeat) and idempotent-retry cases. |
| `fixtures/roundtrip/*.json` | Golden Daggerlore → desktop → Daggerlore cases. They are the acceptance tests for the Rust implementation too. |
| `../../../internal/contract/` | The executable checks and the Go reference mapper. |

## Running the checks

```bash
npx tsx scripts/gm-api/generate-schemas.ts           # regenerate schemas and re-validate the examples
npx tsx scripts/gm-api/generate-schemas.ts --check   # fail if the committed schemas are stale
go test ./internal/contract/...                      # OpenAPI + every fixture + coverage + round trips
npx @redocly/cli lint docs/api/gm-v1/openapi.yaml    # expected: 2 warnings (localhost server URL, unused internal scheme)
```

Run `generate-schemas.ts` whenever a zod domain schema changes; the Go tests then show every fixture the change
breaks. Refinements (`superRefine`) cannot be expressed in JSON Schema and are listed as `x-server-rules` in the
OpenAPI instead; Go enforces them in code.

## Fixture format

Case files (`fixtures/cases`) hold `steps`; each step has a `class` the tests hold it to:

| `class` | Meaning | Checked |
|---|---|---|
| `ok` | success | request and response validate against the operation; `ETag` equals the body revision; required headers present |
| `invalid` | rejected body | `validation: schema` → the request **fails** the schema at each `field_errors` pointer; `server_rule` → it passes the schema and the rule is server-side |
| `stale` | lost a race | `412 stale_revision` (or `409 conflict` + `conflict_id` with `Prefer: conflict=park`), `current` is a valid newer resource |
| `delete` | tombstone | `200` tombstone, revision +1; a repeated step returns the identical tombstone |
| `retry` | idempotent replay | same `Idempotency-Key` and body as `replays`, identical body, `Idempotent-Replay: true` |
| `forbidden`, `gone`, `rejected` | other declared errors | status/code consistency |

Round-trip files list `server` (resources as the server returns them), `desktop` (the projection the desktop must
hold), and `edits` whose `expect` is a set of JSON-pointer changes on top of the cached `data`: nothing else may differ.
`expect_error` names a refusal the desktop must make locally.
