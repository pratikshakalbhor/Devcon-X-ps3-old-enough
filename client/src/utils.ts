import { createHash } from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function dateToDaysSinceEpoch(dateStr: string): bigint {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) throw new Error('Invalid date');
  const ms = d.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return BigInt(days);
}

export function randomSalt(): bigint {
  const buf = createHash('sha256').update(Math.random().toString()).update(Date.now().toString()).digest();
  return BigInt('0x' + buf.toString('hex'));
}

export async function computeNullifier(salt: bigint, claimer: bigint): Promise<bigint> {
  // Use bb.js pedersen hash to match Noir's std::hash::pedersen_hash
  try {
    const bb: any = require('@aztec/bb.js');
    const path = require('path');
    const Fr = require(path.join(process.cwd(), 'node_modules', '@aztec', 'bb.js', 'dest', 'node', 'barretenberg', 'testing', 'fields')).Fr;
    if (bb.BarretenbergSync) {
      const api = await bb.BarretenbergSync.initSingleton();
      const res = api.pedersenHash({ inputs: [new Fr(salt).toBuffer(), new Fr(claimer).toBuffer()], hashIndex: 0 });
      const hash = Fr.fromBuffer(res.hash).toString();
      return BigInt(hash);
    }
  } catch (e: any) {
    throw new Error(`Cannot compute pedersen_hash([salt, claimer]) to match circuit: ${e.message}`);
  }
  throw new Error('Cannot compute pedersen_hash([salt, claimer]) to match circuit.');
}
