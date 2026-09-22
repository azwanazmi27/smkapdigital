import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const tests = readdirSync('tests').filter(name => name.endsWith('.test.mjs') && name !== 'rendered-html.test.mjs').map(name => `tests/${name}`);
// rendered-html.test.mjs asserts the original starter skeleton, not the portal.
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...tests], { stdio: 'inherit' });
process.exit(result.status ?? 1);
