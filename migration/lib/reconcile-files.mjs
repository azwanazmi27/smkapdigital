/** Compare complete binary-object inventories; no network, writes or deletions.
 * A matched checksum does NOT verify permissions, completeness, or restoreability.
 */
export function reconcileFiles(source, destination) {
  const issues=[];
  const index=(rows,label)=>{
    if(!Array.isArray(rows)) throw new Error('Manifest objects must be arrays');
    const map=new Map();
    for(const row of rows) {
      if(!row || typeof row.key!=='string' || !row.key || !Number.isSafeInteger(row.size) || row.size<0 || !/^[a-f0-9]{64}$/.test(row.sha256||'')) throw new Error(`Invalid ${label} manifest entry`);
      if(map.has(row.key)) issues.push({kind:'duplicate-key',side:label,key:row.key});
      else map.set(row.key,row);
    }
    return map;
  };
  const src=index(source,'source'), dst=index(destination,'destination');
  const driveIds=new Set();
  for(const row of destination) {
    if(typeof row.driveFileId!=='string'||!row.driveFileId) issues.push({kind:'missing-drive-id',key:row.key});
    else if(driveIds.has(row.driveFileId)) issues.push({kind:'reused-drive-id',key:row.key});
    else driveIds.add(row.driveFileId);
  }
  let matched=0;
  for(const [key,row] of src) {
    const target=dst.get(key);
    if(!target) issues.push({kind:'missing-destination',key});
    else if(row.size!==target.size||row.sha256!==target.sha256) issues.push({kind:'content-mismatch',key});
    else matched++;
  }
  for(const key of dst.keys()) if(!src.has(key)) issues.push({kind:'unexpected-destination',key});
  return {status:issues.length?'FAIL':'PASS',sourceCount:source.length,destinationCount:destination.length,matched,issues,
    releaseGate:'NOT SATISFIED: inventory completeness, byte-export verification, permissions, relationships and restore tests require separate evidence'};
}
