import fs from 'fs';

import { format, sortAlpha } from './utils';

(async function main() {
  const buildDir = './src/lang';
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }
  const langObj = (await import('../../src/lang/en.json')).default;
  const formatted = format(langObj);
  const sorted = sortAlpha(formatted);
  fs.writeFileSync(`${buildDir}/en.json`, JSON.stringify(sorted, null, 4));
  console.info(`${buildDir}/en.json fixed!`);
})();
