import { app, TranslationConsts } from '@/consts/app';

import type { Route, RouteLocationNormalizedLoaded } from 'vue-router';

type RouteLike = Pick<Route | RouteLocationNormalizedLoaded, 'name'>;
type LangModule = typeof import('@/lang');

let documentTitleRouteResolver: (() => RouteLike | undefined) | null = null;
let langModulePromise: Promise<LangModule> | null = null;

const loadLang = (): Promise<LangModule> => {
  langModulePromise ??= import('@/lang');
  return langModulePromise;
};

/**
 * Allows consumers to supply a lazy route resolver so title updates keep
 * working when `updateDocumentTitle` is invoked without a route argument.
 */
export const registerDocumentTitleResolver = (resolver?: (() => RouteLike | undefined) | null): void => {
  documentTitleRouteResolver = resolver ?? null;
};

/**
 * Updates the document title based on the current or provided route name.
 */
export const updateDocumentTitle = async (to?: RouteLike): Promise<void> => {
  const page = to ?? documentTitleRouteResolver?.();
  const pageName = typeof page?.name === 'string' ? page.name : undefined;
  const pageTitleKey = `pageTitle.${pageName}`;
  const { default: i18n } = await loadLang();
  const composer = ((i18n as any)?.global ?? i18n) as any;
  const te = typeof composer?.te === 'function' ? (composer.te as (key: string) => boolean).bind(composer) : null;
  const t =
    typeof composer?.t === 'function' ? (composer.t as (key: string, ...args: any[]) => unknown).bind(composer) : null;

  if (pageName && te?.(pageTitleKey) && t) {
    const pageTitleValue = t(pageTitleKey, TranslationConsts) as string;
    document.title = `${pageTitleValue} - ${app.name}`;
  } else {
    document.title = app.title;
  }
};
