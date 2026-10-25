const SUPPRESSED_WARNING_PATTERNS = [
  /API\/INIT:\s+MetadataApi not available, rpc::state::get_metadata will be used\./i,
  /API\/INIT:\s+error with state_call::Metadata_metadata_versions, rpc::state::get_metadata will be used/i,
  /API\/INIT:\s+error with state_call::Metadata_metadata_at_version, rpc::state::get_metadata will be used/i,
];

let warningFilterInstalled = false;

const stringifyConsoleValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const shouldSuppressWarning = (args: unknown[]): boolean => {
  const message = args.map((value) => stringifyConsoleValue(value)).join(' ');
  return SUPPRESSED_WARNING_PATTERNS.some((pattern) => pattern.test(message));
};

/**
 * Suppresses known third-party runtime warnings that are emitted by upstream
 * Polkadot API fallback logic and cannot be fixed in application code.
 */
export const installConsoleWarningFilter = (): void => {
  if (warningFilterInstalled || typeof console === 'undefined') return;

  const originalWarn = console.warn.bind(console);

  console.warn = (...args: unknown[]) => {
    if (shouldSuppressWarning(args)) return;
    originalWarn(...args);
  };

  warningFilterInstalled = true;
};
