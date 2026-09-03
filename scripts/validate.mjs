#!/usr/bin/env node
// What must stay true of this repository, checked on every push.
//
// Three invariants, each one written the day it was broken:
//
//   1. THE SKILL FORMAT. `SKILL.md` is an open specification with two mandatory fields, `name`
//      and `description`, and that is what makes these files readable without retouching by
//      Claude Code, Codex, Cursor, Copilot, Gemini CLI and goose — the agents our clients
//      already run. A skill that drifts out of the format does not fail loudly: it is simply
//      never picked up, in exactly one of those agents, and nobody finds out.
//
//   2. NO INSTANCE ADDRESS. Galy is multi-tenant and every workspace answers on its own host;
//      a dedicated instance does not even answer on ours. The published artefact therefore says
//      WHAT to do and never WHERE: the address travels with the token, on the developer's own
//      machine. A hardcoded host does not fail loudly either — it authenticates nobody and
//      reads as a bad token.
//
//   3. NO STALE REPOSITORY NAME. The repository was renamed from `claude-kit` to `agent-kit`,
//      then its organisation from `galy-io` to `b-galy` when the brand became B.Galy. GitHub
//      still redirects both old names, which is exactly what makes them dangerous: everything
//      keeps working, so nobody aligns anything, and the redirection breaks the day someone
//      creates a repository under the freed name. `galy-io` survives only as an empty
//      placeholder organisation that holds the redirect — a courtesy, never an address to publish.
//
//   4. NO COMMAND THAT DOES NOT EXIST. `npx galy-setup` was distributed by the `connect` skill
//      while the package was published on no registry: npm answered `E404 Not Found`, and the
//      first developer to type it concluded the product did not exist. It had already been
//      corrected on the screen — and stayed wrong here, which is precisely what a check is for.
//
// Exit code 0 = every invariant holds, 1 = at least one does not.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const fail = (what, detail) => failures.push(`${what}\n    ${detail}`);

/** Every file under `dir`, skipping .git and node_modules. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------- 1. skill format
const skillsDir = join(ROOT, "galy", "skills");
const skills = readdirSync(skillsDir).filter((e) => statSync(join(skillsDir, e)).isDirectory());

if (skills.length === 0) fail("no skill found", `nothing under ${relative(ROOT, skillsDir)}`);

for (const skill of skills) {
  const path = join(skillsDir, skill, "SKILL.md");
  let body;
  try {
    body = readFileSync(path, "utf8");
  } catch {
    fail(`skill \`${skill}\``, "no SKILL.md");
    continue;
  }

  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(body);
  if (front === null) {
    fail(`skill \`${skill}\``, "no YAML front matter delimited by --- at the very top");
    continue;
  }

  const fields = new Map();
  for (const line of front[1].split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (match !== null) fields.set(match[1], match[2].trim());
  }

  for (const required of ["name", "description"]) {
    if (!fields.get(required)) fail(`skill \`${skill}\``, `\`${required}\` is missing or empty — it is mandatory in the SKILL.md format`);
  }

  // Le nom déclaré et le dossier se répondent : c'est le dossier qui nomme la skill à
  // l'invocation, et un écart fait répondre une skill sous le nom d'une autre.
  if (fields.has("name") && fields.get("name") !== skill) {
    fail(`skill \`${skill}\``, `declares name: ${fields.get("name")} — it must match its directory`);
  }
}

// -------------------------------------------------- 2 & 3. what must never be published
const FORBIDDEN = [
  {
    pattern: /azurewebsites\.net/i,
    why: "an instance address hardcoded in a published artefact. Galy is multi-tenant: the address travels with the token, never in the repository.",
  },
  {
    pattern: /(galy-io|b-galy)\/claude-kit/,
    why: "the repository's former name. GitHub still redirects it, and that redirection is a silent dependency: it breaks the day anyone creates a repository under that name. Publish `b-galy/agent-kit`.",
  },
  {
    pattern: /\bgaly-io\b/,
    why: "the organisation's former name. It became `b-galy` with the brand, and `galy-io` is now an empty placeholder organisation whose only job is to hold the redirect. Publish `b-galy/agent-kit`.",
  },
  {
    // Ancree en debut de ligne : c'est la commande DONNEE A TAPER qu'on interdit, jamais la
    // phrase qui explique pourquoi il ne faut pas la taper.
    pattern: /^\s*\$?\s*npx\s+(-y\s+)?galy-setup\b/m,
    why: "`npx galy-setup` — that package is published on no registry and npm answers E404. Use `npx -y github:b-galy/agent-kit`.",
  },
];

const SELF = join(ROOT, "scripts", "validate.mjs");
for (const file of walk(ROOT)) {
  if (file === SELF) continue;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue; // binaire ou illisible : rien à y chercher
  }
  for (const { pattern, why } of FORBIDDEN) {
    if (pattern.test(text)) fail(relative(ROOT, file), why);
  }
}

// ---------------------------------------------------------------------------- verdict
if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} problem(s):\n`);
  for (const failure of failures) console.error(`  - ${failure}\n`);
  process.exit(1);
}

console.log(`✓ ${skills.length} skills conform, no instance address, no stale repository name, no command that does not exist.`);
