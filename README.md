# Galy Claude Kit

Drive your work in [Galy](https://galy.io) — strategy, briefs, specs — and let **your own** Claude Code
read those objects and implement them **in your own repository**.

Galy is an agent-native project-management tool. You define the *why* (strategy → briefs) and the *how*
(specs) inside Galy; this kit connects your assistant to that workspace over MCP so it can plan,
implement, and follow up — without you ever copy-pasting a ticket into a prompt.

## Galy never sees your code

This is the core guarantee, enforced end to end:

- The flow is **strictly outward**. Your assistant *reads* strategy, briefs and specs from Galy, and
  *writes back* plans, statuses and follow-ups. That's it.
- **No tool accepts source code, a diff, or file content** — verified by the conformance suite
  (`galy/contract/conformance`), which fails if any verb ever declares a `code` / `diff` / `file_content`
  parameter.
- Your codebase is explored **locally** by your assistant. It never leaves your machine.

You are connecting *your assistant* to *your Galy workspace* — not giving Galy access to your repository.

## Install

### Option A — one command (recommended)

```
npx -y github:galy-io/claude-kit <your-galy-token> --endpoint https://<your-workspace>.galy.cloud
```

Both values are on one page in Galy — **Settings → Connect your assistant** — which prints that exact
command with your address already filled in, and a copy button. Only the workspace owner sees it.

`galy-setup` installs the plugin, registers the MCP endpoint **for that project only** (address and
token stored literally in Claude Code's local scope, outside your repository), writes
`.galy/config.json` for the CLI, gitignores it, and tests the connection before saying it worked.

There is no default address, on purpose: Galy is multi-tenant, and every workspace answers on its own
host. A guessed host does not fail loudly — it fails as a `401` that reads like a bad token.

### Option B — via the plugin marketplace

```
claude plugin marketplace add galy-io/claude-kit
claude plugin install galy
```

The plugin declares no MCP server of its own, so it has nothing to connect to yet. Open Claude Code in
your repository and it will say so and point you at the `connect` skill — or run the `galy-setup`
command above, which does the same thing in one line.

Your token never goes into a tracked file, a shell profile, or the Windows registry.

## It starts on its own

Opening Claude Code in a connected repository **triggers the conversation about your practices** — you
do not have to know what to type. A `SessionStart` hook hands the session one instruction: read the
practice baseline through `maturity_challenge` before answering, and open with a single line — where
you stand, and the one next step. If something is at risk, that comes first.

The hook is offline. It calls nothing, reads no token, and stays silent in repositories that have
nothing to do with Galy. A repository that has never been observed is offered the first pass once; a
repository already connected is challenged at most once every twelve hours.

Nothing has to be typed as a command. **A plain sentence starts the first pass** — "démarre
l'onboarding Galy", "start the Galy onboarding", "où en sont nos pratiques ?", "fais le point" — and
the `audit` skill takes it from there.

## The first pass is a conversation, not a script

`audit` orchestrates from your own session: it opens the pass, runs the probes the instance can
run alone, then **asks you what it may look at** — the repository and its history, the forge, the
infrastructure, production in read. Each authorised surface immediately puts a **subject agent** on
it, and they work in parallel while the conversation continues.

| Agent | What it observes |
|---|---|
| `project-management` | **first, alone** — where briefs, specs, tickets and objectives already live, and whether an assistant can reach them |
| `ground` | the written doctrine, and whether the infrastructure description still matches reality |
| `secrets` | the git history, the secret store, and whether production can be read without being able to write |
| `delivery` | review, quality gate, release trace, rollback, environment isolation — over 90 days of forge history |
| `schema` | the tooled schema path, reversible migrations, gated data repairs, server access |
| `autonomy` | the tool contract, strategy in the system, and the four criteria of unattended work |

**What you do not authorise is not probed**, and its criteria are recorded as not verifiable with the
reason — never guessed, never quietly skipped. The questions gate the work; they are not a formality.

The questions stay in your session on purpose: a subagent cannot reach you, so the orchestrator asks
and the agents look.

## It fits into what you already have — as a pull request

`project-management` runs **first and alone**, because one fact changes the meaning of everything
else: *where does your work already live?* A team that tracks its briefs and tickets in an existing
system will not move them, and should not have to.

What comes out of it is not a report but a **pull request**, opened by `adapt`:

- one **delimited section added** to your root instruction file — who owns what, which id shape
  belongs to which system, and the rule that nothing existing changes;
- **skills bound to your environment**, written beside your own — your server names, your id shapes,
  your branch and commit conventions read from your history.

Name collisions are the common case, not the edge case: a team already working this way has skills
called `feature-spec` and `feature-implement` too. `adapt` never overwrites one. It either skips
yours — saying what Galy would have added — or ships its own under a `galy-` prefix, and tells you
how to tell them apart.

No workflow is edited, no command renamed, no `.mcp.json` touched, and **the pull request is never
merged**. Your review is the point.

## What the skills do on their own, and what they stop to ask

Every preference answers one question: when a skill reaches a step it could take unattended —
committing a reviewed change, opening the pull request, moving to the next phase — does it take it,
or does it stop and ask you?

Two layers decide, and the top one wins: your **administrator's policy** for the whole workspace —
`allow`, `deny`, or `user_choice`, set per skill and per option — and, under `user_choice`, **your
own preference**. Both live on your Galy account, so they follow you from one checkout to the next;
a local `.galy/workflow-defaults.json` mirrors the user layer for headless runs, and is never
committed.

Ask "quels réglages Galy sont actifs ?" and the `workflows` skill shows the table, says who decided
each line, and links the page on your account. `ask` is always a real answer, never a fallback: a
developer who wants the question every time has decided to stay in the loop.

None of it makes the kit merge or deploy. It **stops at "PR ready"** — a documented boundary, not a
gap — and the merge stays with the process you already have.

### Nothing leaves your instance

No verb in this kit sends anything out of your tenant. **Support is blind by construction**, and
nothing in the contract can change that.

The first pass finishes by **writing** a retrospective — what worked, what was awkward, the
questions it could not answer, your suggestions — about the onboarding process itself. It is
written to your own instance and nothing is asked, because writing in your own workspace asks
nobody's permission.

Whether that instance forwards anything to Galy is an **instance setting your administrator holds**,
disabled by default. It is not a question put to the developer at the terminal, and no skill
pretends otherwise.

## What you get

Fifteen skills that take a need from idea to shipped, each driven by the Galy objects you manage:

| Skill | What it does |
|---|---|
| `audit` | Where your practices stand, first pass and every one after: audit how you already track work, open the adapting pull request, observe the twenty criteria, record what was seen. Applies nothing. |
| `adapt` | Turn the kit's generic skills into skills bound to your environment, as a pull request. Never overwrites, never merges. |
| `connect` | Wire a repository to your workspace, or diagnose a connection that answers nothing. |
| `workflows` | See and change what the skills may do on your behalf — and what your administrator decided for everyone. |
| `bug-fix` | A bug from report to pull request: reproduce first, fix the cause, prove it on the user's own path, leave a follow-up check. |
| `strategy` | Explore your objectives tree (read-only) and map work to the objective it serves. |
| `feature-brief` | Frame a business need into a brief — problem, vision, user stories, success criteria. |
| `feature-spec` | Turn a brief into a technical spec — explore your codebase, design, phases, risks, acceptance tests. |
| `feature-implement` | Implement a spec autonomously in your repo, phase by phase, ending at "PR ready". |
| `feature-followup` | Replay a delivered spec's checks in production and reschedule the next horizon. |
| `retro` | Post durable learnings from a run as retro suggestions for later review. |
| `contrarian` | Challenge an idea before you commit — adversarial sub-agents + a verdict you own. |
| `analyse` | Meta-reflection on the assistant's own behavior, producing concrete rule edits. |
| `ship` | Commit, open a PR, run a self-review panel, fix blockers — ends at "PR ready" (never merges). |
| `end` | Celebrate a verified delivery with a live deep link. |

The kit **stops at "PR ready"** on purpose. Merging and deploying stay with your own CI/process — a
documented extension point, not a gap.

## The `galy` CLI

A shell-friendly companion to the MCP tools — search work items, read compact JSON cards, and pull/push
the large markdown bodies of briefs and specs as local files:

```
galy search "seller onboarding"
galy brief 12
galy spec 42
galy content pull feature-spec 42     # → .tmp/galy-content/feature-spec/42.md
galy content push feature-spec 42     # after you edit the buffer
```

It reads its config from `GALY_ENDPOINT` / `GALY_TOKEN` or `.galy/config.json`. Like the tools, it only
carries work items and their text — never your source.

## Layout

```
.claude-plugin/marketplace.json   # marketplace entry
galy/
  .claude-plugin/plugin.json      # plugin manifest
  hooks/hooks.json                # SessionStart — what makes it start on its own
  hooks/session-start.mjs         # offline: decides whether Galy has anything to say here
  agents/<name>.md                # the 6 subject agents the first pass dispatches
  skills/<name>/SKILL.md          # the 15 skills
  instructions/                   # shared conventions the skills reference
  contract/pm-v1.json             # the project-management tool + REST contract
  contract/conformance/           # the outward-only conformance suite (MCP + REST)
  bin/galy.mjs                    # the galy CLI
package.json                      # makes the repo itself runnable: npx -y github:galy-io/claude-kit
setup/setup.mjs                   # the one-command setup
```

## License

Proprietary — see [LICENSE](LICENSE). Use is tied to a valid Galy account.
