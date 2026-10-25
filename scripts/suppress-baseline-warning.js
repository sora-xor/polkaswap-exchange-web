const originalWarn = console.warn;

console.warn = function (...args) {
  if (typeof args[0] === 'string' && args[0].includes('[baseline-browser-mapping]')) {
    return;
  }
  return originalWarn.apply(this, args);
};
