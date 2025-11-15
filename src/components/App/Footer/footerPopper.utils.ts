export function buildReferenceClasses(panelClass: string | null | undefined, status: string): string[] {
  return [panelClass, status].filter(Boolean) as string[];
}

export function buildPopperClasses(status: string): string[] {
  return ['app-status__tooltip', status].filter(Boolean) as string[];
}

export function isLoadingStatus(status: string): boolean {
  return status === 'info';
}

export function resolveTabIndex(status: string): number {
  return isLoadingStatus(status) ? -1 : 0;
}
