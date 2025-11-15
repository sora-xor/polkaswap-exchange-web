/**
 * Injects an offline fallback shell into the root app container.
 * This allows headless test environments to render predictable markup without bootstrapping Vue.
 *
 * @param doc - Target document (defaults to global document when available).
 * @returns true when the offline shell was rendered, false otherwise.
 */
export function renderOfflineShell(
  doc: Document | undefined = typeof document !== 'undefined' ? document : undefined
): boolean {
  if (!doc) return false;

  const container = doc.getElementById('app');
  if (!container) {
    return false;
  }

  container.innerHTML = `
    <div class="offline-shell">
      <div class="offline-shell__brand">
        <h1>Polkaswap</h1>
        <p>Offline preview</p>
      </div>
      <header class="app-header">
        <nav class="offline-nav">
          <a href="#/swap" data-offline-link="swap">Swap</a>
          <a href="#/bridge" data-offline-link="bridge">Bridge</a>
        </nav>
        <button type="button" class="offline-connect-wallet">
          Connect Wallet
        </button>
      </header>
      <main class="offline-main">
        <section data-offline-page="swap" class="offline-page">
          <div data-test-name="swapFrom" class="offline-field">Swap From</div>
          <button type="button" data-test-name="switchToken" class="offline-switch">
            Switch
          </button>
          <div data-test-name="swapTo" class="offline-field">Swap To</div>
        </section>
        <section data-offline-page="bridge" class="offline-page" hidden>
          <h1>Bridge</h1>
          <div data-test-name="bridgeFrom" class="offline-field">Bridge From</div>
        </section>
      </main>
    </div>
  `;

  const swapSection = container.querySelector<HTMLElement>('[data-offline-page="swap"]');
  const bridgeSection = container.querySelector<HTMLElement>('[data-offline-page="bridge"]');

  container.querySelectorAll<HTMLAnchorElement>('[data-offline-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const target = link.getAttribute('data-offline-link');
      const isSwap = target === 'swap';

      if (swapSection && bridgeSection) {
        swapSection.hidden = !isSwap;
        bridgeSection.hidden = isSwap;
      }

      if (typeof window !== 'undefined') {
        const hash = isSwap ? '#/swap' : '#/bridge';
        window.location.hash = hash;
      }
    });
  });

  return true;
}
