# Client (buyer-side proving)

This client generates a cryptographic proof locally using `@noir-lang/noir_js` and `@aztec/bb.js`. **Birth date and salt never leave the device.**

## Prerequisites
- Node.js 18+ (tested with v22)
- Compiled circuit artifact from `circuits/age_proof/target/age_proof.json` (produced by `nargo compile`)
- nargo/bb to compile the circuit (or download artifact from CI)

**Windows note:** Noir/Barretenberg native tooling may have limitations on Windows. The Noir CI runs on Ubuntu (GitHub Actions). If local proving deps don't work on Windows, use the CI-generated artifact or a Linux environment.

## Install dependencies (PowerShell)
```powershell
cd "D:\Devcon X ps3\client"
npm install
```

## Build circuit artifact
From `circuits/age_proof` (requires nargo):
```powershell
cd "D:\Devcon X ps3\circuits\age_proof"
nargo compile
# Produces target/age_proof.json
```

If nargo is not installed locally, use the GitHub Actions artifact from the passing Noir workflow.

## Generate proof locally
```powershell
cd "D:\Devcon X ps3\client"
npm run prove -- --birth-date 1990-01-01 --account 0xA11CE --day 20000
```

This writes `proof.json` (gitignored) containing only public data: `proof`, `nullifier`, `current_day`, `publicInputs`. **Birth date and salt are never logged or written to disk.**

## Claim on-chain
```powershell
cd "D:\Devcon X ps3\client"
npm run claim -- --pass 0x<contract> --proof ./proof.json --rpc http://127.0.0.1:8545 --key <private_key>
```
(Claim script skeleton exists; wire it to your setup as needed.)

## Security notes
- Private inputs (birth_day, salt) are only used in-memory for witness generation
- No network requests are made with private inputs
- The nullifier is computed as `hash(salt, claimer)` matching the circuit
- Public inputs order must match circuit: `[current_day, claimer, nullifier]` (as built by contract)

## Status
**Implementation added.** Proof generation requires compiled circuit artifact + compatible noir_js/bb.js. On Windows without native Noir tooling, proving may need Linux/CI environment.
