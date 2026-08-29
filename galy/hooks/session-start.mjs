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
2. Open with ONE line. If \`at_risk\` is not empty, that goes first — a power whose guard was never observed comes before any good news. Otherwise: level reached, "N observed out of 20", and the single next step.
3. If \`observed\` is 0, do not report a score. Say plainly that these practices have never been looked at, and offer the first pass: the \`galy:onboarding\` skill. Say what it costs before they accept — it reads, it records what it saw, it changes nothing on its own.
4. Then do what the user actually asked. One line, not a report: they came to work, and an assistant that opens with a dashboard gets muted.

Never invent a state. Everything you say about their practices comes from that call, or you say you did not look. If it answers 401 or unauthorized, say so in one line, point at \`galy:connect\`, and carry on with their request — do not retry.`;

const OFFER = `The Galy kit is installed, but this repository is not connected to a Galy workspace — so there is no practice baseline to read here, and none of the \`mcp__galy__*\` tools will answer.

Mention it once, in one line, when you first reply, and point at the \`galy:connect\` skill. Then do what the user asked. Do not raise it again in this session, and do not attempt any Galy tool call.`;

// ── Decide ───────────────────────────────────────────────────────────────────

const input = readStdin();
const cwd = input.cwd || process.cwd();
const root = repoRoot(cwd);

// Outside a repository there is no work to challenge, and no stable identity to stamp.
if (!root) quit();

const wired = Boolean(findGalyConfig(cwd)) || declaresGalyServer(root) || Boolean(process.env.GALY_TOKEN);
const stamp = stampPath(root);
const kind = wired ? "challenged" : "offered";
const cooldown = wired ? CHALLENGE_COOLDOWN_MS : OFFER_COOLDOWN_MS;

if (Date.now() - lastStamp(stamp, kind) < cooldown) quit();

writeStamp(stamp, kind);
emit(wired ? CHALLENGE : OFFER);
