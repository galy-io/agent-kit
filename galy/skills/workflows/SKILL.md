---
name: workflows
description: See and change what Galy's skills are allowed to do on your behalf — merge mode, hands-off shipping, and whether an onboarding retrospective may be shared with your Galy coach through a revocable read-only link. Fires on "quels réglages Galy sont actifs ?", "arrête de partager avec le coach", "change mon mode de fusion", "galy settings". Shows what your administrator decided and what is left to you, and points at the page on your Galy account.
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
| `onboarding` | `share_retro_with_coach` | whether the retrospective of a pass may be shared with your Galy coach, by link |

## Changing one

`mcp__galy__workflow_default_set(skill, option, value)`, then rewrite the local mirror
`.galy/workflow-defaults.json` so an offline or headless run sees the same thing. **Persist the
canonical machine value, never the label you displayed** — labels get reworded, and a stored label
silently stops matching.

If the policy for that option is `allow` or `deny`, setting a user value changes nothing: say that
instead of writing a preference that will never be read.

## `share_retro_with_coach`, and why it is the one worth explaining

Every other option decides what a skill does inside the workspace. This one decides whether
somebody **outside** it may read one document, so it is the only one where the user deserves a
sentence rather than a value.

- **The retrospective is always written**, whatever this is set to, and it stays in the instance.
  Nothing here decides whether it exists — only whether a coach may read it.
- **Sharing mints a read-only, revocable link.** Nothing is pushed and nothing is sent: the coach
  opens the link, or there is no link and they see nothing. Support is blind by construction, and
  stays blind until someone hands over a link.
- **What the retrospective holds**: what worked, what was awkward, the open questions, the
  suggestions — about *the onboarding process*. Never code, file excerpts, host names, secrets,
  customer names, nor the observations the pass recorded.

Values are `always`, `ask`, `never`, and **absent means never** — a preference nobody gave is not a
yes. Anyone may change it at any time, and `never` is honoured without argument.

Revoking is the other half, and it is worth saying in the same breath: a shared link is deactivated
from the same page, and once revoked the URL answers nothing. Someone who shared last month may
take it back today without asking anyone.

## The page on their account

Everything here is also visible and editable at the `settings_url` the resolve verb returns. Say
it once, at the end, as a link — not as a paragraph. The point of this skill is that a developer
never has to leave the terminal to answer "what is this thing allowed to do?", and the page is for
the times they want to see it all at once, or for the administrator setting policy for everyone.
