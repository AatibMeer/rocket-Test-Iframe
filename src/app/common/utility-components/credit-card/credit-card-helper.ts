export const enum CreditCardNetwork {
  Generic,
  Amex,
  Discover,
  MasterCard,
  Maestro,
  Visa,
  VisaElectron,
}

type GetCreditCardInfoResult = {
  network: CreditCardNetwork[] | null,
  // the number without spaces
  number: string,
  // only verifies the length respective to the issuer (network)
  valid: boolean
};

class CreditCardHelper {
  static readonly MaxLength = 19;

  // these RegExps are likely to be used more than once but shouldn't be created until necessary
  // they are not static since we want them to be collected with the helper with GC
  private _amexRegExp: RegExp;
  private _discoverRegExp: RegExp;
  private _maestroRegExp: RegExp;
  private _masterCardRegExp: RegExp;
  private _nonNumericRegExp: RegExp;
  private _visaElectronRegExp: RegExp;
  private _visaRegExp: RegExp;

  private get amexRegExp(): RegExp {
    if (!this._amexRegExp) {
      this._amexRegExp = /^(?:34|37)/;
    }

    return this._amexRegExp;
  }

  private get discoverRegExp(): RegExp {
    if (!this._discoverRegExp) {
      this._discoverRegExp = /^6(?:011|22(?:12[6-9]|1[3-9][0-9]|[2-8][0-9][0-9]|9[01][0-9]|92[0-5])|4[4-9]|5)/;
    }

    return this._discoverRegExp;
  }

  private get maestroRegExp(): RegExp {
    if (!this._maestroRegExp) {
      this._maestroRegExp = /^(?:5[06789][0-9][0-9][0-9][0-9]|6[0-9][0-9][0-9][0-9][0-9])/;
    }

    return this._maestroRegExp;
  }

  private get masterCardRegExp(): RegExp {
    if (!this._masterCardRegExp) {
      this._masterCardRegExp = /^(?:5[1-5]|2(?:22[1-9][0-9][0-9]|2[3-9][0-9][0-9][0-9]|[3-6][0-9][0-9][0-9][0-9]|7[01][0-9][0-9][0-9]|720[0-9][0-9]))/;
    }

    return this._masterCardRegExp;
  }

  private get nonNumericRegExp(): RegExp {
    if (!this._nonNumericRegExp) {
      this._nonNumericRegExp = /\D+/g;
    }
    return this._nonNumericRegExp;
  }

  private readonly spacingPatterns: Record<CreditCardNetwork, number[][]> = {
    [CreditCardNetwork.Amex]: [[4, 6, 5]],
    [CreditCardNetwork.Discover]: [[4, 4, 4, 4]],
    [CreditCardNetwork.Generic]: [[4, 4, 4, 4]],
    [CreditCardNetwork.Maestro]: [[4, 4, 5], [4, 6, 5], [4, 4, 4, 4], [4, 4, 4, 4, 3]],
    [CreditCardNetwork.MasterCard]: [[4, 4, 4, 4]],
    [CreditCardNetwork.VisaElectron]: [[4, 4, 4, 4]],
    [CreditCardNetwork.Visa]: [[4, 4, 4, 4]]
  };

  private get visaElectronRegExp(): RegExp {
    if (!this._visaElectronRegExp) {
      this._visaElectronRegExp = /^4(?:026|17500|405|508|844|913|917)/;
    }

    return this._visaElectronRegExp;
  }

  private get visaRegExp(): RegExp {
    if (!this._visaRegExp) {
      this._visaRegExp = /^4(?!026|17500|405|508|844|913|917)/;
    }

    return this._visaRegExp;
  }

  static isValidLength(number: string, network: CreditCardNetwork): boolean {
    switch (network) {
      case CreditCardNetwork.Amex:
        return number.length === 15;
      case CreditCardNetwork.Discover:
      case CreditCardNetwork.MasterCard:
      case CreditCardNetwork.VisaElectron:
        return number.length === 16;
      case CreditCardNetwork.Maestro:
        return number.length >= 12 && number.length <= 19;
      case CreditCardNetwork.Visa:
        return number.length >= 13 && number.length <= 19;
      default:
        return number.length <= this.MaxLength;
    }
  }

