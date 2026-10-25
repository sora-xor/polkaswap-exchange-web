import { loadScript, unloadScript } from 'vue-plugin-load-script';

/**
 * Thin wrapper around `vue-plugin-load-script` that provides consistent logging
 * and error handling for dynamic script loading.
 */
export class ScriptLoader {
  /**
   * Loads a script tag for the provided URL. When `debug` is true the function
   * emits console logs to help trace runtime issues.
   */
  static async load(src: string, debug = true): Promise<void> {
    try {
      await loadScript(src);
      if (debug) console.info(`[${this.name}] Script loaded: ${src}`);
    } catch (error) {
      if (debug) console.error(error);
      else throw error;
    }
  }

  /**
   * Removes the script tag inserted by {@link load}. Matching debug logs mirror
   * the loader to keep troubleshooting symmetric.
   */
  static async unload(src: string, debug = true): Promise<void> {
    try {
      await unloadScript(src);
      if (debug) console.info(`[${this.name}] Script unloaded: ${src}`);
    } catch (error) {
      if (debug) console.error(error);
      else throw error;
    }
  }
}
