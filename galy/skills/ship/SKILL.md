---
name: ship
description: Commit your work, open a PR, and run a self-review panel (correctness / security / conventions / perf sub-agents over the diff), fix the blockers, and end at "PR ready". It does NOT merge — the merge is your own CI/process (extension point). The diff stays in your repo; nothing is sent to Galy.
---

# ship — commit, PR, self-review panel, PR ready

Take a working change from "code written" to "PR ready": commit, push, open the PR, run an adversarial
self-review panel over the diff, auto-fix the blockers, and stop at **PR ready**. This kit **never
merges** — merging is your own CI/process (the extension point below).

## Steps

1. **Stage + commit.** Review the diff; write a clear commit message in the repo's convention. Branch if
   you are on the default branch.
2. **Open the PR** (draft) against the base branch, with a concise body: what changed, why, how it was
   verified. Link the Galy spec if this ships one.
3. **Run the review panel** per `${CLAUDE_PLUGIN_ROOT}/instructions/review-lenses.md`:
   - Detect mode (light for docs-only, panel of 4 lenses otherwise).
   - Spawn the lenses as fresh sub-agents over the full diff + the changed files read in full + the
     repo's own conventions. Each is adversarial — find problems, never validate.
   - Dedup + confirm each finding by re-reading the cited lines; drop false positives.
   - Auto-fix every retained blocker (and clear-win warning) with `business_impact = false`; commit;
     re-run the panel on the new HEAD; max 3 rounds.
   - Escalate only `business_impact = true` findings to the user.
4. **Mark the PR ready.** Confidence high and 0 blockers → mark it ready for review. Apply the
   `ship`/`auto_ship` default (see `${CLAUDE_PLUGIN_ROOT}/instructions/workflow-defaults.md`):
   `confident` + high confidence + low risk → finish hands-off; otherwise the human gate fires.
5. **Report.** Print the PR link, the panel outcome (N found / M fixed, rounds), and the naked verdict.

## Extension point — merge (not done here)

The kit stops at PR ready by design. Wire your own merge to whatever you already run: a GitHub/GitLab
merge queue, a required CI check, a human approval. If you want a post-ready hook (e.g. auto-merge on
green CI), document it in your `CLAUDE.md` and trigger it from your own tooling — never from this skill.

## Discipline

- **Never merge.** "PR ready" is the terminal state of this skill.
- **The diff stays local.** The review runs on your machine; no code is sent to Galy.
- **You are not the last reviewer.** The panel + your CI are behind you — shipping compiling,
  panel-clean code is the correct mode.
