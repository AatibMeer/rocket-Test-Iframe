import { UIDGenerator } from '../../common/utility-components/uidGenerator';
import {Injectable} from '@angular/core';

@Injectable()
export class CookiesService {
  browserId: string = null;

  uidgen3 = new UIDGenerator(64, UIDGenerator.BASE16);
  constructor() {
    this.browserId = this.getBrowserId();
    // We always get this from the cookie, since we need to check for expiration
    // Setup the cookie on pageload
    this.getSessionId();
  }

  getBrowserId() {
    if(!this.browserId) {
      let bCookie = readCookie('browser-id');
      if(bCookie != void 0) {
        this.browserId = bCookie;
      }
    }
    return this.browserId || this.createBrowserId('broswer-id');
  }

  createBrowserId(name: string) {
    this.browserId = this.uidgen3.generateSync();
    createCookie('browser-id', this.browserId, null);
    return this.browserId;
  }

  getSessionId() {
    let sCookie = readCookie('session-id');
    // TODO
    // Check for expired?
    if(sCookie != void 0) {
      return sCookie;
    } else {
      let sessionId = this.uidgen3.generateSync();
      // TODO 
      // Set expiration time to 30 min
      createCookie('session-id', sessionId, 30); 
      return sessionId;
    }
  }
}

function createCookie(name: string, value: any, minutes: number) {
  var expires;
  var date = new Date();
  if (minutes) {
    date.setTime(date.getTime() + (minutes*60*1000));
    expires = "; expires=" + date.toUTCString();
  } else {
    date.setTime(2147483647000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}