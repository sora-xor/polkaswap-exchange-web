import { svg } from './svg.js';
export function element(size, type = 'svg', x = 0, y = 0) {
  const elem = svg(type);
  elem.setAttributeNS('', 'x', `${x}`);
  elem.setAttributeNS('', 'y', `${y}`);
  elem.setAttributeNS('', 'width', `${size}`);
  elem.setAttributeNS('', 'height', `${size}`);
  return elem;
}
