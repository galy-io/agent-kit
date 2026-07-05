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
npx galy-setup <your-galy-token>
```

Get your token from **galy.io → Settings → Connect your assistant**. `galy-setup` installs the plugin,
writes your local `.galy/config.json`, and registers the MCP endpoint with the Bearer token.

### Option B — via the plugin marketplace

```
claude plugin marketplace add galy-io/claude-kit
claude plugin install galy
```

Then add your token to `.galy/config.json` at your repo root:

```json
{ "endpoint": "https://gooal-prod.azurewebsites.net", "token": "<your-galy-token>" }
```

`.galy/config.json` is gitignored — never commit your token.

## What you get

Ten skills that take a need from idea to shipped, each driven by the Galy objects you manage:

| Skill | What it does |
|---|---|
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

A shell-friendly companion to the MCP tools — list and search work items, and pull/push the large
markdown bodies of briefs and specs as local files:

```
galy whoami
galy search "seller onboarding" --type brief
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
  .mcp.json                       # Galy MCP endpoint (Bearer auth set by galy-setup)
  skills/<name>/SKILL.md          # the 10 skills
  instructions/                   # shared conventions the skills reference
  contract/pm-v1.json             # the project-management tool contract
  contract/conformance/           # the outward-only conformance suite
  bin/galy.mjs                    # the galy CLI
```

## License

Proprietary — see [LICENSE](LICENSE). Use is tied to a valid Galy account.
