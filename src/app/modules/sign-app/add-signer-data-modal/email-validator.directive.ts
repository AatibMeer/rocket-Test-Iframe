import { Directive } from '@angular/core';
import { NG_VALIDATORS, Validator, ValidatorFn } from '@angular/forms';

export function emailIsValid(candidate: string): boolean {
  /*
    Note for me and future devs:
    This RegExp is purposefully incomplete; it matches the validator on the backend so that the frontend rejects the
    value in the first instance.
    It will reject perfectly valid email addresses such as
      * Any TLD longer than 4 characters (of which there are many)
      * atext before the @ symbol containing the characters !#$%&'/*=?^`{|}~- and a period (.) as the first character
      * IP address instead of a domain
      * internationalized domains or non-ascii characters (but allowing those has greater implications)
    and allow invalid addresses such as
      * s@-.com
      * anything with backslashes
    The built-in email validator in Angular should be fine and implements the WhatWg pattern from
    https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address but the backend will need to match
     */
  const localPartRegExp = '^(?!-)[_+a-zA-Z0-9./-]+';
  const domainRegExp = '(?!-)(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,})$';
  const regex = new RegExp(`${localPartRegExp}@${domainRegExp}`);
  return candidate && candidate.length > 3 && regex.test(candidate);
}

export const emailValidator: ValidatorFn = (control) => {
  if (!emailIsValid(control.value)) {
    return { email: true };
  }
  return null;
};

@Directive({
  selector: '[emailValidator]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: EmailValidatorDirective,
      multi: true,
    },
  ],
})
export class EmailValidatorDirective implements Validator {
  validate = emailValidator;
}
