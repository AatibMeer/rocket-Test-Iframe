import { IdentityProfile, PaymentMethod } from '../../../state/reducers/identity-profile.interface';
import CreditCardHelper from '../credit-card/credit-card-helper';
import BankAccountHelper from '../bank-account/bank-account-helper';
import { StripePaymentSource } from '../../../services/sign-app/ach-payment-method.interface';
import { PaymentMethodType } from '../../../services/sign-app/payment-agreement.interface';

export interface GenericPaymentMethod {
  id: string;
  name: string;
  last4: string;
  logo: string;
  type: PaymentMethodType;
}

class PaymentMethodHelper {
  static getConvertedGenericPaymentMethods(identityProfile: IdentityProfile): GenericPaymentMethod[] {
    const genericPaymentMethods = [];

    if (identityProfile.paymentMethods) {
      identityProfile.paymentMethods.forEach((paymentMethod) => {
        genericPaymentMethods.push(PaymentMethodHelper.convertCardPaymentMethod(paymentMethod));
      });
    }

    if (identityProfile.achPaymentMethod?.sources) {
      identityProfile.achPaymentMethod.sources.forEach((paymentSource) => {
        genericPaymentMethods.push(PaymentMethodHelper.convertAchPaymentSource(paymentSource));
      });
    }

    return genericPaymentMethods;
  }

  static getConvertedGenericPaymentMethodsByType(
    identityProfile: IdentityProfile,
    paymentMethodType: PaymentMethodType
  ) {
    return PaymentMethodHelper.getConvertedGenericPaymentMethods(identityProfile).filter(
      (paymentMethod) => paymentMethod.type === paymentMethodType
    );
  }

  static convertCardPaymentMethod(paymentMethod: PaymentMethod): GenericPaymentMethod {
    return {
      id: paymentMethod.paymentMethodId,
      name: CreditCardHelper.getNameByCardType(paymentMethod.cardType),
      last4: paymentMethod.cardNumberLast4,
      logo: CreditCardHelper.getLogoByCardType(paymentMethod.cardType),
      type: PaymentMethodType.Card,
    };
  }

  static convertAchPaymentSource(paymentSource: StripePaymentSource): GenericPaymentMethod {
    return {
      id: paymentSource.id,
      name: BankAccountHelper.getNameByBankName(paymentSource.bankName),
      last4: paymentSource.last4,
      logo: BankAccountHelper.getLogoByBankName(paymentSource.bankName),
      type: PaymentMethodType.ACH,
    };
  }
}

export default PaymentMethodHelper;
