#!/usr/bin/env node
// check-statusline — the row names this working copy's work, and nothing else.
//
// It exists because of the failure it replays: the row used to name the workspace's
// queue, so a workstation running twenty worktrees showed the same three specs in all
// twenty, and showed them before any work had started. Every assertion below is one
// sentence of that: nothing claimed shows nothing, two copies show two rows, and an
// `id` that belongs to a phase never lands on a spec.
//
//   node scripts/check-statusline.mjs
//
// It speaks to no network: the catalog of names is written by hand, and the whole run
// happens in a scratch folder that TEMP is pointed at, so a developer's own row and
// cache are never touched.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const STATUSLINE = fileURLToPath(new URL("../galy/statusline/bg-statusline.mjs", import.meta.url));
const HOOK = fileURLToPath(new URL("../galy/hooks/bg-work.mjs", import.meta.url));

const BENCH = mkdtempSync(join(tmpdir(), "bg-statusline-check-"));
const SCRATCH = join(BENCH, "temp");
const CONFIG_DIR = join(BENCH, "config");   // no chained row, no settings of anyone's
mkdirSync(SCRATCH, { recursive: true });
mkdirSync(CONFIG_DIR, { recursive: true });
const ENV = { ...process.env, TEMP: SCRATCH, TMP: SCRATCH, TMPDIR: SCRATCH, CLAUDE_CONFIG_DIR: CONFIG_DIR };

const CACHE_DIR = join(SCRATCH, "bg-statusline");
mkdirSync(CACHE_DIR, { recursive: true });
writeFileSync(join(CACHE_DIR, "catalog.json"), JSON.stringify({
  base: "https://example.galy.cloud",
  specs: { 11: "Profil : identité récoltée", 9: "Le vocal passe sous pavillon Galy" },
  briefs: { 32: "La porte d'un locataire s'ouvre en clair" },
}));
// Fresh, so no render ever spawns a refresh — the check must not reach for a network.
const holdStamp = () => writeFileSync(join(CACHE_DIR, "catalog.stamp"), "");
holdStamp();
// And the row the failure produced, left exactly where it used to be read from. A check
// that goes green only because a stale cache happened to be missing has proved nothing:
// with this file here, a row that names the workspace's queue is caught by the first
// assertion below instead of slipping past it.
writeFileSync(join(CACHE_DIR, "work"), "bg spec Profil · Le vocal  |  brief La porte d'un locataire");

function copy(name) {
  const dir = join(BENCH, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".git"), `gitdir: ${BENCH}/.git/worktrees/${name}\n`);
  return dir;
}

const bare = (s) => s.replace(/\x1b\]8;;[^\x1b]*\x1b\\/g, "").replace(/\x1b\[[0-9;]*m/g, "").trim();
const row = (cwd) => execFileSync(process.execPath, [STATUSLINE], {
  cwd, env: ENV, encoding: "utf8", input: JSON.stringify({ cwd, session_id: "check" }),
});
const wrote = (cwd, tool_name, tool_input, answer = { success: true }) => execFileSync(process.execPath, [HOOK], {
  cwd, env: ENV, encoding: "utf8",
  input: JSON.stringify({ cwd, tool_name, tool_input, tool_response: { content: [{ type: "text", text: JSON.stringify(answer) }] } }),
});
const held = (dir) => { try { return JSON.parse(readFileSync(join(dir, ".bg", "work.json"), "utf8")); } catch { return {}; } };

let failed = 0;
function check(what, condition) {
  if (condition) return;
  console.error(`✗ ${what}`);
  failed += 1;
}

const a = copy("wt-a");
const b = copy("wt-b");

// 1. Nothing claimed, nothing said — the failure that started this.
check("a copy that has claimed nothing shows an empty row", bare(row(a)) === "");
check("so does the one beside it", bare(row(b)) === "");

// 2. A claim in one copy is a claim in that copy alone.
wrote(a, "mcp__bg__feature_spec_pick", { id: 11 });
wrote(b, "mcp__bg__feature_brief_create", { title: "x" }, { success: true, brief_id: 32 });
holdStamp();
// The names are cut the way the row cuts them: a title is written for a page, and what
// fits here is the name at the head of it.
check("the copy that picked spec 11 names it", bare(row(a)) === "bg spec Profil");
check("the copy beside it names its own brief", bare(row(b)) === "bg brief La porte d'un locataire s'o…");
check("neither row mentions the other's work", !bare(row(a)).includes("porte") && !bare(row(b)).includes("Profil"));

// 3. `id` means a phase here, and a phase is not a spec.
wrote(a, "mcp__bg__feature_spec_set_phase_status", { id: 3, status: "Done" });
check("a phase id never lands on the specs held", held(a).specs.map((e) => e.id).join() === "11");

// 4. A write the workspace refused holds nothing.
wrote(a, "mcp__bg__feature_spec_pick", { id: 9 }, { success: false });
check("a refused claim is not recorded", held(a).specs.map((e) => e.id).join() === "11");

// 5. Completing lets go, and the most recent claim comes first.
wrote(a, "mcp__bg__feature_spec_pick", { id: 9 });
check("the newest claim is named first", held(a).specs.map((e) => e.id).join() === "9,11");
wrote(a, "mcp__bg__feature_spec_complete", { id: 11 });
check("a completed spec is let go", held(a).specs.map((e) => e.id).join() === "9");

// 6. Work put down and never picked up again stops being in hand.
writeFileSync(join(a, ".bg", "work.json"), JSON.stringify({
  specs: [{ id: 9, at: new Date(Date.now() - 2 * 86_400_000).toISOString() }],
}));
holdStamp();
check("a claim older than the horizon is no longer in hand", bare(row(a)) === "");

// 7. A spec the catalog has never heard of is still named, and still clicks through.
writeFileSync(join(b, ".bg", "work.json"), JSON.stringify({ specs: [{ id: 41, at: new Date().toISOString() }] }));
holdStamp();
const unknown = row(b);
check("an unnamed spec falls back on its number", bare(unknown) === "bg spec #41");
check("and keeps its link", unknown.includes("https://example.galy.cloud/specs/41"));

rmSync(BENCH, { recursive: true, force: true });

if (failed) { console.error(`\n${failed} check(s) failed.`); process.exit(1); }
console.log("✓ the row names this working copy's work, and stays empty until it has some.");
