/*
 * We'll be adding an opts {} at some point for passing precision etc.
 * Add complexity as needed
 */

export interface currencyStringFunction {
    (currencyNumber: number, precision?: number, htmlCurrencyWrapper?: string[], htmlNumberWrapper?: string[]): string;
}

export interface specificCurrencyStringFunction {
    (currencyCode: string, currencyNumber: number, precision?: number, htmlCurrencyWrapper?: string[], htmlNumberWrapper?: string[]): string;
}

export interface NumberFormatFunction {
    (numberArg: number, precision?: number, doNotTruncatePrecision?: boolean): string;
}


export interface NumberParser {
    (stringValue: string, precision?: number, cursorPosition?: number, reformatSeparators?: boolean): numberValueWithFormattedStringAndCursorInfo;
}

export interface numberValueWithFormattedStringAndCursorInfo {
    numberValue: number;
    cursorPosition: number;
    precision: number;
    formattedValue: string;
}

export interface NumberFormatFunction {
    (numberArg: number, precision?: number, doNotTruncatePrecision?: boolean, hardParseSeparators?: boolean): string;
}

// This should be used anytime you need to parse a number string, if more info is requred add it to the return payload
// This is the method for localized number user input, also good for a stored localized number string
export function getNumberWithInfoFromStringByRegion(region: string): NumberParser {
    let precisionChar = getPrecisionChar(region);
    let separatorChar = getSeparatorChar(region);
    let formatter = getNumberFormatter(region);

    return (stringValue: string, precision?: number, cursorPosition: number = null, reformatSeparatorCharacters: boolean = true): numberValueWithFormattedStringAndCursorInfo => {

        // console.log('parsing: ' + stringValue);
        function removeAllNonNumeric(items: string[]): string[]{
            for(let i = 0; i < items.length; i++) {
                items[i] = items[i].replace(/[^0-9]/g, '');
            }
            return items;
        }

        let splitValue;
        if(cursorPosition === null) {
            splitValue = stringValue.split('');
        } else {
            splitValue = stringValue.substring(0, cursorPosition).split('').concat(['İ']).concat(stringValue.substring(cursorPosition).split(''));
        }
        // remove any separator characters after the precision
        // remove multiple precision characters
        // remove all non-numeric, seperator, precision chars
        let numRegWithSeparatorAndCursor = new RegExp('[0-9İ' + separatorChar + ']');
        let numRegWithCursor = /[0-9İ]/;
        let numReg = /[0-9]/;

        // For the string formatted value
        let invalidOnlyStrip = [];
        // For the numberValue
        let completeStrip = '';
        let foundDecimal = false;
        for(let i = 0; i<splitValue.length; i++) {
            if(numReg.test(splitValue[i])) {
                completeStrip+=splitValue[i];
            }
            if(foundDecimal) {
                if(numRegWithCursor.test(splitValue[i])) {
                    invalidOnlyStrip.push(splitValue[i]);
                }
            } else {
                if(numRegWithSeparatorAndCursor.test(splitValue[i])) {
                    invalidOnlyStrip.push(splitValue[i]);
                } else {
                    if(splitValue[i] === precisionChar) {
                        foundDecimal = true;
                        if(i==0) {
                            invalidOnlyStrip.push('0');
                            completeStrip = '0';
                        }
                        invalidOnlyStrip.push(splitValue[i]);
                        completeStrip += '.';
                    }
                }
            }
            // console.log(invalidOnlyStrip);
        }
        let numberValue;
        if(completeStrip.length) {
            numberValue = parseFloat(completeStrip);
        } else {
            numberValue = null;
        }
        let processingCharArray = invalidOnlyStrip;
        // console.log('preprocess - processingCharArray: ' + processingCharArray);
        if(cursorPosition) {
            let indexOfCursor = processingCharArray.indexOf('İ');
            let indexOfPrecision = processingCharArray.indexOf(precisionChar);
            let lastSeparatorIndexInShiftSection;

            // Hard format an integer (also have to ignore the cursor in this case)
            if(reformatSeparatorCharacters && indexOfPrecision === -1) {
                lastSeparatorIndexInShiftSection = processingCharArray.length;
                // If cursor is to the right of the precision decimal or if reformatSeparatorCharacters is true hardFormat the integer seperators
            } else if(reformatSeparatorCharacters || (indexOfPrecision !== -1 && indexOfPrecision < indexOfCursor)) {
                lastSeparatorIndexInShiftSection = indexOfPrecision;
            } else {
                // Shift all seperator characters to the left of the cursor based on the first separator found, or the cursor position if none found
                lastSeparatorIndexInShiftSection = processingCharArray.slice().reverse().indexOf(separatorChar, processingCharArray.length - 1 - indexOfCursor);
                // Un-reverse the index
                if(lastSeparatorIndexInShiftSection == -1) {
                    lastSeparatorIndexInShiftSection = indexOfCursor;
                } else {
                    lastSeparatorIndexInShiftSection = processingCharArray.length - 1 - lastSeparatorIndexInShiftSection;
                }
                // If its been at least three since last separator, put a new 3 digits from the cursor and shift the rest
                lastSeparatorIndexInShiftSection = Math.max(indexOfCursor-4, lastSeparatorIndexInShiftSection);
            }

            // console.log('last separator:' + lastSeparatorIndexInShiftSection);
            // Put separator characters on triplet indices base on the new entered space left from entry
            for(let i = lastSeparatorIndexInShiftSection-1; i>=0; i--) {

                // always ignore the cursor and the span count of it
                if(processingCharArray[i] === 'İ') {
                    lastSeparatorIndexInShiftSection--;

                    // no seperator here
                } else if((lastSeparatorIndexInShiftSection-i)%4 != 0 && processingCharArray[i] === separatorChar) {
                    // remove this separator
                    // console.log('removing a separator');
                    processingCharArray.splice(i, 1);
                    lastSeparatorIndexInShiftSection--;
                    // console.log(processingCharArray);
                    // repeat at this index
                    i++;

                    // put a seperator here
                } else if((lastSeparatorIndexInShiftSection-i)%4 == 0 && processingCharArray[i] !== separatorChar && processingCharArray[i] !== precisionChar) {
                    processingCharArray.splice(i+1, 0, separatorChar);
                    lastSeparatorIndexInShiftSection++;
                    // console.log('added separator at index:' + i+1);
                    // console.log(processingCharArray);
                }
            }

            cursorPosition = processingCharArray.indexOf('İ');
            let formattedString = processingCharArray.join('');
            formattedString = formattedString.replace('İ', '');
            // console.log('processingCharArray: ');
            // console.log(processingCharArray);
            // console.log('numberValue: ');
            // console.log(numberValue);
            return {
                numberValue: numberValue,
                cursorPosition: cursorPosition,
                precision: precision,
                formattedValue: formattedString
            }
        }

        // If no cursor position we can use format string
        return {
            numberValue: numberValue,
            cursorPosition: cursorPosition,
            precision: precision,
            formattedValue: formatter(numberValue, precision, true, true)
        }
    }
// }
}