  isValidLength(number: string, network?: CreditCardNetwork): boolean {
    const { network: realNetwork, number: desugaredNumber } = this.getCreditCardInfo(number);
    return CreditCardHelper.isValidLength(desugaredNumber, network || (realNetwork && realNetwork[0]));
  }

  /** For a given position in the string before formatting, find that same location after formatting.
   *
   * Useful for tracking cursor position in inputs
   */
  findPositionAfterFormat(oldPosition: number, oldValue: string): number {
    const { network, number } = this.getCreditCardInfo(oldValue);
    const oldPositionInNumber = oldValue.substring(0, oldPosition)
      .replace(this.nonNumericRegExp, '')
      .length;
    const rule = this.getNetworkGroupingRuleForNumber(network, number);
    let position = 0;
    for (let i = 0; i < rule.length; i += 1) {
      const groupSize = rule[i];
      if (oldPositionInNumber > position && oldPositionInNumber <= position + groupSize) {
        // the cursor is in this group so account for (group# - 1) spaces
        return oldPositionInNumber + i;
      }
      position += groupSize;
    }
    if (position < number.length && oldPositionInNumber > position) {
      // we are beyond the reach of the rules so add (#groups) spaces
      return oldPositionInNumber + rule.length;
    }
  }

  formatExpiryDate(input: string, cursorPosition: number): { date: string, cursorPosition: number } {
    const number = input.replace(this.nonNumericRegExp, '')
      .substring(0, 4);
    const cursorPositionInUnformattedDate = input.substring(0, cursorPosition)
      .replace(this.nonNumericRegExp, '')
      .length;
    const newCursorPosition = cursorPositionInUnformattedDate <= 2 ? cursorPosition : cursorPosition + 1;
    const formattedDate = number.length < 2 ? number : `${number.substring(0, 2)}/${number.substring(2)}`;
    return {
      date: formattedDate,
      cursorPosition: newCursorPosition
    };
  }

  format(network: CreditCardNetwork[] | null, number: string): string {
    const rule = this.getNetworkGroupingRuleForNumber(network, number);
    const groups: string[] = [];
    let position = 0;
    rule.forEach((groupSize) => {
      const group = number.substring(position, position + groupSize);
      if (group) {
        groups.push(group);
      }
      position += groupSize;
    });
    if (position < number.length) {
      // there are more digits. Since we don't have patterns for some card lengths (eg. 13-15 and 17-19 digit Visa)
      // we will just append the rest
      groups.push(number.substring(position));
    }
    return groups.join(' ');
  }

  getCreditCardInfo(number: string): GetCreditCardInfoResult {
    const candidate = number.replace(this.nonNumericRegExp, '')
      .substring(0, CreditCardHelper.MaxLength);
    const firstChar = candidate.charAt(0);
    // the "garbage" result
    const creditCard: GetCreditCardInfoResult = {
      network: null,
      number: candidate,
      valid: false
    };
    if (firstChar === '2') {
      // could be MasterCard or garbage
      if (this.masterCardRegExp.test(candidate)) {
        creditCard.network = [CreditCardNetwork.MasterCard];
        creditCard.valid = CreditCardHelper.isValidLength(candidate, CreditCardNetwork.MasterCard);
        return creditCard;
      }
      return creditCard;
    }
    if (firstChar === '3') {
      // could be Amex, Diners Club Carte Blanch, Diners Club Intl, JCB or garbage
      if (this.amexRegExp.test(candidate)) {
        creditCard.network = [CreditCardNetwork.Amex];
        creditCard.valid = CreditCardHelper.isValidLength(candidate, CreditCardNetwork.Amex);
        return creditCard;
      }
      // since we don't test the rest we can't return garbage
      creditCard.network = [CreditCardNetwork.Generic];
      creditCard.valid = candidate.length >= 14 && candidate.length <= 19;
      return creditCard;
    }
    if (firstChar === '4') {
      // could be Visa or Electron
      if (this.visaElectronRegExp.test(candidate)) {
        creditCard.network = [CreditCardNetwork.VisaElectron];
        creditCard.valid = CreditCardHelper.isValidLength(candidate, CreditCardNetwork.VisaElectron);
      }
      creditCard.network = [CreditCardNetwork.Visa];
      creditCard.valid = CreditCardHelper.isValidLength(candidate, CreditCardNetwork.Visa);
      return creditCard;
    }
    if (firstChar === '5') {
      // could be MasterCard, Maestro, Diners Club US & Canada, Dankort or garbage
      if (this.masterCardRegExp.test(candidate)) {
        creditCard.network = [CreditCardNetwork.MasterCard];
        creditCard.valid = CreditCardHelper.isValidLength(candidate, CreditCardNetwork.MasterCard);
        return creditCard;
      }
      if (this.maestroRegExp.test(candidate)) {
        creditCard.network = [CreditCardNetwork.Maestro];
        creditCard.valid = CreditCardHelper.isValidLength(candidate, CreditCardNetwork.Maestro);
        return creditCard;
      }
      // since we don't test the rest we can't return garbage
      creditCard.network = [CreditCardNetwork.Generic];
      creditCard.valid = candidate.length === 16;
      return creditCard;
    }
    if (firstChar === '6') {
      // could be Maestro, Discover, InterPayment or garbage
      if (this.discoverRegExp.test(candidate)) {
        creditCard.network = [CreditCardNetwork.Discover];
        creditCard.valid = CreditCardHelper.isValidLength(candidate, CreditCardNetwork.Discover);
      }
      if (this.maestroRegExp.test(candidate)) {
        creditCard.network = [CreditCardNetwork.Maestro];
        creditCard.valid = CreditCardHelper.isValidLength(candidate, CreditCardNetwork.Maestro);
      }
      // since we don't test the rest we can't return garbage
      creditCard.network = [CreditCardNetwork.Generic];
      creditCard.valid = candidate.length >= 16 && candidate.length <= 19;
      return creditCard;
    }
    return creditCard;
  }

