// Fixed, previously verified non-secret staging resources; no production target.
import {writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const staging = {
  name: 'smkapdigital-staging',
  account_id: '4def4968e3047142b10d2601a56318b7',
  database_id: 'af5a7f3f-8978-4419-b93f-9043570dc26f',
  database_name: 'smkapdigital-staging-db',
  bucket_name: 'smkapdigital-staging-files',
};
// Exclusive create: never replace a developer's local configuration or evidence.
await writeFile('migration/targets.local.json',JSON.stringify({staging}),{flag:'wx',mode:0o600});
await writeFile('migration/release-evidence.local.json',JSON.stringify({isolated_staging_verified:true,scope:'Verified dedicated staging resources; runtime MIGRATION_MODE isolation retained; no production target or integration credentials supplied by CI.'}),{flag:'wx',mode:0o600});
const result=spawnSync(process.execPath,['scripts/prepare-cloudflare.mjs','staging'],{stdio:'inherit'});
process.exit(result.status??1);
