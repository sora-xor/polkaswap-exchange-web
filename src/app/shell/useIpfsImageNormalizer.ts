import { toDwebLink } from '@/utils/ipfs';

/**
 * Normalizes image URLs added after mount so static IPFS deployments keep
 * working when components provide gateway or dweb-compatible image sources.
 */
export function createIpfsImageNormalizer() {
  let observer: MutationObserver | undefined;

  const normalizeImage = (el: HTMLImageElement): void => {
    try {
      const current = el.getAttribute('src') || '';
      const normalized = toDwebLink(current);
      if (normalized && normalized !== current) {
        el.setAttribute('src', normalized);
      }
    } catch {
      // Best-effort normalization should never block app rendering.
    }
  };

  const scan = (root: ParentNode | Document = document): void => {
    try {
      const images = root.querySelectorAll ? root.querySelectorAll('img[src]') : [];
      images.forEach((img) => normalizeImage(img as HTMLImageElement));
    } catch {
      // Best-effort normalization should never block app rendering.
    }
  };

  const start = (): void => {
    try {
      scan();
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === 'attributes' &&
            mutation.target instanceof HTMLImageElement &&
            mutation.attributeName === 'src'
          ) {
            normalizeImage(mutation.target);
          } else if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node instanceof HTMLImageElement) {
                normalizeImage(node);
              } else if ((node as ParentNode).querySelectorAll) {
                scan(node as ParentNode);
              }
            });
          }
        }
      });
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['src'],
        childList: true,
        subtree: true,
      });
    } catch {
      // Best-effort normalization should never block app rendering.
    }
  };

  const stop = (): void => {
    try {
      observer?.disconnect();
      observer = undefined;
    } catch {
      // Best-effort cleanup should never block app teardown.
    }
  };

  return {
    scan,
    start,
    stop,
  };
}
