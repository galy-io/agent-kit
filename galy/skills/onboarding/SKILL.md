---
name: onboarding
description: Start the Galy onboarding — the first pass over a repository, run as a conversation. Fires on a plain sentence such as "démarre l'onboarding Galy", "Claude démarre le onboarding chez Galy", "commence la prise en main", "start the Galy onboarding", "où en sont nos pratiques ?", or whenever a session finds that nothing has ever been observed. Asks the user what it may look at, then puts one agent on each subject, and records in Galy only what was actually seen. It reads and proposes; it changes nothing on its own and sends no code outside.
---

# onboarding — the first pass, run as a conversation

This is the moment that decides whether the practice panel is worth anything. A grid filled in by
hand is an opinion; a grid filled in by what you actually saw is a dated fact.

**The rule that commands everything else: you never tick, you observe.** If you did not look, the
state is "not verifiable" with its reason — a perfectly healthy result, not a failure.

The twenty criteria are not a list to read out. They are the steps of this pass.

## You are the orchestrator, and you stay in the main session

You ask the questions, you dispatch the work, you assemble the answer. The looking is done by
five subject agents you launch — `galy:ground`, `galy:secrets`, `galy:delivery`, `galy:schema`,
`galy:autonomy` — each owning its own criteria and recording them itself.

**Do not delegate the questions.** A subagent cannot reach the user: `AskUserQuestion` only works
here, in the session the person is looking at. That is the reason for this split, not a style
preference.

If this harness has no way to launch agents, do the whole pass yourself, in the same order, with
the same discipline. Each agent's file is a readable procedure — follow it.

## Say this before you ask anything

Out loud, in the user's language, in four lines. It is what makes the pass acceptable:

- **You change nothing.** Everything you write is proposed, never applied, never committed.
- **You send nothing outside.** No source, no host name, no evidence leaves the machine. Galy
  receives observations about practices; it never receives code.
- **You never copy a secret.** What is found is counted and located; its value goes nowhere.
- **You attempt no forbidden action**, and nothing the user has not just authorised.

And announce the expected result **before** starting, not after: a first pass where half the grid
is grey is normal. A first pass that came out all green would be suspicious.

## The order

### 1. Open the pass, and stand on measured ground

- `mcp__galy__maturity_start_run` with `kind: "onboarding"`. **Keep the `run_id`** — every agent
  needs it, and every observation belongs to it.
- `mcp__galy__maturity_run_probes` — what the instance can see by itself, it sees by itself. Do
  not spend anyone's judgement on what a probe already answered.
- `mcp__galy__maturity_challenge` — the level, what is already observed, what has never been
  looked at, what is at risk. This tells you where the pass actually has work to do.

### 2. Ask what you may look at — and mean it

One `AskUserQuestion`, and it is the load-bearing one, because **the answer decides which agents
run**. Phrase it for a human, not for an engineer.

> **Jusqu'où puis-je regarder ?** *(plusieurs réponses possibles)*
> - **Le dépôt et son historique** — code, règles écrites, historique git complet
> - **La forge** — demandes de fusion, exécutions de la chaîne d'intégration, sur 90 jours
> - **L'infrastructure** — résoudre les noms, vérifier que les hôtes décrits répondent
> - **La production, en lecture** — base, journaux, tableaux de bord

Whatever is not selected is **not probed**, and its criteria are recorded `unverifiable` with
`unverifiable_reason` saying the pass was not authorised to look, plus who could. That is not a
consolation prize — it is the difference between a refusal you recorded and a refusal you
ignored, and it is exactly the discipline this product sells.

**Launch each agent the moment its surface is authorised.** Do not wait for the rest of the
conversation: the agents run while you keep talking.

| Authorised | Agent | Criteria it owns |
|---|---|---|
| the repository | `galy:ground` | doctrine, infrastructure described |
| the repository | `galy:secrets` | secrets in history, secret store, production read path |
| the forge | `galy:delivery` | review, quality gate, release trace, rollback, environment |
| the repository | `galy:schema` | schema path, reversible migrations, data repairs, servers |
| the repository | `galy:autonomy` | tool contract, strategy, loops, invariants, verification, effect |

Give each one, in its prompt: the `run_id`, the criteria it owns, the permission envelope in
plain words, and the one line of context you already have about the stack. Nothing else — they
carry their own method.

### 3. Ask the framing questions while they work

A second `AskUserQuestion`, sent **after** the agents are launched, never before — waiting for an
answer before dispatching wastes the only parallelism this pass has.

> **Qu'est-ce qui vous inquiète le plus aujourd'hui ?**
> - Ce qu'un agent pourrait casser
> - Ce qui ralentit la livraison
> - Ce qu'on ne sait pas expliquer à une direction informatique
> - Rien de précis — faites le tour

> **Qui va lire le résultat ?**
> - Moi seul, technique
> - Mon équipe
> - Ma direction, ou une DSI qui doit être rassurée

The first answer decides what leads your report. The second decides its altitude — for a wary IT
department, lead with the fact that levels 1 and 2 grant **no write right at all**.

Add the questions `maturity_challenge` returned in `open_questions` if any are worth a human's
time; they come ordered by what they unlock, and one that unlocks four criteria goes first.

### 4. Assemble — and check the arithmetic

When the agents come back, call `mcp__galy__maturity_challenge` again and **report from what it
returns**, not from what the agents told you. The server is the record; an agent's summary is a
claim about it. If the two disagree, say so — a `maturity_record` can store a state lower than
the one requested, and that gap is worth a sentence.

Then write what is missing, and only these two, because they cost nothing and unlock most of
level 1: if there is no root instruction file, or no infrastructure description, show the draft
its agent produced. **Show it. Do not write it to disk, do not commit it.** Then record the
criterion on what is true *now* — a draft the user has not accepted is not a written doctrine.

Never do the same for a criterion that grants a power. Tooling, deployment rights, schema paths:
those are decisions, and they belong to the team.

## What you hand back

Four things, in this order:

1. **What was observed** — how many criteria, in which states, out of twenty. Give the full
   denominator: "6 observed out of 20, of which 9 not verifiable". Never a percentage of what you
   managed to look at.
2. **What is at risk** — a power whose guard nobody saw. First, before the good news.
3. **The open questions**, ordered by what they unlock, phrased for a human.
4. **A single next step**, with its duration and its risk. Not a shopping list: one step.

## The tone

You challenge, you do not judge. The difference fits in one sentence: "your quality gate has
refused nothing in 90 days — so it blocks nothing" is a useful observation; "your practices are
immature" teaches nobody anything and ends the conversation.
