# Review lenses — the self-review panel

Loaded by `ship` (and reusable by `analyse`) to run an adversarial review of the working diff before a
PR is marked ready. Independent sub-agents (fresh context) review the diff so they carry no author bias.
Everything stays inside your repository — the diff is never sent to Galy.

## When it runs

After the build is green, before the PR is marked ready. The orchestrating skill — never the authoring
context — spawns the reviewers.

## Mode detection

Look at the changed files. If **every** changed file is non-code (docs, markdown, config text) → **light
review** (1 generalist agent). Otherwise → **panel** (4 lenses).

## Findings schema

Each lens returns JSON `{ findings: [...] }`, one entry =
- `lens` — correctness | security | conventions | perf
- `severity` — blocker | warning | nit
- `file` / `line`
- `title` — one line
- `rationale` — why it's a real issue (≤2 lines)
- `suggested_fix` — concrete change
- `business_impact` — true if the fix changes user-facing behavior (→ escalate to human)

## The 4 lenses (panel)

Spawn all four in parallel, each with the full diff + the changed files read in full + your repo's
conventions (its `CLAUDE.md`/`AGENTS.md`). Each is **adversarial — find problems, never validate**:

1. **correctness** — logic bugs, null/edge cases, off-by-one, async misuse, broken contracts, swallowed
   exceptions.
2. **security** — injection, missing auth/permission checks, IDOR, secret/PII leakage in logs or
   responses, unvalidated input, CSRF on state-changing endpoints.
3. **conventions** — violations of the repo's own conventions and style; invented APIs; over-commented
   code (a new comment is a violation unless critical to understanding, ≤14 words, no ticket ids).
4. **perf** — N+1 queries, unnecessary materialization, work in a loop, large allocations on hot paths.

Also apply, on the conventions/correctness lenses: is there a simpler, more idiomatic approach? Will it
hold as the codebase grows? Are edge cases and error paths covered?

## Dedup + vote

Merge findings by signature `lens+file+line+title`. A finding is **retained** when a lens reports it AND
it survives a confirmation re-read (the orchestrator re-reads the cited lines and confirms it is real on
the current diff). Drop anything the re-read refutes — false positives must never gate.

## Auto-fix loop

For every retained `blocker` (and clear-win `warning`) with `business_impact = false`: fix in the working
tree, commit, re-run the panel on the new HEAD. Repeat until 0 blocker, **max 3 rounds**. After 3 rounds
with residuals → escalate to human with the residual list.

## Human escalation

Only `business_impact = true` findings reach the user — anything changing what an end user
sees/experiences. Everything technical, the assistant fixes autonomously.
