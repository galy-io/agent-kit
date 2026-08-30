#!/usr/bin/env node
// Projects the kit's skills and agents into the layouts Codex reads.
//
// `galy/skills/` and `galy/agents/` are the SOURCE OF TRUTH and are never modified. This script
// reads them and writes `.agents/skills/` and `.codex/agents/`, both gitignored: nothing here is a
// second copy to maintain, it is a build output. Delete it and rebuild.
//
// THE TRANSFORMATION IS MECHANICAL. No sentence is rewritten, reworded or summarised — published
// measurements put model-authored instruction files at -20% success rate and +20% inference cost,
// so the body markdown is copied byte for byte. The only thing added is a preamble, above the
// original text, that never touches it.
//
//   galy/skills/<name>/SKILL.md  ->  .agents/skills/<name>/SKILL.md
//   galy/agents/<name>.md        ->  .codex/agents/<name>.toml
//
// CAPABILITIES CODEX LACKS ARE DECLARED, NEVER SILENTLY DROPPED. Substituting tool names inside
// the prose would corrupt code fences, tables and examples — and would be a rewrite. So each
// generated file carries a preamble listing the proprietary capabilities its body mentions and
// what a Codex session should do instead. The reader sees the gap; the text stays intact.
//
// This exists because the kit claims to be harness-neutral, and a claim nobody exercises is a
// wish. The product already holds that line and tests it: MaturityCatalog carries no vendor name,
// so a client who changes harness keeps their score. This script is the same promise, kept on the
// side the client actually installs.
//
// Usage:
//   node scripts/build-codex.mjs            # write the projection
//   node scripts/build-codex.mjs --check    # build into a temp tree and report drift, write nothing
//   node scripts/build-codex.mjs --quiet    # only the summary line

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_SRC = join(REPO, "galy", "skills");
const AGENTS_SRC = join(REPO, "galy", "agents");

const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const QUIET = args.includes("--quiet");

const OUT_ROOT = CHECK ? join(tmpdir(), `codex-projection-${randomUUID()}`) : REPO;
const OUT_SKILLS = join(OUT_ROOT, ".agents", "skills");
const OUT_AGENTS = join(OUT_ROOT, ".codex", "agents");

// Proprietary capability -> what a Codex session should do instead. The table lives here, beside
// the generator that applies it, so a newly used capability cannot be forgotten in a document
// nobody reads.
//
// Each entry carries its own PATTERN rather than being matched as a bare word, and that is not
// fussiness: `| Skill | Option |` and `| Authorised | Agent |` are table headers, and a preamble
// that announces a missing capability the page never uses discredits the entries that are real.
// A declaration nobody trusts is worse than no declaration.
const DEGRADATIONS = [
  {
    id: "AskUserQuestion",
    pattern: /\bAskUserQuestion\b/,
    advice: "Ask the question as plain text with numbered options, and wait for the answer before " +
      "continuing. Do NOT assume a default: the point of the question is that the user decides.",
  },
  {
    id: "the `galy:` namespace",
    pattern: /`galy:[a-z-]+`/,
    advice: "Codex has one flat namespace: drop the `galy:` prefix. A `galy:<agent>` is a Codex " +
      "subagent - prefer the matching profile in `.codex/agents/` - and a `galy:<skill>` is a " +
      "Codex skill invoked by name.",
  },
  {
    id: "${CLAUDE_PLUGIN_ROOT}",
    pattern: /\$\{CLAUDE_PLUGIN_ROOT\}/,
    advice: "The installed plugin's root. Under Codex, read the file from `.agents/skills/` " +
      "relative to the repository.",
  },
  {
    id: "WebFetch",
    pattern: /\bWebFetch\b/,
    advice: "Codex's native web tool.",
  },
  {
    id: "CronCreate",
    pattern: /\bCronCreate\b/,
    advice: "A scheduled task on the host, with an explicit stop condition written down.",
  },
];

// ── Reading ──────────────────────────────────────────────────────────────────

function splitFrontmatter(text) {
  // A file may legitimately open with a `---` horizontal rule; only treat it as frontmatter when a
  // closing fence follows.
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!m) return { frontmatter: {}, body: text, had: false };
  const frontmatter = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv) frontmatter[kv[1]] = kv[2].trim();
  }
  return { frontmatter, body: m[2], had: true };
}

function unquote(value) {
  if (!value) return value;
  const m = /^(['"])([\s\S]*)\1$/.exec(value.trim());
  return m ? m[2] : value.trim();
}

function tomlString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`;
}

/** Which proprietary capabilities this body actually uses, in table order. */
function usedCapabilities(body) {
  return DEGRADATIONS.filter((d) => d.pattern.test(body));
}

function preamble(origin, used) {
  const lines = [
    `<!-- GENERATED from ${origin} — DO NOT EDIT. Change the source, then re-run scripts/build-codex.mjs. -->`,
    "",
  ];
  if (used.length) {
    lines.push(
      "> **Codex equivalences.** This document comes from a harness whose capabilities are not all",
      "> present here. **The text below is unchanged** — read it with these substitutions:",
      "",
    );
    for (const d of used) lines.push(`> - \`${d.id}\` — ${d.advice}`);
    lines.push("");
  }
  return lines.join("\n");
}

