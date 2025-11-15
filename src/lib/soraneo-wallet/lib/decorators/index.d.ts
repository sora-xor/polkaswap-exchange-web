declare function Singleton<T extends new (...args: any[]) => any>(Ctr: T): T;
export { Singleton };