  getNetworkGroupingRules(networks: CreditCardNetwork[] | null) : number[][][] {
    return networks === null ? [this.spacingPatterns[CreditCardNetwork.Generic]] : networks.map((network) => this.spacingPatterns[network]);
  }

  getNetworkGroupingRuleForNumber(networks: CreditCardNetwork[] | null, number: string): number[] {
    const rules = this.getNetworkGroupingRules(networks)[0];
    if (rules.length === 1) {
      return rules[0];
    }
    return rules.find((rule, index) => {
      const ruleLength = rule.reduce((sum, groupSize) => sum + groupSize, 0);
      return index === rules.length - 1 || number.length <= ruleLength;
    });
  }

  static mapSpreedlyToNetwork(spreedlyCardType: string): CreditCardNetwork {
    switch (spreedlyCardType) {
      case 'american_express':
        return CreditCardNetwork.Amex;
      case 'discover':
        return CreditCardNetwork.Discover;
      case 'master':
        return CreditCardNetwork.MasterCard;
      case 'maestro':
        return CreditCardNetwork.Maestro;
      case 'visa':
        return CreditCardNetwork.Visa;
      default:
        return CreditCardNetwork.Generic;
    }
  }

  static getNameByCardType(cardType: string): string {
    const network = this.mapSpreedlyToNetwork(cardType);

    switch (network) {
      case CreditCardNetwork.Amex:
        return 'Amex';
      case CreditCardNetwork.Discover:
        return 'Discover';
      case CreditCardNetwork.Maestro:
      case CreditCardNetwork.MasterCard:
        return 'MasterCard';
      case CreditCardNetwork.Visa:
      case CreditCardNetwork.VisaElectron:
        return 'Visa';
      default:
        return 'Credit card';
    }
  }

  static getNetworkLogo(network: CreditCardNetwork): string {
    switch (network) {
      case CreditCardNetwork.Amex:
        return `images/signapp/card-amex.svg`;
      case CreditCardNetwork.Discover:
        return `images/signapp/card-discover.svg`;
      case CreditCardNetwork.Maestro:
      case CreditCardNetwork.MasterCard:
        return `images/signapp/card-mastercard.svg`;
      case CreditCardNetwork.VisaElectron:
      case CreditCardNetwork.Visa:
        return `images/signapp/card-visa.svg`;
      default:
        return `images/signapp/card-generic.svg`;
    }
  }

  static getLogoByCardType(cardType: string): string {
    const network = this.mapSpreedlyToNetwork(cardType);
    return this.getNetworkLogo(network);
  }
}

export default CreditCardHelper;
