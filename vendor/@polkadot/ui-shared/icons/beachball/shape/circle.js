import { SHAPE_COUNT } from '../defaults.js';
import { circle as newCircle } from '../svg/circle.js';
export function circle(seeder, fill, diameter, count) {
  const center = diameter / 2;
  const angle = seeder() * 360;
  const radius = ((SHAPE_COUNT - count) / SHAPE_COUNT) * (diameter / 2) + (diameter / 8) * seeder();
  const offset = (diameter / 4) * (seeder() + (count + 1) / SHAPE_COUNT);
  const cx = offset * Math.sin(angle) + center;
  const cy = offset * Math.cos(angle) + center;
  const svg = newCircle(radius, cx, cy);
  svg.setAttributeNS('', 'fill', fill);
  return svg;
}
