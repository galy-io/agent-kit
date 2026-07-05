# Workflow defaults — per-user, server-side (with a local mirror)

Per-developer preferences for skills that gate on a default behaviour (ship / merge / auto-deploy).
The **source of truth is the Galy server**, read and written through the MCP tools
`workflow_default_get_all`, `workflow_default_set`, `workflow_default_unset`. A local
`.galy/workflow-defaults.json` is kept as a **mirror** so headless/cron runs without MCP still
have the values. **Never commit the mirror** (it is gitignored under `.galy/`).

## Model

- **Server (authoritative):** `workflow_default_get_all` returns the current user's full map;
  `workflow_default_set(skill, option, value)` upserts one; `workflow_default_unset(skill, option)` removes one.
- **Mirror** (`.galy/workflow-defaults.json`): rewritten on every set/unset; the fallback when the
  Galy MCP is unavailable.

Values are canonical machine strings; the reserved value `"ask"` forces the question every run.
**Persist canonical values, never localized labels** — labels move, the stored value must stay
stable. The skill maps the question label to the canonical value before writing.

## Read + ask pattern

Before any related question to the user:

1. **Fetch** the user's defaults via `workflow_default_get_all`; if the MCP is unavailable, read the
   `.galy/workflow-defaults.json` mirror (missing file = `{}`).
2. Lookup `<skill>.<option>`.
3. **Found and != `"ask"`** → apply silently, log `[workflow-default] <skill>.<option> = <value>`, continue.
4. **Absent** → ask **two** questions in one turn: Q1 (this run, skill-specific labels) + Q2 (future
   default, same choices **plus** "Always ask" → `"ask"`). Before continuing with Q1, persist Q2:
   `workflow_default_set(skill, option, q2)` **and** rewrite the mirror.
5. **Stored == `"ask"`** → ask **only Q1**; persist nothing.

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
