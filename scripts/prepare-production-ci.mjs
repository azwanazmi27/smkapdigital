// Produce the existing production Worker target from a fresh application build.
// This script only writes a local Wrangler config; deployment is a separate gated step.
import { readFile, writeFile } from 'node:fs/promises';

const source = JSON.parse(await readFile('dist/server/wrangler.json', 'utf8'));
const generatedDb = source.d1_databases?.find((item) => item.binding === 'DB');
const generatedFiles = source.r2_buckets?.find((item) => item.binding === 'FILES');
if (!source.main || !generatedDb || !generatedFiles) {
  throw new Error('Built Worker lacks the expected entrypoint, D1, or R2 binding');
}

const production = {
  ...source,
  name: 'portal',
  account_id: '4def4968e3047142b10d2601a56318b7',
  d1_databases: [{
    binding: 'DB',
    database_name: 'smkapdigital-production-db',
    database_id: '24214079-2cb4-41f8-b708-b4cda7784047',
  }],
  r2_buckets: [{ binding: 'FILES', bucket_name: 'smkapdigital-production-files' }],
  ai: { binding: 'AI' },
  vars: { ...source.vars, CLOUDFLARE_AI_BINDING: '1' },
};
await writeFile('dist/server/wrangler.production.json', JSON.stringify(production, null, 2));
