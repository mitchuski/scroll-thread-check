# The host half

The app decides one hash at a time. A whole scroll needs three more steps, and
they live here: read the scroll, ask the app about each hash, and fold the
answers into one verdict. This is the code the
[Prism](https://prism.mages.city/) runs. It is **tested, not proved**: the Lean
proofs cover the app's answers, not this folder.

```text
scroll ──project──▶ one request per hash ──judge (the holo)──▶ answers ──fold──▶ verdict
```

| File | What it does |
| --- | --- |
| `thread_fold.js` | `project`: reads one scroll line into a seven-field request per hash. `fold`: the whole-scroll verdict, the first rule in order and then the lowest index. `judge`: a copy of the app's rule table, for running without the holo. |
| `thread_fold_v2.js` | Adds the walk value `loose` and the rule `looserecord` (INV-006) on top of `thread_fold.js`. |
| `decide.js` | The reference verdict for a whole scroll, written without the app. The fold must agree with it. The Prism runs this same file. |
| `samples.json` | 34 scrolls, up to three for each verdict. They hold only structure: kinds as letters, threads as index pairs. No hashes. |
| `check.mjs` | Runs every sample through project → judge → fold and compares the result with `decide.js`. |

## Run it

```sh
node host/check.mjs                      # judge = the copied rule table
npm i prism-code
curl -sO https://mitchuski.github.io/scroll-thread-check/app.holo
node host/check.mjs --holo app.holo      # judge = the holo itself
```

Both runs give `34/34`. With `--holo`, every per-hash answer comes from the
holo, so the copied table plays no part in the result.

## A scroll line

One scroll is one tab-separated line:

```text
1  verify  n  kinds  threads  named  ledgers  refs
```

| Field | Meaning |
| --- | --- |
| `n`, `kinds` | The number of hashes, and one letter each: `R` root, `L` ledger, `O` record, `B` blob, `C` check, `S` summary, `G` gap. |
| `threads` | `a>b:r` for each thread, where `r` is `c` composed-of, `p` provenance or `d` derived-from. |
| `named` | The indices the root names. |
| `ledgers` | `L=r1.r2…`: each ledger's rows, in their declared order. |
| `refs` | `x=L`: the ledger each check, summary or gap refers to. |

The host decides two things the app never sees. A malformed line is
`malformed`. A root that names an index past the end is `named-absent`.

## In the Prism

[prism.mages.city](https://prism.mages.city/) loads `decide.js`, then a
`decide2.js` with the same loose-record rule as `thread_fold_v2.js`, and lights
each scroll by them. The Prism's panel names the holo's fingerprint and the
parity. Over 1,792 test scrolls (sealed scrolls and their cuts), the holo,
folded here, agrees with what the Prism shows on every one. `samples.json` is a
small slice of that set.
