# Daggerlore ⇄ Daggerdash field mapping (GM API v1)

Normative for bead `daggerlore-fqc.1`. The executable form is `internal/contract/mapping.go`; the golden files in
`fixtures/roundtrip/` are the acceptance tests for both that Go reference and the Rust desktop implementation
(`daggerdash-pu2.2` cache/outbox, `daggerdash-pu2.5` UI). Evidence: Daggerlore `7f50e6b`
(`src/lib/domain/schemas/*`), Daggerdash `6f43a3a` (`src/db/*`, `src/db/transfer.rs` backup format v1).

The backup format (`daggerdash.campaign` v1) is **not** the sync transport and is not changed here. Mapping happens
at sync time (decision A of `daggerdash-02t`), so old backup files keep importing.

## 1. The one rule that makes it lossless

> The desktop keeps the **last-synced server resource verbatim** (envelope, `data`, `extensions`) and builds every
> write by patching a copy of that `data` with only the fields whose desktop value differs from the *projection of
> the same cached copy*.

Everything the desktop does not model — `image_url`, `artist_name`, `relative_strength`,
`potential_adversaries_ids`, privacy flags, disabled conditions, unknown fields, the interleaving of encounter items,
whole homebrew types — therefore survives by construction, because it is never read into, or written from, desktop
columns. Consequences:

- A projection that was not edited produces **no write** (every fixture asserts this).
- The desktop never sends envelope fields (`provenance`, `readonly`, `revision`, `client_ref`, `kind`, `id`). The
  server owns them and ignores them on input.
- `extensions` is opaque, client-owned JSON: the desktop writes only `extensions.daggerdash` and re-sends every
  other key untouched (`othertool` in the fixtures).
- Unknown top-level envelope keys and unknown keys inside `extensions` are cached and kept; the server stores and
  returns them. Unknown keys inside `data` are rejected by the server schemas (`unevaluatedProperties`), so they can
  only exist in `extensions`.
