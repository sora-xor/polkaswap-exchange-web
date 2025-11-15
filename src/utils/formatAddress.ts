/**
 * Truncates an address string to improve readability while keeping its ends recognizable.
 * @param address - Full account address to display.
 * @param length - Total number of characters to keep (balanced between start and end).
 */
export function formatAddress(address: string, length = address.length / 2): string {
  const visibleSegment = Math.max(0, Math.floor(length / 2));

  return `${address.slice(0, visibleSegment)}...${address.slice(-visibleSegment)}`;
}

export default formatAddress;
