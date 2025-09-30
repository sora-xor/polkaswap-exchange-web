/*
  Detect untranslated strings by comparing per-locale JSON against English.
  Usage: node scripts/detect-untranslated.js
*/
(async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

  const flatten = (obj, prefix = '', out = {}) => {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
      else out[key] = v;
    }
    return out;
  };

  const compareDir = (dir, enFile) => {
    const base = path.resolve(dir);
    const en = readJson(path.join(base, enFile));
    const enFlat = flatten(en);
    const files = fs.readdirSync(base).filter((f) => f.endsWith('.json') && f !== enFile);

    const report = {};
    for (const f of files) {
      const p = path.join(base, f);
      const data = readJson(p);
      const flat = flatten(data);
      const same = [];
      for (const [key, enVal] of Object.entries(enFlat)) {
        const val = flat[key];
        if (typeof enVal === 'string' && typeof val === 'string' && enVal === val) {
          same.push(key);
        }
      }
      if (same.length) report[f] = same;
    }
    return report;
  };

  const printReport = (title, rep) => {
    const files = Object.keys(rep).sort();
    console.log(`\n=== ${title} ===`);
    if (!files.length) {
      console.log('No suspected untranslated strings.');
      return;
    }
    for (const f of files) {
      const keys = rep[f];
      console.log(`\n${f}: ${keys.length} suspected`);
      // Print up to 25 keys per file to keep output readable
      for (const k of keys.slice(0, 25)) console.log(`  - ${k}`);
      if (keys.length > 25) console.log(`  ... (${keys.length - 25} more)`);
    }
  };

  const langDir = path.resolve('src/lang');
  const cardDir = path.join(langDir, 'card');
  const mainReport = compareDir(langDir, 'en.json');
  const cardReport = compareDir(cardDir, 'en.json');

  printReport('Main locales vs en.json', mainReport);
  printReport('Card locales vs card/en.json', cardReport);
})();
