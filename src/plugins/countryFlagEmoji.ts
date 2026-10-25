let countryFlagPolyfillPromise: Promise<void> | undefined;

/**
 * Returns whether the browser needs the flag emoji font fallback.
 */
export function shouldPolyfillCountryFlagEmojis(userAgent: string): boolean {
  const normalizedUserAgent = userAgent.toLowerCase();

  return /windows/.test(normalizedUserAgent) && !/firefox/.test(normalizedUserAgent);
}

/**
 * Lazily installs the flag emoji fallback only on browsers that need it.
 */
export function installCountryFlagEmoji(): void {
  if (typeof navigator === 'undefined') return;

  if (!shouldPolyfillCountryFlagEmojis(navigator.userAgent)) return;

  countryFlagPolyfillPromise ??= import('country-flag-emoji-polyfill')
    .then(({ polyfillCountryFlagEmojis }) => {
      polyfillCountryFlagEmojis();
    })
    .catch((error: unknown) => {
      countryFlagPolyfillPromise = undefined;
      console.warn('[startup] Country flag emoji polyfill skipped', error);
    });

  void countryFlagPolyfillPromise;
}
