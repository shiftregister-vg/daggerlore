# 0001 — GM API: Go/SvelteKit boundary, ownership, sync and consent

- **Status:** Proposed — contract gate for `daggerlore-fqc.1` (DAG-2). Implementations (`fqc.2`–`fqc.6`, Daggerdash
  `daggerdash-pu2.1`–`.5`) depend on this document and on `docs/api/gm-v1/`.
- **Date:** 2026-10-02
- **Decided by the user:** external API is **Go/Fiber**; **Go owns domain writes** for synced resources; **Go is
  Postgres-only on a single Postgres server**; the web app hides private notes and GM-only files from non-GMs before
  the first release; **no homebrew limit**; the desktop `description` maps to private notes; the sync numbers below.
  See [§ Resolved decisions](#resolved-decisions). The few remaining recommendations that still need an explicit
  answer are in [§ Still open](#still-open).
- **Companions:** `docs/api/gm-v1/openapi.yaml` (contract), `docs/api/gm-v1/field-mapping.md` (mappings),
  `docs/api/gm-v1/fixtures/` (cases and golden round trips), `internal/contract/` (executable checks).

## Context (re-inspected at Daggerlore `7f50e6b`, Daggerdash `6f43a3a`)

- Auth is Auth.js with **database sessions** (`src/auth.ts`); only browsers have credentials. There is no bearer or
  token concept.
- The database is **Postgres in production and SQLite (`file:`) locally**, with two Drizzle schemas
  (`schema.ts`, `schema.sqlite.ts`) and two migration directories. `src/lib/server/db/client.ts` hand-writes SQL for
  both dialects.
- A campaign is **one JSON document** (`campaigns.campaign`): fear, countdowns, vault ids, notes, file metadata.
  Members and characters are JSON arrays on the same row. `updateCampaign` replaces the whole document. There is no
  revision column, no tombstone (hard delete) and no journal; only `updated_at`.
- Encounters (`encounters.encounter`, owner-only) have **no campaign link** other than
  `campaign.current_encounter_id`. Items and instances have **no ids**; live state (`marked_hp`, `marked_stress`,
  `conditions`, instance `name`) is inside `items[].instances[]`.
- Homebrew is `homebrew_items(id uuid, owner_user_id, type, item json)`; 16 types in
  `src/lib/domain/permissions.ts`; the server forces `source_key: 'Homebrew'` and appends the id to the owner's
  `users.homebrew_vault`. Official content is versioned (`official_compendium_item_versions`) and unlocked per user
  (`user_unlocked_sources`).
- Campaign files exist: GM-only upload, 10 MiB, fixed content types, bytes in R2 at
  `campaigns/{campaignId}/{fileId}`, metadata in the campaign JSON, downloadable by **every member**.
  `private_notes` and `public_notes` are Markdown, and `docs/permissions.md` records that every member can currently
  read private notes.
- `HOMEBREW_LIMIT` exists (`src/lib/domain/constants/entitlements.ts`) but is not enforced server-side. **Decided: there is no homebrew limit**; the API has none.
- Go today is a Fiber v3 stub (`cmd/server.go`, `/api/rest/v1`); Caddy already sends `/api/rest/*` to it.
- Daggerdash: SQLite, local `i64` ids with a 32-hex `uid` (migration 14), backup format v1 (`transfer.rs`) that
  merges incoming-wins, models only adversaries/environments/encounters/countdowns, conditions as strings from a
  fixed list, plain-text bodies.

## Confirmed scope

Go/Fiber external API; a workspace connects to an **account** with **explicitly selected campaigns** (multiple
campaigns, plus account-level all-homebrew and unlocked-catalog scopes); preparation **and** live GM state; **all**
homebrew types; unlocked official adversaries/environments available offline; public/private notes **and**
attachments in the first release; online changes within a few seconds; conflicts resolved by the GM with **both
versions preserved**; reusable encounters with campaign links; **no character sheets** (their homebrew definitions
are in). Cross-repo prerequisites are explicit references (below), not federated Beads blockers.

## Decisions

### D1. Go owns every mutation of a synced resource; SvelteKit reads and calls Go

*Synced resources:* campaign settings, fear, countdowns, public/private notes, attachments, encounters, encounter
links, encounter instance state, homebrew, conflicts, grants.

| Concern | Owner |
|---|---|
| Mutation of any synced resource, from desktop **or** web | **Go** |
| Revision counters, tombstones, mutation journal, idempotency records, `client_ref` map | **Go** (one transaction per mutation) |
| Authorization of those mutations (one rule set, D4) | **Go** |
| Reads for rendering the web UI | SvelteKit (Drizzle) may keep reading the same tables |
| Schema and migrations (**single owner**) | **Drizzle / TypeScript** (`drizzle/`) |
| Browser sessions, consent UI, Auth.js | SvelteKit |
| Everything not synced (characters, campaign membership, invites, billing, admin, dice) | unchanged (TypeScript) in this epic |

Go ships **no migrations**; it only reads the schema Drizzle created. There is **one Postgres server and one
database role set** (no separate web/Go roles). The boundary for synced tables is therefore a code rule enforced by
review and by the internal API, not by database grants: SvelteKit does not write synced tables. The end goal is that
**only the Go backend connects to the database** and the frontend never does; until `daggerlore-srb` finishes, the
web app still *reads* through Drizzle (transitional).

*How SvelteKit writes:* it calls Go's **internal domain service**, `/internal/v1/*`, with the same resources and
semantics as the external API (see the `servers` and `internalPrincipal` entries in the OpenAPI). It is not routed
by Caddy (which sends only `/api/rest/*` to Go) and is reachable only on the private network.
Three internal-only surfaces exist besides the mirrored resources:

1. **Legacy whole-campaign save.** The web editor still submits a full `Campaign` object. A single internal call,
   `POST /internal/v1/campaigns/{id}/apply-legacy-save`, takes that object plus the revisions the editor loaded,
   diffs it against the stored sub-resources and applies conditional writes in one transaction. Stale parts answer
   `409` with the per-resource `current` versions. This avoids rewriting the web editors now; it is removed when the
   editors call the resource endpoints (tracked in `daggerlore-srb`).
2. **Lifecycle hooks** for what stays in TypeScript but affects synced state: campaign created / deleted, GM role
   gained or lost, user disabled or banned. Each emits tombstones or `purge` changes and invalidates grants.
3. **Reachability maintenance.** None; it is internal to Go (D5).

*Rejected:* (a) direct SQL from both services with shared triggers — the permission rules (GM membership lives in a
JSON array) would be implemented twice and triggers would be needed for two dialects; (b) Go as journal-only with
TypeScript still mutating — the journal would be best-effort and conflicts the contract promises to detect could be
missed; (c) SvelteKit-only external routing — outside the confirmed architecture.

*Future compatibility (`daggerlore-srb`):* the internal surface is deliberately the same resource model, so moving
the remaining backend and game rules to Go removes the TypeScript bridge instead of redesigning it. No permanent
SvelteKit business dependency is introduced; the temporary bridges are the legacy-save call, the lifecycle hooks and
the internal principal minting, removed by `daggerlore-srb.2/.3/.21`.

### D2. Go is Postgres-only

The contract assumes Postgres features (`LISTEN/NOTIFY`, `bigserial` cursors, `SELECT … FOR UPDATE`). Consequences:

- `devenv.nix` gains a `services.postgres` (Postgres 17 on `127.0.0.1:5432`, database `daggerlore`) so `devenv up`
  starts the database with the other services; `daggerlore-api` starts after it and gets
  `DATABASE_URL=postgres://127.0.0.1:5432/daggerlore`. The web process is not repointed automatically. Until it is,
  local SQLite keeps working for everything that does not touch synced resources, and synced-resource writes need
  Go + Postgres.
- Drizzle remains the migration source for both dialects (the SQLite schema may lag for tables Go owns).

### D3. Authentication of principals

- **External:** the desktop presents `Authorization: Bearer <workspace token>`. Tokens are opaque (32 random bytes,
  base64url, prefixed), **stored only as a SHA-256 hash**, scoped to one workspace, revocable. Issuance is the
  browser consent flow (`fqc.2`, `fqc.5`); this contract only fixes semantics: token → workspace → grant → user.
- On **every** request Go re-checks: token not revoked; user not `disabled_at`/`banned_at`; for each campaign it
  touches, the user is **currently a GM** of it and it is in the grant. A failed check is `401 token_revoked` /
  `403 scope_not_granted`; a resource outside the grant is `404` (indistinguishable from absent).
- **Internal:** SvelteKit authenticates the browser with Auth.js, then calls Go with a **service credential** plus a
  short-lived **EdDSA-signed principal JWT** (`aud=daggerlore-go`, `sub`=user id, `exp` ≤ 60 s, unique `jti`). Go
  verifies the signature with a public key and **never trusts** `X-Forwarded-*`, cookies or any client-supplied
  identity header. Internal principals act as the whole account (no grant scope) and are authorized by the same
  rules (D4).

### D4. One permission rule set, in Go

Rules for synced resources are implemented once, in a Go `authz` package, and tested with the contract fixtures.
They restate what the code and `docs/permissions.md` already do:

| Resource | Read | Write |
|---|---|---|
| Campaign settings, fear, countdowns, notes, attachments | GM of that campaign (and in the grant) | GM of that campaign |
| Encounter, links, instance state | encounter owner who is GM of a linked, granted campaign | the same |
| Homebrew | owner; or any GM whose campaign vault references it (`readonly`) | owner only |
| Official catalog | account with the source unlocked and `catalog:unlocked` | nobody (`official_immutable`) |

The TypeScript permission code for these resources is replaced by calls to Go; it is not kept in parallel. The
rest of `repository.ts` is untouched.

### D5. Revisions, tombstones, journal

- Every synced resource has `revision bigint` (starts at 1, +1 per committed change) and a nullable `deleted_at`.
  A delete is a tombstone that keeps its revision; tombstones are retained at least 90 days.
- One transaction per mutation: `SELECT … FOR UPDATE` the resource, compare `If-Match`, apply, bump revision,
  insert a `sync_journal` row, `NOTIFY` (delivered on commit). Multi-resource effects (an encounter delete
  tombstoning links and instances; a homebrew delete removing vault references; `add_to_campaign_ids`) happen in
  that same transaction, journaled in a stable order (children before parents on delete).
- `sync_journal(seq bigserial, occurred_at, owner_user_id, campaign_ids uuid[], kind, resource_id, op, revision,
  actor_kind, actor_workspace_id, idempotency_key, …)`. `campaign_ids` is the set of campaigns through which the
  change is reachable, computed at write time.
- **Reachability changes are journaled:** when an item becomes reachable to a campaign (homebrew added to a vault,
  encounter linked) Go writes an `upsert` for it; when it stops (vault removal, unlink, deselect) Go writes a
  `purge` with a reason. A workspace's feed is `seq > after` filtered by its grant at read time.
- Cursors are opaque (`c_<n>`); retention ≥ 90 days; older cursors get `410 cursor_expired` and the client
  re-bootstraps.

### D6. IDs and create identity

**The API maintains its own ids.** Every id is assigned by the server (UUIDs), including the `item_id` of an encounter
item and the `instance_id` of an instance. A client never proposes one. A client's own id (Daggerdash's 32-hex `uid`)
is only ever a `client_ref` (`daggerdash:<uid>`, unique per workspace and kind); when the client pushes a new record
the server creates it with a new id, returns it, and the client persists the pair as a mapping. Creates are made
idempotent twice over: `client_ref` (survives forever) and `Idempotency-Key` (the outbox entry id, remembered ≥ 24 h;
same key + same body replays the original response with `Idempotent-Replay: true`; same key + different body is
`422 idempotency_key_reuse`). Inside an encounter write, new items and new
instances are sent **without ids**; the response returns the same `items` array with ids assigned and the client maps by
position. Live state for instances created by that write travels in `new_instance_state` (by `item_index` /
`instance_index`), so one request creates structure and state. An id that is present must already belong to the
encounter.

### D7. Conflicts

- **Granularity.** Whole resource for definitions: homebrew, encounter structure, campaign settings, each notes
  field, attachment metadata. **One resource per live-state unit:** fear, each countdown, each encounter instance.
  So a fear tick, a countdown tick and a notes edit never conflict with each other.
- **Detection.** `ETag`/`If-Match` on every write (`428` if absent, `412 stale_revision` with `current` if stale).
- **Parking.** With `Prefer: conflict=park` the server stores the submitted version as a `conflict` resource
  *atomically* and answers `409 conflict` + `conflict_id`; `POST /conflicts` is the explicit equivalent. Nothing the
  desktop typed is lost even if it crashes before reading the response.
- **Auto-rebase** is the client's option only when its changed top-level fields are disjoint from the upstream
  changes since its base revision. It never merges inside a field.
- **Resolution** is the GM's: `keep_server`, `keep_local` or `merged`. The loser is kept in the conflict record
  (`resolution.discarded`) for the life of the campaign. Resolution is itself conditional on
  `expected_target_revision`.
- Delete-vs-edit is a conflict; the server side is a tombstone.

### D8. Sync target and mechanism

- **Target** (measured while a workspace has polled in the last 60 s): commit → applied on the desktop **p95 ≤ 5 s,
  p99 ≤ 10 s**; of which server commit → delivered in a response **p95 ≤ 2 s**. Published in `GET /capabilities`.
- **Mechanism: cursor feed with long polling.** `GET /sync/changes?after=…&wait_ms=…` holds up to 25 s and returns
  on commit (Go listens on Postgres `LISTEN/NOTIFY` and fans out in-process; each Go instance listens). Clients
  re-poll immediately after a response and fall back to a 3 s interval if long polling fails. Server-sent events are
  an additive v1.1 option; they are not needed to meet the target and would complicate proxies and the Rust client.
- **Measurement.** Go records `sync_commit_to_delivery_ms` per change and, from the optional `X-Sync-Ack` header,
  `sync_commit_to_ack_ms`. A synthetic canary (write through the internal API, observe through a simulated desktop
  client) runs in CI and nightly in the environment; the SLO is evaluated over a rolling 7 days.
- **Echo.** `Change.actor.workspace_id` lets a client recognise its own write; it still advances its stored revision.
- **Bootstrap.** `GET /sync/snapshot` captures `snapshot_cursor` (the journal head) *before* reading, pages are read
  live, and the client then replays `GET /sync/changes?after=<snapshot_cursor>`. Applying an upsert whose
  `revision` is not newer than the cached one is a no-op, so the result converges without holding a transaction open
  across HTTP requests. `X-Grant-Revision` on sync responses tells the client to re-read the workspace and re-run a
  snapshot after any grant change.

### D9. Grants and consent

- A workspace belongs to **one account** and holds `campaign_ids[]` plus optional account scopes `homebrew:all`,
  `encounters:all` and `catalog:unlocked`. Only campaigns the GM currently GMs can be selected.
- **Expansion or reselection** (more campaigns, a new scope) always goes through the browser:
  `POST /workspace/scope-requests` returns a consent URL and changes nothing until the GM approves.
  **Narrowing** (`DELETE /workspace/campaigns/{id}`, scope removal, revoking the workspace) needs no consent, takes
  effect at once and journals `purge` changes.
- **New campaigns are never enrolled implicitly**, not even when a GM creates one while a workspace exists; they
  show up in `GET /workspace` → `available_campaigns` (names only) until selected. A scope never grants more than
  its name says: `homebrew:all` and `encounters:all` cover the principal's own entities, never other users'.
- Visibility rules for library entities are in D10.
- Losing the GM role on a campaign, or the account being disabled, behaves like revocation for that campaign/grant.
- **`purge` is not delete.** The desktop keeps its primary local data (the GM's own work) and drops only remote-only
  caches (official catalog entries, other users' homebrew) and the mapping; unsynced drafts are kept.
  Reasons: `deselected`, `unlinked`, `scope_reduced`, `revoked`, `owner_changed`.

### D10. Encounters are reusable, linked to campaigns

Encounters, homebrew adversaries/environments and the rest of the library are **entities that belong to a user, not
to a campaign, and are used by campaigns** by link or reference. New `encounter_campaign_links` (many to many, no
copy); an encounter may have no links. Only the owner can link an encounter, and only to campaigns they GM.

*Visibility to a workspace* (applies the same way to homebrew): linked to / referenced by a selected campaign; **or
created by this workspace** (so something the desktop just made never vanishes from it, linked or not); or covered by
the account scope `encounters:all` (every encounter the principal owns) / `homebrew:all` (every homebrew item the
principal owns). `purge` with reason `unlinked` applies only when none of those still holds. Deleting an encounter tombstones its links and instance state first. `current_encounter_id` must reference a
linked encounter.

### D11. References vs copies, official immutability, homebrew ownership

Campaigns and encounters hold **references** to catalog entries (`ref`: homebrew uuid, or official
`source_key/item_type/item_id[/item_version]`, with Daggerlore's original string kept as `legacy_id`). A copy exists
only as a deliberate `edited_adversary` / `edited_environment` embedded in an encounter, with `ref` as its base.
Official content is immutable and versioned (`readonly`, `provenance.official`, revision = `item_version`); writes
are `405 official_immutable`. Homebrew is owned by one user; only the owner writes (`readonly_resource` otherwise);
a GM reads other users' homebrew through the campaign vault. The vault controls use; it never transfers ownership.

### D12. Rich text

Wire format is **sanitized HTML** for every `*_html` field (server sanitizes on write and returns the sanitized
form), **Markdown source** for campaign notes, plain text for `description`/`motives_tactics`. Allowlist and the
projection-and-patch rule that avoids lossy mappings are in `field-mapping.md` §8. The sanitizer allowlist is part
of the contract; Go implements it with an allowlist sanitizer and the fixtures pin its behavior.

### D13. Notes and attachments

Separate `campaign_public_notes` and `campaign_private_notes` resources (own revisions). Attachments: metadata
resource + streamed upload (`PUT …/content` with `X-Content-SHA256`, size and SHA-256 verified), `visibility`
`gm_only | players` (existing files read as `players`, which is today's behavior), same limits and content types as
the web app (10 MiB; JPEG, PNG, GIF, WebP, AVIF, PDF, text, Markdown), bytes in the existing R2 keys. Pending uploads
older than 24 h are tombstoned. **Go becomes the writer of campaign file metadata and objects**; the TypeScript
download route stays a reader.

### D14. Errors, pagination, capabilities

`application/problem+json` with a stable `code` enum, `retryable`, `field_errors` (JSON Pointers), and `current` /
`conflict_id` where relevant; cursor pagination (`limit` ≤ 200); `GET /capabilities` publishes versions, kinds,
limits and the sync targets. See the OpenAPI.

### D15. Preservation

`extensions` (opaque, client-owned, size-limited) on every resource; domain `data` is strict, so unknown keys can
only live in `extensions` or in the cached envelope. The desktop caches unmodeled homebrew types as opaque
records. Round-trip fixtures cover custom and disabled conditions, interleaved items, unmodeled types and unknown
fields, countdown floor ≠ reset, public/private notes, images/attribution and official provenance.

## What `fqc.3`–`fqc.6` must add (indicative names; Drizzle owns them)

- Per-resource `revision`/`deleted_at` on `homebrew_items` and `encounters`; new rows/tables for independently
  revisioned units: `campaign_countdowns`, `campaign_fear`, `campaign_notes`, `campaign_attachments`,
  `encounter_instances`, `encounter_campaign_links`, `conflicts`; and `reset_to`, `visible_to_players`, instance and
  item ids in the stored shapes. The legacy JSON columns become derived or are migrated; web reads must follow.
- `desktop_workspaces`, `workspace_tokens` (hash only), `workspace_campaign_grants`, `workspace_account_scopes`,
  `scope_requests`, `grant_revision`.
- `sync_journal`, `idempotency_keys`, `resource_client_refs`.
- The TypeScript `EncounterSchema` / `CampaignSchema` must accept the new ids and fields (zod strips unknown keys
  today, which would silently drop them on any web save — one more reason web writes go through Go).

## Resolved decisions

| # | Question | Answer |
|---|---|---|
| 1 | Hide private notes and GM-only files from non-GMs in the web app before the first release? | **Yes.** It is a release prerequisite (tracked as its own bead); `gm_only` attachments and private notes must not sync before it ships. |
| 2 | Enforce the homebrew limit in the API? | **No limit at all.** `entitlement_limit` and `max_homebrew_items` are removed from the contract. The unused `HOMEBREW_LIMIT` constant in the web app is a separate cleanup (own bead). |
| 3 | Desktop `description` → private notes? | **Yes.** |
| 4 | Sync numbers: p95 5 s / p99 10 s end to end, server delivery p95 2 s, 25 s long-poll, 90-day journal and tombstone retention, 24 h idempotency retention | **Accepted.** |
| 5 | Separate Postgres roles? | **No.** One Postgres server; the end goal is database access from the Go backend only. `devenv` gets a Postgres service. |
| 6 | Entities outside a campaign? | **Yes.** Daggerdash will gain entities that do not belong to a campaign but can be used in one; the API assumes that pattern (D10): encounters, adversaries and environments are library entities referenced by campaigns. |
| 7 | Fear | **Integer 0..12**, no fractions. The web app's zod `FearSchema` still accepts fractions and should become `.int()`; the API enforces it regardless. |
| 8 | Who assigns ids? | **The API.** The desktop keeps its own ids and a mapping to the remote id; new records get a server id returned in the response (D6). |
| 9 | Scope `encounters:all` and "created by this workspace stays visible" | **Yes** to both. |

## Still open

Nothing. The visibility rules in D10 (account scope `encounters:all`, entities created by a workspace stay visible to
it, and no implicit broadening of consent) were confirmed.

## Cross-repo references (explicit, not federated blockers)

| Daggerlore | Daggerdash (`~/Projects/odysseys.online/daggerdash`) |
|---|---|
| `fqc.2`, `fqc.5` consent, tokens, grant lifecycle | `daggerdash-pu2.1` native browser auth |
| `fqc.3`, `fqc.4`, `fqc.6` identities, journal, transport | `daggerdash-pu2.2` mappings/cache/outbox, `pu2.3` bootstrap, `pu2.4` worker |
| conflict resource, notes, attachments | `daggerdash-pu2.5` conflicts/notes/files UI |
| field mapping & fixtures | `daggerdash-02t` (alignment — decided: map at sync time, backup v1 untouched), `r7j` (sync-model prep: uid ≠ server id, `start` ≠ `min`), `807` official catalog, `kyx` bounds, `8dp` merge preview, `w6y` notes, `5hr` visibility |
| `daggerlore-srb.2/.3/.21` | remove the temporary TypeScript bridges |

Suggested coordination comments for the desktop beads (not posted; they live in the other repo's tracker):
*02t:* backup v1 stays; mapping rules and golden fixtures are in `docs/api/gm-v1`; *r7j:* `uid` is a `client_ref`
only, `start` ↔ `reset_to`, `min` ↔ `floor`.

## Acceptance traceability

| Criterion | Where |
|---|---|
| Go/SvelteKit contract; Go owns mutations/journal; migrations single owner; auth without trusting browser headers | D1–D5 |
| Notes/files, reusable encounter links, few-seconds target recorded | D8, D10, D13 |
| Example payloads and ok/invalid/stale/delete/retry cases for all types | `fixtures/cases/**` (all 12 resource kinds, all 16 homebrew types; coverage enforced by `TestFixtureCoverage`) |
| Daggerlore → desktop → Daggerlore loses no data, privacy flags or provenance | `fixtures/roundtrip/**`, `TestRoundTripFixturesLoseNothing` |
| Scope excludes sheets but permits their homebrew definitions | OpenAPI description, `field-mapping.md` §9, all 16 types in fixtures |
| Custom conditions, interleaved items, unmodeled homebrew + unknown fields, countdown floor ≠ reset | `encounter-interleaved-custom-conditions`, `homebrew-opaque-unmodeled-type`, `countdown-floor-differs-from-reset`, `countdown-no-baseline` |
| Contract schema validation | `go test ./internal/contract/...`, `redocly lint`, `scripts/gm-api/generate-schemas.ts --check` |

## Verification

```bash
go test ./internal/contract/...                                  # schemas, fixtures, coverage, round trips
npx tsx scripts/gm-api/generate-schemas.ts --check               # generated schemas match the zod types
npx @redocly/cli lint docs/api/gm-v1/openapi.yaml                # 2 accepted warnings: localhost server, internal scheme
```
