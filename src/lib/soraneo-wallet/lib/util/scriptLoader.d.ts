/**
 * Thin wrapper around `vue-plugin-load-script` that provides consistent logging
 * and error handling for dynamic script loading.
 */
export declare class ScriptLoader {
  /**
   * Loads a script tag for the provided URL. When `debug` is true the function
   * emits console logs to help trace runtime issues.
   */
  static load(src: string, debug?: boolean): Promise<void>;
  /**
   * Removes the script tag inserted by {@link load}. Matching debug logs mirror
   * the loader to keep troubleshooting symmetric.
   */
  static unload(src: string, debug?: boolean): Promise<void>;
}
