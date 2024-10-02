
import { Injectable } from '@angular/core';

@Injectable()
export class ValidationService {

  constructor () {}

  emailValidation(email) {
    let rxEmailFormatValidation = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    let rxEmailCharacterValidation = /^[A-Za-z0-9\.\-\'\_\+]+\@[A-Za-z0-9\.\-\'\_\+]+\.[A-Za-z0-9]+$/;
    if (rxEmailCharacterValidation.test(email) && rxEmailFormatValidation.test(email)) return true;
  }


  passwordValidation(password) {
    let rxPasswordValidation = /(\d|[#?!@$%^&])+/;
    if(rxPasswordValidation.test(password) && password.length >= 6)
      return true;
    else
      return false;
  };

  phoneValidation(phone) {
      let rxPhoneValidation = /^((\(\d{3}\)\s?\d{3}-\d{4})|(\d{3}-\d{3}-\d{4})|(\d{10})).*/;
      return rxPhoneValidation.test(phone);
  };

  //for Qna phone should be less than 15 and greater than 10
  qnaPhoneValidat(phoneValue){
      return phoneValue.length>=9 && phoneValue.length<=15;
    };

  cvcCodeValidation(num) {
    let rxCvcValidation = /^[0-9]{3,4}$/;
    return rxCvcValidation.test(num);
  };

  creditCardValidation(ccNum) {
    let strValue = ccNum;

    // Luhn Algorithm. Accepts only digits, dashes or spaces.
    if (/[^0-9-\s]+/.test(strValue)) {
        return false;
    } else {
        let nCheck = 0,
            nDigit = 0,
            bEven  = false;

        strValue = strValue.replace(/\D/g, '');
        for (let n = strValue.length - 1; n >= 0; n--) {
            let cDigit = strValue.charAt(n);
            nDigit = parseInt(cDigit, 10);
            if (bEven) {
                if ((nDigit *= 2) > 9) {
                    nDigit -= 9;
                }
            }
            nCheck += nDigit;
            bEven = !bEven;
        }

        let validluhn = ((nCheck % 10) == 0);
        if(!validluhn) {
            return false;
        } else if(strValue.substr(0,1) == '4'){
            //VISA Validation
            return strValue.length == 13 || strValue.length == 16;
        } else if(strValue.substr(0,2) == '51' || strValue.substr(0,2) == '52' || strValue.substr(0,2) == '53' || strValue.substr(0,2) == '54' || strValue.substr(0,2) == '55'){
            //MasterCard Validation
            return strValue.length == 16;
        } else if(strValue.substr(0,2) == '34' || strValue.substr(0,2) == '37'){
            //American Express Validation
            return strValue.length == 15;
        } else if(strValue.substr(0,4) == '6011' || strValue.substr(0,2) == '65'){
            //Discover Validation
            return strValue.length == 16;
        } else {
            //Maestro cards min length is 12 and max length is 19 they are the weirds't numbers
            return strValue.length >= 12 && strValue.length <= 19;
        }
    }
  };

  expDateValidation(month, year) {
      let currDate = new Date();
      year  = parseInt(year);
      month = parseInt(month);
      return (year > currDate.getFullYear() || (year == currDate.getFullYear() && month >= currDate.getMonth()+1));
  };

  matchValidation(item1, item2) {
      return item1 == item2;
  };

  existsValidation(text) {
      return (text && text.trim().length > 0);
  };

  zipValidation(num) {
      let rxZipValidation = /^\d{5}$/;
      return rxZipValidation.test(num);
  };

  ssn4Validation(num) {
      let rxSsnValidation = /^\d{4}$/;
      return rxSsnValidation.test(num);
  };

  routingNumberValidation(num) {
      let rxRoutingValidation = /^((0[0-9])|(1[0-2])|(2[1-9])|(3[0-2])|(6[1-9])|(7[0-2])|80)([0-9]{7})$/;
      return rxRoutingValidation.test(num);
  };

  accountNumberValidation(num) {
      let rxAccountValidation = /^\w{1,17}$/;
      return rxAccountValidation.test(num);
  };

  nameValidation(name) {
    if(/^\s/.test(name) && !/[^ ]/.test(name) || !name) return true;
  }

}