declare namespace Intl {
  const DisplayNames: new (locales: Intl.LocalesArgument, options: Intl.DisplayNamesOptions) => Intl.DisplayNames;
  interface DisplayNames {
    of(code: string): string | undefined;
    resolvedOptions(): ResolvedDisplayNamesOptions;
  }
}
