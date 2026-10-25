# Client (NOT RUN)

This directory contains README-level instructions and a TypeScript prove/claim CLI skeleton using `noir_js` and `bb.js`. 

## Setup (not executed)
1. Install dependencies: `npm install` (requires packages like `@noir-lang/noir_js`, `@aztec/bb.js` or equivalent). 
2. Ensure circuit artifacts are available (from `nargo compile` producing target artifacts) - **nargo not installed**.
3. Ensure proving backend (bb) is available - **bb not installed**.

## Prove locally (never sends birth date or salt)
- The prover takes private inputs `birth_day`, `salt` and public inputs `current_day`, `claimer`, `nullifier` from a local JSON (e.g. `Prover.toml`/input files). 
- Proof generation happens locally via `noir_js` + `bb.js`. 
- **Birth date and salt are never sent over network.** Only `proof` and `nullifier` are sent in the claim transaction.

## Claim
- The CLI constructs a transaction to `LateNightPass.claim(proof, nullifier)`. The contract derives `current_day`, `claimer` from chain state; caller does not supply them.

**Status:** NOT RUN. No packages installed, no compilation/execution performed.
