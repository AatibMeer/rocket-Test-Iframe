/**
 * A type to exclude properties which are Proxy accessors.
 * It prevents users from trying to provide defaultValues for `isWritable` and `ignoreErrors`; they should see TS errors.
 */
type StorageValues<T extends Record<string, string>> = Omit<T, 'isWritable' | 'ignoreErrors'>;

export interface Options<T extends Record<string, string>> {
  /** If provided then the values in this object will be returned if there is no value in the Storage. */
  defaultValues?: StorageValues<Partial<T>>;
  /** The Storage type to use. */
  storage?: Storage;
  /**
   * Ignore errors when setting values.
   *
   * If this is truthy then a `TypeError` may be thrown. Otherwise, it will silently not set the value.
   *
   * WebStorage may throw an Error when the value couldn't be set. Setting could fail if, e.g., the user has disabled
   * storage for the site (including private browsing), or if the quota has been exceeded.
   */
  ignoreStorageErrors: boolean; // purposefully not optional: I want people to think about handling the Errors!
}

export type StorageProxy<T extends Record<string, string> = Record<string, string>> = StorageValues<T> & {
  /** Can the Storage set new values? */
  readonly isWritable: boolean;
  /** Change the current error behaviour. */
  ignoreErrors: boolean;
};

/**
 * Creates an object whose keys are direct accessors to keys of the same name in Storage. The values will always be up
 * to date with the values in Storage.
 *
 * Now you can do useful things like `Object.keys()` and `someKey in storage`.
 */
export function getStorageProxy<T extends Record<string, string>>({
  defaultValues = {} as StorageValues<T>,
  storage = localStorage,
  ignoreStorageErrors,
}: Options<T>): StorageProxy<T> {
  let ignoreErrors = !!ignoreStorageErrors;

  /** A special getter: can the storage be written to? */
  function get(target: Record<string, string>, key: 'isWritable'): boolean;
  /** Get the property from Storage. If not set then return the value from `defaultValues`. */
  function get(target: Record<string, string>, key: string | symbol): string | undefined;
  function get(target: Record<string, string>, key: string | symbol): string | boolean | undefined {
    if (key === 'isWritable') {
      return (() => {
        try {
          storage.setItem('__storage_test__', 'test');
          storage.removeItem('__storage_test__');
          return true;
        } catch (e) {
          return false;
        }
      })();
    }
    if (typeof key === 'string') {
      const storedValue = storage.getItem(key);
      if (storedValue === null) {
        // no value in storage so return default value
        return defaultValues[key];
      }
      return storedValue;
    }
    return (defaultValues as unknown)[key];
  }

  /** Does the key exist in Storage or `defaultValues`? */
  function has(target: T, key: string | symbol): boolean {
    if (key in target) {
      return true;
    }
    if (typeof key !== 'string') {
      return false;
    }
    return storage.getItem(key) !== null;
  }

  /** Add the key and value to Storage. */
  function set(_target: T, key: string | symbol, value: unknown): boolean {
    if (key === 'isWritable') {
      return false;
    }
    if (key === 'ignoreErrors') {
      ignoreErrors = !!value;
      return true;
    }
    if (typeof key === 'string') {
      try {
        storage.setItem(key, `${value}`);
      } catch (e) {
        return ignoreErrors;
      }
    }
    return true;
  }

  return new Proxy<StorageValues<T>>(defaultValues as StorageValues<T>, {
    get,
    set,
    /** Remove the key from Storage. */
    deleteProperty(target: T, key: string | symbol): boolean {
      if (typeof key === 'string') {
        storage.removeItem(key);
      }
      return true;
    },
    has,
    /** Get a collection of keys in the union set of Storage and `defaultValues` (get all keys). */
    ownKeys(target: T): Array<string | symbol> {
      const { length } = storage;
      const keys = Object.keys(target).reduce((accumulator, key) => {
        return { ...accumulator, [key]: undefined };
      }, {} as Record<string, void>);
      for (let i = 0; i < length; i += 1) {
        const key = storage.key(i);
        keys[key] = undefined;
      }
      return Object.keys(keys);
    },
    /** Make a PropertyDescriptor for a key. */
    getOwnPropertyDescriptor(target: T, key: string | symbol): PropertyDescriptor | undefined {
      const originalDescriptor = Object.getOwnPropertyDescriptor(target, key);
      if (has(target, key)) {
        return {
          configurable: originalDescriptor?.configurable ?? true,
          enumerable: originalDescriptor?.enumerable ?? true,
          get(): string {
            return get(target, key);
          },
          set(value: string) {
            set(target, key, value);
          },
        };
      }
      return originalDescriptor;
    },
  }) as StorageProxy<T>;
}