function getSeparatorStripRegexForRegion(region: string): RegExp {
    let stripRegex;
    if(region === 'us' || region === 'gb') {
        return stripRegex = new RegExp(',', 'g');
    } else {
        return stripRegex = new RegExp(/\./, 'g');
    }
}

export function getNumberFormatter(region: string): NumberFormatFunction {
    if (region === 'fr') {
        return (currencyNumber: number, precision?: number) => numberFormat(currencyNumber, precision, ',', ' ', 3)
    }
    if (region === 'en' || region === 'gb') {
        return (currencyNumber: number, precision?: number) => numberFormat(currencyNumber, precision, '.', ',', 3)
    }
    // nl, be, it, es, de
    return (currencyNumber: number, precision?: number) => numberFormat(currencyNumber, precision, ',', '.', 3)
}

// , largeNumberDigitSeperation: number = 3... for now this is always three but we will have to change to the more complex regex below when it isn't
function numberFormat(num: number, precision?: number, precisionSeperator: string = '',
                      largeNumberFormatter: string = '', largeNumberDigitSeperation: number = 3) {
    // Return empty string if a number was not passed
    // console.log('number: ' + num);
    if (num == void 0) {
        return '';
    }

    var parts;
    if (precision == void 0) {
        parts = num.toString().split('.');
    } else {
        parts = num.toFixed(precision).split('.');
    }
    if (largeNumberFormatter !== '') {
        // var ree = '\/\B(?=(\\d{' + largeNumberDigitSeperation + '})+(?!\\d))';
        // var reg = new RegExp(ree, 'g');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, largeNumberFormatter);
    }
    if (precision != void 0) {
        if(precision>0) {
            let dec = parts[1];
            if(!dec) {
                dec = '0';
            }
            while(dec.length < precision) {
                dec += '0';
            }
            parts[1] = dec;
        }
        return parts.join(precisionSeperator);
    } else {
        if(parts[1] && parts[1].length) {
            return parts[0] + precisionSeperator + parts[1];
        } else {
            return parts[0];
        }
    }
}

