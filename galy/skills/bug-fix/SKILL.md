---
name: bug-fix
description: Take a bug from a report to a pull request — reproduce it first, find the cause, fix the cause, prove the fix on the path the user actually took, and record the follow-up. Accepts a raw error, a stack trace, or a ticket id from whichever system holds this team's bugs. Ends at "PR ready"; it never merges and never deploys.
---

# bug-fix — from a report to a pull request

A bug is the one kind of work where the specification already exists: **the wrong behaviour is
the specification**. So the discipline is narrower than for a feature, and stricter — the whole
value is in reproducing before fixing, and in fixing the cause rather than the symptom.

## Where the bug lives

Before anything, know which system holds it. This is the binding the first pass recorded in the
root instruction file, and it decides where you read from and where you write back:

- **Their existing system** — a ticket id in their shape (`PROJ-123`, `#1234`, `AB#5678`), read
  through their own tools. You update it there, in their statuses, with their vocabulary.
- **Galy** — no ticket anywhere yet. Frame it as a brief with one user story, so the fix is
  attached to something, and the follow-up has a home.

If you are handed a bare error and cannot tell which system owns it, **ask** — one question, one
line. Writing the outcome into the wrong tracker is worse than not writing it.

## The order, and it does not bend

### 1. Reproduce, before you understand anything

You may not open a file until you have seen the failure. A fix written from a stack trace alone
repairs what the trace showed, which is where the error surfaced and rarely where it began.

Write the reproduction down as you get it: the exact input, the exact path, the exact wrong
output. That sentence becomes the acceptance test later, so write it as one.

If you **cannot** reproduce it, stop and say so. A bug you cannot reproduce is not ready to fix,
and the honest outcome is a question to whoever reported it — what they did, on what data, at
what time. Guessing here is how a second bug is introduced beside the first.

### 2. Find the cause, and say which layer it lives in

Follow the failure backwards until the first place where the state is already wrong. Name that
place. Then ask one question before touching it: **why did nothing catch this?** The answer is
usually a missing check at a boundary, and it is worth more than the fix.

### 3. Fix the cause

- Repair the layer where the state first went wrong, not the one where it became visible.
- Change as little as the cause requires. A refactor bundled with a fix makes the fix
  unreviewable, and a reviewer who cannot isolate the fix approves the refactor by accident.
- If the fix is at the wrong altitude — the real repair is a design change nobody asked for —
  say so, apply the smallest correct fix, and record the design point as a follow-up rather than
  quietly widening the change.

### 4. Prove it on the path the user took

Two proofs, both required:

- **A regression test** that fails before your change and passes after. Run it both ways and say
  so. A test written after the fix, never seen red, proves only that it compiles.
- **The user's own path**, replayed. Same input, same screen, same query — the reproduction from
  step 1, now producing the right answer. This is what "verified" means; a green suite is not it.

### 5. Record what it would take to see it earlier

Add a follow-up check with `mcp__galy__followup_check_add`, or in their system if that is where
bugs live: what to look at, on what horizon, to know this class of failure has not returned. One
check, concrete enough to run without you.

### 6. Hand it over

Use `galy:ship`. It commits in the house style, opens the pull request, runs the self-review
panel and fixes what it finds.

**It ends there.** Merging and deploying stay with their process — that is a documented boundary
of this kit, not a gap. Never merge because the checks went green, and never because the user
said "vas-y" about an earlier step.

## What you hand back

Four lines, business first:

1. **What was broken**, in the words of someone who suffered it — not the exception name.
2. **Why**, in one sentence: the cause and the layer it lived in.
3. **What proves it is fixed**: the test that went red then green, and the replayed path.
4. **The pull-request link**, and the follow-up check you left behind.

Then, if it applies, the one sentence that is worth more than the fix: what would have caught
this at the boundary, and what it would cost to add.
