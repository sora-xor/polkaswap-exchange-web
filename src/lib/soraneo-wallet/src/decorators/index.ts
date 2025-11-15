function Singleton<T extends new (...args: any[]) => any>(Ctr: T): T {
  let instance: T;

  return class {
    constructor(...args: any[]) {
      if (instance) {
        console.error(`[${instance.name}]::You cannot instantiate a singleton multiple times!`);
        return instance;
      }

      instance = new Ctr(...args);
      return instance;
    }
  } as T;
}

export { Singleton };
