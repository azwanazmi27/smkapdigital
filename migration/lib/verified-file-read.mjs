/** Prepared migration adapter. Not wired to production routes.
 * Callers MUST authorize the request before invoking this storage-only function.
 * mapping lookup and both transports are supplied by the server, never the client.
 */
export async function readMigratingFile(key, { findMapping, readDrive, readLegacy }) {
  if (typeof key !== 'string' || !key.length) throw new Error('Invalid logical file key');
  const mapping = await findMapping(key);
  // Never use an incomplete or unverified Drive copy.
  if (!mapping || mapping.status !== 'verified') return readLegacy(key);
  if (mapping.key !== key || typeof mapping.driveFileId !== 'string' || !mapping.driveFileId ||
      !Number.isSafeInteger(mapping.size) || mapping.size < 0 ||
      !/^[a-f0-9]{64}$/.test(mapping.sha256)) throw new Error('Invalid verified file mapping');
  const file = await readDrive(mapping.driveFileId);
  // A verified mapping is authoritative. Do not hide Drive failures with a stale R2 copy.
  if (!file || !(file.bytes instanceof Uint8Array)) throw new Error('Verified Drive file unavailable');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', file.bytes)))
    .map(value => value.toString(16).padStart(2, '0')).join('');
  if (file.bytes.byteLength !== mapping.size || hash !== mapping.sha256) throw new Error('Drive file integrity mismatch');
  return { ...file, source: 'drive', logicalKey: key };
}
