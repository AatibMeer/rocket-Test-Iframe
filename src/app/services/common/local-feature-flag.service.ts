/* eslint-disable no-console */
// eslint-disable-next-line max-classes-per-file
import { Injectable, isDevMode } from '@angular/core';
import { getStorageProxy, StorageProxy } from './storage.service';

// This is a place for enabling/disabling features for devs, QA and individuals.
// For all partner-specific settings, use PartnersService instead.
// For all environment-specific settings, use EnvInfoService instead.
// Please avoid rummaging through localStorage in other places.
// Checks localStorage each time to reduce page refreshing from testers.

/**
 * These are the property name of flags, the querystring keys <em>and</em> the storage keys.
 *
 * You can get any flag, even ones not mentioned here, but if you do add one here
 * it will be suggested in IDEs as a possible property.
 * Therefor I recommend you add known flags here and give them default values.
 */
const defaultFlagValues = {
  // Very temporary Pay by Bank Account flag so we can merge without a feature branch
  pay_with_bank_account: true,
  // Used for UAT of payment agreements and KYC
  payments_enabled: false,
  // Used for UAT of new stencil components for variable fee payments
  variable_fee_enabled: true,
  // Used in a header to override binders-service maintenance mode
  force_binders_service: false,
  // Used to enable wallet payments
  wallet_enabled: false,
};

type FeatureFlagsDefaults = Readonly<typeof defaultFlagValues>;
type FeatureFlags = FeatureFlagsDefaults & Readonly<Record<string, boolean>>;

export class LocalFeatureFlagServiceBase {
  /** The default values of our flags if they aren't overridden by querystring parameters or in Storage. */
  static get defaultFlagValues(): FeatureFlagsDefaults {
    return { ...defaultFlagValues };
  }

  /**
   * The most up-to-date values of feature flags is available here.
   */
  readonly flags: FeatureFlags;

  protected readonly storage: StorageProxy<Record<keyof FeatureFlags, 'true' | 'false'>>;

  constructor() {
    // transform the boolean values to "true" or "false" for Storage
    const defaultValues: Record<keyof FeatureFlags, 'true' | 'false'> = Object.keys(
      LocalFeatureFlagServiceBase.defaultFlagValues
    ).reduce((accumulator, flag) => {
      return { ...accumulator, [flag]: LocalFeatureFlagServiceBase.defaultFlagValues[flag] ? 'true' : 'false' };
    }, {} as Record<keyof FeatureFlags, 'true' | 'false'>);

    this.storage = getStorageProxy({ defaultValues, ignoreStorageErrors: true });

    this.setupStorageFromURL();

    this.flags = new Proxy<FeatureFlags>({} as FeatureFlags, {
      get: (_target: FeatureFlags, flag: string | symbol): boolean | undefined => {
        // transform the "true" or "false" string from Storage back to boolean values
        if (typeof flag === 'string') {
          return this.storage[flag] === 'true';
        }
        return LocalFeatureFlagServiceBase.defaultFlagValues[flag];
      },
      set: (): boolean => {
        // can't set flags, so just return true
        return true;
      },
      deleteProperty: (): boolean => {
        // can't delete flags
        return false;
      },
    });
  }

  /**
   * Check whether any flags are set in the URL.
   * Tries to store the flag values in Storage.
   */
  setupStorageFromURL(): void {
    const url = new URL(window.location.href);
    url.searchParams.forEach((value, key) => {
      // only the string "false" will set the value to false; anything else is true
      this.storage[key] = value === 'false' ? 'false' : 'true';
    });
  }
}

/**
 * This mixin adds some useful debugging extras to the service:
 * * In dev mode, flags can be set from the DevTools console using the service. Useful if you are debugging and forgot to set a flag!
 * * Logs feature flags and their values in a table in the console and highlights mis-typed flags.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WithUsefulDebuggingExtras<T extends new (...args: any[]) => LocalFeatureFlagServiceBase>(BaseService: T) {
  return class LocalFeatureFlagServiceWithDebuggingExtras extends BaseService {
    /**
     * The most up-to-date values of feature flags is available here.
     */
    readonly flags: FeatureFlags;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);
      this.flags = new Proxy(this.flags, {
        set: (_target: FeatureFlags, flag: string | symbol, value: unknown): boolean => {
          // the flags are read-only for our code, but we will allow setting them from somewhere like the console for development
          // the TypeScript will prevent devs from setting flags in the code
          if (typeof flag === 'string') {
            if (isDevMode()) {
              const code = 'font-family:monospace; font-weight:bold';
              const normal = 'font-family:inherit; font-weight:inherit';
              console?.info?.call(
                console,
                'You can set feature flags in %cdev%c mode but they will be immutable in %cprod%c mode.',
                code,
                normal,
                code,
                normal
              );
              this.storage[flag] = value === 'false' || value === false ? 'false' : 'true';
              this.logFlags();
            } else {
              const command = `localStorage.setItem("${flag}", "${
                value === 'false' || value === false ? 'false' : 'true'
              }")`;
              console?.info?.call(
                console,
                'Feature flags are set in %clocal storage only%c. Try %c%s',
                'font-weight:bold',
                'font-weight:inherit',
                'display:block; font-family:monospace; font-size:125%; line-height:1.6',
                command
              );
            }
          }
          return true;
        },
        has: (target: FeatureFlags, flag: string | symbol): boolean => {
          // does the flag exist (for operations like `flag in this.flags`)?
          if (typeof flag !== 'string') {
            return false;
          }
          const storedValue = this.storage[flag];
          return storedValue === 'true' || storedValue === 'false';
        },
        ownKeys: (): Array<string | symbol> => {
          // get a collection of flags (for operations like `for (flag in this.flags)` and `Object.keys(this.flags)`)
          const keysInStorage = Object.keys(this.storage);
          return keysInStorage.filter((candidateKey) => {
            const candidateValue = this.storage[candidateKey];
            return candidateValue === 'true' || candidateValue === 'false';
          });
        },
        getOwnPropertyDescriptor: (target: FeatureFlags, flag: string | symbol): PropertyDescriptor | undefined => {
          // say that all properties are enumerable so they show up in operations such as `Object.keys(this.flags)`
          return {
            configurable: true,
            enumerable: true,
            get: (): boolean => {
              return target[flag as string];
            },
          };
        },
      });

      this.logFlags();
    }

    /**
     * Log the feature flags in the console for debugging purposes.
     */
    logFlags(): void {
      console?.groupCollapsed?.call(console, 'Feature flags');
      const flagsAll = Object.keys(this.flags);
      const flagsOn = flagsAll.filter((flag) => this.flags[flag]);
      const devMode = isDevMode();
      // in dev mode we report all flags
      // in prod mode we only report "on" flags to limit discovery
      if (devMode || flagsOn.length > 0) {
        const friendlyFlags = (devMode ? flagsAll : flagsOn).reduce((flagsForTable, flag) => {
          const flagName = flag in LocalFeatureFlagServiceBase.defaultFlagValues ? flag : `⚠️ ${flag} [unknown flag]`;
          return { ...flagsForTable, [flagName]: this.flags[flag] ? 'on' : 'off' };
        }, {} as Record<string, 'on' | 'off'>);
        console?.table?.call(console, friendlyFlags);
      } else {
        console?.info?.call(console, 'No flags enabled');
      }
      console?.groupEnd?.call(console);
    }
  };
}

@Injectable()
export class LocalFeatureFlagService extends WithUsefulDebuggingExtras(LocalFeatureFlagServiceBase) {}
