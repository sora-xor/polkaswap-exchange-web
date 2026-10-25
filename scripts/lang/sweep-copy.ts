import fs from 'fs';
import path from 'path';

function deepMerge(base: any, override: any): any {
  if (typeof base !== 'object' || base === null) return override ?? base;
  const out: any = Array.isArray(base) ? [] : {};
  const keys = new Set([...Object.keys(base), ...(override ? Object.keys(override) : [])]);
  keys.forEach((k) => {
    if (typeof base[k] === 'object' && base[k] && !Array.isArray(base[k])) {
      out[k] = deepMerge(base[k], override ? override[k] : undefined);
    } else {
      out[k] = override && override[k] !== undefined ? override[k] : base[k];
    }
  });
  return out;
}

function sweepCopy(fromFile: string, toFile: string) {
  const from = JSON.parse(fs.readFileSync(fromFile, 'utf8'));
  const to = JSON.parse(fs.readFileSync(toFile, 'utf8'));
  const merged = deepMerge(from, to);
  fs.writeFileSync(toFile, JSON.stringify(merged, null, 4));
  console.info(`[sweep-copy] ${path.basename(fromFile)} -> ${path.basename(toFile)}`);
}

function runPair(dir: string, from: string, to: string) {
  sweepCopy(path.join(dir, from), path.join(dir, to));
}

(function main() {
  const mainDir = path.join('src', 'lang');
  const cardDir = path.join('src', 'lang', 'card');
  // Copy zh_CN to zh_TW as a base sweep
  runPair(mainDir, 'zh_CN.json', 'zh_TW.json');
  if (fs.existsSync(path.join(cardDir, 'zh_CN.json')) && fs.existsSync(path.join(cardDir, 'zh_TW.json'))) {
    runPair(cardDir, 'zh_CN.json', 'zh_TW.json');
  }
})();
