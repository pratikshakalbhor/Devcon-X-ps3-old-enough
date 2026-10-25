// Claim CLI skeleton - sends only proof and nullifier
// NOT RUN

import { ethers } from "ethers";

export async function claim(passAddress: string, proof: Uint8Array | string, nullifier: string, signer: ethers.Signer) {
  // Skeleton only
  const abi = ["function claim(bytes proof, bytes32 nullifier) external"];
  const contract = new ethers.Contract(passAddress, abi, signer);
  // const tx = await contract.claim(proof, nullifier);
  // await tx.wait();
  throw new Error("NOT RUN - skeleton only");
}

export async function main() {
  console.log("NOT RUN - client claim skeleton");
}

if (require.main === module) {
  main();
}
