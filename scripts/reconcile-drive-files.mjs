import { readFileSync, writeFileSync } from 'node:fs';
import { reconcileFiles } from '../migration/lib/reconcile-files.mjs';
const [sourcePath,destinationPath,reportPath,...extra]=process.argv.slice(2);
if(!sourcePath||!destinationPath||!reportPath||extra.length) {
 console.error('Usage: node scripts/reconcile-drive-files.mjs SOURCE.json DRIVE.json PRIVATE_REPORT.json');process.exit(2);
}
try {
 const result=reconcileFiles(JSON.parse(readFileSync(sourcePath,'utf8')),JSON.parse(readFileSync(destinationPath,'utf8')));
 // Fail rather than overwrite any existing evidence/input. Do not print file keys.
 writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({status:result.status,sourceCount:result.sourceCount,destinationCount:result.destinationCount,matched:result.matched,issueCount:result.issues.length,productionCutoverAllowed:false}));
 process.exitCode=result.status==='PASS'?0:1;
} catch { console.error('Reconciliation failed: check manifest schema and use a new private report path.');process.exitCode=2; }
