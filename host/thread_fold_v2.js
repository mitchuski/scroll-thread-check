// thread_fold_v2.js - scroll-thread-check v2: v1 plus one rule written from the gaps.
// New walk value "loose": not reached, and no thread of any kind ties it in (the root is never loose).
// New rule, last in order: a record that is loose is never ok ("looserecord"). Blobs may be loose: sealed
// scrolls name thousands of blobs with nothing pointing in, so a loose blob is honest, and the seal guards it.
const v1 = require("./thread_fold.js");
const ORDER = [...v1.ORDER, "looserecord"];
function looseSet(line) {
  const f = line.split("\t"), n = +f[2], into = new Array(n).fill(0);
  for (const e of (f[4] ? f[4].split(",") : [])) { const t = +e.split(">")[1].split(":")[0]; if (t >= 0 && t < n) into[t]++; }
  return into;
}
function project(line) {
  const P = v1.project(line); if (!P) return null;
  const into = looseSet(line);
  P.reqs = P.reqs.map((r, i) => { const a = r.split(" "); if (i > 0 && a[3] === "unreached" && !into[i]) a[3] = "loose"; return a.join(" "); });
  return P;
}
function judge(req) {
  const v = v1.judge(req.replace(" loose ", " unreached ")); if (v !== "ok") return v;
  const [, kind, , walk] = req.split(" ");
  return kind === "record" && walk === "loose" ? "looserecord" : "ok";
}
const RULEW = { looserecord: "record-not-tied-in" };
function fold(P, verdicts) {
  const loose = verdicts.map((v, i) => [v, i]).filter(([v]) => v === "looserecord");
  const rest = v1.fold(P, verdicts.map(v => v === "looserecord" ? "ok" : v));
  return rest !== "ok" || !loose.length ? rest : "reject\t" + RULEW.looserecord + "\t" + loose[0][1];
}
// the v2 oracle the holo must agree with: v1's verdict, else the lowest loose record
function decide2(line, decide) {
  const v = decide(line); if (v !== "ok") return v;
  const P = project(line); const i = P ? P.reqs.findIndex(r => r.split(" ")[1] === "record" && r.split(" ")[3] === "loose") : -1;
  return i < 0 ? v : "reject\t" + RULEW.looserecord + "\t" + i;
}
module.exports = { project, judge, fold, decide2, ORDER };
