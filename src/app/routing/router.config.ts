import { Routes } from '@angular/router';
import { Location } from '@angular/common';
import { from, Observable } from 'rxjs';

import { TranslateService, TranslateLoader } from '@ngx-translate/core';
import { LocalizeParser, LocalizeRouterSettings } from '@gilsdav/ngx-translate-router';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

declare var System; // for Webpack's System.import
let locales = require('../../config/locales.json');

// Ignore the languages passed in here since we already have them in locales ^
export function defaultLanguageFunction(languages: string[], cachedLang?: string, browserLang?: string): string {
  let regexRegionTest = /\/([a-z]{2})\/([a-z]{2})\/app\//;
  var langMatch = window.location.href.match(regexRegionTest);
  if(langMatch && locales.locales.indexOf(langMatch[2]) !== -1) {
    if(langMatch[1] === 'gb') {
      return 'en_uk';
    }
    return langMatch[1];
  } else {
    return locales.locales[0];
  }
}

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export function localTranslateLoader() {
  return new WebpackTranslateLoader();
}

// during build, Webpack will pull translations into chunks
// during runtime, System.import will fetch required files
export class WebpackTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return from(
      import(`../../../build/i18n/${lang}.json`)
    );
  }
}

export class LocalizeUniversalLoader extends LocalizeParser {
  /**
   * Gets config from the server
   * @param routes
   */
  public load(routes: Routes): Promise<any> {
    return new Promise((resolve: any) => {
      this.locales = locales.locales;
      this.prefix = locales.prefix;
      this.init(routes).then(resolve);
    });
  }
}

export function localizeLoaderFactory(translate: TranslateService, location: Location, settings: LocalizeRouterSettings) {
  return new LocalizeUniversalLoader(translate, location, settings);
}