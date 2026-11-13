# Scroll Thread Check

Decide which structural rule of a mage's sealed scroll, if any, one hash
breaks, from the facts the host read about that hash's threads.

A scroll is a sealed κ-evidence bundle: a run-root, ledgers, records, checks,
summaries, gaps and blobs, each named by its hash and tied together by
composed-of, provenance and derived-from threads. The host reads the facts
about one hash; this app decides the answer. Lean proves that six bad shapes
can never answer `ok`.

- **Live page:** [mitchuski.github.io/scroll-thread-check](https://mitchuski.github.io/scroll-thread-check/),
  which loads the holo in your browser, checks its fingerprint and replays its examples.
- **The trinket that lights by these rules:** [prism.mages.city](https://prism.mages.city/),
  the Mages City Prism, which reads any mage's scroll.
- **Spec:** [`openspec/specs/scroll-thread-check/spec.md`](openspec/specs/scroll-thread-check/spec.md).
- **Model:** [`app/src/ScrollThreadCheck.lex.tex`](app/src/ScrollThreadCheck.lex.tex)
  and its proofs, [`app/src/ScrollThreadCheckProofs.lex.tex`](app/src/ScrollThreadCheckProofs.lex.tex).

## What is proved

Proved by Lean for every request: the answer is never `ok` when

| | the hash… |
| --- | --- |
| INV-001 | is a row whose provenance does not reach a blob |
| INV-002 | is on the walk and has a composed-of thread out of the scroll |
| INV-003 | is a ledger, check or summary the root names but the walk never reaches |
| INV-004 | is a check or summary that does not derive from its ledger |
| INV-005 | comes first in the scroll and is not the run-root |
| INV-006 | is a record that no thread of any kind ties into the scroll |

INV-006 was not designed. Cutting every threaded hash out of every sealed
scroll, one at a time, found cuts the first five rules let through; every
held cut into a record became this rule, and no sealed scroll breaks it.

Everything else is tested, not proved: the ten rules and their order are
covered by the holo's acceptance vectors, and reading a request is tested.

## Ask it

One request is one line of seven fields:

```text
place kind outside walk rows provenance fact
```

```text
first root none reached none unlisted none     -> ok
other record none loose none unlisted none     -> looserecord
other ledger some reached match unlisted none  -> dangling
```

The first matching rule decides, in this order: `rootkind`, `dangling`,
`unreachable`, `rowsmismatch`, `rowmissing`, `noprovenance`, `factnoledger`,
`factunderived`, `gapunderived`, `looserecord`; otherwise `ok`. A malformed
line is `invalid`. The spec gives every field and answer.

```sh
# app.holo is served at https://mitchuski.github.io/scroll-thread-check/app.holo
npx prism-code inspect app.holo
npx prism-code vectors app.holo
npx prism-code run app.holo "other record none loose none unlisted none" --rm --policy pure-only
```

The holo is at assurance level P0: it carries its model, its proof and its
examples, but no signed provenance or proof statements yet, so the default
policy (P2) refuses to run it. `--policy pure-only` runs it as the pure
function it is; `vectors` needs no policy.

## What it does not decide

- Hashing, decoding and the seal are the host's; the model trusts the facts it is given.
- The whole-scroll verdict is the host's fold: the first rule in order, then the lowest index.
- A loose blob is not a defect. Sealed scrolls name many blobs with no thread
  into them, so blobs are guarded by the seal, not by these rules.

## Built on the UOR Prism template

Modeled in [LexLean](https://github.com/UOR-Foundation/LexLean), proved in
Lean 4, and built by [PrismPM](https://github.com/UOR-Foundation/PrismPM) into
a holo from [`UOR-Foundation/template`](https://github.com/UOR-Foundation/template),
whose README covers building, publishing and the gate in full.

## Everyday commands

| Command | What it does |
| --- | --- |
| `just vv` | The whole gate: format, model and audits, the SDK's template and lock checks, Clippy over every feature, the tests, `cargo deny`, and the Prism app's verified build. |
| `just app` | Checks the Prism application's model is canonical and locked, then builds and verifies its holo. |
| `just new-capability <ID> <level> <suite> "<statement>"` | Registers a capability with its scenario and failing test (R3). `level` is `build`, `open` or `some-true`. |
| `just model-write` | Regenerates `CONFORMANCE.md` from `model/`. |
| `just fmt` | Formats the workspace. |
| `just bdd` | Runs only the conformance meta-gate while you write scenarios. |

## Built from this template

- [MCP](https://github.com/UOR-Foundation/MCP): the Model Context Protocol, implemented as a server protocol core in LexLean and accepted only on MCP's own conformance oracles.
- [lexlean-mcp](https://github.com/UOR-Foundation/lexlean-mcp): serves LexLean to LLM clients over MCP, linking that protocol core unchanged.

## For coding agents

[AGENTS.md](AGENTS.md) holds the rules R1 to R6 and the required order of work.
Read it first. It is short, and every gate's failure message names the rule it
enforces, so a red `just vv` says which promise was broken.

## Repository layout

| Path | Owner | Purpose |
| --- | --- | --- |
| `app/` | project | The Prism application: its LexLean model, the Foundation library it imports, and its PrismPM manifest. |
| `model/` | project | The claim, authority and ledger registers: the single source of every claim (R1). |
| `features/suites/` | project | One Gherkin scenario per registered ID (R3). |
| `CONFORMANCE.md` | generated | Written by `just model-write`, never by hand. |
| `crates/model`, `crates/conformance` | template | The register parser and the honesty meta-gate. |
| `xtask/` | template | The repository gates and the `new-capability` scaffold. |
| `AGENTS.md`, `VERIFICATION.md`, `.devcontainer/`, `.github/workflows/bootstrap.yml`, `prismpm.lock`, `template.lock`, `template-contract.json` | universal policy | Byte-bound by `template.lock`. Changes arrive only as a reviewed template update. |

[TEMPLATE-CONTRACT.md](TEMPLATE-CONTRACT.md) defines the inherited policy and
the immutable SDK and template update process.
[VERIFICATION.md](VERIFICATION.md) defines the acceptance boundary, and
[TEMPLATE-VERIFICATION.md](TEMPLATE-VERIFICATION.md) maps this repository's
gates and their planted defects. Do not substitute a vendored PrismPM checkout
or a host toolchain for the locked SDK, and do not enable publication or
deployment before the project model and its acceptance criteria exist.

Licensed under [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE).
