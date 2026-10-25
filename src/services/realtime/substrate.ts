/**
 * Parses a Substrate RPC header payload and extracts block number.
 */
export function parseSubstrateHeaderNumber(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;

  const numberHex = (payload as { number?: unknown }).number;
  if (typeof numberHex !== 'string' || !numberHex.startsWith('0x')) return null;

  const value = Number.parseInt(numberHex.slice(2), 16);
  return Number.isFinite(value) ? value : null;
}