function listDirs(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root).filter((n) => statSync(join(root, n)).isDirectory()).sort();
}

function listFiles(root, ext) {
  if (!existsSync(root)) return [];
  return readdirSync(root).filter((n) => n.endsWith(ext)).sort();
}

// ── Writing ──────────────────────────────────────────────────────────────────

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

const report = { skills: [], agents: [], gaps: new Map() };

function noteGap(name, where) {
  if (!report.gaps.has(name)) report.gaps.set(name, []);
  report.gaps.get(name).push(where);
}

function projectSkills() {
  for (const name of listDirs(SKILLS_SRC)) {
    const source = join(SKILLS_SRC, name, "SKILL.md");
    if (!existsSync(source)) continue;
    const raw = readFileSync(source, "utf8");
    const { frontmatter, body } = splitFrontmatter(raw);
    const used = usedCapabilities(body);
    for (const d of used) noteGap(d.id, `skills/${name}`);

    const description = unquote(frontmatter.description) ?? name;
    const head = [
      "---",
      `name: ${name}`,
      `description: ${tomlString(description)}`,
      "---",
      "",
    ].join("\n");

    // The body is copied byte for byte. Everything added sits above it.
    write(join(OUT_SKILLS, name, "SKILL.md"), head + preamble(`galy/skills/${name}/SKILL.md`, used) + body);
    report.skills.push({ name, used });

    // Anything else living beside the skill travels with it.
    for (const extra of readdirSync(join(SKILLS_SRC, name))) {
      if (extra === "SKILL.md") continue;
      const from = join(SKILLS_SRC, name, extra);
      if (statSync(from).isFile()) write(join(OUT_SKILLS, name, extra), readFileSync(from, "utf8"));
    }
  }
}

function projectAgents() {
  for (const file of listFiles(AGENTS_SRC, ".md")) {
    const name = file.replace(/\.md$/, "");
    const raw = readFileSync(join(AGENTS_SRC, file), "utf8");
    const { frontmatter, body } = splitFrontmatter(raw);
    const used = usedCapabilities(body);
    for (const d of used) noteGap(d.id, `agents/${name}`);

    const instructions = preamble(`galy/agents/${file}`, used) + body;
    const toml = [
      `name = ${tomlString(name)}`,
      `description = ${tomlString(unquote(frontmatter.description) ?? name)}`,
    ];
    // `model` and `color` have no Codex counterpart; `tools` is a Claude-side allow-list whose
    // names do not exist here, so it is dropped rather than mistranslated — the preamble already
    // says which capabilities are missing.
    if (frontmatter.effort) toml.push(`model_reasoning_effort = ${tomlString(unquote(frontmatter.effort))}`);
    toml.push("developer_instructions = '''", instructions, "'''");

    write(join(OUT_AGENTS, `${name}.toml`), toml.join("\n") + "\n");
    report.agents.push({ name, used, dropped: ["model", "color", "tools"].filter((k) => k in frontmatter) });
  }
}

// ── Check mode ───────────────────────────────────────────────────────────────

function collect(root) {
  const out = new Map();
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else out.set(relative(root, full).split("\\").join("/"), readFileSync(full, "utf8"));
    }
  };
  walk(join(root, ".agents", "skills"));
  walk(join(root, ".codex", "agents"));
  return out;
}

// ── Main ─────────────────────────────────────────────────────────────────────

rmSync(OUT_SKILLS, { recursive: true, force: true });
rmSync(OUT_AGENTS, { recursive: true, force: true });
mkdirSync(OUT_SKILLS, { recursive: true });
mkdirSync(OUT_AGENTS, { recursive: true });

projectSkills();
projectAgents();

if (!QUIET) {
  console.log(`\nCodex projection — ${report.skills.length} skills, ${report.agents.length} agents\n`);
  console.log("Capabilities declared missing under Codex:");
  if (report.gaps.size === 0) {
    console.log("  (none — nothing in the sources mentions a proprietary capability)");
  } else {
    for (const [capability, where] of report.gaps) {
      console.log(`  ${capability.padEnd(20)} ${where.length} file(s): ${where.join(", ")}`);
    }
  }
}

if (CHECK) {
  const fresh = collect(OUT_ROOT);
  const committed = collect(REPO);
  const drift = [];
  for (const [path, content] of fresh) {
    if (!committed.has(path)) drift.push(`missing: ${path}`);
    else if (committed.get(path) !== content) drift.push(`stale: ${path}`);
  }
  for (const path of committed.keys()) if (!fresh.has(path)) drift.push(`orphan: ${path}`);
  rmSync(OUT_ROOT, { recursive: true, force: true });

  if (drift.length) {
    console.log(`\n✗ the projection is out of date — ${drift.length} file(s):`);
    for (const line of drift.slice(0, 20)) console.log(`   ${line}`);
    console.log("\nRun: node scripts/build-codex.mjs\n");
    process.exitCode = 1;
  } else {
    console.log("\n✓ the projection matches the sources.\n");
  }
} else if (!QUIET) {
  console.log(`\nWritten to .agents/skills/ and .codex/agents/ — build output, gitignored.\n`);
}
