// Checks every template and writes them all to index.json, which Estiba's dashboard reads from
// raw.githubusercontent.com (CI commits it on every push to main).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";

const RAW = "https://raw.githubusercontent.com/estiba-cloud/templates/main/";
const MAX_LOGO = 64 * 1024; // bytes

// git's answer, or "" before the first commit.
const git = (...args) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

const validate = new Ajv({ allErrors: true }).compile(JSON.parse(readFileSync("schema.json", "utf8")));
const errors = [];
const templates = readdirSync("list")
  .sort()
  .map((id) => {
    const dir = `list/${id}`;
    const fail = (message) => errors.push(`${dir}: ${message}`);
    if (!/^[a-z0-9][a-z0-9_.-]{0,62}$/.test(id)) fail("the folder's name must be a service name: lowercase letters, digits, '.', '_' or '-'");
    if (!existsSync(`${dir}/config.json`)) return fail("it needs a config.json");
    const { $schema, ...t } = JSON.parse(readFileSync(`${dir}/config.json`, "utf8"));
    if (!validate(t)) validate.errors.forEach((e) => fail(`${e.instancePath || "/"} ${e.message}`));
    const used = new Set([...JSON.stringify(t.service ?? {}).matchAll(/\$\{(\w+)\}/g)].map((m) => m[1]));
    const names = (t.inputs ?? []).map((i) => i.name);
    for (const n of used) if (!names.includes(n)) fail(`\${${n}} is not an input`);
    for (const n of names) if (!used.has(n)) fail(`the input ${n} is not used`);
    const logo = [`${dir}/logo.svg`, `${dir}/logo.png`].find(existsSync);
    if (!logo) fail("it needs a logo.svg or logo.png");
    else if (statSync(logo).size > MAX_LOGO) fail(`${logo} is over ${MAX_LOGO / 1024} KB`);
    // When something in its folder last changed; now for one not committed yet.
    const updatedAt = git("log", "-1", "--format=%cI", "--", dir);
    return { id, ...t, logo: RAW + logo, updatedAt: new Date(updatedAt || Date.now()).toISOString() };
  });

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
writeFileSync("index.json", JSON.stringify({ templates }, null, 1) + "\n");
console.log(`${templates.length} templates`);
