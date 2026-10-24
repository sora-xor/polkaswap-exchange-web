// The trailing slash selects the browser package instead of Node's built-in buffer module.
import * as polyfill from 'buffer/';

// The previous shim exposed these optional Node-only names as undefined when
// buffer's browser implementation did not provide them. Retain that contract.
const optionalExports: Record<string, unknown> = { ...polyfill };

const MAX_LENGTH_FALLBACK = 0x7fffffff;
const STRING_MAX_LENGTH_FALLBACK = 0x7fffffff;

const resolveNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const resolvedKMaxLength = resolveNumber(optionalExports.kMaxLength, MAX_LENGTH_FALLBACK);
const resolvedKStringMaxLength = resolveNumber(optionalExports.kStringMaxLength, STRING_MAX_LENGTH_FALLBACK);

const Buffer = polyfill.Buffer as typeof polyfill.Buffer & { kMaxLength?: number; kStringMaxLength?: number };

if (typeof Buffer.kMaxLength !== 'number') {
  Buffer.kMaxLength = resolvedKMaxLength;
}

if (typeof Buffer.kStringMaxLength !== 'number') {
  Buffer.kStringMaxLength = resolvedKStringMaxLength;
}

export const Blob = optionalExports.Blob;
export const BlobOptions = optionalExports.BlobOptions;
export const File = optionalExports.File;
export const FileOptions = optionalExports.FileOptions;
export const INSPECT_MAX_BYTES = optionalExports.INSPECT_MAX_BYTES;
export const SlowBuffer = optionalExports.SlowBuffer;
export const TranscodeEncoding = optionalExports.TranscodeEncoding;
export const atob = optionalExports.atob;
export const btoa = optionalExports.btoa;
export const constants = optionalExports.constants;
export const isAscii = optionalExports.isAscii;
export const isUtf8 = optionalExports.isUtf8;
export const kMaxLength = resolvedKMaxLength;
export const kStringMaxLength = resolvedKStringMaxLength;
export const resolveObjectURL = optionalExports.resolveObjectURL;
export const transcode = optionalExports.transcode;
export { Buffer };

export default Buffer;
