import * as polyfill from 'vite-plugin-node-polyfills/shims/buffer';

const MAX_LENGTH_FALLBACK = 0x7fffffff;
const STRING_MAX_LENGTH_FALLBACK = 0x7fffffff;

const resolveNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const resolvedKMaxLength = resolveNumber(polyfill.kMaxLength, MAX_LENGTH_FALLBACK);
const resolvedKStringMaxLength = resolveNumber(polyfill.kStringMaxLength, STRING_MAX_LENGTH_FALLBACK);

const Buffer = polyfill.Buffer;

if (Buffer && typeof (Buffer as { kMaxLength?: unknown }).kMaxLength !== 'number') {
  (Buffer as { kMaxLength: number }).kMaxLength = resolvedKMaxLength;
}

if (Buffer && typeof (Buffer as { kStringMaxLength?: unknown }).kStringMaxLength !== 'number') {
  (Buffer as { kStringMaxLength: number }).kStringMaxLength = resolvedKStringMaxLength;
}

export const Blob = polyfill.Blob;
export const BlobOptions = polyfill.BlobOptions;
export const File = polyfill.File;
export const FileOptions = polyfill.FileOptions;
export const INSPECT_MAX_BYTES = polyfill.INSPECT_MAX_BYTES;
export const SlowBuffer = polyfill.SlowBuffer;
export const TranscodeEncoding = polyfill.TranscodeEncoding;
export const atob = polyfill.atob;
export const btoa = polyfill.btoa;
export const constants = polyfill.constants;
export const isAscii = polyfill.isAscii;
export const isUtf8 = polyfill.isUtf8;
export const kMaxLength = resolvedKMaxLength;
export const kStringMaxLength = resolvedKStringMaxLength;
export const resolveObjectURL = polyfill.resolveObjectURL;
export const transcode = polyfill.transcode;
export { Buffer };

export default Buffer;
