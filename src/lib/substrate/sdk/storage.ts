const buildNamespaces = (namespace: string, legacyNamespaces: string[]): string[] => {
  const unique = new Set<string>();
  unique.add(namespace);
  legacyNamespaces.forEach((legacy) => {
    if (legacy) unique.add(legacy);
  });
  return Array.from(unique);
};

const makeStorageKey = <T>(namespace: string, key: T): string => `${namespace}.${String(key)}`;

export class Storage<T = string> {
  protected namespace: string;
  protected legacyNamespaces: string[];

  constructor(namespace = 'sora', legacyNamespaces: string[] = []) {
    this.namespace = namespace;
    this.legacyNamespaces = legacyNamespaces.filter((legacy) => legacy && legacy !== namespace);
  }

  private getNamespaces(): string[] {
    return buildNamespaces(this.namespace, this.legacyNamespaces);
  }

  public all(): Array<Array<any>> {
    if (typeof localStorage === 'undefined') return [];

    return this.getNamespaces().reduce<Array<Array<any>>>((entries, ns) => {
      const nsEntries = Object.entries(localStorage).filter(([key]) => key.startsWith(`${ns}.`));
      entries.push(...nsEntries);
      return entries;
    }, []);
  }

  public get(key: T): string {
    if (typeof localStorage === 'undefined') return '';

    const primaryKey = makeStorageKey(this.namespace, key);
    const primaryValue = localStorage.getItem(primaryKey);

    if (primaryValue !== null) {
      return primaryValue;
    }

    for (const legacyNamespace of this.legacyNamespaces) {
      const legacyKey = makeStorageKey(legacyNamespace, key);
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue !== null) {
        try {
          localStorage.setItem(primaryKey, legacyValue);
          localStorage.removeItem(legacyKey);
        } catch {
          // ignore quota/security errors
        }
        return legacyValue;
      }
    }

    return '';
  }

  public set(key: T, value: any): void {
    if (typeof localStorage === 'undefined') return;

    const storageKey = makeStorageKey(this.namespace, key);
    localStorage.setItem(storageKey, value);

    for (const legacyNamespace of this.legacyNamespaces) {
      const legacyKey = makeStorageKey(legacyNamespace, key);
      if (legacyKey !== storageKey) {
        localStorage.removeItem(legacyKey);
      }
    }

    window.dispatchEvent(new Event('localStorageUpdated'));
  }

  public remove(key: T): void {
    if (typeof localStorage === 'undefined') return;

    for (const namespace of this.getNamespaces()) {
      localStorage.removeItem(makeStorageKey(namespace, key));
    }

    window.dispatchEvent(new Event('localStorageUpdated'));
  }

  public clear(): void {
    if (typeof localStorage === 'undefined') return;

    this.getNamespaces().forEach((namespace) => {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(`${namespace}.`))
        .forEach((key) => localStorage.removeItem(key));
    });
  }
}

export class AccountStorage<T = string> extends Storage<T> {
  constructor(identity: string, legacyIdentities: string[] = []) {
    if (!identity) {
      throw new Error('AccountStorage: identity is required');
    }

    const namespace = `account:${identity}`;
    const legacyNamespaces = legacyIdentities.map((legacyIdentity) => `account:${legacyIdentity}`);

    super(namespace, legacyNamespaces);
  }
}
