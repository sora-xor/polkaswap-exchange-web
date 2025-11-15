import mitt from 'mitt';

/**
 * Lightweight event bus used by the grid layout helpers to decouple layout widgets.
 * Wraps `mitt` under the hood to preserve the legacy `$on/$off/$emit` interface.
 */
export type GridEventHandler = (...args: unknown[]) => void;

/**
 * Provides an imperative API that mirrors Vue 2 style `$on/$off/$emit`
 * hooks so the legacy grid components can keep their existing integration
 * points while the rest of the app migrates to composables.
 */
export class GridEventBus {
  private readonly emitter = mitt<Record<string, unknown>>();
  private readonly handlerMap = new Map<GridEventHandler, GridEventHandler>();

  $on(event: string, handler: GridEventHandler): void {
    const wrapped: GridEventHandler = (payload?: unknown) => {
      if (Array.isArray(payload)) {
        handler(...(payload as unknown[]));
      } else {
        handler(payload);
      }
    };

    this.handlerMap.set(handler, wrapped);
    this.emitter.on(event, wrapped);
  }

  $off(event: string, handler: GridEventHandler): void {
    const wrapped = this.handlerMap.get(handler);
    if (!wrapped) return;

    this.emitter.off(event, wrapped);
    this.handlerMap.delete(handler);
  }

  $emit(event: string, ...args: unknown[]): void {
    if (args.length <= 1) {
      this.emitter.emit(event, args[0]);
      return;
    }

    this.emitter.emit(event, args);
  }

  clear(): void {
    this.handlerMap.clear();
    this.emitter.all.clear();
  }
}
