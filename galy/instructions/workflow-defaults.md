# Workflow defaults — an administrator's policy over a per-user preference

What a skill is allowed to do on someone's behalf (ship / merge / auto-deploy / send a
retrospective). The **source of truth is the Galy server**, read and written through the MCP tools
`workflow_policy_resolve`, `workflow_default_get_all`, `workflow_default_set`,
`workflow_default_unset`. A local `.galy/workflow-defaults.json` is kept as a **mirror** so
headless/cron runs without MCP still have the values. **Never commit the mirror** (`.galy/` is
gitignored).

## Model — two layers, and the top one wins

- **The workspace policy**, set by the client's administrator, per skill and per option:
  `allow` (on for everyone), `deny` (off for everyone), `user_choice` (each developer decides).
  It is not overridable from here, and a skill that lets a user set a preference the policy will
  never read has told them they have a control they do not have.
- **The user's preference**, authoritative only under `user_choice`.

`workflow_policy_resolve(skill, option)` collapses the two and says who decided:

```json
{ "effective": "allow" | "deny" | "ask",
  "decided_by": "admin" | "user" | "default",
  "admin_policy": "...", "user_value": "...", "settings_url": "https://…" }
```

- **Mirror** (`.galy/workflow-defaults.json`): rewritten on every set/unset; the fallback when the
  Galy MCP is unavailable. It holds only the **user** layer — a policy is a workspace fact and is
  never cached locally, because a stale `allow` is exactly the mistake that matters.

Values are canonical machine strings; the reserved value `"ask"` forces the question every run.
**Persist canonical values, never localized labels** — labels move, the stored value must stay
stable. The skill maps the question label to the canonical value before writing.

## Read + ask pattern

Before any related question to the user:

1. **Resolve** with `workflow_policy_resolve(skill, option)`.
   - `effective: "allow"` or `"deny"` with `decided_by: "admin"` → **apply it and ask nothing.**
     Say in one line that the workspace decided, and give `settings_url`.
   - `effective: "deny"` → the action does not happen. Do not offer to do it anyway.
   - `effective: "ask"` → continue below.
2. **If the MCP is unavailable**, read the `.galy/workflow-defaults.json` mirror (missing file =
   `{}`) and use the user layer alone. Never assume a policy you could not read: absent means ask,
   never means allow.
3. Lookup `<skill>.<option>`.
4. **Found and != `"ask"`** → apply silently, log `[workflow-default] <skill>.<option> = <value>`, continue.
5. **Absent** → ask **two** questions in one turn: Q1 (this run, skill-specific labels) + Q2 (future
   default, same choices **plus** "Always ask" → `"ask"`). Before continuing with Q1, persist Q2:
   `workflow_default_set(skill, option, q2)` **and** rewrite the mirror.
6. **Stored == `"ask"`** → ask **only Q1**; persist nothing.

## Mirror helper

After every `workflow_default_set`/`unset`, write the same value into `.galy/workflow-defaults.json`
(`{ "<skill>": { "<option>": "<value>" } }`) so offline runs stay in sync.

## Known options

**This table is a reminder, not the authority.** The instance is:
`workflow_catalog_list` returns the options *it* knows, their accepted values, and the value that
applies when nobody has decided. Read it before you write a preference — the option names and the
catalogue have already drifted apart twice in one hour, in both directions, with nothing failing:
a page offered a control no skill read, and a skill could have offered a value no page accepts.

| Skill | Option | Values |
|---|---|---|
| `feature-implement` | `merge_mode` | `auto-merge`, `stop-before-merge`, `ask` |
| `ship`              | `auto_ship`  | `confident`, `always-manual`, `ask` |
| `ship`              | `release_trigger` | `merge-ships`, `separate-call`, `ask` |
| `ship`              | `release_hold` | `hold-for-a-human`, `go-when-green`, `ask` |
| `ship`              | `rollback_mode` | `revert-and-reship`, `redeploy-previous`, `no-way-back`, `ask` |

### `auto_ship` flow

Read by `ship` on a ready change: `confident` → open the PR and finish without asking **only when**
confidence is high and risk is low; below that bar, or `always-manual`, the human gate fires. Lets a
developer opt into hands-off shipping of safe changes. Follows the two-question pattern when absent.

### `merge_mode` flow

Read by `feature-implement` before the final merge step: `auto-merge` → hand the ready PR to your own
merge process; `stop-before-merge` → stop at "PR ready" for human review. Galy's kit never merges for
you — the merge is always your CI/process (extension point). This option only decides whether the loop
pauses for you before it.

### The three release options — they describe YOUR pipeline

The kit never merges and never deploys. These three say what happens on the far side of that
handoff, so that a skill written for a repository does not have to guess:

- **`release_trigger`** — `merge-ships` when reaching the default branch reaches production;
  `separate-call` when a distinct step ships it after the merge.
- **`release_hold`** — `hold-for-a-human` stops before the release and waits; `go-when-green`
  lets it go once the checks pass. On a chain where merging already ships, there is nothing left
  to hold: say that rather than pretend the pause exists.
- **`rollback_mode`** — `revert-and-reship`, `redeploy-previous`, or `no-way-back`.

**`no-way-back` is a real answer and the most useful one to store.** A team without a rollback
that is forced to pick between two procedures it does not have has just been handed an invention,
and the skill will recite it on the day it matters.

Two of the three default to `ask`, and that is deliberate: the trigger and the rollback are
**facts about a pipeline**, not preferences. A silent default would invent them. `release_hold`
defaults to holding, because doing nothing must never make a release leave.

They are also the three that `adapt` proposes a starting value for, from what `delivery` actually
read — proposes, then asks. An observation is not consent.
