# Old Enough: prove you are 18+ and nothing else

A Noir circuit, a Solidity access contract and a buyer-side client for claiming a late-night festival pass by proving age, without the festival ever seeing a birth date. Built for Road to Devcon X, Problem 3.

## Status (read this first)

| Item | State |
|---|---|
| Circuit `circuits/age_proof/src/main.nr` | Written. **UNCOMPILED, UNTESTED**: `nargo` was not available. The hash call (`pedersen`) is unverified against any installed Noir version. |
| `nargo test` (6 cases) | **NOT RUN** |
| `bb` proving, Solidity verifier generation | **NOT RUN** |
| Contract `contracts/src/LateNightPass.sol` | Written, tested with Foundry (7/7) **against a MockVerifier, not the real UltraHonk verifier** |
| Client `client/` (noir_js, bb.js) | Skeleton, **NOT RUN** |

Nothing here has been proven end to end. The contract logic (binding, replay, staleness) is tested; the cryptography is not.

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

| # | Check | Where |
|---|---|---|
| 1 | Policy fixed by circuit/contract | `MIN_AGE_DAYS` in `main.nr` (global); day derived in `LateNightPass.sol:24` |
| 2 | Bound to claimer | `LateNightPass.sol:25` (`msg.sender`) |
| 3 | Age enforced by assertion | `main.nr:15,19` |
| 4 | No second acceptance | `LateNightPass.sol:20,21,37,38` |
| 5 | Stale proofs rejected | day from `block.timestamp`; `testStaleDayAfterWarpFails` |
| 6 | Proving on buyer device | `client/src/prove.ts` (skeleton, NOT RUN) |
| 7 | Birth date not public | `main.nr:3-10` |
| 8 | Grant only after verifier true | `LateNightPass.sol:33` before `:37` |
| 9 | Underage fails | `main.nr` `#[test(should_fail)]` cases (NOT RUN); mock-verifier rejection test `testUnderageProofRejectedByVerifier` |
| 10 | No secrets tracked | `.gitignore`; checked with `git ls-files` |

## Run

Requires Foundry, Node 20.12+, and (not available when this was written) `nargo` and `bb` with matching versions.

```bash
forge test                          # works: 7 tests, mock verifier
cd circuits/age_proof && nargo test # NOT RUN so far
# then: nargo compile, bb write_vk, bb write_solidity_verifier, replace the mock
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

## Next steps

Install `nargo` and `bb`, compile, run circuit tests, generate the real verifier, add a Foundry test with a real proof, run the client.
