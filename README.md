# OldEnough (Road to Devcon X, Problem 3)

## Flow
1. Prover generates a zero-knowledge proof locally with private inputs `birth_day` (u32, day index/epoch-day as specified in the circuit) and `salt` (Field), and public inputs `current_day` (u32), `claimer` (Field/uint representation), `nullifier` (Field). 
2. The client sends `proof` and `nullifier` to `LateNightPass.claim(proof, nullifier)`. The contract builds `publicInputs` itself: `current_day = block.timestamp / 1 days`, `claimer = uint160(msg.sender)`, `nullifier`. It does **not** accept public inputs from the caller.
3. If valid and the nullifier not used and `msg.sender` has no pass, the contract calls `IVerifier.verify(proof, publicInputs)`; if it returns false, it reverts **before** recording. On success it records `nullifierUsed[nullifier]=true`, `hasPass[msg.sender]=true`, emits `PassClaimed(msg.sender, nullifier)`. No owner, no other grant paths.

## Public / private
| Item | Visibility | Notes |
|---|---|---|
| `birth_day` | private | Never public, never returned. |
| `salt` | private | Never public, never sent over network by the provided CLI sketch. |
| `current_day` | public | Passed as public input; contract derives from `block.timestamp` (1 day = 86400s). |
| `claimer` | public | Bound to `msg.sender` (contract computes `uint160(msg.sender)`). |
| `nullifier` | public | Must equal hash(salt, claimer). Prevents double-claim by same (salt, claimer). |
| `proof` | opaque bytes | Sent to contract; does not leak private inputs if circuit is correct. |

## Circuit
- Location: `circuits/age_proof/src/main.nr`, `circuits/age_proof/Nargo.toml`
- Constants/constraints: `const MIN_AGE_DAYS = 6575;` assert `current_day >= birth_day`; assert `current_day - birth_day >= MIN_AGE_DAYS`; assert `nullifier == poseidon2/pedersen hash(salt, claimer)`.  
- **Status:** UNCOMPILED, UNTESTED (nargo missing). Hash function name unverified against the installed version.
- Tests in circuit: adult, exact boundary, one day short (should_fail), underage (should_fail), future birth (should_fail), wrong nullifier (should_fail). (Not run.)

## Contracts
- `contracts/src/IVerifier.sol`: `function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);`
- `contracts/src/LateNightPass.sol`: As specified above. No owner, no other grant paths.
- **Tests:** Foundry tests under `contracts/test/` use a clearly named `MockVerifier` (accepts only if publicInputs match expected values, rejects otherwise). These use a **mock, not the real UltraHonk verifier**. Cases: valid claim, copied proof by another account fails (msg.sender binding), repeat claim fails, stale day after vm.warp fails, wrong nullifier fails, verifier false grants nothing. Underage case is documented as **circuit-level (NOT RUN)**.

## Client
- `client/` contains README-level instructions and a TypeScript prove/claim CLI skeleton using `noir_js` and `bb.js`. Proves locally, never sends birth date or salt anywhere. **NOT RUN**.

## What stays private / public / must be trusted
- **Private (must never leave prover):** `birth_day`, `salt`. 
- **Public:** `current_day`, `claimer`, `nullifier`, proof. 
- **Must be trusted / caveats:**
- Birth date truth is **unproven** (user can claim any birth date).
- **Sybil**: different wallets/identities can claim separately unless mitigated off-chain.
- **block.timestamp** can be manipulated slightly by validators/miners (and is used as `current_day` source).
- **365.25-day approximation** used implicitly by `MIN_AGE_DAYS = 6575` (18 years ~ 6570; 6575 is used as given).
- **Door check**: on-chain pass means proof verified for derived public inputs at claim time; physical/venue checks are separate.

## Rubric mapping (file:line)
| Rubric item | Location | Notes |
|---|---|---|
| Circuit structure & constraints | `circuits/age_proof/src/main.nr:1-80` (as written) | private/public, const, asserts, nullifier hash |
| Circuit tests (marked) | `circuits/age_proof/src/main.nr:tests` | adult, boundary, -1 day should_fail, underage should_fail, future birth should_fail, wrong nullifier should_fail |
| Nargo.toml | `circuits/age_proof/Nargo.toml` | dependencies noted; hash function name unverified |
| IVerifier | `contracts/src/IVerifier.sol:1-5` | `verify(bytes,bytes32[]) returns bool` |
| LateNightPass logic | `contracts/src/LateNightPass.sol:1-80` | derives publicInputs, checks, calls verifier before recording, reverts on false, records, emits |
| MockVerifier + tests | `contracts/test/LateNightPass.t.sol:1-220` | mock only, binding/replay/stale/wrong nullifier/verifier false/underage noted |
| Client skeleton + notes | `client/README.md`, `client/src/prove.ts`, `client/scripts/claim.ts` | noir_js/bb.js, local-only, NOT RUN |
| Gitignore | `.gitignore` | secrets/proofs/targets excluded |
| NOT RUN / UNCOMPILED markers | README + files | explicit throughout |

## NOT RUN list (prominent)
- [ ] `nargo build` / `nargo test` - nargo not installed
- [ ] `bb` proving/verification - bb not installed
- [ ] Circuit tests execution - no toolchain
- [ ] Client `npm install` / `tsc` / prove/claim - dependencies not installed; tsc not found
- [ ] Real UltraHonk verification (on-chain) - using MockVerifier only
- [ ] Integration with real verifier contract - not performed
- [ ] Actual proof generation/submission - not performed
- All results above are written without running Noir/toolchain; raw outputs shown where commands executed.
