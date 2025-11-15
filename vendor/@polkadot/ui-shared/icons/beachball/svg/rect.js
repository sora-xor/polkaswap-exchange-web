import { element } from './element.js';
export function rect(size) {
  const elem = element(size, 'rect');
  elem.setAttributeNS('', 'rx', `${size / 16}`);
  elem.setAttributeNS('', 'ry', `${size / 16}`);
  return elem;
}
