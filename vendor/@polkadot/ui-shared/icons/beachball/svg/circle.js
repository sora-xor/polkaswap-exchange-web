import { svg } from './svg.js';
export function circle(r, cx, cy) {
  const elem = svg('circle');
  elem.setAttributeNS('', 'cx', `${cx}`);
  elem.setAttributeNS('', 'cy', `${cy}`);
  elem.setAttributeNS('', 'r', `${r}`);
  return elem;
}
