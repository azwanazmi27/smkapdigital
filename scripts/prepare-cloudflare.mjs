// Generates configuration only; never deploys or mutates remote resources.
import { readFile, writeFile } from 'node:fs/promises';
const target = process.argv[2];
if (!['staging', 'production'].includes(target)) throw new Error('Choose staging or production.');
const targets = JSON.parse(await readFile('migration/targets.local.json', 'utf8'));
const selected = targets[target];
for (const key of ['name','account_id','database_id','database_name','bucket_name']) {
  if (!selected?.[key] || selected[key].includes('REPLACE')) throw new Error(`Unconfigured ${key}`);
}
if (!/^[0-9a-f]{32}$/.test(selected.account_id)) throw new Error('Invalid account ID');
if (!/^[0-9a-f-]{36}$/.test(selected.database_id)) throw new Error('Invalid D1 ID');
if (selected.database_id === '00000000-0000-4000-8000-000000000000') throw new Error('Placeholder database');
for (const key of ['name','database_id','database_name','bucket_name']) {
  if (targets.staging?.[key] && targets.staging[key] === targets.production?.[key]) throw new Error(`Environments share ${key}`);
}
const evidence = JSON.parse(await readFile('migration/release-evidence.local.json', 'utf8'));
if (target === 'staging' && evidence.isolated_staging_verified !== true) throw new Error('Staging isolation not verified');
if (target === 'production') {
  const gates = JSON.parse(await readFile('migration/release-gates.json', 'utf8'));
  if (gates.cutover_allowed !== true || Object.values(gates.gates).some(v => v !== 'PASS')) throw new Error('Production release gates are blocked');
}
const config = JSON.parse(await readFile('dist/server/wrangler.json', 'utf8'));
config.name = selected.name;
config.account_id = selected.account_id;
config.workers_dev = true;
config.preview_urls = false;
config.d1_databases = [{ binding: 'DB', database_name: selected.database_name, database_id: selected.database_id }];
config.r2_buckets = [{ binding: 'FILES', bucket_name: selected.bucket_name }];
config.vars = target === 'staging' ? { MIGRATION_MODE: 'isolated-staging' } : {};
config.triggers = {};
delete config.routes;
delete config.dispatch_namespaces;
await writeFile(`dist/server/wrangler.${target}.json`, JSON.stringify(config, null, 2) + '\n');
console.log(`Prepared ${target} configuration only. Secrets and integrations require separate verified setup.`);
