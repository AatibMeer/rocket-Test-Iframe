export const enum BankAccountType {
  Generic,
  AmericanExpress,
  BankOfAmerica,
  CapitalOne,
  Chase,
  Citi,
  Citizens,
  Fidelity,
  Huntington,
  PNC,
  Regions,
  Stash,
  TDBank,
  USAA,
  USBank,
  Wealthfront,
  WellsFargo,
  StripeTestBank,
}

class BankAccountHelper {
  static mapBankNameToBankAccountType(bankName: string): BankAccountType {
    const lowerCaseBankName = bankName.toLowerCase();

    // TODO terrible hack, hopefully temporary, as we don't know how real Plaid data looks like
    if (lowerCaseBankName === 'stripe test bank') {
      return BankAccountType.StripeTestBank;
    }
    if (lowerCaseBankName.includes('express')) {
      return BankAccountType.AmericanExpress;
    }
    if (lowerCaseBankName.includes('of america')) {
      return BankAccountType.BankOfAmerica;
    }
    if (lowerCaseBankName.includes('capital')) {
      return BankAccountType.CapitalOne;
    }
    if (lowerCaseBankName.includes('chase')) {
      return BankAccountType.Chase;
    }
    if (lowerCaseBankName.includes('citizens')) {
      return BankAccountType.Citizens;
    }
    if (lowerCaseBankName.includes('citi')) {
      return BankAccountType.Citi;
    }
    if (lowerCaseBankName.includes('fidelity')) {
      return BankAccountType.Fidelity;
    }
    if (lowerCaseBankName.includes('huntington')) {
      return BankAccountType.Huntington;
    }
    if (lowerCaseBankName.includes('pnc')) {
      return BankAccountType.PNC;
    }
    if (lowerCaseBankName.includes('regions')) {
      return BankAccountType.Regions;
    }
    if (lowerCaseBankName.includes('stash')) {
      return BankAccountType.Stash;
    }
    if (lowerCaseBankName.includes('td')) {
      return BankAccountType.TDBank;
    }
    if (lowerCaseBankName.includes('usa')) {
      return BankAccountType.USAA;
    }
    if (lowerCaseBankName.includes('usb')) {
      return BankAccountType.USBank;
    }
    if (lowerCaseBankName.includes('wealth')) {
      return BankAccountType.Wealthfront;
    }
    if (lowerCaseBankName.includes('wells')) {
      return BankAccountType.WellsFargo;
    }
    return BankAccountType.Generic;
  }

  static getNameByBankName(bankName: string): string {
    const bankAccountType = this.mapBankNameToBankAccountType(bankName);

    switch (bankAccountType) {
      case BankAccountType.AmericanExpress:
        return 'American Express';
      case BankAccountType.BankOfAmerica:
        return 'Bank of America';
      case BankAccountType.CapitalOne:
        return 'Capital One';
      case BankAccountType.Chase:
        return 'Chase';
      case BankAccountType.Citi:
        return 'Citi Bank';
      case BankAccountType.Citizens:
        return 'Citizens Bank';
      case BankAccountType.Fidelity:
        return 'Fidelity';
      case BankAccountType.Huntington:
        return 'Huntington Bank';
      case BankAccountType.PNC:
        return 'PNC';
      case BankAccountType.Regions:
        return 'Regions Bank';
      case BankAccountType.Stash:
        return 'Stash';
      case BankAccountType.TDBank:
        return 'TD Bank';
      case BankAccountType.USAA:
        return 'USAA';
      case BankAccountType.USBank:
        return 'U.S. Bank';
      case BankAccountType.Wealthfront:
        return 'Wealthfront';
      case BankAccountType.WellsFargo:
        return 'Wells Fargo';
      case BankAccountType.StripeTestBank:
        return 'Stripe Test Bank';
      default:
        return 'Bank account';
    }
  }

  static getLogoByBankName(bankName: string): string {
    const bankAccountType = this.mapBankNameToBankAccountType(bankName);

    switch (bankAccountType) {
      case BankAccountType.AmericanExpress:
        return 'images/bank-logos/american-express-logo.svg';
      case BankAccountType.BankOfAmerica:
        return 'images/bank-logos/bofa-logo.svg';
      case BankAccountType.CapitalOne:
        return 'images/bank-logos/capital-one-logo.svg';
      case BankAccountType.Chase:
        return 'images/bank-logos/chase-logo.svg';
      case BankAccountType.Citi:
        return 'images/bank-logos/citi-logo.svg';
      case BankAccountType.Citizens:
        return 'images/bank-logos/citizens-bank-logo.svg';
      case BankAccountType.Fidelity:
        return 'images/bank-logos/fidelity-logo.svg';
      case BankAccountType.Huntington:
        return 'images/bank-logos/huntington-logo.svg';
      case BankAccountType.PNC:
        return 'images/bank-logos/pnc-logo.svg';
      case BankAccountType.Regions:
        return 'images/bank-logos/regions-logo.svg';
      case BankAccountType.Stash:
        return 'images/bank-logos/stash-logo.svg';
      case BankAccountType.TDBank:
        return 'images/bank-logos/td-bank-logo.svg';
      case BankAccountType.USAA:
        return 'images/bank-logos/usaa-logo.svg';
      case BankAccountType.USBank:
        return 'images/bank-logos/usbank-logo.svg';
      case BankAccountType.Wealthfront:
        return 'images/bank-logos/wealthfront-logo.svg';
      case BankAccountType.WellsFargo:
        return 'images/bank-logos/wells-fargo-logo.svg';
      default:
        return 'images/bank-logos/bank.svg';
    }
  }
}

export default BankAccountHelper;
