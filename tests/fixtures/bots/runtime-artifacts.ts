/** Public hash-pinned runtime binaries and invented state used only by offline tests. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compactStripLength, hexToU8a, u8aToHex } from '@polkadot/util';
import { readRuntimeMetadataExport, readRuntimeMetadataExportSync } from './runtime-metadata';

export interface RuntimeDispatchFixture {
  declarations: { key: string; value: string | null }[];
  extrinsicHex: string;
}

export interface RuntimeQuoteFeeFixture {
  quote: { inputHex: string; resultHex: string };
  fees: { inputHex: string; infoResultHex: string; detailsResultHex: string };
}

/** Resolve the public runtime artifact without depending on an operator checkout or cwd. */
export function runtimeWasmFixturePath(version: 130 | 131): string {
  if (version !== 130 && version !== 131) throw new Error('Unsupported runtime fixture');
  return fileURLToPath(new URL(`./runtime-artifacts/runtime-${version}.compact.compressed.wasm`, import.meta.url));
}

/** Return raw SCALE metadata, removing only runtime 131's retained compact Bytes wrapper. */
export async function readRuntimeMetadataHex(version: 128 | 129 | 130 | 131): Promise<string> {
  const exported = await readRuntimeMetadataExport(version);
  return version === 131 ? u8aToHex(compactStripLength(hexToU8a(exported))[1]) : exported;
}

/** Synchronous equivalent for existing test declarations initialized at module load. */
export function readRuntimeMetadataHexSync(version: 128 | 129 | 130 | 131): string {
  const exported = readRuntimeMetadataExportSync(version);
  return version === 131 ? u8aToHex(compactStripLength(hexToU8a(exported))[1]) : exported;
}

/** Read a fresh copy of the invented pool declarations and signed development fixture extrinsic. */
export function readRuntimeDispatchFixture(): RuntimeDispatchFixture {
  return JSON.parse(readFileSync(new URL('./runtime-artifacts/synthetic-state.json', import.meta.url), 'utf8'));
}

/** Read the original exact-runtime outputs for one invented swap direction. */
export function readRuntimeQuoteFeeFixture(direction: string): RuntimeQuoteFeeFixture {
  if (direction !== 'kusd-xor' && direction !== 'xor-kusd') throw new Error('Unsupported fixture direction');
  const fixtures = JSON.parse(
    readFileSync(new URL('./runtime-artifacts/quote-fee-oracles.json', import.meta.url), 'utf8')
  ) as Record<'kusd-xor' | 'xor-kusd', RuntimeQuoteFeeFixture>;
  return fixtures[direction];
}
