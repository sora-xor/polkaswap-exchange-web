let cachedWidth: number | null = null;

export default function getScrollbarWidth(): number {
  if (cachedWidth !== null) return cachedWidth;
  if (typeof window === 'undefined') {
    cachedWidth = 0;
    return cachedWidth;
  }

  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.width = '100px';
  outer.style.msOverflowStyle = 'scrollbar';
  outer.style.overflow = 'scroll';
  document.body.appendChild(outer);

  const inner = document.createElement('div');
  inner.style.width = '100%';
  outer.appendChild(inner);

  const width = outer.offsetWidth - inner.offsetWidth;
  outer.parentNode?.removeChild(outer);

  cachedWidth = width;
  return cachedWidth;
}
