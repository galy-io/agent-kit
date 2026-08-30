#!/usr/bin/env node
// Galy — SessionStart hook.
//
// The thing that makes opening an assistant in a wired repository *do something*. Without
// it, the whole kit waits for a user who already knows what to type — which is exactly the
// user who does not need it.
//
// It is deliberately OFFLINE. It calls no API, reads no token, resolves no address. All it
// answers is "is Galy meant to be here?", and it hands the session a short instruction to
// read the practice baseline through the MCP tools, where the credential already lives.
// A hook that talked to the network would add a failure mode, a latency and a secret to
// every single session start, and buy nothing: the agent is about to make that call anyway.
//
// It writes nothing into the user's repository. Its only state is a stamp under
// ~/.claude/galy/stamps/, so that a day of sessions is challenged once and not twenty times.
//
// stdin:  { session_id, cwd, source, ... }
// stdout: { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }
// Silence — no output, exit 0 — whenever the answer is "Galy has nothing to say here".

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

// A session challenged this morning is not challenged again this afternoon.
const CHALLENGE_COOLDOWN_MS = 12 * 60 * 60 * 1000;
// An unconnected repository is offered the connection once, then left alone for a month.
// Anything more often is nagging, and nagging is how a good idea gets turned off.
const OFFER_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

function quit() { process.exit(0); }

function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); }
  catch { return {}; }
}

/** The git repository root at or above `from`, or null when there is none. */
function repoRoot(from) {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * The main checkout behind a linked worktree, or null when `root` is one already.
 *
 * A worktree's `.git` is a FILE holding `gitdir: <main>/.git/worktrees/<name>`, so the main
 * checkout is readable without spawning git. It matters because Claude Code keys per-project
 * settings — the MCP registration among them — on the main checkout: a team working in five
 * worktrees registers the server once, and all five must recognise it.
 */
function mainWorktree(root) {
  if (!root) return null;
  const dotGit = join(root, ".git");
  try {
    if (!statSync(dotGit).isFile()) return null;
    const match = /^gitdir:\s*(.+)$/m.exec(readFileSync(dotGit, "utf8"));
    if (!match) return null;
    const gitDir = match[1].trim().split("\\").join("/");
    const cut = gitDir.toLowerCase().indexOf("/.git/worktrees/");
    return cut === -1 ? null : gitDir.slice(0, cut);
  } catch { return null; }
}

/** Same upward walk the galy CLI does, so both agree on which workspace a repo belongs to. */
function findGalyConfig(from) {
  let dir = resolve(from);
  for (;;) {
    const candidate = join(dir, ".galy", "config.json");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * The authoritative signal: a `galy` server registered for this project in Claude Code's own
 * config. `galy-setup` and the `connect` skill both write there, so a repository wired the
 * documented way is recognised even with nothing Galy-shaped in its tree.
 */
function registeredForProject(dirs) {
  const path = join(homedir(), ".claude.json");
  if (!existsSync(path)) return false;
  try {
    // Small by construction — a few tens of kilobytes of per-project settings.
    if (statSync(path).size > 8 * 1024 * 1024) return false;
    const projects = JSON.parse(readFileSync(path, "utf8"))?.projects;
    if (!projects) return false;
    const wanted = new Set(dirs.filter(Boolean).map(normalisePath));
    for (const [key, value] of Object.entries(projects)) {
      if (value?.mcpServers?.galy && wanted.has(normalisePath(key))) return true;
    }
    return false;
  } catch { return false; }
}

// Windows hands the same directory back as C:\x, C:/x or c:\x depending on who is asking.
function normalisePath(p) {
  return resolve(p).split("\\").join("/").replace(/[/]+$/, "").toLowerCase();
}

function declaresGalyServer(root) {
  if (!root) return false;
  const path = join(root, ".mcp.json");
  if (!existsSync(path)) return false;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return Boolean(parsed?.mcpServers?.galy);
  } catch { return false; }
}

// The stamp lives beside the assistant's own state, never in the user's tree: a hook that
// dropped a file into a repository on every session start would be caught by the next
// `git status` and rightly deleted.
function stampPath(root) {
  const key = createHash("sha1").update(root || process.cwd()).digest("hex").slice(0, 16);
  return join(homedir(), ".claude", "galy", "stamps", `${key}.json`);
}

function lastStamp(path, kind) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return typeof parsed?.[kind] === "number" ? parsed[kind] : 0;
  } catch { return 0; }
}

