// Minimal polyfills for unit tests in node env

(global as any).window = (global as any).window || ({} as any);

(global as any).Notification = (global as any).Notification || function () {};

if (!('navigator' in (global as any))) {
  Object.defineProperty(global, 'navigator', { value: { userAgent: 'vitest' } });
}
