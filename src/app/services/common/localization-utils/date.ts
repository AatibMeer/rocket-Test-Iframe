import dayjs from 'dayjs';
import { supportedRegions } from './regions';

export function getDateFormat(region, longFormat = false): string {
  if (region == 'fr') {
    if (longFormat) {
      return 'DD MMMM YYYY';
    }
    return 'DD/MM/YYYY';
  }
  if (region === 'nl' || region === 'be') {
    if (longFormat) {
      return 'DD MMMM YYYY';
    }
    return 'DD.MM.YYYY';
  }
  if (region === 'de') {
    if (longFormat) {
      return 'DD. MMMM YYYY';
    }
    return 'DD.MM.YYYY';
  }
  if (region === 'es') {
    if (longFormat) {
      return 'DD [de] MMMM [de] YYYY';
    }
    return 'DD/MM/YYYY';
  }
  if (region === 'gb') {
    if (longFormat) {
      return 'DD MMMM YYYY';
    }
    return 'DD/MM/YYYY';
  }
  if (region === 'it') {
    if (longFormat) {
      return 'DD MMMM YYYY';
    }
    return 'DD/MM/YYYY';
  }
  if (region === 'us') {
    if (longFormat) {
      return 'MMMM DD, YYYY';
    }
    return 'MM/DD/YYYY';
  }
  // generic, as perscribed by on Confluence
  return 'YYYY-MM-DD';
}

export interface DateFunction {
  (date: Date, longFormat?: boolean): string;
}
export function getDateFunction(region: string): DateFunction {
  return (date: Date, longFormat = false): string => {
    return dayjs(date).locale(region).format(getDateFormat(region, longFormat));
  };
}

export interface DateOptions {
  weekday?: string; // long, ...
  year?: string; // numeric, ...
  month?: string; // string, ...
  day?: string; // numeric, ...

  longFormat?: boolean; // Added here for use in Angular Pipes only
}

export interface DateWithStringFormatFunction {
  /**
   *  @date: string is a date input in the format of a string,
   *  @longFormat is the selector between our two output types
   *  @stringFormat is the format we can expect @date: string to be in
   */
  (date: string, longFormat?: boolean, stringFormat?: string): string;
}

// stringFormat == DD/MM/YYYY is what rl-document-output uses, which is at creation the only consumer of this specific function
export function getDateWithStringFormatFunction(region: string): DateWithStringFormatFunction {
  if (supportedRegions.indexOf(region) !== -1) {
    return (dateString: string, longFormat = false, stringFormat = 'DD/MM/YYYY') => {
      return dayjs(dateString, stringFormat).locale(region).format(getDateFormat(region, longFormat));
    };
  }
  // Not supported
  return null;
}

// getFunctionEpochFromLocalizedDateString is a utility for the new Interview
export interface DateFromString {
  (stringValue: string): Date;
}

// This is specifically for the Suggested date format in our doc, see date format
export function getDateFromDateStringFunction(region: string): DateFromString {
  const dateFormat = getDateFormat(region);
  return (dateString: string): Date => {
    const dayRegex = new RegExp(
      dateFormat
        .replace(/DD/, '(\\d\\d?)')
        .replace(/MM/, '\\d\\d?')
        .replace(/YYYY/, '\\d\\d\\d\\d')
        .replace('.', '\\.')
        .replace(/\//g, '\\/')
    );
    const monthRegex = new RegExp(
      dateFormat
        .replace(/MM/, '(\\d\\d?)')
        .replace(/DD/, '\\d\\d?')
        .replace(/YYYY/, '\\d\\d\\d\\d')
        .replace('.', '\\.')
        .replace(/\//g, '\\/')
    );
    const yearRegex = new RegExp(
      dateFormat
        .replace(/YYYY/, '(\\d\\d\\d\\d)')
        .replace(/DD/, '\\d\\d?')
        .replace(/MM/, '\\d\\d?')
        .replace('.', '\\.')
        .replace(/\//g, '\\/')
    );

    const year = yearRegex.exec(dateString);
    const month = monthRegex.exec(dateString);
    const day = dayRegex.exec(dateString);
    if (year && year.length === 2 && month && month.length === 2 && day && day.length === 2) {
      // We know these are integers because of the regex we use, no fail checks required
      // console.log(new Date(parseInt(year[1]), parseInt(month[1]), parseInt(day[1])));
      return new Date(parseInt(year[1]), parseInt(month[1]) - 1, parseInt(day[1]));
    }

    return null;
  };
}
