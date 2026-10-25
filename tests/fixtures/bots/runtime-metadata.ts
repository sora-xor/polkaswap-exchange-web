/** Public metadata-only test fixtures; runtime and execution archive artifacts are separate. */
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { u8aToHex } from '@polkadot/util';

/**
 * Read an exact retained metadata export independently of the current working directory.
 * Sources 128–130 contain raw SCALE metadata; runtime 131 retains its original compact
 * Bytes wrapper so callers perform their existing SDK or compact-length decoding.
 */
export async function readRuntimeMetadataExport(version: 128 | 129 | 130 | 131): Promise<string> {
  return u8aToHex(
    gunzipSync(await readFile(new URL(`./runtime-metadata/metadata-${version}.scale.gz`, import.meta.url)))
  );
}

/** Read the same retained export for synchronous module-level decoder fixtures. */
export function readRuntimeMetadataExportSync(version: 128 | 129 | 130 | 131): string {
  return u8aToHex(
    gunzipSync(readFileSync(new URL(`./runtime-metadata/metadata-${version}.scale.gz`, import.meta.url)))
  );
}
