# Old Enough: prove you are 18+ and nothing else

A Noir circuit, a Solidity access contract and a buyer-side client for claiming a late-night festival pass by proving age, without the festival ever seeing a birth date. Built for Road to Devcon X, Problem 3.

## Status (read this first)

| Item | State | Evidence |
|---|---|---|
| Circuit `circuits/age_proof/src/main.nr` | Written | Global `MIN_AGE_DAYS = 6575`. Private `birth_day`/`salt`, public `current_day`/`claimer`/`nullifier`. Asserts age >= 6575 and `nullifier == pedersen_hash([salt,claimer])`. Birth date never public/returned. |
| `nargo test` (6 cases) | **BLOCKED** | `nargo` not found in PATH. No native Windows binaries available per official Noir docs; WSL not available. CI workflow added but failed (see below). |
| `nargo compile` | **BLOCKED** | Same as above. |
| `bb` proving, Solidity verifier generation | **NOT RUN / BLOCKED** | `bb` not installed. Real UltraHonk verifier not generated. |
| Contract `contracts/src/LateNightPass.sol` | **PASS (unit tests)** | Logic verified by Foundry tests against **MockVerifier only**. Derives public inputs from `block.timestamp/1 days` and `msg.sender`, reverts on false before recording, no owner/other grant paths. |
| Foundry tests | **PASS** | `forge test -vv`: 7/7 passed (all tests including `testUnderageProofRejectedByVerifier` with mock returning false). Mock-based only - not cryptographic proof verification. |
| `forge build` | **PASS** | Exit code 0, compilation skipped (no changes). |
| Client `client/` (noir_js, bb.js) | **PARTIAL** | Skeleton written. `npm install --ignore-scripts` completed, `npx tsc --noEmit` passes (exit 0). Proving/claiming **NOT RUN** (needs circuit artifacts). |
| GitHub Actions (Noir CI) | **FAIL** | Workflow `.github/workflows/noir.yml` added and pushed. Run [40158580601](https://github.com/pratikshakalbhor/Devcon-X-ps3-old-enough/actions/runs/40158580601) completed with failure (ubuntu-latest, noirup). Logs not accessible without admin rights. |

Nothing here has been proven end to end. Contract logic (binding, replay, staleness) is tested; cryptography is not.

## Flow

1. Buyer enters a birth date locally. The client converts it to days since 1970-01-01 and picks a random salt.
2. The circuit takes private `birth_day`, `salt` and public `current_day`, `claimer`, `nullifier`.
3. It asserts `current_day >= birth_day`, `current_day - birth_day >= MIN_AGE_DAYS` (6575, about 18 years at 365.25 days) and `nullifier == hash(salt, claimer)`.
4. The buyer calls `claim(proof, nullifier)`. The **contract** builds the public inputs itself: `current_day = block.timestamp / 1 days`, `claimer = uint160(msg.sender)`, plus the nullifier.
5. The contract checks the nullifier and address are unused, calls the verifier, reverts on false, and only then records the nullifier and `hasPass`.

## Inputs

| Input | Visibility | Source |
|---|---|---|
| `birth_day` | private | buyer's device |
| `salt` | private | buyer's device |
| `current_day` | public | contract (`block.timestamp`) |
| `claimer` | public | contract (`msg.sender`) |
| `nullifier` | public | buyer, checked in circuit against salt and claimer |

The birth date is never public and never returned from `main`.

## Acceptance checks

| # | Check | Where | Status (evidence) |
|---|---|---|---|
| 1 | Policy fixed by circuit/contract | `circuits/age_proof/src/main.nr:3-6` (global `MIN_AGE_DAYS=6575`, 18y@365.25); `contracts/src/LateNightPass.sol:24` (from `block.timestamp`), no setter | **PASS (design)** - fixed in circuit/contract, not caller-supplied |
| 2 | Bound to claimer | `contracts/src/LateNightPass.sol:25,28-30` (`msg.sender`); `circuits/age_proof/src/main.nr:11,23-25` (nullifier = hash(salt,claimer)) | **PASS (with mock)** - `contracts/test/LateNightPass.t.sol:80-93` `testCopiedProofByAnotherAccountFails` |
| 3 | Age enforced by assertion | `circuits/age_proof/src/main.nr:15,18-19` | **BLOCKED** - `#[test(should_fail)]` added; `nargo test` NOT RUN (nargo/bb missing on Windows; native not supported) |
| 4 | No second acceptance | `contracts/src/LateNightPass.sol:20,21,37-38` | **PASS (with mock)** - `contracts/test/LateNightPass.t.sol:95-101` `testRepeatClaimFails` |
| 5 | Stale proofs rejected | `contracts/src/LateNightPass.sol:24,28`; `circuits/age_proof/src/main.nr:15,18-19` | **PASS (with mock)** - `contracts/test/LateNightPass.t.sol:103-119` `testStaleDayAfterWarpFails` |
| 6 | Proving on buyer device | `client/src/prove.ts` (skeleton), `client/README.md` | **NOT RUN** - skeleton only; deps not installed; no real noir_js/bb.js flow executed |
| 7 | Birth date not public | `circuits/age_proof/src/main.nr:7,12` (private; not returned) | **PASS (design)** - birth_day private, not in public outputs |
| 8 | Grant only after verifier true | `contracts/src/LateNightPass.sol:33-39` | **PASS (with mock)** - `contracts/test/LateNightPass.t.sol:134-141` `testVerifierFalseGrantsNothing` |
| 9 | Underage fails | `circuits/age_proof/src/main.nr:48-66` `#[test(should_fail)]`; `contracts/test/LateNightPass.t.sol:144-152` | **BLOCKED** - circuit tests NOT RUN; contract mock test exists |
| 10 | No secrets tracked | `.gitignore`; `git ls-files` scanned | **PASS** - no secrets/keys/mnemonics in tracked files |

## Run (actual results)

```bash
forge build                          # PASS (exit 0)
forge test -vv                       # PASS - 7/7 tests passed (MockVerifier only)
cd client && npm install --ignore-scripts  # PASS
cd client && npx tsc --noEmit        # PASS (exit 0)
cd circuits/age_proof && nargo test  # BLOCKED - nargo not installed (Windows native unavailable)
nargo compile                       # BLOCKED
bb write_vk / write_solidity_verifier # BLOCKED
```

## What stays private, what is public, what you must trust

- **Private:** birth date and salt, never leaving the device (design; client NOT RUN).
- **Public:** current day, claimer address, nullifier, and the fact this address holds a pass.
- **Trust, not solved:**
  - Nothing proves the birth date is real. A prover can type any date. This proves "I know an 18+ date bound to this account". The door ID check is the real-world anchor; an issuer-signed credential would be needed and is not implemented.
  - Sybil: one pass per address, so one person can use many addresses.
  - `block.timestamp` is validator-influenced by seconds, and the day boundary makes proofs valid for one UTC day only.
  - Age uses 365.25-day years.
  - The generated Solidity verifier would be trusted code; not yet generated.
  - **All cryptographic verification untested** - only MockVerifier used.

## Next steps

1. **Noir toolchain:** Native Windows not supported. CI added but failing - need GitHub Actions logs/permissions to debug. Alternatively use a Linux machine/VM. Choose compatible Noir/bb versions.
2. **Circuit:** Once toolchain available, run `nargo test` and `nargo compile`. Fix any compatibility issues without weakening checks.
3. **Verifier:** Generate with `bb write_vk` and `bb write_solidity_verifier`, inspect generated code, replace MockVerifier only if compatible.
4. **Integration tests:** Add Foundry tests with real proofs.
5. **Client:** Complete proving/claiming flow against deployed contracts.

## Security/Integration Limitations
- No real ZK proof verification performed
- MockVerifier used in all contract tests
- Circuit not compiled/tested locally or successfully in CI
- No end-to-end testing
- Verifier not generated/deployed
- Production readiness not established
