import { Injectable } from '@angular/core';

@Injectable()
export class UserAgentService {

  private readonly userAgent = navigator.userAgent;
  private readonly userPlatform = navigator.platform;

  public getUserAgent(): string {
    return this.userAgent;
  }

  public isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(this.userAgent);
  }

  public isWindowsDevice(): boolean {
    return this.userAgent.match(/Windows/) !== null;
  }

  public isSafariBrowser(): boolean {
    return /^((?!chrome|android).)*safari/i.test(this.userAgent);
  }

  public isChromeForIOSBrowser(): boolean {
    return this.userAgent.match('CriOS') !== null;
  }

  public isIOSDevice(): boolean {
    return ['iPad', 'iPhone', 'iPod'].includes(this.userPlatform)
      // iPad on iOS 13 detection
      || (this.userAgent.includes('Mac') && 'ontouchend' in document);
  }

  public isAndroidDevice(): boolean {
    return this.userAgent.toLowerCase().indexOf('android') > -1;
  }

  public isInternetExplorerBrowser(): boolean {
    return this.userAgent.indexOf('MSIE')!==-1 || this.userAgent.indexOf('Trident/') > -1;
  }
}