// thread_fold.js - the host half of scroll-thread-check (the UOR Prism app).
// project(line) reads one ScrollVerify request into one 8-field line per hash (the facts the host attests);
// judge(fields) is the app's rule table (the holo answers this; here a mirror for the parity run);
// fold(verdicts) is the whole-scroll verdict: the first rule in verify_bundle.py's order, then the lowest index.
// check.mjs holds fold(judge(project(line))) against decide.js; with --holo the holo answers judge.
const KINDW = { R: "root", L: "ledger", O: "record", B: "blob", C: "check", S: "summary", G: "gap" };
const ORDER = ["rootkind", "dangling", "namedabsent", "unreachable", "rowsmismatch", "rowmissing", "noprovenance", "factnoledger", "factunderived", "gapunderived"];
const RULEW = { rootkind: "root-kind", dangling: "dangling-composed", namedabsent: "named-absent", unreachable: "unreachable", rowsmismatch: "ledger-rows-mismatch",
  rowmissing: "row-missing", noprovenance: "row-no-provenance", factnoledger: "fact-no-ledger", factunderived: "fact-no-derived-from", gapunderived: "gap-no-derived-from" };

function parse(line) {
  const f = line.split("\t");
  if (!(f[0] === "1" && f[1] === "verify" && f.length === 8)) return null;
  const int = s => { if (!/^[+-]?\d+$/.test(s.trim())) throw 0; return parseInt(s, 10); };
  const two = (x, sep) => { const p = x.split(sep); if (p.length !== 2) throw 0; return p; };
  try {
    const n = int(f[2]), kinds = f[3]; if (!(n === kinds.length && n >= 1)) return null;
    const es = !f[4] ? [] : f[4].split(",").map(x => { const [a, b] = two(x, ">"); const [t, r] = two(b, ":"); return [int(a), int(t), r]; });
    const named = !f[5] ? [] : f[5].split(",").map(int);
    const ledgers = new Map(); for (const x of f[6].split(";").filter(Boolean)) { const [a, b] = two(x, "="); ledgers.set(int(a), b ? b.split(".").map(int) : []); }
    const refs = new Map(); for (const x of f[7].split(";").filter(Boolean)) { const [a, b] = two(x, "="); refs.set(int(a), int(b)); }
    return { n, kinds, es, named, ledgers, refs };
  } catch (e) { return null; }
}

// the host's facts, one 8-field request per hash; null = malformed (decided by the host)
function project(line) {
  const B = parse(line); if (!B) return null;
  const { n, kinds, es, named, ledgers, refs } = B, ok = i => i >= 0 && i < n;
  const out = new Map(); for (const [s, t, r] of es) { const k = s + "|" + r; if (!out.has(k)) out.set(k, []); out.get(k).push(t); }
  const get = (s, r) => out.get(s + "|" + r) || [];
  const reached = new Set(), stack = [0];
  while (stack.length) { const k = stack.pop(); if (reached.has(k) || !ok(k)) continue; reached.add(k); for (const t of get(k, "c")) stack.push(t); }
  const nm = new Set(named.filter(ok)), listed = new Set(); for (const rows of ledgers.values()) for (const r of rows) if (ok(r)) listed.add(r);
  const reqs = [];
  for (let i = 0; i < n; i++) {
    const k = kinds[i], kind = KINDW[k] || "record";
    const outside = reached.has(i) ? get(i, "c").filter(t => !ok(t)).length : 0;
    let rows = "none";
    if (ledgers.has(i)) {
      const a = new Set(ledgers.get(i)), b = new Set(get(i, "c"));
      if (a.size !== b.size || [...a].some(x => !b.has(x))) rows = "mismatch";
      else if (ledgers.get(i).some(r => !ok(r) || kinds[r] === "B")) rows = "missing";
      else rows = "match";
    }
    let provenance = "unlisted";
    if (listed.has(i)) { const p = get(i, "p"); provenance = !p.length || p.some(x => !ok(x) || kinds[x] !== "B") ? "broken" : "sound"; }
    let fact = "none";
    if (refs.has(i) && "SCG".includes(k)) {
      const L = refs.get(i), d = get(i, "d").includes(L);
      if ("SC".includes(k)) fact = !ok(L) || kinds[L] !== "L" ? "noledger" : d ? "derived" : "underived";
      else fact = d ? "derived" : "gapunderived";
    }
    // the walk: reached; unreached; or lost (the root names a ledger, check or summary the walk never reaches)
    const walk = reached.has(i) ? "reached" : nm.has(i) && "LSC".includes(k) ? "lost" : "unreached";
    reqs.push([i === 0 ? "first" : "other", kind, outside ? "some" : "none", walk, rows, provenance, fact].join(" "));
  }
  // verify_bundle reads rows ledger by ledger (keys ascending), each in its declared order: a row's rank is where it is first read
  const rowRank = new Map(); let rk = 0; for (const L of [...ledgers.keys()].sort((a, b) => a - b)) for (const r of ledgers.get(L)) if (!rowRank.has(r)) rowRank.set(r, rk++);
  return { reqs, namedAbsent: named.some(i => !ok(i)), rowRank };
}

// the app's rule table, as the spec states it (first match decides)
function judge(req) {
  const [place, kind, outside, walk, rows, provenance, fact] = req.split(" ");
  if (place === "first" && kind !== "root") return "rootkind";
  if (walk === "reached" && outside === "some") return "dangling";
  if (walk === "lost") return "unreachable";
  if (rows === "mismatch") return "rowsmismatch";
  if (rows === "missing") return "rowmissing";
  if (provenance === "broken") return "noprovenance";
  if (fact === "noledger") return "factnoledger";
  if (fact === "underived") return "factunderived";
  if (fact === "gapunderived") return "gapunderived";
  return "ok";
}

function fold(P, verdicts) {
  if (!P) return "reject\tmalformed\t0";
  const cands = verdicts.map((v, i) => [v, i]).filter(([v]) => v !== "ok");
  if (P.namedAbsent) cands.push(["namedabsent", 0]);
  if (!cands.length) return "ok";
  const at = ([v, i]) => v === "noprovenance" ? P.rowRank.get(i) : i;
  cands.sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]) || at(a) - at(b));
  return "reject\t" + RULEW[cands[0][0]] + "\t" + cands[0][1];
}

if (typeof module !== "undefined") module.exports = { project, judge, fold, ORDER };

