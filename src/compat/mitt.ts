export type EventType = string | symbol;
export type Handler<T = unknown> = (event?: T) => void;
export type WildcardHandler<T = Record<string, unknown>> = (type: EventType, event?: T[keyof T] | unknown) => void;

export interface MittEmitter<T = Record<string, unknown>> {
  all: Map<EventType, Set<Handler | WildcardHandler<T>>>;
  on(type: EventType, handler: Handler | WildcardHandler<T>): void;
  off(type: EventType, handler: Handler | WildcardHandler<T>): void;
  emit(type: EventType, event?: T[keyof T] | unknown): void;
}

function getHandlers<T>(all: MittEmitter<T>['all'], type: EventType): Set<Handler | WildcardHandler<T>> {
  let handlers = all.get(type);
  if (!handlers) {
    handlers = new Set();
    all.set(type, handlers);
  }
  return handlers;
}

export default function mitt<T = Record<string, unknown>>(): MittEmitter<T> {
  const all = new Map<EventType, Set<Handler | WildcardHandler<T>>>();

  return {
    all,
    on(type, handler) {
      getHandlers(all, type).add(handler);
    },
    off(type, handler) {
      const handlers = all.get(type);
      if (!handlers) return;
      handlers.delete(handler);
      if (handlers.size === 0) {
        all.delete(type);
      }
    },
    emit(type, event) {
      const handlers = all.get(type);
      if (handlers) {
        handlers.forEach((handler) => {
          (handler as Handler)(event);
        });
      }

      const wildcardHandlers = all.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach((handler) => {
          (handler as WildcardHandler<T>)(type, event);
        });
      }
    },
  };
}
