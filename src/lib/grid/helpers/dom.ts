export type DocumentDirection = 'ltr' | 'rtl' | 'auto';

let cachedDirection: DocumentDirection = 'auto';

function hasDocument(): boolean {
  return typeof document !== 'undefined';
}

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

export function getDocumentDir(): DocumentDirection {
  if (!hasDocument()) return cachedDirection;

  const root = document.documentElement;
  const dirAttr = root?.getAttribute('dir');
  const dir = (document.dir || dirAttr || cachedDirection) as DocumentDirection;
  cachedDirection = dir;
  return dir;
}

/**
 * Reads the effective CSS direction for a grid element, falling back to the document.
 */
export function getElementDir(element?: Element | null): DocumentDirection {
  if (!element || !hasWindow()) return getDocumentDir();

  const direction = window.getComputedStyle(element).direction;
  return direction === 'rtl' || direction === 'ltr' ? direction : getDocumentDir();
}

export function setDocumentDir(dir: DocumentDirection): void {
  if (!hasDocument()) {
    cachedDirection = dir;
    return;
  }

  document.documentElement.setAttribute('dir', dir);
  cachedDirection = dir;
}

export function addWindowEventListener(event: string, callback: EventListenerOrEventListenerObject): void {
  if (!hasWindow()) {
    if (typeof callback === 'function') {
      callback.call(undefined, new Event(event));
    }
    return;
  }

  window.addEventListener(event, callback);
}

export function removeWindowEventListener(event: string, callback: EventListenerOrEventListenerObject): void {
  if (!hasWindow()) return;
  window.removeEventListener(event, callback);
}
