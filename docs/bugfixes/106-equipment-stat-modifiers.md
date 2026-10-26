# Forgejo #106: equipment stat modifiers

## Findings and rules references

The Hope & Fear equipment tables (printed pp.44–53) confirm:

- Rune Shield's Protective feature adds Armor Score: +1/+2/+3/+4 across its four tiers.
- Mage Robes' Enchanted feature adds the character's Spellcast trait to **both damage thresholds**, not to damage rolls. This differs from the shorthand in the feedback report.
- Other unconditional gear bonuses/penalties also need structured modifiers; feature descriptions alone are not executable rules.

The Core rules/SRD equipment section says to add character level to equipped armor's base thresholds. The engine incorrectly skipped that addition if a base threshold happened to equal the unarmored numerical default. For example, base thresholds 5/10 at level 5 incorrectly stayed 5/10 instead of 10/15. Regression tests reproduce and fix this independently of any catalog update.

A read-only check of the local development catalog found empty modifier arrays on the reported HAF items and other passive gear. This is evidence about the local catalog, **not confirmation of current production data**. The checked-in automatic seed publishes SRD content only; changing the placeholder HAF TypeScript tables would not repair production's admin-managed records.

## Code changes

- Character modifiers support `derived_from_spellcast_trait`, including the shared editor and effect captions. The current derived casting trait is used, not a hard-coded Knowledge value or a snapshot of the stat at item creation.
- Subclass casting traits override their class fallback. A secondary caster works; when two casting traits are available, passive bonuses use the larger available value. No caster contributes zero; an actual negative casting trait is not replaced by a nonexistent caster's zero.
- Equipped armor always receives the character-level threshold addition, even when its base number matches an unarmored default. Unarmored defaults are not double-counted.
- Only active equipment supplies these modifiers. Inactive inventory definitions, item text, customizations and compendium data are not mutated by stat derivation.

Existing item details/inventory tables may intentionally show **base** thresholds; the character's final threshold and Armor Score counters are the authoritative totals.

## Content publication is a separate required step

**Deploy the code before publishing a modifier using the new type.** Neither this branch nor the planner automatically edits a database or publishes a release. Equipment with empty modifier arrays will remain missing its bonuses until corrected catalog versions are published and any explicitly pinned characters accept those versions.

The offline planner supports 29 unconditionally representable HAF equipment corrections: Rune Shields, Mage Robes, Fighting Cloaks, Scale Mail and Banded Armor at each tier, plus several individually verified passives. It also handles the unconditional portion of a mixed feature without pretending to implement its conditional portion. It does not interpret arbitrary feature prose in the runtime engine.

To prepare a review plan:

1. As an administrator, obtain a fresh JSON array from `GET /api/app/admin/compendium/items?source_key=HAF` using the existing same-origin authenticated admin interface. Keep this export private; do not commit book data, character data or credentials.
2. Run locally:

   ```bash
   npx tsx scripts/compendium/prepare-equipment-corrections.ts \
     --input admin-items.json --output correction-plan.json
   ```

   The command has no database/network access and refuses to overwrite an existing output file. It emits **modifier-array fragments**, not an automatically applicable catalog import. Expected item versions are review baselines, not an enforced API precondition.
3. Review each entry against the book and the actual current record. The planner refuses duplicate identities, unexpected source/feature shapes, and conflicting existing relevant modifiers rather than replacing or double-stacking them. Missing items are reported separately. An already-correct record yields no update.
4. Before publishing, recheck that the live item version still matches `expected_current_version`. Stop on a mismatch. Through the existing admin editor, change only the named feature's modifier arrays, preserve all other data, and publish a **new** item version with a clear changelog. Do not edit an existing version in place or repoint every character's pinned version automatically.
5. On a test character, accept the corrected item version if pinned, equip/unequip it, change its casting trait, and verify final Armor Score/thresholds and unchanged damage rolls. Check another client reload. Historical versions and deliberate custom overrides remain intact.

The local read-only sample produced 29 candidate updates and no conflicts; production must be reviewed independently. Activated, target-distance, on-hit and tier-derived effects are not automatically inferred. They require explicit supported configuration or a follow-up rather than unconditional stat inflation.

## Validation

Regression coverage checks Rune Shield activation, Mage Robes' two thresholds (not damage), changed/subclass/secondary/negative/no casting traits, character level matching base thresholds, preservation of item definitions, and offline-plan validity/idempotency/conflict handling. Canonical generated schemas are regenerated from Zod. Production rollout and content publication are not part of these automated tests.
