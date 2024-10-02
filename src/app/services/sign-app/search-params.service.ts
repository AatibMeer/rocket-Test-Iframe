import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

type KnownSearchParams = 'copyDocument' | 'documentFromInterview' | 'goToDashboard' | 'isLawyer' | 'source';

/**
 * This service is just like `URLSearchParams` with the setter methods removed.
 *
 * It snapshots the querystring/search parameters when the App loads. Changes to the URL won't affect the values here.
 * This will be useful when we have proper routeing. It also provides injectable access to the parameters and cleans up
 * using `window`.
 */
@Injectable()
export class SearchParamsService implements Pick<URLSearchParams, 'get' | 'getAll' | 'has' | 'forEach' | 'toString'> {
  private readonly searchParams: URLSearchParams;

  constructor(@Inject(DOCUMENT) document: HTMLDocument) {
    const url = new URL(document.URL);
    this.searchParams = url.searchParams;
  }

  /**
   * Returns the first value associated to the given search parameter.
   * If you want to check whether a parameter exists, use `has()`.
   */
  get(name: KnownSearchParams | string): string | null {
    return this.searchParams.get(name);
  }

  /**
   * Returns all the values association with a given search parameter.
   */
  getAll(name: KnownSearchParams | string): string[] {
    return this.searchParams.getAll(name);
  }

  /**
   * Returns a Boolean indicating if such a search parameter exists.
   */
  has(name: KnownSearchParams | string): boolean {
    return this.searchParams.has(name);
  }

  /** Is the parameter either empty or not existing at all? */
  empty(name: KnownSearchParams | string): boolean {
    return !this.searchParams.get(name);
  }

  /**
   * The `forEach()` method allows iteration through all values contained in this object via a callback function.
   */
  forEach(callbackFn: (value: string, key: string, parent: URLSearchParams) => void, thisArg?: unknown): void {
    // A clone of `this.searchParams` so our instance cannot be altered
    const searchParams = new URLSearchParams(this.toString());
    this.searchParams.forEach((value, key) => {
      return callbackFn.call(thisArg, value, key, searchParams);
    });
  }

  /** The parameter exists and has a non-empty value */
  notEmpty(name: KnownSearchParams | string): boolean {
    return !!this.searchParams.get(name);
  }

  /**
   * The `toString()` method returns a query string suitable for use in a `URL`.
   * Note: This method returns the query string without the question mark. This is different from
   * `window.location.search`, which includes it.
   */
  toString(): string {
    return this.searchParams.toString();
  }
}
