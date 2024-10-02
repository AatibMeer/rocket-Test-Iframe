import dayjs from "dayjs";

export interface TimeFunction {
  (date: Date): string;
}

function timeFunctionWrapper(timezone: string, formatString = 'hh:mm') {
  function timeFunction(date: Date): string {
    const mDate = dayjs(date).tz(timezone);
    return mDate.format(formatString);
  }
  return timeFunction;
}

export function getTimeFunction(region: string, timezone?: string): TimeFunction {
  // default to paris if region not below
  timezone = timezone || timezonesByRegion[region] || 'Europe/Paris';
  if (region === 'fr') {
    return timeFunctionWrapper(timezone, 'HH[h]mm');
  }
  if (region === 'gb') {
    return timeFunctionWrapper(timezone, 'h.mm');
  }
  if (region === 'us') {
    return timeFunctionWrapper(timezone, 'h:mm');
  }
  // it, ge, br, nl all use this format
  return timeFunctionWrapper(timezone, 'HH:mm');
}

/*
 * REF = https://rocket-lawyer.atlassian.net/wiki/display/RLEU/Localisation+Toolkit+Requirements
 *
 */

// Currently supported timezones
export var timezonesByRegion = {
  fr: 'Europe/Paris',
  es: 'Europe/Madrid',
  nl: 'Europe/Amsterdam',
  gb: 'Europe/London',
  it: 'Europe/Rome',
  be: 'Europe/Berlin',
  ge: 'Europe/Brussels',
  us: 'America/Los_Angeles',
};
