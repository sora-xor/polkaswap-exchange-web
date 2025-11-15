import { colord } from 'colord';
import { COLORS } from './defaults.js';
const WOBBLE = 30;
export function colors(seeder) {
  const amount = seeder() * WOBBLE - WOBBLE / 2;
  const all = COLORS.map((hex) => colord(hex).rotate(amount));
  return (alpha = 1) => {
    const index = Math.floor(all.length * seeder());
    return all.splice(index, 1)[0].alpha(alpha).toHslString();
  };
}
