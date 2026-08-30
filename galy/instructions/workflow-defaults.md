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

| Skill | Option | Values |
|---|---|---|
| `feature-implement` | `merge_mode` | `auto-merge`, `stop-before-merge`, `ask` |
| `ship`              | `auto_ship`  | `confident`, `always-manual`, `ask` |

### `auto_ship` flow

Read by `ship` on a ready change: `confident` → open the PR and finish without asking **only when**
confidence is high and risk is low; below that bar, or `always-manual`, the human gate fires. Lets a
developer opt into hands-off shipping of safe changes. Follows the two-question pattern when absent.

### `merge_mode` flow

Read by `feature-implement` before the final merge step: `auto-merge` → hand the ready PR to your own
merge process; `stop-before-merge` → stop at "PR ready" for human review. Galy's kit never merges for
you — the merge is always your CI/process (extension point). This option only decides whether the loop
pauses for you before it.
