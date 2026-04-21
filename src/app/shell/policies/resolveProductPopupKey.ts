/**
 * Maps an optional product identifier to the corresponding popup state key.
 * Falls back to the Sora Mobile popup when product is empty or missing.
 */
export function resolveProductPopupKey(product?: string): string {
  const normalizedProduct = typeof product === 'string' && product.trim() ? product : 'soraMobile';
  return `show${normalizedProduct.charAt(0).toUpperCase()}${normalizedProduct.slice(1)}Popup`;
}
