---
name: workflows
description: See and change what Galy's skills are allowed to do on your behalf — merge mode, hands-off shipping, and whether the end of an onboarding sends a non-technical retrospective back to Galy. Fires on "quels réglages Galy sont actifs ?", "arrête d'envoyer du feedback à Galy", "change mon mode de fusion", "galy settings". Shows what your administrator decided and what is left to you, and points at the page on your Galy account.
---

# workflows — what the skills may do on your behalf

Every preference here answers the same question: **when a skill reaches a decision point, does it
act, stop, or ask?** They are stored on your Galy account, not in this repository, so they follow
you from one checkout to the next.

## Two layers, and the top one wins

- **Your administrator's policy**, set for the whole workspace, per skill and per option:
  `allow`, `deny`, or `user_choice`.
- **Your own preference**, which only decides when the policy says `user_choice`.

`mcp__galy__workflow_policy_resolve(skill, option)` returns both plus the answer:

```
{ effective: "allow" | "deny" | "ask", decided_by: "admin" | "user" | "default",
  admin_policy, user_value, settings_url }
```

**Read `decided_by` before you say anything.** When it is `admin`, the choice is not the user's to
make: say so in one line, give the `settings_url`, and do not offer a question whose answer would
change nothing. Offering it anyway is worse than saying no — it implies a control that is not
there, and the next session discovers the lie.

## Showing the current state

Read `mcp__galy__workflow_default_get_all` for the user's side and resolve each known option for
the policy side. Render one short table — option, effective value, who decided — and end with the
`settings_url`. No option is worth more than one line.

| Skill | Option | What it decides |
|---|---|---|
| `feature-implement` | `merge_mode` | whether the loop pauses before handing the PR to your merge process |
| `ship` | `auto_ship` | whether a safe, high-confidence change opens its PR without asking |
| `onboarding` | `share_feedback` | whether the end of a pass sends a **non-technical** retrospective to Galy |

## Changing one

`mcp__galy__workflow_default_set(skill, option, value)`, then rewrite the local mirror
`.galy/workflow-defaults.json` so an offline or headless run sees the same thing. **Persist the
canonical machine value, never the label you displayed** — labels get reworded, and a stored label
silently stops matching.

If the policy for that option is `allow` or `deny`, setting a user value changes nothing: say that
instead of writing a preference that will never be read.

## `share_feedback`, and why it is the one worth explaining

It is the only option that sends anything **out of your workspace**, so it is the only one where
the user deserves a sentence rather than a value:

- **What leaves**: what worked, what was awkward, the questions the pass left open, and
  suggestions — about *the onboarding process itself*.
- **What never leaves**: code, file excerpts, host names, secrets, customer names, and the content
  of your observations. The evidence you recorded stays in your workspace.

Values are `always`, `ask`, `never`. Anyone may change it at any time, and `never` is honoured
without argument — a retrospective extracted from someone who did not want to give it is worth
nothing anyway.

## The page on their account

Everything here is also visible and editable at the `settings_url` the resolve verb returns. Say
it once, at the end, as a link — not as a paragraph. The point of this skill is that a developer
never has to leave the terminal to answer "what is this thing allowed to do?", and the page is for
the times they want to see it all at once, or for the administrator setting policy for everyone.
