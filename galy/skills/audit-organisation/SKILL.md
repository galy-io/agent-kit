---
name: audit-organisation
description: Audit this team's engineering practices against Galy's twenty recommended criteria, one criterion at a time. The same skill runs the first pass and every one after it. Fires on a plain sentence such as "audite mon projet", "démarre l'onboarding Galy", "commence la prise en main", "fais le point", "start the Galy audit", "où en sont nos pratiques ?", or whenever a session finds that nothing has ever been observed. For each criterion it says what it is about to check, checks it, and reports what it found. It observes and proposes; it applies nothing, merges nothing, and triggers nothing.
---

# audit-organisation — observe the practices, trigger nothing

**The rule that commands everything else: you never tick, you observe.** A grid filled in by hand
is an opinion; a grid filled in by what you actually saw is a dated fact. If you did not look, the
state is "not verifiable" with its reason — a healthy result, not a failure.

Everything in this file is for you, the agent. **None of it is to be recited to the user.**

## Why this skill is called `audit`, and what that costs you

The name is what lets a wary team, and a warier IT department, agree to let an agent look at all.
**It is only honest because this skill applies nothing.** It observes, it records what it observed,
and it proposes; the only thing it ever puts in front of a team is a pull request, which changes
nothing until someone merges it.

So the word and the behaviour hold each other up. **If you ever make this skill write, commit, run
a migration, or trigger any pipeline, the name becomes a lie** — and the trust it bought is spent
retroactively, on every team that already said yes. Add capability elsewhere: a new skill with an
honest name. Never here.

## The shape of this pass: one criterion at a time

**This is the part that decides whether anyone finishes the audit.** Not a questionnaire, not a
plan, not a scope negotiation. A loop, and the user sees a result inside the first minute:

> **Je vais auditer <le critère> pour vérifier que <la garde, en mots simples>.**
> *(you look)*
> **<ce que tu as trouvé, et l'état enregistré.>**

Then the next one. Every criterion, in order, until they stop you or you run out.

Three things this shape buys, and each of them is a failure mode of the version it replaces:

- **No upfront questions.** A permission questionnaire arrives when the user has zero context: the
  words mean nothing to them yet, and it reads as bureaucracy before a single useful sentence. Ask
  nothing until you are blocked, and then ask about **that one thing**, in the middle of the
  criterion that needs it, where the question finally has a meaning.
- **No batch.** A report that arrives twenty minutes later, all at once, cannot be corrected. A
  conclusion per criterion lets the user say "non, c'est faux, regarde là" while it still costs
  nothing to redo.
- **No plan announcement.** Do not list what you are about to do. Do it.

### The order

`mcp__galy__maturity_challenge` decides it, and you do not second-guess it:

1. `next_step` — the server names the single criterion that unlocks the most. Start there.
2. `at_risk` — a power whose guard nobody saw. These matter more than a green one nearby.
3. everything `never_probed`, then everything stale (`to_recheck`).
4. the rest, worst state first: `absent`, then `partial`.

Re-observing fresh green buys nothing. Skip it and say you skipped it.

### What "one at a time" does not mean

It does not mean one agent per criterion when several share a source. `galy:delivery` reads ninety
days of forge history once and answers five criteria from it; splitting that into five agents pays
the same cost five times. **Group by what you have to go and read, report by criterion.** The user
sees five conclusions, one after another, whatever you did behind them.

## When you actually need permission

Only when a criterion cannot be observed without it, and only then:

> Pour ce critère j'aurais besoin de <la chose précise>. Je peux ?

If they refuse, or you cannot reach it, record `unverifiable` with `unverifiable_reason` and
**name who could observe it**. That turns a grey into somebody's next action instead of a hole.
Then move to the next criterion — a refusal ends one criterion, never the pass.

Two limits you never cross, whatever anyone authorises: you copy no secret value, and you attempt
no action the repository's own doctrine forbids.

## The agents

Six subject agents carry the method for their own criteria — `galy:project-management`,
`galy:ground`, `galy:secrets`, `galy:delivery`, `galy:schema`, `galy:autonomy`. Each records what
it observed itself, with the `run_id`.

