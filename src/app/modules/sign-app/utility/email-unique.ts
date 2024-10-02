import {Party} from '../../../services/sign-app/party.interface';
import {ValidationErrors, ValidatorFn} from '@angular/forms';

type PartyWithEmail = Readonly<Pick<Party, 'email'>>;
type PartyWithReference = Readonly<Pick<Party, 'reference'>>;
type PartyWithEmailAndReference = Readonly<Pick<Party, 'email' | 'reference'>>;

/**
 * For an array of parties, does the given party have a different email address from every other party?
 *
 * If a party in the array has the same <code>reference</code> property as the given party then it will be ignored when
 * checking for uniqueness (it won't compare the party to itself if the party is also in the array).
 * @param {Party[]} otherParties - The parties with which the party should not share an email
 * @param {Party} party - The party to check
 */
export function partyHasUniqueEmailAddress(otherParties: PartyWithEmailAndReference[], party: PartyWithEmailAndReference): boolean {
    return otherParties.every((candidate) => {
        return candidate.reference === party.reference || candidate.email.toLowerCase() !== party.email.toLowerCase();
    });
}

/**
 * For an array of parties, does the given email address exist on any of those?
 */
export function emailAddressIsUnique(parties: PartyWithEmail[], email: string): boolean {
    return parties.every((candidate) => {
        return candidate.email.toLowerCase() !== email.toLowerCase();
    })
}

/**
 * Create a validator function which is valid when the form value is not the same as an email address in an collection
 * of parties.
 */
export function makeUniquePartyEmailValidatorFn(otherParties: PartyWithEmail[]): ValidatorFn;
/**
 * Create a validator function which is valid when the form value is not the same as an email address in an collection
 * of parties.
 * @param {Party[]} otherParties
 * @param {Party} [exclude] If set then the validator skips this party when checking the <code>otherParties</code>
 * collection. If there is another party in the collection with the same email (there shouldn't be) then the validator
 * will be invalid.
 */
export function makeUniquePartyEmailValidatorFn(otherParties: PartyWithEmailAndReference[], exclude: PartyWithReference): ValidatorFn;
export function makeUniquePartyEmailValidatorFn(otherParties: PartyWithEmailAndReference[], exclude?: PartyWithReference): ValidatorFn {
    const error: ValidationErrors = {
        uniquePartyEmail: 'email address is already in use'
    };
    if (exclude) {
        return (control) => {
            return partyHasUniqueEmailAddress(otherParties, {
                reference: exclude.reference,
                email: control.value
            }) ? null : {...error};
        }
    }
    return (control) => {
        return emailAddressIsUnique(otherParties, control.value) ? null : {...error};
    };
}