// this handles the case where you want to display a product, but the product is in a specific currency not entangled with the region displayed
// but in the case of Euro's we need to handle Euros in multiple ways
export function getSpecificCurrencyStringFunction(region: string): specificCurrencyStringFunction {
    let numberFormater = getNumberFormatter(region);
    var inverted;

    // Euro for everyone else
    if (region === 'fr' || region === 'es' || region === 'de') {
        inverted = true;
        // nl, be, it
    } else {
        inverted = false;
    }

    return (currencyCode: string = "EUR", currencyNumber: number, precision: number = 2, htmlCurrencyWrapper: string[] = [], htmlNumberWrapper: string[] = []): string => {

        let symbol;
        if (currencyCode.toUpperCase() === "EUR") {
            symbol = '€';
        } else if (currencyCode.toUpperCase() === "GBP") {
            symbol = '£';
        } else if (currencyCode.toUpperCase() === "USD") {
            symbol = '$';
        } else {
            //Fallback
            symbol = '€';
        }

        if (htmlCurrencyWrapper.length || htmlNumberWrapper.length) {
            let returnString = '';
            if (htmlNumberWrapper.length == 2) {
                returnString += htmlNumberWrapper[0] + numberFormater(currencyNumber, precision) + htmlNumberWrapper[1];
            } else {
                returnString += numberFormater(currencyNumber, precision);
            }
            if (htmlCurrencyWrapper.length == 2) {
                if (inverted) {
                    returnString += htmlCurrencyWrapper[0] + " " + symbol + htmlCurrencyWrapper[1];
                } else {
                    returnString = htmlCurrencyWrapper[0] + symbol + htmlCurrencyWrapper[1] + returnString;
                }
            } else {
                returnString += symbol;
            }
            return returnString;
        } else {
            if (inverted) {
                return numberFormater(currencyNumber, precision) + " " + symbol;
            } else {
                return symbol + numberFormater(currencyNumber, precision);
            }
        }
    }
}

export function getCurrencyStringFunction(region: string): currencyStringFunction {
    var symbol;
    if (region === 'gb') {
        symbol = '£';
    } else if (region === 'us') {
        symbol = '$';

        // Euro for everyone else
    } else {
        symbol = '€';
    }

    let numberFormater = getNumberFormatter(region);
    const inverted = isRegionInverted(region);
    let hasPrecision;

    return (currencyNumber: number, precision: number = 2, htmlCurrencyWrapper: string[] = [], htmlNumberWrapper: string[] = []): string => {
        if (htmlCurrencyWrapper.length || htmlNumberWrapper.length) {
            let returnString = '';
            if (htmlNumberWrapper.length == 2) {
                returnString += htmlNumberWrapper[0] + numberFormater(currencyNumber, precision) + htmlNumberWrapper[1];
            } else {
                returnString += numberFormater(currencyNumber, precision);
            }
            if (htmlCurrencyWrapper.length == 2) {
                if (inverted) {
                    returnString += htmlCurrencyWrapper[0] + " " + symbol + htmlCurrencyWrapper[1];
                } else {
                    returnString = htmlCurrencyWrapper[0] + symbol + htmlCurrencyWrapper[1] + returnString;
                }
            } else {
                returnString += symbol;
            }
            return returnString;
        } else {
            if (inverted) {
                return numberFormater(currencyNumber, precision) + " " + symbol;
            } else {
                return symbol + numberFormater(currencyNumber, precision);
            }
        }
    }
}

export function getPrecisionChar(region: string): string {
    if(region === 'us' || region === 'gb') {
        return '.';
    } else {
        return ',';
    }
}

export function getSeparatorChar(region: string): string {
    if(region === 'us' || region === 'gb') {
        return ',';
    } else if(region === 'fr' || region === 'be') {
        return ' ';
        // sp, nl, it, de...
    } else {
        return '.';
    }
}

export function isRegionInverted(region: string) : boolean {
    if (region === 'fr' || region === 'es' || region === 'de') {
        return true;
        // nl, be, it
    } else {
        return false;
    }
}

// This returns the char that is not used for precision for input validators
// that is one of either , or .
export function getUnusedChar(region: string): string {
    if(region === 'us' || region === 'gb') {
        return ',';
    } else {
        return '.';
    }
}

// • United States  — $1,234,567.89 USD
// • Canada           — $1,234,567.89 CAD
// • Great Britain   — £1.234.567,89 GBP
// • European        — €1.234.567,89 EUR

// http://trigeminal.fmsinc.com/samples/setlocalesample2.asp


// getFunctionNumberValueFromStringByRegion is a utility for the new Interview
// We could switch this to the new
export interface NumberFromString {
    (stringValue: string): number;
}

export function getFunctionNumberValueFromStringByRegion(region: string): NumberFromString {
    let splitRegex;
    let splitChar;
    if(region === 'us' || region === 'gb') {
        splitRegex = new RegExp(/\.(.+)/);
        splitChar = '.';
    } else {
        splitRegex = new RegExp(/,(.+)/);
        splitChar = ',';
    }
    let stripRegex = /\D/g;

    return (stringValue: string): number => {
        if(stringValue == void 0 || !stringValue.length) {
            return null;
        }
        let splitString = stringValue.split(splitRegex);
        let reformattedNumber = splitString[0].replace(stripRegex, '');
        // Non greedy split should only have two relevant items
        if(splitString.length > 1) {
            reformattedNumber += '.' + splitString[1].replace(stripRegex, '');
        }
        let numberValue = parseFloat(reformattedNumber);
        if(isNaN(numberValue)) {
            return null;
        } else {
            return numberValue;
        }
    };
}