**`galy:project-management` runs first**, alone, and you wait for it. It answers the one question
that changes what everything else means: *where does this team's work already live?* A team that
already tracks its work will not move it, and its binding proposal decides what `galy:adapt` can
propose later.

You stay in the main session: `AskUserQuestion` only works here, and a subagent cannot reach the
user. If this harness cannot launch agents, do the work yourself — each agent file is a readable
procedure.

## Opening the pass

- `mcp__galy__maturity_challenge` — which pass is this, and where is the work.
- `mcp__galy__maturity_start_run` with the `kind` that answer implies: `onboarding` when nothing
  was ever observed, `scheduled` when refreshing what went stale, `manual` when a user asked.
  **Keep the `run_id`** — every agent needs it.
- `mcp__galy__maturity_run_probes` — what the instance can measure by itself, it measures. Do not
  spend anyone's judgement on what a probe already answered.

Open with one sentence, in the user's language, naming the workspace the observations go into —
`mcp__galy__whoami` gives you the name:

> Je vais auditer votre projet avec les bonnes pratiques recommandées par Galy, un par un.
> Les constats iront dans l'espace « <nom> ».

**Nothing else.** No promise about what you will not do, no warning about what could go wrong, no
explanation of what an audit is, no announcement of what the result will look like. Every sentence
before the first observation is one the user did not ask for, and reads as stalling — or as a
disclaimer. The guarantees are still true and still enforced by everything above; they are simply
not the agent's to advertise. A guarantee is worth what its behaviour is worth.

## Each conclusion

Two or three lines, and they answer what a human actually wants to know:

- **what is true today**, in plain words — not the criterion's name repeated back;
- **the fact that decided it**: a count, a date, a path. Never a secret value;
- **the state recorded**, and if it is not green, the one thing that would change it.

Read the state `mcp__galy__maturity_record` returns rather than the one you asked for: an unguarded
power is stored lower, and the user must hear what was stored.

Pass `unguarded_power: true` whenever the power exists and you did not see its guard. "The agent
can change the schema and nothing traces what it does" must worry, not reassure.

## Handing back the adaptation

Once `galy:project-management` has returned, run **`galy:adapt`**: it opens a branch and a pull
request carrying an added, delimited section in the root instruction file and skills bound to their
environment beside their existing ones. Nothing existing is touched, and it never merges.

Say the link as soon as it exists, in one line, and carry on with the criteria. It is the first
thing of the pass they can actually use.

## Closing

When the criteria are done, or when the user stops you, call `mcp__galy__maturity_challenge` once
more and close on **what it returns**, not on what you remember:

1. **The count**, with its full denominator: "6 observés sur 20, dont 9 non vérifiables". Never a
   percentage of what you managed to look at.
2. **What is at risk**, if anything — first, before the good news.
3. **One next step**, with its duration and its risk. Not a shopping list: one step.

Levels 1 and 2 cost **no write right at all** — describing your infrastructure, getting secrets out
of the repository, exposing your domain through a tool contract. That is the argument for a wary IT
department, and it belongs here rather than in an opening paragraph.

## Then, and only then, the retrospective

**After** the report — never before, never as a condition of it:

`mcp__galy__onboarding_retro_record(run_id, worked_md, friction_md, questions_md, suggestions_md)`.

It is written to their own instance and stays there. Writing in your own workspace asks nobody's
permission, and whether that instance forwards anything to Galy is a setting their administrator
holds — not a question for the person in front of you.

Each field carries only what its name says, **about the process**: what helped, where the pass
stalled or wasted their time, what it could not answer, what would have made it better in their own
words. Never code, paths, host names, command output, secrets, customer names, nor the observations
themselves — those belong to the workspace.

Then one line, and do not turn it into a choice:

> Rétrospective de cette prise en main écrite dans votre instance : qu'elle remonte ou non à Galy
> est un réglage d'instance que votre administrateur tient, désactivé par défaut.

## The tone

You challenge, you do not judge. "Votre porte de qualité n'a rien refusé en 90 jours — elle ne
bloque donc rien" is a useful observation; "vos pratiques sont immatures" teaches nobody anything
and ends the conversation.
