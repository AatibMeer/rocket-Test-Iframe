import { Inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LocalizeRouterService } from '@gilsdav/ngx-translate-router';
import dayjs from 'dayjs';
import dayjsTimezone from 'dayjs/plugin/timezone';
import dayjsPluginUTC from 'dayjs-plugin-utc';
import { Localization } from './localization-utils/localization';

@Injectable()
export class LocalizationService {
  localize: Localization;
  // This is the correct place to get language, but its setup in the localize-router configuration
  language: string;

  constructor(
    @Inject(TranslateService) private translate: TranslateService,
    private localizeRouterService: LocalizeRouterService
  ) {
    // the default setter for this is passed in to this package from router.config.ts
    this.setLanguage(this.localizeRouterService.parser.currentLang);
  }

  init(lang: string) {
    this.language = lang.toLowerCase();
    // Use the browser location for timezone
    // After we expose the user's timezone as a setting, we will want to us that if it exists
    // But for now it's hidden and only set when registering, affected by VPN
    dayjs.extend(dayjsPluginUTC);
    dayjs.extend(dayjsTimezone);
    const timezone = dayjs.tz.guess();
    this.localize = new Localization('us', timezone);
  }

  setLanguage(newLanguage: string) {
    const translateLang = newLanguage.toLowerCase();
    // console.log('Setting language: ' + translateLang);
    this.translate.use(translateLang);
    this.init(translateLang);
  }

  getLanguage(): string {
    return this.language;
  }
}
