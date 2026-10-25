// CLI skeleton using noir_js and bb.js - proves locally, never sends birth date or salt anywhere
// NOT RUN

import { Noir } from "@noir-lang/noir_js";
// import { BarretenbergBackend } from "@aztec/bb.js"; // API may vary; skeleton only

export interface ProveInputs {
  // private
  birth_day: bigint | number;
  salt: bigint | string;
  // public
  current_day: bigint | number;
  claimer: bigint | string;
  nullifier: bigint | string;
}

export async function proveLocally(circuit: any, inputs: ProveInputs) {
  // Skeleton only - not executed
  const noir = new Noir(circuit);
  // const backend = new BarretenbergBackend(circuit);
  // await noir.init();
  // const { witness } = await noir.execute(inputs as any);
  // const proof = await backend.generateProof(witness);
  // return proof;
  throw new Error("NOT RUN - skeleton only");
}

// Usage: load circuit from target artifacts, read private inputs locally, generate proof
// Birth date and salt must never leave this process/network
export async function main() {
  console.log("NOT RUN - client prove skeleton");
}

if (require.main === module) {
  main();
}