- `readonly: true` (official content, someone else's homebrew) means **no write is ever built**
  (`ErrReadonly`); the desktop may still reference and display it.

## 2. IDs and identity

| Thing | Daggerlore | Daggerdash | Rule |
|---|---|---|---|
| Top-level resource id | UUID assigned by the server | local `i64` + 32-hex `uid` (migration 14) | The `uid` is **not** a server id. Sent once as `client_ref: "daggerdash:<uid>"` on create; the server returns its own `id`; the desktop persists the pair in its mapping table. |
| Campaign | `campaigns.id` UUID | `campaigns.uid` | The desktop never creates remote campaigns in v1; the GM selects existing ones. |
| Encounter item | none today | row of `encounter_adversaries` / `encounter_environments` | `item_id`: **assigned by the server** when the item is first written; the desktop sends a new item without an id and records the returned one in its mapping. |
| Adversary instance | none today (array index) | `(adversary row, instance index)` | `instance_id`: **assigned by the server**, same flow. Server order of `instances[]` defines desktop index `0..n-1`. |
| Reference to an adversary / environment | `base_adversary_id` / `base_environment_id` string into a merged compendium map | `base_id` / local adversary row | Typed `ref` (`origin: homebrew` + `homebrew_id`, or `origin: official` + `source_key`/`item_type`/`item_id`[`/item_version`]), with the original string kept as `legacy_id`. The desktop stores it as an opaque **ref key** (`homebrew:<uuid>` / `official:<source>/<type>/<id>`) and resolves it through its mapping table. |
| Countdown | `id` string (`crypto.randomUUID()` today) | `countdowns.uid` | Server `id` + `client_ref`. |

**The API keeps its own ids; the desktop keeps its own ids and a mapping.** Every new record the desktop pushes is created by the server with a new id that comes back in the response; the desktop then associates the two. The desktop never proposes or reuses an id, for top-level resources or for items and instances inside an encounter. For things created inside one write (new items and new instances of an encounter), the desktop maps by position: the response carries the same `items` array with ids filled in, and live state for new instances travels in `new_instance_state` addressed by `item_index`/`instance_index`.

Idempotent creation: `client_ref` is unique per `(workspace, kind)`. A create whose `client_ref` already exists with
identical content returns `200` with the existing resource; with different content it is `409 client_ref_conflict`.
`Idempotency-Key` (the outbox entry id) additionally makes retries after a lost response return the original answer.

## 3. Adversary (homebrew `adversaries`; also official `catalog_item`)

| Daggerdash (local) | Daggerlore `data` | Notes |
|---|---|---|
| `name` | `title` | |
| `kind` | `type` | Same vocabulary (`Bruiser`, `Horde`, `Leader`, `Minion`, `Ranged`, `Skulk`, `Social`, `Solo`, `Standard`, `Support`); any other string is preserved as-is by the cache. |
| `source` | `source_key` | Same vocabulary (`Homebrew`, `SRD`, …). `source` is *not* a display label: labels (`name`, `short_title`) come from `GET /catalog/sources` and are display-only. The server stores `Homebrew` for all homebrew regardless of input. |
| `tier`, `difficulty`, `attack_modifier` | same | |
| `hp` | `max_hp` | Daggerlore's `hp` means *maximum*; current/marked HP is instance state. |
| `stress` | `max_stress` | |
| `threshold_major`, `threshold_severe` | `thresholds.major`, `thresholds.severe` | Flat ⇄ nested. |
| `attack_name`, `attack_range`, `damage_dice`, `damage_bonus`, `damage_type` | `standard_attack.{name,range,damage_dice,damage_bonus,damage_type}` | Flat ⇄ nested. `attack_range` ∈ Melee…Very Far, `damage_type` ∈ `phy`/`mag`. |
| `motives` | `motives_tactics` | Plain text. |
| `description` | `description` | Plain text (not HTML). |
| `experiences: [{name, modifier}]` | `experiences: [name]` + `experience_modifiers: [n]` | Parallel arrays, always equal length. Writing one array without the other is a server validation error. |
| `features[].name` | `features[].name` | |
| `features[].kind` (`passive`…) | `features[].type` (`Passive`, `Action`, `Reaction`, `Evolution`) | Lowercase ⇄ capitalized. |
| `features[].max_uses` | `features[].max_uses` | `null` = unlimited. |
| `features[].text` | `features[].description_html` | HTML ⇄ text, see §8. |
| `features[].questions` | *(none)* | Desktop-only. Stored in `extensions.daggerdash.feature_questions: [{name, questions}]`, matched by feature name. |
| — | `image_url`, `artist_name` | Not modeled. Kept in the cached `data`; never rewritten. |

Feature matching on push is **by name** (first unused occurrence). A rename is therefore a remove + add of that
feature (its unmodeled siblings, if any, are not carried over). Reordering is preserved from the desktop list.

A desktop-created adversary (no cached copy) is built from the defaults in `defaultAdversary()` (`source_key:
Homebrew`, empty image/attribution, `Standard`, tier 1) overlaid with the desktop values and sent as
`POST /homebrew`. The server creates the record with its own id and returns it; the desktop stores the mapping.
Using it in a campaign is a separate reference: `add_to_campaign_ids` on the create, or a later campaign settings
write (vault). An adversary used by no campaign is still a valid library entity.

## 4. Environment (homebrew `environments`)

| Daggerdash | Daggerlore | Notes |
|---|---|---|
| `name`, `tier`, `kind`, `source`, `difficulty`, `description` | `title`, `tier`, `type`, `source_key`, `difficulty`, `description` | As for adversaries. `kind` ∈ Exploration, Social, Traversal, Event. |
| `impulses`, `potential_adversaries` | same | Plain text. |
| `features[].kind` | `features[].type` (`Action`, `Reaction`, `Passive`) | |
| `features[].text` | `features[].description_html` | §8. |
| `features[].questions` | `features[].questions` | Native in Daggerlore for environments. |
| `features[].max_uses` | *(none)* | Environments have no uses; the desktop must not sync it. |
| — | `relative_strength`, `potential_adversaries_ids`, `image_url`, `artist_name` | Not modeled; preserved. |

## 5. Campaign

One desktop campaign row is **four** server resources, each with its own revision so a Fear tick never conflicts
with a notes edit:

| Daggerdash | Server resource | Field |
|---|---|---|
| `name` | `campaign` | `data.name` |
| `fear` (`u8`, `MAX_FEAR`) | `campaign_fear` | `data.value`, integer **0..12** |
| `description` | `campaign_private_notes` | `data.markdown` |
| `public_notes` *(new, `pu2.5`)* | `campaign_public_notes` | `data.markdown` |
| — | `campaign` | `fear_visible_to_players`, `enabled_source_keys`, `homebrew_vault`, `current_encounter_id`: **never written by the desktop in v1** (kept in the cached copy) |

**Privacy decision (flagged for review):** the existing desktop `description` maps to **private** notes, never
public, so syncing cannot publish text a GM wrote for themselves. A desktop that has no `public_notes` field simply
never writes that resource. Notes are Markdown source on both sides (the web app renders `private_notes` and
`public_notes` with `marked` + DOMPurify), so there is no conversion.

Campaign settings omit membership, characters, invite codes and character sheets entirely (out of scope).
Homebrew of sheet-related types referenced from `homebrew_vault` is preserved as ids.

## 6. Countdowns

| Daggerdash | Daggerlore | Notes |
|---|---|---|
| `name` | `name` | |
| `current` | `current` | `≥ 0`. |
| `start` | `reset_to` | **Reset baseline** (what a reset goes back to; Daggerdash clamps `1..99`). |
| — | `floor` (Daggerlore's `min`) | **Floor**: the counter never goes below it (`Math.max(countdown.min, value)` in the web app). Independent of `reset_to`. The desktop preserves it and SHOULD clamp decrements to it; it never writes it from `start`. |
| — | `visible_to_players` (`visibleToPlayers`) | Preserved; absent in old data reads as `false`. |

Backward-compatible defaults for data that predates `reset_to`: the server returns `reset_to: null`
(never invents a baseline). The desktop derives `start = max(1, floor, current)` for display **and remembers that it
derived it**: it writes `reset_to` only after the GM edits `start`. A baseline below the floor is refused on the
desktop (`ErrStartBelowFloor`) and rejected by the server (`floor ≤ reset_to`). Countdown order is list order;
`position` is only used on create/PUT to place an entry.

## 7. Encounters

Structure (`encounter`, whole-resource conflicts) and per-instance live state (`encounter_instance`, one resource
per instance) are separate:

| Daggerdash | Daggerlore | Notes |
|---|---|---|
| `name` | `name` | |
| `notes` | `description_html` | HTML ⇄ text, §8. |
| `massive_damage` | `enable_massive_damage` | |
| `battle_points.tier` / `.players` / `.bonus_damage` / `.extra` | `encounter_tier` / `number_of_players` / `bonus_damage` / `extra_battle_points` | Nested ⇄ flat. |
| `adversaries[]` and `environments[]` (two lists) | `items[]` (**one ordered mixed list**) | See below. |
| `adversaries[].adversary` (ref key) | `items[].ref` | §2. |
| `adversaries[].edit` | `items[].edited_adversary` | A real per-encounter copy (mapped like §3), with `ref` as its base. Same for environments. |
| `adversaries[].quantity` | `items[].instances.length` | Desktop is *quantity + sparse state*, Daggerlore is *full instance list*. |
| `instances[].instance` (index) | `instances[i].instance_id` | Index is the position in the server array. |
| `instances[].name`, `hp_marked`, `stress_marked` | `encounter_instance.data.name`, `marked_hp`, `marked_stress` | Only instances with any non-default state appear in the desktop's sparse list. |
| `instances[].conditions: [string]` | `data.conditions: [{name, enabled}]` | §7.2. |
| — | `condition_list` (custom names this encounter offers) | Preserved; the desktop must append a new custom condition name here (a structure write) **before** setting it on an instance. |

### 7.1 Ordered mixed items and interleaving

The server order of `items` (for example *adversary, environment, adversary, environment*) is canonical. The desktop
splits it into two lists for its own model and keeps the **type pattern** of the cached array as a template: on
push, its adversary list fills the adversary slots in order and its environment list fills the environment slots in
order. Interleaving of existing items therefore survives edits, reorders within a type are honored, surplus new items
append at the end, and removed items disappear (their instances' live state is tombstoned by the server in the same
transaction). Existing items are matched by their cached `item_id`; items without one are new.

### 7.2 Quantity, instances and conditions

- Quantity shrinks from the end and grows with new instances sent as `{}` (the server assigns `instance_id`). If a new instance already has marks or conditions, its live state is sent in the same write as `new_instance_state` (by position) so no second request needs an id that does not exist yet.
- Live state of an instance the desktop shows as default is **not** written (no pointless revisions).
- Conditions: the desktop sees only the **names of enabled conditions**. On push it *toggles*, like the web app:
  a condition the desktop cleared stays as `{name, enabled: false}`; a name it added is appended as
  `{name, enabled: true}`. Custom names, disabled entries and unknown names are preserved in order. The desktop
  must stop dropping names outside `Vulnerable/Restrained/Hidden` (today `set_instance_conditions` filters them).
- **Encounters are library entities.** An encounter belongs to its owner, not to a campaign; it can be linked to zero, one or many campaigns (`encounter_link`), and the link carries no copy. The desktop must model the same split (entities that exist outside any campaign and are used by campaigns), as it must for adversaries and environments, which are account-level homebrew referenced by campaign vaults rather than rows owned by a campaign.

## 8. Rich text

| Where | Wire format | Desktop |
|---|---|---|
| Every `*_html` field in `data` (feature descriptions, encounter `description_html`, homebrew cards…) | **Sanitized HTML.** The server sanitizes on write and stores/returns the sanitized form. | Markdown-ish text (`text`, `notes`). |
| Campaign `public_notes` / `private_notes` | **Markdown source** (CommonMark + GFM) | Same string. |
| `description`, `motives_tactics` (adversary) | Plain text | Same string. |

HTML allowlist (server sanitizer and client renderers): `p br strong em u s sub sup code pre blockquote ul ol li h1 h2
h3 h4 hr a table thead tbody tr th td`; attributes only `href` (`http`, `https`, `mailto`), `title`, forced
`rel="noopener noreferrer"` on `a`, `colspan`/`rowspan` on `td`/`th`. No `style`, `class`, `id`, event handlers,
`img`, `iframe`, `script`, `svg`. Images go through attachments, never inline.

Rules that prevent a lossy mapping:

1. The desktop **keeps the HTML verbatim** and computes its text as a *projection*.
2. On push, a field is converted back only if its text differs from the projection of the cached HTML; otherwise the
   cached HTML is re-sent byte-for-byte.
3. Markdown dialect for the projection: paragraphs separated by a blank line, `**bold**`, `_italic_`, `- ` lists,
   a hard break as `\n`, and **any element Markdown cannot express stays as raw inline HTML in the text** (for
   example `<u>…</u>`, `<a href="…">`), so an edit to nearby text never drops it. The Go `SimpleConverter` is the
   reference; the Rust converter must reproduce the golden fixtures.
4. Formatting that cannot be represented even as raw inline HTML in the desktop editor is limited to *edited* fields
   and is shown to the GM before saving (desktop UX, `pu2.5`).

## 9. Homebrew types the desktop does not model

All 16 `HomebrewTable` types sync. The desktop models `adversaries` and `environments`. For the other 14
(`primary_weapons`, `secondary_weapons`, `armor`, `loot`, `consumables`, `beastforms`, `classes`, `subclasses`,
`domains`, `domain_cards`, `ancestry_cards`, `community_cards`, `transformations`, `character_sheet_addons`):

- The desktop stores each as an **opaque cache record**: `{type, id, revision, client_ref, readonly, provenance,
  envelope-verbatim}` plus `title` for listing. It never edits them in v1 and never builds a write for them
  (`daggerdash-pu2.2` owns the table).
- Any editor for them is a later feature and must go through the same projection-and-patch rule.
- Character sheets and characters are not synced; their *definitions* are, as above.

## 10. Official content and provenance

- Official adversaries/environments are `catalog_item` resources: `readonly: true`, `provenance.origin: official`
  with `official.{source_key,item_type,item_id,item_version}`, `revision` = official `item_version`.
- `GET /catalog/items` requires `catalog:unlocked` and only returns sources the account unlocked
  (`user_unlocked_sources`). Writes are refused with `405 official_immutable`.
- Encounters and campaigns **reference** catalog items (`ref`), never copy them. A deliberate per-encounter edit is
  an embedded `edited_adversary` / `edited_environment` copy; `ref` stays as its base so the lineage is visible.
- `ref.item_version` pins a version; absent means *latest unlocked at read time*. The desktop caches the version it
  saw, and a refresh that finds a newer version arrives as a normal `upsert` revision.
- Homebrew provenance: `provenance.origin: homebrew` with `owner`. Only the owner may write; a GM reading another
  user's vault homebrew gets `readonly: true` (`readonly_resource` on writes).

## 11. Privacy flags and what never changes on a desktop push

The following are never written by the desktop in v1 and every round-trip fixture proves they are untouched:
`fear_visible_to_players`, `visible_to_players` (countdowns), `visibility` of attachments (only changed through the
attachment resource), `enabled_source_keys`, `homebrew_vault`, `current_encounter_id`, `provenance`, `readonly`,
`image_url`, `artist_name`, `legacy_id`, pinned `item_version`.

## 12. Conflict handling summary (full rules in the decision record)

- Granularity: whole resource for definitions (homebrew, encounter structure, campaign settings, each notes field,
  each attachment's metadata); one resource per live-state unit (fear, each countdown, each instance).
- A stale write is `412 stale_revision` carrying `current`; with `Prefer: conflict=park` the server atomically stores
  the submitted version as a `conflict` and answers `409 conflict`. The desktop MAY auto-rebase only when its changed
  top-level fields are disjoint from the fields changed upstream since its base revision; it MUST NOT merge inside a
  field. Everything else waits for the GM, who picks `keep_server`, `keep_local` or `merged`; **the losing version is
  stored in the conflict record for the life of the campaign**.
- Deleted-vs-edited is a conflict (the server side of the pair is a tombstone).
