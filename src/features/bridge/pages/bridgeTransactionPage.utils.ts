/**
 * Builds the accessible label for a bridge address row by pairing the transfer
 * direction with the network-specific account label.
 */
export function buildBridgeAddressAriaLabel(direction: string, networkAddressLabel: string): string {
  return [direction.trim(), networkAddressLabel.trim()].filter(Boolean).join(': ');
}
