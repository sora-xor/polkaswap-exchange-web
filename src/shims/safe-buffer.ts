import { Buffer } from 'buffer';

const MAX_LENGTH_FALLBACK = 0x7fffffff;

const resolveNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

export const kMaxLength = resolveNumber((Buffer as { kMaxLength?: unknown }).kMaxLength, MAX_LENGTH_FALLBACK);
export const INSPECT_MAX_BYTES = resolveNumber((Buffer as { INSPECT_MAX_BYTES?: unknown }).INSPECT_MAX_BYTES, 50);
export const SlowBuffer =
  ((Buffer as { SlowBuffer?: typeof Buffer }).SlowBuffer as typeof Buffer | undefined) ?? Buffer;

export { Buffer };

const safeBuffer = {
  Buffer,
  SlowBuffer,
  INSPECT_MAX_BYTES,
  kMaxLength,
};

export default safeBuffer;