function writeStamp(path, kind) {
  try {
    let state = {};
    if (existsSync(path)) { try { state = JSON.parse(readFileSync(path, "utf8")); } catch { state = {}; } }
    state[kind] = Date.now();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(state), "utf8");
  } catch { /* a stamp we could not write only costs one extra challenge */ }
}

function emit(context) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context },
  }));
  process.exit(0);
}

// ── The two things it can say ────────────────────────────────────────────────

const CHALLENGE = `Galy is connected to this repository, and its job is to challenge how this team works with an assistant — not only to answer.

Before you answer the user's first request:

1. Call \`mcp__galy__maturity_challenge\`. It returns the level reached, what is at risk, the single next step, and the criteria nobody has ever looked at.
2. Open with ONE sentence, in the user's language, and then stop. This sentence is the first thing anyone ever sees of Galy, in every session, so it is written for a person who has never heard of any of this.

   THE THREE RULES THAT MAKE IT READABLE, and each one has been broken:

   - **Never print a criterion identifier.** \`schema_via_toolpath\` and \`production_read_only\` are database keys; they mean nothing to a human. The same call returns \`name\` beside every one of them — use that, translated into the user's language, or say the thing in your own plain words. If you cannot say what a criterion is about without its key, do not mention it at all.
   - **Never open on a level number.** "Niveau 0" reads as a mark out of twenty, and it lands in the same breath as "6 observed", so the two contradict each other out loud. A level is a threshold, not a score. Say a level only if the user asks.
   - **One fact, not five.** Risk, level, count, next step and link in one line is the wall of text this product exists to spare them. Pick the ONE that matters and let the page carry the rest.

   Which one matters:

   - \`at_risk\` is not empty → that, and only that. Say the power in plain words and say that nothing was seen guarding it. A power whose guard was never observed comes before any good news.
   - otherwise → "N pratiques sur 20 constatées", and the single next step in plain words.

   Then the address of the maturity page, if the call gave you one — never build such an address yourself, a Galy instance is not guessable.
3. If \`observed\` is 0, do not report a score. Say plainly that these practices have never been looked at, and offer the first pass — they can start it by just saying so, in their own words ("démarre l'onboarding Galy", "start the Galy onboarding"), which loads the \`galy:audit-organisation\` skill. Say what it costs, and say it accurately: it looks one criterion at a time, one line each, it asks before writing anything that is not a plain "yes, this is in place", and it applies nothing on its own. It does not open with a questionnaire, so do not promise one.
4. Then do what the user actually asked, and give it the room. They came to work; the sentence above is a courtesy, not the answer. An assistant that opens with a dashboard gets muted.

Never invent a state. Everything you say about their practices comes from that call, or you say you did not look. If the tool is not available at all, or answers 401 or unauthorized, say so in one line, point at \`galy:connect\`, and carry on with their request — do not retry.`;

const OFFER = `The Galy kit is installed, but this repository is not connected to a Galy workspace — so there is no practice baseline to read here, and none of the \`mcp__galy__*\` tools will answer.

Mention it once, in one line, when you first reply, and say they can connect it by asking in their own words ("branche-moi sur Galy"), which loads the \`galy:connect\` skill. Then do what the user asked. Do not raise it again in this session, and do not attempt any Galy tool call.`;

// ── Decide ───────────────────────────────────────────────────────────────────

const input = readStdin();
const cwd = input.cwd || process.cwd();
const root = repoRoot(cwd);

// Outside a repository there is no work to challenge, and no stable identity to stamp.
if (!root) quit();

const wired = registeredForProject([root, cwd, mainWorktree(root)])
  || Boolean(findGalyConfig(cwd))
  || declaresGalyServer(root)
  || Boolean(process.env.GALY_TOKEN);
const stamp = stampPath(root);
const kind = wired ? "challenged" : "offered";
const cooldown = wired ? CHALLENGE_COOLDOWN_MS : OFFER_COOLDOWN_MS;

if (Date.now() - lastStamp(stamp, kind) < cooldown) quit();

writeStamp(stamp, kind);
emit(wired ? CHALLENGE : OFFER);
