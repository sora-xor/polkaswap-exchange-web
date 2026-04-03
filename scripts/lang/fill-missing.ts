import fs from 'node:fs';
import path from 'node:path';

function deepMerge(base: any, override: any): any {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) {
    return override !== undefined ? override : base;
  }

  const out: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(override ?? {})]);

  keys.forEach((key) => {
    const baseValue = base[key];
    const overrideValue = override?.[key];

    if (baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue)) {
      out[key] = deepMerge(baseValue, overrideValue ?? {});
    } else {
      out[key] = overrideValue !== undefined ? overrideValue : baseValue;
    }
  });

  return out;
}

(function main() {
  const dir = path.join('src', 'lang');
  const english = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));

  fs.readdirSync(dir)
    .filter((file) => file.endsWith('.json') && file !== 'en.json')
    .sort()
    .forEach((file) => {
      const fullPath = path.join(dir, file);
      const current = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const merged = deepMerge(english, current);
      fs.writeFileSync(fullPath, `${JSON.stringify(merged, null, 4)}\n`);
      console.info(`[lang-fill-missing] ${file}`);
    });
})();
