---
name: adapt
description: Turn the kit's generic skills into skills bound to this team's own environment, and propose them as a pull request together with an added CLAUDE.md section. Runs right after the project-management audit of the first pass, or on its own with "adapte les skills Galy à notre environnement". It opens a branch and a pull request; it never merges, never rewrites an existing skill, and never changes an existing process.
---

# adapt — make the kit fit this repository, as a pull request

The kit's skills are written against Galy's verbs and nobody else's. This step rewrites them
against **what this team actually has**, and hands the result over as a pull request: a branch,
an added section in the root instruction file, and adapted skills beside their existing ones.

**Nothing existing changes.** Not one command, not one workflow, not one convention. If the only
way to use Galy were to move their work items, they would keep the work items and drop Galy.

## The pull request is the judge, and there is no gate before it

**Do not add an approval step in front of this.** Not a confirmation prompt, not a page to click,
not a "shall I proceed?" — the pull request already is the review, and a second door in front of
the first is ceremony charged at the worst possible moment: a team's very first pass.

The reason is that **everything this skill produces is a file in their repository**. A pull request
shows the exact diff, changes nothing until someone merges, and travels through the process they
already have — which is the whole principle the kit is built on. Nothing here escapes that diff.

An authenticated approval earns its place only for an act that leaves **no diff to read**: sharing
something outside the tenant, switching on an automation, granting a right. Those have their own
pages in the product. Putting files in a repository has one too, and it is the pull request.

## What it needs before it starts

The **binding proposal** from `galy:project-management` — which system owns briefs, specs,
tickets and strategy; what the id shapes are; which commands already exist. If it was not
produced in this session, run that agent first. Adapting without it means guessing at their
method, and a wrong guess lands in a pull request with your name on it.

## The one rule that outranks the others

**Never take a name that is already taken.** Check before writing anything:

```bash
ls .claude/skills .claude/commands .agents/skills 2>/dev/null
```

The kit ships `feature-brief`, `feature-spec`, `feature-implement`, `feature-followup`, `ship`,
`strategy`, `bug-fix`. Teams that already work this way have skills with **exactly those names** —
it is the natural vocabulary, so the collision is the common case, not the edge case.

On a collision, you have two honest options and you pick per skill, not globally:

- **Skip it.** Their version already does the job, and it drives a system that already holds
  their work. Say so, and say what Galy adds that theirs does not: usually the strategy link and
  the follow-up horizon.
- **Ship it under a prefixed name** — `galy-feature-spec` — when the two genuinely do different
  things, and say in one line how a reader tells them apart.

**Never overwrite.** A pull request that replaces a team's working command is not an onboarding,
it is a takeover, and it is the fastest way to have the whole thing reverted.

## What goes in the pull request

### 1. One added section in the root instruction file

Appended, inside a delimited block, never a rewrite:

```markdown
<!-- galy:begin — géré par la prise en main Galy, modifiable -->
## Galy, à côté de ce qui existe

<qui possède quoi — une ligne par système, tirée de la proposition de liaison>
<les formes d'identifiants et à quel système chacune appartient>
<la phrase qui dit que rien d'existant ne change>
<!-- galy:end -->
```

Three properties, each load-bearing:

- **Delimited**, so a later pass updates it without touching a word the team wrote.
- **Short.** It joins a file every session reads in full; anything long gets skipped, and a
  doctrine nobody finishes is a doctrine nobody applies.
- **It names their system first**, Galy second. The reader must see their own world described
  correctly before being told what is added to it.

If the file does not exist, propose one — and then it is a doctrine, not a Galy section: cover
the stack, how to build and test, the conventions read from their history, and above all the
rules whose violation costs real data.

### 2. The adapted skills, in their repository

Under `.claude/skills/<name>/SKILL.md`, one directory per skill, each a rewrite of the kit's
generic version with:

- **their** server name and verbs, not `mcp__galy__*`, wherever the system of record is theirs;
- **their** id shapes, so a reference the user pastes is routed to the right system;
- **their** branch and commit conventions, read from `git log`, not invented;
- a first line saying which system this skill writes to. A skill that silently writes to the
  wrong tracker is worse than no skill.

Adapt only what the binding says is useful. Four adapted skills that fit are worth more than
twelve that need arguing about.

### 3. Nothing else

No CI change. No renamed branch. No `.mcp.json` edit — the connection is registered outside the
repository, on purpose. No deletion.

## Opening it

Read their conventions before writing a single command:

```bash
git log --oneline -20                  # le style des messages
git branch -r --sort=-committerdate | head -10   # le nommage des branches
```

Then their door, in their style:

```bash
git checkout -b <leur convention de nommage>
git add <uniquement les fichiers que tu as écrits>
git commit                             # message dans leur langue et leur style
gh pr create --base <leur branche par défaut>
```

The pull-request body says four things and stops: what this adds, what it deliberately does not
touch, which collisions were found and how each was handled, and what to do to try it — one
sentence, one command.

**Never merge it.** Not with a flag, not because the checks are green, not because the user said
"vas-y" about the previous step. Their review is the point: it is the first time their team sees
what an agent proposes, and the impression it leaves decides everything that follows.

## What you hand back

Three lines: the pull-request link, the collisions and what you did about each, and the single
next step — usually "open a session in the repository and ask it where the practices stand",
because that is what the added section now makes possible.
