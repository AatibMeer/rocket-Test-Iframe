import {LocalizeRouterService} from '@gilsdav/ngx-translate-router';

/**
 * Create a BEM (block-element-modifier) classname string
 * @param block - The standalone entity that is meaningful on its own
 * @param modifiers - Flags on the block. Use them to change appearance, behavior or state
 */
export function bem(block: string, modifiers: Record<string, any>): string;
/**
 * Create a BEM (block-element-modifier) classname string
 * @param block - The standalone entity of which this element is part
 * @param element - This part of a block which has no standalone meaning. This element is semantically tied to its block
 * @param modifiers Flags on the element. Use them to change appearance, behavior or state.
 */
export function bem(block: string, element?: string, modifiers?: Record<string, any>): string;
export function bem(block: string, elementOrModifiers?: string | Record<string, any>, modifiers?: Record<string, any>): string {
  const be = elementOrModifiers && typeof elementOrModifiers === 'string' ? `${block}__${elementOrModifiers}` : block;
  const theModifiers = elementOrModifiers === undefined || typeof elementOrModifiers === 'string' ? modifiers : elementOrModifiers;
  if (theModifiers) {
    return Object.keys(theModifiers).reduce((classList, modifier) => {
      return theModifiers[modifier] ? `${classList} ${be}--${modifier}` : classList;
    }, be);
  }
  return be;
}

/** A BEM classnames creator, but with the B part already bound */
export interface BoundBEM {
  (element: string | undefined, modifiers?: Record<string, any>): string;
  (modifiers?: Record<string, any>): string;
}

/**
 * Create a bem() function with the block argument already bound
 */
export function makeBlockBoundBEMFunction(block: string): BoundBEM {
  return (elementOrModifiers: string | Record<string, any>, modifiers?: Record<string, any>) => {
    return bem(block, elementOrModifiers as string, modifiers);
  };
}

/**
 * Get the first item in an array or object which passes the predicate function. If an item is not found, null is returned
 *
 * This is meant to be used in situations that require efficiency (compared to Array.prototype.find and findIndex)
 *
 */
export function getFirst<T>(array: T[], predicate: (candidate: T, index: number) => boolean): T | null;
export function getFirst<K extends string | number | symbol, V>(object: Record<K, V>, predicate: (value: V, key: K) => boolean): V | null;
export function getFirst<T>(obj: Record<any, T>|T[], func: (candidate: T, key: any) => boolean): T | null {
  if(Array.isArray(obj)) {
    for(let i = 0; i<obj.length; i++) {
      if(func(obj[i], i)) {
        return obj[i];
      }
    }
    return null;
  } else {
    let keys = Object.keys(obj);
    for(let i = 0; i<keys.length; i++) {
      if(func(obj[keys[i]], keys[i])) {
        return obj[keys[i]];
      }
    }
    return null;
  }
}

/**
 * Returns true if the value is falsy (null, undefined, an empty string, 0) or the string "undefined"
 * @param value A value to evaluate
 */
export function isNullOrEmpty(value: any): boolean {
  // I didn't change how this works! Split from RL-Global-App in db41b41eeb01fc4cee9cf2412fd97ef4e4532ae4
  return !value || value === 'undefined';
}

/**
 * @desc convert an image base64 url to a blob file.
 * @param {string} b64Data eg. data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIA...
 * @param {number} sliceSize
 */
export function b64toBlob(b64Data: string, sliceSize = 512): Blob {
  let splitBase64Str = b64Data.split(',');
  let contentType = splitBase64Str[0].split(';')[0].split(':')[1] || '';
  sliceSize = sliceSize || 512;
  let base64Str = splitBase64Str[1];

  let byteCharacters = atob(base64Str);
  let byteArrays = [];

  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    let slice = byteCharacters.slice(offset, offset + sliceSize);

    let byteNumbers = new Array(slice.length);
    for (var i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    let byteArray = new Uint8Array(byteNumbers);

    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, {type: contentType});
}

export function translateRoutes(localizeRoutes: LocalizeRouterService, untranslatedRoutes: string[]): Record<string, string> {
  let routesToTranslate = untranslatedRoutes.join('/');
  let translatedRouteReturn = (<string>localizeRoutes.translateRoute(routesToTranslate)).split('/');
  let translatedRoutes: Record<string, string> = {};
  untranslatedRoutes.forEach( (routeKey, index) => {
    translatedRoutes[routeKey] = translatedRouteReturn[index];
  });
  return translatedRoutes;
}

export function encodeValue(input: string): string {
  return encodeURIComponent(input);
}

export function getNestedProp(nestedObj, pathArr) {
  return pathArr.reduce((obj, key) =>
    (obj && obj[key] !== 'undefined') ? obj[key] : undefined, nestedObj);
}

export function getTranslatedDatePlaceholder(dateFormat: string, lang: string): string {
  const langMap = {
    en: {
      D: ['D', 'd'],
      M: ['M', 'm'],
      Y: ['Y', 'y'],
    },
    rlus: {
      D: ['D', 'd'],
      M: ['M', 'm'],
      Y: ['Y', 'y'],
    },
    fr: {
      D: ['J', 'j'],
      M: ['M', 'm'],
      Y: ['A', 'a'],
    },
    pt: {
      D: ['D', 'd'],
      M: ['M', 'm'],
      Y: ['A', 'a'],
    },
    nl: {
      D: ['D', 'd'],
      M: ['M', 'm'],
      Y: ['J', 'j'],
    },
    es: {
      D: ['D', 'd'],
      M: ['M', 'm'],
      Y: ['A', 'a'],
    },
  };
  const charsToReplace = ['D', 'M', 'Y', 'd', 'm', 'y'];
  let datePlaceholder = '';
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < dateFormat.length; i++) {
    const char = dateFormat.charAt(i);
    const charToReplace = charsToReplace.find((c) => c === char);
    const caseSetting = char === char.toUpperCase() ? 0 : 1;
    if (charToReplace) {
      datePlaceholder += langMap[lang][char.toUpperCase()][caseSetting];
    } else {
      datePlaceholder += char;
    }
  }
  return datePlaceholder;
}
