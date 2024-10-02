import { getCurrentParty, partyHasRole } from './sign';
import { RoleEnum } from '../../services/sign-app/party.interface';
import type { State } from '../reducers/main.interface';
import { PartyLinkedPayment, PaymentAgreementOut } from '../../services/sign-app/payment-agreement.interface';

// The Peer Payments API's PaymentAgreementDTO can be quite big.
// Because it has a lot of capabilities, we need to dig in and simplify.
// Each payment can be configured separately, but we only care if all are.

export function payeeAccountAttached(state: State): boolean {
  const party = getCurrentParty(state);
  const agreement = state.paymentAgreement;
  if (!party || !agreement) return false;

  return !!agreement.payments
    // extract all "outs" payments to the PAYEE
    .reduce((all, payment) => all.concat(payment.outs), [])
    // get all payments the party is supposed to get
    .filter((payParty: PartyLinkedPayment) => {
      return payParty.partyId === party.id;
    })
    // check if any of those does not have account
    .find((payParty: PaymentAgreementOut) => {
      return payParty.paymentAccountId;
    });
}

// If the current user is a PAYEE, this selector checks if he already has an account.
// The payees who started the verification process should have an account created.
export function payeeAccountCreated(state: State): boolean {
  const party = getCurrentParty(state);
  if (!party) return false;
  if (!partyHasRole(party, RoleEnum.Payee)) return false;

  const account = state.paymentAccount;
  if (!account) return false;
  return !!account.stripeTosAcceptance;
}

export function payeeAccountUnverified(state: State): boolean {
  const party = getCurrentParty(state);
  if (!party) return false;
  if (!partyHasRole(party, RoleEnum.Payee)) return false;

  // for some reason PPDU only saves verification status to "individual"
  const verfificationStatus = state.paymentAccount?.individual?.verification?.status;
  // this status means it was attempted but failed, exact reasons are in verification.details
  return verfificationStatus === 'unverified';
}

export function payoutEnabled(state: State): boolean {
  return state.paymentAccount?.payoutsEnabled ?? false;
}

// Returns true if we detect that the user attempted a payout but failed.
// Backend does not provide sufficient information so we need to do some investigation.
export function payoutFailed(state: State): boolean {
  const agreement = state.paymentAgreement;
  if (!agreement) return false;
  // payout is considered failed if the payee collected but could not pay out
  if (agreement.status !== 'collected') return false;
  // if account is not attached then user didnt do kyc yet
  if (!payeeAccountAttached(state)) return false;

  const account = state.paymentAccount;
  if (!account) return false;
  // if there's no bank name, user hadn't go through Plaid yet
  if (!account.bankName) return false;
  // if payout is still enabled then maybe we're still processing
  return !account.payoutsEnabled;
}

// Returns true if the agreement has been added automatically by DDS.
// If true, we will be asking user for confirmation.
// Remove 'draft' once backend provides 'proposed' status properly.
export function agreementUnconfirmed(state: State): boolean {
  return (
    !payeeAccountAttached(state) &&
    (state.paymentAgreement?.status === 'optional' || state.paymentAgreement?.status === 'proposed')
  );
}
