---
name: audit-organisation
description: Audit this team's engineering practices against Galy's twenty recommended criteria, one criterion at a time, one line each. The same skill runs the first pass and every one after it. Fires on a plain sentence such as "audite mon projet", "démarre l'onboarding Galy", "commence la prise en main", "fais le point", "start the Galy audit", "où en sont nos pratiques ?", or whenever a session finds that nothing has ever been observed. It says what it is about to check, checks it, reports one line, and stops to have anything that is not green confirmed before writing it. It observes and proposes; it applies nothing, merges nothing, and triggers nothing.
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

## The budget you are spending, and it is not tokens

**The user's attention.** Twenty criteria is a lot to look at and almost nothing to say. The first
version of this pass produced about 1 500 words and 150 lines of terminal for a single run: every
criterion got a paragraph, every paragraph was true, and the whole thing was unreadable. A team
that is told "we will help you work better with an assistant" and receives a wall of text in
return has already been shown the opposite.

Three numbers hold you to it:

- **One line per criterion on screen.** State, and the one fact that decided it. Not two lines
  because this one is interesting.
- **Under 200 words of terminal for the whole pass**, closing included.
- **The detail is not lost — it is elsewhere.** Everything you would have written goes into
  `evidence_md` when you record, where the maturity page displays it in full. The screen carries
  the verdict; the page carries the argument.

## The shape of this pass: one criterion at a time

**This is the part that decides whether anyone finishes the audit.** Not a questionnaire, not a
plan, not a scope negotiation. A loop, and the user sees a result inside the first minute:

> **J'audite <le critère> : <la garde, en mots simples>.**
> *(you look)*
> **<état> — <le fait qui a décidé>.**

Then the next one. Every criterion, in order, until they stop you or you run out.

Four things this shape buys, and each of them is a failure mode of the version it replaces:

- **No upfront questions.** A permission questionnaire arrives when the user has zero context: the
  words mean nothing to them yet, and it reads as bureaucracy before a single useful sentence. Ask
  nothing until you are blocked, and then ask about **that one thing**, in the middle of the
  criterion that needs it, where the question finally has a meaning.
- **No batch.** A report that arrives twenty minutes later, all at once, cannot be corrected. A
  line per criterion lets the user say "non, c'est faux, regarde là" while it still costs nothing
  to redo.
- **No plan announcement.** Do not list what you are about to do. Do it.
- **No paragraph.** See the budget above. If a criterion deserves three sentences, those three
  sentences belong in `evidence_md`.

### The order

`mcp__galy__maturity_challenge` decides it, and you do not second-guess it:

1. `next_step` — the server names the single criterion that unlocks the most. Start there.
2. `at_risk` — a power whose guard nobody saw. These matter more than a green one nearby.
3. everything `never_probed`, then everything stale (`to_recheck`).
4. the rest, worst state first: `absent`, then `partial`.

Re-observing fresh green buys nothing. Skip it, and say so in one line for the whole batch — not
one line per criterion skipped.

### What "one at a time" does not mean

It does not mean one agent per criterion when several share a source. `galy:delivery` reads ninety
days of forge history once and answers five criteria from it; splitting that into five agents pays
the same cost five times. **Group by what you have to go and read, report by criterion.** The user
sees five lines, one after another, whatever you did behind them.

## The checkpoint: nothing but green is written unattended

**A pass that never stops is a pass nobody agreed to.** The user watched twenty verdicts scroll by
and was asked, at no point, whether any of them was true — and every one of them was written to
their workspace regardless. That is the same failure as filling the grid behind their back, only
slower.

So the rule is asymmetric, and deliberately:

- **Green records itself.** `observed` is the state that claims nothing is wrong. Being wrong about
  it costs a re-check. Record it as you go, one line, no question.
- **Everything else waits for a yes.** `partial`, `absent`, `unverifiable`, and above all
  `unguarded_power` are the states that say something about how this team works. Being wrong about
  one of those, in writing, in their own workspace, is the thing that ends the relationship. Hold
  it, and ask.

**Ask per group, not per criterion.** Twenty questions is the questionnaire you just removed. When
a subject agent comes back, you have its whole batch: put the non-green ones together, list them
in one line each, and ask once with `AskUserQuestion`:

