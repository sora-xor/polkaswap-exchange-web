const APP_MAIN_ROUTE_CLASS_ALIASES: Record<string, string> = {
  validatorstype: 'selectvalidators',
  validatorsselect: 'selectvalidators',
};

/**
 * Resolves a stable route suffix for `app-main--*` class names so equivalent
 * route states stay grouped under one CSS token.
 */
export function resolveAppMainRouteClass(routeName: unknown): string | null {
  if (typeof routeName !== 'string' || routeName.length === 0) {
    return null;
  }

  const normalized = routeName.toLowerCase();
  return APP_MAIN_ROUTE_CLASS_ALIASES[normalized] ?? normalized;
}
