import { isU8a, stringToU8a } from '@polkadot/util';
const DIVISOR = 256 * 256;
export function seeder(_seed = new Uint8Array(32)) {
  const seed = isU8a(_seed) ? _seed : stringToU8a(_seed);
  let index = (seed[Math.floor(seed.length / 2)] % seed.length) - 1;
  const next = () => {
    index += 1;
    if (index === seed.length) {
      index = 0;
    }
    return seed[index];
  };
  return () => {
    return (next() * 256 + next()) / DIVISOR;
  };
}