> **Avant d'écrire ces constats dans votre espace :**
> — <la pratique, en clair> : <l'état, en clair> parce que <fait>
> — <la pratique, en clair> : <l'état, en clair> parce que <fait>
>
> Question : « C'est juste ? »
> — *Oui, enregistre* (recommandé)
> — *Non, je corrige* — the user says which and why; you look again at that one, and only that one
> — *N'enregistre pas ce groupe* — you record nothing for it and say which criteria stayed blank

A group with nothing but green has no checkpoint. Do not manufacture one to look thorough.

**Where `AskUserQuestion` does not exist, ask in plain text and wait.** The checkpoint is the
guarantee, not the widget: a harness without a question tool gets the same three options written
out and the same pause before writing. Never fall through to recording because asking was
inconvenient.

`AskUserQuestion` only works in the main session; a subagent cannot reach the user. So the agents
observe and report to you, **and you do the recording after the checkpoint** — which is a change
from how the agents used to work, and the reason their instructions say to return their findings
rather than write them.

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
`galy:ground`, `galy:secrets`, `galy:delivery`, `galy:schema`, `galy:autonomy`.

**`galy:project-management` runs first**, alone, and you wait for it. It answers the one question
that changes what everything else means: *where does this team's work already live?* A team that
already tracks its work will not move it, and its binding proposal decides what `galy:adapt` can
propose later.

If this harness cannot launch agents, do the work yourself — each agent file is a readable
procedure.

## Opening the pass

- `mcp__galy__maturity_challenge` — which pass is this, and where is the work.
- `mcp__galy__maturity_start_run` with the `kind` that answer implies: `onboarding` when nothing
  was ever observed, `scheduled` when refreshing what went stale, `manual` when a user asked.
  **Keep the `run_id`** — every recording needs it.
- `mcp__galy__maturity_run_probes` with that same `run_id` — what the instance can measure by
  itself, it measures. Do not spend anyone's judgement on what a probe already answered.

Open with one sentence, in the user's language, naming the workspace the observations go into —
`mcp__galy__whoami` gives you the name:

> Je vais auditer votre projet avec les bonnes pratiques recommandées par Galy, un par un.
> Les constats iront dans l'espace « <nom> ».

**Nothing else.** No promise about what you will not do, no warning about what could go wrong, no
explanation of what an audit is, no announcement of what the result will look like. Every sentence
before the first observation is one the user did not ask for, and reads as stalling — or as a
disclaimer. The guarantees are still true and still enforced by everything above; they are simply
not the agent's to advertise. A guarantee is worth what its behaviour is worth.

## Where this work hangs: the objective

**Before the criteria**, make sure the audit has a home in the strategy tree. A maturity pass that
hangs under nothing is a report; hung under an objective, it is work someone answers for — and the
twentieth criterion, `effect_measured`, is exactly the claim that intent goes down to execution and
measurement comes back up.

Look for an objective meaning **« Améliorer l'organisation grâce à l'I.A. »**, and under it a
sub-objective meaning **« Ajuster l'organisation de la tech »** — in the user's language.

`mcp__galy__strategy_search_objectives` finds it; `mcp__galy__strategy_navigate_children` shows what
hangs under it.

**Search on meaning, not on bytes.** A team that already wrote "Améliorer l'organisation avec l'IA"
has that objective; creating a second one beside it is worse than not looking, because from then on
two trees claim the same ground and neither is wrong. When something close exists, use it and say
which one you picked.

**If both exist** — work inside: the single next step you close on is expressed as work under that
sub-objective, and anything you propose hangs there rather than floating.

**If they are missing** — propose them, in one line, and create only on a yes:

> Je ne vois pas d'objectif « Améliorer l'organisation grâce à l'I.A. » dans votre stratégie.
> Je le crée, avec « Ajuster l'organisation de la tech » dessous, pour y rattacher ce que cet
> audit va produire ?

`mcp__galy__strategy_create_objective` takes a `parent_objective_id`, so the sub-objective is one
call, not two.

**Why this one asks, like the non-green findings do.** An objective is **their strategy** — the
thing the whole product exists to hold. Something appearing there that nobody asked for is the same
failure as a grid filled in behind their back, and it is the more visible of the two.

A refusal costs nothing: record the criteria anyway and close without hanging them. Never insist.

## Each line

On screen, one line, and it answers what a human actually wants to know:

> **<la pratique, en clair>** — <l'état, en clair> : <le fait qui a décidé>.

