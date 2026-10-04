import { createAsyncComponent, preloadAsyncComponents } from '@/shared/ui/async';

/**
 * Shell chrome rendered around every route. The components stay in their own
 * chunks, but the wrappers live at module scope so bootstrap can resolve them
 * before mount: the header, menu and footer then appear in the same paint as
 * the route instead of arriving later and pushing the page content around.
 */
export const AppDisclaimer = createAsyncComponent(() => import('@/components/App/Header/AppDisclaimer.vue'));
export const AppFooter = createAsyncComponent(() => import('@/components/App/Footer/AppFooter.vue'));
export const AppHeader = createAsyncComponent(() => import('@/components/App/Header/AppHeader.vue'));
export const AppLogoButton = createAsyncComponent(() => import('@/components/App/Header/AppLogoButton.vue'));
export const AppMenu = createAsyncComponent(() => import('@/components/App/Menu/AppMenu.vue'));
export const TonswapJourneyNotice = createAsyncComponent(
  () => import('@/features/misc/components/burn/TonswapJourneyNotice.vue')
);

/**
 * Starts loading the shell chrome and resolves once it is ready (or after the
 * preload timeout). Load failures are left to the wrappers' own retry on render.
 */
export function preloadAppShellChrome(): Promise<void> {
  return preloadAsyncComponents([AppHeader, AppMenu, AppLogoButton, AppFooter, AppDisclaimer, TonswapJourneyNotice]);
}
