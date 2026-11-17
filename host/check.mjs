// check.mjs - the host half, run end to end on sample scrolls.
// Each sample is one whole scroll as a ScrollVerify line. The host projects it into one
// seven-field request per hash, a judge answers each request, and the host folds the answers
// into one verdict. That verdict must equal decide.js (with the loose-record rule) on every line.
//
//   node host/check.mjs                 the judge is the rule table mirrored in thread_fold_v2.js
//   node host/check.mjs --holo app.holo the judge is the holo itself (needs: npm i prism-code)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const v2 = require("./thread_fold_v2.js");
const { decide } = require("./decide.js");
const lines = JSON.parse(readFileSync(new URL("./samples.json", import.meta.url), "utf8"));

let judge = async (req) => v2.judge(req), who = "the mirrored rule table";
const at = process.argv.indexOf("--holo");
if (at > 0) {
  const { load } = await import("prism-code");
  const app = await load(process.argv[at + 1] ?? "app.holo");
  const enc = new TextEncoder(), dec = new TextDecoder(), memo = new Map();
  judge = async (req) => {
    if (!memo.has(req)) memo.set(req, dec.decode(await app.dispatch(enc.encode(req))).trim());
    return memo.get(req);
  };
  who = `the holo (${app.name}, identities verified: ${app.identities.verified})`;
}

let agree = 0;
const tally = {}, off = [];
for (const line of lines) {
  const P = v2.project(line), verdicts = [];
  if (P) for (const req of P.reqs) verdicts.push(await judge(req));
  const got = v2.fold(P, verdicts), want = v2.decide2(line, decide);
  const rule = want.split("\t")[1] ?? "ok";
  tally[rule] = (tally[rule] ?? 0) + 1;
  if (got === want) agree++; else off.push({ want, got });
}
console.log(`judge: ${who}`);
console.log(`${agree}/${lines.length} sample scrolls: the folded answers agree with decide.js`);
console.log("verdicts covered:", JSON.stringify(tally));
for (const o of off.slice(0, 5)) console.log("  off", JSON.stringify(o));
process.exit(off.length ? 1 : 0);
