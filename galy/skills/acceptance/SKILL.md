---
name: acceptance
description: Run an acceptance pass on a running feature — you fire remarks in rapid succession while you click through the product, each one is written to a local queue the instant it lands, then coded one at a time in the order received, one commit per remark, a single PR. Trivia is decided on the spot; a real product decision parks without stopping the queue. Ends at "PR ready"; it never merges. The queue stays on your machine; nothing is sent to Galy.
---

# acceptance — fire remarks, drain them one at a time, one PR

You are sitting in front of the running product with the person who asked for it. Remarks come faster
than they can be coded, and the session that holds them only in context loses them at the first
`/compact` or crash — which is why the first act on every remark is to **write it down**, before
anything else, coding included.

Each remark is then implemented **in the order received**: one commit per item, one branch, one PR.

## Modes

| You typed | Mode |
|---|---|
| nothing, or a spec id / a topic | **start** — open or resume an acceptance session |
| `status` | show the queue and the open questions |
| `answer <n> <text>` | reply to a parked question; the item re-queues |
| `stop` | close intake, drain what is left, hand the PR to `ship` |
| anything else, while a session is open | a **remark** — it goes to the queue |

## The queue

One file, `.galy/acceptance/<session>.json`, in the repo you are working in. `.galy/` is gitignored
(`connect` makes sure of it), so the queue never reaches a commit — and never reaches Galy either.

```json
{
  "session": "acceptance-checkout-1",
  "branch": "acceptance-checkout-1",
  "spec": null,
  "pr": null,
  "intake": "open",
  "items": [
    { "n": 1, "text": "the total ignores the discount", "status": "pending",
      "question": null, "answer": null, "commit": null, "result": null }
  ]
}
```

`status` is one of `pending`, `in_progress`, `done`, `failed`, `awaiting_user`. Rewrite the file on
every change — it is the only thing that survives you.

## start

1. Name the session after what is being reviewed, not after a date. Create the branch from the base
   branch if you are not already on one for this session; resume the existing file if there is one.
2. Start the product the way this repository starts it, and keep it running — every item is verified on
   the real surface before it is called done.
3. Open **one** draft PR for the whole session and record its URL in the file. One session, one PR: a
   PR per remark buries the reviewer, and a reviewer who skims is a reviewer you no longer have.
4. Say in one line that intake is open, then stop talking. The person is looking at the product, not at
   your terminal.

## Intake

Every line the person types that is not a mode is a remark. **Write it to the file first**, then
acknowledge it in a single short line — `#3 queued` — and nothing else. No restating it back in your own
words, no plan, no estimate.

## Drain

Pick the **oldest** `pending` item. Not the last one typed: a fresh remark joins the back of the queue.

1. Mark it `in_progress` in the file.
2. Fix the cause, following the `bug-fix` discipline. **Decide trivia on the spot** — naming, which file,
   which format, anything you can settle from the code in under a minute.
3. **Only a real product decision parks**: write the question into the item, set it `awaiting_user`, and
   move to the next item. Never wait, never end the turn on it.
4. Verify it on the surface the person was looking at, in the running product.
5. One commit, referencing the item, pushed to the session branch.
6. Mark it `done` with the commit sha and one line of what changed; `failed` with the reason if it truly
   could not be fixed.

Then pick the next oldest. Repeat until nothing is `pending`, and go back to intake.

Long or genuinely independent items go to background sub-agents, launched together, while you keep
coordinating and committing. Short items stay inline — spawning an agent per remark costs more than it
saves.

## status

Print one compact block: done (with commits) · in progress · pending · open questions. Nothing else.

## answer

`answer <n> <text>` appends the answer to item `n` and puts it back to `pending`. It is picked up in its
original position, not at the front — the order the person gave still holds.

## stop

1. Close intake in the file.
2. Drain what is left. If items are still `awaiting_user`, surface them and stop there: they are the only
   thing that legitimately blocks.
3. Hand the single PR to `ship` — the review panel runs on the whole session's diff at once.
4. The kit ends at **PR ready**. Merging is your own CI or process, as everywhere else here.

## Discipline

- **The file is written before anything else happens.** A remark that exists only in context is a remark
  you will lose, and nobody will know which one.
- **Never end a turn waiting for a go.** A recap is not a stop. Keep draining.
- **Never block the queue on a small question** — decide it. `awaiting_user` is for decisions that are
  genuinely not yours, and even then the queue keeps moving.
- **Newest is not next.** After each item, re-pick the oldest `pending`.
- **One item, one commit.** A commit that carries three remarks cannot be reverted for one of them.
- **Verified means seen.** An item is `done` when you watched the product do the right thing, not when
  the build went green.
