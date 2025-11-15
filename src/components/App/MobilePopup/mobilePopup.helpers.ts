import { escapeHtml, sanitizeHtml } from '@/utils/sanitize';

type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

type SanitizeOptions = Parameters<typeof sanitizeHtml>[1];

type BuildHeadlineParams = {
  appName: string;
  translate: TranslateFn;
  sanitizeOptions?: SanitizeOptions;
};

const DEFAULT_SANITIZE_OPTIONS: SanitizeOptions = {
  allowedTags: ['span', 'strong', 'em', 'br'],
  allowedAttributes: {
    span: ['class'],
  },
};

/**
 * Builds the safe HTML headline for the mobile popup dialog, mirroring the
 * Composition API logic used in the component.
 */
export function buildMobilePopupHeadline({
  appName,
  translate,
  sanitizeOptions = DEFAULT_SANITIZE_OPTIONS,
}: BuildHeadlineParams): string {
  const safeName = escapeHtml(appName);
  const polkaswapHighlight = `<span class="popup-info__headline--highlight">${safeName}</span>`;
  const headline = translate('mobilePopup.header', { polkaswapHighlight });

  return sanitizeHtml(headline, sanitizeOptions);
}

export { DEFAULT_SANITIZE_OPTIONS };
