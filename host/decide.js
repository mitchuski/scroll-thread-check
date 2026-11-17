// decide.js - the reference verdict for a whole scroll: a line-for-line port of the evidence
// verifier's decide(). The Prism runs this same file in the browser; node runs it for check.mjs.
// It is the reference the LexLean model is held to; it is NOT the proven holo.
(function (root) {
  function decide(line) {
    let n, kinds, es, named, ledgers, refs;
    try {
      const f = line.split("\t");
      if (!(f[0] === "1" && f[1] === "verify" && f.length === 8)) throw 0;
      n = int(f[2]); kinds = f[3];
      if (!(n === kinds.length && n >= 1)) throw 0;
      es = !f[4] ? [] : f[4].split(",").map(x => {
        const [a, b] = two(x, ">"); const [t, r] = two(b, ":");
        return [int(a), int(t), r];
      });
      named = !f[5] ? [] : f[5].split(",").map(int);
      ledgers = new Map();
      for (const x of f[6].split(";").filter(Boolean)) {
        const [a, b] = two(x, "=");
        ledgers.set(int(a), b ? b.split(".").map(int) : []);
      }
      refs = new Map();
      for (const x of f[7].split(";").filter(Boolean)) {
        const [a, b] = two(x, "="); refs.set(int(a), int(b));
      }
    } catch (e) { return "reject\tmalformed\t0"; }
    const ok = i => i >= 0 && i < n;
    const out = new Map();
    const key = (s, r) => s + "|" + r;
    for (const [s, t, r] of es) { const k = key(s, r); if (!out.has(k)) out.set(k, []); out.get(k).push(t); }
    const get = (s, r) => out.get(key(s, r)) || [];
    const rej = (rule, i) => "reject\t" + rule + "\t" + i;
    const sorted = m => [...m.keys()].sort((a, b) => a - b);

    if (kinds[0] !== "R") return rej("root-kind", 0);
    const reached = new Set(), stack = [0], dangling = [];
    while (stack.length) {
      const k = stack.pop();
      if (reached.has(k) || !ok(k)) continue;
      reached.add(k);
      for (const t of get(k, "c")) { if (!ok(t)) dangling.push(k); stack.push(t); }
    }
    if (dangling.length) return rej("dangling-composed", Math.min(...dangling));
    if (named.some(i => !ok(i))) return rej("named-absent", 0);
    const unr = named.filter(i => "LSC".includes(kinds[i]) && !reached.has(i));
    if (unr.length) return rej("unreachable", Math.min(...unr));
    for (const L of sorted(ledgers)) {
      const a = new Set(ledgers.get(L)), b = new Set(get(L, "c"));
      if (a.size !== b.size || [...a].some(x => !b.has(x))) return rej("ledger-rows-mismatch", L);
    }
    for (const L of sorted(ledgers))
      for (const r of ledgers.get(L)) if (!ok(r) || kinds[r] === "B") return rej("row-missing", L);
    for (const L of sorted(ledgers))
      for (const r of ledgers.get(L)) {
        const prov = get(r, "p");
        if (!prov.length || prov.some(p => !ok(p) || kinds[p] !== "B")) return rej("row-no-provenance", r);
      }
    for (const i of sorted(refs))
      if ("SC".includes(kinds[i])) { const L = refs.get(i); if (!ok(L) || kinds[L] !== "L") return rej("fact-no-ledger", i); }
    for (const i of sorted(refs))
      if ("SC".includes(kinds[i]) && !get(i, "d").includes(refs.get(i))) return rej("fact-no-derived-from", i);
    for (const i of sorted(refs))
      if (kinds[i] === "G" && !get(i, "d").includes(refs.get(i))) return rej("gap-no-derived-from", i);
    return "ok";
  }
  // Python int() on these fields: optional sign + digits only; anything else is malformed.
  function int(s) { if (!/^[+-]?\d+$/.test(s.trim())) throw 0; return parseInt(s, 10); }
  // Python's  a, b = x.split(sep)  needs exactly two parts
  function two(x, sep) { const p = x.split(sep); if (p.length !== 2) throw 0; return p; }
  if (typeof module !== "undefined" && module.exports) module.exports = { decide };
  else root.decide = decide;
})(typeof globalThis !== "undefined" ? globalThis : this);
