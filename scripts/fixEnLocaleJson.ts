import fs from 'fs';

function format(obj: any) {
  if (typeof obj !== 'object' || obj === null) return obj;

  const keys = Object.keys(obj);

  if (!keys.length) return null;

  const formatted = {};

  keys.forEach((key) => {
    const inner = format(obj[key]);
    if (inner) {
      formatted[key] = inner;
    }
  });

  return formatted;
}

function sortAlpha(obj: any) {
  if (typeof obj !== 'object') return obj;

  const sorted = {};

  const keys = Object.keys(obj)
    .map((k) => [k, k.toLowerCase()])
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([k]) => k);

  keys.forEach((key) => {
    sorted[key] = sortAlpha(obj[key]);
  });

  return sorted;
}

(async function main() {
  const buildDir = './src/lang';
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }
  const langObj = (await import('../src/lang/en.json')).default;
  const formatted = format(langObj);
  const sorted = sortAlpha(formatted);
  fs.writeFileSync(`${buildDir}/en.json`, JSON.stringify(sorted, null, 4));
  console.info(`${buildDir}/en.json created!`);
})();
