/* eslint-disable max-classes-per-file */
import {
  getCurrencyStringFunction,
  currencyStringFunction,
  getNumberFormatter,
  NumberFormatFunction,
  getSpecificCurrencyStringFunction,
  specificCurrencyStringFunction,
} from './numbers';
import { getDateFunction, DateFunction, getDateWithStringFormatFunction, DateWithStringFormatFunction } from './date';
import { getTimeFunction, TimeFunction } from './time';
import { supportedRegions } from './regions';
import dayjs, { Dayjs } from 'dayjs';

export interface Dictionary<T> {
  [index: string]: T;
}

export const tranformCountryNameToRegionCode: Dictionary<string> = {
  France: 'fr',
  Spain: 'es',
  Netherlands: 'nl',
  'United Kingdom': 'gb',
  Germany: 'de',
  Belgium: 'be',
  Italy: 'it',
  'United States': 'us',
};

// This class takes a specified language and creates a class with
// function set that is appropriate for that language
export class Localization {
  region: string;
  getCurrency: currencyStringFunction;
  getSpecificCurrency: specificCurrencyStringFunction;
  getNumber: NumberFormatFunction;
  getTime: TimeFunction;
  getDate: DateFunction;
  getStringFormattedDate: DateWithStringFormatFunction;

  constructor(region: string, timezone?: string) {
    if (region == void 0) {
      console.error('Localization function set must be provided with the language on construction');
    }
    this.setRegion(region, timezone);
  }

  getMoment(date?: Date): Dayjs {
    return dayjs(date).locale(this.region);
  }

  setRegion(region: string, timezone?: string) {
    this.region = region;
    this.getCurrency = getCurrencyStringFunction(region);
    this.getNumber = getNumberFormatter(region);
    this.getTime = getTimeFunction(region, timezone);
    this.getDate = getDateFunction(region);
    this.getSpecificCurrency = getSpecificCurrencyStringFunction(region);
  }
}

// We should only use this class for things like RL-DocumentOutput that will need all regions for a single node service
// Apps should use the above class which needs be instantiated with a single region
export class LocalizationAllRegions {
  localizations: Dictionary<Localization> = {};

  constructor() {
    supportedRegions.forEach((region) => {
      this.localizations[region] = new Localization(region);
      // Add stuff that we don't need for GAPP
      this.localizations[region].getStringFormattedDate = getDateWithStringFormatFunction(region);
    });
  }
}
