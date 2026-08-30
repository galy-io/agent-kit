---
name: onboarding
description: The first pass over a repository — tour the ground, observe what is actually there against the twenty maturity criteria, write the missing doctrine and infrastructure notes as proposals, and record every observation in Galy. Run it when a repository has never been looked at, or when its baseline has gone stale. It reads, it proposes, it records; it changes nothing on its own and sends nothing outside.
---

# onboarding — the first pass

This is the moment that decides whether the practice panel is worth anything. A grid filled in by hand
is an opinion; a grid filled in by what you actually saw is a dated fact.

**The rule that commands everything else: you never tick, you observe.** If you did not look, the state
is "not verifiable" with its reason — and that is a perfectly healthy result, not a failure.

The twenty criteria are not a list to read out. They are the steps of this pass.

## Say this before you start

Out loud, in the user's language, before the first tool call — it is what makes the pass acceptable:

- **You change nothing.** Everything you write is proposed, never applied, never merged.
- **You send nothing outside.** No source, no host name, no evidence leaves the machine. Galy receives
  observations about practices; it never receives code — that is the product's guarantee and yours.
- **You never copy a secret.** What you find is counted and located; its value goes nowhere — not into
  evidence, not into your reply, not into a file. The server redacts too, but that is a net, not your
  discipline.
- **You attempt no forbidden action** until an administrator has explicitly enabled it.

And announce the expected result **before** starting, not after: a first pass where half the grid is grey
is normal. A first pass that came out all green would be suspicious.

## The order

1. **Open the pass** — `mcp__galy__maturity_start_run` with `kind: "onboarding"`. Keep the `run_id`;
   every observation belongs to it.
2. **Stand on measured ground** — `mcp__galy__maturity_run_probes`. What the instance can see by itself,
   it sees by itself. Do not spend your judgement on what a probe already answered.
3. **Read what is left** — `mcp__galy__maturity_challenge`. It gives the level reached, what is already
   observed, what has never been looked at, and what is at risk. Start with what has never been looked
   at: re-observing fresh green buys nothing.
4. **Tour the ground** — tree, technologies, entry points, what moves and what sleeps. Look for the
   written doctrine. Look for the infrastructure description.
5. **Observe, criterion by criterion**, recording each with `mcp__galy__maturity_record`.
6. **Write what is missing** — see below. This is the half that leaves something behind.
7. **Report** — the format is at the end.

## Observing without guessing

A few examples of what separates an observation from an impression. The list is not exhaustive; the
principle is.

| Criterion | What you look at | Where the nuance is |
|---|---|---|
| `doctrine_written` | root instruction file and per-domain rules; last commit date of each | **partial** if the doctrine exists but has not moved in six months while the code has |
| `infrastructure_described` | the document exists; cross-check its claims against reality (DNS resolves, host reachable) | **partial** as soon as one claim no longer holds. **Absent** if there is none — and then you write it, as a proposal |
| `no_secrets_in_repo` | walk the **history**, not just the current tree | give an account: bearing commits, distinct files, nature of the imprints, date of the most recent, depth walked. **Not verifiable** if history is truncated — then say how far you went |
| `quality_gate_blocks` | the gate exists and runs; look over 90 days for **a failure that stopped a merge** | **partial** if it runs having never refused anything: a gate that never refused is not a gate, it is a display |
| `rollback_proven` | the procedure is written **and** it has already been used | **partial** if written without an observed execution. Common and legitimate in a young team — but it does not get dressed up as green |
| `changes_reviewed` | over 90 days: share of merge requests opened by an agent, and share of those reviewed before merge | an automated review counts, if it leaves a named trace |

**When a power exists without its guard**, pass `unguarded_power: true`. The server will then refuse the
green and raise it to the top of the page. That is the intended behaviour: "the agent can change the
schema, and nothing traces what it does" must worry, not reassure.

**When you could not look**, `state: "unverifiable"` with `unverifiable_reason` — no access, no right,
probe inapplicable to this stack. The server refuses a grey without a reason.

**Read the returned state**, not the one you asked for. `maturity_record` answers with the state it
actually stored, which an unguarded power pushes down. Report what came back.

## Writing what is missing

Observing an absence and leaving it there wastes the pass. Two criteria are cheap to settle on the spot,
carry no risk, and unlock most of level 1 — do them while you are here, as **proposals the user accepts
or drops**:

- **`doctrine_written`** — if there is no root instruction file, draft one from what you just toured:
  the stack, how to build, test and run, the naming and commit conventions you inferred from history,
  and above all **the rules whose violation costs real data**. Keep it to what a session must read in
  full every time; a doctrine nobody finishes is a doctrine nobody applies. Show it, do not commit it.
- **`infrastructure_described`** — if there is no description, write down what you were able to verify:
  what runs where, which host answers, who holds the keys. **Never a password, never a token** — where
  the key lives, never its value. Mark every claim you could not check as unverified rather than
  dropping it; a document that only holds the easy half is worse than a short one.

Then record the criterion on what is **true now**, not on your proposal: a draft the user has not
accepted is not a written doctrine. Record `absent`, say the draft is waiting for them, and let the next
pass turn it green.

Do not do the same for the criteria that grant a power — tooling, deployment rights, schema paths. Those
are decisions, not chores, and they belong to the team.

## What you hand back

Four things, in this order:

1. **What you observed** — how many criteria, in which states, out of twenty. Give the full denominator:
   "6 observed out of 20, of which 9 not verifiable". Never a percentage of what you managed to look at.
2. **What is at risk**, if anything — a power whose guard you did not see. First in your reply, before
   the good news.
3. **The open questions**, ordered by what they unlock, phrased for a human and not for an engineer. A
   question that unlocks four criteria goes ahead of one that unlocks one.
4. **A single next step**, with its duration and its risk. Not a shopping list: one step.

Levels 1 and 2 cost **no risk** and unlock half the value: describing your infrastructure, getting your
secrets out of the repository, exposing your domain through a tool contract grants no write right at
all. It is the best first step to offer a wary IT department, and it is worth saying on the first screen.

## The tone

You challenge, you do not judge. The difference fits in one sentence: "your quality gate has refused
nothing in 90 days — so it blocks nothing" is a useful observation; "your practices are immature"
teaches nobody anything and ends the conversation.
