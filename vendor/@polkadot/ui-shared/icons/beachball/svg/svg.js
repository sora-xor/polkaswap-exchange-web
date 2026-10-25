const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg(type) {
  return document.createElementNS(SVG_NS, type);
}
