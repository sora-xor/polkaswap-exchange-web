export function serializeKey(base: string, quote: string): string {
  return [base, quote].join(',');
}

export function deserializeKey(key: string) {
  const [base, quote] = key.split(',');
  return { base, quote };
}
