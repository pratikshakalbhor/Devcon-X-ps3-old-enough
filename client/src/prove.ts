// Buyer-side local proving using noir_js + bb.js
// Birth date and salt NEVER leave this process. Do not log them.

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dateToDaysSinceEpoch, randomSalt, computeNullifier } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ProveInputs {
  birth_day: bigint | number;
  salt: bigint;
  current_day: bigint | number;
  claimer: bigint | string;
  nullifier: bigint | string;
}

export interface ProofOutput {
  proof: string;
  publicInputs: string[];
  nullifier: string;
  current_day: string;
}

export async function proveLocally(circuit: any, inputs: ProveInputs): Promise<ProofOutput> {
  // Try to load noir_js
  let Noir: any;
  try {
    const noirJs: any = await import('@noir-lang/noir_js');
    Noir = noirJs.Noir;
  } catch (e: any) {
    throw new Error(`Failed to load @noir-lang/noir_js: ${e.message}. Install dependencies with npm install in client/.`);
  }

  // Try to load bb.js (API varies by version)
  let UltraHonkBackend: any = null;
  let Barretenberg: any = null;
  try {
    const bb: any = await import('@aztec/bb.js');
    UltraHonkBackend = bb.UltraHonkBackend || null;
    Barretenberg = bb.Barretenberg || null;
  } catch (e: any) {
    console.error(`Warning: Could not load bb.js: ${e.message}`);
  }

  const noir = new Noir(circuit);
  if (typeof (noir as any).init === 'function') {
    await (noir as any).init();
  }

  const witnessInputs = {
    birth_day: inputs.birth_day,
    salt: inputs.salt,
    current_day: inputs.current_day,
    claimer: inputs.claimer,
    nullifier: inputs.nullifier,
  };

  let witness: Uint8Array;
  try {
    const result = await noir.execute(witnessInputs);
    witness = result.witness;
  } catch (e: any) {
    throw new Error(`Witness generation failed: ${e.message}`);
  }

  if (!UltraHonkBackend) {
    throw new Error('UltraHonkBackend not found in @aztec/bb.js. Check installed version/API.');
  }

  if (!Barretenberg) {
    throw new Error('Barretenberg not found in @aztec/bb.js. Check installed version/API.');
  }

  let proof: any;
  try {
    // UltraHonkBackend constructor takes (acirBytecode, api) in some versions
    // Try to construct appropriately
    const acirBytecode = typeof circuit.bytecode === 'string' ? circuit.bytecode : JSON.stringify(circuit.bytecode);
    const api = await Barretenberg.new();
    const backend = new UltraHonkBackend(acirBytecode, api);
    proof = await backend.generateProof(witness, { verifierTarget: 'evm' });
  } catch (e: any) {
    throw new Error(`Proof generation failed: ${e.message}`);
  }

  let proofStr: string;
  if (proof.proof) {
    proofStr = Buffer.from(proof.proof).toString('hex');
  } else if (proof instanceof Uint8Array) {
    proofStr = Buffer.from(proof).toString('hex');
  } else if (Array.isArray(proof)) {
    proofStr = Buffer.from(Uint8Array.from(proof)).toString('hex');
  } else {
    proofStr = JSON.stringify(proof);
  }

  return {
    proof: proofStr,
    publicInputs: [
      inputs.current_day.toString(),
      inputs.claimer.toString(),
      inputs.nullifier.toString(),
    ],
    nullifier: inputs.nullifier.toString(),
    current_day: inputs.current_day.toString(),
  };
}

export async function main() {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.log('Usage: npm run prove -- --birth-date YYYY-MM-DD --account 0x... --day <n>');
    console.log('Or set env vars: BIRTH_DATE, ACCOUNT, DAY');
    process.exit(1);
  }

  // Parse args simply
  let birthDate = process.env.BIRTH_DATE;
  let account = process.env.ACCOUNT;
  let day = process.env.DAY;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--birth-date' && args[i+1]) birthDate = args[i+1];
    if (args[i] === '--account' && args[i+1]) account = args[i+1];
    if (args[i] === '--day' && args[i+1]) day = args[i+1];
  }

  if (!birthDate || !account || !day) {
    throw new Error('Missing required args');
  }

  const birthDay = dateToDaysSinceEpoch(birthDate);
  const salt = randomSalt();
  const currentDay = BigInt(day);
  const claimer = BigInt(account);

  // Compute nullifier - MUST match circuit: pedersen_hash([salt, claimer])
  let nullifier: bigint;
  try {
    nullifier = await computeNullifier(salt, claimer);
  } catch (e: any) {
    console.error('ERROR:', e.message);
    console.error('Cannot generate valid proof without matching circuit hash.');
    process.exit(1);
  }

  console.log('Proving locally (private inputs never logged)...');
  console.log(`Public: current_day=${currentDay}, claimer=${account}`);

  // Load circuit
  const circuitPath = path.join(__dirname, '../../circuits/age_proof/target/age_proof.json');
  if (!fs.existsSync(circuitPath)) {
    console.error(`Circuit artifact not found at ${circuitPath}`);
    console.error('Build it with: cd circuits/age_proof && nargo compile (requires nargo)');
    console.error('Or get artifact from CI.');
    process.exit(1);
  }

  const circuit = JSON.parse(fs.readFileSync(circuitPath, 'utf8'));
  
  try {
    const result = await proveLocally(circuit, {
      birth_day: birthDay,
      salt: salt,
      current_day: currentDay,
      claimer: claimer,
      nullifier: nullifier,
    });
    
    const outPath = path.join(process.cwd(), 'proof.json');
    fs.writeFileSync(outPath, JSON.stringify({
      proof: result.proof,
      nullifier: result.nullifier,
      current_day: result.current_day,
      publicInputs: result.publicInputs,
    }, null, 2));
    
    console.log(`Proof written to ${outPath} (gitignored)`);
    console.log('Public inputs:', result.publicInputs);
  } catch (e: any) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
