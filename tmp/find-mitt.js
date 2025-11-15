const fs = require('fs');
const path = require('path');
const results = [];
const patterns = new Set(["from 'mitt'", 'from "mitt"', "require('mitt')", 'require("mitt")']);
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
      walk(full);
    } else if (/\.(c?js|ts|vue|mjs|jsx|tsx)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          results.push(full);
          break;
        }
      }
    }
  }
}
['src', 'packages', 'scripts', 'tests'].forEach((dir) => {
  if (fs.existsSync(dir)) walk(dir);
});
console.log(results.join('\n'));
