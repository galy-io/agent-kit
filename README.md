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

Both values are on one page in Galy — **Connect my agent**, in the top bar of any screen — which prints
that exact command with your address already filled in, and a copy button. Every active member of the
workspace reaches it and mints **their own** token: a borrowed one would attribute your check-ins and
every access-log line to somebody else.

It installs the plugin, registers the MCP endpoint **for that project only** (address and token stored
literally in Claude Code's local scope, outside your repository), writes `.galy/config.json` for the
CLI, gitignores it, and proves the connection before saying it worked — by shaking hands with `/mcp`,
the door your assistant will actually use, rather than with the REST surface it will not.

There is no default address, on purpose: Galy is multi-tenant, and every workspace answers on its own
host. A guessed host does not fail loudly — it fails as a `401` that reads like a bad token.

### Option B — via the plugin marketplace

```
claude plugin marketplace add galy-io/claude-kit
claude plugin install galy
```

The plugin declares no MCP server of its own, so it has nothing to connect to yet. Open Claude Code in
your repository and it will say so and point you at the `connect` skill — or run the one-command form
above, which does the same thing in one line.

Your token never goes into a tracked file, a shell profile, or the Windows registry.

### How updates reach you

The marketplace tracks this repository, so a skill improved here reaches every installation without
anyone reinstalling anything — that is the whole point of shipping through a marketplace rather than a
copy per client. What it does not do is arrive the same second: your agent refreshes its marketplace
cache on its own schedule. To pull the current state right now:

```
claude plugin marketplace update galy
```

## It starts on its own

Opening Claude Code in a connected repository **triggers the conversation about your practices** — you
do not have to know what to type. A `SessionStart` hook hands the session one instruction: read the
practice baseline through `maturity_challenge` before answering, and open with a single line — where
you stand, and the one next step. If something is at risk, that comes first.

The hook is offline. It calls nothing, reads no token, and stays silent in repositories that have
nothing to do with Galy. A repository that has never been observed is offered the first pass once; a
repository already connected is challenged at most once every twelve hours.

## What you get

Twelve skills that take a need from idea to shipped, each driven by the Galy objects you manage:

| Skill | What it does |
|---|---|
| `onboarding` | The first pass: tour the repository, observe where practices stand against the twenty criteria, draft the missing doctrine, record what was seen. |
| `connect` | Wire a repository to your workspace, or diagnose a connection that answers nothing. |
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
  skills/<name>/SKILL.md          # the 12 skills
  instructions/                   # shared conventions the skills reference
  contract/pm-v1.json             # the project-management tool + REST contract
  contract/conformance/           # the outward-only conformance suite (MCP + REST)
  bin/galy.mjs                    # the galy CLI
package.json                      # makes the repo itself runnable: npx -y github:galy-io/claude-kit
setup/setup.mjs                   # the one-command setup
```

## License

Proprietary — see [LICENSE](LICENSE). Use is tied to a valid Galy account.