- **the practice, in plain words, in the user's language.** NEVER its identifier. `doctrine_written`
  and `schema_via_toolpath` are database keys: they are how the tools address a criterion, not how
  a person reads one. Every call returns `name` beside the key — use that, or say the thing
  yourself. A line the user has to decode is a line they skip, and twenty skipped lines is the
  whole pass.
- **the state in plain words too.** "constaté", "partiel", "absent", "pas vérifiable" — not
  `observed`, not `partial`. Same reason.
- **the fact that decided it**: a count, a date, a path. Never a secret value, never a paraphrase
  of the criterion's own name.
- **the state you recorded**, read back from what `mcp__galy__maturity_record` returned rather than
  the one you asked for: an unguarded power is stored lower, and the user must hear what was stored.
- **no advice on the line.** The one next step is chosen once, at the close, by the server. Twenty
  pieces of advice is not twenty times as useful as one; it is a list nobody acts on.

Pass `unguarded_power: true` whenever the power exists and you did not see its guard. "The agent
can change the schema and nothing traces what it does" must worry, not reassure — and it goes
through the checkpoint like any other non-green finding.

Everything you did not put on the line goes in `evidence_md`: the paths, the counts, the commands
you ran, what you looked for and did not find. That is what the maturity page shows when the user
opens the criterion, and it is what makes the verdict arguable instead of oracular.

## Handing back the adaptation

Once `galy:project-management` has returned, run **`galy:adapt`**: it opens a branch and a pull
request carrying an added, delimited section in the root instruction file and skills bound to their
environment beside their existing ones. Nothing existing is touched, and it never merges.

Say the link as soon as it exists, in one line, and carry on with the criteria. It is the first
thing of the pass they can actually use.

## When a criterion is not green: the catalogue carries its own method

**There is no skill per criterion, and there never will be.** Twenty criteria would be twenty
entries in a menu nobody reads, for a product whose whole promise is not to spend the reader's
attention. The procedure for putting a criterion in place lives with the criterion:
`mcp__galy__maturity_remediation_get(criterion_id)` returns it.

Three rules, and they are the same for all twenty:

- **Fetch it only for a criterion you are about to work on.** It is long. Loading it for a
  criterion that is green, or that the user has not asked to fix, spends context on nothing.
- **Offer, do not start.** A red criterion is not consent. The offer is **one sentence: what you
  saw, then the question** — and the question is a real one, not a heading over work you have
  already begun. The user answers, and only then do you fetch the procedure.

  > Pas de copies de travail isolées ici, et pas de lanceur qui en ouvre une. Je peux vous en
  > mettre un en place sur ce projet — vous voulez ?

  Name what is actually missing, in the words a developer uses. Never the criterion's own name
  said back to them, never a level, never a score. If they say no, record the criterion on what is
  true and move on: no second attempt later in the same pass.
- **Follow it, and let it do its own asking.** A procedure that writes on their machine carries
  its own question — do not paraphrase it, do not pre-approve it, and do not skip it because the
  user already said yes to the audit.

When the verb answers `has_procedure: false`, that criterion has no written method yet. Say so
plainly. **Never write one from memory**: a method invented on a subject that touches production
is worse than no method, because it looks like one.

## Closing

When the criteria are done, or when the user stops you, call `mcp__galy__maturity_challenge` once
more and close on **what it returns**, not on what you remember. Four lines, and then stop:

1. **The count**, with its full denominator: "6 observés sur 20, dont 9 non vérifiables". Never a
   percentage of what you managed to look at.
2. **What is at risk**, if anything — first, before the good news, and **in plain words**: say
   the power the team has and say that nothing was seen guarding it. Never the identifier.
3. **One next step**, with its duration and its risk. Not a shopping list: one step — and named
   the way a developer would name it, not the way the database stores it.
4. **The link to the maturity page**, and it is the last line of the pass.

**Give the URL the tool returns. Never build one.** The address of a Galy instance is not
guessable — every workspace answers on its own host and a dedicated instance lives under the
client's own name — so a link you assembled yourself lands on a 404 or, worse, on somebody else's
instance. If no tool gave you a URL, say the page exists and say you do not have its address; that
is a bug to report, not a gap to paper over.

The link is what makes the four lines above sufficient rather than thin: the argument for every
one of the twenty verdicts is on that page, with its evidence, its date and its history. You are
not summarising the audit — you are pointing at it.

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
